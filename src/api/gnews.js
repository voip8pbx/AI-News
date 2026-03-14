import axios from 'axios';

const GNEWS_API_BASE_URL = 'https://gnews.io/api/v4';
const API_KEYS = [
    import.meta.env.VITE_GNEWS_API_KEY,
    import.meta.env.VITE_GNEWS_FALLBACK_API_KEY,
    import.meta.env.VITE_GNEWS_TERTIARY_API_KEY,
    import.meta.env.VITE_GNEWS_QUATERNARY_API_KEY,
    import.meta.env.VITE_GNEWS_QUINARY_API_KEY
].filter(key => key && key.trim() !== ''); // Remove any empty/undefined/null values

// Helper function to fetch with fallback API keys and rate limiting
const fetchWithFallback = async (endpoint, params) => {
    let lastError = null;

    if (API_KEYS.length === 0) {
        throw new Error('No GNews API keys configured. Please check your environment variables.');
    }

    // Throttle request
    await throttleRequest();

    console.log(`[GNews] Attempting fetch with ${API_KEYS.length} API keys`);

    for (let i = 0; i < API_KEYS.length; i++) {
        const apiKey = API_KEYS[i];
        try {
            // Add much longer delay between requests to avoid rate limiting
            if (i > 0) {
                // Exponential backoff: 5s, 10s, 20s, 30s (much more conservative)
                const delay = Math.min(5000 * Math.pow(2, i - 1), 30000);
                console.log(`[GNews] Waiting ${delay}ms before trying API key ${i + 1}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            const response = await axios.get(`${GNEWS_API_BASE_URL}${endpoint}`, {
                params: { ...params, apikey: apiKey },
                timeout: 25000, // Further increased timeout
            });
            
            console.log(`[GNews] Success with API key ${i + 1}`);
            return response;
        } catch (error) {
            lastError = error;
            const status = error.response?.status;
            console.warn(`[GNews] API key ${i + 1} failed: Status ${status}, trying next...`);
            
            // If it's not a rate limit or auth error, don't retry
            if (status !== 403 && status !== 429 && status !== 401) {
                throw error;
            }
            
            // If it's a rate limit error, wait much longer before retrying
            if (status === 429) {
                const retryDelay = 30000 + (i * 10000); // 30s, 40s, 50s
                console.log(`[GNews] Rate limited, waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    // All keys failed - implement circuit breaker
    console.error('[GNews] All API keys failed - implementing circuit breaker');
    
    // If we got rate limited on all keys, wait longer before allowing next request
    if (lastError?.response?.status === 429) {
        const circuitBreakerDelay = 60000; // 1 minute circuit breaker
        console.log(`[GNews] Circuit breaker activated, waiting ${circuitBreakerDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, circuitBreakerDelay));
    }
    
    throw lastError || new Error('All API keys failed');
};

// Categories to fetch
export const NEWS_CATEGORIES = [
    { id: 'technology', name: 'Technology', query: 'technology' },
    { id: 'startups', name: 'Startups', query: 'startup OR business OR entrepreneurship' },
    { id: 'finance', name: 'Finance', query: 'finance OR stock market OR economy' },
    { id: 'crypto', name: 'Crypto', query: 'cryptocurrency OR bitcoin OR blockchain' },
    { id: 'world', name: 'World', query: 'world news OR international OR global' },
    { id: 'sports', name: 'Sports', query: 'sports OR football OR basketball OR soccer' },
];

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (increased from 10)

// Request throttling
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5000; // Increased to 5 seconds between requests

// Global rate limiting tracker
let requestCount = 0;
let rateLimitResetTime = 0;
const MAX_REQUESTS_PER_HOUR = 50; // Conservative limit

// Throttle requests to prevent rate limiting
const throttleRequest = async () => {
    const now = Date.now();
    
    // Reset counter if hour has passed
    if (now > rateLimitResetTime) {
        requestCount = 0;
        rateLimitResetTime = now + (60 * 60 * 1000); // 1 hour from now
    }
    
    // Check if we're approaching rate limit
    if (requestCount >= MAX_REQUESTS_PER_HOUR) {
        const waitTime = rateLimitResetTime - now;
        console.log(`[GNews] Rate limit approached, waiting ${waitTime}ms until reset`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        requestCount = 0;
    }
    
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.log(`[GNews] Throttling request, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime = Date.now();
    requestCount++;
};

// Get cached data
const getCachedData = (key) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
};

// Set cached data
const setCachedData = (key, data) => {
    cache.set(key, { data, timestamp: Date.now() });
};

// Fetch news by category with caching
export const fetchNewsByCategory = async (categoryQuery, page = 1, max = 4) => { // Further reduced to 4
    const cacheKey = `${categoryQuery}-${page}`;

    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        console.log(`[GNews] Returning cached data for ${categoryQuery}`);
        return cachedData;
    }

    try {
        const response = await fetchWithFallback('/search', {
            q: categoryQuery,
            lang: 'en',
            max: max,
        });

        const data = response.data;

        // Transform GNews response to our format
        const articles = data.articles?.map((article, index) => ({
            id: article.url || index,
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            image: article.image,
            publishedAt: article.publishedAt,
            source: article.source?.name || 'Unknown',
            sourceUrl: article.source?.url || '',
            category: categoryQuery,
        })) || [];

        const result = { articles, totalArticles: data.totalArticles, page };

        // Cache the result
        setCachedData(cacheKey, result);

        return result;
    } catch (error) {
        console.error(`Error fetching news for ${categoryQuery}:`, error);

        // Handle rate limiting or auth errors (all keys failed)
        if (error.response?.status === 429) {
            throw new Error('GNews API rate limit exceeded. Please wait a few minutes before trying again.');
        }
        if (error.response?.status === 403 || error.response?.status === 401) {
            throw new Error('GNews API authentication failed. Please check your API keys.');
        }

        // Handle other errors
        throw error;
    }
};

// Fetch top headlines
export const fetchTopHeadlines = async (max = 10) => {
    const cacheKey = `top-headlines-${max}`;

    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    try {
        const response = await fetchWithFallback('/top-headlines', {
            lang: 'en',
            max: max,
        });

        const data = response.data;

        const articles = data.articles?.map((article, index) => ({
            id: article.url || index,
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            image: article.image,
            publishedAt: article.publishedAt,
            source: article.source?.name || 'Unknown',
            sourceUrl: article.source?.url || '',
        })) || [];

        const result = { articles, totalArticles: data.totalArticles };

        setCachedData(cacheKey, result);

        return result;
    } catch (error) {
        console.error('Error fetching top headlines:', error);

        // Handle rate limiting or auth errors (all keys failed)
        if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded on all API keys. Please try again later.');
        }
        if (error.response?.status === 403 || error.response?.status === 401) {
            throw new Error('All API keys unauthorized. Please check your API keys.');
        }

        throw error;
    }
};

// Fetch multiple categories at once
export const fetchMultipleCategories = async (categories, maxPerCategory = 5) => {
    const results = {};

    await Promise.allSettled(
        categories.map(async (category) => {
            try {
                const data = await fetchNewsByCategory(category.query, 1, maxPerCategory);
                results[category.id] = {
                    ...data,
                    categoryName: category.name,
                    success: true
                };
            } catch (error) {
                results[category.id] = {
                    articles: [],
                    categoryName: category.name,
                    success: false,
                    error: error.message
                };
            }
        })
    );

    return results;
};

// Clear cache
export const clearNewsCache = () => {
    cache.clear();
};
