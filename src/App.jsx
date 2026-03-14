import React, { useEffect } from 'react';
import './theme/App.css'
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/ui/Navbar";
import Home from "./pages/Home";
import Login from './pages/Login';
import Register from './pages/Register';
import ArticleDetail from './pages/ArticleDetail';
import LoginModal from './components/modals/LoginModal';
import Profile from './pages/Profile';

import AdminRoute from './utils/ProtectedRoute';

import Analytics from './pages/Analytics';
import { Toaster } from 'react-hot-toast';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';

// Initialize cron jobs for backend functionality
import { startCronJobs } from './cron/initCronJobs.js';

function AppContent() {
  const location = useLocation();

  // Start cron jobs once when app mounts
  useEffect(() => {
    startCronJobs().catch(console.error);
  }, []);

  // Check if we are on the admin path
  const isAdminPage = location.pathname.startsWith("/analytics");

  return (
    <ThemeProvider>
      <BrandingProvider>
        <div className="min-h-screen">
          <Toaster position="top-center" />
          <>
            {!isAdminPage && <Navbar />}

            <main className={!isAdminPage ? "pt-32 md:pt-36" : ""}>
              <Routes>
                <Route
                  path="/analytics"
                  element={
                    <AdminRoute>
                      <Analytics />
                    </AdminRoute>
                  }
                />
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<Profile />} />

                {/* NEW NESTED SEO ROUTES 
                  Matches: /ai-tech/slug-of-article
                */}
                <Route path="/:category/:slug" element={<ArticleDetail />} />

                {/* LEGACY/ID ROUTE 
                  Kept for backwards compatibility or direct ID lookups
                */}
                <Route path="/article/:id" element={<ArticleDetail />} />
              </Routes>
            </main>

            <LoginModal />
          </>
        </div>
      </BrandingProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}