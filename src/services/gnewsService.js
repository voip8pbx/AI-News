// GNews API service for fetching news articles
const GNEWS_API_BASE_URL = '/api/gnews';

// Get API keys from environment variables with fallbacks
const getApiKey = () => {
  const keys = [
    import.meta.env.VITE_GNEWS_API_KEY,
    import.meta.env.VITE_GNEWS_FALLBACK_API_KEY,
    import.meta.env.VITE_GNEWS_TERTIARY_API_KEY,
    import.meta.env.VITE_GNEWS_QUATERNARY_API_KEY,
    import.meta.env.VITE_GNEWS_QUINARY_API_KEY
  ].filter(key => key && key.trim() !== '');
  
  if (keys.length === 0) {
    throw new Error('No GNews API keys found in environment variables');
  }
  
  return keys;
};

/**
 * Fetch top headlines from GNews API
 * @param {Object} options - Fetch options
 * @param {string} options.category - News category (technology, business, sports, etc.)
 * @param {string} options.country - Country code (us, gb, in, etc.)
 * @param {number} options.max - Maximum number of articles to fetch
 * @param {string} options.lang - Language code (en, es, fr, etc.)
 * @returns {Promise<Object>} - API response with articles
 */
export async function fetchTopHeadlines(options = {}) {
  const {
    category = 'technology',
    country = 'us',
    max = 10,
    lang = 'en'
  } = options;

  const apiKeys = getApiKey();
  let lastError = null;

  // Try each API key until one works
  for (const apiKey of apiKeys) {
    try {
      const url = new URL(`${GNEWS_API_BASE_URL}/top-headlines`, window.location.origin);
      url.searchParams.set('category', category);
      url.searchParams.set('country', country);
      url.searchParams.set('max', max.toString());
      url.searchParams.set('lang', lang);
      url.searchParams.set('apikey', apiKey);

      console.log(`[GNewsService] Fetching headlines with key ${apiKey.slice(0, 4)}...`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Verbis-AI-News/1.0'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        throw new Error(`API Error: ${data.errors.join(', ')}`);
      }

      console.log(`[GNewsService] Successfully fetched ${data.articles?.length || 0} articles`);
      return data;

    } catch (error) {
      lastError = error;
      console.warn(`[GNewsService] API key ${apiKey.slice(0, 4)}... failed:`, error.message);
      continue; // Try next API key
    }
  }

  // All API keys failed
  console.error('[GNewsService] All API keys failed:', lastError?.message);
  throw new Error(`All GNews API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Search for news articles
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - API response with articles
 */
export async function searchNews(query, options = {}) {
  const {
    country = 'us',
    max = 10,
    lang = 'en',
    sort = 'publishedAt' // publishedAt, relevance
  } = options;

  const apiKeys = getApiKey();
  let lastError = null;

  for (const apiKey of apiKeys) {
    try {
      const url = new URL(`${GNEWS_API_BASE_URL}/search`, window.location.origin);
      url.searchParams.set('q', query);
      url.searchParams.set('country', country);
      url.searchParams.set('max', max.toString());
      url.searchParams.set('lang', lang);
      url.searchParams.set('sort', sort);
      url.searchParams.set('apikey', apiKey);

      console.log(`[GNewsService] Searching news with key ${apiKey.slice(0, 4)}...`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Verbis-AI-News/1.0'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        throw new Error(`API Error: ${data.errors.join(', ')}`);
      }

      console.log(`[GNewsService] Successfully found ${data.articles?.length || 0} articles for query: ${query}`);
      return data;

    } catch (error) {
      lastError = error;
      console.warn(`[GNewsService] API key ${apiKey.slice(0, 4)}... failed:`, error.message);
      continue;
    }
  }

  console.error('[GNewsService] All API keys failed for search:', lastError?.message);
  throw new Error(`All GNews API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Validate and normalize GNews article data
 * @param {Object} article - Raw article from GNews API
 * @returns {Object} - Normalized article data
 */
export function normalizeArticle(article) {
  if (!article || !article.title) {
    throw new Error('Invalid article: missing title');
  }

  return {
    title: article.title.trim(),
    description: article.description?.trim() || '',
    content: article.content?.trim() || article.description?.trim() || '',
    url: article.url,
    image: article.image,
    publishedAt: article.publishedAt,
    source: {
      name: article.source?.name || 'Unknown',
      url: article.source?.url || ''
    },
    author: article.author || 'GNews',
    category: 'general' // Default category, will be overridden by schedule
  };
}

/**
 * Check if article already exists in database
 * @param {string} url - Article URL to check
 * @returns {Promise<boolean>} - True if article exists
 */
export async function articleExists(url) {
  if (!url) return false;

  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id')
      .eq('url', url)
      .maybeSingle();

    if (error) {
      console.warn('[GNewsService] Error checking article existence:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.warn('[GNewsService] Exception checking article existence:', error);
    return false;
  }
}

/**
 * Filter out duplicate articles
 * @param {Array} articles - Array of articles to filter
 * @returns {Promise<Array>} - Array of unique articles
 */
export async function filterDuplicates(articles) {
  if (!Array.isArray(articles)) return [];

  const uniqueArticles = [];
  const seenUrls = new Set();

  for (const article of articles) {
    try {
      const normalized = normalizeArticle(article);
      
      if (!seenUrls.has(normalized.url)) {
        // Check against database as well
        const exists = await articleExists(normalized.url);
        if (!exists) {
          seenUrls.add(normalized.url);
          uniqueArticles.push(normalized);
        }
      }
    } catch (error) {
      console.warn('[GNewsService] Skipping invalid article:', error.message);
    }
  }

  console.log(`[GNewsService] Filtered ${articles.length} articles down to ${uniqueArticles.length} unique articles`);
  return uniqueArticles;
}

/**
 * Get available news categories from GNews
 * @returns {Array} - List of supported categories
 */
export function getSupportedCategories() {
  return [
    'general',
    'world',
    'nation',
    'business',
    'technology',
    'entertainment',
    'sports',
    'science',
    'health'
  ];
}

/**
 * Get supported countries
 * @returns {Array} - List of supported country codes
 */
export function getSupportedCountries() {
  return [
    'us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'it', 'es', 'jp', 'kr', 'cn', 'ru', 'br', 'mx'
  ];
}

export default {
  fetchTopHeadlines,
  searchNews,
  normalizeArticle,
  articleExists,
  filterDuplicates,
  getSupportedCategories,
  getSupportedCountries
};
