'use client';

import { useEffect, useState } from 'react';
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-1 text-sm text-neutral-500">
        We use these to compute your daily calorie target.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          {preview && (
            <div className="text-sm">
              <div>
                BMR: <span className="font-medium">{preview.bmr}</span> · TDEE:{' '}
                <span className="font-medium">{preview.tdee}</span>
              </div>
              <div>
                Daily target:{' '}
                <span className="font-semibold text-emerald-600">{preview.dailyTarget}</span> kcal
              </div>
            </div>
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
