import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Webhook } from "lucide-react";
import { integrationStatusFn, saveIntegrationKeysFn, testIntegrationFn } from "@/lib/admin-fns";
import IntegracaoCard from "@/components/admin/IntegracaoCard";

export const Route = createFileRoute("/_authed/admin/integracoes")({
  head: () => ({ meta: [{ title: "APIs e integrações — Painel" }] }),
  component: IntegracoesPage,
});

const DESCRICOES = {
  google_places: {
    titulo: "Google Maps / Places",
    texto: "Usada para pesquisar empresas reais no CRM (nome, categoria, cidade, telefone e site).",
    passos: [
      "Ative a Places API (New) no Google Cloud",
      "Crie uma chave de API e restrinja o uso às APIs necessárias",
      "Cole a chave no campo acima e salve",
    ],
  },
  groq: {
    titulo: "API Roq",
    texto:
      "Usada pela IA Roq para analisar leads, sugerir abordagens, escrever mensagens e resumir históricos.",
    passos: ["Configure a chave da API Roq no painel de integrações", "Cole a chave no campo acima e salve"],
  },
  whatsapp: {
    titulo: "WhatsApp Business",
    texto: "Envio de mensagens pelo botão do CRM, sempre com revisão do operador e autorização registrada.",
    passos: [
      "Configure o app no Meta for Developers",
      "Copie o Access Token permanente, o Phone Number ID e o App Secret do app Meta",
      "Cole os três campos acima e salve",
      "Defina o verify token abaixo (o mesmo texto será informado na Meta)",
      "O App Secret valida a assinatura de cada notificação recebida; sem ele o webhook rejeita as chamadas",
      "Cadastre a URL do webhook exibida abaixo na Meta",
    ],
  },
};

function IntegracoesPage() {
  const status = useServerFn(integrationStatusFn);
  const testar = useServerFn(testIntegrationFn);
  const salvarChaves = useServerFn(saveIntegrationKeysFn);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [testando, setTestando] = useState("");
  const [salvando, setSalvando] = useState("");
  const [webhook, setWebhook] = useState("");

  async function carregar() {
    setCarregando(true);
    try {
      const r = await status();
      setItens(r?.items || []);
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar as integrações.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    setWebhook(`${window.location.origin}/api/whatsapp/webhook`);
  }, []);

  const mTestar = useMutation({
    mutationFn: (tipo) => testar({ data: { tipo } }),
    onSuccess: async (r) => {
      toast[r?.status === "conectado" ? "success" : "error"](r?.mensagem || "Teste concluído.");
      await carregar();
    },
    onError: (e) => toast.error(e?.message || "O teste falhou."),
    onSettled: () => setTestando(""),
  });

  async function salvar(tipo, valores) {
    setSalvando(tipo);
    try {
      const r = await salvarChaves({ data: { tipo, valores } });
      if (!r?.alterados) toast.info("Nenhuma chave nova para salvar.");
      else toast.success("Chaves salvas. Execute o teste de conexão.");
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível salvar as chaves.");
    } finally {
      setSalvando("");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Sistema</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">APIs e integrações</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/45">
          Cadastre aqui as chaves das APIs usadas pela plataforma. Elas ficam guardadas no servidor,
          nunca aparecem no navegador nem nas respostas da API, e o status abaixo reflete apenas
          testes reais de conexão.
        </p>
      </header>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando integrações...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {itens.map((item) => (
            <IntegracaoCard
              key={item.tipo}
              item={item}
              info={DESCRICOES[item.tipo]}
              testando={testando === item.tipo && mTestar.isPending}
              salvando={salvando === item.tipo}
              onTestar={(tipo) => {
                setTestando(tipo);
                mTestar.mutate(tipo);
              }}
              onSalvar={salvar}
            />
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
          <Webhook className="h-4 w-4 text-primary" /> Webhook do WhatsApp
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
          Cadastre esta URL como Callback URL na configuração do WhatsApp Business e informe na Meta o
          mesmo "verify token" salvo no cartão do WhatsApp acima. Em produção, use o endereço do app
          publicado no lugar deste.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-primary">{webhook}</code>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(webhook);
              toast.success("URL copiada.");
            }}
            className="rounded-full border border-white/12 px-3 py-1 text-[11px] font-semibold text-white/60"
          >
            Copiar
          </button>
        </div>
      </section>
    </div>
  );
}