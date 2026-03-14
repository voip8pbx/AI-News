import { useEffect, useState, useRef } from 'react';
import { TrendingUp } from 'lucide-react';

export default function NewsTicker({ articles = [] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (articles.length === 0 || isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % articles.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [articles.length, isPaused]);

    if (articles.length === 0) return null;

    const currentArticle = articles[currentIndex];

    return (
        <div 
            ref={containerRef}
            className="w-full bg-slate-900 text-white py-3 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center gap-4">
                {/* Label */}
                <div className="flex-shrink-0 flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-full">
                    <TrendingUp size={14} className="text-white" />
                    <span className="text-xs font-black uppercase tracking-wider">Breaking</span>
                </div>

                {/* Scrolling News */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div 
                        key={currentIndex}
                        className="animate-fadeIn flex items-center gap-3"
                    >
                        <span className="text-sm font-bold text-blue-300 uppercase tracking-wider flex-shrink-0">
                            {currentArticle.categorySlug?.replace(/-/g, ' ') || 'News'}
                        </span>
                        <span className="text-slate-400 flex-shrink-0">|</span>
                        <p className="text-sm font-medium text-white/90 truncate hover:text-white transition-colors cursor-pointer">
                            {currentArticle.title}
                        </p>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                            {new Date(currentArticle.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                </div>

                {/* Dots Indicator */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                    {articles.slice(0, 5).map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                idx === currentIndex 
                                    ? 'bg-blue-500 w-4' 
                                    : 'bg-slate-600 hover:bg-slate-500'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
