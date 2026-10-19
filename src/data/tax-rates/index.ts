// Registry of supported tax years.

import type { TaxYearData } from "./types";
import y2025 from "./2025";
import y2026 from "./2026";

export const TAX_YEARS: TaxYearData[] = [y2025, y2026];

/**
 * The tax year calculators open on: the year people are about to file for.
 * Move this to 2027 once 2027 is added and the 2026 filing season is over.
 */
export const DEFAULT_TAX_YEAR = 2026;

export function getTaxYear(year: number = DEFAULT_TAX_YEAR): TaxYearData {
  const data = TAX_YEARS.find((y) => y.year === year);
  if (!data) throw new Error(`No tax data for ${year}`);
  return data;
}
