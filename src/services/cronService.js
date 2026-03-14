import cron from 'node-cron';
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
      const cronExpression = this.generateCronExpression(schedule);
      
      console.log(`[CronService] Starting cron job for schedule ${schedule.id} (${schedule.category}): ${cronExpression}`);

      // Create and start the cron job
      const job = cron.schedule(cronExpression, async () => {
        await this.executeScheduledIngestion(schedule);
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      // Start the job
      job.start();
      
      // Store the job reference
      this.jobs.set(jobId, {
        job,
        schedule,
        cronExpression,
        lastRun: null,
        runCount: 0
      });

      console.log(`[CronService] Successfully started job: ${jobId}`);
    } catch (error) {
      console.error(`[CronService] Failed to start job for schedule ${schedule.id}:`, error);
    }
  }

  /**
   * Generate cron expression based on schedule configuration
   */
  generateCronExpression(schedule) {
    // Default to every hour if not specified
    const interval = schedule.interval || 'hourly';
    
    switch (interval) {
      case 'hourly':
        return '0 * * * *'; // Every hour at minute 0
      case 'daily':
        return '0 0 * * *'; // Every day at midnight
      case 'every6hours':
        return '0 */6 * * *'; // Every 6 hours
      case 'every12hours':
        return '0 */12 * * *'; // Every 12 hours
      case 'every30minutes':
        return '*/30 * * * *'; // Every 30 minutes
      default:
        return '0 * * * *'; // Default to hourly
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
      // Check if we should run today (for daily limits)
      if (schedule.daysRemaining !== 9999 && schedule.countToday >= schedule.articlesPerDay) {
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
      jobInfo.job.stop();
      this.jobs.delete(jobId);
      console.log(`[CronService] Stopped job: ${jobId}`);
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
        cronExpression: jobInfo.cronExpression,
        lastRun: jobInfo.lastRun,
        runCount: jobInfo.runCount,
        isRunning: jobInfo.job.running
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
      jobInfo.job.stop();
      console.log(`[CronService] Stopped job: ${jobId}`);
    }
    
    this.jobs.clear();
    this.isInitialized = false;
    console.log('[CronService] Shutdown complete');
  }
}

// Create singleton instance
export const cronService = new CronService();

export default cronService;
