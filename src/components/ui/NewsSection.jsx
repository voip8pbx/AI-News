import { useState, useEffect, useCallback } from 'react';

import { fetchNewsByCategory, fetchTopHeadlines, NEWS_CATEGORIES } from '../../api/gnews';

import { getArticlesByCategory } from '../../api/articles';

import { ExternalLink, Clock, AlertCircle, ChevronRight } from 'lucide-react';

import { formatArticleDate } from '../../utils/dateUtils';



// Skeleton loader component

const NewsCardSkeleton = () => (

    <div className="animate-pulse">

        <div className="bg-slate-200 dark:bg-slate-700 h-48 w-full rounded-t-lg" />

        <div className="p-4 space-y-3">

            <div className="bg-slate-200 dark:bg-slate-700 h-4 w-20 rounded" />

            <div className="bg-slate-200 dark:bg-slate-700 h-6 w-full rounded" />

            <div className="bg-slate-200 dark:bg-slate-700 h-6 w-3/4 rounded" />

            <div className="bg-slate-200 dark:bg-slate-700 h-4 w-full rounded" />

            <div className="bg-slate-200 dark:bg-slate-700 h-4 w-2/3 rounded" />

            <div className="flex items-center gap-2 pt-2">

                <div className="bg-slate-200 dark:bg-slate-700 h-3 w-16 rounded" />

                <div className="bg-slate-200 dark:bg-slate-700 h-3 w-20 rounded" />

            </div>

        </div>

    </div>

);



// Single news card
const NewsCard = ({ article, index }) => {
    const [imageError, setImageError] = useState(false);

    return (
        <article
            className={`group bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-500 hover:-translate-y-1 ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''
                }`}
        >
            <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
            >
                {/* Image */}
                <div className="relative overflow-hidden">
                    <img
                        src={imageError ? '/assets/img/blog/blog-default-1.jpg' : (article.image || '/assets/img/blog/blog-default-1.jpg')}
                        alt={article.title}
                        className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${index === 0 ? 'h-64 md:h-80' : 'h-48'
                            }`}
                        onError={() => setImageError(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Source badge */}
                    <div className="absolute top-3 left-3">
                        <span className="bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                            {article.source}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 md:p-5 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {formatArticleDate(article.publishedAt)}
                        </span>
                    </div>

                    <h3 className={`font-serif font-bold leading-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors duration-300 ${index === 0 ? 'text-xl md:text-2xl mb-3' : 'text-base md:text-lg mb-2'
                        }`}>
                        {article.title}
                    </h3>

                    {article.description && (
                        <p className={`text-slate-600 dark:text-slate-300 leading-relaxed flex-grow ${index === 0 ? 'text-sm md:text-base' : 'text-sm'
                            }`}>
                            {article.description}
                        </p>
                    )}

                    <div className="flex items-center gap-2 mt-auto text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <span className="text-xs font-bold uppercase tracking-wider">Read More</span>
                        <ChevronRight size={14} />
                    </div>
                </div>
            </a>
        </article>
    );
};



// Category tab button

const CategoryTab = ({ category, isActive, onClick }) => (

    <button

        onClick={onClick}

        className={`px-4 md:px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${isActive

            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'

            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white'

            }`}

    >

        {category.name}

    </button>

);



// News grid for a single category

const CategoryNewsGrid = ({ articles, loading, error, categoryName }) => {
    // Fallback sample data when no articles are available
    const sampleArticles = [
        {
            id: 'sample-1',
            title: 'Sample Technology News',
            description: 'This is a sample article to ensure content is always visible.',
            url: '#',
            image: '/assets/img/blog/blog-default-1.jpg',
            publishedAt: new Date().toISOString(),
            source: 'Sample Source'
        },
        {
            id: 'sample-2', 
            title: 'Another Sample Article',
            description: 'This is another sample article for demonstration purposes.',
            url: '#',
            image: '/assets/img/blog/blog-default-1.jpg',
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            source: 'Sample Source'
        },
        {
            id: 'sample-3',
            title: 'Third Sample Article',
            description: 'This is a third sample article to fill the grid.',
            url: '#',
            image: '/assets/img/blog/blog-default-1.jpg',
            publishedAt: new Date(Date.now() - 7200000).toISOString(),
            source: 'Sample Source'
        }
    ];

    const displayArticles = articles && articles.length > 0 ? articles : sampleArticles;

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <NewsCardSkeleton key={i} />
                ))}
            </div>
        );
    }



    if (error) {

        return (

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-8 text-center">

                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />

                <h3 className="font-serif text-xl font-bold text-red-800 dark:text-red-400 mb-2">

                    Unable to load {categoryName} news

                </h3>

                <p className="text-red-600 dark:text-red-500 text-sm mb-4">{error}</p>

                <p className="text-red-500 dark:text-red-600 text-xs">

                    Please check your API key or try again later.

                </p>

            </div>

        );

    }



    if (!articles || articles.length === 0) {

        return (

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-8 text-center">

                <p className="text-slate-500 dark:text-slate-400">No articles found for {categoryName}</p>

            </div>

        );

    }



    return (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayArticles.map((article, index) => (
                <NewsCard key={article.id || index} article={article} index={index} />
            ))}
        </div>

    );

};



// Main NewsSection component

export default function NewsSection() {

    const [activeCategory, setActiveCategory] = useState(NEWS_CATEGORIES[0]);

    const [newsData, setNewsData] = useState({});

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [lastFetched, setLastFetched] = useState(null);



    // Fetch news data with fallback to Supabase

    // Fetch news data from Supabase (Articles are stored via the manual /fetch-news panel)
    const fetchNews = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const categorySlug = activeCategory.id.toLowerCase();
            console.log(`[NewsSection] Loading articles for ${categorySlug} from Supabase...`);
            
            // Fetch from Supabase
            const supabaseResult = await getArticlesByCategory(categorySlug, 1, 6);
            
            // If no articles in Supabase, try fetching from GNews API
            if (!supabaseResult.articles || supabaseResult.articles.length === 0) {
                console.log(`[NewsSection] No articles in Supabase for ${categorySlug}, trying GNews API...`);
                
                try {
                    const gnewsResult = await fetchNewsByCategory(activeCategory, 6);
                    
                    if (gnewsResult.articles && gnewsResult.articles.length > 0) {
                        // Transform GNews articles to the expected format
                        const transformedGNewsArticles = gnewsResult.articles.map((article, index) => ({
                            id: `gnews-${categorySlug}-${index}`,
                            title: article.title,
                            description: article.description || '',
                            content: article.content || '',
                            url: article.url,
                            image: article.image,
                            publishedAt: article.publishedAt,
                            source: article.source?.name || 'GNews',
                            sourceUrl: article.source?.url,
                            category: categorySlug,
                            slug: article.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
                            categorySlug: categorySlug,
                        }));
                        
                        setNewsData(prev => ({
                            ...prev,
                            [activeCategory.id]: transformedGNewsArticles
                        }));
                        setLastFetched(new Date());
                        setLoading(false);
                        return;
                    }
                } catch (gnewsErr) {
                    console.warn(`[NewsSection] GNews API also failed for ${categorySlug}:`, gnewsErr.message);
                }
            }
            
            // Map the articles to the format expected by the UI
            // Supports both manually-ingested articles (description/content fields)
            // and AI-rewritten articles (summary/ai_content fields)
            const transformedArticles = (supabaseResult.articles || []).map(article => ({
                id: article.id,
                title: article.title,
                description: article.description
                  || article.summary
                  || (article.ai_content ? article.ai_content.substring(0, 200) + '...' : ''),
                content: article.content || article.ai_content || '',
                url: article.url,
                image: article.bannerImage || article.banner_image,
                publishedAt: article.publishedAt || article.published_at,
                source: article.source?.name || article.source_name || 'GNews',
                sourceUrl: article.source?.url || article.source_url,
                category: categorySlug,
                slug: article.slug,
                categorySlug: article.categorySlug || article.category_slug || categorySlug,
            }));

            setNewsData(prev => ({
                ...prev,
                [activeCategory.id]: transformedArticles
            }));
            setLastFetched(new Date());

        } catch (err) {
            console.error('[NewsSection] Failed to load articles from Supabase:', err);
            setError(
                'No articles found for this category yet. ' +
                'Go to /fetch-news to manually fetch and store articles from the News API.'
            );
        } finally {
            setLoading(false);
        }
    }, [activeCategory]);



    // Fetch news on component mount and when category changes

    useEffect(() => {

        fetchNews();

    }, [activeCategory, fetchNews]);



    // Preload other categories in background

    // No background preloading - we only fetch from Supabase when needed
    useEffect(() => {
        // Categories are loaded on demand via fetchNews
    }, [activeCategory.id]);



    const handleCategoryChange = (category) => {

        setActiveCategory(category);

    };



    const articles = newsData[activeCategory.id] || [];
    
    // Debug logging
    console.log('[NewsSection] Active category:', activeCategory.id);
    console.log('[NewsSection] Available news data:', Object.keys(newsData));
    console.log('[NewsSection] Articles for current category:', articles.length);
    console.log('[NewsSection] Loading:', loading);
    console.log('[NewsSection] Error:', error);



    return (

        <section className="py-16 bg-slate-50 dark:bg-[#0f172a] news-section">

            <div className="max-w-7xl mx-auto px-4 md:px-6">

                {/* Section Header */}

                <div className="text-center mb-12">

                    <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">

                        Live Updates

                    </span>

                    <h2 className="font-serif text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">

                        Breaking News

                    </h2>

                    <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">

                        Stay informed with the latest headlines from around the world

                    </p>

                </div>



                {/* Category Tabs */}

                <div className="flex flex-wrap justify-center gap-3 mb-10">

                    {NEWS_CATEGORIES.map((category) => (

                        <CategoryTab

                            key={category.id}

                            category={category}

                            isActive={activeCategory.id === category.id}

                            onClick={() => handleCategoryChange(category)}

                        />

                    ))}

                </div>



                {/* Last Updated Info */}

                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8 px-2">

                    <span>Showing:</span>

                    <span className="font-bold text-slate-700 dark:text-slate-300">{activeCategory.name}</span>

                    {lastFetched && (

                        <span className="text-slate-400 dark:text-slate-500">

                            • Updated {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

                        </span>

                    )}

                </div>



                {/* News Grid */}

                <CategoryNewsGrid

                    articles={articles}

                    loading={loading}

                    error={error}

                    categoryName={activeCategory.name}

                />



                {/* API Attribution */}

                <div className="mt-10 text-center">

                    <p className="text-xs text-slate-400 dark:text-slate-500">

                        Powered by GNews API • {articles.length} articles loaded

                    </p>

                </div>

            </div>

        </section>

    );

}



// Export individual components for modular use

export { NewsCard, NewsCardSkeleton, CategoryNewsGrid };

