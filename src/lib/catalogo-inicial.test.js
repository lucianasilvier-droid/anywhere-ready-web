import { describe, expect, it } from "vitest";
import { CATALOGO_INICIAL, completarProdutoComCatalogo } from "@/lib/catalogo-inicial";

describe("checkout público do catálogo", () => {
  it("mantém os três checkouts oficiais da InfinitePay", () => {
    for (const slug of ["kit-google-instagram", "placa-instagram", "placa-google"]) {
      const produto = CATALOGO_INICIAL.find((item) => item.slug === slug);
      expect(produto.checkout_url).toMatch(/^https:\/\/loja\.infinitepay\.io\//);
      const resolvido = completarProdutoComCatalogo({ ...produto, checkout_url: "" });
      expect(resolvido.checkout_url).toBe(produto.checkout_url);
      expect(resolvido.checkout_label).toBe("Comprar pela InfinitePay");
    }
  });

  it("não aceita link de WhatsApp como checkout de produto", () => {
    const produto = completarProdutoComCatalogo({
      id: "placa-google",
      slug: "placa-google",
      preco: 55,
      checkout_url: "https://wa.me/5511999999999",
    });
    expect(produto.checkout_url).toBe(CATALOGO_INICIAL.find((item) => item.slug === "placa-google").checkout_url);
  });

  it("não aceita provedores diferentes da InfinitePay em produtos sem fallback", () => {
    const produto = completarProdutoComCatalogo({
      id: "produto-teste",
      slug: "produto-teste",
      preco: 20,
      checkout_url: "https://checkout.mercadopago.com/teste",
    });
    expect(produto.checkout_url).toBeUndefined();
  });

  it("não aceita subdomínios ou URLs HTTP como checkout InfinitePay", () => {
    const base = CATALOGO_INICIAL.find((item) => item.slug === "placa-instagram");
    for (const checkout_url of [
      "https://loja.infinitepay.io.evil.example/checkout",
      "http://loja.infinitepay.io/checkout",
    ]) {
      expect(completarProdutoComCatalogo({ ...base, checkout_url }).checkout_url).toBe(base.checkout_url);
    }
  });
});
