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
    this._currentIntervalMs = 60 * 60 * 1000;

    // Per-category status map  { [uuid]: { lastRun, lastResult, runCount, isRunning } }
    this._jobStatus = {};
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Start the ingestion loop.
   * Dynamically loads interval from Supabase settings and checks if a run is due.
   */
  async initialize() {
    if (this._isInitialized) {
      console.log('[CronService] Already initialized – skipping.');
      return;
    }

    try {
      // 1. Fetch latest interval from database
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('cron_schedule')
        .eq('id', 'model_config')
        .single();

      if (settingsError) throw settingsError;

      let minutes = 60;
      if (settings?.cron_schedule) {
        if (settings.cron_schedule.includes('*/')) {
          minutes = parseInt(settings.cron_schedule.split('*/')[1]) || 60;
        } else if (!isNaN(settings.cron_schedule)) {
          minutes = parseInt(settings.cron_schedule);
        }
      }

      this._currentIntervalMs = minutes * 60 * 1000;

      // 2. Refresh Job Status from DB
      const activeSchedules = await this._syncJobsWithDatabase();

      // 3. Check if any run is due (compare current time vs most recent last_run in DB)
      const { data: recentRuns } = await supabase
        .from('schedules')
        .select('last_run')
        .not('last_run', 'is', null)
        .order('last_run', { ascending: false })
        .limit(1);

      const lastRunStr = recentRuns?.[0]?.last_run;
      const lastRunTime = lastRunStr ? new Date(lastRunStr).getTime() : 0;
      const now = Date.now();
      
      const isDue = (now - lastRunTime) >= this._currentIntervalMs;

      console.log(`[CronService] ▶ Ingestion Engine: every ${minutes} min. Status: ${isDue ? 'DUE' : 'OK'}`);

      if (isDue) {
        console.log('[CronService] Triggering startup run...');
        this._runAll();
      } else {
        const nextIn = Math.round((this._currentIntervalMs - (now - lastRunTime)) / 60000);
        console.log(`[CronService] Last run was ${Math.round((now - lastRunTime) / 60000)} min ago. Next run in ~${nextIn} min.`);
      }

      // 4. Set interval
      if (this._intervalId) clearInterval(this._intervalId);
      this._intervalId = setInterval(() => {
        this._runAll();
      }, this._currentIntervalMs);

      this._isInitialized = true;

    } catch (err) {
      console.error('[CronService] Error initializing:', err.message);
      this._currentIntervalMs = 60 * 60 * 1000;
      if (!this._intervalId) {
        this._intervalId = setInterval(() => this._runAll(), this._currentIntervalMs);
      }
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

  /** Manually trigger ingestion for a single category right now. */
  async runCategory(identifier) {
    await this._syncJobsWithDatabase();
    
    // Find by ID, slug or name
    let status = this._jobStatus[identifier];
    if (!status) {
      status = Object.values(this._jobStatus).find(s => s.slug === identifier || s.category === identifier);
    }

    if (!status) {
      console.warn(`[CronService] Unknown task: ${identifier}`);
      return { success: false, error: 'Task not found' };
    }

    const mapping = INGEST_CATEGORIES.find(c => c.name.toLowerCase() === status.category.toLowerCase()) || 
                   { gnewsCategory: status.category.toLowerCase() };

    return this._runSingleJob(status.scheduleId, status.category, mapping.gnewsCategory);
  }

  /** Manually trigger ingestion for ALL categories right now. */
  async runAll() {
    return this._runAll();
  }

  /**
   * Returns live status for every category.
   * Uses valid Supabase IDs as scheduleId for matching in Admin UI.
   */
  getJobStatus() {
    return Object.values(this._jobStatus).map(s => ({
      jobId:      `auto-${s.scheduleId.slice(0, 8)}`,
      scheduleId: s.scheduleId,
      category:   s.category,
      intervalMs: this._currentIntervalMs || 3600000,
      lastRun:    s.lastRun,
      runCount:   s.runCount,
      isRunning:  s.isRunning,
      slug:       s.slug,
      lastResult: s.lastResult,
    }));
  }

  /** Returns whether the service is active */
  get isRunning() { return this._isInitialized; }

  // ── Legacy stubs (InjectionSchedule.jsx compatibility) ──────────
  async addSchedule(_s)    { await this._syncJobsWithDatabase(); }
  removeSchedule(_id)      { delete this._jobStatus[_id]; return true; }
  async updateSchedule(_s) { await this._syncJobsWithDatabase(); }

  // ── Private ─────────────────────────────────────────────────────────────────

  /** Refresh Active Schedules from DB */
  async _syncJobsWithDatabase() {
    try {
      const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .eq('status', 'active');

      if (!schedules) return [];

      const freshStatus = {};
      schedules.forEach(s => {
        freshStatus[s.id] = {
          category:   s.category,
          slug:       s.category.toLowerCase().replace(/\s+/g, '-'),
          scheduleId: s.id,
          lastRun:    s.last_run,
          lastResult: this._jobStatus[s.id]?.lastResult || null,
          runCount:   s.count_today || 0,
          isRunning:  this._jobStatus[s.id]?.isRunning || false,
        };
      });

      this._jobStatus = freshStatus;
      return schedules;
    } catch (err) {
      console.error('[CronService] Sync failed:', err.message);
      return [];
    }
  }

  /** Execute ingestion for every active category sequentially */
  async _runAll() {
    if (this._isRunning && this._activePromise) {
      console.log('[CronService] Ingestion already in progress.');
      return this._activePromise;
    }

    this._isRunning = true;
    console.log(`[CronService] ═══ Starting Ingestion Cycle @ ${new Date().toLocaleTimeString()} ═══`);

    this._activePromise = (async () => {
      try {
        const activeSchedules = await this._syncJobsWithDatabase();
        if (activeSchedules.length === 0) {
          console.log('[CronService] No active schedules to run.');
          return;
        }

        for (const s of activeSchedules) {
          const mapping = INGEST_CATEGORIES.find(c => c.name.toLowerCase() === s.category.toLowerCase()) || 
                          { gnewsCategory: s.category.toLowerCase() };

          await this._runSingleJob(s.id, s.category, mapping.gnewsCategory, s.articles_per_day);
          await new Promise(r => setTimeout(r, 1500)); // Cool-down
        }
      } catch (err) {
        console.error('[CronService] Global run error:', err.message);
      } finally {
        console.log('[CronService] ═══ Ingestion Cycle complete ═══');
        this._isRunning = false;
        this._activePromise = null;
      }
    })();

    return this._activePromise;
  }

  /** Execute ingestion for one job and update status */
  async _runSingleJob(id, categoryName, gnewsCat, limit = 10) {
    const status = this._jobStatus[id] || { isRunning: false };
    status.isRunning = true;

    try {
      console.log(`[CronService] Processing "${categoryName}" (limit: ${limit})...`);
      const result = await ingestCategoryNews(categoryName, gnewsCat, limit);

      status.lastRun    = new Date().toISOString();
      status.lastResult = result;
      status.runCount  += (result.inserted || 0);
      status.isRunning  = false;

      console.log(`[CronService] "${categoryName}" done: ${result.inserted} added.`);
      return result;
    } catch (err) {
      status.lastRun    = new Date().toISOString();
      status.lastResult = { success: false, error: err.message };
      status.isRunning  = false;
      console.error(`[CronService] "${categoryName}" failed:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

// ── Singleton export ───────────────────────────────────────────────────────────
export const cronService = new CronService();
export default cronService;
