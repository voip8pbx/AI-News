import React, { useState, useEffect } from 'react';
import { Zap, Activity, CheckCircle2, Cpu, Clock, AlertCircle } from 'lucide-react';
import { getCronJobStatus } from '../../cron/initCronJobs.js';

export default function IngestionStatus({ rules }) {
  const [cronStatus, setCronStatus] = useState([]);
  const [loadingCron, setLoadingCron] = useState(true);

  useEffect(() => {
    const fetchCronStatus = async () => {
      try {
        const status = getCronJobStatus();
        setCronStatus(status);
      } catch (error) {
        console.error('Failed to fetch cron status:', error);
      } finally {
        setLoadingCron(false);
      }
    };

    fetchCronStatus();
    // Update status every 30 seconds
    const interval = setInterval(fetchCronStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!rules || rules.length === 0) return null;

  return (
    <div className="p-8 bg-paper rounded-[2.5rem] border border-border shadow-sm transition-all duration-300 animate-in fade-in zoom-in-95">
      
      {/* Header: Refined & Modern */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-accent rounded-2xl text-white shadow-lg shadow-accent/20">
            <Zap size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black text-ink uppercase tracking-[0.2em]">
              Active Ingestion Pipeline
            </h2>
            <p className="text-xs text-muted mt-1">
              {cronStatus.length} cron jobs running
            </p>
          </div>
        </div>
        
        {/* Cron Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cronStatus.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-xs font-medium text-muted">
            {cronStatus.length > 0 ? 'Cron Active' : 'No Cron Jobs'}
          </span>
        </div>
      </div>

      {/* Grid: Tailux Soft Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {rules.map((rule, i) => {
          const pct = parseFloat(rule.percentage) || 0;
          const isComplete = pct >= 100;
          const cronJob = cronStatus.find(job => job.scheduleId === rule._id);
          const isCronRunning = cronJob?.isRunning || false;

          return (
            <div 
              key={i} 
              className="p-6 bg-surface border border-border rounded-4xl hover:shadow-xl hover:shadow-accent/5 transition-all duration-500 group relative overflow-hidden"
            >
              {/* Subtle background flair */}
              <div className={`absolute -right-4 -bottom-4 h-20 w-20 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${isComplete ? 'text-green-500' : 'text-accent'}`}>
                <Cpu size={80} />
              </div>

              {/* Top Status */}
              <div className="flex justify-between items-start mb-6">
                <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em] group-hover:text-accent transition-colors">
                  {rule.category}
                </span>
                <div className="flex items-center gap-2">
                  {isCronRunning && (
                    <div className="bg-blue-500/10 p-1 rounded-lg">
                      <Clock size={12} className="text-blue-500 animate-pulse" />
                    </div>
                  )}
                  {isComplete ? (
                    <div className="bg-green-500/10 p-1.5 rounded-lg">
                      <CheckCircle2 size={14} className="text-green-500" />
                    </div>
                  ) : (
                    <div className="bg-accent/10 p-1.5 rounded-lg animate-pulse">
                      <Activity size={14} className="text-accent" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Ring */}
              <div className="flex justify-center mb-6">
                <div className="relative w-20 h-20">
                  <svg className="transform -rotate-90 w-20 h-20">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-border"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - pct / 100)}`}
                      className={`transition-all duration-1000 ${isComplete ? 'text-green-500' : 'text-accent'}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-black ${isComplete ? 'text-green-500' : 'text-accent'}`}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted">Articles</span>
                  <span className="text-[10px] font-black text-ink">
                    {rule.countToday || 0} / {rule.articlesPerDay}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted">Days Left</span>
                  <span className="text-[10px] font-black text-ink">
                    {rule.daysRemaining === 9999 ? '∞' : rule.daysRemaining}
                  </span>
                </div>

                {cronJob && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted">Last Run</span>
                    <span className="text-[10px] font-black text-muted">
                      {cronJob.lastRun ? new Date(cronJob.lastRun).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className={`text-[9px] font-black uppercase tracking-[0.15em] text-center ${
                  isCronRunning ? 'text-blue-500' : isComplete ? 'text-green-500' : 'text-muted'
                }`}>
                  {isCronRunning ? 'SCHEDULED' : isComplete ? 'COMPLETED' : 'PENDING'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cron Job Summary */}
      {cronStatus.length > 0 && (
        <div className="mt-8 p-4 bg-surface rounded-2xl border border-border">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Cpu size={14} />
            <span>Cron Jobs Status: {cronStatus.filter(job => job.isRunning).length} running, {cronStatus.length - cronStatus.filter(job => job.isRunning).length} idle</span>
          </div>
        </div>
      )}

      {/* Warning if no cron jobs */}
      {rules.length > 0 && cronStatus.length === 0 && (
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
            <AlertCircle size={14} />
            <span>Cron jobs not initialized. Please restart the application to activate automated scheduling.</span>
          </div>
        </div>
      )}
    </div>
  );
}