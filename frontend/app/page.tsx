export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">CaloriePal</h1>
      <p className="mt-4 text-neutral-600">
        AI-powered food recognition, calorie tracking and a 6 PM dinner planner.
      </p>
      <section className="mt-10 rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-medium">Phase 1 — scaffolding</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-neutral-600 space-y-1">
          <li>Express + Mongoose backend with a health endpoint</li>
          <li>Next.js App Router frontend with Tailwind v4</li>
          <li>Env templates for both sides</li>
        </ul>
        <p className="mt-4 text-sm text-neutral-500">
          Next: authentication, profile, BMR/TDEE calculation.
        </p>
      </section>
    </main>
  );
}
