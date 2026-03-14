import { Link, useNavigate } from "react-router-dom";
import SearchInput from "./SearchInput";
import { logoutUser } from "../../api/auth";
import { ArrowUpRight, LogIn, LogOut, Search, User, X, Sun, Moon } from "lucide-react";
import { useBranding } from "../../context/BrandingContext";
import { useTheme } from "../../context/ThemeContext";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { theme, toggleTheme } = useTheme();

  // Placeholder for user state - ensure this connects to your Auth context
  const user = JSON.parse(localStorage.getItem("user"));
  const isLoggedIn = !!user;

  // Hide/show navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Only hide/show if scrolled past a threshold (e.g., 100px)
      if (currentScrollY > 100) {
        // Scrolling down - hide navbar
        if (currentScrollY > lastScrollY && isVisible) {
          setIsVisible(false);
        }
        // Scrolling up - show navbar
        else if (currentScrollY < lastScrollY && !isVisible) {
          setIsVisible(true);
        }
      } else {
        // Always show navbar when at top
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isVisible]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
      window.location.reload(); // Refresh to clear state
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md transition-transform duration-300 ease-in-out ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      {/* 1. THE TOP UTILITY BAR (Clean & Essential) */}
      <div className="hidden md:block border-b border-slate-100 dark:border-slate-700 py-2">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Live Updates</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300 dark:text-slate-500 italic">
              Verbis Editorial System v3.0
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION */}
      <div className="relative border-b border-slate-950/5 dark:border-slate-700/50">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-24 flex items-center justify-between gap-12">

          {/* BRANDING: Asymmetric Serif Style */}
          {!isMobileSearchOpen && (
            <Link to="/" className="flex items-center gap-6 group shrink-0">
              <div className="relative">
                {branding.logo ? (
                  <img
                    src={branding.logo}
                    className="h-12 w-auto object-contain transition-all duration-500 group-hover:scale-110"
                    alt="logo"
                  />
                ) : (
                  <div className="w-14 h-14 bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white font-serif text-3xl group-hover:bg-blue-600 transition-colors duration-500">
                    V
                  </div>
                )}
                {/* Corner Accent for the Logo */}
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-500" />
              </div>

              <div className="hidden sm:flex flex-col">
                <h1 className="font-serif font-black text-4xl leading-none tracking-tighter text-slate-950 dark:text-white">
                  {branding.siteTitle?.split(' ')[0] || "Verbis"}
                </h1>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mt-1">
                  {branding.siteTitle?.split(' ')[1] || "Intelligence"}
                </span>
              </div>
            </Link>
          )}

          {/* SEARCH: Modern Integrated Dock */}
          <div className={`flex-1 max-w-xl transition-all duration-700 ${isMobileSearchOpen ? "fixed inset-0 bg-white dark:bg-slate-900 z-[60] p-6 flex items-start" : "hidden md:block"}`}>
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              </div>

              <SearchInput
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-slate-900 dark:focus:border-white focus:bg-white dark:focus:bg-slate-700 h-14 pl-12 pr-4 text-sm font-medium transition-all rounded-none text-slate-900 dark:text-white placeholder:text-slate-400"
                placeholder="Search the archive..."
              />

              {/* Kinetic Border (Underline) */}
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-blue-600 group-focus-within:w-full transition-all duration-700" />

              {isMobileSearchOpen && (
                <button
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-900 dark:text-white"
                >
                  <X size={24} />
                </button>
              )}
            </div>
          </div>

          {/* ACTIONS: Adaptive Pill Style */}
          {!isMobileSearchOpen && (
            <div className="flex items-center gap-2">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="w-12 h-12 flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun size={20} className="text-amber-500" />
                ) : (
                  <Moon size={20} className="text-slate-600" />
                )}
              </button>

              <button
                onClick={() => setIsMobileSearchOpen(true)}
                className="md:hidden w-12 h-12 flex items-center justify-center border border-slate-100 dark:border-slate-700 rounded-full"
              >
                <Search size={20} className="text-slate-900 dark:text-white" />
              </button>

              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 pl-2 pr-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-600 transition-all duration-300 rounded-full group"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-white/20 flex items-center justify-center text-[12px] font-black">
                      {user?.name?.charAt(0)}
                    </div>
                    <span className="hidden lg:inline text-[11px] font-black uppercase tracking-widest">
                      Account
                    </span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-12 h-12 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-full"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="group relative h-14 flex items-center px-10 bg-white dark:bg-slate-800 border-2 border-slate-950 dark:border-white overflow-hidden"
                >
                  {/* Hover Fill Effect */}
                  <div className="absolute inset-0 w-0 bg-slate-950 dark:bg-white transition-all duration-500 group-hover:w-full" />
                  <span className="relative z-10 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 dark:text-white group-hover:text-white dark:group-hover:text-slate-900 transition-colors">
                    Sign In
                  </span>
                  <ArrowUpRight size={14} className="relative z-10 ml-2 text-slate-950 dark:text-white group-hover:text-white dark:group-hover:text-slate-900 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}