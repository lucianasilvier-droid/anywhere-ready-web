import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { currentPath } from "@/lib/authReturnTo";

/**
 * The visitor, resolved once per page load and cached in the router's QueryClient:
 * the login gate (src/components/auth/AuthGate.jsx) reads it with
 * `context.queryClient.ensureQueryData(authQuery)`, components with `useAuth()`.
 * Resolves to `{ user, error }`: an anonymous visitor is `{ user: null, error: null }`.
 * Anything else, an outage (429, 503) or a request that never got an answer, rejects instead,
 * so it is never cached as "signed out" and the next read asks again.
 */
export const authQuery = queryOptions({
  queryKey: ["auth", "me"],
  queryFn: async () => {
    try {
      return { user: await base44.auth.me(), error: null };
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) return { user: null, error: null };
      throw err;
    }
  },
  staleTime: Infinity,
  retry: false,
});

const AuthContext = createContext(null);

/**
 * Client-side session state. The server renders every page anonymously and the
 * query only runs in the browser after hydration, so the first client render
 * matches the server markup. Gate user-specific UI on `isLoadingAuth`.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const { data, error, isPending } = useQuery(authQuery);

  const value = useMemo(
    () => ({
      user: data?.user ?? null,
      isAuthenticated: !!data?.user,
      isLoadingAuth: isPending,
      authError: data?.error ?? (error ? { type: "unknown", message: error.message ?? "Failed to load session" } : null),
      refresh: () => queryClient.fetchQuery({ ...authQuery, staleTime: 0 }),
      logout: () => {
        queryClient.setQueryData(authQuery.queryKey, { user: null, error: null });
        base44.auth.logout(window.location.origin);
      },
      // Full-page sign-in: /login with the current page as the way back.
      navigateToLogin: () => base44.auth.redirectToLogin(currentPath()),
    }),
    [data, error, isPending, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
