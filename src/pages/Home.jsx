import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Newspaper, Search, Globe, Zap, Sparkles } from "lucide-react";

import ArticleCard from "../components/cards/ArticleCard";
import CategoryFilter from "../components/ui/CategoryFilter";
import QuickGlanceCard from "../components/cards/QuickGlanceCard";
import Pagination from "../components/ui/Pagination";
import MagazineHero from "../components/ui/MagazineHero";
import MagazineGrid from "../components/ui/MagazineGrid";
import MagazineSidebar from "../components/ui/MagazineSidebar";
import NewsSection from "../components/ui/NewsSection";
import TrendingSection from "../components/ui/TrendingSection";
import Footer from "../components/ui/Footer";

import { getArticlesWithGeneratedImages, getArticlesByCategoryWithGeneratedImages, searchArticlesWithGeneratedImages, generateImagesForRecentArticles } from "../api/articles";
import { runIngestionForActiveSchedules } from "../api/schedule";
import { useHomeState } from "../context/HomeStateContext";
import { getQuickGlanceData } from "../utils/quickGlance";
import { getUserInteractions } from "../api/auth";
import SearchInput from "../components/ui/SearchInput";

// Magazine-style Home Page
export default function Home() {
  const navigate = useNavigate();
  const {
    articles, setArticles,
    page, setPage,
    totalPages, setTotalPages,
    activeCategory, setActiveCategory,
    isSearchMode, setIsSearchMode,
    searchQuery,
  } = useHomeState();

  const [journalArticles, setJournalArticles] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Initial Load: trigger ingestion based on pipelines, then get global content
  useEffect(() => {
    const bootstrap = async () => {
      console.log("[home] Page load: starting ingestion + initial fetch");
      try {
        const ingestionResult = await runIngestionForActiveSchedules();
        console.log("[home] Ingestion result", ingestionResult);
      } catch (err) {
        console.error("[home] Ingestion failed on load", err);
      }

      try {
        console.log("[home] Fetching initial articles for hero/silo");
        const res = await getArticlesWithGeneratedImages(1, 15);
        console.log("[home] Initial articles response", res);
        if (res?.articles) setArticles(res.articles);
      } catch (err) {
        console.error("[home] Failed to fetch initial articles", err);
      }

      // Background: Generate AI images for recent articles (non-blocking)
      try {
        console.log("[home] Starting background image generation...");
        await generateImagesForRecentArticles(20);
        console.log("[home] Background image generation completed");

        // Refetch articles to get the newly cached images
        console.log("[home] Refetching articles to retrieve cached images...");
        const refreshRes = await getArticlesWithGeneratedImages(1, 15);
        if (refreshRes?.articles) {
          console.log("[home] ✓ Articles refetched with cached images");
          setArticles(refreshRes.articles);
        }
      } catch (err) {
        console.warn("[home] Background image generation failed (non-critical)", err);
      }
    };

    if (articles.length === 0) bootstrap();
  }, []);

  // 2. Journal-Specific Load: handles Search and Categories
  const loadJournal = useCallback(async () => {
    setLoading(true);
    try {
      const fetchApi = isSearchMode && searchQuery.trim()
        ? searchArticlesWithGeneratedImages(searchQuery.trim(), page, 8)
        : (activeCategory && activeCategory !== "All")
          ? getArticlesByCategoryWithGeneratedImages(activeCategory, page, 8)
          : getArticlesWithGeneratedImages(page, 8);

      const res = await fetchApi;

      let interactions = { likedArticleIds: [], savedArticleIds: [] };
      const token = localStorage.getItem("token");

      if (token) {
        try {
          interactions = await getUserInteractions();
        } catch (err) {
          console.warn("Guest mode: Could not fetch interactions.");
        }
      }

      if (res?.articles) {
        const hydrated = res.articles.map(art => ({
          ...art,
          isLiked: interactions.likedArticleIds.some(id => id.toString() === art._id.toString()),
          isSaved: interactions.savedArticleIds.some(id => id.toString() === art._id.toString())
        }));
        setJournalArticles(hydrated);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error("Journal Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, page, isSearchMode, searchQuery, setTotalPages]);

  useEffect(() => { loadJournal(); }, [loadJournal]);

  // --- Data Slices ---
  const heroItems = articles.slice(0, 3);
  const flashItems = articles.slice(3, 7);
  const siloItems = articles.slice(7, 15);
  const quickGlance = getQuickGlanceData(articles, activeCategory);

  const itemsPerPage = 3;
  const maxSilo = Math.max(0, siloItems.length - itemsPerPage);

  const handleCategoryChange = (slug) => {
    setActiveCategory(slug);
    setPage(1);
    setIsSearchMode(false);
  };

  const handleUpdateArticle = (updated) => {
    setArticles(prev => prev.map(a => a._id === updated._id ? updated : a));
    setJournalArticles(prev => prev.map(a => a._id === updated._id ? updated : a));
  };

  // Magazine view - single unified layout
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-white">
      {/* Magazine-style Header Bar */}
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-blue-600">
            <TrendingUp size={18} strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Global AI News</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </nav>

      {/* Magazine Hero Section */}
      <MagazineHero articles={articles.slice(0, 8)} />

      {/* Magazine Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <MagazineGrid articles={articles.slice(0, 7)} title="Latest Stories" />

            {/* Trending Section */}
            <TrendingSection fallbackArticles={articles} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <h3 className="text-xl font-black uppercase tracking-wider mb-4 text-slate-900 dark:text-white">Sidebar</h3>
            <MagazineSidebar articles={articles} />
          </div>
        </div>
      </div>

      {/* News Section with GNews API */}
      <NewsSection />

      {/* Magazine Footer */}
      <Footer />
    </div>
  );
}
