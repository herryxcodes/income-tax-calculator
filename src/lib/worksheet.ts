// Turns a TaxResult into the rows of a return, tagged with the CRA line or
// T4 box each amount corresponds to, so people can match it to their own forms.

import type { TaxResult } from "./tax-engine";

export type RowKind = "info" | "amount" | "less" | "plus" | "subtotal" | "total";

export interface WorksheetRow {
  tag?: string; // e.g. "10100" or "T4 16"
  label: string;
  amount: number;
  kind: RowKind;
  note?: string;
}

export interface WorksheetSection {
  id: "income" | "federal" | "provincial" | "contributions";
  title: string;
  rows: WorksheetRow[];
}

const has = (n: number) => Math.abs(n) >= 0.5;

export function buildWorksheet(r: TaxResult): WorksheetSection[] {
  const isQuebec = r.province.slug === "quebec";
  const plan = isQuebec ? "QPP" : "CPP";
  const d = r.deductions;

  const income: WorksheetRow[] = [];
  if (has(r.employmentIncome)) income.push({ tag: "10100", label: "Employment income", amount: r.employmentIncome, kind: "amount" });
  if (has(r.selfEmploymentIncome)) income.push({ tag: "13500", label: "Self-employment income (net)", amount: r.selfEmploymentIncome, kind: "amount" });
  if (has(r.grossedUpDividends)) income.push({ tag: "12000", label: "Taxable dividends (grossed up)", amount: r.grossedUpDividends, kind: "amount" });
  if (has(r.taxableCapitalGains)) income.push({ tag: "12700", label: "Taxable capital gains", amount: r.taxableCapitalGains, kind: "amount", note: "Half of your gains are taxable" });
  if (has(r.otherIncome)) income.push({ label: "Other income", amount: r.otherIncome, kind: "amount" });
  income.push({ tag: "15000", label: "Total income", amount: r.totalIncome, kind: "subtotal" });
  if (has(d.rrsp)) income.push({ tag: "20800", label: "RRSP deduction", amount: d.rrsp, kind: "less" });
  if (has(d.fhsa)) income.push({ tag: "20805", label: "FHSA deduction", amount: d.fhsa, kind: "less" });
  if (has(d.cppSelfEmployed)) income.push({ tag: "22200", label: `${plan} on self-employment income`, amount: d.cppSelfEmployed, kind: "less" });
  if (has(d.cppEnhanced)) income.push({ tag: "22215", label: `Enhanced ${plan} on employment income`, amount: d.cppEnhanced, kind: "less" });
  if (has(d.qpipSelfEmployed)) income.push({ tag: "22300", label: "QPIP on self-employment (employer share)", amount: d.qpipSelfEmployed, kind: "less" });
  income.push({ tag: "26000", label: "Taxable income", amount: r.taxableIncome, kind: "subtotal" });

  const f = r.federal;
  const federal: WorksheetRow[] = [
    { label: "Tax on taxable income", amount: f.taxOnIncome, kind: "amount" },
    { tag: "35000", label: "Non-refundable tax credits", amount: f.creditsApplied, kind: "less" },
  ];
  if (has(f.dividendCreditApplied)) federal.push({ tag: "40425", label: "Dividend tax credit", amount: f.dividendCreditApplied, kind: "less" });
  if (isQuebec) {
    federal.push({ tag: "42000", label: "Basic federal tax", amount: f.basicTax, kind: "subtotal" });
    federal.push({ tag: "44000", label: "Refundable Quebec abatement (16.5%)", amount: f.quebecAbatement, kind: "less" });
  }
  federal.push({ tag: isQuebec ? undefined : "42000", label: "Federal tax", amount: f.tax, kind: "total" });

  const p = r.provincial;
  const provName = r.province.name;
  const provincial: WorksheetRow[] = [];
  if (has(p.workerDeduction)) {
    provincial.push({
      label: "Quebec taxable income",
      amount: p.taxableIncome,
      kind: "info",
      note: `After the $${Math.round(p.workerDeduction).toLocaleString("en-CA")} deduction for workers`,
    });
  }
  provincial.push({ label: "Tax on taxable income", amount: p.taxOnIncome, kind: "amount" });
  provincial.push({ label: "Non-refundable tax credits", amount: p.creditsApplied, kind: "less" });
  if (has(p.surtax)) provincial.push({ label: `${provName} surtax`, amount: p.surtax, kind: "plus" });
  if (has(p.dividendCreditApplied)) provincial.push({ label: "Dividend tax credit", amount: p.dividendCreditApplied, kind: "less" });
  if (has(p.taxReduction)) provincial.push({ label: r.province.ontario ? "Ontario tax reduction" : "Low-income tax reduction", amount: p.taxReduction, kind: "less" });
  if (has(p.liftCredit)) provincial.push({ label: "LIFT credit", amount: p.liftCredit, kind: "less" });
  if (has(p.healthPremium)) provincial.push({ label: "Ontario Health Premium", amount: p.healthPremium, kind: "plus" });
  if (has(p.healthServicesFund)) provincial.push({ label: "Health Services Fund contribution", amount: p.healthServicesFund, kind: "plus" });
  provincial.push({ tag: isQuebec ? undefined : "42800", label: `${provName} tax`, amount: p.tax, kind: "total" });

  const c = r.contributions;
  const contributions: WorksheetRow[] = [];
  if (has(c.cpp1Employee)) contributions.push({ tag: isQuebec ? "T4 17" : "T4 16", label: `${plan} contributions`, amount: c.cpp1Employee, kind: "amount" });
  if (has(c.cpp2Employee)) contributions.push({ tag: isQuebec ? "T4 17A" : "T4 16A", label: `Second additional ${plan} (${plan}2)`, amount: c.cpp2Employee, kind: "amount" });
  if (has(c.cpp1SelfEmployed + c.cpp2SelfEmployed)) {
    contributions.push({
      tag: isQuebec ? undefined : "42100",
      label: `${plan} on self-employment (both halves)`,
      amount: c.cpp1SelfEmployed + c.cpp2SelfEmployed,
      kind: "amount",
    });
  }
  if (has(c.ei)) contributions.push({ tag: "T4 18", label: "EI premiums", amount: c.ei, kind: "amount" });
  if (has(c.qpipEmployee)) contributions.push({ tag: "T4 55", label: "QPIP premiums", amount: c.qpipEmployee, kind: "amount" });
  if (has(c.qpipSelfEmployed)) contributions.push({ label: "QPIP on self-employment", amount: c.qpipSelfEmployed, kind: "amount" });
  contributions.push({ label: "Total contributions", amount: c.total, kind: "total" });

  return [
    { id: "income", title: "Income and deductions", rows: income },
    { id: "federal", title: "Federal tax", rows: federal },
    { id: "provincial", title: isQuebec ? "Quebec tax (filed with Revenu Québec)" : `${provName} tax`, rows: provincial },
    { id: "contributions", title: "Payroll contributions", rows: contributions },
  ];
}
