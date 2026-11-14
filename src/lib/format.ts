const UNITS: [number, string][] = [
  [86400, "d"],
  [3600, "h"],
  [60, "m"],
];

/** Duration in its largest unit: 3d, 5h, 12m. */
export const span = (seconds: number): string => {
  for (const [size, unit] of UNITS) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n}${unit}`;
  }
  return "now";
};

export const ago = (seconds: number): string => {
  const s = span(seconds);
  return s === "now" ? "just now" : `${s} ago`;
};

export const count = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

export const percent = (share: number): string => `${Math.round(share * 100)}%`;

export const clock = (time: number, withDay: boolean): string =>
  new Date(time * 1000).toLocaleString(undefined, {
    ...(withDay ? { weekday: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
