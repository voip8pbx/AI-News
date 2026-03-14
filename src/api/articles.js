import { supabase } from '../supabase';
import { generateArticleHash, processArticlesInParallel } from './imageGeneration';

// Local env-based keys for client-side ingestion.
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_FALLBACK_API_KEY = import.meta.env.VITE_OPENROUTER_FALLBACK_API_KEY;
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY;
const GNEWS_FALLBACK_API_KEY = import.meta.env.VITE_GNEWS_FALLBACK_API_KEY;
const GNEWS_TERTIARY_API_KEY = import.meta.env.VITE_GNEWS_TERTIARY_API_KEY;
const GNEWS_QUATERNARY_API_KEY = import.meta.env.VITE_GNEWS_QUATERNARY_API_KEY;
const GNEWS_QUINARY_API_KEY = import.meta.env.VITE_GNEWS_QUINARY_API_KEY;

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// --- ADMIN & MANAGEMENT ---

export const createArticleAI = async (articleData) => {
  let { title, content, url, sourceName, sourceUrl, category } = articleData || {};
  let bannerImage;

  // Optional: if no content/title provided, fall back to GNews based on category
  const gnewsKeys = [
    GNEWS_API_KEY, 
    GNEWS_FALLBACK_API_KEY, 
    GNEWS_TERTIARY_API_KEY,
    GNEWS_QUATERNARY_API_KEY,
    GNEWS_QUINARY_API_KEY
  ].filter(Boolean);
  if ((!content || !title) && category && gnewsKeys.length > 0) {
    let gnewsData = null;
    for (const key of gnewsKeys) {
      try {
        const res = await fetch(
          `/api/gnews/top-headlines?category=${encodeURIComponent(
            category.toLowerCase()
          )}&lang=en&max=1&token=${key}`
        );
        const data = await res.json();
        if (res.ok && data.articles?.[0]) {
          gnewsData = data;
          break;
        }
      } catch (err) {
        console.warn(`GNews key failed in createArticleAI`, err);
      }
    }

    const first = gnewsData?.articles?.[0];
    if (first) {
      title = title || first.title;
      content = content || first.content || first.description;
      url = url || first.url;
      sourceName = sourceName || first.source?.name || 'GNews';
      sourceUrl = sourceUrl || first.url;
      bannerImage = first.image;
    }
  }

  if (!content && !title) {
    throw new Error("No content or title provided for AI synthesis.");
  }

  // Call OpenRouter to rewrite/expand the article
  const systemPrompt = `You are a Senior Investigative Journalist and Editor. Your task is to transform raw news into a comprehensive, long-form feature article.
OUTPUT REQUIREMENTS:
1. "title": Create a new, click-worthy, SEO-optimized headline.
2. "rewrittenContent": Must be at least 800-1000 words in Markdown format.
3. "summary": A compelling 4-5 line executive summary for meta descriptions.
4. "seoKeywords": ["1", "2", "3", "4", "5"] (Exactly 5 strings).

STRICT FORMATTING: 
- Output ONLY valid JSON.
JSON STRUCTURE:
{
  "title": "string",
  "rewrittenContent": "string",
  "summary": "string",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

  let llmData;
  const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openrouter/google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!llmRes.ok) {
    // Try fallback API key if primary fails
    console.warn("[OpenRouter] Primary API key failed, trying fallback...");
    const fallbackRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_FALLBACK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!fallbackRes.ok) {
      throw new Error(`OpenRouter API failed with both keys: ${llmRes.status} primary, ${fallbackRes.status} fallback`);
    }

    llmData = await fallbackRes.json();
  } else {
    llmData = await llmRes.json();
  }
  
  const responseText = llmData.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(responseText);

  const dbCategory = category || 'general';
  const categorySlug = slugify(dbCategory);
  const generatedSlug = slugify(parsed.title || title);

  const { data, error } = await supabase
    .from('articles')
    .insert([{
      title: parsed.title,
      ai_content: parsed.rewrittenContent,
      summary: parsed.summary,
      seo_keywords: parsed.seoKeywords,
      url: url || `https://fallback.com/${Date.now()}`,
      source_name: sourceName || "AI Generated",
      source_url: sourceUrl || `https://fallback.com/${Date.now()}`,
      category: dbCategory,
      category_slug: categorySlug,
      slug: generatedSlug,
      model_used: "openrouter/google/gemini-2.0-flash-001",
      banner_image: bannerImage || null,
      published_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return { article: data };
};

export const updateArticle = async (id, articleData, token) => {
  const { data, error } = await supabase
    .from('articles')
    .update(articleData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { article: data };
};

export const deleteArticle = async (id, token) => {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true };
};

// --- PUBLIC FEEDS ---

const mapArticle = (row) => {
  if (!row) return row;
  return {
    ...row,
    // Snake-case → camelCase field mappings
    bannerImage:  row.banner_image  ?? row.bannerImage,
    publishedAt:  row.published_at  ?? row.publishedAt,
    categorySlug: row.category_slug ?? row.categorySlug,
    source: row.source || (row.source_name ? { name: row.source_name, url: row.source_url || '' } : undefined),
    // Normalise description/content: support both plain-ingested and AI-rewritten articles
    description: row.description || row.summary || '',
    content:     row.content || row.ai_content || '',
  };
};

export const getArticles = async (page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(start, end);

  if (error) throw error;

  const mapped = (data || []).map(mapArticle);

  return {
    articles: mapped,
    totalCount: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  };
};

export const getArticlesByCategory = async (categorySlug, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .eq('category_slug', categorySlug)
    .order('published_at', { ascending: false })
    .range(start, end);

  if (error) throw error;

  const mapped = (data || []).map(mapArticle);

  return {
    articles: mapped,
    totalCount: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  };
};

export const getArticleBySlug = async (category, slug) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return { data: mapArticle(data) }; // Axios returned an object with 'data' property
};

/**
 * Get article by slug with generated image
 * @param {string} category - Article category
 * @param {string} slug - Article slug
 * @returns {Promise<object>} - Article with generated image
 */
export const getArticleBySlugWithGeneratedImage = async (category, slug) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;

  const article = mapArticle(data);
  const articleHash = generateArticleHash(article.title);

  // Check for cached generated image
  let generatedImage = null;
  if (articleHash) {
    try {
      const { data: cachedImage, error: cacheError } = await supabase
        .from('news_images')
        .select('generated_image_url')
        .eq('article_hash', articleHash)
        .single();

      if (cacheError && cacheError.code !== 'PGRST116') {
        console.warn('[Articles] Error fetching cached image:', cacheError);
      } else if (cachedImage) {
        generatedImage = cachedImage.generated_image_url;
      }
    } catch (err) {
      console.warn('[Articles] Error fetching cached image:', err);
    }
  }

  return {
    data: {
      ...article,
      generatedImage
    }
  };
};

export const getArticleById = async (id) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return { data: mapArticle(data) };
};

export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(cat => ({
    _id: cat.id,
    name: cat.name,
    slug: cat.slug,
    searchQuery: cat.search_query,
    isActive: cat.is_active,
    order: cat.order
  }));
};

// --- SEARCH & INTERACTIONS ---

export const searchArticles = async (query, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .ilike('title', `%${query}%`) // simple ilike search
    .order('published_at', { ascending: false })
    .range(start, end);

  if (error) throw error;

  const mapped = (data || []).map(mapArticle);

  return {
    articles: mapped,
    metadata: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  };
};

export const likeArticle = async (id) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  // Check if liked
  const { data: liked, error: fetchErr } = await supabase
    .from('liked_articles')
    .select('*')
    .eq('user_id', user.id)
    .eq('article_id', id);

  if (fetchErr) throw fetchErr;

  if (liked && liked.length > 0) {
    // unlike
    await supabase.from('liked_articles').delete().eq('user_id', user.id).eq('article_id', id);
    // decrement like count
    const { data: artObj } = await supabase.from('articles').select('likes_count').eq('id', id).single();
    await supabase.from('articles').update({ likes_count: (artObj.likes_count || 0) - 1 }).eq('id', id);
    return { status: 200, data: { status: 'unliked' } };
  } else {
    // like
    await supabase.from('liked_articles').insert([{ user_id: user.id, article_id: id }]);
    const { data: artObj } = await supabase.from('articles').select('likes_count').eq('id', id).single();
    await supabase.from('articles').update({ likes_count: (artObj.likes_count || 0) + 1 }).eq('id', id);
    return { status: 200, data: { status: 'liked' } };
  }
};

export const commentArticle = async (id, text, parentId = null) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single();

  const { data, error } = await supabase
    .from('comments')
    .insert([
      { article_id: id, user_id: user.id, user_name: userData.name || 'User', comment: text, parent_id: parentId }
    ])
    .select()
    .single();

  if (error) throw error;
  return { data };
};

export const likeComment = async (articleId, commentId) => {
  // simplify for now or implement similarly to likeArticle
  return { data: { success: true } };
};

export const deleteComment = async (articleId, commentId) => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
  return { data: { success: true } };
};

export const saveArticle = async (id) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { data: saved, error: fetchErr } = await supabase
    .from('saved_articles')
    .select('*')
    .eq('user_id', user.id)
    .eq('article_id', id);

  if (fetchErr) throw fetchErr;

  if (saved && saved.length > 0) {
    await supabase.from('saved_articles').delete().eq('user_id', user.id).eq('article_id', id);
    return { data: { status: 'unsaved' } };
  } else {
    await supabase.from('saved_articles').insert([{ user_id: user.id, article_id: id }]);
    return { data: { status: 'saved' } };
  }
};

export const trackArticleView = async (slug) => {
  const { data: article } = await supabase.from('articles').select('views').eq('slug', slug).single();
  if (article) {
    const { data } = await supabase.from('articles').update({ views: (article.views || 0) + 1 }).eq('slug', slug);
    return { data };
  }
  return { data: null };
};

// Convenience helper: ingest a top headline for a category using the same pipeline
// (GNews -> OpenRouter rewrite -> Supabase insert). Returns the created article row.
export const ingestTopHeadlinesByCategory = async (category = 'general') => {
  const { article } = await createArticleAI({ category });
  return article;
};

// =====================================================
// AI Image Generation Functions
// =====================================================

/**
 * Get articles with cached AI-generated images
 * This joins articles with news_images table to get generated images
 * @param {number} page - Page number
 * @param {number} limit - Number of articles per page
 * @returns {Promise<object>} - Articles with generated images
 */
export const getArticlesWithGeneratedImages = async (page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  // First get the articles
  const { data: articles, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(start, end);

  if (error) throw error;
  if (!articles || articles.length === 0) {
    return {
      articles: [],
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    };
  }

  // Generate hashes for all articles
  const articlesWithHash = articles.map(article => ({
    ...article,
    articleHash: generateArticleHash(article.title)
  }));

  // Get all cached images for these articles
  const hashes = articlesWithHash.map(a => a.articleHash).filter(Boolean);

  console.log('[Articles] Looking for cached images for hashes:', hashes);

  let cachedImagesMap = {};
  if (hashes.length > 0) {
    try {
      const { data: cachedImages, error: cacheError } = await supabase
        .from('news_images')
        .select('article_hash, generated_image_url')
        .in('article_hash', hashes);

      if (cacheError) {
        console.warn('[Articles] Could not fetch cached images (table may not exist):', cacheError);
      } else if (cachedImages) {
        console.log('[Articles] Found cached images:', cachedImages);
        cachedImages.forEach(img => {
          cachedImagesMap[img.article_hash] = img.generated_image_url;
        });
      }
    } catch (err) {
      console.warn('[Articles] Error fetching cached images:', err);
    }
  }

  // Map articles with their generated images
  const mapped = articlesWithHash.map(article => {
    const mappedArticle = mapArticle(article);
    return {
      ...mappedArticle,
      generatedImage: cachedImagesMap[article.articleHash] || null
    };
  });

  return {
    articles: mapped,
    totalCount: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  };
};

/**
 * Get articles by category with generated images
 * @param {string} categorySlug - Category slug
 * @param {number} page - Page number
 * @param {number} limit - Number of articles per page
 * @returns {Promise<object>} - Articles with generated images
 */
export const getArticlesByCategoryWithGeneratedImages = async (categorySlug, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data: articles, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .eq('category_slug', categorySlug)
    .order('published_at', { ascending: false })
    .range(start, end);

  if (error) throw error;
  if (!articles || articles.length === 0) {
    return {
      articles: [],
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    };
  }

  // Get cached images
  const articlesWithHash = articles.map(article => ({
    ...article,
    articleHash: generateArticleHash(article.title)
  }));

  const hashes = articlesWithHash.map(a => a.articleHash).filter(Boolean);
  let cachedImagesMap = {};

  if (hashes.length > 0) {
    const { data: cachedImages } = await supabase
      .from('news_images')
      .select('article_hash, generated_image_url')
      .in('article_hash', hashes);

    if (cachedImages) {
      cachedImages.forEach(img => {
        cachedImagesMap[img.article_hash] = img.generated_image_url;
      });
    }
  }

  const mapped = articlesWithHash.map(article => {
    const mappedArticle = mapArticle(article);
    return {
      ...mappedArticle,
      generatedImage: cachedImagesMap[article.articleHash] || null
    };
  });

  return {
    articles: mapped,
    totalCount: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  };
};

/**
 * Search articles with generated images
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @param {number} limit - Number of articles per page
 * @returns {Promise<object>} - Search results with generated images
 */
export const searchArticlesWithGeneratedImages = async (query, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data: articles, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .ilike('title', `%${query}%`)
    .order('published_at', { ascending: false })
    .range(start, end);

  if (error) throw error;
  if (!articles || articles.length === 0) {
    return {
      articles: [],
      metadata: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }
    };
  }

  // Get cached images
  const articlesWithHash = articles.map(article => ({
    ...article,
    articleHash: generateArticleHash(article.title)
  }));

  const hashes = articlesWithHash.map(a => a.articleHash).filter(Boolean);
  let cachedImagesMap = {};

  if (hashes.length > 0) {
    const { data: cachedImages } = await supabase
      .from('news_images')
      .select('article_hash, generated_image_url')
      .in('article_hash', hashes);

    if (cachedImages) {
      cachedImages.forEach(img => {
        cachedImagesMap[img.article_hash] = img.generated_image_url;
      });
    }
  }

  const mapped = articlesWithHash.map(article => {
    const mappedArticle = mapArticle(article);
    return {
      ...mappedArticle,
      generatedImage: cachedImagesMap[article.articleHash] || null
    };
  });

  return {
    articles: mapped,
    metadata: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  };
};

/**
 * Generate AI images for articles in the background
 * This should be called periodically or on app initialization
 * @param {number} limit - Number of articles to process
 * @returns {Promise<object>} - Processing summary
 */
export const generateImagesForRecentArticles = async (limit = 20) => {
  // Get recent articles without cached images
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, content, summary, banner_image')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (!articles || articles.length === 0) {
    return { processed: 0, message: 'No articles to process' };
  }

  // Apply proper property mapping before processing (converts snake_case to camelCase)
  const mappedArticles = articles.map(mapArticle);

  // Process in parallel with image generation
  const articlesWithImages = await processArticlesInParallel(mappedArticles, 5);

  return {
    processed: articlesWithImages.length,
    articles: articlesWithImages
  };
};