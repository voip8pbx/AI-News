import { useNavigate } from "react-router-dom";
import NewsTicker from "./NewsTicker";

// Safe date formatting function
const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'Recent';
    
    try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return 'Recent';
        
        const defaultOptions = {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        
        return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    } catch (error) {
        console.warn('Invalid date format:', dateString);
        return 'Recent';
    }
};

// Magazine-style Hero Section - Featured article with secondary stories
export default function MagazineHero({ articles = [] }) {
    const navigate = useNavigate();

    const heroArticle = articles[0];
    const sideArticles = articles.slice(1, 4);
    const tickerArticles = articles.slice(4, 9);

    return (
        <section className="magazine-hero bg-white dark:bg-slate-900">
            {/* Breaking News Ticker */}
            <NewsTicker articles={tickerArticles} />

            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
                <div className="hero-grid">
                    {/* Main Featured Article */}
                    <div className="hero-main">
                        {heroArticle && (
                            <article
                                className="hero-article"
                                onClick={() => navigate(`/${heroArticle.categorySlug}/${heroArticle.slug}`)}
                            >
                                <div className="hero-image-wrapper">
                                    <img
                                        src={heroArticle.generatedImage || heroArticle.bannerImage || '/assets/img/blog/blog-default-1.jpg'}
                                        alt={heroArticle.title}
                                        className="hero-image"
                                        onError={(e) => {
                                            e.target.src = '/assets/img/blog/blog-default-1.jpg';
                                        }}
                                    />
                                    <span className="hero-badge">Featured</span>
                                </div>
                                <div className="hero-content">
                                    <span className="category-tag">
                                        {heroArticle.categorySlug?.replace(/-/g, ' ') || 'News'}
                                    </span>
                                    <h1 className="hero-title">{heroArticle.title}</h1>
                                    <p className="hero-excerpt">
                                        {heroArticle.description?.slice(0, 150)}...
                                    </p>
                                    <div className="hero-meta">
                                        <span className="author">
                                            By {heroArticle.author || 'Editorial Team'}
                                        </span>
                                        <span className="separator">•</span>
                                        <span className="date">
                                            {formatDate(heroArticle.createdAt, {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        )}
                    </div>

                    {/* Secondary Articles */}
                    <div className="hero-side">
                        {sideArticles.map((article, index) => (
                            <article
                                key={article._id || article.id || `hero-side-${index}`}
                                className="hero-side-article"
                                onClick={() => navigate(`/${article.categorySlug}/${article.slug}`)}
                            >
                                <div className="hero-side-image">
                                    <img
                                        src={article.generatedImage || article.bannerImage || '/assets/img/blog/blog-default-1.jpg'}
                                        alt={article.title}
                                        onError={(e) => {
                                            e.target.src = '/assets/img/blog/blog-default-1.jpg';
                                        }}
                                    />
                                </div>
                                <div className="hero-side-content">
                                    <span className="category-tag">
                                        {article.categorySlug?.replace(/-/g, ' ') || 'News'}
                                    </span>
                                    <h3 className="hero-side-title">{article.title}</h3>
                                    <span className="date">
                                        {formatDate(article.createdAt, {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>

                {/* Additional Cards Below Hero */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {articles.slice(4, 8).map((article, index) => (
                        <article
                            key={article._id || article.id || `hero-bottom-${index}`}
                            className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-500 hover:shadow-xl h-[280px]"
                            onClick={() => navigate(`/${article.categorySlug}/${article.slug}`)}
                        >
                            {/* Image Background */}
                            <img
                                src={article.generatedImage || article.bannerImage || '/assets/img/blog/blog-default-1.jpg'}
                                alt={article.title}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                onError={(e) => {
                                    e.target.src = '/assets/img/blog/blog-default-1.jpg';
                                }}
                            />

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                            {/* Category Badge */}
                            <span className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
                                {article.categorySlug?.replace(/-/g, ' ') || 'News'}
                            </span>

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                                <h4 className="font-serif font-bold text-white leading-tight group-hover:text-blue-200 transition-colors text-lg line-clamp-2">
                                    {article.title}
                                </h4>
                                <span className="text-white/70 text-sm mt-2 block">
                                    {formatDate(article.createdAt, {
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                        </article>
                    ))}
                </div>

            </div>
        </section>
    )
}
