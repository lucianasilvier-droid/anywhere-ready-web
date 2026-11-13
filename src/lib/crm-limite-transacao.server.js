/**
 * Serializes CRM lead creation per representative and checks the daily quota
 * inside the same PostgreSQL transaction as the INSERT.
 *
 * A transaction-scoped advisory lock is acquired in its own statement so the
 * subsequent quota SELECT gets a fresh READ COMMITTED snapshot after waiting.
 */
export async function createLeadUnderRepresentativeLimit(
  tx,
  { repId, defaultLimit, insert },
) {
  const id = String(repId);
  await tx("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [id]);

  const rows = await tx(
    `SELECT
       count(*)::int AS usados,
       COALESCE(
         (
           SELECT CASE
             WHEN COALESCE(data->>'limite_leads_dia', '') ~ '^[0-9]{1,5}$'
               AND (data->>'limite_leads_dia')::int > 0
             THEN LEAST((data->>'limite_leads_dia')::int, 10000)
             ELSE NULL
           END
           FROM records
           WHERE entity = 'Representante' AND id = $1
           LIMIT 1
         ),
         $2::int
       ) AS limite
     FROM records
     WHERE entity = 'Lead'
       AND data->>'representante_id' = $1
       AND created_date >= (
         date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')
         AT TIME ZONE 'America/Sao_Paulo'
       )`,
    [id, defaultLimit],
  );

  const usados = Number(rows[0]?.usados || 0);
  const limite = Number(rows[0]?.limite || defaultLimit);
  if (usados >= limite) {
    throw Object.assign(
      new Error(`Você já adicionou ${limite} clientes ao CRM hoje, que é o limite diário. Amanhã você pode adicionar mais.`),
      { status: 429 },
    );
  }

  return insert(tx);
}
