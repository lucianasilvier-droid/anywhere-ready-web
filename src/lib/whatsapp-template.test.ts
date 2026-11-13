import { describe, expect, it } from "vitest";
import { buildWhatsappTemplateRequest, validateWhatsappRecipientConsent } from "@/lib/integrations.server";

describe("envio WhatsApp com template aprovado", () => {
  const values = {
    whatsapp_template_prefix: "google_nfc",
    whatsapp_template_language: "pt_BR",
  };

  it("monta o nome do template conforme o tipo e envia a mensagem como variável {{1}}", () => {
    const result = buildWhatsappTemplateRequest(
      { to: "(11) 99999-8888", body: "Olá! Podemos apresentar a placa NFC?", tipo: "autorizacao" },
      values,
    );

    expect(result.ok).toBe(true);
    expect(result.templateName).toBe("google_nfc_autorizacao");
    expect(result.requestBody.type).toBe("template");
    expect(result.requestBody.template.language.code).toBe("pt_BR");
    expect(result.requestBody.template.components[0].parameters[0].text).toBe("Olá! Podemos apresentar a placa NFC?");
    expect(result.requestBody.to).toBe("5511999998888");
  });

  it("recusa tipos de template que não fazem parte do fluxo aprovado do CRM", () => {
    const result = buildWhatsappTemplateRequest(
      { to: "11999998888", body: "Olá, tudo bem?", tipo: "template_invalido" },
      values,
    );
    expect(result).toMatchObject({ ok: false });
  });

  it("não permite envio sem prefixo configurado", () => {
    const result = buildWhatsappTemplateRequest(
      { to: "11999998888", body: "Olá, tudo bem?", tipo: "autorizacao" },
      {},
    );
    expect(result).toMatchObject({ ok: false });
  });

  it("recusa prefixos incompatíveis com nomes de template da Meta", () => {
    const result = buildWhatsappTemplateRequest(
      { to: "11999998888", body: "Olá, tudo bem?", tipo: "proposta" },
      { ...values, whatsapp_template_prefix: "Meu Template" },
    );
    expect(result).toMatchObject({ ok: false });
  });

  it("recusa mensagem maior que o limite do parâmetro de texto", () => {
    const result = buildWhatsappTemplateRequest(
      { to: "11999998888", body: "x".repeat(1025), tipo: "followup" },
      values,
    );
    expect(result).toMatchObject({ ok: false });
  });
});


describe("consentimento obrigatório antes de qualquer envio pela Cloud API", () => {
  it("permite somente contatos com consentimento prévio registrado", () => {
    expect(validateWhatsappRecipientConsent({ consentimento: "autorizado", bloqueado: false })).toEqual({ ok: true });
  });

  it.each([
    [null, false],
    ["solicitado", false],
    ["recusado", true],
    ["revogado", true],
    ["autorizado", true],
  ])("bloqueia status %s com bloqueado=%s", (consentimento, bloqueado) => {
    expect(validateWhatsappRecipientConsent({ consentimento, bloqueado }).ok).toBe(false);
  });
});
