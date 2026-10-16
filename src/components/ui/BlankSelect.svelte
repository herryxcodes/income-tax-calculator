<script lang="ts">
  // A dropdown inside a sentence. The visible text is a span sized to the
  // chosen option; the native select sits on top, transparent, so it keeps
  // native keyboard and screen-reader behaviour.
  let {
    value = $bindable(""),
    id,
    label,
    options,
  }: { value?: string; id: string; label: string; options: { value: string; label: string }[] } = $props();

  let current = $derived(options.find((o) => o.value === value)?.label ?? "");
</script>

<span class="blank-wrap relative">
  <span aria-hidden="true" class="text-brand">{current}</span><svg
    class="inline-block ml-[0.15em] w-[0.42em] h-[0.42em] align-middle text-brand"
    viewBox="0 0 12 8"
    aria-hidden="true"
  >
    <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" />
  </svg>
  <select
    {id}
    aria-label={label}
    bind:value
    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base"
  >
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</span>
