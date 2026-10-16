// Shared shape for every tax year's data file.
// Model scope: a single individual, under 65, no dependants, resident in one
// province for the whole year, claiming no credits beyond the ones listed here.

export interface TaxBracket {
  min: number;
  max: number; // Infinity for the top bracket
  rate: number; // decimal (0.15 = 15%)
}

/** Linear phase-out of a credit amount between two net-income levels. */
export interface AmountPhaseOut {
  start: number; // net income where the reduction begins
  end: number; // net income where the reduced amount is reached
  reducedAmount: number; // amount at and above `end`
}

/**
 * Low-income reduction of provincial tax:
 *   reduction = max(0, base − phaseOutRate × max(0, netIncome − threshold))
 * capped at the provincial tax otherwise payable.
 */
export interface LowIncomeReduction {
  base: number;
  threshold: number;
  phaseOutRate: number;
}

export interface DividendCreditRates {
  eligible: number; // fraction of the grossed-up eligible dividend
  nonEligible: number; // fraction of the grossed-up non-eligible dividend
}

export interface OntarioRules {
  /** ON428 Ontario tax reduction: 2 × basic − Ontario tax (after surtax and the dividend credit), floored at 0, capped at the tax. */
  taxReductionBasic: number;
  /** Low-income individuals and families tax (LIFT) credit (ON428-A). */
  lift: {
    max: number;
    employmentRate: number; // credit = min(max, rate × employment income) before phase-out
    threshold: number; // adjusted net income where phase-out begins (single)
    phaseOutRate: number;
  };
}

export interface QuebecRules {
  /** TP-1 deduction for workers: rate × eligible work income, capped. */
  workerDeduction: { rate: number; max: number };
  /**
   * Contribution to the Health Services Fund on income other than employment
   * income (self-employment, investment). Tiers apply to that income above the threshold.
   */
  healthServicesFund?: {
    threshold: number; // exempt amount of non-employment income
    tiers: { upTo: number; rate: number; maxContribution: number }[];
  };
}

/**
 * A credit amount that shrinks as net income rises, added to the other credit
 * amounts before the credit rate is applied (Manitoba Family Tax Benefit):
 *   amount = max(0, base − phaseOutRate × max(0, netIncome − threshold))
 */
export interface IncomeTestedCreditAmount {
  label: string;
  base: number;
  threshold: number;
  phaseOutRate: number;
}

export interface ProvinceTaxData {
  name: string;
  slug: string;
  abbreviation: string;
  brackets: TaxBracket[];
  /** Rate applied to non-refundable credit amounts (usually the lowest bracket rate). */
  creditRate: number;
  basicPersonalAmount: number;
  bpaPhaseOut?: AmountPhaseOut;
  /** Provincial counterpart of the Canada employment amount (Yukon). */
  employmentAmount?: number;
  /** Income-tested credit amount (Manitoba Family Tax Benefit). */
  incomeTestedCreditAmount?: IncomeTestedCreditAmount;
  /** Whether base CPP/QPP and EI amounts earn a provincial credit (false only for Quebec). */
  payrollCredits: boolean;
  surtax?: { threshold: number; rate: number }[];
  dividendCredit: DividendCreditRates;
  lowIncomeReduction?: LowIncomeReduction;
  ontario?: OntarioRules;
  quebec?: QuebecRules;
  /** Short notes on anything unusual for this year (shown on reference pages). */
  notes?: string[];
}

export interface PensionPlanData {
  ympe: number; // year's maximum pensionable earnings
  yampe: number; // year's additional maximum pensionable earnings (CPP2/QPP2 ceiling)
  basicExemption: number;
  baseRate: number; // employee base rate (CPP 4.95%, QPP 5.40%)
  firstAdditionalRate: number; // employee first additional rate (1.00%)
  secondAdditionalRate: number; // employee CPP2/QPP2 rate (4.00%)
}

export interface EIData {
  maxInsurableEarnings: number;
  employeeRate: number;
}

export interface QPIPData {
  maxInsurableEarnings: number;
  employeeRate: number;
  employerRate: number;
  selfEmployedRate: number;
}

export interface FederalData {
  brackets: TaxBracket[];
  creditRate: number;
  bpa: { max: number; min: number; phaseOutStart: number; phaseOutEnd: number };
  canadaEmploymentAmount: number;
  dividendCredit: DividendCreditRates;
  quebecAbatement: number;
}

export type YearStatus = "final" | "projected";

export interface TaxYearData {
  year: number;
  /** "projected" when any value is an estimate pending official publication. */
  status: YearStatus;
  /** Plain-language note about what is confirmed vs projected. */
  statusNote?: string;
  /** Values (by path) that are projections rather than published figures. */
  projectedFields?: string[];
  federal: FederalData;
  dividendGrossUp: { eligible: number; nonEligible: number };
  capitalGainsInclusionRate: number;
  cpp: PensionPlanData;
  qpp: PensionPlanData;
  ei: EIData;
  eiQuebec: EIData;
  qpip: QPIPData;
  limits: {
    rrsp: number;
    tfsa: number;
    fhsaAnnual: number;
    fhsaCarryForwardMax: number;
    fhsaLifetime: number;
  };
  dates: {
    rrspDeadline: string;
    filingDeadline: string;
    selfEmployedDeadline: string;
    balanceDue: string;
  };
  provinces: ProvinceTaxData[];
  sources: string[];
}
