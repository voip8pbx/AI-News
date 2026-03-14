# Cron Job Integration for GNews API Ingestion

This document explains the cron job system implemented for automated news ingestion from the GNews API.

## Overview

The cron job system automatically fetches news articles from the GNews API at specified intervals and stores them in your Supabase database. This prevents API rate limiting and ensures a steady flow of fresh content.

## Architecture

### Core Components

1. **CronService** (`src/services/cronService.js`)
   - Manages all cron jobs using node-cron
   - Handles job scheduling, execution, and lifecycle
   - Provides status monitoring and error handling

2. **GNewsService** (`src/services/gnewsService.js`)
   - Handles API communication with GNews
   - Implements API key rotation and fallback logic
   - Provides article normalization and duplicate filtering

3. **DatabaseService** (`src/services/databaseService.js`)
   - Manages article storage in Supabase
   - Handles duplicate prevention and category management
   - Provides statistics and maintenance functions

4. **Schedule API** (`src/api/schedule.js`)
   - Enhanced with cron job integration
   - Provides CRUD operations for schedules
   - Handles ingestion execution and statistics

## Installation

### 1. Install Dependencies

```bash
npm install node-cron --legacy-peer-deps
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Update your `.env` file with your API keys:
```env
# GNews API Keys (get from https://gnews.io/)
VITE_GNEWS_API_KEY=your_primary_gnews_api_key
VITE_GNEWS_FALLBACK_API_KEY=your_fallback_gnews_api_key
VITE_GNEWS_TERTIARY_API_KEY=your_tertiary_gnews_api_key
VITE_GNEWS_QUATERNARY_API_KEY=your_quaternary_gnews_api_key
VITE_GNEWS_QUINARY_API_KEY=your_quinary_gnews_api_key

# OpenRouter API Keys (optional, for AI content processing)
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_OPENROUTER_FALLBACK_API_KEY=your_openrouter_fallback_api_key
```

### 3. Database Schema

Ensure your Supabase database has the following tables:

#### schedules table
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  articles_per_day INTEGER NOT NULL DEFAULT 10,
  days_remaining INTEGER NOT NULL DEFAULT 7,
  count_today INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  interval TEXT DEFAULT 'hourly',
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### articles table
```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT UNIQUE NOT NULL,
  banner_image TEXT,
  author TEXT,
  category_slug TEXT,
  published_at TIMESTAMPTZ,
  source_name TEXT,
  source_url TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### categories table
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage

### 1. Automatic Initialization

Cron jobs are automatically initialized when the application starts:

```javascript
// In App.jsx
import { startCronJobs } from './cron/initCronJobs.js';
startCronJobs().catch(console.error);
```

### 2. Creating Schedules

Use the admin interface or API to create schedules:

```javascript
import { createSchedule } from './api/schedule';

const schedule = await createSchedule({
  category: 'technology',
  articlesPerDay: 20,
  daysRemaining: 30,
  interval: 'hourly' // 'hourly', 'daily', 'every6hours', 'every12hours', 'every30minutes'
});
```

### 3. Managing Cron Jobs

```javascript
import { 
  getCronJobStatus, 
  addScheduleToCron, 
  removeScheduleFromCron,
  updateScheduleInCron 
} from './cron/initCronJobs.js';

// Get status of all cron jobs
const status = getCronJobStatus();

// Add new schedule to cron
await addScheduleToCron(schedule);

// Remove schedule from cron
removeScheduleFromCron(scheduleId);

// Update existing schedule
await updateScheduleInCron(updatedSchedule);
```

## Cron Expressions

The system supports these predefined intervals:

| Interval | Cron Expression | Description |
|----------|----------------|-------------|
| hourly | `0 * * * *` | Every hour at minute 0 |
| daily | `0 0 * * *` | Every day at midnight |
| every6hours | `0 */6 * * *` | Every 6 hours |
| every12hours | `0 */12 * * *` | Every 12 hours |
| every30minutes | `*/30 * * * *` | Every 30 minutes |

## Features

### 1. API Key Rotation

The system automatically rotates through multiple GNews API keys to avoid rate limiting:

```javascript
const apiKeys = [
  VITE_GNEWS_API_KEY,
  VITE_GNEWS_FALLBACK_API_KEY,
  VITE_GNEWS_TERTIARY_API_KEY,
  // ... more keys
];
```

### 2. Duplicate Prevention

Articles are checked for duplicates both in memory and database:

```javascript
// URL-based duplicate checking
const exists = await articleExists(article.url);
if (!exists) {
  await insertArticle(article);
}
```

### 3. Error Handling

Comprehensive error handling at every level:

- API failures with automatic retry
- Database errors with graceful degradation
- Cron job failures with logging
- Network timeouts with fallback

### 4. Monitoring

Real-time status monitoring through:

- Console logging
- Admin dashboard status
- Job execution statistics
- Error reporting

## API Endpoints

### GNews API Integration

The system calls these GNews endpoints:

- Top Headlines: `https://gnews.io/api/v4/top-headlines`
- Search: `https://gnews.io/api/v4/search`

### Example API Response

```json
{
  "articles": [
    {
      "title": "Article Title",
      "description": "Article description",
      "content": "Full article content",
      "url": "https://example.com/article",
      "image": "https://example.com/image.jpg",
      "publishedAt": "2024-01-01T12:00:00Z",
      "source": {
        "name": "Source Name",
        "url": "https://example.com"
      }
    }
  ]
}
```

## Troubleshooting

### 1. Cron Jobs Not Running

**Symptoms:** No articles being ingested, cron status shows "No Cron Jobs"

**Solutions:**
1. Restart the application to reinitialize cron jobs
2. Check environment variables are set correctly
3. Verify schedules are marked as 'active' in database
4. Check console for initialization errors

### 2. API Rate Limiting

**Symptoms:** HTTP 429 errors from GNews API

**Solutions:**
1. Add more API keys to environment variables
2. Increase cron interval (e.g., from every 30 minutes to hourly)
3. Reduce articles per run limit

### 3. Database Errors

**Symptoms:** Articles not being saved, duplicate constraint errors

**Solutions:**
1. Check database connection
2. Verify table schemas match requirements
3. Check for existing duplicate URLs

### 4. Memory Issues

**Symptoms:** Application crashes during ingestion

**Solutions:**
1. Reduce batch size in database service
2. Limit articles per run
3. Implement article cleanup for old content

## Performance Optimization

### 1. Batch Processing

Articles are processed in batches to prevent memory issues:

```javascript
const batchSize = 10;
for (let i = 0; i < articles.length; i += batchSize) {
  const batch = articles.slice(i, i + batchSize);
  await processBatch(batch);
}
```

### 2. Database Indexing

Add indexes for better performance:

```sql
CREATE INDEX idx_articles_url ON articles(url);
CREATE INDEX idx_articles_category ON articles(category_slug);
CREATE INDEX idx_articles_published ON articles(published_at);
```

### 3. Article Cleanup

Automatically remove old articles:

```javascript
// Cleanup articles older than 30 days
await databaseService.cleanupOldArticles(30);
```

## Security Considerations

1. **API Keys:** Store API keys in environment variables, never in code
2. **Database:** Use Supabase Row Level Security (RLS) policies
3. **Input Validation:** Validate all article data before storage
4. **Rate Limiting:** Implement client-side rate limiting for API calls

## Monitoring and Logging

### Console Logs

The system provides detailed console logging:

```
[CronService] Initializing cron service...
[CronService] Found 3 active schedules
[CronService] Starting cron job for schedule 123 (technology): 0 * * * *
[GNewsService] Fetching headlines with key abcd...
[GNewsService] Successfully fetched 10 articles
[DatabaseService] Inserted 8 articles, skipped 2 duplicates
```

### Admin Dashboard

The admin interface shows:
- Active schedules and their status
- Real-time cron job status
- Article ingestion statistics
- Error logs and warnings

## Development

### Running in Development

1. Set `VITE_ENABLE_CRON_JOBS=true` in your `.env`
2. Start the development server: `npm run dev`
3. Check console for cron initialization messages

### Testing

```javascript
// Test cron job creation
import { startCronJobs, getCronJobStatus } from './cron/initCronJobs.js';

await startCronJobs();
const status = getCronJobStatus();
console.log('Cron status:', status);
```

### Debugging

Enable debug logging by setting:
```env
VITE_DEBUG_CRON=true
```

## Production Deployment

### 1. Environment Setup

- Set all required environment variables
- Configure Supabase database
- Set up monitoring and logging

### 2. Process Management

Use a process manager like PM2 to ensure cron jobs survive restarts:

```bash
npm install -g pm2
pm2 start npm --name "verbis-app" -- run dev
```

### 3. Monitoring

Set up monitoring for:
- Cron job execution
- API response times
- Database performance
- Error rates

## Contributing

When modifying the cron system:

1. Test all changes in development first
2. Update this documentation
3. Add appropriate error handling
4. Consider backward compatibility
5. Test with various API failure scenarios

## License

This cron job integration is part of the Verbis AI project and follows the same license terms.
