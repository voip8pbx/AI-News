/**
 * imagePipeline.js
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION-GRADE AI NEWS IMAGE PIPELINE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Architecture:
 *   GNews API
 *     ↓
 *   News Fetch & Dedup
 *     ↓
 *   Supabase (status = pending)
 *     ↓
 *   In-Memory Job Queue (Supabase-polled)
 *     ↓
 *   Parallel Worker Engine (5-10 concurrent)
 *     ↓
 *   Nano Banana AI Image Generator
 *     ↓
 *   Cloudinary CDN Upload
 *     ↓
 *   Supabase (status = completed, ai_image_url set)
 *     ↓
 *   Frontend shows optimized editorial posters
 *
 * Because this runs in a browser context (Vite/React), we use:
 *   - Supabase as the job queue backend (polling via `status` column)
 *   - A Promise-pool pattern to achieve true parallelism
 *   - Cloudinary CDN for permanent, optimized image delivery
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from '../supabase';
import { uploadToCloudinary } from './cloudinaryService';
import { generateArticleHash, generateArticleImage, getCachedImage, cacheGeneratedImage } from '../api/imageGeneration';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Cloudinary folder structure per category */
const CDN_FOLDER_MAP = {
  technology:    'news-ai/technology',
  business:      'news-ai/business',
  world:         'news-ai/world',
  politics:      'news-ai/politics',
  science:       'news-ai/science',
  health:        'news-ai/health',
  sports:        'news-ai/sports',
  entertainment: 'news-ai/entertainment',
  general:       'news-ai/general',
};

const DEFAULT_CDN_FOLDER = 'news-ai/general';

/** Parallel worker concurrency target */
const MAX_CONCURRENT_WORKERS = 10;

/** Poll interval when checking for pending jobs (ms) */
const POLL_INTERVAL_MS = 8000;

/** Max articles to pull per poll cycle */
const BATCH_SIZE = 20;

// ─── Pipeline State ───────────────────────────────────────────────────────────

class ImagePipeline {
  constructor() {
    this._isRunning   = false;
    this._pollerId    = null;
    this._activeJobs  = 0;
    this._stats = {
      queued:    0,
      processed: 0,
      cached:    0,
      uploaded:  0,
      failed:    0,
    };
  }

  get isRunning()   { return this._isRunning; }
  get activeJobs()  { return this._activeJobs; }
  get stats()       { return { ...this._stats }; }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Start the background pipeline.
   * Polls for pending articles and dispatches parallel workers.
   */
  start() {
    if (this._isRunning) {
      console.log('[Pipeline] Already running.');
      return;
    }
    console.log('[Pipeline] ▶ Starting image pipeline...');
    this._isRunning = true;
    this._poll();
    this._pollerId = setInterval(() => this._poll(), POLL_INTERVAL_MS);
  }

  /** Stop the pipeline gracefully */
  stop() {
    if (this._pollerId) {
      clearInterval(this._pollerId);
      this._pollerId = null;
    }
    this._isRunning = false;
    console.log('[Pipeline] ■ Pipeline stopped.');
  }

  /**
   * Manually enqueue a batch of articles (e.g. after news ingestion)
   * @param {Array<{id,title,description,content,category_slug,banner_image}>} articles
   */
  async enqueue(articles) {
    if (!articles?.length) return;

    const ids = articles.map(a => a.id).filter(Boolean);
    this._stats.queued += ids.length;
    console.log(`[Pipeline] ➡ Enqueuing ${ids.length} articles...`);

    // Mark them as pending (they may already be, but this is idempotent)
    const { error } = await supabase
      .from('articles')
      .update({ ai_image_status: 'pending' })
      .in('id', ids)
      .is('ai_image_url', null);    // Only if no image yet

    if (error) {
      console.error('[Pipeline] Failed to enqueue articles:', error.message);
    }

    // Trigger an immediate poll cycle
    this._poll();
  }

  /**
   * Process a specific article immediately (on-demand).
   * Bypasses the queue.
   */
  async processNow(article) {
    return this._processJob(article);
  }

  // ─── Private: Poll Loop ──────────────────────────────────────────────────────

  async _poll() {
    const available = MAX_CONCURRENT_WORKERS - this._activeJobs;
    if (available <= 0) {
      console.log(`[Pipeline] Workers at capacity (${this._activeJobs}/${MAX_CONCURRENT_WORKERS}), skipping poll.`);
      return;
    }

    try {
      const { data: pending, error } = await supabase
        .from('articles')
        .select('id, title, description, content, category_slug, banner_image')
        .eq('ai_image_status', 'pending')
        .is('ai_image_url', null)
        .limit(Math.min(available, BATCH_SIZE))
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!pending?.length) return; // Nothing to process

      console.log(`[Pipeline] Found ${pending.length} pending articles → dispatching workers...`);
      this._dispatchWorkers(pending);

    } catch (err) {
      console.error('[Pipeline] Poll error:', err.message);
    }
  }

  // ─── Private: Worker Dispatch (Parallel Pool) ────────────────────────────────

  _dispatchWorkers(articles) {
    // Fire all jobs concurrently, capped by MAX_CONCURRENT_WORKERS
    const jobs = articles.map(article => this._processJob(article));
    Promise.allSettled(jobs).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const failed     = results.filter(r => r.status === 'rejected' || !r.value?.success).length;
      console.log(`[Pipeline] Batch complete → ✓ ${successful} processed, ✗ ${failed} failed`);
    });
  }

  // ─── Private: Single Job Processor ──────────────────────────────────────────

  async _processJob(article) {
    this._activeJobs++;
    const articleId = article.id;
    const articleHash = generateArticleHash(article.title);

    try {
      console.log(`[Pipeline][W${this._activeJobs}] Processing: "${article.title?.substring(0, 50)}"`);

      // 1. Mark as processing
      await this._updateStatus(articleId, 'processing');

      // 2. Check image cache first
      const cached = await getCachedImage(articleHash);
      if (cached?.generated_image_url) {
        console.log(`[Pipeline] 🗄 Cache hit for article ${articleId}`);
        await this._finalizeArticle(articleId, cached.generated_image_url);
        this._stats.cached++;
        return { success: true, cached: true };
      }

      // 3. Generate AI image via Nano Banana
      const rawImageUrl = await generateArticleImage(article, false);
      if (!rawImageUrl) throw new Error('Empty image URL returned');

      // 4. Upload to Cloudinary CDN (structured folder)
      const folder = CDN_FOLDER_MAP[article.category_slug] || DEFAULT_CDN_FOLDER;
      const cdnUrl = await uploadToCloudinary(rawImageUrl, folder);
      if (!cdnUrl) throw new Error('Cloudinary upload returned no URL');

      // 5. Build optimized CDN delivery URL
      const optimizedUrl = this._buildOptimizedUrl(cdnUrl);

      // 6. Store in cache table
      await cacheGeneratedImage(article.title, articleHash, optimizedUrl, article.banner_image || null);

      // 7. Finalize article in DB
      await this._finalizeArticle(articleId, optimizedUrl);

      this._stats.processed++;
      this._stats.uploaded++;
      console.log(`[Pipeline] ✓ Done → ${article.title?.substring(0, 40)} | ${optimizedUrl.substring(0, 60)}`);
      return { success: true, url: optimizedUrl };

    } catch (err) {
      console.error(`[Pipeline] ✗ Job failed for article ${articleId}:`, err.message);
      await this._updateStatus(articleId, 'failed');
      this._stats.failed++;
      return { success: false, error: err.message };
    } finally {
      this._activeJobs--;
    }
  }

  // ─── Private: Helpers ────────────────────────────────────────────────────────

  /** Update article ai_image_status */
  async _updateStatus(articleId, status) {
    await supabase
      .from('articles')
      .update({ ai_image_status: status, updated_at: new Date().toISOString() })
      .eq('id', articleId);
  }

  /** Mark article complete with its AI image URL */
  async _finalizeArticle(articleId, aiImageUrl) {
    const { error } = await supabase
      .from('articles')
      .update({
        ai_image_url:    aiImageUrl,
        ai_image_status: 'completed',
        updated_at:      new Date().toISOString(),
      })
      .eq('id', articleId);

    if (error) throw new Error(`DB finalize error: ${error.message}`);
  }

  /**
   * Build an optimized Cloudinary URL with auto format, quality, and width.
   * Converts: https://res.cloudinary.com/cloud/image/upload/v123/folder/img.jpg
   * To:       https://res.cloudinary.com/cloud/image/upload/f_auto,q_auto,w_1200/v123/folder/img.jpg
   */
  _buildOptimizedUrl(rawUrl) {
    if (!rawUrl || !rawUrl.includes('res.cloudinary.com')) return rawUrl;
    try {
      return rawUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_1200/');
    } catch {
      return rawUrl;
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const imagePipeline = new ImagePipeline();
export default imagePipeline;
