<script lang="ts">
  import { TAX_YEARS } from "../../data/tax-rates";

  let { year = $bindable() }: { year: number } = $props();
  const uid = $props.id();
</script>

<div class="flex flex-wrap items-center gap-3">
  <span class="text-sm font-bold text-ink-2" id="{uid}-year">Tax year</span>
  <div class="segmented" role="group" aria-labelledby="{uid}-year">
    {#each TAX_YEARS as y (y.year)}
      <button type="button" aria-pressed={year === y.year} onclick={() => (year = y.year)}>
        {y.year}{y.status === "projected" ? " (est.)" : ""}
      </button>
    {/each}
  </div>
</div>
