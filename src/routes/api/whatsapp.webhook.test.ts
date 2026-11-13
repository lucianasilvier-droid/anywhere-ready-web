import { describe, expect, it } from "vitest";
import { classifyReply } from "@/routes/api/whatsapp.webhook";

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
