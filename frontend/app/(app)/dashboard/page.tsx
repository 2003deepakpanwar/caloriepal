'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import type { DailySummary, FoodLog } from '../../../lib/types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [logs, setLogs] = useState<FoodLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!confirm('Delete this food entry?')) return;
    try {
      await api.del(`/api/food/${id}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!summary || !logs) return <div className="text-sm text-neutral-500">Loading…</div>;

  const pct = summary.percentOfTarget ?? 0;
  const consumed = summary.consumedCalories;
  const target = summary.calorieTarget ?? 0;
  const remaining = summary.remainingCalories ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-neutral-500">{summary.date} · {summary.timezone}</p>
        </div>
        <Link href="/food-tracker" className="btn-primary">+ Log food</Link>
      </header>

      <section className="card">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <Ring percent={Math.min(pct, 150)} />
          <div className="grid flex-1 grid-cols-3 gap-4 text-sm">
            <Stat label="Consumed" value={`${consumed} kcal`} />
            <Stat label="Target" value={`${target} kcal`} />
            <Stat
              label="Remaining"
              value={`${remaining} kcal`}
              tone={remaining < 0 ? 'bad' : 'good'}
            />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((m) => (
            <div key={m} className="rounded-lg bg-neutral-50 px-3 py-2">
              <div className="text-xs capitalize text-neutral-500">{m}</div>
              <div className="font-medium">{summary.mealBreakdown[m]} kcal</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-neutral-500">
          Macros today — Protein {summary.macros.protein}g · Carbs {summary.macros.carbs}g · Fats {summary.macros.fats}g
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Food log</h2>
          <span className="text-xs text-neutral-500">{logs.length} entries</span>
        </div>
        {logs.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No entries yet — log your first meal.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {logs.map((log) => (
              <li key={log._id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium capitalize">{log.mealType}</div>
                  <div className="text-xs text-neutral-500">
                    {log.items.map((i) => `${i.foodName} (${i.quantity} ${i.unit})`).join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{log.totalCalories} kcal</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {log.source}
                  </span>
                  <button
                    onClick={() => deleteLog(log._id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={`text-xl font-semibold ${
          tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : ''
        }`}
      >
        {value}
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
