// Core tax calculation engine — runs entirely client-side
// No data ever leaves the browser

import type { TaxBracket, ProvinceTaxData, CPPData, EIData } from "../data/tax-rates/2025/index";
import {
  federal,
  provinces,
  cpp,
  qpp,
  ei,
  eiQuebec,
  qpip,
} from "../data/tax-rates/2025/index";

// ─── Types ──────────────────────────────────────────────────────────

export interface TaxInput {
  employmentIncome: number;
  selfEmploymentIncome: number;
  otherIncome: number;
  capitalGains: number;
  eligibleDividends: number;
  ineligibleDividends: number;
  rrspContribution: number;
  fhsaContribution: number;
  provinceSlug: string;
}

export interface BracketDetail {
  min: number;
  max: number;
  rate: number;
  taxableInBracket: number;
  taxInBracket: number;
}

export interface TaxResult {
  province: ProvinceTaxData;
  totalIncome: number;
  taxableIncome: number;

  federalTax: number;
  federalBrackets: BracketDetail[];
  provincialTax: number;
  provincialBrackets: BracketDetail[];

  cppContributions: number;
  cpp2Contributions: number;
  eiPremiums: number;
  qpipPremiums: number; // Quebec only

  totalTax: number;
  afterTaxIncome: number;
  averageRate: number;
  marginalRate: number;

  dividendTaxCreditFederal: number;
  dividendTaxCreditProvincial: number;
}

// ─── Core bracket calculation ───────────────────────────────────────

function calculateProgressiveTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): { total: number; details: BracketDetail[] } {
  let total = 0;
  const details: BracketDetail[] = [];

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) {
      details.push({
        ...bracket,
        taxableInBracket: 0,
        taxInBracket: 0,
      });
      continue;
    }

    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    const taxInBracket = taxableInBracket * bracket.rate;
    total += taxInBracket;

    details.push({
      ...bracket,
      taxableInBracket,
      taxInBracket,
    });
  }

  return { total, details };
}

// ─── CPP Calculation ────────────────────────────────────────────────

function calculateCPP(
  pensionableEarnings: number,
  selfEmployed: boolean,
  isQuebec: boolean
): { cpp1: number; cpp2: number } {
  const plan = isQuebec ? qpp : cpp;

  // CPP1
  const cpp1Earnings = Math.min(pensionableEarnings, plan.maxPensionableEarnings) - plan.basicExemption;
  const cpp1 = Math.max(0, cpp1Earnings) * (selfEmployed ? plan.selfEmployedRate : plan.employeeRate);

  // CPP2 (second ceiling, no basic exemption)
  const cpp2Earnings = Math.min(pensionableEarnings, plan.cpp2MaxEarnings) - plan.maxPensionableEarnings;
  const cpp2 = Math.max(0, cpp2Earnings) * (selfEmployed ? plan.cpp2SelfEmployedRate : plan.cpp2EmployeeRate);

  return { cpp1, cpp2 };
}

// ─── EI Calculation ─────────────────────────────────────────────────

function calculateEI(insurableEarnings: number, isQuebec: boolean): number {
  const plan = isQuebec ? eiQuebec : ei;
  const earnings = Math.min(insurableEarnings, plan.maxInsurableEarnings);
  return earnings * plan.employeeRate;
}

// ─── QPIP Calculation (Quebec only) ─────────────────────────────────

function calculateQPIP(insurableEarnings: number, selfEmployed: boolean): number {
  const earnings = Math.min(insurableEarnings, qpip.maxInsurableEarnings);
  return earnings * (selfEmployed ? qpip.selfEmployedRate : qpip.employeeRate);
}

// ─── Dividend gross-up and tax credits ──────────────────────────────

function grossUpDividends(eligible: number, ineligible: number): number {
  return eligible * 1.38 + ineligible * 1.15;
}

function federalDividendTaxCredit(eligible: number, ineligible: number): number {
  return eligible * 1.38 * 0.150198 + ineligible * 1.15 * 0.090301;
}

// Provincial dividend tax credit rates (approximate — eligible dividends)
const provincialDividendCreditRates: Record<string, { eligible: number; ineligible: number }> = {
  alberta: { eligible: 0.0812, ineligible: 0.0218 },
  bc: { eligible: 0.12, ineligible: 0.0196 },
  manitoba: { eligible: 0.08, ineligible: 0.007 },
  "new-brunswick": { eligible: 0.14, ineligible: 0.0275 },
  newfoundland: { eligible: 0.063, ineligible: 0.032 },
  "northwest-territories": { eligible: 0.115, ineligible: 0.06 },
  "nova-scotia": { eligible: 0.0885, ineligible: 0.0299 },
  nunavut: { eligible: 0.055, ineligible: 0.028 },
  ontario: { eligible: 0.10, ineligible: 0.029863 },
  pei: { eligible: 0.105, ineligible: 0.028 },
  quebec: { eligible: 0.117, ineligible: 0.0342 },
  saskatchewan: { eligible: 0.11, ineligible: 0.02105 },
  yukon: { eligible: 0.1202, ineligible: 0.0067 },
};

// ─── Ontario surtax ─────────────────────────────────────────────────

function calculateOntarioSurtax(provincialTax: number, surtax?: { threshold: number; rate: number }[]): number {
  if (!surtax) return 0;
  let total = 0;
  for (const tier of surtax) {
    if (provincialTax > tier.threshold) {
      total += (provincialTax - tier.threshold) * tier.rate;
    }
  }
  return total;
}

// ─── Marginal rate calculation ──────────────────────────────────────

function getMarginalRate(taxableIncome: number, brackets: TaxBracket[]): number {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) {
      return brackets[i].rate;
    }
  }
  return brackets[0].rate;
}

// Effective marginal rate accounts for the basic personal amount credit.
// Below the BPA, the credit fully offsets tax, so the effective rate is 0%.
function getEffectiveMarginalRate(
  taxableIncome: number,
  brackets: TaxBracket[],
  basicPersonalAmount: number
): number {
  if (taxableIncome <= basicPersonalAmount) return 0;
  return getMarginalRate(taxableIncome, brackets);
}

// ─── Main calculation function ──────────────────────────────────────

export function calculateTax(input: TaxInput, province: ProvinceTaxData): TaxResult {
  const isQuebec = province.slug === "quebec";
  const hasSelfEmployment = input.selfEmploymentIncome > 0;

  // Step 1: Calculate total income
  const dividendGrossUp = grossUpDividends(input.eligibleDividends, input.ineligibleDividends);
  const taxableCapitalGains = input.capitalGains * 0.5; // 50% inclusion rate

  const totalIncome =
    input.employmentIncome +
    input.selfEmploymentIncome +
    input.otherIncome +
    taxableCapitalGains +
    dividendGrossUp;

  // Step 2: Apply deductions (RRSP + FHSA)
  const rrspDeduction = Math.min(input.rrspContribution, totalIncome);
  const fhsaDeduction = Math.min(input.fhsaContribution, 8000); // $8,000/year max
  const totalDeductions = rrspDeduction + fhsaDeduction;
  const taxableIncome = Math.max(0, totalIncome - totalDeductions);

  // Step 3: Federal tax
  const federalResult = calculateProgressiveTax(taxableIncome, federal.brackets);
  const federalBasicCredit = federal.basicPersonalAmount * federal.brackets[0].rate;
  let federalTax = Math.max(0, federalResult.total - federalBasicCredit);

  // Federal dividend tax credit
  const fedDivCredit = federalDividendTaxCredit(input.eligibleDividends, input.ineligibleDividends);
  federalTax = Math.max(0, federalTax - fedDivCredit);

  // Quebec abatement (16.5% reduction of federal tax for Quebec residents)
  if (isQuebec) {
    federalTax = federalTax * (1 - 0.165);
  }

  // Step 4: Provincial tax
  const provincialResult = calculateProgressiveTax(taxableIncome, province.brackets);
  const provincialBasicCredit = province.basicPersonalAmount * province.brackets[0].rate;
  let provincialTax = Math.max(0, provincialResult.total - provincialBasicCredit);

  // Provincial surtax (Ontario, PEI)
  provincialTax += calculateOntarioSurtax(provincialTax, province.surtax);

  // Provincial dividend tax credit
  const provDivRates = provincialDividendCreditRates[province.slug];
  let provDivCredit = 0;
  if (provDivRates) {
    provDivCredit =
      input.eligibleDividends * 1.38 * provDivRates.eligible +
      input.ineligibleDividends * 1.15 * provDivRates.ineligible;
  }
  provincialTax = Math.max(0, provincialTax - provDivCredit);

  // Step 5: CPP/QPP contributions
  const pensionableEarnings = input.employmentIncome + input.selfEmploymentIncome;
  const { cpp1, cpp2 } = calculateCPP(pensionableEarnings, hasSelfEmployment, isQuebec);

  // Step 6: EI premiums (on employment income only; self-employed EI is optional)
  const eiPremiums = calculateEI(input.employmentIncome, isQuebec);

  // Step 7: QPIP (Quebec only)
  const qpipPremiums = isQuebec
    ? calculateQPIP(input.employmentIncome + input.selfEmploymentIncome, hasSelfEmployment)
    : 0;

  // Step 8: Total
  const totalTax = federalTax + provincialTax + cpp1 + cpp2 + eiPremiums + qpipPremiums;
  const afterTaxIncome = totalIncome - totalTax;
  const averageRate = totalIncome > 0 ? totalTax / totalIncome : 0;

  // Marginal rate (combined federal + provincial on next dollar of employment income)
  // Uses effective rate which is 0% when below the basic personal amount
  const federalMarginal = getEffectiveMarginalRate(taxableIncome, federal.brackets, federal.basicPersonalAmount);
  const provincialMarginal = getEffectiveMarginalRate(taxableIncome, province.brackets, province.basicPersonalAmount);
  const marginalRate = federalMarginal + provincialMarginal;

  return {
    province,
    totalIncome,
    taxableIncome,
    federalTax,
    federalBrackets: federalResult.details,
    provincialTax,
    provincialBrackets: provincialResult.details,
    cppContributions: cpp1,
    cpp2Contributions: cpp2,
    eiPremiums,
    qpipPremiums,
    totalTax,
    afterTaxIncome,
    averageRate,
    marginalRate,
    dividendTaxCreditFederal: fedDivCredit,
    dividendTaxCreditProvincial: provDivCredit,
  };
}

// ─── Calculate for all provinces (comparison table) ─────────────────

export function calculateAllProvinces(input: TaxInput): TaxResult[] {
  return provinces.map((province) => calculateTax(input, province));
}

// ─── Helper: get province by slug ───────────────────────────────────

export function getProvinceBySlug(slug: string): ProvinceTaxData | undefined {
  return provinces.find((p) => p.slug === slug);
}

// ─── Helper: format currency ────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return (rate * 100).toFixed(2) + "%";
}
