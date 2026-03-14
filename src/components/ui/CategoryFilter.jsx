import React, { useEffect, useState } from "react";
import { ChevronRight, LayoutGrid, Hash } from "lucide-react";
import { getCategories } from "../../api/articles";

// Category images mapping
const CATEGORY_IMAGES = {
  'technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop',
  'ai': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=100&h=100&fit=crop',
  'startups': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=100&h=100&fit=crop',
  'finance': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=100&fit=crop',
  'crypto': 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=100&h=100&fit=crop',
  'world': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=100&h=100&fit=crop',
  'sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=100&h=100&fit=crop',
  'politics': 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=100&h=100&fit=crop',
  'business': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&h=100&fit=crop',
  'science': 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=100&h=100&fit=crop',
  'health': 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=100&h=100&fit=crop',
  'entertainment': 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=100&h=100&fit=crop',
};

// Fallback image for unknown categories
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=100&h=100&fit=crop';

const CategoryFilter = ({ activeCategory, onChange }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get image for a category
  const getCategoryImage = (slug) => {
    const key = slug?.toLowerCase();
    return CATEGORY_IMAGES[key] || FALLBACK_IMAGE;
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        if (Array.isArray(response)) {
          setCategories(response);
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.error("Category fetch error:", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex flex-wrap gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-28 bg-slate-50 animate-pulse rounded-xl border border-slate-100" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* 1. ALL STORIES - Distinct Styling */}
          <button
            onClick={() => onChange("All")}
            className={`group relative flex items-center gap-2 px-5 py-2.5 transition-all duration-500 rounded-xl ${activeCategory === "All" || !activeCategory
                ? "text-white"
                : "text-slate-400 hover:text-slate-900"
              }`}
          >
            {/* Animated Background for Active State */}
            {(activeCategory === "All" || !activeCategory) && (
              <div className="absolute inset-0 bg-slate-900 rounded-xl z-0 layout-transition" />
            )}

            <LayoutGrid size={14} className="relative z-10 group-hover:rotate-90 transition-transform duration-500" />
            <span className="relative z-10 text-[11px] font-black uppercase tracking-widest">
              All Stories
            </span>
          </button>

          {/* Vertical Divider Line */}
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />

          {/* 2. DYNAMIC CATEGORIES WITH IMAGES */}
          {categories.map((silo) => {
            const isActive = activeCategory === silo.slug;
            const categoryImage = getCategoryImage(silo.slug);
            return (
              <button
                key={silo._id || silo.slug}
                onClick={() => onChange(silo.slug)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 transition-all duration-300 rounded-xl bg-white hover:bg-slate-50`}
              >
                {/* Category Image */}
                <div className={`relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-300 ${isActive ? "border-blue-600 shadow-md" : "border-slate-200 group-hover:border-blue-400"
                  }`}>
                  <img
                    src={categoryImage}
                    alt={silo.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Overlay for active state */}
                  {isActive && (
                    <div className="absolute inset-0 bg-blue-600/20" />
                  )}
                </div>

                <div className="flex flex-col items-start">
                  <span className={`text-[12px] font-bold uppercase tracking-tighter transition-colors ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                    }`}>
                    {silo.name}
                  </span>

                  {/* Underline reveal on hover or active */}
                  <div className={`h-[2px] bg-blue-600 transition-all duration-500 ${isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} />
                </div>

                {/* Optional: Add a tiny number or "silo" tag if available */}
                <span className={`text-[9px] font-black font-mono transition-opacity ${isActive ? "opacity-100 text-blue-600" : "opacity-0 group-hover:opacity-40"
                  }`}>
                  /0{categories.indexOf(silo) + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
