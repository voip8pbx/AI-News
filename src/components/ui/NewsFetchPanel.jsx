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

  // Poll cron status
  const refresh = useCallback(() => {
    const status = getCronJobStatus();
    setJobs(status);
    setIsActive(cronService.isRunning);
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
        <div className="bg-paper border border-border rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Cron Status</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className={`text-sm font-black uppercase tracking-tight ${isActive ? 'text-emerald-600' : 'text-muted'}`}>
              {isActive ? 'Operational' : 'Idle'}
            </span>
          </div>
        </div>

        {/* Next run */}
        <div className="bg-paper border border-border rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Next Run In</p>
          <p className="font-mono text-sm font-black text-ink">
            {fmtCountdown(countdown)}
          </p>
        </div>

        {/* Last run stats */}
        <div className="bg-paper border border-border rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Latest Batch</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-black text-emerald-600">+{totalInserted}</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-tighter">Inserted</span>
          </div>
        </div>

        {/* Errors */}
        <div className={`rounded-3xl border p-5 shadow-sm ${
          errorCount > 0
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-paper border-border'
        }`}>
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Thread Health</p>
          <div className="flex items-center gap-2">
            {errorCount > 0
              ? <AlertCircle size={16} className="text-red-500" />
              : <CheckCircle size={16} className="text-emerald-500" />
            }
            <span className={`text-sm font-black uppercase tracking-tight ${errorCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {errorCount > 0 ? `${errorCount} Failed` : 'Perfect'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Manual Trigger ──────────────────────────────────────────── */}
      <div className="bg-paper border border-border rounded-4xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
        <div className="p-4 bg-accent/10 rounded-2xl text-accent shrink-0">
          <Database size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-[11px] font-black text-ink uppercase tracking-[0.2em] mb-1">On-Demand Ingestion</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-tight leading-relaxed">
            Force an immediate database refresh across all active silos. 
            {lastManual && <span className="ml-2 text-accent italic">Commited: {lastManual}</span>}
          </p>
        </div>
        <button
          onClick={handleRunNow}
          disabled={manualRunning}
          className="w-full md:w-auto flex items-center justify-center gap-3 bg-ink dark:bg-accent text-white font-black text-[10px] uppercase tracking-[0.3em] px-8 py-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-20 shadow-xl shadow-accent/10"
        >
          {manualRunning
            ? <RefreshCw size={14} className="animate-spin" />
            : <Zap size={14} className="fill-current" />
          }
          {manualRunning ? 'Executing…' : 'Run Cycle Now'}
        </button>
      </div>

      {/* ── Per-Category Table ──────────────────────────────────────── */}
      <div className="bg-paper border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-border bg-surface/30 flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-black text-ink uppercase tracking-[0.2em]">Live Ingestion Threads</h2>
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
                {['Silo', 'Status', 'Last Run', 'Yield', 'Runs'].map(h => (
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
                    <td colSpan={4} className="px-8 py-6 text-[10px] text-muted italic font-bold">Initializing...</td>
                  </tr>
                );

                const badge = statusBadge(job);
                return (
                  <tr key={cat.id} className="hover:bg-surface/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-ink uppercase text-[11px] tracking-tight">{cat.name}</span>
                        <span className="text-[8px] font-mono text-muted/50 uppercase">ID:{cat.id}</span>
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
                      {job.runCount}<span className="text-[8px] opacity-30 ml-0.5">X</span>
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
