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

### Adding 2027

Add 2027 once the official numbers are out, rather than projecting them. A projected 2027 file was removed in October 2026; `git show be44a68:src/data/tax-rates/2027/index.ts` is a starting point, and its header comment lists which values were already confirmed.

| When | What | Where to find it |
|---|---|---|
| Mid-November 2026 | Federal brackets, BPA, Canada employment amount; NB, NT, NU, SK, YT, AB, ON amounts | CRA "Indexation adjustment for personal income tax and benefit amounts"; CRA T4127 (January 2027 edition) |
| Early November 2026 | CPP YMPE and YAMPE | CRA "CPP contribution rates, maximums and exemptions" |
| Late November 2026 | Quebec brackets, BPA, deduction for workers, HSF thresholds, QPP and QPIP rates | Quebec Ministère des Finances, "Parameters of the personal income tax system for 2027"; Retraite Québec; RQAP |
| Fall 2026 | Nova Scotia, Newfoundland and Labrador (including the NL low-income reduction amount) | Provincial finance departments; T4127 |
| After Oct 24, 2026 | BC (election could change 2027 rates) | BC Ministry of Finance |

Copy the 2026 file to `2027/index.ts`, update the values, add it to `TAX_YEARS`, add 2027 tests to `src/lib/tax-engine.test.ts`, and remove the temporary `/2027-canadian-tax-data` redirect from `public/_redirects`. If you publish a year before every figure is confirmed, set `status: "projected"` with a `statusNote`; the site then labels it as an estimate everywhere. When the 2026 filing season ends, move `DEFAULT_TAX_YEAR` to 2027.

## Blog

Posts in `src/content/blog/` cover the 2026 tax year and use year-free URLs (`/blog/ontario-income-tax`, not `-2025`), so each year you update the title, figures and `updatedDate` without changing the URL. Old `-2025` URLs are 301-redirected in `public/_redirects` (Cloudflare Pages). Take worked examples from the tax engine rather than calculating them by hand, so the blog matches the calculators.

## Tests

- `src/lib/tax-engine.test.ts` — golden values worked out by hand from the CRA and Revenu Québec forms, with the arithmetic in comments, plus top and mid-bracket marginal rates.
- `src/lib/tax-engine.invariants.test.ts` — checks that hold for every year and province: contiguous brackets, take-home pay that rises with salary, worksheet rows that reconcile to the totals.

## Partner links

All outbound partner links and their disclosures live in `src/lib/affiliates.ts`. See `MONETIZATION_AND_AFFILIATE_GUIDE.md` for the current state of each program.
