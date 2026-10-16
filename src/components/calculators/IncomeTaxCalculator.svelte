<script lang="ts">
  import { onMount } from "svelte";
  import {
    calculateTax,
    calculateAllProvinces,
    formatCurrency,
    formatPercent,
    getTaxYear,
    DEFAULT_TAX_YEAR,
    type TaxInput,
  } from "../../lib/tax-engine";
  import BlankMoney from "../ui/BlankMoney.svelte";
  import BlankSelect from "../ui/BlankSelect.svelte";
  import MoneyInput from "../ui/MoneyInput.svelte";
  import YearToggle from "../ui/YearToggle.svelte";
  import DollarSplit from "../ui/DollarSplit.svelte";
  import Worksheet from "../ui/Worksheet.svelte";
  import FilingCTA from "../ui/FilingCTA.svelte";

  let {
    initialProvince = "ontario",
    variant = "full",
  }: { initialProvince?: string; variant?: "full" | "widget" } = $props();

  let year = $state(DEFAULT_TAX_YEAR);
  let provinceSlug = $state(initialProvince);
  let employmentIncome = $state(0);
  let selfEmploymentIncome = $state(0);
  let otherIncome = $state(0);
  let capitalGains = $state(0);
  let eligibleDividends = $state(0);
  let ineligibleDividends = $state(0);
  let rrspContribution = $state(0);
  let fhsaContribution = $state(0);
  let showMore = $state(false);
  let showComparison = $state(false);
  let copied = $state(false);

  let yearData = $derived(getTaxYear(year));
  let provinceOptions = $derived(yearData.provinces.map((p) => ({ value: p.slug, label: p.name })));

  let input: TaxInput = $derived({
    employmentIncome,
    selfEmploymentIncome,
    otherIncome,
    capitalGains,
    eligibleDividends,
    ineligibleDividends,
    rrspContribution,
    fhsaContribution,
    provinceSlug,
    year,
  });
  let result = $derived(calculateTax(input));
  let hasIncome = $derived(result.cashIncome > 0);
  let otherTypesTotal = $derived(selfEmploymentIncome + otherIncome + capitalGains + eligibleDividends + ineligibleDividends);
  let comparison = $derived(
    showComparison ? calculateAllProvinces(input).sort((a, b) => b.afterTaxIncome - a.afterTaxIncome) : []
  );
  let bestTakeHome = $derived(comparison[0]?.afterTaxIncome ?? 0);
  let earned = $derived(employmentIncome + selfEmploymentIncome);
  let rrspEstimate = $derived(Math.min(yearData.limits.rrsp, Math.round(earned * 0.18)));

  const params: [string, (v: number) => void, () => number][] = [
    ["income", (v) => (employmentIncome = v), () => employmentIncome],
    ["se", (v) => (selfEmploymentIncome = v), () => selfEmploymentIncome],
    ["other", (v) => (otherIncome = v), () => otherIncome],
    ["gains", (v) => (capitalGains = v), () => capitalGains],
    ["ediv", (v) => (eligibleDividends = v), () => eligibleDividends],
    ["idiv", (v) => (ineligibleDividends = v), () => ineligibleDividends],
    ["rrsp", (v) => (rrspContribution = v), () => rrspContribution],
    ["fhsa", (v) => (fhsaContribution = v), () => fhsaContribution],
  ];

  onMount(() => {
    const q = new URLSearchParams(window.location.search);
    for (const [key, set] of params) {
      const n = Number(q.get(key));
      if (q.has(key) && Number.isFinite(n) && n > 0) set(n);
    }
    const y = Number(q.get("year"));
    if (yearData && getTaxYearSafe(y)) year = y;
    const prov = q.get("prov");
    if (prov && yearData.provinces.some((p) => p.slug === prov)) provinceSlug = prov;
    if (selfEmploymentIncome || otherIncome || capitalGains || eligibleDividends || ineligibleDividends) showMore = true;
  });

  function getTaxYearSafe(y: number) {
    try {
      return getTaxYear(y);
    } catch {
      return null;
    }
  }

  async function copyLink() {
    const q = new URLSearchParams();
    for (const [key, , get] of params) if (get()) q.set(key, String(get()));
    q.set("prov", provinceSlug);
    q.set("year", String(year));
    const url = `${window.location.origin}${window.location.pathname}?${q}`;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }
</script>

<div>
  <YearToggle bind:year />
  {#if yearData.status === "projected"}
    <p class="mt-3 max-w-2xl text-[0.95rem] text-ink-2 border-l-4 border-l-provincial pl-3">
      {yearData.statusNote}
    </p>
  {/if}

  <div class="mt-8">
    <p class="blank-sentence text-ink">
      I earn <BlankMoney bind:value={employmentIncome} id="salary" label="Yearly employment income" /> a year
      in <BlankSelect bind:value={provinceSlug} id="province" label="Province or territory" options={provinceOptions} />.
    </p>
    <div aria-live="polite">
      {#if hasIncome}
        <p class="blank-sentence text-ink mt-3">I take home {formatCurrency(result.afterTaxIncome)}.</p>
        <p class="text-lg sm:text-xl text-ink-2 mt-4 max-w-2xl">
          That's {formatCurrency(result.afterTaxIncome / 12)} a month, after {formatCurrency(result.totalTax)} in
          income tax and payroll contributions{otherTypesTotal > 0 ? `, counting the ${formatCurrency(otherTypesTotal)} of other income you added below` : ""}.
        </p>
      {:else}
        <p class="text-lg sm:text-xl text-ink-2 mt-4">Type your yearly salary to see your take-home pay.</p>
      {/if}
    </div>
  </div>

  {#if hasIncome}
    <DollarSplit {result} />
  {/if}

  {#if variant === "widget"}
    <p class="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
      <a
        class="btn btn-primary"
        target="_blank"
        rel="noopener"
        href={`https://calctax.ca/${provinceSlug}-income-tax-calculator?income=${employmentIncome}&prov=${provinceSlug}&year=${year}`}
      >See every line on CalcTax.ca</a>
      <span class="text-sm text-ink-3">Estimate for a single person with employment income only.</span>
    </p>
  {:else}
  <div class="mt-12 grid gap-10 lg:grid-cols-12">
    <div class="lg:col-span-5 space-y-6 lg:sticky lg:top-24 lg:self-start">
      <div>
        <h2 class="font-extrabold text-lg text-ink">Deductions</h2>
        <p class="text-ink-2 text-[0.95rem]">Contributions you can deduct lower your taxable income.</p>
      </div>

      <MoneyInput
        bind:value={rrspContribution}
        id="rrsp"
        label="RRSP contribution"
        tag="20800"
        hint={`Your limit is 18% of last year's earned income, up to ${formatCurrency(yearData.limits.rrsp)}, plus any unused room on your notice of assessment.`}
      >
        {#snippet action()}
          <button
            type="button"
            class="btn btn-quiet !rounded-[4px] !px-3"
            disabled={earned <= 0}
            onclick={() => (rrspContribution = rrspEstimate)}
            title="Fill in 18% of this year's earned income, up to the limit"
          >18%</button>
        {/snippet}
      </MoneyInput>

      <MoneyInput
        bind:value={fhsaContribution}
        id="fhsa"
        label="FHSA contribution"
        tag="20805"
        hint={`First Home Savings Account: up to ${formatCurrency(yearData.limits.fhsaAnnual)} a year, plus up to ${formatCurrency(yearData.limits.fhsaCarryForwardMax)} of unused room from last year.`}
      />

      <div class="border-t border-rule pt-5">
        <button
          type="button"
          class="flex items-center gap-2 font-extrabold text-lg text-ink"
          aria-expanded={showMore}
          aria-controls="more-income"
          onclick={() => (showMore = !showMore)}
        >
          <svg class="w-3.5 h-3.5 transition-transform motion-reduce:transition-none {showMore ? 'rotate-90' : ''}" viewBox="0 0 8 12" aria-hidden="true"><path d="M1.5 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" /></svg>
          Other income
        </button>
        <p class="text-ink-2 text-[0.95rem] mt-1">Side business, investments, rental or pension income.</p>
      </div>

      {#if showMore}
        <div id="more-income" class="space-y-5">
          <MoneyInput
            bind:value={selfEmploymentIncome}
            id="se"
            label="Self-employment income (after expenses)"
            tag="13500"
            hint="Freelance, gig or side-business profit. You pay both halves of CPP on it."
          />
          <MoneyInput bind:value={capitalGains} id="gains" label="Capital gains" tag="12700" hint="Enter the full gain. Half of it is taxable." />
          <MoneyInput bind:value={eligibleDividends} id="ediv" label="Eligible dividends" hint="The actual amount received, usually from public Canadian companies (T5 box 24)." />
          <MoneyInput bind:value={ineligibleDividends} id="idiv" label="Other than eligible dividends" hint="Usually from private corporations (T5 box 10)." />
          <MoneyInput bind:value={otherIncome} id="other" label="Interest, rental and other income" hint="Fully taxable income with no CPP or EI, such as interest, net rental income or pension." />
          <p class="text-sm text-ink-2">
            Running a business? The <a class="text-brand underline" href="/self-employed-tax-calculator">self-employed calculator</a>
            works from revenue and expenses and estimates your instalments.
          </p>
        </div>
      {/if}
    </div>

    <div class="lg:col-span-7 space-y-5">
      {#if hasIncome}
        <Worksheet {result} />
        <div class="flex flex-wrap gap-3">
          <button type="button" class="btn btn-primary" onclick={() => (showComparison = !showComparison)} aria-expanded={showComparison}>
            {showComparison ? "Hide province comparison" : "Compare all provinces"}
          </button>
          <button type="button" class="btn btn-quiet" onclick={copyLink}>
            {copied ? "Link copied" : "Copy link to this calculation"}
          </button>
        </div>
        <FilingCTA />
      {:else}
        <div class="sheet p-8 border-dashed">
          <p class="font-bold text-ink">Your return will appear here, line by line.</p>
          <p class="text-ink-2 mt-1">
            Each amount is tagged with the CRA line or T4 box it comes from, so you can check it against your own slips.
          </p>
        </div>
      {/if}
    </div>
  </div>

  {#if showComparison && comparison.length}
    <section class="mt-12" aria-labelledby="compare-heading">
      <h2 id="compare-heading" class="font-extrabold text-2xl text-ink">The same income in every province</h2>
      <p class="text-ink-2 mt-1">Sorted by take-home pay for {year}. Select a province to switch to it.</p>
      <div class="sheet mt-5 overflow-x-auto">
        <table class="w-full text-[0.95rem] min-w-[640px]">
          <thead>
            <tr class="text-left text-ink-2 border-b-2 border-ink">
              <th class="py-3 px-4 font-bold">Province or territory</th>
              <th class="py-3 px-4 font-bold">Take-home</th>
              <th class="py-3 px-4 font-bold text-right">Tax and contributions</th>
              <th class="py-3 px-4 font-bold text-right">Average</th>
              <th class="py-3 px-4 font-bold text-right">Marginal</th>
            </tr>
          </thead>
          <tbody>
            {#each comparison as r (r.province.slug)}
              {@const selected = r.province.slug === provinceSlug}
              <tr class="border-b border-rule-soft last:border-b-0 {selected ? 'bg-field' : ''}">
                <td class="py-2.5 px-4">
                  <button
                    type="button"
                    class="text-left {selected ? 'font-bold text-ink' : 'text-brand underline decoration-brand/30 hover:decoration-brand'}"
                    onclick={() => (provinceSlug = r.province.slug)}
                    aria-current={selected ? "true" : undefined}
                  >{r.province.name}</button>
                </td>
                <td class="py-2.5 px-4">
                  <div class="flex items-center gap-3">
                    <span class="figure w-24 shrink-0">{formatCurrency(r.afterTaxIncome)}</span>
                    <span class="hidden sm:block h-2 rounded-full bg-field-strong flex-1 min-w-16" aria-hidden="true">
                      <span class="block h-2 rounded-full bg-kept" style="width: {((r.afterTaxIncome / bestTakeHome) * 100).toFixed(1)}%"></span>
                    </span>
                  </div>
                </td>
                <td class="py-2.5 px-4 text-right figure">{formatCurrency(r.totalTax)}</td>
                <td class="py-2.5 px-4 text-right figure">{formatPercent(r.averageRate, 1)}</td>
                <td class="py-2.5 px-4 text-right figure">{formatPercent(r.marginalRate, 1)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {/if}

  {#if variant === "full"}
  <p class="mt-10 max-w-3xl text-sm text-ink-3 leading-relaxed">
    Estimates for a single person under 65 with no dependants, using {year} rates{yearData.status === "projected" ? " (partly projected)" : ""}.
    Includes the basic personal amount, Canada employment amount, CPP/QPP and EI credits, the dividend tax credit,
    provincial surtaxes, health premiums and low-income reductions. It doesn't include other credits such as tuition,
    medical expenses, donations or amounts for a spouse or dependants. Your numbers stay in your browser.
    <a class="underline" href="/disclaimer">Read the disclaimer</a>.
  </p>
  {/if}
</div>
