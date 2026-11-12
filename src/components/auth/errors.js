/** A Portuguese message for a sign-in error (the server already answers in Portuguese). */
export function authErrorMessage(error, fallback = "Não foi possível concluir. Tente novamente.") {
  const message = error?.message || "";
  if (!message || /^(fetch failed|failed to fetch|networkerror)/i.test(message)) return fallback;
  return message;
}
