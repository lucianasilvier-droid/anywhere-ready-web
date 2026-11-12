// Logs server errors to stderr, so they show up in any host's logs (docker logs, pm2, journalctl…).
const log = (kind, error, extra = {}) => {
  try {
    console.error(`[${kind}]`, extra, error);
  } catch {
    // Never let logging break a request.
  }
};

export const recordFunctionError = (error, serverFnMeta) =>
  log("server-fn", error, { fn: serverFnMeta?.name ?? serverFnMeta?.id });
export const recordRequestError = (request, error) => log("request", error, { url: request?.url });
export const recordRouteError = (request, error, route) => log("route", error, { url: request?.url, route });
export const recordErrorResponse = () => {};
