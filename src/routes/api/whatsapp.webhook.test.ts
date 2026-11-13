import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { classifyReply, validarAssinaturaMeta } from "@/routes/api/whatsapp.webhook";

describe("classificação de respostas do WhatsApp", () => {
  it.each([
    ["não", "nao"],
    ["Não autorizo", "nao"],
    ["não quero receber mensagens", "nao"],
    ["parar", "nao"],
  ])("identifica recusa: %s", (mensagem, esperado) => {
    expect(classifyReply(mensagem)).toBe(esperado);
  });

  it.each([
    ["sim", "sim"],
    ["Sim, autorizo", "sim"],
    ["pode mandar", "sim"],
    ["aceito receber", "sim"],
  ])("identifica autorização afirmativa: %s", (mensagem, esperado) => {
    expect(classifyReply(mensagem)).toBe(esperado);
  });

  it("não presume autorização quando a resposta é ambígua", () => {
    expect(classifyReply("vou pensar e retorno")).toBe("indefinida");
    expect(classifyReply("")).toBe("indefinida");
  });
});

describe("assinatura do webhook da Meta", () => {
  const segredo = "segredo-de-teste";
  const corpo = Buffer.from(JSON.stringify({ object: "whatsapp_business_account" }));
  const assinaturaValida = "sha256=" + createHmac("sha256", segredo).update(corpo).digest("hex");

  it("aceita a assinatura HMAC correta do corpo original", () => {
    expect(validarAssinaturaMeta(corpo, assinaturaValida, segredo)).toBe(true);
  });

  it("recusa assinatura incorreta, ausente ou sem segredo", () => {
    expect(validarAssinaturaMeta(corpo, "sha256=" + "0".repeat(64), segredo)).toBe(false);
    expect(validarAssinaturaMeta(corpo, "", segredo)).toBe(false);
    expect(validarAssinaturaMeta(corpo, assinaturaValida, "")).toBe(false);
  });

  it("recusa quando o corpo foi alterado depois da assinatura", () => {
    expect(validarAssinaturaMeta(Buffer.from(corpo.toString() + " "), assinaturaValida, segredo)).toBe(false);
  });
});
