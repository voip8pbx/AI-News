import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Globe, Calendar, Sparkles, ChevronLeft, Share2, Clock, Facebook, Twitter, Linkedin, Link as LinkIcon, Copy, Check, ArrowRight, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getArticleBySlugWithGeneratedImage, trackArticleView, getArticlesByCategoryWithGeneratedImages, getArticlesWithGeneratedImages } from "../api/articles";
import { getDisplayImage } from "../components/cards/ArticleCard";
import { formatDate, formatRelativeTime } from '../utils/dateUtils';

import remarkSlug from 'remark-slug';
import GithubSlugger from 'github-slugger';
import { getUserInteractions } from "../api/auth";
import ArticleActions from "../components/ui/ArticleActions";
import CommentBox from "../components/ui/CommentBox";
import Footer from "../components/ui/Footer";

// Helper function to calculate read time
const calculateReadTime = (content) => {
  if (!content) return 0;
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

export default function ArticleDetail() {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [latestArticles, setLatestArticles] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // Reading Progress Logic
  useEffect(() => {
    const updateProgress = () => {
      const currentProgress = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight) {
        setScrollProgress(Number((currentProgress / scrollHeight).toFixed(2)) * 100);
      }
    };
    window.addEventListener("scroll", updateProgress);
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  // LOGIC: Handle state updates for both main and related articles
  const handleUpdateArticle = (updated) => {
    if (!updated || !updated._id) return;
    const updatedId = updated._id.toString();
    if (article?._id?.toString() === updatedId) {
      setArticle(prev => ({ ...prev, ...updated }));
    }
    setRelatedArticles(prev =>
      prev.map(art => art._id.toString() === updatedId ? { ...art, ...updated } : art)
    );
  };

  useEffect(() => {
    const fetchFullData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await getArticleBySlugWithGeneratedImage(category, slug);
        const mainArticle = res.data;

        if (!mainArticle) throw new Error("Article not found");

        let interactions = { likedArticleIds: [], savedArticleIds: [] };
        if (token) {
          try {
            interactions = await getUserInteractions();
          } catch (e) {
            console.warn("Guest mode active");
          }
        }

        // Fetch Related Articles
        if (mainArticle?.categorySlug) {
          const relatedRes = await getArticlesByCategoryWithGeneratedImages(mainArticle.categorySlug, 1, 6);
          const relatedData = relatedRes.articles || [];
          setRelatedArticles(
            relatedData
              .filter((a) => a.slug !== slug)
              .map(art => ({
                ...art,
                isLiked: interactions.likedArticleIds?.some(id => id.toString() === art._id.toString()),
                isSaved: interactions.savedArticleIds?.some(id => id.toString() === art._id.toString())
              }))
              .slice(0, 4)
          );
        }

        // Fetch Latest Articles
        try {
          const latestRes = await getArticlesWithGeneratedImages(1, 4);
          if (latestRes?.articles) {
            setLatestArticles(latestRes.articles.slice(0, 4));
          }
        } catch (err) {
          console.warn("Could not fetch latest articles");
        }

        const hydratedMain = {
          ...mainArticle,
          isLiked: interactions.likedArticleIds?.some(id => id.toString() === mainArticle._id.toString()),
          isSaved: interactions.savedArticleIds?.some(id => id.toString() === mainArticle._id.toString())
        };

        setArticle(hydratedMain);
        if (hydratedMain?.title) document.title = `${hydratedMain.title} | VERBIS AI`;

      } catch (err) {
        console.error("Failed to load article data", err);
      } finally {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    fetchFullData();
    return () => { document.title = "AI NEWS"; };
  }, [category, slug]);

  const slugger = new GithubSlugger();
  let headings = [];

  if (article?.aiContent) {
    const content = article.aiContent.replace(/\\n/g, '\n');
    const lines = content.split('\n');
    headings = lines
      .filter(line => line.startsWith('## '))
      .map(line => {
        const text = line.replace('## ', '').trim();
        return { text, id: slugger.slug(text) };
      });
  }

  useEffect(() => {
    const incrementView = async () => {
      try {
        await trackArticleView(slug);
      } catch (err) {
        console.error("Analytics error:", err);
      }
    };
    if (slug) incrementView();
  }, [slug]);

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = article?.title || '';

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${url}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${encodeURIComponent(title)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
        break;
      default:
        break;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-serif text-slate-400 dark:text-slate-500 animate-pulse">Loading article...</p>
      </div>
    </div>
  );

  if (!article) return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">Article Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-4">The article you're looking for doesn't exist.</p>
        <Link to="/" className="text-blue-600 hover:underline">Go back to home</Link>
      </div>
    </div>
  );

  const readTime = calculateReadTime(article.aiContent);
  const contentParagraphs = article.aiContent?.replace(/\\n/g, '\n').split('\n\n') || [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white selection:bg-blue-100">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[100] pointer-events-none">
        <div
          className="h-full bg-blue-600 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <ChevronLeft size={18} /> Back to Feed
          </Link>
          <div className="flex gap-4 items-center">
            <ArticleActions article={article} onUpdate={handleUpdateArticle} />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* 1️⃣ Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
          <span>/</span>
          <Link to={`/?category=${article.categorySlug}`} className="capitalize hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {article.categorySlug?.replace(/-/g, ' ') || 'News'}
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-300 truncate max-w-[200px]">{article.title}</span>
        </nav>

        {/* 2️⃣ Article Title Section */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-black leading-[1.15] text-slate-900 dark:text-white mb-6">
            {article.title}
          </h1>

          {/* 3️⃣ Author + Date Row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                {article.author?.avatar ? (
                  <img src={article.author.avatar} alt={article.author.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={20} className="text-slate-500 dark:text-slate-400" />
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {article.author?.name || 'Verbis AI Team'}
                </span>
              </div>
            </div>

            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>

            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{formatDate(article.publishedAt)}</span>
            </div>

            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>

            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{readTime} Min Read</span>
            </div>
          </div>
        </header>

        {/* Category Badge */}
        <div className="flex items-center gap-3 mb-8">
          <span className="bg-blue-600 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full">
            {article.silo?.name || article.category?.replace(/-/g, ' ') || 'News'}
          </span>
          {article.source?.name && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Globe size={12} /> {article.source.name}
              </span>
            </>
          )}
        </div>

        {/* 4️⃣ Featured Image */}
        <figure className="mb-10">
          <img
            src={getDisplayImage(article)}
            alt={article.title}
            className="w-full aspect-video object-cover rounded-xl"
            onError={(e) => {
              e.target.src = '/assets/img/blog/blog-default-1.jpg';
            }}
          />
          {article.imageCaption && (
            <figcaption className="mt-3 text-sm text-slate-500 dark:text-slate-400 italic text-center">
              {article.imageCaption}
            </figcaption>
          )}
        </figure>

        {/* AI Summary Box */}
        {article.summary && (
          <div className="mb-10 border-l-4 border-blue-600 bg-slate-50 dark:bg-slate-800 p-6 rounded-r-lg">
            <div className="mb-3 flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Sparkles size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Summary</span>
            </div>
            <p className="font-serif text-lg italic leading-relaxed text-slate-700 dark:text-slate-300">
              {article.summary}
            </p>
          </div>
        )}

        {/* 5️⃣ Article Content Section */}
        <article className="prose prose-lg dark:prose-invert max-w-none 
          prose-p:text-slate-700 dark:prose-p:text-slate-300 
          prose-p:leading-[1.85] prose-p:font-sans 
          prose-headings:font-serif prose-headings:font-bold 
          prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold
          prose-blockquote:border-l-blue-600 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-800 
          prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic
          prose-li:text-slate-700 dark:prose-li:text-slate-300
          prose-img:rounded-lg prose-img:my-8
          prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown remarkPlugins={[remarkSlug]}>
            {article.aiContent?.replace(/\\n/g, '\n')}
          </ReactMarkdown>
        </article>

        {/* 6️⃣ Inline Ad / Divider Section */}
        <div className="my-12 py-8 border-t border-b border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Advertisement</p>
            <div className="h-32 md:h-40 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-slate-400 dark:text-slate-500 text-sm">Ad Space</span>
            </div>
          </div>
        </div>

        {/* 7️⃣ Tags / Topics */}
        {article.tags && article.tags.length > 0 && (
          <div className="mb-10">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 8️⃣ Share Article Section */}
        <div className="mb-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Share this article</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Facebook size={18} /> Facebook
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              <Twitter size={18} /> Twitter
            </button>
            <button
              onClick={() => handleShare('linkedin')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
            >
              <Linkedin size={18} /> LinkedIn
            </button>
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Share
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* 9️⃣ Newsletter Subscribe Box */}
        <div className="mb-16 p-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white">
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-serif font-bold mb-3">Subscribe to our Newsletter</h3>
            <p className="text-blue-100 mb-6 max-w-md mx-auto">Be the first to receive latest startup news, tech insights, and exclusive analysis delivered to your inbox.</p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-5 py-3 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                Subscribe <ArrowRight size={18} />
              </button>
            </form>
            <p className="text-xs text-blue-200 mt-4">No spam. Unsubscribe anytime.</p>
          </div>
        </div>

        {/* 1️⃣0️⃣ Related Articles Section */}
        {relatedArticles.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-2xl font-serif font-black text-slate-900 dark:text-white">Related Articles</h2>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedArticles.slice(0, 4).map((item) => (
                <article
                  key={item._id}
                  onClick={() => navigate(`/${item.categorySlug}/${item.slug}`)}
                  className="group cursor-pointer bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={getDisplayImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.target.src = '/assets/img/blog/blog-default-1.jpg'; }}
                    />
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      {item.categorySlug?.replace(/-/g, ' ') || 'News'}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif font-bold text-lg leading-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-3">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{item.author?.name || 'Verbis AI'}</span>
                      <span>•</span>
                      <span>{formatDate(item.publishedAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 1️⃣1️⃣ Latest Stories Section */}
        {latestArticles.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-2xl font-serif font-black text-slate-900 dark:text-white">Latest Stories</h2>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              <Link to="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {latestArticles.map((item) => (
                <article
                  key={item._id}
                  onClick={() => navigate(`/${item.categorySlug}/${item.slug}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative h-32 mb-3 overflow-hidden rounded-lg">
                    <img
                      src={getDisplayImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.target.src = '/assets/img/blog/blog-default-1.jpg'; }}
                    />
                  </div>
                  <h3 className="font-serif font-bold text-sm leading-snug text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                    {item.title}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(item.publishedAt)}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Comments Section */}
        <section className="mb-16">
          <div className="border-t border-slate-200 dark:border-slate-700 pt-12">
            <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white mb-2">Comments</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Join the conversation</p>
            <CommentBox
              articleId={article._id}
              comments={article.comments || []}
              onNewComment={(updatedComments) => {
                handleUpdateArticle({ ...article, comments: updatedComments });
              }}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
