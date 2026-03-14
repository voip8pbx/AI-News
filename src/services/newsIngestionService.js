/**
 * newsIngestionService.js
 * 
 * MANUAL NEWS INGESTION SERVICE
 * 
 * Workflow:
 *   GNews API → Parse & Deduplicate → Store in Supabase
 * 
 * This service is designed to be triggered MANUALLY (via a button in the UI
 * or by calling the exported functions directly). It does NOT use cron jobs.
 * 
 * To re-enable cron automation: import these functions in cronService.js
 * and call them on a schedule via setInterval or node-cron.
 */

import { supabase } from '../supabase';

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const GNEWS_BASE = '/api/gnews';

// All available GNews API keys (falls back sequentially)
const GNEWS_KEYS = [
  import.meta.env.VITE_GNEWS_API_KEY,
  import.meta.env.VITE_GNEWS_FALLBACK_API_KEY,
  import.meta.env.VITE_GNEWS_TERTIARY_API_KEY,
  import.meta.env.VITE_GNEWS_QUATERNARY_API_KEY,
  import.meta.env.VITE_GNEWS_QUINARY_API_KEY,
].filter(k => k && k.trim() !== '');

// Categories to ingest when doing a full refresh
export const INGEST_CATEGORIES = [
  { id: 'technology',    name: 'Technology',    gnewsCategory: 'technology' },
  { id: 'business',      name: 'Business',      gnewsCategory: 'business'   },
  { id: 'world',         name: 'World',         gnewsCategory: 'world'      },
  { id: 'science',       name: 'Science',       gnewsCategory: 'science'    },
  { id: 'health',        name: 'Health',        gnewsCategory: 'health'     },
  { id: 'sports',        name: 'Sports',        gnewsCategory: 'sports'     },
  { id: 'entertainment', name: 'Entertainment', gnewsCategory: 'entertainment' },
  { id: 'general',       name: 'General',       gnewsCategory: 'general'    },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Slugify a text string into a URL-safe slug
 */
const slugify = (text) => {
  if (!text) return `article-${Date.now()}`;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

/**
 * Fetch articles from GNews API with key rotation on failure.
 * @param {string} category - GNews category string (e.g. 'technology')
 * @param {number} max - Max articles to fetch
 * @returns {Promise<Array>} Raw GNews article objects
 */
async function fetchFromGNews(category = 'general', max = 10) {
  if (GNEWS_KEYS.length === 0) {
    throw new Error('[NewsIngestion] No GNews API keys configured.');
  }

  let lastError = null;

  for (const apiKey of GNEWS_KEYS) {
    try {
      const url = new URL(`${GNEWS_BASE}/top-headlines`, window.location.origin);
      url.searchParams.set('category', category);
      url.searchParams.set('lang', 'en');
      url.searchParams.set('max', String(max));
      url.searchParams.set('apikey', apiKey);

      console.log(`[NewsIngestion] Fetching "${category}" with key ${apiKey.slice(0, 6)}...`);

      const res = await fetch(url.toString(), { timeout: 20000 });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${err.errors?.[0] || res.statusText}`);
      }

      const data = await res.json();
      console.log(`[NewsIngestion] Got ${data.articles?.length ?? 0} articles for "${category}"`);
      return data.articles || [];

    } catch (err) {
      lastError = err;
      console.warn(`[NewsIngestion] Key failed for "${category}":`, err.message);
      // Only retry on auth/rate-limit errors
      if (err.message && !err.message.startsWith('HTTP 401') && !err.message.startsWith('HTTP 403') && !err.message.startsWith('HTTP 429')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('[NewsIngestion] All GNews API keys failed.');
}

/**
 * Check which URLs already exist in the database (to skip duplicates).
 * @param {string[]} urls
 * @returns {Promise<Set<string>>} - Set of already-existing URLs
 */
async function getExistingUrls(urls) {
  if (!urls.length) return new Set();

  try {
    const { data, error } = await supabase
      .from('articles')
      .select('url')
      .in('url', urls);

    if (error) {
      console.warn('[NewsIngestion] Could not check existing URLs:', error.message);
      return new Set();
    }

    return new Set((data || []).map(r => r.url));
  } catch (err) {
    console.warn('[NewsIngestion] Exception checking existing URLs:', err.message);
    return new Set();
  }
}

/**
 * Insert a batch of new articles into the Supabase `articles` table.
 * Silently skips articles that would violate the unique URL constraint.
 * @param {Array} articles - Normalized article objects
 * @param {string} categorySlug
 * @returns {Promise<{inserted: number, skipped: number, errors: string[]}>}
 */
async function insertArticles(articles, categorySlug) {
  const results = { inserted: 0, skipped: 0, errors: [] };

  for (const article of articles) {
    try {
      const slug = slugify(article.title);

      const { error } = await supabase
        .from('articles')
        .insert({
          title:        article.title,
          slug:         slug,
          description:  article.description  || '',
          content:      article.content      || article.description || '',
          url:          article.url,
          banner_image: article.image        || null,
          author:       article.author       || article.source?.name || 'GNews',
          category_slug: categorySlug,
          published_at: article.publishedAt  || new Date().toISOString(),
          source_name:  article.source?.name || 'GNews',
          source_url:   article.source?.url  || '',
          status:       'published',
          created_at:   new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        });

      if (error) {
        // 23505 = unique_violation → duplicate, silently skip
        if (error.code === '23505') {
          results.skipped++;
          console.log(`[NewsIngestion] Skipped duplicate: ${article.title.slice(0, 60)}`);
        } else {
          results.errors.push(`"${article.title.slice(0, 60)}": ${error.message}`);
          console.error('[NewsIngestion] Insert error:', error.message);
        }
      } else {
        results.inserted++;
        console.log(`[NewsIngestion] ✓ Inserted: ${article.title.slice(0, 60)}`);
      }
    } catch (err) {
      results.errors.push(`Error: ${err.message}`);
      console.error('[NewsIngestion] Unexpected error inserting article:', err.message);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Ingest news for a single category:
 *   1. Fetch from GNews API
 *   2. Filter out duplicates already in the DB
 *   3. Insert new articles into Supabase
 *
 * @param {string} categorySlug  - e.g. 'technology'
 * @param {string} gnewsCategory - GNews category param (may differ from slug)
 * @param {number} maxArticles   - How many articles to fetch (default 10)
 * @returns {Promise<Object>}    - { success, fetched, inserted, skipped, errors }
 */
export async function ingestCategoryNews(categorySlug, gnewsCategory, maxArticles = 10) {
  console.log(`[NewsIngestion] ── Starting ingestion for: ${categorySlug} ──`);

  try {
    // Step 1: Fetch from API
    const rawArticles = await fetchFromGNews(gnewsCategory || categorySlug, maxArticles);
    if (!rawArticles.length) {
      return { success: true, fetched: 0, inserted: 0, skipped: 0, errors: [] };
    }

    // Step 2: De-duplicate against DB
    const urls = rawArticles.map(a => a.url).filter(Boolean);
    const existingUrls = await getExistingUrls(urls);

    const newArticles = rawArticles.filter(a => a.url && !existingUrls.has(a.url));
    const skippedByUrl = rawArticles.length - newArticles.length;

    console.log(`[NewsIngestion] ${rawArticles.length} fetched → ${newArticles.length} new, ${skippedByUrl} already in DB`);

    if (!newArticles.length) {
      return { success: true, fetched: rawArticles.length, inserted: 0, skipped: skippedByUrl, errors: [] };
    }

    // Step 3: Insert into database
    const insertResult = await insertArticles(newArticles, categorySlug);

    const summary = {
      success:  insertResult.errors.length === 0,
      fetched:  rawArticles.length,
      inserted: insertResult.inserted,
      skipped:  skippedByUrl + insertResult.skipped,
      errors:   insertResult.errors,
    };

    console.log(`[NewsIngestion] ✓ Done for "${categorySlug}":`, summary);
    return summary;

  } catch (err) {
    console.error(`[NewsIngestion] ✗ Failed for "${categorySlug}":`, err.message);
    return { success: false, fetched: 0, inserted: 0, skipped: 0, errors: [err.message] };
  }
}

/**
 * Ingest news for ALL configured categories sequentially.
 * Results are returned per-category.
 *
 * @param {number} maxPerCategory - Max articles per category (default 10)
 * @returns {Promise<Object>}     - { totalInserted, results[] }
 */
export async function ingestAllCategories(maxPerCategory = 10) {
  console.log('[NewsIngestion] ═══ Starting FULL ingestion for all categories ═══');
  const results = [];
  let totalInserted = 0;

  for (const cat of INGEST_CATEGORIES) {
    const result = await ingestCategoryNews(cat.id, cat.gnewsCategory, maxPerCategory);
    results.push({ category: cat.name, slug: cat.id, ...result });
    totalInserted += result.inserted;

    // Brief pause between categories to avoid hammering the GNews API
    if (INGEST_CATEGORIES.indexOf(cat) < INGEST_CATEGORIES.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`[NewsIngestion] ═══ Full ingestion complete. Total inserted: ${totalInserted} ═══`);
  return { totalInserted, results };
}

export default { ingestCategoryNews, ingestAllCategories, INGEST_CATEGORIES };
