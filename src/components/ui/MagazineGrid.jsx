import { useNavigate } from "react-router-dom";

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

// Magazine-style Grid - Top Stories Section
export default function MagazineGrid({ articles = [], title = "Top Stories" }) {
    const navigate = useNavigate();

    return (
        <section className="magazine-grid bg-white dark:bg-[#0f172a]">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
                <div className="section-header">
                    <h2 className="section-title">{title}</h2>
                    <div className="section-line"></div>
                </div>

                {/* Magazine Grid Layout - 2 columns with wide bottom card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Row - Two regular cards */}
                    {articles.slice(0, 2).map((article, index) => (
                        <article
                            key={article._id || article.id || `magazine-grid-top-${index}`}
                            className="group cursor-pointer bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700"
                            onClick={() => navigate(`/${article.categorySlug}/${article.slug}`)}
                        >
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={article.generatedImage || article.bannerImage || article.ai_image_url || '/assets/img/blog/blog-default-1.jpg'}
                                    alt={article.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.target.src = '/assets/img/blog/blog-default-1.jpg';
                                    }}
                                />
                                <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
                                    {article.categorySlug?.replace(/-/g, ' ') || 'News'}
                                </span>
                            </div>
                            <div className="p-4">
                                <h3 className="font-serif font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-lg line-clamp-2">
                                    {article.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-3 text-slate-500 dark:text-slate-400 text-sm">
                                    <span>{article.author || 'Editorial Team'}</span>
                                    <span>•</span>
                                    <span>
                                        {formatDate(article.createdAt, {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}

                    {/* Bottom Row - Wide card spanning both columns */}
                    {articles[2] && (
                        <article
                            key={articles[2]._id || articles[2].id || `magazine-grid-wide`}
                            className="group cursor-pointer bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 md:col-span-2 flex flex-col md:flex-row"
                            onClick={() => navigate(`/${articles[2].categorySlug}/${articles[2].slug}`)}
                        >
                            <div className="relative md:w-1/2 h-48 md:h-64 overflow-hidden">
                                <img
                                    src={articles[2].generatedImage || articles[2].bannerImage || articles[2].ai_image_url || '/assets/img/blog/blog-default-1.jpg'}
                                    alt={articles[2].title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.target.src = '/assets/img/blog/blog-default-1.jpg';
                                    }}
                                />
                                <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
                                    {articles[2].categorySlug?.replace(/-/g, ' ') || 'News'}
                                </span>
                            </div>
                            <div className="p-5 md:w-1/2 flex flex-col justify-center">
                                <h3 className="font-serif font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-xl md:text-2xl mb-3">
                                    {articles[2].title}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2 mb-4">
                                    {articles[2].description?.slice(0, 150)}...
                                </p>
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                                    <span>{articles[2].author || 'Editorial Team'}</span>
                                    <span>•</span>
                                    <span>
                                        {formatDate(articles[2].createdAt, {
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

                {/* Square Cards Row - Below main grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                    {articles.slice(3, 7).map((article, index) => (
                        <article
                            key={article._id || article.id || `magazine-grid-${index}`}
                            className="group cursor-pointer relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 aspect-square bg-white dark:bg-slate-800"
                            onClick={() => navigate(`/${article.categorySlug}/${article.slug}`)}
                        >
                            {/* Square Image Background */}
                            <img
                                src={article.generatedImage || article.bannerImage || article.ai_image_url || '/assets/img/blog/blog-default-1.jpg'}
                                alt={article.title}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                onError={(e) => {
                                    e.target.src = '/assets/img/blog/blog-default-1.jpg';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full">
                                {article.categorySlug?.replace(/-/g, ' ') || 'News'}
                            </span>
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h4 className="font-serif font-bold text-white leading-tight group-hover:text-blue-200 transition-colors text-sm line-clamp-3">
                                    {article.title}
                                </h4>
                                <span className="text-white/70 text-xs mt-2 block">Recent</span>
                            </div>
                        </article>
                    ))}
                    
                    {/* Handle missing articles - show placeholder cards */}
                    {Array.from({ length: Math.max(0, 4 - articles.slice(3, 7).length) }).map((_, index) => (
                        <article
                            key={`placeholder-${index}`}
                            className="group cursor-pointer relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 aspect-square bg-white dark:bg-slate-800 opacity-60"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h4 className="font-serif font-bold text-slate-400 dark:text-slate-500 leading-tight text-sm">
                                    More articles coming soon...
                                </h4>
                                <span className="text-slate-400 dark:text-slate-500 text-xs mt-2 block">Loading...</span>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Flat Card Row - Different dimensions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {articles.slice(7, 10).map((article, index) => (
                        <article
                            key={article._id || article.id || `magazine-grid-flat-${index}`}
                            className="group cursor-pointer relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800 md:col-span-2"
                            onClick={() => navigate(`/${article.categorySlug}/${article.slug}`)}
                        >
                            {/* Flat Card Image - Different aspect ratio */}
                            <div className="relative h-40 md:h-48 overflow-hidden">
                                <img
                                    src={article.generatedImage || article.bannerImage || article.ai_image_url || '/assets/img/blog/blog-default-1.jpg'}
                                    alt={article.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.target.src = '/assets/img/blog/blog-default-1.jpg';
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
                                    {article.categorySlug?.replace(/-/g, ' ') || 'News'}
                                </span>
                            </div>
                            <div className="p-4">
                                <h3 className="font-serif font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-lg mb-2">
                                    {article.title}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-3 mb-3">
                                    {article.description?.slice(0, 120)}...
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                                        <span>{article.author || 'Editorial Team'}</span>
                                        <span>•</span>
                                        <span>
                                            {formatDate(article.createdAt, {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                                        Read More →
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                    
                    {/* Handle missing flat cards - show placeholder */}
                    {Array.from({ length: Math.max(0, 3 - articles.slice(7, 10).length) }).map((_, index) => (
                        <article
                            key={`flat-placeholder-${index}`}
                            className="group cursor-pointer relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800 opacity-60 md:col-span-2"
                        >
                            <div className="relative h-40 md:h-48 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <h4 className="font-serif font-bold text-slate-400 dark:text-slate-500 leading-tight text-sm mb-2">
                                        More articles loading...
                                    </h4>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
                                            <span>Editorial Team</span>
                                            <span>•</span>
                                            <span>Loading...</span>
                                        </div>
                                        <span className="text-blue-400 dark:text-blue-500 text-sm font-medium">
                                            Loading →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
