// Server functions behind the sign-in pages. The session lives in an httpOnly
// cookie set by the server (src/lib/auth.server.js); the browser never sees a token.
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

const fail = (error) => {
  const status = Number(error?.status) || 500;
  setResponseStatus(status);
  if (status >= 500) console.error("[auth]", error);
  throw Object.assign(new Error(status >= 500 ? "Não foi possível concluir agora. Tente novamente." : error?.message), { status });
};

const run = async (fn) => {
  try {
    return await fn(await import("@/lib/auth.server"));
  } catch (error) {
    fail(error);
  }
};

const email = z.string().trim().max(254);
const password = z.string().max(200);

export const authSettingsFn = createServerFn({ method: "GET" }).handler(() => run((auth) => auth.authSettings()));

export const signupFn = createServerFn({ method: "POST" })
  .validator(z.object({ email, password, full_name: z.string().max(200).optional() }))
  .handler(({ data }) => run((auth) => auth.signup({ email: data.email, password: data.password, fullName: data.full_name })));

export const loginFn = createServerFn({ method: "POST" })
  .validator(z.object({ email, password }))
  .handler(({ data }) => run((auth) => auth.login(data.email, data.password)));

export const logoutFn = createServerFn({ method: "POST" }).handler(() => run((auth) => auth.logout()));

export const recoverPasswordFn = createServerFn({ method: "POST" })
  .validator(z.object({ email }))
  .handler(({ data }) => run((auth) => auth.requestPasswordRecovery(data.email)));

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(10).max(200), password }))
  .handler(({ data }) => run((auth) => auth.resetPasswordWithToken(data.token, data.password)));

export const changePasswordFn = createServerFn({ method: "POST" })
  .validator(z.object({ current: z.string().max(200).optional(), password }))
  .handler(({ data }) => run((auth) => auth.changePassword(data.current, data.password)));
