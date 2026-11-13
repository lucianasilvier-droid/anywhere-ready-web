// Transactional e-mail over plain SMTP (any provider: Gmail/Workspace, Zoho,
// Amazon SES, SendGrid, Mailgun, Resend, Brevo, Postmark, your own server…).
// Without SMTP_HOST the message is printed to the server log instead, so local
// development and first setup keep working.
import nodemailer from "nodemailer";
import { env, envFlag } from "@/lib/env.server";

let transport;

export function smtpConfigured() {
  return !!env("SMTP_HOST");
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

function senderIdentity() {
  const configured = String(env("SMTP_FROM") || "").trim();
  const addressInBrackets = configured.match(/<([^<>]+)>/)?.[1]?.trim();
  const address = addressInBrackets || (configured.includes("@") ? configured : "") || env("SMTP_USER");
  if (!address) throw new Error("Configure SMTP_FROM ou SMTP_USER com o endereço de envio.");
  return { name: "Google NFC Connect", address };
}

/** Sends an e-mail. Resolves to { delivered } — false when only logged. */
export async function sendMail({ to, subject, text, html }) {
  if (!smtpConfigured()) {
    console.info(`[mail] SMTP não configurado — mensagem para ${to}\n  Assunto: ${subject}\n  ${text}`);
    return { delivered: false };
  }
  await getTransport().sendMail({
    from: senderIdentity(),
    to,
    subject,
    text,
    html,
  });
  return { delivered: true };
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** A simple e-mail with one call-to-action link. */
export function linkEmail({ title, intro, cta, url, outro = "Se você não pediu isto, ignore este e-mail.", representativeName = "", representativeProfileUrl = "" }) {
  const profileText = representativeName && representativeProfileUrl
    ? `\n\n${representativeName}\nSua página de representante: ${representativeProfileUrl}`
    : "";
  const profileHtml = representativeName && representativeProfileUrl
    ? `<p style="margin:18px 0;color:#333;line-height:1.6"><strong>${escape(representativeName)}</strong><br><a href="${escape(representativeProfileUrl)}" style="color:#1a73e8">Acessar minha página de representante</a></p>`
    : "";
  const text = `${title}\n\n${intro}${profileText}\n\n${cta}: ${url}\n\n${outro}`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f6fb;padding:24px">
<table role="presentation" style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:28px">
<tr><td><h2 style="margin:0 0 12px;color:#0a1128">${escape(title)}</h2>
<p style="color:#333;line-height:1.5">${escape(intro)}</p>
${profileHtml}
<p style="margin:24px 0"><a href="${escape(url)}" style="background:#1a73e8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escape(cta)}</a></p>
<p style="color:#777;font-size:12px;line-height:1.5">${escape(outro)}<br>Link: ${escape(url)}</p></td></tr></table></body></html>`;
  return { text, html };
}
