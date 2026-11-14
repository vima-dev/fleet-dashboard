export type Sample = { metric: Record<string, string>; value: [number, string] };
export type Series = { metric: Record<string, string>; values: [number, string][] };

export const json = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
};

const prometheus = async <T>(path: string, params: Record<string, string | number>): Promise<T[]> => {
  const search = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  return (await json<{ data: { result: T[] } }>(`api/v1/${path}?${search}`)).data.result;
};

export const query = (expr: string) => prometheus<Sample>("query", { query: expr });

export const range = (expr: string, start: number, end: number, step: number) =>
  prometheus<Series>("query_range", { query: expr, start, end, step });
