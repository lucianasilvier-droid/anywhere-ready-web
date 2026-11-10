-- Controle de tempo dos clientes inativos: índices para o arquivamento e prazo padrão (30 dias).
-- Os campos de arquivamento ficam no próprio Lead (JSONB), sem tabela nova.
CREATE INDEX IF NOT EXISTS "records_lead_arquivado_idx" ON "records" ((data->>'arquivado')) WHERE entity = 'Lead';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "records_interaction_lead_idx" ON "records" ((data->>'lead_id')) WHERE entity = 'LeadInteraction';
--> statement-breakpoint
INSERT INTO "records" ("id", "entity", "data")
SELECT 'cfginatividadedias000001', 'Configuracao',
       '{"chave":"inatividade_dias","valor":"30","descricao":"Dias sem atividade até o cliente do CRM ser arquivado automaticamente"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "records" WHERE entity = 'Configuracao' AND data->>'chave' = 'inatividade_dias');
