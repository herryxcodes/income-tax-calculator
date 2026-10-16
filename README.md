# CalcTax

Free Canadian income tax calculators at [calctax.ca](https://calctax.ca): income tax for every province and territory, RRSP savings, and self-employment. Everything is calculated in the browser.

Built with Astro 6, Svelte 5 and Tailwind CSS 4. Node 22+.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npx vitest run     # tax engine tests
```

## How the calculation works

`src/lib/tax-engine.ts` follows the order of the T1 return and the provincial 428 forms for a single person under 65 with no dependants:

1. Total income (line 15000), with dividends grossed up and half of capital gains included.
2. Deductions: RRSP, FHSA, the enhanced part of CPP/QPP (line 22215), the self-employed CPP/QPP deduction (line 22200) and the QPIP self-employed deduction (line 22300).
3. Federal tax, minus non-refundable credits (basic personal amount with its high-income reduction, Canada employment amount, CPP/QPP base contributions, EI, QPIP) and the dividend tax credit, minus the 16.5% Quebec abatement.
4. Provincial tax with each province's credits, then Ontario's surtax, tax reduction, LIFT credit and health premium; low-income reductions in BC, NB, NL, NS and PEI; Manitoba's Family Tax Benefit; and Quebec's deduction for workers and Health Services Fund.
5. CPP/QPP (including CPP2), EI and QPIP.

`src/lib/worksheet.ts` turns a result into rows tagged with CRA line numbers and T4 boxes for the "line by line" view.

## Tax data

One file per year in `src/data/tax-rates/<year>/index.ts`, all following `src/data/tax-rates/types.ts`. The registry and the year the calculators open on (`DEFAULT_TAX_YEAR`) are in `src/data/tax-rates/index.ts`.

- **2025** and **2026** are final. 2026 values come from the CRA payroll formulas (T4127) and provincial publications, because the 2026 T1 forms come out in January 2027.
- **2027 is projected** (`status: "projected"`). The site labels it as an estimate everywhere. The header comment in `2027/index.ts` lists which values are already confirmed and how the rest were projected.

### Updating 2027 when official numbers are released

| When | What | Where to find it |
|---|---|---|
| Mid-November 2026 | Federal brackets, BPA, Canada employment amount; NB, NT, NU, SK, YT, AB, ON amounts | CRA "Indexation adjustment for personal income tax and benefit amounts"; CRA T4127 (January 2027 edition) |
| Early November 2026 | CPP YMPE and YAMPE | CRA "CPP contribution rates, maximums and exemptions" |
| Late November 2026 | Quebec brackets, BPA, deduction for workers, HSF thresholds, QPP and QPIP rates | Quebec Ministère des Finances, "Parameters of the personal income tax system for 2027"; Retraite Québec; RQAP |
| Fall 2026 | Nova Scotia, Newfoundland and Labrador (including the NL low-income reduction amount) | Provincial finance departments; T4127 |
| After Oct 24, 2026 | BC (election could change 2027 rates) | BC Ministry of Finance |

Then set `status: "final"`, remove `statusNote`, update the tests in `src/lib/tax-engine.test.ts` that cover 2027, and when the 2026 filing season ends move `DEFAULT_TAX_YEAR` to 2027.

To add 2028, copy the 2027 file, update the values, and add it to `TAX_YEARS`.

## Tests

- `src/lib/tax-engine.test.ts` — golden values worked out by hand from the CRA and Revenu Québec forms, with the arithmetic in comments, plus top and mid-bracket marginal rates.
- `src/lib/tax-engine.invariants.test.ts` — checks that hold for every year and province: contiguous brackets, take-home pay that rises with salary, worksheet rows that reconcile to the totals.

## Partner links

All outbound partner links and their disclosures live in `src/lib/affiliates.ts`. See `MONETIZATION_AND_AFFILIATE_GUIDE.md` for the current state of each program.
