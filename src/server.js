// The server entry: TanStack Start's default handler, which also logs a page's
// loader and beforeLoad errors.
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { recordRouteError } from "@/lib/error-capture.server";

const handler = createStartHandler((ctx) => {
  for (const match of ctx.router.state.matches) {
    if (match.status === "error") recordRouteError(ctx.request, match.error, match.routeId);
  }
  return defaultStreamHandler(ctx);
});

export default { fetch: handler };
