<script lang="ts">
  import type { Points } from "../lib/fleet";
  import { clock, percent } from "../lib/format";

  let { title, points, withDay }: { title: string; points: Points; withDay: boolean } = $props();

  const HEIGHT = 120;
  let width = $state(300);
  let hovered = $state<number | null>(null);

  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * width : 0);
  const y = (share: number) => HEIGHT - 4 - Math.min(1, Math.max(0, share)) * (HEIGHT - 8);
  const line = $derived(points.map(([, share], i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(share).toFixed(1)}`).join(""));
  const last = $derived(points.at(-1));
  const shown = $derived(hovered != null ? points[hovered] : last);

  const move = (event: PointerEvent & { currentTarget: SVGSVGElement }) => {
    const left = event.clientX - event.currentTarget.getBoundingClientRect().left;
    hovered = Math.max(0, Math.min(points.length - 1, Math.round((left / width) * (points.length - 1))));
  };
</script>

<div class="card chart">
  <div class="head">
    <span class="muted">{title}</span>
    {#if shown}
      <span class="value">{percent(shown[1])}</span>
      <span class="muted when">{hovered != null ? clock(shown[0], withDay) : "now"}</span>
    {/if}
  </div>
  <div class="plot" bind:clientWidth={width}>
    {#if points.length}
      <svg {width} height={HEIGHT} onpointermove={move} onpointerleave={() => (hovered = null)} role="img" aria-label={title}>
        {#each [0.25, 0.5, 0.75] as share}
          <line class="grid" x1="0" x2={width} y1={y(share)} y2={y(share)} />
        {/each}
        <path class="area" d="{line}L{width},{HEIGHT}L0,{HEIGHT}Z" />
        <path class="line" d={line} />
        {#if hovered != null}
          <line class="cross" x1={x(hovered)} x2={x(hovered)} y1="0" y2={HEIGHT} />
          <circle cx={x(hovered)} cy={y(points[hovered][1])} r="4" />
        {/if}
      </svg>
    {:else}
      <p class="muted none">No data</p>
    {/if}
  </div>
</div>

<style>
  .chart {
    padding: 0.9rem 1.1rem 0.6rem;
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin-bottom: 0.5rem;
  }
  .value {
    margin-left: auto;
    font-size: 1.15rem;
    font-weight: 650;
  }
  .when {
    min-width: 4.5rem;
    font-size: 0.8rem;
    text-align: right;
  }
  .plot {
    height: 120px;
  }
  svg {
    display: block;
    cursor: crosshair;
    touch-action: none;
  }
  .grid {
    stroke: var(--border);
    stroke-dasharray: 2 4;
  }
  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .area {
    fill: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .cross {
    stroke: var(--border-strong);
  }
  circle {
    fill: var(--accent);
    stroke: var(--surface);
    stroke-width: 2;
  }
  .none {
    display: grid;
    place-items: center;
    height: 100%;
  }
</style>
