import { Exercise, DAILY_SLOTS } from '../../types/Exercise';
import { DailyPlan } from '../../types/DailyPlan';
import { exerciseRepository } from '../data/ExerciseRepository';
import { getDailyPlan, upsertDailyPlan, getRecentDailyPlans } from '../db/queries';

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Mulberry32 seeded PRNG — deterministic per date so every user gets the same plan.
function makePrng(seed: number): () => number {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(dateString: string): number {
  let hash = 0;
  for (const c of dateString) {
    hash = (Math.imul(31, hash) + c.charCodeAt(0)) | 0;
  }
  return hash;
}

function weightedRandom<T>(items: T[], weights: number[], rand: () => number): T | undefined {
  if (!items.length) return undefined;
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rand() * items.length)];
  let roll = rand() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pick(
  candidates: Exercise[],
  usedFamilies: Set<string>,
  recentIds: Set<string>,
  rand: () => number
): Exercise | undefined {
  // Prefer exercises not on cooldown and not from an already-used family.
  let eligible = candidates.filter((e) => !recentIds.has(e.id) && !usedFamilies.has(e.family_id));
  // Relax cooldown if needed.
  if (!eligible.length) eligible = candidates.filter((e) => !usedFamilies.has(e.family_id));
  // Last resort: use all candidates.
  if (!eligible.length) eligible = candidates;
  if (!eligible.length) return undefined;
  return weightedRandom(eligible, eligible.map((e) => e.evidence_weight), rand);
}

export async function generateOrGetDailyPlan(dateString: string): Promise<DailyPlan> {
  const existing = await getDailyPlan(dateString);
  if (existing) return existing;

  const recentPlans = await getRecentDailyPlans(3);
  const recentIds = new Set(recentPlans.flatMap((p) => p.exerciseIds));

  const rand = makePrng(dateSeed(dateString));
  const selectedIds: string[] = [];
  const usedFamilies = new Set<string>();

  for (const slot of DAILY_SLOTS) {
    const candidates = exerciseRepository.exercisesForSlot(slot);
    const exercise = pick(candidates, usedFamilies, recentIds, rand);
    if (exercise) {
      selectedIds.push(exercise.id);
      usedFamilies.add(exercise.family_id);
    }
  }

  const plan: DailyPlan = {
    id: `plan_${dateString}`,
    date: dateString,
    exerciseIds: selectedIds,
    completedAt: null,
    xpEarned: 0,
  };

  await upsertDailyPlan(plan);
  return plan;
}
