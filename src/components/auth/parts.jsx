import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "./GoogleIcon";
import { base44 } from "@/api/base44Client";
import { returnToSearch } from "@/lib/authReturnTo";
import { authSettingsFn } from "@/lib/auth-fns";

// Small pieces the auth pages share.

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
      {children}
    </div>
  );
}

export function SubmitButton({ busy, busyLabel, children, ...props }) {
  return (
    <Button type="submit" className="h-12 w-full font-medium" disabled={busy} {...props}>
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

// Shown only when Google sign-in is configured on the server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
function useGoogleEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    authSettingsFn()
      .then((settings) => setEnabled(!!settings?.providers?.google))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

export function GoogleButton({ returnTo }) {
  const enabled = useGoogleEnabled();
  if (!enabled) return null;
  return (
    <>
      <Button type="button" variant="outline" className="mb-6 h-12 w-full text-sm font-medium" onClick={() => base44.auth.loginWithProvider("google", returnTo)}>
        <GoogleIcon className="mr-2 h-5 w-5" />
        Continuar com Google
      </Button>
      <OrDivider />
    </>
  );
}

export function OrDivider() {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-3 text-muted-foreground">ou</span>
      </div>
    </div>
  );
}

// A link between auth screens that carries the way back (?returnTo=) along.
export function AuthLink({ to, returnTo, className = "font-medium text-primary hover:underline", children }) {
  return (
    <Link to={to} search={returnToSearch(returnTo)} className={className}>
      {children}
    </Link>
  );
}
