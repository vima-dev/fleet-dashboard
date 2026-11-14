<script lang="ts">
  import type { History } from "../lib/fleet";
  import { clock, percent } from "../lib/format";

  // `days` groups pieces by day with a label underneath. For hourly data,
  // where a gap between every piece doesn't fit.
  let { history, days = false }: { history: History; days?: boolean } = $props();
  let hovered = $state<{ i: number; left: number } | null>(null);

  const startOf = (i: number) => history.start + i * history.piece;
  const groups = $derived.by(() => {
    const result: { day: string; pieces: number[] }[] = [];
    history.shares.forEach((_, i) => {
      const day = days ? new Date(startOf(i) * 1000).toLocaleDateString(undefined, { weekday: "short" }) : "";
      if (!result.length || result.at(-1)!.day !== day) result.push({ day, pieces: [] });
      result.at(-1)!.pieces.push(i);
    });
    return result;
  });

  const stateOf = (i: number) => {
    const share = history.shares[i];
    return share == null ? "none" : share > 0.999 ? "up" : "out";
  };

  const label = (i: number) => {
    const share = history.shares[i];
    const what = share == null ? "No data" : share > 0.999 ? "Up" : `Down ${percent(1 - share)} of the time`;
    return { when: `${clock(startOf(i), true)} – ${clock(startOf(i) + history.piece, false)}`, what };
  };

  const enter = (i: number, event: PointerEvent & { currentTarget: HTMLElement }) => {
    const piece = event.currentTarget.getBoundingClientRect();
    const whole = event.currentTarget.closest(".uptime")!.getBoundingClientRect();
    hovered = { i, left: piece.left - whole.left + piece.width / 2 };
  };
</script>

<div class="uptime" class:days role="img" aria-label="Uptime over the last 7 days" onpointerleave={() => (hovered = null)}>
  {#each groups as group}
    <div class="group" style:flex-grow={group.pieces.length}>
      <div class="pieces">
        {#each group.pieces as i, n}
          <!-- adjacent pieces with the same state are drawn as one block -->
          <span
            class="piece {stateOf(i)}"
            class:first={n === 0 || stateOf(i) !== stateOf(i - 1)}
            class:last={n === group.pieces.length - 1 || stateOf(i) !== stateOf(i + 1)}
            class:split={n > 0 && stateOf(i) !== stateOf(i - 1)}
            class:on={hovered?.i === i}
            role="presentation"
            onpointerenter={(event) => enter(i, event)}
          ></span>
        {/each}
      </div>
      {#if days}
        <!-- no label on partial days, it doesn't fit -->
        <span class="day">{group.pieces.length >= 8 ? group.day : ""}</span>
      {/if}
    </div>
  {/each}
  {#if hovered}
    {@const tip = label(hovered.i)}
    <div class="tip" style:left="{hovered.left}px">
      <b>{tip.what}</b>
      <span>{tip.when}</span>
    </div>
  {/if}
</div>

<style>
  .uptime {
    position: relative;
    display: flex;
  }
  .group {
    flex: 1 1 0;
    min-width: 0;
  }
  .pieces {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 18px;
  }
  .piece {
    flex: 1;
    height: 100%;
    border-radius: 2px;
    --tone: var(--good);
    background: color-mix(in srgb, var(--tone) 60%, transparent);
    transition: background 0.1s;
  }
  .piece.on {
    background: var(--tone);
  }
  /* shorter too, so the state is not shown by colour alone */
  .piece.out {
    --tone: var(--bad);
    height: 50%;
  }
  .piece.none {
    height: 3px;
    background: var(--border-strong);
  }

  .days {
    gap: 5px;
  }
  .days .pieces {
    gap: 0;
    height: 34px;
  }
  .days .piece {
    height: 100%;
    border-radius: 0;
  }
  .days .piece.first {
    border-radius: 4px 0 0 4px;
  }
  .days .piece.last {
    border-radius: 0 4px 4px 0;
  }
  .days .piece.first.last {
    border-radius: 4px;
  }
  .days .piece.split {
    margin-left: 3px;
  }
  .days .piece.none {
    background: var(--raised);
  }
  .day {
    display: block;
    min-height: 1.2rem;
    margin-top: 0.35rem;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .tip {
    position: absolute;
    bottom: calc(100% + 8px);
    z-index: 10;
    display: flex;
    flex-direction: column;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-up);
    font-size: 0.8rem;
    white-space: nowrap;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .tip span {
    color: var(--muted);
  }
</style>
