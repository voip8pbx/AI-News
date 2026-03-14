-- =====================================================
-- Verbis AI News Platform - Complete Master Schema
-- =====================================================
-- This file contains the full database structure with all tables,
-- indexes, RLS policies, triggers, and initial data including
-- startup and business categories with sample articles.
--
-- Run each section separately in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. USERS TABLE
-- =====================================================
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

-- =====================================================
-- 3. CATEGORIES TABLE
-- =====================================================
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

-- =====================================================
-- 4. ARTICLES TABLE
-- =====================================================
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
    ai_image_url TEXT,
    ai_image_status TEXT DEFAULT 'pending' CHECK (ai_image_status IN ('pending', 'processing', 'completed', 'failed')),
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

-- =====================================================
-- 5. SAVED ARTICLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- =====================================================
-- 6. LIKED ARTICLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS liked_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- =====================================================
-- 7. ARTICLE VIEWS TABLE
-- =====================================================
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

-- =====================================================
-- 8. COMMENTS TABLE
-- =====================================================
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

-- =====================================================
-- 9. COMMENT LIKES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- =====================================================
-- 10. NEWS IMAGES TABLE
-- =====================================================
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

-- =====================================================
-- 11. SCHEDULES TABLE
-- =====================================================
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category)
);

-- =====================================================
-- 12. CRON EXECUTION LOGS TABLE
-- =====================================================
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

-- =====================================================
-- 13. SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'model_config',
    site_title TEXT DEFAULT 'Verbis AI News',
    active_text_provider TEXT DEFAULT 'openrouter',
    active_image_provider TEXT DEFAULT 'openrouter',
    ai_providers JSONB DEFAULT '{}',
    article_expiry_days INTEGER DEFAULT 30,
    cron_schedule TEXT DEFAULT 'hourly',
    contact_email TEXT DEFAULT 'contact@verbis-ai.com',
    contact_phone TEXT,
    logo TEXT,
    fallback_banner_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 14. INDEXES FOR PERFORMANCE
-- =====================================================

-- Articles indexes
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_category_slug ON articles(category_slug);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_trending ON articles(trending);
CREATE INDEX IF NOT EXISTS idx_articles_views ON articles(views DESC);
CREATE INDEX IF NOT EXISTS idx_articles_ai_status ON articles(ai_image_status);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(is_featured);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- News images indexes
CREATE INDEX IF NOT EXISTS idx_news_images_hash ON news_images(article_hash);

-- Schedules indexes
CREATE INDEX IF NOT EXISTS idx_schedules_category ON schedules(category);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);

-- =====================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can manage all users" ON users FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Articles table policies
CREATE POLICY "Anyone can view published articles" ON articles FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can manage all articles" ON articles FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Editors can manage articles" ON articles FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));

-- Categories table policies
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Saved articles policies
CREATE POLICY "Users can manage own saved articles" ON saved_articles FOR ALL USING (auth.uid() = user_id);

-- Liked articles policies
CREATE POLICY "Users can manage own liked articles" ON liked_articles FOR ALL USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view published comments" ON comments FOR SELECT USING (status = 'published');
CREATE POLICY "Users can manage own comments" ON comments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all comments" ON comments FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- =====================================================
-- 16. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_images_updated_at BEFORE UPDATE ON news_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment article views
CREATE OR REPLACE FUNCTION increment_article_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE articles SET views = views + 1 WHERE id = NEW.article_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for article views
CREATE TRIGGER increment_article_views_trigger AFTER INSERT ON article_views FOR EACH ROW EXECUTE FUNCTION increment_article_views();

-- =====================================================
-- 17. VIEWS FOR OPTIMIZED QUERIES
-- =====================================================

-- View for published articles with category info
CREATE OR REPLACE VIEW v_published_articles AS
SELECT 
    a.id,
    a.title,
    a.slug,
    a.description,
    a.content,
    a.summary,
    a.url,
    a.banner_image,
    a.ai_image_url,
    a.image,
    a.author,
    a.category,
    a.category_slug,
    a.source_name,
    a.source_url,
    a.published_at,
    a.status,
    a.featured,
    a.trending,
    a.views,
    a.like_count,
    a.comment_count,
    a.seo_title,
    a.seo_description,
    a.seo_keywords,
    a.reading_time,
    a.language,
    a.model_used,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon
FROM articles a
LEFT JOIN categories c ON a.category_slug = c.slug
WHERE a.status = 'published'
ORDER BY a.published_at DESC;

-- View for AI news with completed images
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
WHERE status = 'published' AND ai_image_status = 'completed'
ORDER BY published_at DESC;

-- =====================================================
-- 18. INITIAL DATA SETUP
-- =====================================================

-- Insert default settings
INSERT INTO settings (id, site_title, active_text_provider, active_image_provider)
VALUES 
('model_config', 'Verbis AI News', 'openrouter', 'openrouter')
ON CONFLICT (id) DO UPDATE SET
    site_title = EXCLUDED.site_title,
    active_text_provider = EXCLUDED.active_text_provider,
    active_image_provider = EXCLUDED.active_image_provider,
    updated_at = NOW();

-- Insert default categories
INSERT INTO categories (name, slug, description, search_query, is_active, color, order_index, is_featured) VALUES 
('Technology', 'technology', 'Latest in Tech and AI', 'technology OR AI OR software', true, '#3B82F6', 1, true),
('World News', 'world', 'Global headlines and events', 'world OR international', true, '#EF4444', 2, true),
('Business', 'business', 'Business news and market updates', 'business OR finance OR market', true, '#10B981', 3, true),
('Startup', 'startup', 'Startup news, funding, and entrepreneurship', 'startup OR entrepreneur OR funding OR venture', true, '#8B5CF6', 4, true),
('Finance', 'finance', 'Financial news and market updates', 'finance OR money OR investment', true, '#F59E0B', 5, true),
('Science', 'science', 'Scientific discoveries and research', 'science OR research OR discovery', true, '#06B6D4', 6, false),
('Health', 'health', 'Health news and medical updates', 'health OR medical OR wellness', true, '#84CC16', 7, false),
('Sports', 'sports', 'Sports news and updates', 'sports OR game OR match', true, '#F97316', 8, false),
('Entertainment', 'entertainment', 'Entertainment news and celebrity updates', 'entertainment OR movie OR music', true, '#EC4899', 9, false)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    search_query = EXCLUDED.search_query,
    is_active = EXCLUDED.is_active,
    color = EXCLUDED.color,
    order_index = EXCLUDED.order_index,
    is_featured = EXCLUDED.is_featured,
    updated_at = NOW();

-- Insert sample startup articles
INSERT INTO articles (
    title, slug, description, content, url, category, category_slug, 
    source_name, source_url, published_at, status, banner_image, ai_image_status
) VALUES 
(
    'Tech Startup Raises $10M in Series A Funding',
    'tech-startup-raises-10m-series-a-funding',
    'A promising technology startup has successfully raised $10 million in Series A funding to expand operations and develop new products.',
    'A promising technology startup has successfully raised $10 million in Series A funding to expand operations and develop new products. The funding round was led by prominent venture capitalists who see great potential in the company''s innovative approach to solving industry problems.',
    'https://example.com/tech-startup-funding',
    'Startup',
    'startup',
    'Tech News Daily',
    'https://example.com',
    NOW(),
    'published',
    'https://picsum.photos/seed/startup1/800/400',
    'completed'
),
(
    'New AI Startup Disrupts Traditional Industries',
    'new-ai-startup-disrupts-traditional-industries',
    'An innovative AI startup is revolutionizing how traditional businesses operate with cutting-edge technology.',
    'An innovative AI startup is revolutionizing how traditional businesses operate with cutting-edge technology solutions. The company has developed proprietary algorithms that significantly improve efficiency and reduce costs for enterprises across multiple sectors.',
    'https://example.com/ai-startup-disruption',
    'Startup',
    'startup',
    'Innovation Weekly',
    'https://example.com',
    NOW() - INTERVAL '1 day',
    'published',
    'https://picsum.photos/seed/startup2/800/400',
    'completed'
),
(
    'Entrepreneur Launches Sustainable Business Venture',
    'entrepreneur-launches-sustainable-business-venture',
    'A visionary entrepreneur has launched a new business focused on sustainability and environmental impact.',
    'A visionary entrepreneur has launched a new business focused on sustainability and environmental impact. The venture aims to address climate change through innovative business models and eco-friendly practices that could revolutionize the industry.',
    'https://example.com/sustainable-venture',
    'Business',
    'business',
    'Green Business Today',
    'https://example.com',
    NOW() - INTERVAL '2 days',
    'published',
    'https://picsum.photos/seed/business1/800/400',
    'completed'
),
(
    'Venture Capital Firm Announces New $100M Fund for Startups',
    'venture-capital-firm-announces-new-100m-fund-for-startups',
    'Major venture capital firm launches new fund specifically targeting early-stage startups in emerging technologies.',
    'Major venture capital firm launches new fund specifically targeting early-stage startups in emerging technologies. The fund will focus on companies working on artificial intelligence, blockchain, and sustainable technology solutions.',
    'https://example.com/vc-fund-announcement',
    'Business',
    'business',
    'VC News Daily',
    'https://example.com',
    NOW() - INTERVAL '3 days',
    'published',
    'https://picsum.photos/seed/business2/800/400',
    'completed'
),
(
    'Startup Accelerator Program Accepts 50 New Companies',
    'startup-accelerator-program-accepts-50-new-companies',
    'Prestigious startup accelerator announces its latest cohort of 50 promising startups from around the world.',
    'Prestigious startup accelerator announces its latest cohort of 50 promising startups from around the world. The selected companies will receive mentorship, funding, and access to a network of successful entrepreneurs and investors.',
    'https://example.com/accelerator-cohort',
    'Startup',
    'startup',
    'Startup World',
    'https://example.com',
    NOW() - INTERVAL '4 days',
    'published',
    'https://picsum.photos/seed/startup3/800/400',
    'completed'
)
ON CONFLICT (url) DO NOTHING;

-- Insert sample finance articles
INSERT INTO articles (
    title, slug, description, content, url, category, category_slug, 
    source_name, source_url, published_at, status, banner_image, ai_image_status
) VALUES 
(
    'Federal Reserve Announces Interest Rate Decision',
    'federal-reserve-announces-interest-rate-decision',
    'The Federal Reserve has made its latest decision on interest rates, impacting markets and borrowers nationwide.',
    'The Federal Reserve has made its latest decision on interest rates, impacting markets and borrowers nationwide. The decision comes after weeks of speculation and analysis of economic indicators.',
    'https://example.com/fed-rate-decision',
    'Finance',
    'finance',
    'Financial Times',
    'https://example.com',
    NOW() - INTERVAL '1 day',
    'published',
    'https://picsum.photos/seed/finance1/800/400',
    'completed'
),
(
    'Stock Market Reaches New All-Time High',
    'stock-market-reaches-new-all-time-high',
    'Major stock indices hit record levels as investor confidence grows amid positive economic data.',
    'Major stock indices hit record levels as investor confidence grows amid positive economic data. The rally has been fueled by strong corporate earnings and optimistic economic forecasts.',
    'https://example.com/stock-market-high',
    'Finance',
    'finance',
    'Market Watch',
    'https://example.com',
    NOW() - INTERVAL '2 days',
    'published',
    'https://picsum.photos/seed/finance2/800/400',
    'completed'
)
ON CONFLICT (url) DO NOTHING;

-- Insert ingestion schedules
INSERT INTO schedules (category, articles_per_day, days_remaining, status, interval) VALUES 
('startup', 5, 9999, 'active', 'hourly'),
('business', 5, 9999, 'active', 'hourly'),
('finance', 8, 9999, 'active', 'hourly'),
('technology', 10, 9999, 'active', 'hourly'),
('world', 10, 9999, 'active', 'hourly')
ON CONFLICT (category) DO UPDATE SET
    articles_per_day = EXCLUDED.articles_per_day,
    days_remaining = EXCLUDED.days_remaining,
    status = EXCLUDED.status,
    interval = EXCLUDED.interval,
    updated_at = NOW();

-- =====================================================
-- 19. VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created successfully
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 
    'categories', COUNT(*) FROM categories
UNION ALL
SELECT 
    'articles', COUNT(*) FROM articles
UNION ALL
SELECT 
    'schedules', COUNT(*) FROM schedules
UNION ALL
SELECT 
    'settings', COUNT(*) FROM settings;

-- Verify startup and business articles
SELECT 
    category,
    category_slug,
    COUNT(*) as article_count,
    MIN(published_at) as earliest_article,
    MAX(published_at) as latest_article
FROM articles 
WHERE category IN ('Startup', 'Business', 'Finance')
GROUP BY category, category_slug
ORDER BY article_count DESC;

-- =====================================================
-- 20. COMPLETION MESSAGE
-- =====================================================

-- The schema is now complete with:
-- ✅ All tables created with proper relationships
-- ✅ Indexes for performance optimization
-- ✅ Row Level Security policies
-- ✅ Triggers for automatic timestamp updates
-- ✅ Views for optimized queries
-- ✅ Initial data including startup/business categories
-- ✅ Sample articles for testing
-- ✅ Ingestion schedules for automated news fetching

-- Your Verbis AI News Platform database is now ready!
