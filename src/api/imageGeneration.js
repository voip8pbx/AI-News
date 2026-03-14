import { supabase } from '../supabase';

// Environment variables
const NANO_BANANA_API_KEY = import.meta.env.VITE_NANO_BANANA_API_KEY;
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY;
const GNEWS_FALLBACK_API_KEY = import.meta.env.VITE_GNEWS_FALLBACK_API_KEY;
const GNEWS_TERTIARY_API_KEY = import.meta.env.VITE_GNEWS_TERTIARY_API_KEY;
const GNEWS_QUATERNARY_API_KEY = import.meta.env.VITE_GNEWS_QUATERNARY_API_KEY;
const GNEWS_QUINARY_API_KEY = import.meta.env.VITE_GNEWS_QUINARY_API_KEY;

// Nano Banana API endpoint (placeholder - replace with actual endpoint)
const NANO_BANANA_API_URL = 'https://api.nanobanana.ai/v1/generate';

/**
 * Generate a hash from article title for caching
 * @param {string} title - Article title
 * @returns {string} - Hash string
 */
export const generateArticleHash = (title) => {
    if (!title) return null;
    // Simple hash function for article identification
    let hash = 0;
    const str = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
};

/**
 * Build the prompt for Nano Banana image generation
 * Creates premium editorial social media posters that look like global newsroom visual journalism
 * @param {string} title - Article title
 * @param {string} description - Article description/content
 * @param {string} imageUrl - Reference image URL (optional)
 * @returns {string} - Formatted prompt for editorial poster generation
 */
const buildNanoBananaPrompt = (title, description, imageUrl) => {
    const prompt = `Create a premium editorial social media poster for news journalism.

CANVAS SPECIFICATIONS:
- Resolution: 1080 × 1920 pixels (9:16 vertical aspect ratio)
- Optimized for Instagram, LinkedIn, and newsroom social feeds
- Design must resemble global newsroom visual journalism - elite, credible, cinematic, colorful, modern, scroll-stopping

HEADLINE STYLE:
Write a sharp newsroom headline in Bloomberg/Financial Times tone.
- Factual and authoritative
- Short and powerful
- Maximum 10 words
- Example: "Tech Giants Face Record $2.3B Antitrust Fine"

SUB-HEADLINE:
One sentence summarizing the key development.
- Explain what happened and why it matters
- Maximum 20 words

BODY SUMMARY:
Write 2-3 short lines explaining:
- The event
- The context
- The broader impact
- Professional newsroom tone, neutral language, no exaggeration, no emojis

SOURCE ATTRIBUTION (MANDATORY):
Always include the news source.
Format: Source: [Publication Name]
Placement: Bottom area, small editorial text, subtle newsroom style

VISUAL COMPOSITION:
- Primary image: Use realistic contextual imagery related to the news
- For political leaders/CEOs/public figures: Use real images from public events or press coverage
- For companies/locations: Use real headquarters, buildings, or relevant imagery
- Avoid generic stock imagery
- Visual must clearly represent the actual story

LAYOUT SYSTEM (rotate elements for variety):
- Left text / right visual
- Right text / left visual
- Center headline with layered background
- Minimal editorial layout
- Futuristic grid layout
- Luxury cinematic composition
- Every generation must be visually different

COLOR THEMES (choose one per generation):
- Black + Gold (premium, authoritative)
- White + Lemon Green (fresh, modern)
- Blue + White Gradient (trustworthy, corporate)
- Cream + Beige (elegant, editorial)
- Black + Neon Green (bold, tech-forward)
- Palette must feel: premium, editorial, colorful yet professional, visually engaging

CONTEXTUAL IMAGE TREATMENT:
- Vertical image strips
- Blurred background layers
- Newsroom grid textures
- Subtle map overlays
- Abstract silhouettes
- Faded background visuals
- Avoid: circular thumbnails, cheap collage layouts, clutter

TYPOGRAPHY:
- Strong headline hierarchy
- Elegant spacing
- Magazine-quality composition
- High readability
- Use premium editorial typography inspired by:
  * Bloomberg newsroom graphics
  * Financial Times editorial layouts
  * Reuters visual reports
  * Forbes corporate design

BRAND ELEMENT:
Include subtle brand mark "StartEJ"
- Clean corner placement
- Small, elegant, integrated naturally into layout

DESIGN TONE:
- Cinematic, editorial, modern, colorful yet professional
- Premium newsroom aesthetic
- Avoid: clutter, flashy effects, clickbait styling, cartoon visuals

NEGATIVE CONSTRAINTS:
- Do NOT generate fake news or incorrect facts
- Do NOT use AI-generated faces or fictional scenes
- Do NOT create artificial portraits
- Do NOT use low-resolution graphics or amateur typography
- All visuals must remain journalistically credible

QUALITY STANDARD:
International news agency quality (BBC, Reuters, Bloomberg, Financial Times, National Geographic)

IMPORTANT: Do not add text, titles, logos, watermarks, or captions in the image. The image should be the visual representation only - all text will be added separately.

Article Title: ${title}

Article Context/Description: ${description}

${imageUrl ? `Reference Image (use for visual inspiration): ${imageUrl}` : 'Create new visual based on article context above.'}`;

    return prompt;
};

/**
 * Call Nano Banana API to generate an image
 * @param {string} prompt - The prompt for image generation
 * @returns {Promise<string>} - Generated image URL
 */
const callNanoBananaAPI = async (prompt) => {
    if (!NANO_BANANA_API_KEY || NANO_BANANA_API_KEY === 'AIzaSyDg_3jtO8IVSFENvzGXkgnAkt75CW1kdOgr') {
        console.warn('[ImageGen] Nano Banana API key not configured. Using stable placeholder.');
        // Use a stable seed based on prompt hash for consistent images
        const seed = prompt.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
        const stableUrl = `https://picsum.photos/seed/${Math.abs(seed)}/1200/675`;
        console.log('[ImageGen] Returning placeholder image:', stableUrl);
        return stableUrl;
    }

    try {
        console.log('[ImageGen] Calling Nano Banana API...');
        const response = await fetch(NANO_BANANA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NANO_BANANA_API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
                model: 'nano-banana-v1',
                size: '16:9',
                quality: 'high'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Nano Banana API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.image_url) {
            console.log('[ImageGen] Got image URL from API:', data.image_url.substring(0, 50));
            return data.image_url;
        }

        throw new Error('No image URL in response');
    } catch (error) {
        console.error('[ImageGen] Nano Banana API call failed:', error);
        throw error;
    }
};

/**
 * Check if a cached image exists for the article
 * @param {string} articleHash - The article hash
 * @returns {Promise<object|null>} - Cached image data or null
 */
export const getCachedImage = async (articleHash) => {
    try {
        const { data, error } = await supabase
            .from('news_images')
            .select('*')
            .eq('article_hash', articleHash)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned - cache miss
                return null;
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('[ImageGen] Error checking cache:', error);
        return null;
    }
};

/**
 * Store generated image in cache
 * @param {string} articleTitle - Article title
 * @param {string} articleHash - Article hash
 * @param {string} generatedImageUrl - Generated image URL
 * @param {string} originalImageUrl - Original article image URL
 * @returns {Promise<object>} - Stored image data
 */
export const cacheGeneratedImage = async (articleTitle, articleHash, generatedImageUrl, originalImageUrl) => {
    try {
        console.log('[ImageGen] Caching image for:', articleTitle?.substring(0, 30), 'hash:', articleHash);

        const { data, error } = await supabase
            .from('news_images')
            .insert([{
                article_title: articleTitle,
                article_hash: articleHash,
                generated_image_url: generatedImageUrl,
                original_image_url: originalImageUrl || null,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('[ImageGen] Error caching image:', error);
            throw error;
        }
        console.log('[ImageGen] Image cached successfully:', data);
        return data;
    } catch (error) {
        console.error('[ImageGen] Error caching image:', error);
        // Don't throw - allow fallback to work even if caching fails
        return null;
    }
};

/**
 * Generate or retrieve AI-enhanced image for an article
 * @param {object} article - Article object with title, content/description, and image
 * @param {boolean} forceRegenerate - Force regeneration even if cached
 * @returns {Promise<string>} - Generated or original image URL
 */
export const generateArticleImage = async (article, forceRegenerate = false) => {
    const title = article.title;
    const description = article.content || article.summary || article.description || '';
    // Support both camelCase and snake_case property names for robustness
    const imageUrl = article.bannerImage || article.banner_image || article.image || article.thumbnailImage || null;

    if (!title) {
        console.warn('[ImageGen] No title provided, throwing error');
        throw new Error('No article title provided');
    }

    console.log('[ImageGen] generateArticleImage called for:', title.substring(0, 40), 'original:', imageUrl?.substring(0, 40));

    const articleHash = generateArticleHash(title);

    // Check cache first (unless force regenerate)
    if (!forceRegenerate) {
        const cached = await getCachedImage(articleHash);
        if (cached) {
            console.log('[ImageGen] Cache hit for:', title.substring(0, 30), '→', cached.generated_image_url.substring(0, 50));
            return cached.generated_image_url;
        }
    }

    // Build prompt and generate new image
    const prompt = buildNanoBananaPrompt(title, description, imageUrl);

    try {
        const generatedImageUrl = await callNanoBananaAPI(prompt);
        console.log('[ImageGen] Generated image URL:', generatedImageUrl.substring(0, 60));

        if (!generatedImageUrl) {
            throw new Error('Generation returned empty URL');
        }

        // Cache the result (but don't fail if caching fails)
        try {
            await cacheGeneratedImage(title, articleHash, generatedImageUrl, imageUrl);
            console.log('[ImageGen] Image cached successfully');
        } catch (cacheErr) {
            console.warn('[ImageGen] Caching failed (continuing anyway):', cacheErr.message);
        }

        console.log('[ImageGen] Generated new image for:', title.substring(0, 30), '→', generatedImageUrl.substring(0, 50));
        return generatedImageUrl;
    } catch (error) {
        console.error('[ImageGen] Failed to generate image for', title.substring(0, 30), ':', error.message);
        // NEVER return original image - throw error for retry
        throw new Error(`Image generation failed: ${error.message}`);
    }
};

/**
 * Process multiple articles in parallel for image generation
 * @param {Array<object>} articles - Array of articles
 * @param {number} maxConcurrent - Maximum concurrent generations (default: 5)
 * @returns {Promise<Array>} - Articles with generatedImage property
 */
export const processArticlesInParallel = async (articles, maxConcurrent = 5) => {
    if (!articles || articles.length === 0) {
        console.log('[ImageGen] No articles to process');
        return [];
    }

    console.log(`[ImageGen] Processing ${articles.length} articles in parallel (max: ${maxConcurrent})`);

    // Process in batches to avoid rate limiting
    const results = [];
    const batchSize = maxConcurrent;

    for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        console.log(`[ImageGen] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} articles)`);

        const batchPromises = batch.map(async (article) => {
            try {
                const generatedImage = await generateArticleImage(article);
                console.log(`[ImageGen] ✓ Completed: ${article.title?.substring(0, 30)}`);
                return {
                    ...article,
                    generatedImage
                };
            } catch (error) {
                console.error(`[ImageGen] ✗ Error processing article: ${article.title}`, error);
                // Don't use fallback - just skip this article and return null image
                console.log(`[ImageGen] No AI image generated for: ${article.title?.substring(0, 30)}`);
                return {
                    ...article,
                    generatedImage: null
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    console.log(`[ImageGen] ✓ Parallel processing complete. ${results.length} articles processed`);
    return results;
};

/**
 * Background worker function - processes articles in the background
 * This can be called on app initialization or via scheduled task
 * @param {Array<object>} articles - Articles to process
 * @returns {Promise<object>} - Processing summary
 */
export const runBackgroundImageWorker = async (articles) => {
    const startTime = Date.now();
    let processed = 0;
    let cached = 0;
    let generated = 0;
    let failed = 0;

    console.log(`[ImageGen] Background worker started for ${articles.length} articles`);

    for (const article of articles) {
        try {
            const articleHash = generateArticleHash(article.title);
            const existingCache = await getCachedImage(articleHash);

            if (existingCache) {
                cached++;
            } else {
                // Generate new image in background
                await generateArticleImage(article);
                generated++;
            }
            processed++;
        } catch (error) {
            console.error(`[ImageGen] Background worker error for:`, article.title, error);
            failed++;
        }
    }

    const duration = Date.now() - startTime;
    const summary = {
        total: articles.length,
        processed,
        cached,
        generated,
        failed,
        durationMs: duration
    };

    console.log('[ImageGen] Background worker completed:', summary);
    return summary;
};

/**
 * Fetch latest news from GNews API and generate images
 * @param {string} category - News category
 * @param {number} limit - Number of articles
 * @returns {Promise<Array>} - Articles with generated images
 */
export const fetchAndGenerateNewsImages = async (category = 'general', limit = 10) => {
    const gnewsKeys = [
        GNEWS_API_KEY, 
        GNEWS_FALLBACK_API_KEY, 
        GNEWS_TERTIARY_API_KEY,
        GNEWS_QUATERNARY_API_KEY,
        GNEWS_QUINARY_API_KEY
    ].filter(Boolean);

    if (gnewsKeys.length === 0) {
        console.warn('[ImageGen] No GNews API keys configured');
        return [];
    }

    try {
        let gnewsData = null;
        for (const key of gnewsKeys) {
            try {
                const response = await fetch(
                    `https://gnews.io/api/v4/top-headlines?category=${encodeURIComponent(category)}&lang=en&max=${limit}&token=${key}`
                );

                if (response.ok) {
                    gnewsData = await response.json();
                    break;
                } else {
                    console.warn(`[ImageGen] GNews key failed: ${response.status}`);
                }
            } catch (err) {
                console.warn('[ImageGen] Network error with GNews key', err);
            }
        }

        if (!gnewsData || !gnewsData.articles) {
            throw new Error('All GNews API keys failed or returned no articles');
        }

        const articles = gnewsData.articles.map(article => ({
            title: article.title,
            description: article.description,
            content: article.content,
            image: article.image,
            url: article.url,
            source: article.source
        }));

        // Generate images for all articles in parallel
        const articlesWithImages = await processArticlesInParallel(articles);

        return articlesWithImages;
    } catch (error) {
        console.error('[ImageGen] Error fetching from GNews:', error);
        throw error;
    }
};

/**
 * Get all cached images from the database
 * @returns {Promise<Array>} - All cached images
 */
export const getAllCachedImages = async () => {
    try {
        const { data, error } = await supabase
            .from('news_images')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[ImageGen] Error fetching cached images:', error);
        return [];
    }
};

/**
 * Create the news_images table in Supabase (if it doesn't exist)
 * This should be run once during setup
 * @returns {Promise<boolean>} - Success status
 */
export const initializeImageCacheTable = async () => {
    try {
        // Try to create table using Supabase's create table if not exists
        // Note: This requires service role key which isn't available in client
        // Instead, we'll return instructions for manual setup

        console.log('[ImageGen] Table initialization - please run the SQL below in Supabase SQL Editor:');
        console.log(`
-- Create news_images table for caching AI-generated article images
CREATE TABLE IF NOT EXISTS news_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_title TEXT NOT NULL,
  article_hash TEXT NOT NULL UNIQUE,
  generated_image_url TEXT NOT NULL,
  original_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_news_images_article_hash ON news_images(article_hash);
CREATE INDEX IF NOT EXISTS idx_news_images_created_at ON news_images(created_at DESC);
    `);

        return true;
    } catch (error) {
        console.error('[ImageGen] Error initializing table:', error);
        return false;
    }
};
