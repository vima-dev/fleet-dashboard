import { load, type Fleet } from "./fleet";

export const app = $state<{ fleet: Fleet | null; failed: boolean; route: string[] }>({
  fleet: null,
  failed: false,
  route: [],
});

export const refresh = async () => {
  try {
    app.fleet = await load();
    app.failed = false;
  } catch (e) {
    console.error(e);
    app.failed = true;
  }
};

const read = () => {
  app.route = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  window.scrollTo(0, 0);
};

export const start = () => {
  read();
  addEventListener("hashchange", read);
  refresh();
  setInterval(refresh, 30000);
};

export const hostPath = (name: string) => `#/host/${encodeURIComponent(name)}`;
