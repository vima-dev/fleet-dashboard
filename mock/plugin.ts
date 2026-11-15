import type { Plugin } from "vite";

// Fake data for `pnpm dev`: mocks config.json, commits.json and the Prometheus API.

const DAY = 86400;
const HOUR = 3600;

type Host = {
  kind: "server" | "desktop" | "laptop";
  online: boolean;
  seen?: number;
  booted?: number;
  backup?: number;
  /** number of commits behind main, or a rev that isn't on main */
  version?: number | string;
  edited?: boolean;
};

const fleet: Record<string, Host> = {
  nas: { kind: "server", online: true, booted: 12 * DAY, backup: 5 * HOUR, version: 0 },
  web: { kind: "server", online: true, booted: 3 * DAY, backup: 7 * HOUR, version: 0 },
  media: { kind: "server", online: true, booted: 40 * DAY, version: 0 },
  router: { kind: "server", online: true, booted: 9 * DAY, version: 0 },
  mail: { kind: "server", online: true, booted: 2 * HOUR, backup: 6 * HOUR, version: 0 },
  workstation: { kind: "desktop", online: true, booted: 5 * HOUR, version: 1, edited: true },
  thinkpad: { kind: "laptop", online: false, seen: 6 * DAY, booted: 7 * DAY, version: 31 },
  "gaming-pc": { kind: "desktop", online: true, booted: 26 * HOUR, version: "0123456789abcdef0123456789abcdef01234567" },
  "old-desktop": { kind: "desktop", online: false, seen: 2 * DAY, booted: 3 * DAY, version: 9 },
  framework: { kind: "laptop", online: false },
};

const sites = [
  { name: "tv.example.com", on: "media" },
  { name: "photos.example.com", on: "media" },
  { name: "mail.example.com", on: "mail" },
];

type Scenario = {
  /** changes to hosts of `fleet` */
  hosts?: Record<string, Partial<Host>>;
  alerts?: { alert: string; host: string; item?: string; since: number }[];
  /** past outages, as [host, hours ago, hours long] */
  outages?: [string, number, number][];
  /** how many commits the builder is behind main */
  builderBehind?: number;
  /** hosts the builder failed to build the latest commit for */
  unbuilt?: string[];
};

// SCENARIO picks one. To add a case, add an entry.
const scenarios: Record<string, Scenario> = {
  fine: {},
  problems: {
    hosts: {
      media: { online: false, seen: 3 * HOUR },
      router: { version: 28 },
    },
    alerts: [{ alert: "UnitFailed", host: "nas", item: "backup.service", since: 5 * HOUR }],
    outages: [
      ["mail", 110, 1],
      ["mail", 62, 3],
    ],
    unbuilt: ["old-desktop", "workstation"],
  },
  unbuilt: { builderBehind: 1 },
};

const name = process.env.SCENARIO ?? "problems";
if (!(name in scenarios)) throw new Error(`SCENARIO=${name}: expected one of ${Object.keys(scenarios).join(", ")}`);
const scenario = scenarios[name];
const hosts = Object.fromEntries(Object.entries(fleet).map(([host, h]) => [host, { ...h, ...scenario.hosts?.[host] }]));
const behind = scenario.builderBehind ?? 0;

const subjects = [
  "feat: back up the mail server, and keep a month of daily snapshots of it as well as the weekly ones",
  "fix: open the port the printer needs",
  "chore: update flake inputs",
  "feat: add a second disk to the pool",
  "refactor: split the desktop settings by program",
  "fix: start the sync only once the network is up",
  "feat: put the wiki behind the login",
  "docs: say how a restore works",
  "chore: update flake inputs",
  "fix: give the builds less memory",
  "feat: add the new laptop",
  "feat: rotate the logs weekly",
];
const hex = (i: number) => (((i + 1) * 2654435761) >>> 0).toString(16).padStart(8, "0").repeat(5);
const commits = (now: number) =>
  Array.from({ length: 120 }, (_, i) => ({
    rev: hex(i),
    time: Math.round(now - HOUR - i * 2.7 * HOUR),
    author: i % 3 ? "ann" : "ben",
    subject: subjects[i % subjects.length],
  }));

const vector = (rows: [Record<string, string>, number][], now: number) =>
  rows.map(([metric, value]) => ({ metric, value: [now, String(value)] }));

const instant = (expr: string, now: number) => {
  const all = Object.entries(hosts);
  const list = commits(now);
  const since = (field: "seen" | "booted" | "backup") =>
    vector(
      all
        .filter(([, h]) => h[field] != null || (field === "seen" && h.online))
        .map(([host, h]) => [{ instance: host }, now - (h[field] ?? 0)]),
      now,
    );
  if (expr.startsWith("up")) {
    return vector(
      all.map(([host, h]) => [{ instance: host, always_on: String(h.kind === "server") }, Number(h.online)]),
      now,
    );
  }
  if (expr.includes("node_time_seconds")) return since("seen");
  if (expr.includes("node_boot_time_seconds")) return since("booted");
  if (expr.includes("timer_last_trigger")) return since("backup");
  if (expr.includes("vima_revision")) {
    return vector(
      all.flatMap(([host, h]): [Record<string, string>, number][] => {
        if (h.version == null) return [];
        // a host can't run what the builder hasn't built
        const rev = typeof h.version === "string" ? h.version : list[h.version + behind].rev;
        return [
          [{ instance: host, rev: rev + (h.edited ? "-dirty" : "") }, now - (h.seen ?? 0)],
          // plus an older revision, to test that the latest one is picked
          [{ instance: host, rev: list[60].rev }, now - 30 * DAY],
        ];
      }),
      now,
    );
  }
  if (expr.includes("vima_builder_revision")) {
    return vector(
      all.map(([host]) => [{ host, rev: list[scenario.unbuilt?.includes(host) ? behind + 3 : behind].rev }, 1]),
      now,
    );
  }
  if (expr.includes("site_up")) {
    return vector(
      sites.map((site) => [{ name: site.name }, Number(hosts[site.on].online)]),
      now,
    );
  }
  return [];
};

const noise = (seed: number) => {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
};

const overTime = (expr: string, start: number, end: number, step: number) => {
  const times = Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, i) => start + i * step);
  const series = (metric: Record<string, string>, at: (time: number) => number) => ({
    metric,
    values: times.map((time) => [time, String(at(time))]),
  });
  // share of the step before `time` that `host` was up
  const up = (host: string, time: number) => {
    const down = [...(scenario.outages ?? []), ...(hosts[host].online ? [] : [[host, hosts[host].seen! / HOUR, Infinity]])]
      .filter(([h]) => h === host)
      .map(([, ago, long]) => [end - Number(ago) * HOUR, end - (Number(ago) - Number(long)) * HOUR])
      .reduce((sum, [from, to]) => sum + Math.max(0, Math.min(to, time) - Math.max(from, time - step)), 0);
    return 1 - down / step;
  };
  if (expr.includes("site_up")) return sites.map((site) => series({ name: site.name }, (time) => up(site.on, time)));
  if (expr.includes("avg_over_time(up")) {
    return Object.entries(hosts)
      .filter(([, h]) => h.kind === "server")
      .map(([host]) => series({ instance: host }, (time) => up(host, time)));
  }
  const base = expr.includes("cpu") ? 0.18 : expr.includes("Mem") ? 0.52 : 0.61;
  const swing = expr.includes("filesystem") ? 0.004 : 0.12;
  const random = noise(expr.length);
  return [series({}, (time) => Math.max(0.01, base + swing * Math.sin((time / DAY) * 2 * Math.PI) + swing * 0.5 * random()))];
};

const config = {
  repository: "https://github.com/example/fleet",
  backupTimer: "backup.timer",
  checks: "site_up",
  hosts: Object.fromEntries(
    Object.entries(hosts).map(([host, h]) => [
      host,
      {
        kind: h.kind,
        links: [
          { title: "Graphs", url: `https://graphs.example.com/host/${host}` },
          ...(h.kind === "server" && host !== "router" ? [{ title: "Console", url: `https://console.example.com/${host}` }] : []),
        ],
      },
    ]),
  ),
  sites: [
    { title: "Graphs", description: "Every host's metrics", url: "https://graphs.example.com", on: "web" },
    { title: "Wiki", description: "Notes and how-tos", url: "https://wiki.example.com", on: "web" },
  ],
  public: sites,
};

const alerts = (now: number) =>
  (scenario.alerts ?? []).map(({ alert, host, item, since }) => ({
    state: "firing",
    activeAt: new Date((now - since) * 1000).toISOString(),
    labels: { alertname: alert, instance: host },
    annotations: { headline: `${alert} on ${host}`, item },
  }));

export const sample = (): Plugin => ({
  name: "sample-data",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      const now = Date.now() / 1000;
      const param = (key: string) => url.searchParams.get(key) ?? "";
      const answers: Record<string, () => unknown> = {
        "/config.json": () => config,
        "/commits.json": () => commits(now),
        "/api/v1/query": () => ({ data: { result: instant(param("query"), now) } }),
        "/api/v1/query_range": () => ({
          data: { result: overTime(param("query"), Number(param("start")), Number(param("end")), Number(param("step"))) },
        }),
        "/api/v1/alerts": () => ({ data: { alerts: alerts(now) } }),
      };
      const answer = answers[url.pathname];
      if (!answer) return next();
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(answer()));
    });
  },
});
