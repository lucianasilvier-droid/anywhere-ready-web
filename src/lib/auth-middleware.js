import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { createServerClient } from "@/lib/entities.server";

// Both middlewares hand handlers the same lazy `context.getBase44()`: a data client
// on PostgreSQL acting as the visitor (signed in through the httpOnly session
// cookie of src/lib/auth.server.js). `.asServiceRole` skips the access rules for trusted code.
const withGetBase44 = (next) => {
  let client;
  return next({ context: { getBase44: () => (client ??= createServerClient()) } });
};

// Applied to every server function by src/start.js. The session cookie travels
// with the call, so nothing extra is sent from the browser.
export const authMiddleware = createMiddleware({ type: "function" }).server(({ next }) => withGetBase44(next));

// Applied to every request by src/start.js, so server route handlers get the same client.
export const base44RequestMiddleware = createMiddleware({ type: "request" }).server(({ next }) => withGetBase44(next));

const currentUser = (context) =>
  context
    .getBase44()
    .auth.me()
    .catch((error) => {
      if (error?.status === 401 || error?.status === 403) return null;
      throw error;
    });

// Add to a server function that needs a signed-in caller; sets `context.user`.
export const requireUser = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const user = await currentUser(context);
  if (!user) {
    setResponseStatus(401);
    throw Object.assign(new Error("Unauthorized"), { status: 401, code: "UNAUTHORIZED" });
  }
  return next({ context: { user } });
});

// The same for a server route (src/routes/api/*): anonymous callers get a 401.
export const requireUserRoute = createMiddleware({ type: "request" }).server(async ({ next, context }) => {
  const user = await currentUser(context);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return next({ context: { user } });
});
