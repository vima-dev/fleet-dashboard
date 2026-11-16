<script lang="ts">
  import { post } from "../lib/api";
  import type { Host } from "../lib/fleet";
  import { refresh } from "../lib/state.svelte";
  import Icon from "./Icon.svelte";

  let { host }: { host: Host } = $props();

  // how long a host may take to boot or shut down before the button comes back
  const PATIENCE = 180000;

  let wanted = $state<{ online: boolean; until: number } | null>(null);
  let confirming = $state(false);
  let failed = $state(false);

  const pending = $derived(wanted != null && wanted.online !== host.online);

  $effect(() => {
    if (!pending) return;
    const timer = setInterval(() => {
      if (Date.now() > wanted!.until) wanted = null;
      else refresh();
    }, 5000);
    return () => clearInterval(timer);
  });

  $effect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => (confirming = false), 5000);
    return () => clearTimeout(timer);
  });

  const press = async () => {
    const on = !host.online;
    if (!on && !confirming) {
      confirming = true;
      return;
    }
    confirming = false;
    failed = false;
    wanted = { online: on, until: Date.now() + PATIENCE };
    try {
      await post(`power/${encodeURIComponent(host.name)}/${on ? "on" : "off"}`);
    } catch (e) {
      console.error(e);
      wanted = null;
      failed = true;
    }
  };
</script>

{#if failed}<span class="failed">Request failed</span>{/if}
<button class="action" class:confirming disabled={pending} onclick={press}>
  <Icon name="power" size={13} />
  {#if pending}
    {wanted!.online ? "Powering on…" : "Powering off…"}
  {:else if confirming}
    Confirm power off
  {:else}
    {host.online ? "Power off" : "Power on"}
  {/if}
</button>

<style>
  .confirming,
  .confirming:hover {
    border-color: var(--bad);
    background: var(--bad-soft);
    color: var(--bad);
  }
  button:disabled {
    cursor: default;
    opacity: 0.7;
  }
  .failed {
    align-self: center;
    color: var(--bad);
    font-size: 0.86rem;
  }
</style>
