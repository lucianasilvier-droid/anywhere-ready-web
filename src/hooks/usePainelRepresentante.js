import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { meuPainelFn } from "@/lib/representantes-fns";

/** Carrega o painel do representante vinculado à conta atual. */
export default function usePainelRepresentante() {
  const carregar = useServerFn(meuPainelFn);
  const [painel, setPainel] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await carregar();
      setPainel(dados);
      setErro("");
    } catch (e) {
      setErro(e?.message || "Não foi possível carregar o painel.");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { painel, carregando, erro, recarregar };
}