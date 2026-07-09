/**
 * Shared XP rules and leveling curve.
 * Keep in sync with apps/server/src/constants/xp.ts
 */

export const XP_PER_VOICE_MINUTE = 10;
export const XP_PER_VOCAB_MASTERED = 5;
export const XP_DAILY_CHALLENGE_BONUS = 50;
export const XP_LEVEL_BASE = 500;

export function computeLevelFromXp(xpTotal: number): number {
  const safe = Math.max(0, Math.floor(xpTotal));
  return Math.floor(safe / XP_LEVEL_BASE) + 1;
}

export function xpAtLevelStart(level: number): number {
  return Math.max(0, level - 1) * XP_LEVEL_BASE;
}

export function xpForNextLevel(level: number): number {
  return level * XP_LEVEL_BASE;
}

export function xpProgressInCurrentLevel(xpTotal: number): {
  level: number;
  current: number;
  needed: number;
  percent: number;
} {
  const level = computeLevelFromXp(xpTotal);
  const start = xpAtLevelStart(level);
  const end = xpForNextLevel(level);
  const current = Math.max(0, xpTotal - start);
  const needed = end - start;
  const percent = needed > 0 ? Math.min(100, (current / needed) * 100) : 100;
  return { level, current, needed, percent };
}
