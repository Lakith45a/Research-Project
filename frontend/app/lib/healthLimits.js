/**
 * Daily nutrition limits for a normal healthy adult (male or female).
 * Based on WHO and other authoritative sources.
 *
 * Sources:
 * - WHO Guideline: Sodium intake for adults and children (2012).
 *   < 2 g sodium per day (= 2000 mg) for adults (strong recommendation).
 *   https://www.who.int/news-room/fact-sheets/detail/salt-reduction
 *
 * - WHO/FAO: Carbohydrates 45–65% of total energy (dietary guidelines).
 *   For ~2000 kcal/day, 50% ≈ 250 g carbs. Used as a reference upper
 *   for daily tracking (quality of carbs is also important per WHO).
 */

/** Daily sodium limit (mg). WHO: < 2000 mg for adults. */
export const DAILY_SODIUM_LIMIT_MG = 2000;

/** Daily carbohydrate reference limit (g). ~50% of 2000 kcal. */
export const DAILY_CARBS_LIMIT_G = 250;
