// Shared input parsing and formatting for currency fields

const MAX_DIGITS = 9; // Up to $999,999,999
const MAX_VALUE = 999_999_999.99;

/** Parse a currency string into a number. Strips $, commas, spaces. Clamps to max. */
export function parseInput(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === ".") return 0;
  const num = Number(cleaned);
  if (isNaN(num)) return 0;
  // Clamp to max value and ensure non-negative
  const clamped = Math.min(Math.max(0, num), MAX_VALUE);
  // Round to 2 decimal places
  return Math.round(clamped * 100) / 100;
}

/** Format a number as a display string with commas (no $ sign — that's in the UI). */
export function formatInputDisplay(value: number): string {
  if (value === 0) return "";
  // If it's a whole number, don't show decimals
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-CA");
  }
  // Otherwise show up to 2 decimals
  return value.toLocaleString("en-CA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Enforce max length while typing. Returns the cleaned value or null if invalid.
 * This prevents typing more than 9 digits (excluding commas/decimals).
 */
export function enforceMaxDigits(value: string): string {
  const cleaned = value.replace(/[$,\s]/g, "");
  // Count only digit characters (before decimal)
  const parts = cleaned.split(".");
  const integerDigits = (parts[0] || "").replace(/\D/g, "");
  const decimalDigits = (parts[1] || "").replace(/\D/g, "");

  // Limit integer part to MAX_DIGITS digits
  const clampedInteger = integerDigits.slice(0, MAX_DIGITS);
  // Limit decimal part to 2 digits
  const clampedDecimal = decimalDigits.slice(0, 2);

  if (cleaned.includes(".")) {
    return clampedInteger + "." + clampedDecimal;
  }
  return clampedInteger;
}
