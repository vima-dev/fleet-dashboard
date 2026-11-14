<script lang="ts">
  import { app } from "./lib/state.svelte";
  import HostPage from "./pages/HostPage.svelte";
  import Overview from "./pages/Overview.svelte";
  import Updates from "./pages/Updates.svelte";

  const page = $derived(app.route[0] ?? "overview");
</script>

<header>
  <div class="bar">
    <a class="logo" href="#/" aria-label="vima."></a>
    <nav>
      <a href="#/" class:here={page === "overview" || page === "host"}>Overview</a>
      <a href="#/updates" class:here={page === "updates"}>Updates</a>
    </nav>
    {#if app.failed}<span class="failed">Can't refresh</span>{/if}
  </div>
</header>

<main>
  {#if !app.fleet}
    <p class="muted wait">{app.failed ? "Can't load the fleet." : "Loading…"}</p>
  {:else if page === "host"}
    <HostPage fleet={app.fleet} name={app.route[1]} />
  {:else if page === "updates"}
    <Updates fleet={app.fleet} />
  {:else}
    <Overview fleet={app.fleet} />
  {/if}
</main>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 20;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--page) 85%, transparent);
    backdrop-filter: blur(10px);
  }
  .bar,
  main {
    max-width: 78rem;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 2rem;
    height: 3.5rem;
  }
  .logo {
    width: 4.6rem;
    aspect-ratio: 203 / 60;
    background: linear-gradient(90deg, #003c65, #004884);
    mask: url(./assets/logo.svg) center / contain no-repeat;
  }
  @media (prefers-color-scheme: dark) {
    .logo {
      background: #fff;
    }
  }
  nav {
    display: flex;
    gap: 0.25rem;
    flex: 1;
  }
  nav a {
    padding: 0.3rem 0.7rem;
    border-radius: 7px;
    color: var(--muted);
    font-weight: 500;
    transition:
      background 0.12s,
      color 0.12s;
  }
  nav a:hover {
    color: var(--text);
  }
  nav a.here {
    background: var(--raised);
    color: var(--text);
  }
  .failed {
    color: var(--bad);
    font-size: 0.86rem;
    font-weight: 500;
  }
  main {
    padding-top: 2.25rem;
    padding-bottom: 5rem;
  }
  .wait {
    padding: 4rem 0;
    text-align: center;
  }
  @media (max-width: 40rem) {
    .bar,
    main {
      padding-inline: 1rem;
    }
    .bar {
      gap: 1rem;
    }
  }
</style>
