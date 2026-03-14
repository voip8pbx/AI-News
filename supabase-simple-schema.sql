-- =====================================================
-- Verbis AI News Platform - Complete Master Schema
-- =====================================================
-- This file contains the full database structure, including 
-- the Production-Grade AI Image Pipeline enhancements.
--
-- Run this in the Supabase SQL Editor.
-- =====================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'editor')),
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    social_links JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    search_query TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    banner_image TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ARTICLES TABLE
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    ai_content TEXT,
    summary TEXT,
    excerpt TEXT,
    url TEXT UNIQUE NOT NULL,
    banner_image TEXT,
    generated_image TEXT,
    image TEXT,
    author TEXT,
    category TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_slug TEXT,
    source_name TEXT,
    source_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    featured BOOLEAN DEFAULT false,
    trending BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[] DEFAULT '{}',
    reading_time INTEGER,
    content_hash TEXT,
    language TEXT DEFAULT 'en',
    model_used TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Image Pipeline Additions to Articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_image_url TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_image_status TEXT DEFAULT 'pending' CHECK (ai_image_status IN ('pending', 'processing', 'completed', 'failed'));

-- 5. SAVED ARTICLES TABLE
CREATE TABLE IF NOT EXISTS saved_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- 6. LIKED ARTICLES TABLE
CREATE TABLE IF NOT EXISTS liked_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- 7. ARTICLE VIEWS TABLE
CREATE TABLE IF NOT EXISTS article_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    session_id TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'pending', 'rejected', 'deleted')),
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. COMMENT LIKES TABLE
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- 10. NEWS IMAGES TABLE (AI Cache)
CREATE TABLE IF NOT EXISTS news_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_title TEXT NOT NULL,
    article_hash TEXT NOT NULL UNIQUE,
    generated_image_url TEXT NOT NULL,
    original_image_url TEXT,
    prompt TEXT,
    model_used TEXT,
    generation_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. SCHEDULES TABLE (Cron Settings)
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    articles_per_day INTEGER NOT NULL DEFAULT 10,
    days_remaining INTEGER NOT NULL DEFAULT 7,
    count_today INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
    interval TEXT DEFAULT 'hourly' CHECK (interval IN ('hourly', 'daily', 'every6hours', 'every12hours', 'every30minutes')),
    cron_expression TEXT,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. CRON EXECUTION LOGS TABLE
CREATE TABLE IF NOT EXISTS cron_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    articles_fetched INTEGER DEFAULT 0,
    articles_processed INTEGER DEFAULT 0,
    articles_inserted INTEGER DEFAULT 0,
    duplicates_skipped INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 13. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'model_config',
    site_title TEXT DEFAULT 'Verbis AI News',
    contact_email TEXT DEFAULT 'contact@verbis-ai.com',
    contact_phone TEXT,
    logo TEXT,
    fallback_banner_url TEXT,
    active_text_provider TEXT DEFAULT 'openrouter',
    active_image_provider TEXT DEFAULT 'openrouter',
    ai_providers JSONB DEFAULT '{}',
    article_expiry_days INTEGER DEFAULT 30,
    cron_schedule TEXT DEFAULT 'hourly',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. OPTIMIZATION INDEXES
CREATE INDEX IF NOT EXISTS idx_articles_ai_status ON articles(ai_image_status);
CREATE INDEX IF NOT EXISTS idx_news_images_hash ON news_images(article_hash);
CREATE INDEX IF NOT EXISTS idx_articles_category_slug ON articles(category_slug);

-- 15. VIEWS
CREATE OR REPLACE VIEW v_ai_news AS
SELECT 
    id, 
    title, 
    description, 
    content, 
    source_name, 
    url, 
    category_slug, 
    banner_image as original_image_url,
    COALESCE(ai_image_url, banner_image) as ai_image_url,
    published_at
FROM articles
WHERE status = 'published'
ORDER BY published_at DESC;

-- 16. SEED DATA (Default Config)

-- Create default categories
INSERT INTO categories (name, slug, description, search_query, is_active)
VALUES 
('Technology', 'technology', 'Latest in Tech and AI', 'technology', true),
('World News', 'world', 'Global headlines', 'world', true)
ON CONFLICT (slug) DO NOTHING;

-- Create ingestion schedules
INSERT INTO schedules (category, articles_per_day, days_remaining, status, interval)
VALUES 
('technology', 10, 9999, 'active', 'hourly'),
('world', 10, 9999, 'active', 'hourly')
ON CONFLICT DO NOTHING;

-- Initialize main settings
INSERT INTO settings (id, site_title, active_text_provider, active_image_provider) 
VALUES ('model_config', 'Verbis AI News', 'openrouter', 'nano-banana')
ON CONFLICT (id) DO UPDATE 
SET site_title = EXCLUDED.site_title,
    active_text_provider = EXCLUDED.active_text_provider,
    active_image_provider = EXCLUDED.active_image_provider;
