'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import type { ActivityLevel, CalorieGoals, Gender, Goal, Profile } from '../../lib/types';

const activityOptions: Array<{ value: ActivityLevel; label: string }> = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'lightly_active', label: 'Lightly active (1–3 days/week)' },
  { value: 'moderately_active', label: 'Moderately active (3–5 days/week)' },
  { value: 'very_active', label: 'Very active (6–7 days/week)' },
  { value: 'extra_active', label: 'Extra active (physical job + training)' },
];

const goalOptions: Array<{ value: Goal; label: string }> = [
  { value: 'weight_loss', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'weight_gain', label: 'Gain weight' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<Gender>('male');
  const [heightCm, setHeightCm] = useState(170);
  const [currentWeightKg, setCurrentWeightKg] = useState(65);
  const [targetWeightKg, setTargetWeightKg] = useState(65);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [preview, setPreview] = useState<CalorieGoals | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.profile) {
      setAge(user.profile.age);
      setGender(user.profile.gender);
      setHeightCm(user.profile.heightCm);
      setCurrentWeightKg(user.profile.currentWeightKg);
      setTargetWeightKg(user.profile.targetWeightKg);
      setActivityLevel(user.profile.activityLevel);
      setGoal(user.profile.goal);
    }
    if (user?.calorieGoals) setPreview(user.calorieGoals);
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Profile = {
        age,
        gender,
        heightCm,
        currentWeightKg,
        targetWeightKg,
        activityLevel,
        goal,
      };
      const res = await api.put<{ profile: Profile; calorieGoals: CalorieGoals; bmi: number }>(
        '/api/profile',
        body,
      );
      setPreview(res.calorieGoals);
      await refresh();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  const hasExistingProfile = Boolean(user?.profile);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {hasExistingProfile && (
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 transition hover:text-neutral-900"
        >
          <span aria-hidden>←</span>
          <span>Dashboard</span>
        </Link>
      )}
      <h1 className="text-3xl font-semibold tracking-tight">
        {hasExistingProfile ? 'Profile' : 'Your profile'}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        We use these to compute your daily calorie target.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6 card">
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Age" value={age} onChange={setAge} min={10} max={100} />
          <Select
            label="Gender"
            value={gender}
            onChange={(v) => setGender(v as Gender)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
          <NumberField label="Height (cm)" value={heightCm} onChange={setHeightCm} min={50} max={250} />
          <NumberField
            label="Current weight (kg)"
            value={currentWeightKg}
            onChange={setCurrentWeightKg}
            min={20}
            max={400}
          />
          <NumberField
            label="Target weight (kg)"
            value={targetWeightKg}
            onChange={setTargetWeightKg}
            min={20}
            max={400}
          />
          <Select
            label="Goal"
            value={goal}
            onChange={(v) => setGoal(v as Goal)}
            options={goalOptions}
          />
        </div>
        <Select
          label="Activity level"
          value={activityLevel}
          onChange={(v) => setActivityLevel(v as ActivityLevel)}
          options={activityOptions}
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="flex flex-col gap-4 border-t border-neutral-200/80 pt-4 md:flex-row md:items-center md:justify-between">
          {preview ? (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">BMR</div>
                <div className="mt-0.5 font-semibold tabular-nums">{preview.bmr}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">TDEE</div>
                <div className="mt-0.5 font-semibold tabular-nums">{preview.tdee}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">Daily target</div>
                <div className="mt-0.5 font-semibold tabular-nums text-emerald-700">
                  {preview.dailyTarget}
                  <span className="ml-1 text-xs font-normal text-neutral-500">kcal</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">Save to see your calorie target.</p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Save and continue'}
          </button>
        </div>
      </form>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-neutral-700">{label}</span>
      <input
        type="number"
        className="input mt-1"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-neutral-700">{label}</span>
      <select className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
