import { json, query, range, type Sample } from "./api";

/** Shape of config.json. */
export type Config = {
  /** commit links are `<repository>/commit/<rev>` */
  repository: string;
  /** name of the systemd backup timer */
  backupTimer: string;
  /** Prometheus metric for site checks: 1 when up, labelled by `name` */
  checks: string;
  hosts: Record<string, { kind: Kind; links: Link[] }>;
  sites: { title: string; description?: string; url: string; on?: string }[];
  public: { name: string; on?: string }[];
};
export type Kind = "server" | "desktop" | "laptop";
export type Link = { title: string; url: string };
export type Commit = { rev: string; time: number; author: string; subject: string };
type Alert = {
  state: string;
  activeAt: string;
  labels: Record<string, string>;
  annotations: { headline?: string; item?: string };
};

/** Uptime share (0 to 1) per piece of time, oldest first. null means no data. */
export type History = { start: number; piece: number; shares: (number | null)[] };

export type Version =
  | { state: "unknown" }
  /** runs the commit built for it, which is the newest of main unless the build is missing */
  | { state: "current"; edited: boolean }
  /** running a commit that isn't on main */
  | { state: "apart"; edited: boolean; rev: string }
  /** commits behind the one built for it */
  | { state: "behind"; edited: boolean; by: number; since: number; late: boolean }
  /** runs a newer commit than the one built for it, so it was built by hand */
  | { state: "ahead"; edited: boolean; by: number };

export type Problem = { what: string; detail?: string; since?: number; host?: string };

export type Host = {
  name: string;
  kind: Kind;
  alwaysOn: boolean;
  online: boolean;
  /** always-on host that is offline */
  down: boolean;
  seen?: number;
  booted?: number;
  backup?: number;
  version: Version;
  /** commits behind main. undefined if its commit isn't on main */
  position?: number;
  problems: Problem[];
  links: Link[];
  sites: Site[];
  history?: History;
};

export type Site = {
  title: string;
  description?: string;
  url: string;
  on?: string;
  up?: boolean;
  history?: History;
};

export type Fleet = {
  now: number;
  repository: string;
  hosts: Host[];
  sites: Site[];
  problems: Problem[];
  commits: Commit[];
  /** positions (commits behind main) the builder has built */
  built: number[];
  /** hosts without a build of the latest commit */
  unbuilt: string[];
  buildable: number;
};

const HOUR = 3600;
const DAY = 86400;
const WEEK = 7 * DAY;

/** 7-day uptime history from a 0/1 metric, keyed by `label`. */
const week = async (metric: string, label: string, piece: number): Promise<Map<string, History>> => {
  // end at the current minute so the last piece includes now
  const end = Math.floor(Date.now() / 60000) * 60;
  const pieces = WEEK / piece;
  const start = end - (pieces - 1) * piece;
  const histories = new Map<string, History>();
  for (const series of await range(`avg_over_time(${metric}[${piece}s])`, start, end, piece)) {
    const shares: (number | null)[] = Array(pieces).fill(null);
    for (const [time, value] of series.values) shares[Math.round((time - start) / piece)] = Number(value);
    // each value covers the piece before its timestamp
    histories.set(series.metric[label], { start: start - piece, piece, shares });
  }
  return histories;
};

export const hourly = async (host: string): Promise<History | undefined> =>
  (await week(`up{job="node", instance="${host}"}`, "instance", HOUR)).get(host);

const byInstance = (samples: Sample[]) => new Map(samples.map((s) => [s.metric.instance, Number(s.value[1])]));

export const load = async (): Promise<Fleet> => {
  const now = Date.now() / 1000;
  const config = await json<Config>("config.json");
  const [commits, up, seen, booted, backup, reported, offered, checks, alerts, hostWeek, siteWeek] =
    await Promise.all([
      // 404 until the first fetch
      json<Commit[]>("commits.json").catch(() => []),
      query('up{job="node"}'),
      query("last_over_time(node_time_seconds[90d])"),
      query("last_over_time(node_boot_time_seconds[90d])"),
      query(`last_over_time(node_systemd_timer_last_trigger_seconds{name="${config.backupTimer}"}[90d]) > 0`),
      query("ts_of_last_over_time(vima_revision[90d])"),
      query("vima_builder_revision"),
      query(config.checks),
      json<{ data: { alerts: Alert[] } }>("api/v1/alerts").then((r) => r.data.alerts),
      week('up{job="node"}', "instance", 6 * HOUR),
      week(config.checks, "name", 6 * HOUR),
    ]);

  const position = new Map(commits.map((commit, i) => [commit.rev, i]));
  const lastSeen = byInstance(seen);
  const lastBoot = byInstance(booted);
  const lastBackup = byInstance(backup);
  const answers = new Map(checks.map((s) => [s.metric.name, s.value[1] === "1"]));
  // HostDown is already covered by the host's own state
  const firing = alerts.filter((alert) => alert.state === "firing" && alert.labels.alertname !== "HostDown");

  // one series per revision a host has run; the one with the latest sample is current
  const running = new Map<string, { rev: string; at: number }>();
  for (const s of reported) {
    const last = running.get(s.metric.instance);
    if (!last || Number(s.value[1]) > last.at) running.set(s.metric.instance, { rev: s.metric.rev, at: Number(s.value[1]) });
  }

  const sites: Site[] = [
    ...config.sites.map((site) => ({ ...site, check: new URL(site.url).host })),
    ...config.public.map((site) => ({ title: site.name, url: `https://${site.name}`, on: site.on, check: site.name })),
  ].map(({ check, ...site }) => ({ ...site, up: answers.get(check), history: siteWeek.get(check) }));

  // what each host would get by upgrading: the commit built for it, or main if that isn't known
  const target = new Map(offered.map((s) => [s.metric.host, position.get(s.metric.rev) ?? 0]));

  const version = (name: string, alwaysOn: boolean): [Version, number | undefined] => {
    const rev = running.get(name)?.rev;
    if (!rev) return [{ state: "unknown" }, undefined];
    const commit = rev.replace(/-dirty$/, "");
    const edited = rev !== commit;
    const at = position.get(commit);
    if (at == null) return [{ state: "apart", edited, rev: commit }, undefined];
    const built = target.get(name) ?? 0;
    if (at === built) return [{ state: "current", edited }, at];
    if (at < built) return [{ state: "ahead", edited, by: built - at }, at];
    // time of the oldest missing commit
    const since = commits[at - 1].time;
    // servers upgrade nightly, so more than a day behind is a problem
    return [{ state: "behind", edited, by: at - built, since, late: alwaysOn && now - since > DAY }, at];
  };

  const hosts: Host[] = up
    .map((s): Host => {
      const name = s.metric.instance;
      const alwaysOn = s.metric.always_on === "true";
      const online = s.value[1] === "1";
      const down = alwaysOn && !online;
      const [v, at] = version(name, alwaysOn);
      const problems: Problem[] = [
        ...(down ? [{ what: "Down", since: lastSeen.get(name), host: name }] : []),
        ...firing
          .filter((alert) => alert.labels.instance === name)
          .map((alert) => ({
            // UnitFailed -> "Unit failed"
            what: alert.labels.alertname.replace(/(?!^)[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`),
            detail: alert.annotations.item || undefined,
            since: Date.parse(alert.activeAt) / 1000,
            host: name,
          })),
        ...(v.state === "behind" && v.late && !down ? [{ what: "Not upgrading", since: v.since, host: name }] : []),
      ];
      return {
        name,
        kind: config.hosts[name].kind,
        alwaysOn,
        online,
        down,
        seen: lastSeen.get(name),
        booted: lastBoot.get(name),
        backup: lastBackup.get(name),
        version: v,
        position: at,
        problems,
        links: config.hosts[name].links,
        sites: sites.filter((site) => site.on === name),
        history: alwaysOn ? hostWeek.get(name) : undefined,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const down = new Set(hosts.filter((host) => host.down).map((host) => host.name));
  const problems: Problem[] = [
    ...hosts.flatMap((host) => host.problems),
    // skip sites on a down host, the host is already listed
    ...sites
      .filter((site) => site.up === false && !(site.on && down.has(site.on)))
      .map((site) => ({ what: `${site.title} is down` })),
  ];
  const built = [...new Set(offered.map((s) => position.get(s.metric.rev)).filter((p) => p != null))] as number[];
  const unbuilt = offered.filter((s) => position.get(s.metric.rev) !== 0).map((s) => s.metric.host);
  return { now, repository: config.repository, hosts, sites, problems, commits, built, unbuilt, buildable: offered.length };
};

export type Points = [number, number][];

export const usage = async (host: string, seconds: number): Promise<Record<"cpu" | "memory" | "disk", Points>> => {
  const end = Math.floor(Date.now() / 1000);
  const step = Math.max(60, Math.round(seconds / 240));
  const one = async (expr: string): Promise<Points> => {
    const [series] = await range(expr, end - seconds, end, step);
    return (series?.values ?? []).map(([time, value]) => [time, Number(value)]);
  };
  const of = `instance="${host}"`;
  const [cpu, memory, disk] = await Promise.all([
    one(`1 - avg(rate(node_cpu_seconds_total{mode="idle", ${of}}[5m]))`),
    one(`1 - node_memory_MemAvailable_bytes{${of}} / node_memory_MemTotal_bytes{${of}}`),
    one(`1 - node_filesystem_avail_bytes{mountpoint="/", ${of}} / node_filesystem_size_bytes{mountpoint="/", ${of}}`),
  ]);
  return { cpu, memory, disk };
};
