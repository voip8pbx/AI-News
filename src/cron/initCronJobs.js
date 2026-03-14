/**
 * initCronJobs.js
 *
 * Entry-point for the automatic hourly news ingestion cron service.
 * Call startCronJobs() once during app startup (App.jsx).
 *
 * Public API is unchanged so InjectionSchedule.jsx and InjestionStatus.jsx
 * continue to work without modification.
 */

import cronService from '../services/cronService.js';
import { imagePipeline } from '../services/imagePipeline.js';

/** Start the automatic hourly ingestion loop & AI pipeline */
export const startCronJobs = async () => {
  try {
    console.log('[CronInit] Starting autonomous background clusters…');
    
    // 1. Start news fetching loop
    await cronService.initialize();

    // 2. Start parallel AI image pipeline
    imagePipeline.start();

    console.log('[CronInit] ✓ Background services operational.');
  } catch (error) {
    console.error('[CronInit] Failed to start cron:', error);
  }
};

/** Stop all cron jobs (graceful shutdown) */
export const stopCronJobs = () => {
  try {
    cronService.shutdown();
    console.log('[CronInit] Cron stopped.');
  } catch (error) {
    console.error('[CronInit] Error stopping cron:', error);
  }
};

/** Returns live status for every category job – used by InjestionStatus.jsx */
export const getCronJobStatus = () => cronService.getJobStatus();

/** Legacy stubs – kept so InjectionSchedule.jsx compiles unchanged */
export const addScheduleToCron      = async (schedule) => { /* no-op */ };
export const removeScheduleFromCron = (scheduleId)     => { /* no-op */ return false; };
export const updateScheduleInCron   = async (schedule) => { /* no-op */ };

// Graceful shutdown on process signals (Node / Electron environments)
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('SIGTERM', () => { stopCronJobs(); });
  process.on('SIGINT',  () => { stopCronJobs(); });
}

export default {
  startCronJobs,
  stopCronJobs,
  getCronJobStatus,
  addScheduleToCron,
  removeScheduleFromCron,
  updateScheduleInCron,
};
