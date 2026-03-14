import { supabase } from "../supabase";
import { fetchTopHeadlines, filterDuplicates } from "../services/gnewsService";
import { databaseService } from "../services/databaseService";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_FALLBACK_API_KEY = import.meta.env.VITE_OPENROUTER_FALLBACK_API_KEY;
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY;
const GNEWS_FALLBACK_API_KEY = import.meta.env.VITE_GNEWS_FALLBACK_API_KEY;
const GNEWS_TERTIARY_API_KEY = import.meta.env.VITE_GNEWS_TERTIARY_API_KEY;
const GNEWS_QUATERNARY_API_KEY = import.meta.env.VITE_GNEWS_QUATERNARY_API_KEY;
const GNEWS_QUINARY_API_KEY = import.meta.env.VITE_GNEWS_QUINARY_API_KEY;

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const getActiveSchedules = async () => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    // Map snake_case to camelCase
    return data.map(d => ({
      _id: d.id, // Emulate mongo id format inside React
      category: d.category,
      articlesPerDay: d.articles_per_day,
      daysRemaining: d.days_remaining,
      countToday: d.count_today || 0,
      lastRun: d.last_run,
      status: d.status,
      interval: d.interval || 'hourly',
      createdAt: d.created_at
    }));
  } catch (error) {
    console.error("Error fetching active schedules:", error);
    return [];
  }
};

export const getAllSchedules = async () => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(d => ({
      _id: d.id,
      category: d.category,
      articlesPerDay: d.articles_per_day,
      daysRemaining: d.days_remaining,
      countToday: d.count_today || 0,
      lastRun: d.last_run,
      status: d.status,
      interval: d.interval || 'hourly',
      createdAt: d.created_at
    }));
  } catch (error) {
    console.error("Error fetching all schedules:", error);
    return [];
  }
};

export const createSchedule = async (scheduleData) => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .insert({
        category: scheduleData.category,
        articles_per_day: scheduleData.articlesPerDay,
        days_remaining: scheduleData.daysRemaining,
        interval: scheduleData.interval || 'hourly',
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      _id: data.id,
      category: data.category,
      articlesPerDay: data.articles_per_day,
      daysRemaining: data.days_remaining,
      countToday: data.count_today || 0,
      lastRun: data.last_run,
      status: data.status,
      interval: data.interval || 'hourly',
      createdAt: data.created_at
    };
  } catch (error) {
    console.error("Error creating schedule:", error);
    throw error;
  }
};

export const deleteSchedule = async (id) => {
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting schedule:", error);
    throw error;
  }
};

export const updateSchedule = async (id, updates) => {
  try {
    const updateData = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.articlesPerDay !== undefined) updateData.articles_per_day = updates.articlesPerDay;
    if (updates.daysRemaining !== undefined) updateData.days_remaining = updates.daysRemaining;
    if (updates.interval !== undefined) updateData.interval = updates.interval;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      _id: data.id,
      category: data.category,
      articlesPerDay: data.articles_per_day,
      daysRemaining: data.days_remaining,
      countToday: data.count_today || 0,
      lastRun: data.last_run,
      status: data.status,
      interval: data.interval || 'hourly',
      createdAt: data.created_at
    };
  } catch (error) {
    console.error("Error updating schedule:", error);
    throw error;
  }
};

/**
 * Enhanced ingestion function using the new services
 */
export const runIngestion = async (schedule) => {
  console.log("[Ingestion] Starting ingestion for schedule:", schedule.category);
  
  try {
    // Get or create category
    const category = await databaseService.getOrCreateCategory(schedule.category, schedule.category);
    const categorySlug = category.slug;

    const categoryStr = schedule.category || 'general';
    const articlesPerDay = schedule.articles_per_day ?? schedule.articlesPerDay ?? 10;

    // Fetch articles from GNews API
    console.log("[Ingestion] Fetching articles from GNews API...");
    const gnewsData = await fetchTopHeadlines({
      category: categoryStr.toLowerCase(),
      max: Math.min(articlesPerDay, 20) // Limit to prevent API overuse
    });

    if (!gnewsData.articles || gnewsData.articles.length === 0) {
      console.log("[Ingestion] No articles found from GNews API");
      return { success: true, processedCount: 0, articles: [] };
    }

    // Filter duplicates
    console.log("[Ingestion] Filtering duplicates...");
    const uniqueArticles = await filterDuplicates(gnewsData.articles);

    if (uniqueArticles.length === 0) {
      console.log("[Ingestion] All articles were duplicates");
      return { success: true, processedCount: 0, articles: [] };
    }

    // Insert articles into database
    console.log("[Ingestion] Inserting articles into database...");
    const insertResults = await databaseService.insertArticles(uniqueArticles, categorySlug);

    console.log("[Ingestion] Ingestion completed:", {
      totalFetched: gnewsData.articles.length,
      uniqueArticles: uniqueArticles.length,
      inserted: insertResults.inserted,
      duplicates: insertResults.duplicates,
      errors: insertResults.errors.length
    });

    return {
      success: insertResults.success && insertResults.errors.length === 0,
      processedCount: insertResults.inserted,
      articles: insertResults.inserted > 0 ? uniqueArticles.slice(0, insertResults.inserted) : [],
      errors: insertResults.errors
    };

  } catch (error) {
    console.error("[Ingestion] Fatal error during ingestion:", error);
    return {
      success: false,
      processedCount: 0,
      error: error.message,
      articles: []
    };
  }
};

/**
 * Get ingestion statistics for monitoring
 */
export const getIngestionStats = async () => {
  try {
    const stats = await databaseService.getArticleStats();
    const recentArticles = await databaseService.getRecentArticles(5);
    
    return {
      articleStats: stats,
      recentArticles,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error getting ingestion stats:", error);
    return {
      articleStats: { total: 0, published: 0, draft: 0, byCategory: {}, recent: 0 },
      recentArticles: [],
      lastUpdated: new Date().toISOString(),
      error: error.message
    };
  }
};

/**
 * Reset daily counters for all schedules (should be called daily)
 */
export const resetDailyCounters = async () => {
  try {
    const { error } = await supabase
      .from('schedules')
      .update({ 
        count_today: 0,
        updated_at: new Date().toISOString()
      })
      .eq('status', 'active');

    if (error) throw error;
    
    console.log("[Schedule] Daily counters reset for all active schedules");
    return { success: true };
  } catch (error) {
    console.error("Error resetting daily counters:", error);
    return { success: false, error: error.message };
  }
};