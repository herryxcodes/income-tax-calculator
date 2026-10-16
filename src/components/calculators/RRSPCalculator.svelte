<script lang="ts">
  import {
    calculateTax,
    emptyInput,
    formatCurrency,
    formatPercent,
    getTaxYear,
    DEFAULT_TAX_YEAR,
  } from "../../lib/tax-engine";
  import BlankMoney from "../ui/BlankMoney.svelte";
  import BlankSelect from "../ui/BlankSelect.svelte";
  import YearToggle from "../ui/YearToggle.svelte";
  import FilingCTA from "../ui/FilingCTA.svelte";
  import { investingPartner } from "../../lib/affiliates";

  let year = $state(DEFAULT_TAX_YEAR);
  let income = $state(0);
  let rrspContribution = $state(0);
  let provinceSlug = $state("ontario");
  let showComparison = $state(false);

  let yearData = $derived(getTaxYear(year));
  let provinceOptions = $derived(yearData.provinces.map((p) => ({ value: p.slug, label: p.name })));

  const run = (slug: string, rrsp: number) =>
    calculateTax({ ...emptyInput(slug, year), employmentIncome: income, rrspContribution: rrsp });

  let without = $derived(run(provinceSlug, 0));
  let withRrsp = $derived(run(provinceSlug, rrspContribution));
  let savings = $derived(without.totalTax - withRrsp.totalTax);
  let realCost = $derived(rrspContribution - savings);
  let effectiveRate = $derived(rrspContribution > 0 ? savings / rrspContribution : 0);

  let estimatedLimit = $derived(Math.min(yearData.limits.rrsp, Math.round(income * 0.18)));
  let overEstimate = $derived(income > 0 && rrspContribution > estimatedLimit);
  let ready = $derived(income > 0 && rrspContribution > 0);

  let comparison = $derived(
    showComparison && ready
      ? yearData.provinces
          .map((p) => {
            const a = run(p.slug, 0);
            const b = run(p.slug, rrspContribution);
            return { province: p, savings: a.totalTax - b.totalTax, marginal: a.marginalRate };
          })
          .sort((a, b) => b.savings - a.savings)
      : []
  );
  let bestSavings = $derived(comparison[0]?.savings ?? 0);
</script>

<div>
  <YearToggle bind:year />

  <div class="mt-8">
    <p class="blank-sentence text-ink">
      I earn <BlankMoney bind:value={income} id="income" label="Yearly employment income" placeholder="90,000" /> a year
      in <BlankSelect bind:value={provinceSlug} id="province" label="Province or territory" options={provinceOptions} />
      and put <BlankMoney bind:value={rrspContribution} id="rrsp" label="RRSP contribution" placeholder="10,000" /> in my RRSP.
    </p>
    <div aria-live="polite">
      {#if ready}
        <p class="blank-sentence text-ink mt-3">My tax drops by {formatCurrency(savings)}.</p>
        <p class="text-lg sm:text-xl text-ink-2 mt-4 max-w-2xl">
          So the {formatCurrency(rrspContribution)} contribution really costs me {formatCurrency(realCost)}. Each dollar
          I put in saves about {Math.round(effectiveRate * 100)}¢ of tax.
        </p>
      {:else if income > 0}
        <p class="text-lg sm:text-xl text-ink-2 mt-4">Add an RRSP contribution to see how much tax it saves.</p>
      {:else}
        <p class="text-lg sm:text-xl text-ink-2 mt-4">Type your salary and a contribution amount to see your tax savings.</p>
      {/if}
    </div>
    {#if income > 0}
      <p class="mt-4 text-[0.95rem] {overEstimate ? 'text-alert font-bold' : 'text-ink-3'}">
        {#if overEstimate}
          That's more than 18% of this salary ({formatCurrency(estimatedLimit)}). Check your notice of assessment for your
          actual room before contributing; over-contributions above $2,000 are taxed 1% a month.
        {:else}
          Your {year} limit is 18% of last year's earned income, up to {formatCurrency(yearData.limits.rrsp)}, plus unused
          room carried forward. At this salary that's about {formatCurrency(estimatedLimit)} of new room.
        {/if}
      </p>
    {/if}
  </div>

  {#if ready}
    <div class="mt-12 grid gap-8 lg:grid-cols-12">
      <div class="lg:col-span-7 sheet">
        <h2 class="px-6 pt-5 pb-3 font-extrabold text-lg text-ink border-b border-rule-soft">Before and after the contribution</h2>
        <table class="w-full text-[0.95rem]">
          <thead>
            <tr class="text-left text-ink-2">
              <th class="py-2.5 px-6 font-normal"><span class="sr-only">Item</span></th>
              <th class="py-2.5 px-3 font-bold text-right">Without RRSP</th>
              <th class="py-2.5 px-6 font-bold text-right">With RRSP</th>
            </tr>
          </thead>
          <tbody class="figure">
            <tr class="border-t border-rule-soft">
              <th scope="row" class="py-2.5 px-6 text-left font-normal font-sans text-ink-2">Taxable income</th>
              <td class="py-2.5 px-3 text-right">{formatCurrency(without.taxableIncome)}</td>
              <td class="py-2.5 px-6 text-right">{formatCurrency(withRrsp.taxableIncome)}</td>
            </tr>
            <tr class="border-t border-rule-soft">
              <th scope="row" class="py-2.5 px-6 text-left font-normal font-sans text-ink-2">Federal tax</th>
              <td class="py-2.5 px-3 text-right">{formatCurrency(without.federalTax)}</td>
              <td class="py-2.5 px-6 text-right">{formatCurrency(withRrsp.federalTax)}</td>
            </tr>
            <tr class="border-t border-rule-soft">
              <th scope="row" class="py-2.5 px-6 text-left font-normal font-sans text-ink-2">{without.province.name} tax</th>
              <td class="py-2.5 px-3 text-right">{formatCurrency(without.provincialTax)}</td>
              <td class="py-2.5 px-6 text-right">{formatCurrency(withRrsp.provincialTax)}</td>
            </tr>
            <tr class="border-t border-rule-soft">
              <th scope="row" class="py-2.5 px-6 text-left font-normal font-sans text-ink-2">CPP/QPP and EI</th>
              <td class="py-2.5 px-3 text-right">{formatCurrency(without.contributions.total)}</td>
              <td class="py-2.5 px-6 text-right">{formatCurrency(withRrsp.contributions.total)}</td>
            </tr>
            <tr class="border-t-2 border-ink font-bold text-ink">
              <th scope="row" class="py-3 px-6 text-left font-sans">Tax savings</th>
              <td class="py-3 px-3"></td>
              <td class="py-3 px-6 text-right text-brand">{formatCurrency(savings)}</td>
            </tr>
          </tbody>
        </table>
        <p class="px-6 pb-5 text-sm text-ink-3">An RRSP deduction lowers income tax only; CPP and EI stay the same.</p>
      </div>

      <div class="lg:col-span-5 space-y-5">
        <div class="sheet p-6">
          <h2 class="font-extrabold text-lg text-ink">RRSP or TFSA?</h2>
          <p class="text-ink-2 mt-2 text-[0.95rem]">
            Your marginal rate today is {formatPercent(without.marginalRate, 1)}. An RRSP wins when your rate on
            withdrawals in retirement will be lower than that; a TFSA wins when it will be the same or higher, because
            TFSA withdrawals are never taxed.
            {#if without.marginalRate >= 0.3}
              At your rate, the RRSP deduction is usually worth taking.
            {:else if without.marginalRate > 0}
              At your rate it's closer, and many people split between the two.
            {/if}
          </p>
        </div>
        <button type="button" class="btn btn-primary w-full" onclick={() => (showComparison = !showComparison)} aria-expanded={showComparison}>
          {showComparison ? "Hide province comparison" : "Compare savings in every province"}
        </button>
        <FilingCTA
          heading="Where to hold the contribution"
          body="You can open an RRSP, FHSA or TFSA online with Wealthsimple. Your RRSP receipt then goes on line 20800 of your return."
          action="Open an account with Wealthsimple"
          partner={investingPartner}
        />
      </div>
    </div>
  {/if}

  {#if comparison.length}
    <section class="mt-12" aria-labelledby="rrsp-compare">
      <h2 id="rrsp-compare" class="font-extrabold text-2xl text-ink">Savings on {formatCurrency(rrspContribution)} in every province</h2>
      <p class="text-ink-2 mt-1">At a salary of {formatCurrency(income)} in {year}.</p>
      <div class="sheet mt-5 overflow-x-auto">
        <table class="w-full text-[0.95rem] min-w-[560px]">
          <thead>
            <tr class="text-left text-ink-2 border-b-2 border-ink">
              <th class="py-3 px-4 font-bold">Province or territory</th>
              <th class="py-3 px-4 font-bold">Tax savings</th>
              <th class="py-3 px-4 font-bold text-right">Real cost</th>
              <th class="py-3 px-4 font-bold text-right">Marginal rate</th>
            </tr>
          </thead>
          <tbody>
            {#each comparison as s (s.province.slug)}
              <tr class="border-b border-rule-soft last:border-b-0 {s.province.slug === provinceSlug ? 'bg-field font-bold' : ''}">
                <td class="py-2.5 px-4">{s.province.name}</td>
                <td class="py-2.5 px-4">
                  <div class="flex items-center gap-3">
                    <span class="figure w-20 shrink-0">{formatCurrency(s.savings)}</span>
                    <span class="hidden sm:block h-2 rounded-full bg-field-strong flex-1 min-w-16" aria-hidden="true">
                      <span class="block h-2 rounded-full bg-kept" style="width: {bestSavings > 0 ? ((s.savings / bestSavings) * 100).toFixed(1) : 0}%"></span>
                    </span>
                  </div>
                </td>
                <td class="py-2.5 px-4 text-right figure">{formatCurrency(rrspContribution - s.savings)}</td>
                <td class="py-2.5 px-4 text-right figure">{formatPercent(s.marginal, 1)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <p class="mt-10 max-w-3xl text-sm text-ink-3 leading-relaxed">
    Estimates for employment income for a single person under 65, using {year} rates{yearData.status === "projected" ? " (partly projected)" : ""}.
    Your actual refund depends on your other income, credits and the tax already withheld from your pay. Your numbers stay in your browser.
    <a class="underline" href="/disclaimer">Read the disclaimer</a>.
  </p>
</div>
