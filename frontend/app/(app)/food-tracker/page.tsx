'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import type {
  AiFoodItem,
  AiUsage,
  AnalyzeResponse,
  FoodItem,
  LookupResult,
  MealType,
} from '../../../lib/types';

type DraftItem = AiFoodItem;

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

function suggestMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 19) return 'snacks';
  return 'dinner';
}

export default function FoodTrackerPage() {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(suggestMealType());
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lookingUp, setLookingUp] = useState<number | null>(null);
  const [source, setSource] = useState<'MANUAL' | 'AI'>('MANUAL');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadUsage = useCallback(async () => {
    try {
      const u = await api.get<{ used: number; limit: number; remaining: number }>('/api/food/ai-usage');
      setUsage(u);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  async function onAnalyze(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.upload<AnalyzeResponse>('/api/food/analyze', form);
      setItems(res.items.length ? res.items : [blankItem()]);
      setUsage(res.aiUsage);
      setSource('AI');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function updateItem(i: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addItem() {
    setItems((prev) => [...prev, blankItem()]);
  }

  async function onLookup(i: number) {
    const current = items[i];
    const name = current?.foodName?.trim();
    if (!name || name.length < 2) {
      setError('Enter a food name first');
      return;
    }
    setError(null);
    setLookingUp(i);
    try {
      const params = new URLSearchParams({ q: name });
      if (current.quantity && current.quantity > 0) {
        params.set('quantity', String(current.quantity));
      }
      if (current.unit && current.unit.trim().length > 0) {
        params.set('unit', current.unit);
      }
      const r = await api.get<LookupResult>(`/api/food/lookup?${params}`);
      // Only overwrite calories + macros (and clean up the name).
      // Keep the user's quantity + unit intact so they stay in control.
      updateItem(i, {
        foodName: r.foodName,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fats: r.fats,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookingUp(null);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError('Add at least one item');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: { mealType: MealType; items: FoodItem[]; source?: 'AI' | 'MANUAL' } = {
        mealType,
        source,
        items: items.map((i) => ({
          foodName: i.foodName,
          quantity: Number(i.quantity),
          unit: i.unit,
          calories: Number(i.calories),
          protein: i.protein ? Number(i.protein) : undefined,
          carbs: i.carbs ? Number(i.carbs) : undefined,
          fats: i.fats ? Number(i.fats) : undefined,
        })),
      };
      await api.post('/api/food/manual', payload);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  const totalCal = items.reduce((s, i) => s + (Number(i.calories) || 0), 0);
  const limitReached = usage ? usage.remaining <= 0 : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Log food</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Snap a photo for AI detection, or enter items by hand.
        </p>
      </header>

      <section className="card">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M3 7h3l2-2h8l2 2h3v12H3z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold">AI photo detection</div>
                <div className="text-xs text-neutral-500">
                  {usage
                    ? `${usage.used} of ${usage.limit} used today · ${usage.remaining} left`
                    : '—'}
                </div>
              </div>
            </div>
          </div>
          <label className={`btn-primary cursor-pointer ${limitReached ? 'opacity-50' : ''}`}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={onAnalyze}
              disabled={analyzing || limitReached}
            />
            {analyzing ? 'Analyzing…' : 'Upload photo'}
          </label>
        </div>
      </section>

      <form onSubmit={onSave} className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Meal</span>
            <select
              className="input mt-1 min-w-[180px]"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
            >
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m[0].toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">Total</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-900">
              {totalCal}
              <span className="ml-1 text-xs font-normal text-neutral-500">kcal</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                  Item {i + 1}
                  {typeof it.confidence === 'number' && it.confidence < 1 && (
                    <span className="chip-good">AI · {Math.round(it.confidence * 100)}%</span>
                  )}
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-xs text-neutral-400 transition hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-6">
                <label className="col-span-2 block text-xs">
                  <span className="text-neutral-500">Name</span>
                  <div className="mt-1 flex gap-1">
                    <input
                      className="input flex-1"
                      value={it.foodName}
                      onChange={(e) => updateItem(i, { foodName: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => onLookup(i)}
                      disabled={lookingUp === i || !it.foodName.trim()}
                      className="btn-ghost shrink-0 px-2"
                      title="Auto-fill calories & macros for this food"
                    >
                      {lookingUp === i ? '…' : 'Auto'}
                    </button>
                  </div>
                </label>
                <label className="block text-xs">
                  <span className="text-neutral-500">Qty</span>
                  <input
                    type="number"
                    step="any"
                    className="input mt-1"
                    value={it.quantity || ''}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    required
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-neutral-500">Unit</span>
                  <input
                    className="input mt-1"
                    value={it.unit}
                    onChange={(e) => updateItem(i, { unit: e.target.value })}
                    placeholder="pieces, grams…"
                    required
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-neutral-500">Calories</span>
                  <input
                    type="number"
                    step="any"
                    className="input mt-1"
                    value={it.calories || ''}
                    onChange={(e) => updateItem(i, { calories: Number(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    required
                  />
                </label>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <MacroField label="Protein" value={it.protein} onChange={(v) => updateItem(i, { protein: v })} />
                <MacroField label="Carbs" value={it.carbs} onChange={(v) => updateItem(i, { carbs: v })} />
                <MacroField label="Fats" value={it.fats} onChange={(v) => updateItem(i, { fats: v })} />
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem} className="btn-ghost text-sm">
          + Add another item
        </button>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex items-center justify-end">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Save to log'}
          </button>
        </div>
      </form>
    </div>
  );
}

function MacroField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-neutral-500">{label} (g)</span>
      <input
        type="number"
        step="any"
        className="input mt-1"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={(e) => e.target.select()}
      />
    </label>
  );
}

function blankItem(): DraftItem {
  return { foodName: '', quantity: 1, unit: 'serving', calories: 0, confidence: 1 };
}
