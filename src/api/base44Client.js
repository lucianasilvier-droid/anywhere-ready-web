// The app's data and auth client for the browser. It keeps the API the pages were
// written against (`base44.entities.Lead.filter(...)`, `base44.auth.logout()`),
// backed by the app's own server functions: PostgreSQL for data and the built-in
// authentication (src/lib/auth.server.js) for accounts.
import { entityOpFn, inviteUserFn, meFn } from "@/lib/entities-fns";
import { changePasswordFn, loginFn, logoutFn, recoverPasswordFn, signupFn } from "@/lib/auth-fns";

function entity(name) {
  const call = (op) => async (...args) => {
    const { result } = await entityOpFn({ data: { entity: name, op, args } });
    return result;
  };
  return {
    list: call("list"),
    filter: call("filter"),
    get: call("get"),
    count: call("count"),
    create: call("create"),
    bulkCreate: call("bulkCreate"),
    update: call("update"),
    bulkUpdate: call("bulkUpdate"),
    delete: call("delete"),
    deleteMany: call("deleteMany"),
  };
}

const cache = new Map();
const entities = new Proxy(
  {},
  {
    get(_, name) {
      if (typeof name !== "string" || name === "then") return undefined;
      if (!cache.has(name)) cache.set(name, entity(name));
      return cache.get(name);
    },
  },
);

export const base44 = {
  entities,
  auth: {
    async me() {
      const { user } = await meFn();
      if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      return user;
    },
    loginViaEmailPassword: (email, password) => loginFn({ data: { email, password } }),
    register: ({ email, password, full_name }) => signupFn({ data: { email, password, full_name } }),
    resetPasswordRequest: (email) => recoverPasswordFn({ data: { email } }),
    /** Signed-in user: new password (the current one is checked on the server). */
    changePassword: (current, password) => changePasswordFn({ data: { current, password } }),
    loginWithProvider(provider, returnTo) {
      const url = new URL(`/api/auth/${provider}`, window.location.origin);
      if (returnTo) url.searchParams.set("returnTo", returnTo);
      window.location.href = url.href;
    },
    async logout(redirectTo) {
      try {
        await logoutFn();
      } catch {
        // Already signed out.
      }
      window.location.href = redirectTo || "/";
    },
    // Where to go right after signing in: the requested page, or the visitor's
    // own area (admin → /admin, everyone else → /conta).
    async homeAfterLogin(returnTo) {
      if (returnTo && returnTo !== "/") return returnTo;
      try {
        const { user, isRepresentative } = await meFn();
        if (user?.role === "admin") return "/admin";
        if (isRepresentative) return "/representante";
        return user ? "/conta" : "/";
      } catch {
        return "/";
      }
    },
    redirectToLogin(returnTo) {
      const url = new URL("/login", window.location.origin);
      if (returnTo) url.searchParams.set("returnTo", returnTo);
      window.location.href = url.href;
    },
  },
  users: {
    inviteUser: (email, role) => inviteUserFn({ data: { email, role: role === "admin" ? "admin" : "user" } }),
  },
};
