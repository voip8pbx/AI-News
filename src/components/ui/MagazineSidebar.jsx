import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

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

// Magazine Sidebar - Trending, Categories, Newsletter
export default function MagazineSidebar({ articles = [], categories = [] }) {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const trendingArticles = articles.slice(0, 3);
    const latestArticles = articles.slice(3, 8);

    const defaultCategories = [
        { name: 'Technology', count: 15, image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop' },
        { name: 'Business', count: 24, image: 'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=100&h=100&fit=crop' },
        { name: 'Science', count: 12, image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=100&h=100&fit=crop' },
        { name: 'Health', count: 18, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=100&h=100&fit=crop' },
        { name: 'Sports', count: 21, image: 'https://images.unsplash.com/photo-1461896836934-65f2f044a4aa?w=100&h=100&fit=crop' },
        { name: 'Culture', count: 9, image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop' },
        { name: 'Environment', count: 14, image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop' }
    ];

    const categoryList = categories.length > 0 ? categories : defaultCategories;

    return (
        <aside className={`magazine-sidebar transition-colors duration-300 ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-white'
        }`} style={{
            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff'
        }}>
            {/* Trending Posts Widget */}
            <div className={`sidebar-widget trending-widget rounded-xl p-4 transition-colors duration-300 ${
                theme === 'dark' 
                    ? 'bg-slate-800 border border-slate-700' 
                    : 'bg-white border border-slate-200'
            }`} style={{
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0'
            }}>
                <h3 className={`widget-title transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`} style={{
                    color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                }}>
                    <span className="widget-icon">🔥</span>
                    Startup Trends
                </h3>
                <div className="trending-list">
                    {trendingArticles.map((article, index) => (
                        <article
                            key={article._id || article.id || `trending-${index}`}
                            className={`trending-item transition-colors ${
                                theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => navigate(`/${article.categorySlug}/${article.slug}`)}
                        >
                            <span className={`trending-rank transition-colors ${
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                            }`} style={{
                                color: theme === 'dark' ? '#94a3b8' : '#475569'
                            }}>{index + 1}</span>
                            <div className="trending-image">
                                <img
                                    src={article.generatedImage || article.bannerImage || '/assets/img/blog/blog-default-1.jpg'}
                                    alt={article.title}
                                    onError={(e) => {
                                        e.target.src = '/assets/img/blog/blog-default-1.jpg';
                                    }}
                                />
                            </div>
                            <div className="trending-content">
                                <span className={`trending-category transition-colors ${
                                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                }`} style={{
                                    color: theme === 'dark' ? '#94a3b8' : '#475569'
                                }}>
                                    {article.categorySlug?.replace(/-/g, ' ') || 'News'}
                                </span>
                                <h4 className={`trending-title transition-colors ${
                                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                                }`} style={{
                                    color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                                }}>{article.title}</h4>
                                <span className={`trending-date transition-colors ${
                                    theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                                }`} style={{
                                    color: theme === 'dark' ? '#64748b' : '#64748b'
                                }}>
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

            {/* Latest Updates Widget */}
            <div className={`sidebar-widget latest-widget rounded-xl p-4 mt-6 transition-colors duration-300 ${
                theme === 'dark' 
                    ? 'bg-slate-800 border border-slate-700' 
                    : 'bg-white border border-slate-200'
            }`} style={{
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0'
            }}>
                <h3 className={`widget-title transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`} style={{
                    color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                }}>
                    <span className="widget-icon">⚡</span>
                    Latest Updates
                </h3>
                <div className="latest-list">
                    {latestArticles.map((article, index) => (
                        <article
                            key={article._id || article.id || `latest-${index}`}
                            className={`latest-item transition-colors ${
                                theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => navigate(`/${article.categorySlug}/${article.slug}`)}
                        >
                            <h4 className={`latest-title transition-colors ${
                                theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`} style={{
                                color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                            }}>{article.title}</h4>
                            <span className={`latest-time transition-colors ${
                                theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                            }`} style={{
                                color: theme === 'dark' ? '#64748b' : '#64748b'
                            }}>
                                {formatDate(article.createdAt, {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </span>
                        </article>
                    ))}
                </div>
            </div>

            {/* Categories Widget */}
            <div className={`sidebar-widget categories-widget rounded-xl p-4 mt-6 transition-colors duration-300 ${
                theme === 'dark' 
                    ? 'bg-slate-800 border border-slate-700' 
                    : 'bg-white border border-slate-200'
            }`} style={{
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0'
            }}>
                <h3 className={`widget-title transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`} style={{
                    color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                }}>
                    <span className="widget-icon">📂</span>
                    Categories
                </h3>
                <ul className="categories-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categoryList.map((cat, index) => (
                        <li key={`category-${cat.name}-${index}`} style={{ width: '100%' }}>
                            <div 
                                className="cat-link transition-transform duration-200 hover:scale-[1.02]" 
                                style={{ 
                                    position: 'relative',
                                    padding: '20px 16px',
                                    minHeight: '70px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}
                            >
                                {/* Background Image */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundImage: `url(${cat.image || '/assets/img/blog/blog-default-1.jpg'})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        zIndex: 0
                                    }}
                                />
                                {/* Dark Overlay */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.3) 100%)',
                                        zIndex: 1
                                    }}
                                />
                                {/* Content - Text Left Aligned */}
                                <span className="cat-name" style={{ position: 'relative', zIndex: 2, color: 'white', fontWeight: 600, fontSize: '16px', textAlign: 'left', flex: 1 }}>{cat.name}</span>
                                <span className="cat-count" style={{ position: 'relative', zIndex: 2, color: 'white', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{cat.count}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Newsletter Widget */}
            <div className={`sidebar-widget newsletter-widget rounded-xl mt-6 transition-colors duration-300 ${
                theme === 'dark' 
                    ? 'bg-slate-800 border border-slate-700' 
                    : 'bg-white border border-slate-200'
            }`} style={{
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0'
            }}>
                <div className="newsletter-content">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a1 1 0 01.95.69l1.414 1.414a1 1 0 001.414 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className={`widget-title text-lg transition-colors ${
                                theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`} style={{
                                color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                            }}>Stay Updated</h3>
                            <p className={`text-sm transition-colors ${
                                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                            }`} style={{
                                color: theme === 'dark' ? '#cbd5e1' : '#475569'
                            }}>Never miss breaking news</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="relative">
                            <input 
                                type="email" 
                                placeholder="Enter your email" 
                                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                    theme === 'dark'
                                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                                }`}
                                style={{
                                    backgroundColor: theme === 'dark' ? '#334155' : '#ffffff',
                                    borderColor: theme === 'dark' ? '#475569' : '#d1d5db',
                                    color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                                }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <svg className={`w-5 h-5 transition-colors ${
                                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 11-8 0 4 4 0 018 0zM12 14v6m0 0l-3-3m3 3l3-3" />
                                </svg>
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                            onSubmit={(e) => e.preventDefault()}
                        >
                            <span className="flex items-center justify-center gap-2">
                                Subscribe Now
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5-5m5 5H9m13 0a2 2 0 00-2-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2z" />
                                </svg>
                            </span>
                        </button>
                        
                        <p className={`text-xs text-center transition-colors ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`} style={{
                            color: theme === 'dark' ? '#94a3b8' : '#6b7280'
                        }}>
                            Join 10,000+ subscribers
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
