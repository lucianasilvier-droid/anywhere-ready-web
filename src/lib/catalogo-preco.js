/** Preço só é válido quando foi confirmado como um número positivo. */
export function precoConfirmado(value) {
  const preco = Number(value);
  return Number.isFinite(preco) && preco > 0;
}
