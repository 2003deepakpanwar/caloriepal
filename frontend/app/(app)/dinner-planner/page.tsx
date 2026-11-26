'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import type { DinnerRecommendation } from '../../../lib/types';

export default function DinnerPlannerPage() {
  const [rec, setRec] = useState<DinnerRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [highProteinOnly, setHighProteinOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (vegOnly) qs.set('vegetarianOnly', 'true');
      if (highProteinOnly) qs.set('highProteinOnly', 'true');
      const r = await api.get<DinnerRecommendation>(`/api/dinner/recommendation?${qs}`);
      setRec(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [vegOnly, highProteinOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function regenerate() {
    setLoading(true);
    setError(null);
    try {
      const body = { preferences: { vegetarianOnly: vegOnly, highProteinOnly } };
      const r = await api.post<DinnerRecommendation>('/api/dinner/generate', body);
      setRec(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dinner planner</h1>
        <p className="text-sm text-neutral-500">
          Suggestions based on what you have left after today's meals.
        </p>
      </header>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} />
            Vegetarian only
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={highProteinOnly}
              onChange={(e) => setHighProteinOnly(e.target.checked)}
            />
            High-protein only
          </label>
          <button onClick={regenerate} className="btn-ghost ml-auto">
            Regenerate
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-neutral-500">Thinking…</p>}

        {rec && !loading && (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Mini label="Target" value={`${rec.calorieTarget} kcal`} />
              <Mini label="Consumed" value={`${rec.consumedBeforeDinner} kcal`} />
              <Mini
                label="Remaining"
                value={`${rec.remainingCalories} kcal`}
                tone={rec.remainingCalories < 0 ? 'bad' : 'good'}
              />
            </div>
            {rec.message && (
              <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {rec.message}
              </p>
            )}

            {rec.suggestions.length === 0 ? (
              <p className="text-sm text-neutral-500">No suggestions available.</p>
            ) : (
              <ul className="space-y-3">
                {rec.suggestions.map((s) => (
                  <li key={s.id} className="rounded-lg border border-neutral-200 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-neutral-500">
                          {s.calories} kcal · P {s.protein}g · C {s.carbs}g · F {s.fats}g
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.diffFromRemaining >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {s.diffFromRemaining >= 0 ? `${s.diffFromRemaining} kcal to spare` : `${Math.abs(s.diffFromRemaining)} kcal over`}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-600">{s.rationale}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-neutral-400">
              Generated {new Date(rec.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={`font-semibold ${
          tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}
