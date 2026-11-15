<script lang="ts">
  import Commits from "../components/Commits.svelte";
  import Icon from "../components/Icon.svelte";
  import Pill from "../components/Pill.svelte";
  import type { Fleet, Host } from "../lib/fleet";
  import { ago, count } from "../lib/format";
  import { hostPath } from "../lib/state.svelte";

  let { fleet }: { fleet: Fleet } = $props();

  const groups = ["All", "Servers", "Personal"] as const;
  let group = $state<(typeof groups)[number]>("All");
  let open = $state<Record<number, boolean>>({});

  const servers = $derived(fleet.hosts.filter((host) => host.alwaysOn));
  const current = $derived(servers.filter((host) => host.position === 0).length);
  const personal = $derived(fleet.hosts.filter((host) => !host.alwaysOn));
  const personalCurrent = $derived(personal.filter((host) => host.position === 0).length);
  const shown = $derived(
    fleet.hosts.filter((host) => group === "All" || host.alwaysOn === (group === "Servers")),
  );
  const apart = $derived(shown.filter((host) => host.version.state === "apart"));

  type Step = { at: number; hosts: Host[]; between: number };
  // commits that have hosts on them, newest first, with the number of commits skipped before each
  const steps = $derived.by(() => {
    const on = new Map<number, Host[]>([[0, []]]);
    for (const p of fleet.built) if (!on.has(p)) on.set(p, []);
    for (const host of shown) {
      if (host.position != null) on.set(host.position, [...(on.get(host.position) ?? []), host]);
    }
    const result: Step[] = [];
    let previous = -1;
    for (const at of [...on.keys()].sort((a, b) => a - b)) {
      result.push({ at, hosts: on.get(at)!, between: at - previous - 1 });
      previous = at;
    }
    return result;
  });
</script>

<h1>Updates</h1>

{#if !fleet.commits.length}
  <p class="muted">The commits of main aren't fetched yet.</p>
{:else}
  <div class="stages">
    <div class="card stage">
      <span class="muted">Pushed</span>
      <a
        class="cut pushed"
        href="{fleet.repository}/commit/{fleet.commits[0].rev}"
        title={fleet.commits[0].subject}
        target="_blank"
        rel="noreferrer"
      >
        {fleet.commits[0].subject}
      </a>
      <span class="muted">{fleet.commits[0].author} · {ago(fleet.now - fleet.commits[0].time)}</span>
    </div>
    <span class="then"><Icon name="arrow" /></span>
    <div class="card stage">
      <span class="muted">Built</span>
      {#if !fleet.built.includes(0)}
        <b>Not yet</b>
      {:else if fleet.unbuilt.length}
        <b>{fleet.buildable - fleet.unbuilt.length} of {count(fleet.buildable, "host")}</b>
        <span class="muted cut" title={fleet.unbuilt.join(", ")}>Missing: {fleet.unbuilt.join(", ")}</span>
      {:else}
        <b class="good"><Icon name="check" />Every host</b>
      {/if}
    </div>
    <span class="then"><Icon name="arrow" /></span>
    <div class="card stage">
      <span class="muted">Running</span>
      <b>{current} of {count(servers.length, "server")}</b>
      <span class="muted">{personalCurrent} of {count(personal.length, "personal machine")}</span>
    </div>
  </div>

  <div class="section">
    <h2>Where each host is</h2>
    <div class="switch">
      {#each groups as g}
        <button class:on={group === g} onclick={() => (group = g)}>{g}</button>
      {/each}
    </div>
  </div>

  <div class="card line">
    {#if apart.length}
      <div class="step apart">
        <span class="point"></span>
        <div class="body">
          <div class="hosts">
            {#each apart as host}<a class="chip" href={hostPath(host.name)}>{host.name}</a>{/each}
          </div>
          <span class="muted">On commits that aren't on main</span>
        </div>
      </div>
    {/if}
    {#each steps as step (step.at)}
      {#if step.between}
        <div class="step gap">
          <span class="point"></span>
          <div class="body">
            <button class="more" onclick={() => (open[step.at] = !open[step.at])}>
              {count(step.between, "commit")} in between
            </button>
            {#if open[step.at]}
              <Commits commits={fleet.commits.slice(step.at - step.between, step.at)} now={fleet.now} repository={fleet.repository} />
            {/if}
          </div>
        </div>
      {/if}
      <div class="step">
        <span class="point"></span>
        <div class="body">
          <div class="commit">
            <a
              class="subject cut"
              href="{fleet.repository}/commit/{fleet.commits[step.at].rev}"
              title={fleet.commits[step.at].subject}
              target="_blank"
              rel="noreferrer"
            >
              {fleet.commits[step.at].subject}
            </a>
            <span class="muted by">{fleet.commits[step.at].author} · {ago(fleet.now - fleet.commits[step.at].time)}</span>
            {#if step.at === 0}<Pill>newest</Pill>{/if}
            {#if fleet.built.includes(step.at)}<Pill tone="good" icon="check">built</Pill>{/if}
          </div>
          <div class="hosts">
            {#each step.hosts as host}<a class="chip" href={hostPath(host.name)}>{host.name}</a>{/each}
            {#if !step.hosts.length}<span class="muted">No host</span>{/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  h1 {
    font-size: 1.6rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    margin-bottom: 1.25rem;
  }
  .stages {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 0.6rem;
    align-items: stretch;
  }
  .then {
    align-self: center;
  }
  .stage {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    padding: 0.9rem 1.1rem;
  }
  .stage span {
    font-size: 0.82rem;
  }
  .pushed {
    font-size: 1.02rem;
    font-weight: 600;
  }
  .pushed:hover {
    text-decoration: underline;
  }
  .stage b {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 1.02rem;
    font-weight: 600;
  }
  .good {
    color: var(--good);
  }
  .then {
    display: grid;
    color: var(--faint);
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

  .line {
    padding: 0.5rem 0;
  }
  .step {
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr);
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.7rem 1.1rem 0.7rem 0;
  }
  .point {
    position: relative;
  }
  .point::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(50% - 1px);
    border-left: 2px solid var(--border);
  }
  .step:first-child .point::before {
    top: 1.2rem;
  }
  .step:last-child .point::before {
    bottom: calc(100% - 1.2rem);
  }
  .point::after {
    content: "";
    position: absolute;
    top: 1rem;
    left: calc(50% - 5px);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--surface);
  }
  .gap .point::before {
    border-left-style: dotted;
  }
  .gap .point::after,
  .apart .point::before {
    display: none;
  }
  .apart .point::after {
    background: var(--surface);
    box-shadow: inset 0 0 0 2px var(--faint);
  }
  .gap .body {
    padding-block: 0.15rem;
  }
  .more {
    align-self: flex-start;
    padding: 0.1rem 0;
    border: 0;
    background: none;
    color: var(--muted);
    font-size: 0.86rem;
    cursor: pointer;
  }
  .more:hover {
    color: var(--text);
  }
  .commit {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }
  .subject {
    font-weight: 550;
  }
  .subject:hover {
    text-decoration: underline;
  }
  .by {
    font-size: 0.86rem;
    white-space: nowrap;
  }
  .hosts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .chip {
    padding: 0.1rem 0.6rem;
    border-radius: 99px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 0.86rem;
    font-weight: 550;
    transition: box-shadow 0.12s;
  }
  .chip:hover {
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  @media (max-width: 52rem) {
    .stages {
      grid-template-columns: 1fr;
    }
    .then {
      display: none;
    }
    .commit {
      flex-wrap: wrap;
    }
  }
</style>
