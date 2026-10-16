<script lang="ts">
  import {
    calculateTax,
    emptyInput,
    formatCurrency,
    formatRate,
    getTaxYear,
    DEFAULT_TAX_YEAR,
  } from "../../lib/tax-engine";
  import BlankMoney from "../ui/BlankMoney.svelte";
  import BlankSelect from "../ui/BlankSelect.svelte";
  import MoneyInput from "../ui/MoneyInput.svelte";
  import YearToggle from "../ui/YearToggle.svelte";
  import Worksheet from "../ui/Worksheet.svelte";
  import FilingCTA from "../ui/FilingCTA.svelte";

  let year = $state(DEFAULT_TAX_YEAR);
  let grossRevenue = $state(0);
  let businessExpenses = $state(0);
  let employmentIncome = $state(0);
  let rrspContribution = $state(0);
  let provinceSlug = $state("ontario");

  const GST_SMALL_SUPPLIER = 30000;

  let yearData = $derived(getTaxYear(year));
  let provinceOptions = $derived(yearData.provinces.map((p) => ({ value: p.slug, label: p.name })));
  let isQuebec = $derived(provinceSlug === "quebec");
  let plan = $derived(isQuebec ? yearData.qpp : yearData.cpp);
  let planName = $derived(isQuebec ? "QPP" : "CPP");

  let netIncome = $derived(Math.max(0, grossRevenue - businessExpenses));
  let result = $derived(
    calculateTax({
      ...emptyInput(provinceSlug, year),
      employmentIncome,
      selfEmploymentIncome: netIncome,
      rrspContribution,
    })
  );
  // Tax on the job alone is withheld by the employer; the rest is owed directly.
  let jobOnly = $derived(
    calculateTax({ ...emptyInput(provinceSlug, year), employmentIncome, rrspContribution })
  );
  let owedDirectly = $derived(employmentIncome > 0 ? result.totalTax - jobOnly.totalTax : result.totalTax);
  let instalmentThreshold = $derived(isQuebec ? 1800 : 3000);
  let setAsideRate = $derived(grossRevenue > 0 ? owedDirectly / grossRevenue : 0);

  let sePension = $derived(result.contributions.cpp1SelfEmployed + result.contributions.cpp2SelfEmployed);
  let ready = $derived(netIncome > 0);

  const longDate = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
  let instalmentDates = $derived(["03-15", "06-15", "09-15", "12-15"].map((md) => longDate(`${year}-${md}`)));
</script>

<div>
  <YearToggle bind:year />
  {#if yearData.status === "projected"}
    <p class="mt-3 max-w-2xl text-[0.95rem] text-ink-2 border-l-4 border-l-provincial pl-3">{yearData.statusNote}</p>
  {/if}

  <div class="mt-8">
    <p class="blank-sentence text-ink">
      My business brings in <BlankMoney bind:value={grossRevenue} id="revenue" label="Yearly business revenue" placeholder="80,000" />
      and costs <BlankMoney bind:value={businessExpenses} id="expenses" label="Yearly business expenses" placeholder="15,000" /> to run,
      in <BlankSelect bind:value={provinceSlug} id="province" label="Province or territory" options={provinceOptions} />.
    </p>
    <div aria-live="polite">
      {#if ready}
        <p class="blank-sentence text-ink mt-3">After tax and {planName}, I keep {formatCurrency(result.afterTaxIncome)}.</p>
        <p class="text-lg sm:text-xl text-ink-2 mt-4 max-w-2xl">
          Set aside about {Math.ceil(setAsideRate * 100)}% of every invoice for the CRA: {formatCurrency(owedDirectly)} for the year,
          or {formatCurrency(owedDirectly / 12)} a month.
        </p>
      {:else if grossRevenue > 0}
        <p class="text-lg sm:text-xl text-ink-2 mt-4">Your expenses cover your revenue, so there's no business profit to tax.</p>
      {:else}
        <p class="text-lg sm:text-xl text-ink-2 mt-4">Type your revenue and expenses to see what you owe and what to set aside.</p>
      {/if}
    </div>
  </div>

  <div class="mt-12 grid gap-10 lg:grid-cols-12">
    <div class="lg:col-span-5 space-y-6 lg:sticky lg:top-24 lg:self-start">
      <div>
        <h2 class="font-extrabold text-lg text-ink">Also have a job?</h2>
        <p class="text-ink-2 text-[0.95rem]">Employment income uses up part of your {planName} and tax brackets first.</p>
      </div>
      <MoneyInput bind:value={employmentIncome} id="t4" label="Employment income" tag="T4 14" hint="Leave blank if self-employment is your only income." />
      <MoneyInput
        bind:value={rrspContribution}
        id="se-rrsp"
        label="RRSP contribution"
        tag="20800"
        hint={`Up to 18% of last year's earned income, to a maximum of ${formatCurrency(yearData.limits.rrsp)}, plus unused room.`}
      />

      {#if ready}
        <section class="sheet p-6" aria-labelledby="both-halves">
          <h2 id="both-halves" class="font-extrabold text-lg text-ink">You pay both halves of {planName}</h2>
          <p class="text-ink-2 text-[0.95rem] mt-1">
            An employer would normally match an employee's {planName}. When you work for yourself you pay
            {formatRate((plan.baseRate + plan.firstAdditionalRate) * 2)} instead of {formatRate(plan.baseRate + plan.firstAdditionalRate)}
            on earnings from {formatCurrency(plan.basicExemption)} to {formatCurrency(plan.ympe)}, plus
            {formatRate(plan.secondAdditionalRate * 2)} up to {formatCurrency(plan.yampe)}.
          </p>
          <dl class="mt-4 text-[0.95rem]">
            <div class="flex justify-between py-1.5">
              <dt class="text-ink-2">Your half</dt>
              <dd class="figure">{formatCurrency(sePension / 2)}</dd>
            </div>
            <div class="flex justify-between py-1.5">
              <dt class="text-ink-2">The employer half</dt>
              <dd class="figure">{formatCurrency(sePension / 2)}</dd>
            </div>
            <div class="flex justify-between py-2 border-t-2 border-ink font-bold text-ink mt-1">
              <dt>{planName} on your business income</dt>
              <dd class="figure">{formatCurrency(sePension)}</dd>
            </div>
          </dl>
          <p class="text-sm text-ink-3 mt-3">
            The employer half and the enhanced part of your half are deducted on line 22200, and the rest of your half
            earns a tax credit, so {planName} also lowers your income tax.
          </p>
        </section>
      {/if}
    </div>

    <div class="lg:col-span-7 space-y-5">
      {#if ready}
        <Worksheet {result} />

        <section class="sheet p-6" aria-labelledby="instalments">
          <h2 id="instalments" class="font-extrabold text-lg text-ink">Quarterly instalments</h2>
          {#if owedDirectly > instalmentThreshold}
            <p class="text-ink-2 text-[0.95rem] mt-1">
              With no tax withheld on your business income, you'd owe about {formatCurrency(owedDirectly)}. When what you
              owe is over {formatCurrency(instalmentThreshold)} this year and was also over it in either of the two previous
              years, the CRA expects instalments of roughly:
            </p>
            <ul class="mt-4 grid grid-cols-2 gap-2">
              {#each instalmentDates as date (date)}
                <li class="flex justify-between bg-field rounded-[4px] px-3 py-2 text-[0.95rem]">
                  <span class="text-ink-2">{date}</span>
                  <span class="figure font-bold">{formatCurrency(owedDirectly / 4)}</span>
                </li>
              {/each}
            </ul>
            {#if isQuebec}
              <p class="text-sm text-ink-3 mt-3">In Quebec, provincial instalments are paid separately to Revenu Québec.</p>
            {/if}
          {:else}
            <p class="text-ink-2 text-[0.95rem] mt-1">
              You'd owe about {formatCurrency(owedDirectly)}, under the {formatCurrency(instalmentThreshold)} instalment
              threshold, so you can pay it all when you file.
            </p>
          {/if}
        </section>

        <section class="sheet p-6 border-l-4 {grossRevenue > GST_SMALL_SUPPLIER ? 'border-l-alert' : 'border-l-ok'} rounded-l-[3px]" aria-labelledby="gst">
          <h2 id="gst" class="font-extrabold text-lg text-ink">{isQuebec ? "GST and QST" : "GST/HST"} registration</h2>
          <p class="text-ink-2 text-[0.95rem] mt-1">
            {#if grossRevenue > GST_SMALL_SUPPLIER}
              Your revenue is over {formatCurrency(GST_SMALL_SUPPLIER)}. Once you pass that in any four consecutive
              quarters, you must register and start charging {isQuebec ? "GST and QST" : "GST/HST"}.
            {:else}
              Under {formatCurrency(GST_SMALL_SUPPLIER)} in four consecutive quarters, registering is optional. You can
              still register voluntarily to claim back tax on your expenses.
            {/if}
          </p>
        </section>

        <section class="sheet p-6" aria-labelledby="deadlines">
          <h2 id="deadlines" class="font-extrabold text-lg text-ink">Deadlines for {year}</h2>
          <dl class="mt-3 text-[0.95rem]">
            <div class="flex justify-between gap-4 py-1.5">
              <dt class="text-ink-2">Pay any balance owing</dt>
              <dd class="font-bold text-right">{longDate(yearData.dates.balanceDue)}</dd>
            </div>
            <div class="flex justify-between gap-4 py-1.5 border-t border-rule-soft">
              <dt class="text-ink-2">File your return</dt>
              <dd class="font-bold text-right">{longDate(yearData.dates.selfEmployedDeadline)}</dd>
            </div>
          </dl>
          <p class="text-sm text-ink-3 mt-2">Interest on a balance owing starts after the payment date, even though the filing deadline is later.</p>
        </section>

        <FilingCTA heading="File your self-employed return" body="Wealthsimple Tax supports form T2125 for business income." />
      {:else}
        <div class="sheet p-8 border-dashed">
          <p class="font-bold text-ink">Your return will appear here, line by line.</p>
          <p class="text-ink-2 mt-1">You'll also see your {planName}, instalments and GST/HST status.</p>
        </div>
      {/if}
    </div>
  </div>

  <p class="mt-10 max-w-3xl text-sm text-ink-3 leading-relaxed">
    Estimates for a single person under 65 with no dependants, using {year} rates{yearData.status === "projected" ? " (partly projected)" : ""}.
    Assumes you don't opt in to EI special benefits. Your actual tax depends on all your income, deductions and credits.
    Your numbers stay in your browser. <a class="underline" href="/disclaimer">Read the disclaimer</a>.
  </p>
</div>
