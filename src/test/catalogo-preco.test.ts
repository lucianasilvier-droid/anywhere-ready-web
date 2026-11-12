import { describe, expect, it } from "vitest";
import { precoConfirmado } from "@/lib/catalogo-preco";

describe("precoConfirmado", () => {
  it("aceita somente preços positivos e finitos", () => {
    expect(precoConfirmado(55)).toBe(true);
    expect(precoConfirmado("55.90")).toBe(true);
    expect(precoConfirmado(0)).toBe(false);
    expect(precoConfirmado(null)).toBe(false);
    expect(precoConfirmado(undefined)).toBe(false);
    expect(precoConfirmado("")).toBe(false);
    expect(precoConfirmado("abc")).toBe(false);
    expect(precoConfirmado(-1)).toBe(false);
    expect(precoConfirmado(Infinity)).toBe(false);
  });
});
