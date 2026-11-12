import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/** Lista uma entidade com filtro/ordenação e permite recarregar após alterações. */
export function useEntityList(nome, query = {}, options = {}) {
  const { sort = "-created_date", limit = 200 } = options;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const key = JSON.stringify(query || {});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const page = await base44.entities[nome].filter(JSON.parse(key), { sort, limit });
      setItems(Array.isArray(page) ? page : page?.items || []);
    } catch (e) {
      setError(e?.message || "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [nome, key, sort, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load, setItems };
}

export default useEntityList;