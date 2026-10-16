// Properties that must hold for every tax year and every province, whatever the
// exact rates are. These catch data-entry mistakes (gaps between brackets,
// a province missing from a year) and logic slips (take-home falling when
// income rises, deductions creating negative tax).

import { describe, it, expect } from "vitest";
import { calculateTax, emptyInput, TAX_YEARS, type TaxInput } from "./tax-engine";
import { buildWorksheet } from "./worksheet";

const SLUGS = [
  "alberta",
  "bc",
  "manitoba",
  "new-brunswick",
  "newfoundland",
  "northwest-territories",
  "nova-scotia",
  "nunavut",
  "ontario",
  "pei",
  "quebec",
  "saskatchewan",
  "yukon",
];

const run = (overrides: Partial<TaxInput>, slug = "ontario", year = 2025) =>
  calculateTax({ ...emptyInput(slug, year), ...overrides });

describe("tax year data", () => {
  it("covers 2025, 2026 and 2027", () => {
    expect(TAX_YEARS.map((y) => y.year)).toEqual([2025, 2026, 2027]);
  });

  for (const data of TAX_YEARS) {
    describe(`${data.year}`, () => {
      it("has all 13 provinces and territories", () => {
        expect(data.provinces.map((p) => p.slug).sort()).toEqual([...SLUGS].sort());
      });

      it("explains itself when projected", () => {
        if (data.status === "projected") expect(data.statusNote?.length).toBeGreaterThan(20);
      });

      const schedules = [["federal", data.federal.brackets] as const, ...data.provinces.map((p) => [p.slug, p.brackets] as const)];
      for (const [name, brackets] of schedules) {
        it(`${name} brackets start at 0, are contiguous and end at Infinity`, () => {
          expect(brackets[0].min).toBe(0);
          for (let i = 1; i < brackets.length; i++) {
            expect(brackets[i].min).toBe(brackets[i - 1].max);
            expect(brackets[i].min).toBeGreaterThan(brackets[i - 1].min);
            expect(brackets[i].rate).toBeGreaterThanOrEqual(brackets[i - 1].rate);
          }
          expect(brackets[brackets.length - 1].max).toBe(Infinity);
          for (const b of brackets) expect(b.rate).toBeGreaterThan(0), expect(b.rate).toBeLessThan(0.35);
        });
      }

      it("uses each jurisdiction's lowest rate for credits", () => {
        expect(data.federal.creditRate).toBe(data.federal.brackets[0].rate);
        for (const p of data.provinces) expect(p.creditRate, p.slug).toBe(p.brackets[0].rate);
      });

      it("has sane payroll parameters", () => {
        for (const plan of [data.cpp, data.qpp]) {
          expect(plan.yampe).toBeGreaterThan(plan.ympe);
          expect(plan.basicExemption).toBe(3500);
          expect(plan.firstAdditionalRate).toBe(0.01);
          expect(plan.secondAdditionalRate).toBe(0.04);
        }
        expect(data.eiQuebec.employeeRate).toBeLessThan(data.ei.employeeRate);
        expect(data.qpip.selfEmployedRate).toBeGreaterThan(data.qpip.employeeRate);
      });

      it("keeps the federal BPA phase-out on the top two bracket thresholds", () => {
        const b = data.federal.brackets;
        expect(data.federal.bpa.phaseOutStart).toBe(b[3].min);
        expect(data.federal.bpa.phaseOutEnd).toBe(b[4].min);
        expect(data.federal.bpa.min).toBeLessThan(data.federal.bpa.max);
      });

      it("only Quebec skips provincial payroll credits", () => {
        for (const p of data.provinces) expect(p.payrollCredits, p.slug).toBe(p.slug !== "quebec");
      });
    });
  }
});

describe("behaviour in every province and year", () => {
  for (const { year } of TAX_YEARS) {
    for (const slug of SLUGS) {
      it(`${year} ${slug}: zero income means zero tax`, () => {
        const r = run({}, slug, year);
        expect(r.totalTax).toBe(0);
        expect(r.afterTaxIncome).toBe(0);
        expect(r.marginalRate).toBe(0);
      });

      it(`${year} ${slug}: take-home pay rises with every salary step`, () => {
        let previous = -1;
        for (let salary = 0; salary <= 400_000; salary += 500) {
          const r = run({ employmentIncome: salary }, slug, year);
          expect(r.afterTaxIncome, `salary ${salary}`).toBeGreaterThan(previous);
          expect(r.federalTax).toBeGreaterThanOrEqual(0);
          expect(r.provincialTax).toBeGreaterThanOrEqual(0);
          previous = r.afterTaxIncome;
        }
      });

      it(`${year} ${slug}: marginal rate stays between 0 and 100%`, () => {
        for (let income = 0; income <= 300_000; income += 2_500) {
          const r = run({ otherIncome: income }, slug, year);
          expect(r.marginalRate).toBeGreaterThanOrEqual(-1e-9);
          expect(r.marginalRate).toBeLessThan(1);
        }
      });

      it(`${year} ${slug}: worksheet reconciles to the result`, () => {
        const r = run(
          { employmentIncome: 85_000, selfEmploymentIncome: 12_000, eligibleDividends: 3_000, capitalGains: 4_000, rrspContribution: 6_000 },
          slug,
          year
        );
        const sections = buildWorksheet(r);
        const total = (id: string) => sections.find((s) => s.id === id)!.rows.at(-1)!.amount;
        expect(total("federal")).toBeCloseTo(r.federalTax, 6);
        expect(total("provincial")).toBeCloseTo(r.provincialTax, 6);
        expect(total("contributions")).toBeCloseTo(r.contributions.total, 6);
        expect(r.totalTax).toBeCloseTo(r.federalTax + r.provincialTax + r.contributions.total, 6);

        // Every line in the federal and provincial sections adds up to its total.
        for (const id of ["federal", "provincial"]) {
          const rows = sections.find((s) => s.id === id)!.rows;
          let running = 0;
          for (const row of rows.slice(0, -1)) {
            if (row.kind === "amount") running += row.amount;
            if (row.kind === "plus") running += row.amount;
            if (row.kind === "less") running -= row.amount;
          }
          expect(running, id).toBeCloseTo(rows.at(-1)!.amount, 6);
        }
      });
    }
  }
});

describe("deductions and income types", () => {
  it("an RRSP contribution lowers taxable income one for one", () => {
    const a = run({ employmentIncome: 80_000 });
    const b = run({ employmentIncome: 80_000, rrspContribution: 10_000 });
    expect(b.taxableIncome).toBeCloseTo(a.taxableIncome - 10_000, 6);
    expect(b.contributions.total).toBe(a.contributions.total);
  });

  it("an RRSP deduction can't push taxable income below zero", () => {
    const r = run({ employmentIncome: 5_000, rrspContribution: 50_000 });
    expect(r.taxableIncome).toBe(0);
    expect(r.deductions.rrsp).toBeLessThan(5_000);
  });

  it("FHSA deduction is capped at the annual limit plus carry-forward", () => {
    const r = run({ employmentIncome: 120_000, fhsaContribution: 50_000 });
    expect(r.deductions.fhsa).toBe(16_000);
  });

  it("half of capital gains are taxable and they carry no CPP or EI", () => {
    const r = run({ capitalGains: 100_000 });
    expect(r.totalIncome).toBe(50_000);
    expect(r.contributions.total).toBe(0);
    expect(r.cashIncome).toBe(100_000);
  });

  it("dividends are grossed up for tax but not for take-home pay", () => {
    const r = run({ eligibleDividends: 10_000, ineligibleDividends: 10_000 });
    expect(r.totalIncome).toBeCloseTo(13_800 + 11_500, 6);
    expect(r.cashIncome).toBe(20_000);
  });

  it("dividends are taxed less than the same amount of interest", () => {
    const div = run({ eligibleDividends: 50_000 });
    const interest = run({ otherIncome: 50_000 });
    expect(div.incomeTax).toBeLessThan(interest.incomeTax);
  });

  it("negative or non-numeric inputs are treated as zero", () => {
    const r = run({ employmentIncome: -5_000, otherIncome: Number.NaN });
    expect(r.totalTax).toBe(0);
  });
});
