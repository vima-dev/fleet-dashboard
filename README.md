# fleet-dashboard

A status page for a fleet of NixOS hosts: which are up, what is wrong, which
commit each runs, and the sites they serve. It builds to static files and loads
its data from three relative paths:

- `config.json`: hosts, sites and a few setup-specific names. See `Config` in
  `src/lib/fleet.ts`.
- `commits.json`: commits of the fleet's flake, newest first, as
  `{ rev, time, author, subject }`.
- `api/v1/`: the Prometheus HTTP API. Queries are in `src/lib/fleet.ts`. One
  needs `--enable-feature=promql-experimental-functions`.

## Development

```sh
nix develop
pnpm install
pnpm dev
pnpm check
```

`pnpm dev` serves fake data from `mock/plugin.ts`. `SCENARIO=<name> pnpm dev`
picks a case from the `scenarios` object there (`problems` by default, `fine`,
`unbuilt`). Add an entry to add a case.

`nix build` outputs the static files. After changing dependencies, update the
`pnpmDeps` hash in `flake.nix`.
