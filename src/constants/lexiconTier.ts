/** Maps analytics lexicon_tier_rank values to friendly display names */
export const LEXICON_TIER_DISPLAY: Record<string, string> = {
  'Smart Starter': 'Bronze Speaker',
  'Confident Speaker': 'Silver Speaker',
  'Diplomatic Communicator': 'Gold Speaker',
};

export function getLexiconTierDisplayName(tier: string | null | undefined): string {
  if (!tier) return 'Bronze Speaker';
  return LEXICON_TIER_DISPLAY[tier] ?? tier;
}
