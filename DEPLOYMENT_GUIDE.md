# 🚀 Verbis AI News Platform - Vercel Deployment Guide

## 📋 Prerequisites

Before deploying to Vercel, make sure you have:

1. ✅ **GitHub Repository**: https://github.com/voip8pbx/AI-News
2. ✅ **Supabase Project**: Database and authentication set up
3. ✅ **API Keys**: GNews and OpenRouter API keys ready
4. ✅ **Vercel Account**: Free account at [vercel.com](https://vercel.com)

---

## 🔧 Step 1: Environment Setup

### 1.1 Create Local Environment File
```bash
cp .env.example .env
```

### 1.2 Add Your API Keys to `.env`
```env
# GNews API Keys (get from https://gnews.io/)
VITE_GNEWS_API_KEY=your_primary_gnews_api_key_here
VITE_GNEWS_FALLBACK_API_KEY=your_fallback_gnews_api_key_here
VITE_GNEWS_TERTIARY_API_KEY=your_tertiary_gnews_api_key_here
VITE_GNEWS_QUATERNARY_API_KEY=your_quaternary_gnews_api_key_here
VITE_GNEWS_QUINARY_API_KEY=your_quinary_gnews_api_key_here

# OpenRouter API Keys (get from https://openrouter.ai/)
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_OPENROUTER_FALLBACK_API_KEY=your_openrouter_fallback_api_key_here

# Supabase Configuration (from your Supabase project)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Cron Job Configuration
VITE_ENABLE_CRON_JOBS=true
VITE_DEFAULT_CRON_INTERVAL=hourly
VITE_MAX_ARTICLES_PER_DAY=100
```

---

## 🗄️ Step 2: Supabase Database Setup

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization
4. Set project name: `verbis-ai-news`
5. Set database password (save it securely)
6. Choose region closest to your users
7. Click "Create new project"

### 2.2 Run the SQL Schema
1. Open your Supabase project
2. Go to **SQL Editor** in the left sidebar
3. Open `supabase-simple-schema.sql` from your project
4. **Copy and run each section separately:**

#### Section 1: Extension
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

#### Section 2: Users Table
```sql
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
```

#### Section 3: Categories Table
```sql
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
```

#### Section 4: Articles Table
```sql
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
```

#### Continue with all remaining tables from the schema file...

### 2.3 Get Supabase Credentials
1. In Supabase, go to **Project Settings** → **API**
2. Copy the **Project URL** and **anon public** key
3. Add them to your `.env` file

---

## 🌐 Step 3: Deploy to Vercel

### 3.1 Connect GitHub to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Install Vercel GitHub app if prompted
5. Select your repository: `voip8pbx/AI-News`
6. Click **"Import"**

### 3.2 Configure Vercel Settings
Vercel will auto-detect your project settings:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Root Directory: ./
```

### 3.3 Add Environment Variables in Vercel
1. In Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add all your environment variables:

#### Required Variables:
```
VITE_GNEWS_API_KEY=your_primary_gnews_api_key_here
VITE_GNEWS_FALLBACK_API_KEY=your_fallback_gnews_api_key_here
VITE_GNEWS_TERTIARY_API_KEY=your_tertiary_gnews_api_key_here
VITE_GNEWS_QUATERNARY_API_KEY=your_quaternary_gnews_api_key_here
VITE_GNEWS_QUINARY_API_KEY=your_quinary_gnews_api_key_here
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_OPENROUTER_FALLBACK_API_KEY=your_openrouter_fallback_api_key_here
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_ENABLE_CRON_JOBS=true
VITE_DEFAULT_CRON_INTERVAL=hourly
VITE_MAX_ARTICLES_PER_DAY=100
```

3. Make sure all variables have the **VITE_** prefix
4. Click **"Save"**

### 3.4 Deploy Your Application
1. Go back to **Deployments** tab
2. Click **"Deploy"**
3. Vercel will:
   - Install dependencies
   - Build your application
   - Deploy to global CDN
4. Wait for deployment to complete (usually 2-3 minutes)

### 3.5 Get Your Live URL
Once deployed, Vercel will give you:
- **Live URL**: `https://your-app-name.vercel.app`
- **Custom Domain**: Can add later

---

## 🔧 Step 4: Post-Deployment Setup

### 4.1 Test Your Application
1. Visit your Vercel URL
2. Test user registration:
   - First user automatically gets admin role
   - Subsequent users get 'user' role
3. Test login functionality
4. Access admin dashboard at `/analytics`

### 4.2 Configure Cron Jobs for Production
Since Vercel is serverless, cron jobs need special handling:

#### Option A: Use Vercel Cron Jobs
1. Create `vercel.json` in your root:
```json
{
  "crons": [
    {
      "path": "/api/cron/ingest",
      "schedule": "0 * * * *"
    }
  ]
}
```

#### Option B: External Cron Service
1. Use [cron-job.org](https://cron-job.org) or [EasyCron](https://easycron.com)
2. Set endpoint: `https://your-app.vercel.app/api/cron/ingest`
3. Schedule: Every hour

### 4.3 Set Up Custom Domain (Optional)
1. In Vercel dashboard → **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate automatically provisioned

---

## 🎯 Step 5: Optimization & Monitoring

### 5.1 Performance Optimization
Your build already includes optimizations, but you can:

#### Bundle Splitting (Optional)
Add to `vite.config.js`:
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'framer-motion'],
          charts: ['recharts']
        }
      }
    }
  }
});
```

### 5.2 Monitor Your App
1. **Vercel Analytics**: Built-in performance monitoring
2. **Supabase Logs**: Database and auth logs
3. **Error Tracking**: Set up Sentry if needed

### 5.3 SEO Optimization
Update `index.html`:
```html
<title>Verbis AI News - AI-Powered News Platform</title>
<meta name="description" content="AI-powered news aggregation and analysis platform with automated content generation">
<meta property="og:title" content="Verbis AI News">
<meta property="og:description" content="AI-powered news platform">
<meta property="og:image" content="/og-image.png">
```

---

## 🔍 Troubleshooting

### Common Vercel Issues:

#### Build Failures
```bash
# Clear cache and redeploy
# In Vercel dashboard: Redeploy → Clear Cache
```

#### Environment Variables Not Working
- Ensure all variables have `VITE_` prefix
- Check Vercel environment variables section
- Redeploy after adding variables

#### Supabase Connection Issues
- Verify Supabase URL and keys
- Check RLS policies in Supabase
- Ensure CORS is configured

#### Cron Jobs Not Running
- Cron jobs require serverless functions
- Check Vercel function logs
- Consider external cron service

#### API Rate Limiting
- Monitor GNews API usage
- Implement rate limiting
- Use multiple API keys

---

## 📊 Vercel Features You Get

### Included in Free Plan:
- ✅ **100GB Bandwidth** per month
- ✅ **Custom Domains** with SSL
- ✅ **Global CDN** deployment
- ✅ **Automatic HTTPS**
- ✅ **Git Integration**
- ✅ **Preview Deployments**
- ✅ **Analytics Dashboard**

### Upgrade Options:
- **Pro Plan**: $20/month for more bandwidth and features
- **Enterprise**: Custom pricing for large applications

---

## 🚀 Production Checklist

Before going live:

- [ ] All environment variables configured in Vercel
- [ ] Supabase database schema created
- [ ] API keys working and not rate limited
- [ ] User registration/login tested
- [ ] Admin dashboard accessible
- [ ] Cron jobs configured
- [ ] Custom domain set up (optional)
- [ ] SEO meta tags updated
- [ ] Error monitoring configured
- [ ] Performance optimized
- [ ] Security headers configured

---

## 🎉 You're Live!

Your Verbis AI News Platform is now live at:
- **Primary URL**: `https://your-app-name.vercel.app`
- **Admin Panel**: `https://your-app-name.vercel.app/analytics`

### Features Available:
- ✅ **AI-powered news aggregation**
- ✅ **Automated content ingestion**
- ✅ **User management system**
- ✅ **Admin dashboard**
- ✅ **Responsive design**
- ✅ **Real-time updates**
- ✅ **Global CDN delivery**
- ✅ **SSL security**

---

## 📞 Support & Resources

### Getting Help:
1. **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
2. **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
3. **GitHub Issues**: Report bugs in your repository
4. **Community**: Join Vercel and Supabase Discord communities

### Monitoring:
- **Vercel Dashboard**: Analytics and logs
- **Supabase Dashboard**: Database and auth metrics
- **GitHub Actions**: Build and deploy status

---

**🎊 Congratulations! Your AI News Platform is now live on Vercel!**
