/**
 * cronService.js
 *
 * Automatic News Ingestion Cron Service
 * ─────────────────────────────────────
 * Runs every 1 hour (configurable via INTERVAL_MS).
 * For each category in INGEST_CATEGORIES, it:
 *   1. Fetches fresh articles from the GNews API
 *   2. Filters out duplicates already in Supabase
 *   3. Inserts the new articles into the database
 *
 * NO AI image generation. NO OpenRouter calls. Pure API → DB pipeline.
 *
 * The old Supabase-schedules-driven logic is preserved as comments below
 * for easy re-activation.
 */

import { supabase } from '../supabase';
import { ingestAllCategories, ingestCategoryNews, INGEST_CATEGORIES } from './newsIngestionService.js';

// ── Config ────────────────────────────────────────────────────────────────────
const INTERVAL_MS   = 60 * 60 * 1000;  // 1 hour  (change here to adjust globally)
const MAX_PER_CAT   = 10;              // Articles to fetch per category per run

// ── Singleton State ───────────────────────────────────────────────────────────
class CronService {
  constructor() {
    this._intervalId   = null;
    this._isRunning    = false;
    this._isInitialized = false;
    this._activePromise = null;

    // Per-category status map  { [slug]: { lastRun, lastResult, runCount, isRunning } }
    this._jobStatus = {};

    // Initialise blank status entries for every category
    INGEST_CATEGORIES.forEach(cat => {
      this._jobStatus[cat.id] = {
        category:   cat.name,
        slug:       cat.id,
        lastRun:    null,
        lastResult: null,
        runCount:   0,
        isRunning:  false,
      };
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Start the ingestion loop.
   * Dynamically loads interval from Supabase settings.
   */
  async initialize() {
    if (this._isInitialized) {
      console.log('[CronService] Already initialized – skipping.');
      return;
    }

    try {
      // 1. Fetch latest interval from database
      const { data: settings, error } = await supabase
        .from('settings')
        .select('cron_schedule')
        .eq('id', 'model_config')
        .single();

      if (error) throw error;

      // 2. Parse interval (fallback to 60 min if missing or invalid)
      // Expects format: "*/30 * * * *" or just a number of minutes
      let minutes = 60;
      if (settings?.cron_schedule) {
        if (settings.cron_schedule.includes('*/')) {
          minutes = parseInt(settings.cron_schedule.split('*/')[1]) || 60;
        } else if (!isNaN(settings.cron_schedule)) {
          minutes = parseInt(settings.cron_schedule);
        }
      }

      this._currentIntervalMs = minutes * 60 * 1000;
      console.log(`[CronService] ▶ Starting automatic ingestion: every ${minutes} min`);

      // 3. Initial run
      this._runAll();

      // 4. Set interval
      this._intervalId = setInterval(() => {
        this._runAll();
      }, this._currentIntervalMs);

      this._isInitialized = true;

    } catch (err) {
      console.error('[CronService] Failed to load settings, falling back to 1h:', err.message);
      this._currentIntervalMs = 60 * 60 * 1000;
      this._intervalId = setInterval(() => this._runAll(), this._currentIntervalMs);
      this._isInitialized = true;
    }
  }

  /** Restart the service with new settings */
  async reInitialize() {
    console.log('[CronService] ⟳ Restarting service with new settings...');
    this.shutdown();
    await this.initialize();
  }

  /** Stop the interval (for graceful shutdown or testing). */
  shutdown() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId   = null;
      this._isInitialized = false;
      console.log('[CronService] ■ Cron stopped.');
    }
  }

  /**
   * Manually trigger ingestion for a single category right now.
   * Returns the result object from newsIngestionService.
   */
  async runCategory(categorySlug) {
    const cat = INGEST_CATEGORIES.find(c => c.id === categorySlug);
    if (!cat) {
      console.warn(`[CronService] Unknown category: ${categorySlug}`);
      return { success: false, error: 'Unknown category' };
    }
    return this._runSingleCategory(cat);
  }

  /**
   * Manually trigger ingestion for ALL categories right now.
   */
  async runAll() {
    return this._runAll();
  }

  /**
   * Returns live status for every category.
   * Shape matches what InjestionStatus.jsx / InjectionSchedule.jsx expect.
   */
  getJobStatus() {
    return Object.values(this._jobStatus).map(s => ({
      // Legacy fields used by the admin components
      jobId:      `auto-${s.slug}`,
      scheduleId: s.slug,
      category:   s.category,
      intervalMs: this._currentIntervalMs || 3600000,
      lastRun:    s.lastRun,
      runCount:   s.runCount,
      isRunning:  s.isRunning,
      // Extra fields for the new status panel
      slug:       s.slug,
      lastResult: s.lastResult,
    }));
  }

  /** Returns whether the service is active */
  get isRunning() { return this._isInitialized; }

  // ── Legacy stubs (used by InjectionSchedule.jsx / initCronJobs.js) ──────────
  // These are kept so the existing admin UI continues to compile without changes.

  async addSchedule(_schedule)    { /* no-op – categories are fixed */ }
  removeSchedule(_scheduleId)     { /* no-op */ return false; }
  async updateSchedule(_schedule) { /* no-op */ }

  // ── Private ─────────────────────────────────────────────────────────────────

  /** Execute ingestion for every category sequentially */
  async _runAll() {
    if (this._isRunning && this._activePromise) {
      console.log('[CronService] Previous run still in progress – joining existing promise.');
      return this._activePromise;
    }

    this._isRunning = true;
    console.log(`[CronService] ═══ Hourly Run @ ${new Date().toISOString()} ═══`);

    this._activePromise = (async () => {
      try {
        for (const cat of INGEST_CATEGORIES) {
          // Respect specific limits: Startup (8), Finance (7), Default (10)
          let limit = MAX_PER_CAT;
          if (cat.id === 'startup') limit = 8;
          if (cat.id === 'finance') limit = 7;

          await this._runSingleCategory(cat, limit);
          // Small pause between categories to avoid API rate-limiting
          await new Promise(r => setTimeout(r, 1200));
        }
      } finally {
        console.log('[CronService] ═══ Run complete ═══');
        this._isRunning = false;
        this._activePromise = null;
      }
    })();

    return this._activePromise;
  }

  /** Execute ingestion for one category and update internal status */
  async _runSingleCategory(cat, limit = MAX_PER_CAT) {
    const status = this._jobStatus[cat.id];
    status.isRunning = true;

    try {
      console.log(`[CronService] Ingesting "${cat.name}" (limit: ${limit})…`);
      const result = await ingestCategoryNews(cat.id, cat.gnewsCategory, limit);

      status.lastRun    = new Date().toISOString();
      status.lastResult = result;
      status.runCount  += 1;
      status.isRunning  = false;

      console.log(`[CronService] "${cat.name}" done — inserted: ${result.inserted}, skipped: ${result.skipped}`);
      return result;
    } catch (err) {
      status.lastRun    = new Date().toISOString();
      status.lastResult = { success: false, error: err.message };
      status.runCount  += 1;
      status.isRunning  = false;

      console.error(`[CronService] "${cat.name}" failed:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

// ── Singleton export ───────────────────────────────────────────────────────────
export const cronService = new CronService();
export default cronService;
