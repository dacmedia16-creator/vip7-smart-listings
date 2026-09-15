import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Plain string search params (no JSON encoding). The default serializer wraps
// numeric-looking values in quotes (`?condominios="12"`), which broke filters
// that carry a single numeric code.
function parseSearch(searchStr: string): Record<string, string> {
  const out: Record<string, string> = {};
  new URLSearchParams(searchStr).forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search ?? {})) {
    if (value === undefined || value === null) continue;
    params.set(key, typeof value === "string" ? value : String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    parseSearch,
    stringifySearch,
  });

  return router;
};
