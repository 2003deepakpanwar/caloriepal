import { Resend } from 'resend';
import { env } from '../config/env.js';

export interface DinnerEmailPayload {
  to: string;
  name: string;
  date: string;
  calorieTarget: number;
  consumedBeforeDinner: number;
  remainingCalories: number;
  message: string | null;
  suggestions: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    rationale?: string;
  }>;
}

export function isEmailEnabled(): boolean {
  return env.resendApiKey.length > 0;
}

function client(): Resend {
  return new Resend(env.resendApiKey);
}

function renderDinnerHtml(p: DinnerEmailPayload): string {
  const items = p.suggestions
    .slice(0, 5)
    .map(
      (s) => `
        <li style="margin:0 0 12px 0; padding:12px 14px; border:1px solid #e5e7eb; border-radius:10px;">
          <div style="font-weight:600; font-size:15px; color:#111827;">${escape(s.name)}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:2px;">
            ${s.calories} kcal · P ${s.protein}g · C ${s.carbs}g · F ${s.fats}g
          </div>
          ${s.rationale ? `<div style="font-size:12px; color:#4b5563; margin-top:6px;">${escape(s.rationale)}</div>` : ''}
        </li>`,
    )
    .join('');

  const link = `${env.frontendUrl}/dinner-planner`;

  return `
<!doctype html>
<html>
  <body style="margin:0; background:#f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width:560px; margin:24px auto; background:#ffffff; border-radius:12px; padding:24px; border:1px solid #e5e7eb;">
      <h1 style="margin:0 0 4px 0; font-size:20px; color:#065f46;">Dinner time, ${escape(p.name)} 🍽️</h1>
      <p style="margin:0 0 16px 0; color:#4b5563; font-size:14px;">${escape(p.date)} · ${p.remainingCalories} kcal left for dinner</p>
      ${p.message ? `<p style="margin:0 0 16px 0; padding:10px 14px; background:#ecfdf5; color:#065f46; border-radius:8px; font-size:13px;">${escape(p.message)}</p>` : ''}
      <ul style="list-style:none; padding:0; margin:0;">
        ${items}
      </ul>
      <div style="margin-top:20px; text-align:center;">
        <a href="${link}" style="display:inline-block; padding:10px 18px; background:#059669; color:#ffffff; text-decoration:none; border-radius:8px; font-size:14px; font-weight:500;">Open dinner planner</a>
      </div>
      <p style="margin:20px 0 0 0; color:#9ca3af; font-size:12px; text-align:center;">
        Daily target ${p.calorieTarget} kcal · consumed so far ${p.consumedBeforeDinner} kcal
      </p>
    </div>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendDinnerEmail(payload: DinnerEmailPayload): Promise<void> {
  if (!isEmailEnabled()) return;
  try {
    await client().emails.send({
      from: env.resendFrom,
      to: payload.to,
      subject: `Dinner plan · ${payload.remainingCalories} kcal left today`,
      html: renderDinnerHtml(payload),
    });
  } catch (err) {
    console.error('[email] dinner send failed for', payload.to, err);
  }
}
