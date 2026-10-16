// Core tax calculation engine — runs entirely client-side.
// No data ever leaves the browser.
//
// Follows the order of the T1 return and the provincial 428 forms for a single
// individual under 65 with no dependants:
//   total income (15000) → deductions → net income (23600) → taxable income (26000)
//   → tax on taxable income − non-refundable credits − dividend tax credit
//   → (Quebec abatement) / (surtax, low-income reductions, Ontario Health Premium)

import type {
  AmountPhaseOut,
  OntarioRules,
  PensionPlanData,
  ProvinceTaxData,
  QuebecRules,
  TaxBracket,
  TaxYearData,
} from "../data/tax-rates/types";
import { DEFAULT_TAX_YEAR, getTaxYear } from "../data/tax-rates";

export type { ProvinceTaxData, TaxBracket, TaxYearData } from "../data/tax-rates/types";
export { DEFAULT_TAX_YEAR, TAX_YEARS, getTaxYear } from "../data/tax-rates";

// ─── Types ──────────────────────────────────────────────────────────

export interface TaxInput {
  employmentIncome: number;
  selfEmploymentIncome: number; // net business income (after expenses)
  otherIncome: number; // interest, rental, pension and other fully taxable income
  capitalGains: number; // realized gains (before the inclusion rate)
  eligibleDividends: number; // actual amount received
  ineligibleDividends: number; // actual amount received
  rrspContribution: number; // amount deducted this year
  fhsaContribution: number; // amount deducted this year
  provinceSlug: string;
  year?: number;
}

export interface BracketDetail {
  min: number;
  max: number;
  rate: number;
  taxableInBracket: number;
  taxInBracket: number;
}

export interface CreditAmounts {
  basicPersonal: number;
  employment: number;
  cppQpp: number;
  ei: number;
  qpip: number;
  other: number; // income-tested amounts such as Manitoba's Family Tax Benefit
  total: number;
}

export interface FederalBreakdown {
  taxOnIncome: number;
  creditAmounts: CreditAmounts;
  credits: number; // credit amounts × credit rate
  creditsApplied: number; // the part that actually reduced tax
  dividendCredit: number;
  dividendCreditApplied: number;
  basicTax: number; // basic federal tax, before the Quebec abatement
  quebecAbatement: number;
  tax: number;
  brackets: BracketDetail[];
}

export interface ProvincialBreakdown {
  netIncome: number; // differs from federal only in Quebec (deduction for workers)
  taxableIncome: number;
  workerDeduction: number;
  taxOnIncome: number;
  creditAmounts: CreditAmounts;
  credits: number;
  creditsApplied: number;
  dividendCredit: number;
  dividendCreditApplied: number;
  surtax: number;
  taxReduction: number; // Ontario tax reduction or the province's low-income reduction
  liftCredit: number; // Ontario only
  healthPremium: number; // Ontario only
  healthServicesFund: number; // Quebec only
  tax: number;
  brackets: BracketDetail[];
}

export interface Contributions {
  cpp1Employee: number;
  cpp2Employee: number;
  cpp1SelfEmployed: number; // both halves
  cpp2SelfEmployed: number; // both halves
  ei: number;
  qpipEmployee: number;
  qpipSelfEmployed: number;
  total: number;
}

export interface Deductions {
  rrsp: number;
  fhsa: number;
  cppSelfEmployed: number; // line 22200 — self-employed CPP/QPP: employer half plus the enhanced part of your half
  cppEnhanced: number; // line 22215 — enhanced CPP/QPP on employment income
  qpipSelfEmployed: number; // line 22300 — employer share of self-employed QPIP
  total: number;
}

export interface TaxResult {
  year: number;
  yearStatus: TaxYearData["status"];
  province: ProvinceTaxData;

  employmentIncome: number;
  selfEmploymentIncome: number;
  otherIncome: number;
  taxableCapitalGains: number;
  grossedUpDividends: number;
  totalIncome: number; // line 15000
  deductions: Deductions;
  netIncome: number; // line 23600
  taxableIncome: number; // line 26000

  federal: FederalBreakdown;
  provincial: ProvincialBreakdown;
  contributions: Contributions;

  federalTax: number;
  federalBrackets: BracketDetail[];
  provincialTax: number;
  provincialBrackets: BracketDetail[];
  incomeTax: number; // federal + provincial

  cppContributions: number; // CPP1/QPP1, employee + self-employed
  cpp2Contributions: number; // CPP2/QPP2, employee + self-employed
  eiPremiums: number;
  qpipPremiums: number;

  totalTax: number; // income tax + CPP/QPP + EI + QPIP
  cashIncome: number; // money actually received (actual dividends, full capital gains)
  afterTaxIncome: number; // cashIncome − totalTax
  averageRate: number; // totalTax ÷ cashIncome
  marginalRate: number; // combined income tax on the next dollar of ordinary income

  dividendTaxCreditFederal: number;
  dividendTaxCreditProvincial: number;
}

// ─── Small helpers ──────────────────────────────────────────────────

const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

function calculateProgressiveTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): { total: number; details: BracketDetail[] } {
  let total = 0;
  const details: BracketDetail[] = [];
  for (const bracket of brackets) {
    const taxableInBracket = Math.max(0, Math.min(taxableIncome, bracket.max) - bracket.min);
    const taxInBracket = taxableInBracket * bracket.rate;
    total += taxInBracket;
    details.push({ ...bracket, taxableInBracket, taxInBracket });
  }
  return { total, details };
}

/** Credit amount reduced linearly between phaseOut.start and phaseOut.end of net income. */
function phasedAmount(full: number, phaseOut: AmountPhaseOut | undefined, netIncome: number): number {
  if (!phaseOut || netIncome <= phaseOut.start) return full;
  if (netIncome >= phaseOut.end) return phaseOut.reducedAmount;
  const share = (netIncome - phaseOut.start) / (phaseOut.end - phaseOut.start);
  return full - (full - phaseOut.reducedAmount) * share;
}

// ─── CPP / QPP ──────────────────────────────────────────────────────
// Employees pay the employee rate through payroll. Self-employed people pay both
// halves on net business income (Schedule 8), after any employment earnings
// have used up part of the exemption and ceilings.
//
// Tax treatment:
//   employee share, base part             → non-refundable credit (lines 30800 / 31000)
//   enhanced part on employment income    → deduction (line 22215)
//   self-employed: employer half plus the
//   enhanced part of your own half        → deduction (line 22200)

interface PensionCalc {
  cpp1Employee: number;
  cpp2Employee: number;
  cpp1SelfEmployed: number;
  cpp2SelfEmployed: number;
  creditAmount: number;
  enhancedDeduction: number;
  selfEmployedDeduction: number;
  /** Enhanced part of the self-employed person's own half (part of enhancedDeduction). */
  selfEmployedEnhancedDeduction: number;
}

function calculatePension(employment: number, selfEmployment: number, plan: PensionPlanData): PensionCalc {
  const employeeRate = plan.baseRate + plan.firstAdditionalRate;
  const tier1 = (earnings: number) =>
    Math.max(0, Math.min(earnings, plan.ympe) - plan.basicExemption);
  const tier2 = (earnings: number) => Math.max(0, Math.min(earnings, plan.yampe) - plan.ympe);

  const total = employment + selfEmployment;
  const empTier1 = tier1(employment);
  const empTier2 = tier2(employment);
  const seTier1 = tier1(total) - empTier1;
  const seTier2 = tier2(total) - empTier2;

  const cpp1Employee = empTier1 * employeeRate;
  const cpp2Employee = empTier2 * plan.secondAdditionalRate;
  const cpp1SelfEmployed = seTier1 * employeeRate * 2;
  const cpp2SelfEmployed = seTier2 * plan.secondAdditionalRate * 2;

  // The self-employed person's own "employee share" is half of what they pay.
  const employeeShare1 = cpp1Employee + cpp1SelfEmployed / 2;
  const employeeShare2 = cpp2Employee + cpp2SelfEmployed / 2;
  const baseShare = plan.baseRate / employeeRate;

  return {
    cpp1Employee,
    cpp2Employee,
    cpp1SelfEmployed,
    cpp2SelfEmployed,
    creditAmount: employeeShare1 * baseShare,
    enhancedDeduction: employeeShare1 * (1 - baseShare) + employeeShare2,
    selfEmployedDeduction: (cpp1SelfEmployed + cpp2SelfEmployed) / 2,
    selfEmployedEnhancedDeduction: (cpp1SelfEmployed / 2) * (1 - baseShare) + cpp2SelfEmployed / 2,
  };
}

// ─── Ontario ────────────────────────────────────────────────────────

/** Ontario Health Premium on taxable income (unchanged since 2004, not indexed). */
export function ontarioHealthPremium(taxableIncome: number): number {
  const tiers = [
    { threshold: 20000, rate: 0.06, cap: 300 },
    { threshold: 36000, rate: 0.06, cap: 150 },
    { threshold: 48000, rate: 0.25, cap: 150 },
    { threshold: 72000, rate: 0.25, cap: 150 },
    { threshold: 200000, rate: 0.25, cap: 150 },
  ];
  let premium = 0;
  for (const tier of tiers) {
    premium += Math.min(tier.cap, Math.max(0, taxableIncome - tier.threshold) * tier.rate);
  }
  return premium;
}

function liftCredit(rules: OntarioRules["lift"], employmentIncome: number, netIncome: number): number {
  const base = Math.min(rules.max, employmentIncome * rules.employmentRate);
  return Math.max(0, base - rules.phaseOutRate * Math.max(0, netIncome - rules.threshold));
}

// ─── Quebec ─────────────────────────────────────────────────────────

function healthServicesFund(rules: QuebecRules["healthServicesFund"], nonEmploymentIncome: number): number {
  if (!rules) return 0;
  let contribution = 0;
  let lower = rules.threshold;
  for (const tier of rules.tiers) {
    if (nonEmploymentIncome <= lower) break;
    const inTier = Math.min(nonEmploymentIncome, tier.upTo) - lower;
    contribution = Math.min(tier.maxContribution, contribution + inTier * tier.rate);
    lower = tier.upTo;
  }
  return contribution;
}

// ─── Main calculation ───────────────────────────────────────────────

function sumCredits(amounts: Omit<CreditAmounts, "total">): CreditAmounts {
  return {
    ...amounts,
    total: amounts.basicPersonal + amounts.employment + amounts.cppQpp + amounts.ei + amounts.qpip + amounts.other,
  };
}

function calculateCore(rawInput: TaxInput, data: TaxYearData, province: ProvinceTaxData) {
  const isQuebec = province.slug === "quebec";

  const employment = nonNegative(rawInput.employmentIncome);
  const selfEmployment = nonNegative(rawInput.selfEmploymentIncome);
  const other = nonNegative(rawInput.otherIncome);
  const capitalGains = nonNegative(rawInput.capitalGains);
  const eligible = nonNegative(rawInput.eligibleDividends);
  const nonEligible = nonNegative(rawInput.ineligibleDividends);

  // ── Contributions ──
  const pension = calculatePension(employment, selfEmployment, isQuebec ? data.qpp : data.cpp);
  const eiPlan = isQuebec ? data.eiQuebec : data.ei;
  const ei = Math.min(employment, eiPlan.maxInsurableEarnings) * eiPlan.employeeRate;

  let qpipEmployee = 0;
  let qpipSelfEmployed = 0;
  if (isQuebec) {
    const max = data.qpip.maxInsurableEarnings;
    const empInsurable = Math.min(employment, max);
    qpipEmployee = empInsurable * data.qpip.employeeRate;
    qpipSelfEmployed = (Math.min(employment + selfEmployment, max) - empInsurable) * data.qpip.selfEmployedRate;
  }
  const qpipCreditShare = data.qpip.employeeRate / data.qpip.selfEmployedRate;
  const qpipCreditAmount = qpipEmployee + qpipSelfEmployed * qpipCreditShare;
  const qpipDeduction = qpipSelfEmployed * (1 - qpipCreditShare);

  // ── Income ──
  const eligibleGrossedUp = eligible * (1 + data.dividendGrossUp.eligible);
  const nonEligibleGrossedUp = nonEligible * (1 + data.dividendGrossUp.nonEligible);
  const grossedUpDividends = eligibleGrossedUp + nonEligibleGrossedUp;
  const taxableCapitalGains = capitalGains * data.capitalGainsInclusionRate;
  const totalIncome = employment + selfEmployment + other + taxableCapitalGains + grossedUpDividends;

  // ── Deductions ──
  const fhsaCap = data.limits.fhsaAnnual + data.limits.fhsaCarryForwardMax;
  const deductionsRequested = {
    rrsp: nonNegative(rawInput.rrspContribution),
    fhsa: Math.min(nonNegative(rawInput.fhsaContribution), fhsaCap),
    cppSelfEmployed: pension.selfEmployedDeduction + pension.selfEmployedEnhancedDeduction,
    cppEnhanced: pension.enhancedDeduction - pension.selfEmployedEnhancedDeduction,
    qpipSelfEmployed: qpipDeduction,
  };
  // Deductions can't take net income below zero; trim the RRSP/FHSA claim first
  // (unused RRSP deductions carry forward in real life).
  const mandatory = deductionsRequested.cppSelfEmployed + deductionsRequested.cppEnhanced + deductionsRequested.qpipSelfEmployed;
  const roomForOptional = Math.max(0, totalIncome - mandatory);
  const rrsp = Math.min(deductionsRequested.rrsp, roomForOptional);
  const fhsa = Math.min(deductionsRequested.fhsa, roomForOptional - rrsp);
  const deductions: Deductions = {
    ...deductionsRequested,
    rrsp,
    fhsa,
    total: rrsp + fhsa + mandatory,
  };
  const netIncome = Math.max(0, totalIncome - deductions.total);
  const taxableIncome = netIncome;

  // ── Federal ──
  const fed = data.federal;
  const fedBrackets = calculateProgressiveTax(taxableIncome, fed.brackets);
  const fedCreditAmounts = sumCredits({
    basicPersonal: phasedAmount(
      fed.bpa.max,
      { start: fed.bpa.phaseOutStart, end: fed.bpa.phaseOutEnd, reducedAmount: fed.bpa.min },
      netIncome
    ),
    employment: Math.min(fed.canadaEmploymentAmount, employment),
    cppQpp: pension.creditAmount,
    ei,
    qpip: qpipCreditAmount,
    other: 0,
  });
  const fedCredits = fedCreditAmounts.total * fed.creditRate;
  const fedDividendCredit =
    eligibleGrossedUp * fed.dividendCredit.eligible + nonEligibleGrossedUp * fed.dividendCredit.nonEligible;
  const fedAfterCredits = Math.max(0, fedBrackets.total - fedCredits);
  const basicFederalTax = Math.max(0, fedAfterCredits - fedDividendCredit);
  const fedCreditsApplied = fedBrackets.total - fedAfterCredits;
  const fedDividendCreditApplied = fedAfterCredits - basicFederalTax;
  const quebecAbatement = isQuebec ? basicFederalTax * fed.quebecAbatement : 0;
  const federalTax = basicFederalTax - quebecAbatement;

  // ── Provincial ──
  const workerDeduction = province.quebec
    ? Math.min(province.quebec.workerDeduction.max, (employment + selfEmployment) * province.quebec.workerDeduction.rate)
    : 0;
  const provNetIncome = Math.max(0, netIncome - workerDeduction);
  const provTaxableIncome = provNetIncome;

  const provBrackets = calculateProgressiveTax(provTaxableIncome, province.brackets);
  const provCreditAmounts = sumCredits({
    basicPersonal: phasedAmount(province.basicPersonalAmount, province.bpaPhaseOut, provNetIncome),
    employment: province.employmentAmount ? Math.min(province.employmentAmount, employment) : 0,
    cppQpp: province.payrollCredits ? pension.creditAmount : 0,
    ei: province.payrollCredits ? ei : 0,
    qpip: 0,
    other: province.incomeTestedCreditAmount
      ? Math.max(
          0,
          province.incomeTestedCreditAmount.base -
            province.incomeTestedCreditAmount.phaseOutRate *
              Math.max(0, provNetIncome - province.incomeTestedCreditAmount.threshold)
        )
      : 0,
  });
  const provCredits = provCreditAmounts.total * province.creditRate;
  const provDividendCredit =
    eligibleGrossedUp * province.dividendCredit.eligible +
    nonEligibleGrossedUp * province.dividendCredit.nonEligible;

  const provAfterCredits = Math.max(0, provBrackets.total - provCredits);
  const provCreditsApplied = provBrackets.total - provAfterCredits;

  // Ontario's surtax is calculated after non-refundable credits but before the
  // dividend tax credit (ON428 Part C).
  let surtax = 0;
  for (const tier of province.surtax ?? []) {
    surtax += Math.max(0, provAfterCredits - tier.threshold) * tier.rate;
  }
  let provTax = Math.max(0, provAfterCredits + surtax - provDividendCredit);
  const provDividendCreditApplied = provAfterCredits + surtax - provTax;

  let taxReduction = 0;
  let lift = 0;
  if (province.ontario) {
    // Ontario tax reduction (after surtax and the dividend credit), then LIFT.
    const ontarioReduction = Math.max(0, 2 * province.ontario.taxReductionBasic - provTax);
    taxReduction = Math.min(provTax, ontarioReduction);
    provTax -= taxReduction;
    lift = Math.min(provTax, liftCredit(province.ontario.lift, employment, provNetIncome));
    provTax -= lift;
  }
  if (province.lowIncomeReduction) {
    const r = province.lowIncomeReduction;
    const available = Math.max(0, r.base - r.phaseOutRate * Math.max(0, provNetIncome - r.threshold));
    taxReduction = Math.min(provTax, available);
    provTax -= taxReduction;
  }

  const healthPremium = province.ontario ? ontarioHealthPremium(provTaxableIncome) : 0;
  // Quebec Health Services Fund (Schedule F): applies to income other than
  // employment income, using actual (not grossed-up) dividends, after the
  // deduction for QPP contributions on self-employment income.
  const hsf = province.quebec
    ? healthServicesFund(
        province.quebec.healthServicesFund,
        Math.max(
          0,
          selfEmployment +
            other +
            taxableCapitalGains +
            eligible +
            nonEligible -
            pension.selfEmployedDeduction -
            pension.selfEmployedEnhancedDeduction
        )
      )
    : 0;
  const provincialTax = provTax + healthPremium + hsf;

  // ── Totals ──
  const contributions: Contributions = {
    cpp1Employee: pension.cpp1Employee,
    cpp2Employee: pension.cpp2Employee,
    cpp1SelfEmployed: pension.cpp1SelfEmployed,
    cpp2SelfEmployed: pension.cpp2SelfEmployed,
    ei,
    qpipEmployee,
    qpipSelfEmployed,
    total:
      pension.cpp1Employee +
      pension.cpp2Employee +
      pension.cpp1SelfEmployed +
      pension.cpp2SelfEmployed +
      ei +
      qpipEmployee +
      qpipSelfEmployed,
  };

  const incomeTax = federalTax + provincialTax;
  const totalTax = incomeTax + contributions.total;
  const cashIncome = employment + selfEmployment + other + capitalGains + eligible + nonEligible;

  const federal: FederalBreakdown = {
    taxOnIncome: fedBrackets.total,
    creditAmounts: fedCreditAmounts,
    credits: fedCredits,
    creditsApplied: fedCreditsApplied,
    dividendCredit: fedDividendCredit,
    dividendCreditApplied: fedDividendCreditApplied,
    basicTax: basicFederalTax,
    quebecAbatement,
    tax: federalTax,
    brackets: fedBrackets.details,
  };
  const provincial: ProvincialBreakdown = {
    netIncome: provNetIncome,
    taxableIncome: provTaxableIncome,
    workerDeduction,
    taxOnIncome: provBrackets.total,
    creditAmounts: provCreditAmounts,
    credits: provCredits,
    creditsApplied: provCreditsApplied,
    dividendCredit: provDividendCredit,
    dividendCreditApplied: provDividendCreditApplied,
    surtax,
    taxReduction,
    liftCredit: lift,
    healthPremium,
    healthServicesFund: hsf,
    tax: provincialTax,
    brackets: provBrackets.details,
  };

  return {
    employment,
    selfEmployment,
    other,
    taxableCapitalGains,
    grossedUpDividends,
    totalIncome,
    deductions,
    netIncome,
    taxableIncome,
    federal,
    provincial,
    contributions,
    incomeTax,
    totalTax,
    cashIncome,
  };
}

function resolve(input: TaxInput): { data: TaxYearData; province: ProvinceTaxData } {
  const data = getTaxYear(input.year ?? DEFAULT_TAX_YEAR);
  const province = data.provinces.find((p) => p.slug === input.provinceSlug);
  if (!province) throw new Error(`Unknown province "${input.provinceSlug}" for ${data.year}`);
  return { data, province };
}

/**
 * Calculate tax for one person in one province and tax year.
 * The province is looked up from `input.provinceSlug` in the year's data.
 */
export function calculateTax(input: TaxInput): TaxResult {
  const { data, province } = resolve(input);
  const core = calculateCore(input, data, province);

  // Marginal rate: extra income tax on one more dollar of ordinary income.
  const next = calculateCore({ ...input, otherIncome: nonNegative(input.otherIncome) + 1 }, data, province);
  const marginalRate = next.incomeTax - core.incomeTax;

  return {
    year: data.year,
    yearStatus: data.status,
    province,

    employmentIncome: core.employment,
    selfEmploymentIncome: core.selfEmployment,
    otherIncome: core.other,
    taxableCapitalGains: core.taxableCapitalGains,
    grossedUpDividends: core.grossedUpDividends,
    totalIncome: core.totalIncome,
    deductions: core.deductions,
    netIncome: core.netIncome,
    taxableIncome: core.taxableIncome,

    federal: core.federal,
    provincial: core.provincial,
    contributions: core.contributions,

    federalTax: core.federal.tax,
    federalBrackets: core.federal.brackets,
    provincialTax: core.provincial.tax,
    provincialBrackets: core.provincial.brackets,
    incomeTax: core.incomeTax,

    cppContributions: core.contributions.cpp1Employee + core.contributions.cpp1SelfEmployed,
    cpp2Contributions: core.contributions.cpp2Employee + core.contributions.cpp2SelfEmployed,
    eiPremiums: core.contributions.ei,
    qpipPremiums: core.contributions.qpipEmployee + core.contributions.qpipSelfEmployed,

    totalTax: core.totalTax,
    cashIncome: core.cashIncome,
    afterTaxIncome: core.cashIncome - core.totalTax,
    averageRate: core.cashIncome > 0 ? core.totalTax / core.cashIncome : 0,
    marginalRate,

    dividendTaxCreditFederal: core.federal.dividendCredit,
    dividendTaxCreditProvincial: core.provincial.dividendCredit,
  };
}

// ─── Comparison & lookup helpers ────────────────────────────────────

export function calculateAllProvinces(input: TaxInput): TaxResult[] {
  const data = getTaxYear(input.year ?? DEFAULT_TAX_YEAR);
  return data.provinces.map((p) => calculateTax({ ...input, provinceSlug: p.slug }));
}

export function getProvinces(year: number = DEFAULT_TAX_YEAR): ProvinceTaxData[] {
  return getTaxYear(year).provinces;
}

export function getProvinceBySlug(slug: string, year: number = DEFAULT_TAX_YEAR): ProvinceTaxData | undefined {
  return getTaxYear(year).provinces.find((p) => p.slug === slug);
}

/** Combined federal + provincial rate on ordinary income in the top bracket. */
export function topMarginalRate(provinceSlug: string, year: number = DEFAULT_TAX_YEAR): number {
  return calculateTax({ ...emptyInput(provinceSlug, year), otherIncome: 5_000_000 }).marginalRate;
}

export function emptyInput(provinceSlug: string, year: number = DEFAULT_TAX_YEAR): TaxInput {
  return {
    employmentIncome: 0,
    selfEmploymentIncome: 0,
    otherIncome: 0,
    capitalGains: 0,
    eligibleDividends: 0,
    ineligibleDividends: 0,
    rrspContribution: 0,
    fhsaContribution: 0,
    provinceSlug,
    year,
  };
}

// ─── Formatting ─────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  // Avoid "-$0" from tiny negative floating-point noise.
  const rounded = Math.round(amount);
  return currencyFormatter.format(rounded === 0 ? 0 : rounded);
}

export function formatPercent(rate: number, digits = 2): string {
  return (rate * 100).toFixed(digits) + "%";
}

/** Statutory rate without trailing zeros: 0.145 → "14.5%", 0.33 → "33%", 0.0505 → "5.05%". */
export function formatRate(rate: number): string {
  return `${Number((rate * 100).toFixed(3))}%`;
}
