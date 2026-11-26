'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import type { DailySummary, FoodLog } from '../../../lib/types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [logs, setLogs] = useState<FoodLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, d] = await Promise.all([
        api.get<DailySummary>('/api/calories/summary'),
        api.get<{ logs: FoodLog[] }>('/api/food/daily'),
      ]);
      setSummary(s);
      setLogs(d.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteLog(id: string) {
    if (deletingId) return; // already deleting something — ignore
    if (!confirm('Delete this food entry?')) return;
    setDeletingId(id);
    // Optimistic: drop the row immediately so the UI feels snappy even on cold starts.
    const before = logs;
    setLogs((prev) => (prev ? prev.filter((l) => l._id !== id) : prev));
    try {
      await api.del(`/api/food/${id}`);
      await load();
    } catch (err) {
      // Roll back the optimistic removal only if it was a real error (not "already deleted").
      const message = err instanceof Error ? err.message : 'Delete failed';
      if (!/not found/i.test(message)) {
        setLogs(before);
        alert(message);
      } else {
        // Already gone server-side — just refresh totals.
        await load();
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!summary || !logs) return <div className="text-sm text-neutral-500">Loading…</div>;

  const pct = summary.percentOfTarget ?? 0;
  const consumed = summary.consumedCalories;
  const target = summary.calorieTarget ?? 0;
  const remaining = summary.remainingCalories ?? 0;

  const mealTint: Record<string, string> = {
    breakfast: 'bg-amber-50 text-amber-700',
    lunch: 'bg-sky-50 text-sky-700',
    snacks: 'bg-violet-50 text-violet-700',
    dinner: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {summary.date} · {summary.timezone}
          </p>
        </div>
        <Link href="/food-tracker" className="btn-primary">
          <span>＋</span> Log food
        </Link>
      </header>

      <section className="card">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <Ring percent={Math.min(pct, 150)} />
          <div className="grid flex-1 grid-cols-3 gap-4 text-sm">
            <Stat label="Consumed" value={`${consumed}`} unit="kcal" />
            <Stat label="Target" value={`${target}`} unit="kcal" />
            <Stat
              label="Remaining"
              value={`${remaining}`}
              unit="kcal"
              tone={remaining < 0 ? 'bad' : 'good'}
            />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((m) => (
            <div key={m} className="rounded-xl border border-neutral-200/80 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className={`chip ${mealTint[m]} capitalize`}>{m}</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-neutral-900">
                {summary.mealBreakdown[m]}
                <span className="ml-1 text-xs font-normal text-neutral-500">kcal</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>Protein <span className="font-medium text-neutral-700">{summary.macros.protein}g</span></span>
          <span>Carbs <span className="font-medium text-neutral-700">{summary.macros.carbs}g</span></span>
          <span>Fats <span className="font-medium text-neutral-700">{summary.macros.fats}g</span></span>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Food log</h2>
          <span className="text-xs text-neutral-500">{logs.length} {logs.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        {logs.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-200 py-10 text-center">
            <p className="text-sm text-neutral-500">No entries yet.</p>
            <Link href="/food-tracker" className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline">
              Log your first meal →
            </Link>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100">
            {logs.map((log) => (
              <li key={log._id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`chip ${mealTint[log.mealType]} capitalize`}>{log.mealType}</span>
                    <span className="text-xs text-neutral-400">
                      {log.source === 'AI' ? 'AI' : 'Manual'}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm text-neutral-700">
                    {log.items.map((i) => `${i.foodName} (${i.quantity} ${i.unit})`).join(', ')}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-neutral-900">{log.totalCalories}<span className="ml-0.5 text-xs font-normal text-neutral-500">kcal</span></span>
                  <button
                    onClick={() => deleteLog(log._id)}
                    disabled={deletingId === log._id}
                    className="text-xs text-neutral-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === log._id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'good' | 'bad';
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : 'text-neutral-900'
        }`}
      >
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-neutral-500">{unit}</span>}
      </div>
    </div>
  );
}

function Ring({ percent }: { percent: number }) {
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(percent, 150));
  const offset = c - (Math.min(clamped, 100) / 100) * c;
  const over = clamped > 100;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? '#dc2626' : '#059669'}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold">{Math.round(percent)}%</div>
        <div className="text-xs text-neutral-500">of target</div>
      </div>
    </div>
  );
}
