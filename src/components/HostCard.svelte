<script lang="ts">
  import type { Host } from "../lib/fleet";
  import { ago, span } from "../lib/format";
  import { hostPath } from "../lib/state.svelte";
  import Icon from "./Icon.svelte";
  import Pill from "./Pill.svelte";
  import Uptime from "./Uptime.svelte";
  import VersionPill from "./VersionPill.svelte";

  let { host, now }: { host: Host; now: number } = $props();

  const since = $derived(
    host.online
      ? host.booted
        ? `Up for ${span(now - host.booted)}`
        : "Up"
      : host.seen
        ? `Last seen ${ago(now - host.seen)}`
        : "Never seen",
  );
</script>

<article class="card" class:wrong={host.problems.length > 0} class:off={!host.online && !host.down}>
  <a class="cover" href={hostPath(host.name)} aria-label={host.name}></a>
  <div class="top">
    <span class="kind"><Icon name={host.kind} size={18} /></span>
    <div class="who">
      <h3 class="cut">{host.name}</h3>
      <p class="muted cut">{since}</p>
    </div>
    {#if host.online}
      <Pill tone="good" icon="check">{host.alwaysOn ? "Up" : "On"}</Pill>
    {:else if host.down}
      <Pill tone="bad" icon="x">Down</Pill>
    {:else}
      <Pill icon="minus">Off</Pill>
    {/if}
  </div>

  {#if host.history}
    <div class="history"><Uptime history={host.history} /></div>
  {/if}

  {#each host.problems as problem}
    <p class="problem">
      <Icon name="alert" size={15} />
      <span class="cut"><b>{problem.what}</b>{problem.detail ? ` ${problem.detail}` : ""}</span>
      {#if problem.since}<span class="for">{span(now - problem.since)}</span>{/if}
    </p>
  {/each}

  <div class="bottom">
    <VersionPill version={host.version} />
    <span class="links">
      {#each host.links as link}
        <a class="action" href={link.url} target="_blank" rel="noreferrer">{link.title}</a>
      {/each}
    </span>
  </div>
</article>

<style>
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding: 1rem 1.1rem;
    transition:
      box-shadow 0.15s,
      border-color 0.15s,
      transform 0.15s;
  }
  .card:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-up);
    transform: translateY(-1px);
    /* keeps the uptime tooltip above neighbouring cards */
    z-index: 5;
  }
  .card.wrong {
    border-color: color-mix(in srgb, var(--bad) 55%, var(--border));
  }
  .cover {
    position: absolute;
    inset: 0;
    border-radius: var(--radius);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .kind {
    display: grid;
    place-items: center;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 9px;
    background: var(--raised);
    color: var(--muted);
  }
  .wrong .kind {
    background: var(--bad-soft);
    color: var(--bad);
  }
  .who {
    flex: 1;
    min-width: 0;
  }
  h3 {
    font-size: 0.98rem;
    font-weight: 600;
  }
  .who p {
    font-size: 0.85rem;
  }
  .off h3 {
    color: var(--muted);
  }
  .history {
    position: relative;
    z-index: 1;
  }
  .problem {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.65rem;
    border-radius: 8px;
    background: var(--bad-soft);
    color: var(--bad);
    font-size: 0.86rem;
  }
  .problem + .problem {
    margin-top: -0.4rem;
  }
  .problem span:first-of-type {
    flex: 1;
  }
  .problem b {
    font-weight: 600;
  }
  .for {
    opacity: 0.75;
  }
  .bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: auto;
  }
  .links {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 0.35rem;
  }
</style>
