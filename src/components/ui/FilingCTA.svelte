<script lang="ts">
  import { filingPartner, partnerRel, type Partner } from "../../lib/affiliates";

  let {
    heading = "Ready to file?",
    body = "",
    action = "",
    partner = filingPartner,
  }: { heading?: string; body?: string; action?: string; partner?: Partner } = $props();
</script>

<aside class="sheet p-5 border-l-4 border-l-provincial rounded-l-[3px]">
  <p class="font-bold text-ink">{heading}</p>
  <p class="text-ink-2 text-[0.95rem] mt-1">
    {body || `Enter the same numbers in ${partner.name} to file your federal and provincial return online.`}
  </p>
  <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
    <a class="btn btn-quiet" href={partner.url} target="_blank" rel={partnerRel(partner)}>
      {action || `Open ${partner.name}`}
    </a>
  </div>
  {#if partner.disclosure}
    <p class="text-xs text-ink-3 mt-2">{partner.disclosure}</p>
  {/if}
</aside>
