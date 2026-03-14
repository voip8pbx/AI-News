// Removed node-cron as it is not compatible with browser environments
// import cron from 'node-cron';
import { supabase } from '../supabase';
import { runIngestion } from '../api/schedule';

class CronService {
  constructor() {
    this.jobs = new Map(); // Store active cron jobs
    this.isInitialized = false;
  }

  /**
   * Initialize the cron service and start all scheduled jobs
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[CronService] Already initialized');
      return;
    }

    console.log('[CronService] Initializing cron service...');
    
    try {
      // Load active schedules from database
      const { data: schedules, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('[CronService] Failed to load schedules:', error);
        return;
      }

      if (!schedules || schedules.length === 0) {
        console.log('[CronService] No active schedules found in database');
      }

      console.log(`[CronService] Found ${schedules.length} active schedules`);

      // Start cron job for each active schedule
      for (const schedule of schedules) {
        await this.startScheduleJob(schedule);
      }

      this.isInitialized = true;
      console.log('[CronService] Initialization complete');
    } catch (error) {
      console.error('[CronService] Initialization failed:', error);
    }
  }

  /**
   * Start a cron job for a specific schedule
   */
  async startScheduleJob(schedule) {
    try {
      const jobId = `schedule-${schedule.id}`;
      
      // Stop existing job if it exists
      if (this.jobs.has(jobId)) {
        this.stopJob(jobId);
      }

      // Create cron expression based on schedule frequency
      const intervalMs = this.getIntervalMs(schedule);
      const category = schedule.category || 'general';
      
      console.log(`[CronService] Starting interval job for schedule ${schedule.id} (${category}): every ${intervalMs}ms`);
      
      // Execute once immediately
      this.executeScheduledIngestion(schedule);

      // Use setInterval instead of node-cron for browser compatibility
      const interval = setInterval(async () => {
        await this.executeScheduledIngestion(schedule);
      }, intervalMs);

      // Store the job reference
      this.jobs.set(jobId, {
        interval,
        schedule,
        intervalMs,
        lastRun: null,
        runCount: 0
      });

      console.log(`[CronService] Successfully started job: ${jobId}`);
    } catch (error) {
      console.error(`[CronService] Failed to start job for schedule ${schedule.id}:`, error);
    }
  }

  /**
   * Get interval in milliseconds based on schedule configuration
   */
  getIntervalMs(schedule) {
    // Default to every hour if not specified
    const interval = schedule.interval || 'hourly';
    
    switch (interval) {
      case 'hourly':
        return 3600000; // 1 hour
      case 'daily':
        return 86400000; // 24 hours
      case 'every6hours':
        return 21600000;
      case 'every12hours':
        return 43200000;
      case 'every30minutes':
        return 1800000;
      default:
        return 3600000; // Default to hourly
    }
  }

  /**
   * Execute the scheduled ingestion for a schedule
   */
  async executeScheduledIngestion(schedule) {
    const jobId = `schedule-${schedule.id}`;
    const jobInfo = this.jobs.get(jobId);
    
    if (!jobInfo) {
      console.error(`[CronService] Job not found for schedule ${schedule.id}`);
      return;
    }

    const startTime = Date.now();
    console.log(`[CronService] Executing ingestion for schedule ${schedule.id} (${schedule.category})`);

    try {
      const daysRemaining = schedule.days_remaining ?? schedule.daysRemaining;
      const countToday = schedule.count_today ?? schedule.countToday;
      const articlesPerDay = schedule.articles_per_day ?? schedule.articlesPerDay;

      // Check if we should run today (for daily limits)
      if (daysRemaining !== 9999 && countToday >= articlesPerDay) {
        console.log(`[CronService] Daily limit reached for schedule ${schedule.id}, skipping`);
        return;
      }

      // Run the ingestion process
      const result = await runIngestion(schedule);
      
      // Update job statistics
      jobInfo.lastRun = new Date();
      jobInfo.runCount += 1;

      console.log(`[CronService] Ingestion completed for schedule ${schedule.id}:`, {
        success: result.success,
        processedCount: result.processedCount,
        duration: `${Date.now() - startTime}ms`
      });

      // Update schedule in database
      await this.updateScheduleStats(schedule.id, result);

    } catch (error) {
      console.error(`[CronService] Ingestion failed for schedule ${schedule.id}:`, error);
      
      // Update job statistics even on failure
      jobInfo.lastRun = new Date();
      jobInfo.runCount += 1;
    }
  }

  /**
   * Update schedule statistics in database
   */
  async updateScheduleStats(scheduleId, result) {
    try {
      const updateData = {
        last_run: new Date().toISOString()
      };

      if (result.success && result.processedCount > 0) {
        // Get current schedule to update count
        const { data: currentSchedule } = await supabase
          .from('schedules')
          .select('count_today, days_remaining')
          .eq('id', scheduleId)
          .single();

        if (currentSchedule) {
          updateData.count_today = (currentSchedule.count_today || 0) + result.processedCount;
          
          // Update days remaining if not infinite
          if (currentSchedule.days_remaining !== 9999) {
            updateData.days_remaining = Math.max(0, currentSchedule.days_remaining - 1);
          }
        }
      }

      const { error } = await supabase
        .from('schedules')
        .update(updateData)
        .eq('id', scheduleId);

      if (error) {
        console.error('[CronService] Failed to update schedule stats:', error);
      }
    } catch (error) {
      console.error('[CronService] Error updating schedule stats:', error);
    }
  }

  /**
   * Stop a specific cron job
   */
  stopJob(jobId) {
    const jobInfo = this.jobs.get(jobId);
    if (jobInfo) {
      clearInterval(jobInfo.interval);
      this.jobs.delete(jobId);
      console.log(`[CronService] Stopped interval: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Start a job for a new schedule
   */
  async addSchedule(schedule) {
    if (schedule.status === 'active') {
      await this.startScheduleJob(schedule);
    }
  }

  /**
   * Remove a job when schedule is deleted or deactivated
   */
  removeSchedule(scheduleId) {
    const jobId = `schedule-${scheduleId}`;
    return this.stopJob(jobId);
  }

  /**
   * Update a schedule job (restart with new configuration)
   */
  async updateSchedule(schedule) {
    const jobId = `schedule-${schedule.id}`;
    
    // Stop existing job
    this.stopJob(jobId);
    
    // Start new job if schedule is active
    if (schedule.status === 'active') {
      await this.startScheduleJob(schedule);
    }
  }

  /**
   * Get status of all cron jobs
   */
  getJobStatus() {
    const status = [];
    
    for (const [jobId, jobInfo] of this.jobs.entries()) {
      status.push({
        jobId,
        scheduleId: jobInfo.schedule.id,
        category: jobInfo.schedule.category,
        intervalMs: jobInfo.intervalMs,
        lastRun: jobInfo.lastRun,
        runCount: jobInfo.runCount,
        isRunning: true // setInterval jobs are always running if they exist in the map
      });
    }
    
    return status;
  }

  /**
   * Stop all cron jobs
   */
  shutdown() {
    console.log('[CronService] Shutting down cron service...');
    
    for (const [jobId, jobInfo] of this.jobs.entries()) {
      clearInterval(jobInfo.interval);
      console.log(`[CronService] Stopped interval: ${jobId}`);
    }
    
    this.jobs.clear();
    this.isInitialized = false;
    console.log('[CronService] Shutdown complete');
  }
}

// Create singleton instance
export const cronService = new CronService();

export default cronService;
