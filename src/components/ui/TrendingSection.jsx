import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, ArrowRight } from 'lucide-react';
// [GNEWS DIRECT CALL DISABLED] - Trending now reads from Supabase DB
// import { fetchNewsByCategory, NEWS_CATEGORIES } from '../../api/gnews';
import { getArticles } from '../../api/articles';

// Fallback placeholder image
const FALLBACK_IMAGE = '/assets/img/blog/blog-default-1.jpg';

// Format relative time
const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Large featured card component
const FeaturedCard = ({ article, index }) => {
    const [imageError, setImageError] = useState(false);
    const navigate = useNavigate();

    const handleClick = () => {
        // Always navigate to internal ArticleDetail page
        if (article.categorySlug && article.slug) {
            navigate(`/${article.categorySlug}/${article.slug}`);
        } else if (article._id) {
            // Fallback to ID-based route if slug/category not available
            navigate(`/article/${article._id}`);
        }
    };

    return (
        <article
            onClick={handleClick}
            className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 hover:shadow-2xl h-full ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''
                }`}
        >
            {/* Image */}
            <div className="relative overflow-hidden h-full">
                <img
                    src={imageError ? FALLBACK_IMAGE : (article.image || article.generatedImage || article.bannerImage || FALLBACK_IMAGE)}
                    alt={article.title}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110`}
                    onError={() => setImageError(true)}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    {/* Title */}
                    <h3 className={`font-serif font-bold text-white leading-tight mb-3 group-hover:text-blue-200 transition-colors ${index === 0 ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl'
                        }`}>
                        {article.title}
                    </h3>

                    {/* Description */}
                    {article.description && (
                        <p className="text-white/80 line-clamp-2 mb-4 text-sm md:text-base">
                            {article.description}
                        </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-white text-sm font-semibold">
                        <span className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full">
                            <Clock size={16} className="text-blue-300" />
                            {formatTimeAgo(article.publishedAt)}
                        </span>
                    </div>
                </div>
            </div>
        </article>
    );
};

// Small card component with image background and title overlay
const SmallCard = ({ article, index }) => {
    const [imageError, setImageError] = useState(false);
    const navigate = useNavigate();

    const handleClick = () => {
        // Always navigate to internal ArticleDetail page
        if (article.categorySlug && article.slug) {
            navigate(`/${article.categorySlug}/${article.slug}`);
        } else if (article._id) {
            // Fallback to ID-based route if slug/category not available
            navigate(`/article/${article._id}`);
        }
    };

    return (
        <article
            onClick={handleClick}
            className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 hover:shadow-2xl h-[320px]"
        >
            {/* Image Background */}
            <div className="absolute inset-0">
                <img
                    src={imageError ? FALLBACK_IMAGE : (article.image || article.generatedImage || article.bannerImage || FALLBACK_IMAGE)}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={() => setImageError(true)}
                />
            </div>
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* Content - Title on Image */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
                <h4 className="font-serif font-bold text-white leading-tight group-hover:text-blue-200 transition-colors text-lg line-clamp-3 mb-3">
                    {article.title}
                </h4>
                
                <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Clock size={14} />
                    <span>{formatTimeAgo(article.publishedAt)}</span>
                </div>
            </div>
        </article>
    );
};

// Skeleton loader
const TrendingSkeleton = () => (
    <div className="animate-pulse">
        <div className="bg-slate-200 h-80 md:h-96 rounded-2xl" />
    </div>
);

// Main Trending Section component
export default function TrendingSection({ fallbackArticles = [] }) {
    const [trendingArticles, setTrendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTrending = async () => {
            setLoading(true);
            setError(null);
            try {
                // [GNEWS DIRECT CALL DISABLED]
                // Re-enable the block below to read trending news live from GNews API:
                // const results = await Promise.all(
                //     NEWS_CATEGORIES.slice(0, 3).map(cat =>
                //         fetchNewsByCategory(cat.query, 1, 5)
                //     )
                // );
                // const allArticles = results
                //     .flatMap(result => result.articles)
                //     .filter((article, index, self) =>
                //         index === self.findIndex(a => a.title === article.title)
                //     )
                //     .slice(0, 8);
                // setTrendingArticles(allArticles);

                // Read trending articles directly from Supabase database
                const res = await getArticles(1, 8);
                const articles = (res?.articles || []).map(a => ({
                    ...a,
                    // Ensure image field is normalised for FeaturedCard/SmallCard
                    image: a.bannerImage || a.banner_image || null,
                    publishedAt: a.publishedAt || a.published_at,
                }));
                setTrendingArticles(articles);
            } catch (err) {
                console.error('Error fetching trending news from DB:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTrending();
    }, []);

    // Use fallback articles if API fails or returns no data
    const displayArticles = trendingArticles.length > 0 ? trendingArticles : fallbackArticles.slice(0, 8);

    if (loading) {
        return (
        <section className="py-16 bg-slate-50 dark:bg-[#0f172a] trending-section">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex items-center gap-3 mb-8">
                        <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                        <h2 className="font-serif text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                            Trending Now
                        </h2>
                    </div>
                    <TrendingSkeleton />
                </div>
            </section>
        );
    }

    // Show section even if empty (with message)
    if (!displayArticles.length) {
        return (
        <section className="py-16 bg-slate-50 dark:bg-[#0f172a] trending-section">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex items-center gap-3 mb-8">
                        <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                        <h2 className="font-serif text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                            Trending Now
                        </h2>
                    </div>
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                        No trending articles available at the moment.
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-16 bg-slate-50 dark:bg-[#0f172a] trending-section">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <TrendingUp className="text-white" size={20} />
                        </div>
                        <h2 className="font-serif text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                            Trending Now
                        </h2>
                    </div>
                    <button className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                        View All <ArrowRight size={16} />
                    </button>
                </div>

                {/* Varied Grid Layout - Masonry Style */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-min">
                    {/* Featured Card - Large (takes 2x2 space) */}
                    {displayArticles[0] && (
                        <div className="md:col-span-2 md:row-span-2 h-full">
                            <FeaturedCard article={displayArticles[0]} index={0} />
                        </div>
                    )}

                    {/* Featured Card - Medium (1x1) */}
                    {displayArticles[1] && (
                        <div className="md:col-span-1 md:row-span-1 h-[320px]">
                            <FeaturedCard article={displayArticles[1]} index={1} />
                        </div>
                    )}

                    {/* Small Cards with Image Background */}
                    {displayArticles.slice(2).map((article, index) => (
                        <div key={article.id || index} className={`h-[320px] ${index === displayArticles.slice(2).length - 1 ? 'md:col-span-2' : ''}`}>
                            <SmallCard article={article} index={index} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
