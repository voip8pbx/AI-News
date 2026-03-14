# Verbis AI News · [!IMPORTANT]
> A High-End, Automated News Aggregation & Ingestion Engine built with **React**, **Vite**, and **Supabase**.

Verbis is a modern, real-time news platform designed for seamless automation. It features an autonomous "News Ingestion Engine" that fetches, deduplicates, and synchronizes global news every hour (or at custom intervals) directly into a Supabase database.

---

## 🚀 Key Features

- **📡 Autonomous Ingestion Engine**: Automatic hourly fetching from GNews API across 8 major categories (Technology, Business, World, Science, Health, Sports, Entertainment, General).
- **🛡️ Smart Deduplication**: Intelligently hashes and checks article URLs against the database before insertion to prevent content noise.
- **📊 Admin Analytical Studio**: A premium, "Studio v4" aesthetic dashboard to monitor site health, user engagement, and content distribution.
- **⏱️ Live Cron Monitor**: Real-time visualization of background ingestion threads, including yield counts (inserted vs skip) and countdowns to the next sync.
- **🌗 Adaptive UI**: A sleek, high-end user interface with full Dark/Light mode support, integrated glassmorphism, and responsive layouts.
- **✨ SEO Optimized**: Dynamic routing and metadata structure ([domain]/[category]/[slug]) for maximum search engine crawlability.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), Tailwind CSS 4, Framer Motion |
| **Backend / DB** | Supabase (PostgreSQL), Edge Functions (Concept) |
| **Icons & UI** | Lucide React, Recharts (Analytics) |
| **Data Source** | GNews API (with multi-key rotation fallback) |
| **Editor** | TipTap / Quill (AI Article Creation Ready) |

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory and populate it with the following keys:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# GNews API (Primary + Fallbacks for high limit)
VITE_GNEWS_API_KEY=primary_key
VITE_GNEWS_FALLBACK_API_KEY=fallback_1
VITE_GNEWS_TERTIARY_API_KEY=fallback_2

# Optional AI Integration
VITE_OPENROUTER_API_KEY=optional_ai_key
```

---

## 🏗️ Core Architecture

### 1. The Ingestion Pipeline (`src/services/newsIngestionService.js`)
The heart of Verbis. It orchestrates the API → DB flow.
- Fetches metadata-rich snippets.
- Normalizes data fields (handling source names, URLs, and timestamps).
- Commits unique entries to the `articles` table.

### 2. The Cron Service (`src/services/cronService.js`)
An autonomous interval-based scheduler that starts as soon as the application mounts. 
- **Frequency**: Configured via the Admin Dashboard (stored in `settings`).
- **Resilience**: Features a `reInitialize` loop to apply configuration changes on-the-fly without server restarts.

### 3. The Monitor (`src/components/ui/NewsFetchPanel.jsx`)
A real-time dashboard module integrated into the Admin portal.
- Tracks `inserted` vs `skipped` articles per category.
- Monitors "Thread Health" to detect API rate-limiting or network failures.
- Provides a **"Run Cycle Now"** override for immediate ingestion.

---

## 🛠️ Setup & Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd verbis-ai-news
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Initialization**
   Run the provided SQL schema (if available) in your Supabase SQL Editor to create `articles`, `categories`, and `settings` tables.

4. **Launch Development Server**
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```text
src/
├── api/             # Supabase & External API bridges
├── components/
│   ├── admin/       # Dashboard-specific modules (Studio v4)
│   └── ui/          # Consumer-facing components & Monitors
├── cron/            # Cron initialization and orchestration
├── services/        # Core business logic (Ingestion, Cron, DB)
├── pages/           # High-level routes (Home, Analytics, Detail)
└── theme/           # Global CSS variables and aesthetic tokens
```

---

## 📄 License

Proprietary / Private. All rights reserved. 
Designed by **Verbis AI Team**.
