'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import type { CustomDinnerResponse, DinnerRecommendation } from '../../../lib/types';

const EXAMPLE_PROMPTS = [
  'Something light with paneer, no onion',
  'High-protein and under 400 kcal',
  'Simple one-bowl meal with rice',
  'South Indian, under 500 kcal',
];

export default function DinnerPlannerPage() {
  const [rec, setRec] = useState<DinnerRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [highProteinOnly, setHighProteinOnly] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customResult, setCustomResult] = useState<CustomDinnerResponse | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

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

  async function submitCustom() {
    const request = customInput.trim();
    if (request.length < 2) {
      setCustomError('Describe what you want');
      return;
    }
    setCustomLoading(true);
    setCustomError(null);
    try {
      const body = {
        request,
        preferences: { vegetarianOnly: vegOnly, highProteinOnly },
      };
      const r = await api.post<CustomDinnerResponse>('/api/dinner/custom', body);
      setCustomResult(r);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setCustomLoading(false);
    }
  }

  function openCustom() {
    setCustomResult(null);
    setCustomError(null);
    setCustomInput('');
    setCustomOpen(true);
  }

  function closeCustom() {
    setCustomOpen(false);
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
          <div className="ml-auto flex gap-2">
            <button onClick={openCustom} className="btn-ghost">
              Custom…
            </button>
            <button onClick={regenerate} className="btn-ghost">
              Regenerate
            </button>
          </div>
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

      {customOpen && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 md:items-center"
          onClick={closeCustom}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Custom dinner</h2>
                <p className="text-sm text-neutral-500">
                  Describe what you feel like — we'll match it to your remaining budget.
                </p>
              </div>
              <button
                onClick={closeCustom}
                className="text-sm text-neutral-400 hover:text-neutral-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <textarea
                className="input min-h-[90px] resize-y"
                placeholder="e.g. something light with paneer, no onion"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                maxLength={500}
              />
              <div className="flex flex-wrap gap-2 text-xs">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCustomInput(p)}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600 hover:bg-neutral-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={closeCustom} className="btn-ghost">
                  Cancel
                </button>
                <button
                  onClick={submitCustom}
                  disabled={customLoading}
                  className="btn-primary"
                >
                  {customLoading ? 'Thinking…' : 'Generate'}
                </button>
              </div>
            </div>

            {customError && <p className="mt-3 text-sm text-red-600">{customError}</p>}

            {customResult && !customLoading && (
              <div className="mt-5 space-y-3">
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {customResult.message}
                </p>
                {customResult.suggestions.map((s, i) => {
                  const diff = customResult.remainingCalories - s.calories;
                  return (
                    <div key={i} className="rounded-lg border border-neutral-200 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-neutral-500">
                            {s.calories} kcal · P {s.protein}g · C {s.carbs}g · F {s.fats}g
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            diff >= 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {diff >= 0 ? `${diff} kcal to spare` : `${Math.abs(diff)} over`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-600">{s.rationale}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
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
