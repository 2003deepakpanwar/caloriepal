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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Log food</h1>
        <p className="text-sm text-neutral-500">Snap a photo for AI detection, or enter items by hand.</p>
      </header>

      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">AI photo detection</div>
            <div className="text-xs text-neutral-500">
              {usage ? `${usage.used} / ${usage.limit} used today · ${usage.remaining} left` : ''}
            </div>
          </div>
          <label className="btn-ghost cursor-pointer">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={onAnalyze}
              disabled={analyzing || (usage ? usage.remaining <= 0 : false)}
            />
            {analyzing ? 'Analyzing…' : '📷 Upload photo'}
          </label>
        </div>
      </section>

      <form onSubmit={onSave} className="card space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-neutral-700">Meal</span>
          <select
            className="input mt-1"
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

        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-neutral-500">
                  Item {i + 1}
                  {typeof it.confidence === 'number' && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      AI · {Math.round(it.confidence * 100)}%
                    </span>
                  )}
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-600 hover:underline">
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
                    value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
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
                    value={it.calories}
                    onChange={(e) => updateItem(i, { calories: Number(e.target.value) })}
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-500">
            Total: <span className="font-medium text-neutral-900">{items.reduce((s, i) => s + (Number(i.calories) || 0), 0)} kcal</span>
          </div>
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
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function blankItem(): DraftItem {
  return { foodName: '', quantity: 1, unit: 'serving', calories: 0, confidence: 1 };
}
