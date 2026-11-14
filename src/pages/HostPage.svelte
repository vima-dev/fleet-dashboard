<script lang="ts">
  import Chart from "../components/Chart.svelte";
  import Commits from "../components/Commits.svelte";
  import Icon from "../components/Icon.svelte";
  import Pill from "../components/Pill.svelte";
  import Uptime from "../components/Uptime.svelte";
  import VersionPill from "../components/VersionPill.svelte";
  import { hourly, usage, type Fleet, type History, type Points } from "../lib/fleet";
  import { ago, count, span } from "../lib/format";

  let { fleet, name }: { fleet: Fleet; name: string } = $props();

  const host = $derived(fleet.hosts.find((h) => h.name === name));
  const ranges = [
    { label: "24 hours", seconds: 86400 },
    { label: "7 days", seconds: 7 * 86400 },
  ];
  let seconds = $state(ranges[0].seconds);
  let load = $state<Record<"cpu" | "memory" | "disk", Points> | null>(null);
  let missing = $state(false);
  let uptime = $state<History | undefined>();

  $effect(() => {
    uptime = undefined;
    hourly(name).then(
      (result) => (uptime = result),
      () => {},
    );
  });

  $effect(() => {
    usage(name, seconds).then(
      (result) => (load = result),
      () => (load = null),
    );
  });
</script>

<a class="back muted" href="#/"><Icon name="back" size={15} />Overview</a>

{#if !host}
  <p class="muted">There is no host called {name}.</p>
{:else}
  <header>
    <span class="kind" class:wrong={host.problems.length > 0}><Icon name={host.kind} size={24} /></span>
    <div class="who">
      <h1>{host.name}</h1>
      <div class="pills">
        {#if host.online}
          <Pill tone="good" icon="check">{host.alwaysOn ? "Up" : "On"}</Pill>
        {:else if host.down}
          <Pill tone="bad" icon="x">Down</Pill>
        {:else}
          <Pill icon="minus">Off</Pill>
        {/if}
        <VersionPill version={host.version} />
      </div>
      <p class="muted facts">
        {#if host.online}
          {#if host.booted}Up for {span(fleet.now - host.booted)}{/if}
        {:else}
          Last seen {host.seen ? ago(fleet.now - host.seen) : "never"}
        {/if}
        {#if host.backup}· Last backup {ago(fleet.now - host.backup)}{/if}
      </p>
    </div>
    <div class="links">
      {#each host.links as link}
        <a class="action" href={link.url} target="_blank" rel="noreferrer">{link.title}<Icon name="out" size={13} /></a>
      {/each}
    </div>
  </header>

  {#if host.problems.length}
    <div class="card problems">
      {#each host.problems as problem}
        <div class="problem">
          <span class="x"><Icon name="x" size={14} /></span>
          <span class="what">{problem.what}{#if problem.detail}<span class="muted">&nbsp;· {problem.detail}</span>{/if}</span>
          {#if problem.since}<span class="muted">for {span(fleet.now - problem.since)}</span>{/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if host.alwaysOn && (uptime ?? host.history)}
    <div class="section"><h2>Uptime, last 7 days</h2></div>
    <div class="card pad"><Uptime history={(uptime ?? host.history)!} days={uptime != null} /></div>
  {/if}

  <div class="section">
    <h2>Load</h2>
    <div class="switch">
      {#each ranges as r}
        <button class:on={seconds === r.seconds} onclick={() => (seconds = r.seconds)}>{r.label}</button>
      {/each}
    </div>
  </div>
  <div class="charts">
    <Chart title="Processor" points={load?.cpu ?? []} withDay={seconds > 86400} />
    <Chart title="Memory" points={load?.memory ?? []} withDay={seconds > 86400} />
    <Chart title="Disk" points={load?.disk ?? []} withDay={seconds > 86400} />
  </div>

  {#if host.version.state === "behind"}
    <div class="section">
      <h2>{count(host.version.by, "commit")} behind</h2>
      <button class="action" onclick={() => (missing = !missing)}>{missing ? "Hide" : "Show"}</button>
    </div>
    {#if missing}
      <div class="card pad"><Commits commits={fleet.commits.slice(0, host.version.by)} now={fleet.now} repository={fleet.repository} /></div>
    {/if}
  {/if}

  {#if host.sites.length}
    <div class="section"><h2>Sites</h2></div>
    <div class="card sites">
      {#each host.sites as site}
        <a href={site.url} target="_blank" rel="noreferrer">
          <span class="what">{site.title}</span>
          {#if site.up == null}<Pill icon="minus">Not checked</Pill>
          {:else if site.up}<Pill tone="good" icon="check">Up</Pill>
          {:else}<Pill tone="bad" icon="x">Down</Pill>{/if}
        </a>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 1.25rem;
    font-size: 0.9rem;
  }
  .back:hover {
    color: var(--text);
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
  }
  .kind {
    display: grid;
    place-items: center;
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 14px;
    background: var(--raised);
    color: var(--muted);
  }
  .kind.wrong {
    background: var(--bad-soft);
    color: var(--bad);
  }
  .who {
    flex: 1;
  }
  h1 {
    font-size: 1.6rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }
  .pills,
  .links {
    display: flex;
    gap: 0.4rem;
  }
  .pills {
    margin-top: 0.3rem;
  }

  .problems {
    margin-top: 1.25rem;
    border-color: color-mix(in srgb, var(--bad) 55%, var(--border));
  }
  .problem,
  .sites a {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.7rem 1.1rem;
  }
  .problem + .problem,
  .sites a + a {
    border-top: 1px solid var(--border);
  }
  .sites a:hover {
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
    font-weight: 500;
  }

  .facts {
    margin-top: 0.4rem;
  }
  .pad {
    padding: 1rem 1.1rem;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
    gap: 0.9rem;
  }
  .switch {
    display: inline-flex;
    padding: 2px;
    border-radius: 8px;
    background: var(--raised);
  }
  .switch button {
    padding: 0.2rem 0.7rem;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--muted);
    font-size: 0.86rem;
    font-weight: 500;
    cursor: pointer;
  }
  .switch button.on {
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--text);
  }
  .sites {
    overflow: hidden;
  }
</style>
