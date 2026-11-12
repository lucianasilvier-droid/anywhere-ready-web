// Transactional e-mail over plain SMTP (any provider: Gmail/Workspace, Zoho,
// Amazon SES, SendGrid, Mailgun, Resend, Brevo, Postmark, your own server…).
// Without SMTP_HOST the message is printed to the server log instead, so local
// development and first setup keep working.
import nodemailer from "nodemailer";
import { env, envFlag } from "@/lib/env.server";

let transport;

export function smtpConfigured() {
  const host = String(env("SMTP_HOST") || "").trim();
  const user = String(env("SMTP_USER") || "").trim();
  const pass = String(env("SMTP_PASS") || "").trim();
  const from = String(env("SMTP_FROM") || user).trim();
  const rawPort = env("SMTP_PORT");
  const port = rawPort === undefined ? 587 : Number(rawPort);
  // Auth credentials must be supplied as a pair. An unauthenticated relay
  // is allowed only when a sender address is explicitly configured.
  return !!host && !!from && Number.isInteger(port) && port > 0 && port <= 65535 && (!!user === !!pass);
}

function getTransport() {
  if (!transport) {
    const port = Number(env("SMTP_PORT")) || 587;
    transport = nodemailer.createTransport({
      host: env("SMTP_HOST"),
      port,
      secure: envFlag("SMTP_SECURE", port === 465),
      auth: env("SMTP_USER") ? { user: env("SMTP_USER"), pass: env("SMTP_PASS") } : undefined,
    });
  }
  return transport;
}

/** Sends an e-mail. Resolves to { delivered } — false when only logged. */
export async function sendMail({ to, subject, text, html }) {
  if (!smtpConfigured()) {
    // Never log the body: confirmation and password-reset messages contain
    // one-time secrets in their URLs.
    console.warn("[mail] SMTP ausente ou incompleto; mensagem transacional não enviada.");
    return { delivered: false };
  }
  await getTransport().sendMail({
    from: env("SMTP_FROM") || env("SMTP_USER"),
    to,
    subject,
    text,
    html,
  });
  return { delivered: true };
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** A simple e-mail with one call-to-action link. */
export function linkEmail({ title, intro, cta, url, outro = "Se você não pediu isto, ignore este e-mail." }) {
  const text = `${title}\n\n${intro}\n\n${cta}: ${url}\n\n${outro}`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f6fb;padding:24px">
<table role="presentation" style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:28px">
<tr><td><h2 style="margin:0 0 12px;color:#0a1128">${escape(title)}</h2>
<p style="color:#333;line-height:1.5">${escape(intro)}</p>
<p style="margin:24px 0"><a href="${escape(url)}" style="background:#1a73e8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escape(cta)}</a></p>
<p style="color:#777;font-size:12px;line-height:1.5">${escape(outro)}<br>Link: ${escape(url)}</p></td></tr></table></body></html>`;
  return { text, html };
}
