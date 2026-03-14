/**
 * NewsFetchPanel.jsx  (now a Cron Status Monitor)
 *
 * Displays the live status of the automatic news ingestion cron service.
 * Refactored to be embeddable within the Admin Dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { getCronJobStatus } from '../../cron/initCronJobs.js';
import cronService from '../../services/cronService.js';
import { INGEST_CATEGORIES } from '../../services/newsIngestionService.js';
import {
  Activity, CheckCircle, XCircle, Clock, RefreshCw,
  Zap, Database, Timer, AlertCircle
} from 'lucide-react';

import { imagePipeline } from '../../services/imagePipeline.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString() : 'Never';

const statusBadge = (job) => {
  if (job.isRunning)
    return { label: 'Running',   cls: 'bg-blue-100 text-blue-700 border-blue-200',    Icon: Activity   };
  if (!job.lastRun)
    return { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 border-amber-200', Icon: Timer      };
  if (job.lastResult?.success === false)
    return { label: 'Error',     cls: 'bg-red-100 text-red-700 border-red-200',       Icon: XCircle    };
  return   { label: 'OK',        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle };
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewsFetchPanel() {
  const [jobs,        setJobs]        = useState([]);
  const [isActive,    setIsActive]    = useState(false);
  const [manualRunning, setManualRunning] = useState(false);
  const [lastManual,  setLastManual]  = useState(null);
  const [countdown,   setCountdown]   = useState(null);
  const [intervalMs,  setIntervalMs]  = useState(3600000);

  // Pipeline Stats
  const [pipeStats, setPipeStats] = useState(imagePipeline.stats);
  const [pipeActive, setPipeActive] = useState(imagePipeline.activeJobs);

  // Poll cron status
  const refresh = useCallback(() => {
    const status = getCronJobStatus();
    setJobs(status);
    setIsActive(cronService.isRunning);
    
    // Update Pipeline Stats
    setPipeStats(imagePipeline.stats);
    setPipeActive(imagePipeline.activeJobs);

    // Use the interval from the first job if available
    if (status?.[0]?.intervalMs) setIntervalMs(status[0].intervalMs);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const latestRun = jobs.reduce((acc, j) => {
        const t = j.lastRun ? new Date(j.lastRun).getTime() : 0;
        return t > acc ? t : acc;
      }, 0);
      if (!latestRun) { setCountdown(null); return; }
      const next = latestRun + intervalMs;
      const diff = next - Date.now();
      setCountdown(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [jobs, intervalMs]);

  const fmtCountdown = (ms) => {
    if (ms === null) return '—';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleRunNow = async () => {
    setManualRunning(true);
    try {
      await cronService.runAll();
      setLastManual(new Date().toLocaleTimeString());
      refresh();
    } catch (err) {
      console.error('[CronPanel] Manual run failed:', err);
    } finally {
      setManualRunning(false);
    }
  };

  const totalInserted = jobs.reduce((a, j) => a + (j.lastResult?.inserted || 0), 0);
  const totalSkipped  = jobs.reduce((a, j) => a + (j.lastResult?.skipped  || 0), 0);
  const errorCount    = jobs.filter(j  => j.lastResult?.success === false).length;

  return (
    <div className="space-y-8">
      {/* ── Status Bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cron alive */}
        <div className="bg-paper border border-border rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Ingestion Cluster</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className={`text-sm font-black uppercase tracking-tight ${isActive ? 'text-blue-600' : 'text-muted'}`}>
              {isActive ? 'Autonomous' : 'Idle'}
            </span>
          </div>
        </div>

        {/* AI Pipeline Status */}
        <div className="bg-paper border border-border rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">AI Image Engine</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${pipeActive > 0 ? 'bg-accent animate-spin' : 'bg-emerald-500'}`} />
            <span className={`text-sm font-black uppercase tracking-tight ${pipeActive > 0 ? 'text-accent' : 'text-emerald-600'}`}>
              {pipeActive > 0 ? `Workers: ${pipeActive}` : 'Ready'}
            </span>
          </div>
        </div>

        {/* Last run stats */}
        <div className="bg-paper border border-border rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Yield Metrics</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-black text-emerald-600">+{totalInserted}</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-tighter">Inserted</span>
          </div>
        </div>

        {/* Pipeline Failures */}
        <div className={`rounded-3xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
          pipeStats.failed > 0
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-paper border-border'
        }`}>
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Process Health</p>
          <div className="flex items-center gap-2">
            {pipeStats.failed > 0
              ? <AlertCircle size={16} className="text-red-500" />
              : <CheckCircle size={16} className="text-emerald-500" />
            }
            <span className={`text-sm font-black uppercase tracking-tight ${pipeStats.failed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {pipeStats.failed > 0 ? `${pipeStats.failed} Failed` : 'Stable'}
            </span>
          </div>
        </div>
      </div>

      {/* ── AI Pipeline Stats Overview ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: AI Generation Stats */}
        <div className="bg-paper border border-border rounded-4xl p-8 shadow-sm flex flex-col justify-between">
           <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-xl text-accent">
                    <Zap size={20} className="fill-current" />
                </div>
                <div>
                   <h2 className="text-[11px] font-black text-ink uppercase tracking-[0.2em]">Image Pipeline Pulse</h2>
                   <p className="text-[10px] text-muted font-bold uppercase tracking-tight">Real-time AI Generation Monitoring</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                 <div>
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Processed</p>
                    <p className="text-2xl font-black text-ink tracking-tighter">{pipeStats.processed}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Queue</p>
                    <p className="text-2xl font-black text-accent tracking-tighter">{pipeStats.queued}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Cached</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">{pipeStats.cached}</p>
                 </div>
              </div>
           </div>

           <div className="pt-6 border-t border-border/50 flex items-center justify-between">
              <div className="flex -space-x-2">
                 {[...Array(10)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-full border-2 border-paper transition-all duration-500 ${
                        i < pipeActive ? 'bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)] scale-110' : 'bg-border/20'
                      }`} 
                    />
                 ))}
              </div>
              <span className="text-[9px] font-black text-muted uppercase tracking-widest">
                 Worker Load: {Math.round((pipeActive / 10) * 100)}%
              </span>
           </div>
        </div>

        {/* Right: Manual Trigger */}
        <div className="bg-paper border border-border rounded-4xl p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-ink/10 dark:bg-accent/10 rounded-xl text-ink dark:text-accent">
                    <Database size={20} />
                </div>
                <div>
                   <h2 className="text-[11px] font-black text-ink uppercase tracking-[0.2em]">Universal Refresh</h2>
                   <p className="text-[10px] text-muted font-bold uppercase tracking-tight">Force News Ingestion & Queue Jobs</p>
                </div>
              </div>
            
            <p className="text-[10px] text-muted font-bold uppercase tracking-tight leading-relaxed mb-8">
              Execute a full extraction cycle across all news silos. 
              Subsequent AI image generation jobs will be automatically queued and dispersed to the worker pool.
              {lastManual && <span className="block mt-2 text-accent italic">Status Refreshed: {lastManual}</span>}
            </p>
          </div>

          <button
            onClick={handleRunNow}
            disabled={manualRunning}
            className="relative z-10 w-full flex items-center justify-center gap-3 bg-ink dark:bg-accent text-white font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-2xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-20 shadow-xl shadow-accent/10"
          >
            {manualRunning
              ? <RefreshCw size={14} className="animate-spin" />
              : <RefreshCw size={14} />
            }
            {manualRunning ? 'Synchronizing Cluster…' : 'Initialize Global Sync'}
          </button>
        </div>
      </div>

      {/* ── Per-Category Table ──────────────────────────────────────── */}
      <div className="bg-paper border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-border bg-surface/30 flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-black text-ink uppercase tracking-[0.2em]">Ingestion Threads</h2>
            <p className="text-[10px] text-muted font-bold uppercase tracking-tight mt-1">
              Active Monitoring for {INGEST_CATEGORIES.length} Categories
            </p>
          </div>
          <button onClick={refresh} className="p-3 text-muted hover:text-accent transition-all active:scale-90 bg-surface rounded-xl border border-border">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface/50 border-b border-border">
                {['Silo', 'Status', 'Last Run', 'Yield', 'Next Sync'].map(h => (
                  <th key={h} className="px-8 py-4 text-[9px] font-black text-muted uppercase tracking-[0.2em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {INGEST_CATEGORIES.map(cat => {
                const job = jobs.find(j => j.slug === cat.id);
                if (!job) return (
                  <tr key={cat.id}>
                    <td className="px-8 py-6 font-black text-[11px] text-ink uppercase tracking-tight">{cat.name}</td>
                    <td colSpan={4} className="px-8 py-6 text-[10px] text-muted italic font-bold">Initializing Cluster...</td>
                  </tr>
                );

                const badge = statusBadge(job);
                return (
                  <tr key={cat.id} className="hover:bg-surface/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-ink uppercase text-[11px] tracking-tight">{cat.name}</span>
                        <span className="text-[8px] font-mono text-muted/50 uppercase">SLOT:{cat.id}</span>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${badge.cls}`}>
                        <badge.Icon size={12} className={job.isRunning ? 'animate-spin' : ''} />
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-8 py-6 text-muted font-mono text-[10px] font-bold">
                      {fmtDate(job.lastRun)}
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-600 text-sm">
                          +{job.lastResult?.inserted ?? 0}
                        </span>
                        <span className="text-[8px] text-muted/30 font-bold uppercase">/{job.lastResult?.skipped ?? 0}</span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-muted font-mono text-[10px] font-bold">
                       {fmtCountdown(countdown)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
