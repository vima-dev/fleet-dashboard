<script lang="ts">
  import type { Version } from "../lib/fleet";
  import Pill from "./Pill.svelte";

  let { version }: { version: Version } = $props();
  const edits = $derived("edited" in version && version.edited ? " · edited" : "");
</script>

{#if version.state === "current"}
  <Pill tone="good" icon="check" title="Runs the commit built for it">Current{edits}</Pill>
{:else if version.state === "behind"}
  <Pill tone={version.late ? "bad" : "warn"} icon="down" title="Built commits it doesn't run yet">
    {version.by} behind{edits}
  </Pill>
{:else if version.state === "apart"}
  <Pill tone="accent" icon="branch" title="Runs a commit that isn't on main: {version.rev.slice(0, 7)}">
    Not on main{edits}
  </Pill>
{:else if version.state === "ahead"}
  <Pill icon="up" title="Runs a newer commit than the one built for it">{version.by} ahead{edits}</Pill>
{:else}
  <Pill icon="minus" title="Hasn't reported what it runs yet">Unknown</Pill>
{/if}
