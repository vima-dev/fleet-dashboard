<script lang="ts">
  import type { Commit } from "../lib/fleet";
  import { ago } from "../lib/format";

  let { commits, now, repository }: { commits: Commit[]; now: number; repository: string } = $props();
</script>

<ul>
  {#each commits as commit (commit.rev)}
    <li>
      <a class="cut" href="{repository}/commit/{commit.rev}" title={commit.subject} target="_blank" rel="noreferrer">{commit.subject}</a>
      <span class="muted by">{commit.author} · {ago(now - commit.time)}</span>
    </li>
  {/each}
</ul>

<style>
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    padding: 0.4rem 0;
  }
  li + li {
    border-top: 1px solid var(--border);
  }
  a:hover {
    text-decoration: underline;
  }
  .by {
    font-size: 0.86rem;
    white-space: nowrap;
  }
</style>
