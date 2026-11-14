<script lang="ts" module>
  const paths = {
    check: "M5 12.5l4.5 4.5L19 7.5",
    x: "M6 6l12 12M18 6L6 18",
    down: "M12 5v14M6 13l6 6 6-6",
    branch: "M7 4v16M17 4v4a5 5 0 0 1-5 5H7",
    minus: "M6 12h12",
    alert: "M12 4.5l8.5 14.5h-17zM12 10v4M12 17h.01",
    arrow: "M5 12h14M13 6l6 6-6 6",
    back: "M19 12H5M11 6l-6 6 6 6",
    out: "M9 5H5v14h14v-4M13 5h6v6M19 5l-8 8",
    server: "M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01",
    desktop: "M3 5h18v11H3zM9 20h6M12 16v4",
    laptop: "M5 6h14v9H5zM2.5 18.5h19",
  };
  export type IconName = keyof typeof paths;
</script>

<script lang="ts">
  let { name, size = 16 }: { name: IconName; size?: number } = $props();
</script>

<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
  <path d={paths[name]} />
</svg>

<style>
  svg {
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
