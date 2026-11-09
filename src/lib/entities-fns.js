import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { ENTITY_NAMES } from "@/lib/entity-names";

const OPS = ["list", "filter", "get", "count", "create", "bulkCreate", "update", "bulkUpdate", "delete", "deleteMany"];

const fail = (error) => {
  const status = Number(error?.status) || 500;
  setResponseStatus(status);
  throw Object.assign(new Error(error?.message || "Erro inesperado."), { status });
};

/** Runs one entity operation for the browser, as the signed-in visitor (access rules apply). */
export const entityOpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      entity: z.enum(ENTITY_NAMES),
      op: z.enum(OPS),
      args: z.array(z.any()).max(4).default([]),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      const result = await context.getBase44().entities[data.entity][data.op](...data.args);
      return { result: result ?? null };
    } catch (error) {
      fail(error);
    }
  });

/** The signed-in visitor, or null. */
export const meFn = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  try {
    const base44 = context.getBase44();
    const user = await base44.auth.me();
    const representante = user?.role === "admin" ? null : await base44.representante();
    return { user, isRepresentative: !!representante };
  } catch (error) {
    if (error?.status === 401) return { user: null, isRepresentative: false };
    throw error;
  }
});

export const inviteUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email(), role: z.enum(["user", "admin"]).default("user") }))
  .handler(async ({ data, context }) => {
    try {
      return await context.getBase44().users.inviteUser(data.email, data.role);
    } catch (error) {
      fail(error);
    }
  });

/** Administrator first access / lost access: e-mails a link to set the password. */
export const adminAccessLinkFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email() }))
  .handler(async ({ data }) => {
    const { sendAdminAccessLink } = await import("@/lib/entities.server");
    try {
      return await sendAdminAccessLink(data.email);
    } catch (error) {
      fail(error);
    }
  });

/** After a failed sign-in: sets up the owner's account with the starting password. */
export const prepareAdminLoginFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email(), password: z.string().max(200) }))
  .handler(async ({ data }) => {
    const { prepareInitialAdminLogin } = await import("@/lib/entities.server");
    try {
      return await prepareInitialAdminLogin(data.email, data.password);
    } catch (error) {
      fail(error);
    }
  });

/** After the signed-in user changes their password in the panel. */
export const passwordChangedFn = createServerFn({ method: "POST" }).handler(async ({ context }) => {
  const { markPasswordChanged } = await import("@/lib/entities.server");
  try {
    const user = await context.getBase44().auth.me();
    return await markPasswordChanged(user.id);
  } catch (error) {
    fail(error);
  }
});
