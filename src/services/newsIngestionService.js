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
  import.meta.env.VITE_GNEWS_QUINTARY_API_KEY,
].filter(k => k && k.trim() !== '');

const NEWSAPI_KEY = import.meta.env.VITE_NEWS_API_KEY;
const NEWSAPI_BASE = '/api/newsapi';

// Categories to ingest when doing a full refresh
export const INGEST_CATEGORIES = [
  { id: 'technology',    name: 'Technology',    gnewsCategory: 'technology' },
  { id: 'business',      name: 'Business',      gnewsCategory: 'business'   },
  { id: 'startup',       name: 'Startup',       gnewsCategory: 'business'   },
  { id: 'finance',       name: 'Finance',       gnewsCategory: 'business'   },
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      // Use /search for startup/finance to get specific news, otherwise /top-headlines
      const isSearch = category === 'startup' || category === 'finance';
      const endpoint = isSearch ? '/search' : '/top-headlines';
      
      const url = new URL(`${GNEWS_BASE}${endpoint}`, window.location.origin);
      
      if (isSearch) {
        url.searchParams.set('q', category);
        url.searchParams.set('sortby', 'publishedAt');
      } else {
        url.searchParams.set('category', category);
      }

      url.searchParams.set('lang', 'en');
      url.searchParams.set('max', String(max));
      url.searchParams.set('apikey', apiKey);

      console.log(`[NewsIngestion] Fetching ${isSearch ? 'Search' : 'Category'} "${category}" with key ${apiKey.slice(0, 6)}...`);

      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${err.errors?.[0] || res.statusText}`);
      }

      const data = await res.json();
      console.log(`[NewsIngestion] Got ${data.articles?.length ?? 0} articles for "${category}"`);
      return data.articles || [];

    } catch (err) {
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
 * Fetch articles from NewsAPI.org (integrated as specialized source/fallback)
 */
async function fetchFromNewsAPI(category = 'general', max = 10) {
  if (!NEWSAPI_KEY) {
    console.warn('[NewsIngestion] NewsAPI.org key not found, skipping fallback.');
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const url = new URL(`${NEWSAPI_BASE}/top-headlines`, window.location.origin);
    
    // Always include country=in as per user's specific request
    url.searchParams.set('country', 'in');
    
    // Handle category/search
    if (category === 'startup' || category === 'finance') {
        url.searchParams.set('q', category);
    } else if (category !== 'general') {
        url.searchParams.set('category', category);
    }
    
    url.searchParams.set('pageSize', String(max));
    url.searchParams.set('apiKey', NEWSAPI_KEY);

    console.log(`[NewsIngestion] Fallback: Fetching NewsAPI.org "${category}" (country: in)...`);

    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMsg = `NewsAPI Error ${res.status}: ${err.message || res.statusText}`;
      console.error(`[NewsIngestion] NewsAPI failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const data = await res.json();
    
    // Normalize NewsAPI.org structure to GNews structure
    const normalized = (data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      content: a.content,
      url: a.url,
      image: a.urlToImage,
      publishedAt: a.publishedAt,
      source: {
        name: a.source?.name || 'NewsAPI',
        url: a.url
      }
    }));

    console.log(`[NewsIngestion] Successfully got ${normalized.length} articles from NewsAPI.org for "${category}"`);
    return normalized;

  } catch (err) {
    console.warn('[NewsIngestion] NewsAPI.org fallback failed:', err.message);
    return [];
  }
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
  const trulyInserted = [];

  for (const article of articles) {
    try {
      const slug = slugify(article.title);
      const articleData = {
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
        ai_image_status: 'pending', // Queue for AI generation
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select('id, title, description, content, category_slug, banner_image')
        .single();

      if (error) {
        if (error.code === '23505') {
          results.skipped++;
          console.log(`[NewsIngestion] Skipped duplicate: ${article.title.slice(0, 60)}`);
        } else {
          results.errors.push(`"${article.title.slice(0, 60)}": ${error.message}`);
          console.error('[NewsIngestion] Insert error:', error.message);
        }
      } else {
        results.inserted++;
        trulyInserted.push(data);
        console.log(`[NewsIngestion] ✓ Inserted: ${article.title.slice(0, 60)}`);
      }
    } catch (err) {
      results.errors.push(`Error: ${err.message}`);
      console.error('[NewsIngestion] Unexpected error inserting article:', err.message);
    }
  }

  // Notify the pipeline to start processing these new arrivals immediately
  if (trulyInserted.length > 0) {
    const { imagePipeline } = await import('./imagePipeline.js');
    imagePipeline.enqueue(trulyInserted).catch(e => console.warn('[Ingestion] Pipeline error:', e));
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
    // Step 1: Fetch from API (Try GNews first, then NewsAPI as fallback)
    let rawArticles = [];
    try {
        rawArticles = await fetchFromGNews(gnewsCategory || categorySlug, maxArticles);
    } catch (err) {
        console.log(`[NewsIngestion] GNews failed for ${categorySlug}, trying NewsAPI.org...`);
        rawArticles = await fetchFromNewsAPI(categorySlug, maxArticles);
    }

    if (!rawArticles || !rawArticles.length) {
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

    // Step 4: Update counters in the schedules table
    if (insertResult.inserted > 0) {
      try {
        const { data: schedule } = await supabase
          .from('schedules')
          .select('count_today')
          .eq('category', categorySlug)
          .single();

        const currentCount = schedule?.count_today || 0;
        
        await supabase
          .from('schedules')
          .update({
            count_today: currentCount + insertResult.inserted,
            last_run: new Date().toISOString()
          })
          .eq('category', categorySlug);
          
        console.log(`[NewsIngestion] Updated counters for ${categorySlug}: +${insertResult.inserted}`);
      } catch (countErr) {
        console.warn(`[NewsIngestion] Failed to update counters for ${categorySlug}:`, countErr.message);
      }
    }

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
