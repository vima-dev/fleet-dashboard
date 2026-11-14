<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon, { type IconName } from "./Icon.svelte";

  let {
    tone = "plain",
    icon,
    title,
    children,
  }: { tone?: "good" | "warn" | "bad" | "accent" | "plain"; icon?: IconName; title?: string; children: Snippet } = $props();
</script>

<span class="pill {tone}" {title}>
  {#if icon}<Icon name={icon} size={13} />{/if}
  {@render children()}
</span>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.1rem 0.55rem;
    border-radius: 99px;
    background: var(--raised);
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 550;
    white-space: nowrap;
  }
  .good {
    background: var(--good-soft);
    color: var(--good);
  }
  .warn {
    background: var(--warn-soft);
    color: var(--warn);
  }
  .bad {
    background: var(--bad-soft);
    color: var(--bad);
  }
  .accent {
    background: var(--accent-soft);
    color: var(--accent);
  }
</style>
