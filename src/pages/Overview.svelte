<script lang="ts">
  import HostCard from "../components/HostCard.svelte";
  import Icon from "../components/Icon.svelte";
  import Pill from "../components/Pill.svelte";
  import Uptime from "../components/Uptime.svelte";
  import type { Fleet } from "../lib/fleet";
  import { ago, count, span } from "../lib/format";
  import { hostPath } from "../lib/state.svelte";

  let { fleet }: { fleet: Fleet } = $props();

  const sorted = $derived([...fleet.hosts].sort((a, b) => Number(b.problems.length > 0) - Number(a.problems.length > 0)));
  const servers = $derived(sorted.filter((host) => host.alwaysOn));
  const personal = $derived(sorted.filter((host) => !host.alwaysOn));
  const fine = $derived(fleet.problems.length === 0);
  const newest = $derived(fleet.commits[0]);
  const current = $derived(servers.filter((host) => host.version.state === "current").length);
</script>

<section class="hero" class:fine>
  <span class="mark"><Icon name={fine ? "check" : "x"} size={26} /></span>
  <h1>{fine ? "Everything is fine" : `${count(fleet.problems.length, "problem")}`}</h1>
</section>

{#if !fine}
  <div class="card problems">
    {#each fleet.problems as problem}
      <svelte:element this={problem.host ? "a" : "div"} class="problem" href={problem.host && hostPath(problem.host)}>
        <span class="x"><Icon name="x" size={14} /></span>
        {#if problem.host}<b>{problem.host}</b>{/if}
        <span class="what cut">{problem.what}{#if problem.detail}<span class="muted">&nbsp;· {problem.detail}</span>{/if}</span>
        {#if problem.since}<span class="muted">{span(fleet.now - problem.since)}</span>{/if}
        {#if problem.host}<span class="go"><Icon name="arrow" size={15} /></span>{/if}
      </svelte:element>
    {/each}
  </div>
{/if}

{#if newest}
  <a class="card update" href="#/updates">
    <div class="latest">
      <span class="muted">Latest change</span>
      <b class="cut" title={newest.subject}>{newest.subject}</b>
    </div>
    <span class="muted">{ago(fleet.now - newest.time)}</span>
    {#if !fleet.built.includes(0)}
      <Pill>Not built yet</Pill>
    {:else if fleet.unbuilt.length}
      <Pill tone="warn">Built for {fleet.buildable - fleet.unbuilt.length}/{fleet.buildable}</Pill>
    {:else}
      <Pill tone="good" icon="check">Built</Pill>
    {/if}
    <Pill tone={current === servers.length ? "good" : "plain"}>{current}/{servers.length} servers</Pill>
    <span class="go"><Icon name="arrow" size={15} /></span>
  </a>
{/if}

<div class="section"><h2>Servers</h2></div>
<div class="grid">
  {#each servers as host (host.name)}
    <HostCard {host} now={fleet.now} />
  {/each}
</div>

<div class="section"><h2>Personal machines</h2></div>
<div class="grid">
  {#each personal as host (host.name)}
    <HostCard {host} now={fleet.now} />
  {/each}
</div>

<div class="section"><h2>Sites</h2></div>
<div class="card sites">
  {#each fleet.sites as site (site.url)}
    <a class="site" href={site.url} target="_blank" rel="noreferrer">
      <div class="name">
        <h3 class="cut">{site.title}<Icon name="out" size={13} /></h3>
        <p class="muted cut">{site.description ?? "Public"}{site.on ? ` · on ${site.on}` : ""}</p>
      </div>
      <div class="bars">
        {#if site.history}<Uptime history={site.history} />{/if}
      </div>
      {#if site.up == null}
        <Pill icon="minus" title="Behind the login, so it can't be checked from outside">Not checked</Pill>
      {:else if site.up}
        <Pill tone="good" icon="check">Up</Pill>
      {:else}
        <Pill tone="bad" icon="x">Down</Pill>
      {/if}
    </a>
  {/each}
</div>

<style>
  .hero {
    display: flex;
    align-items: center;
    gap: 1.1rem;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 50%;
    background: var(--bad-soft);
    color: var(--bad);
  }
  .fine .mark {
    background: var(--good-soft);
    color: var(--good);
  }
  h1 {
    font-size: 1.75rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .problems {
    margin-top: 1.25rem;
    overflow: hidden;
  }
  .problem {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.7rem 1.1rem;
    transition: background 0.12s;
  }
  .problem + .problem {
    border-top: 1px solid var(--border);
  }
  a.problem:hover,
  .update:hover {
    background: var(--raised);
  }
  .x {
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--bad-soft);
    color: var(--bad);
  }
  .what {
    flex: 1;
  }
  .go {
    display: grid;
    color: var(--faint);
  }

  .update {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    margin-top: 1.25rem;
    padding: 0.8rem 1.1rem;
    transition: background 0.12s;
  }
  .latest {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .latest span {
    font-size: 0.8rem;
  }
  .latest b {
    font-weight: 550;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr));
    gap: 0.9rem;
  }
  .site {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 18rem) 7rem;
    gap: 1.5rem;
    align-items: center;
    padding: 0.7rem 1.1rem;
    transition: background 0.12s;
  }
  .site + .site {
    border-top: 1px solid var(--border);
  }
  .site:hover {
    background: var(--raised);
  }
  .site:first-child {
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .site:last-child {
    border-radius: 0 0 var(--radius) var(--radius);
  }
  .site > :global(.pill) {
    justify-self: end;
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.95rem;
    font-weight: 600;
  }
  h3 :global(svg) {
    color: var(--faint);
  }
  .name p {
    font-size: 0.85rem;
  }
  @media (max-width: 40rem) {
    .update {
      flex-wrap: wrap;
    }
    .latest {
      flex-basis: 100%;
    }
    .site {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .bars {
      display: none;
    }
  }
</style>
