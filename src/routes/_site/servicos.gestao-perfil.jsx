import { createFileRoute } from "@tanstack/react-router";
import ServiceLanding from "@/components/site/ServiceLanding";
import { SERVICE_IMAGE_URL } from "@/lib/site-content";

export const routePath = "/servicos/gestao-perfil";

export const Route = createFileRoute("/_site/servicos/gestao-perfil")({
  head: () => ({
    meta: [
      { title: "Gestão e Administração do Perfil no Google — Google NFC Connect" },
      {
        name: "description",
        content:
          "Gestão contínua do Perfil da Empresa no Google: atualizações, fotos, postagens, acompanhamento de avaliações e relatórios mensais.",
      },
    ],
  }),
  component: GestaoPerfilPage,
});

const PLANOS = [
  {
    nome: "Essencial",
    itens: ["Atualização de dados e horários", "Gestão de fotos", "Acompanhamento de avaliações", "Relatório mensal"],
  },
  {
    nome: "Profissional",
    itens: [
      "Tudo do Essencial",
      "Postagens periódicas no perfil",
      "Sugestões de resposta com IA",
      "Reunião mensal de acompanhamento",
    ],
    destaque: true,
  },
  {
    nome: "Premium",
    itens: [
      "Tudo do Profissional",
      "Gestão de múltiplas unidades",
      "Prioridade no atendimento",
      "Relatórios personalizados",
    ],
  },
];

function GestaoPerfilPage() {
  return (
    <ServiceLanding
      serviceImage={SERVICE_IMAGE_URL}
      eyebrow="Serviço 02 · Gestão contínua"
      title="Seu perfil sempre atualizado,"
      highlight="todos os meses."
      subtitle="Administramos o Perfil da Empresa no Google com rotina de atualizações, gestão de imagens, acompanhamento de avaliações e relatórios. Você aprova as respostas e as publicações antes de qualquer envio."
      bullets={[
        "Atualização de informações comerciais e horários",
        "Gestão de fotos e imagens do perfil",
        "Preparação de postagens quando houver autorização e integração disponível",
        "Acompanhamento de avaliações com sugestões de resposta feitas por IA",
        "Relatórios de acompanhamento e histórico de serviços",
        "Controle de plano, mensalidade e vencimento",
      ]}
      aside={
        <div className="mt-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
            Planos de gestão
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PLANOS.map((p) => (
              <div
                key={p.nome}
                className={`rounded-xl border p-4 ${
                  p.destaque
                    ? "border-primary/40 bg-primary/[0.07]"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <p className="font-heading text-sm font-bold text-white">{p.nome}</p>
                <ul className="mt-2 space-y-1.5">
                  {p.itens.map((i) => (
                    <li key={i} className="text-[11.5px] leading-snug text-white/55">
                      · {i}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                  Sob consulta
                </p>
              </div>
            ))}
          </div>
        </div>
      }
      checklist={[
        "Acesso de administrador ao Perfil da Empresa (ou convite)",
        "Lista de serviços e produtos para divulgar",
        "Fotos atualizadas do espaço",
        "Forma de aprovação das respostas e postagens",
        "Contato responsável pelo perfil",
      ]}
      note="A gestão depende da autorização do proprietário do perfil. Não prometemos primeira posição no Google, quantidade garantida de avaliações ou resultados não comprováveis. Respostas a avaliações só são publicadas após aprovação, quando configurado."
      servico="gestao_perfil"
      formTitle="Quero a gestão do meu perfil"
      formDescription="Conte o que você precisa e receba a proposta de gestão mensal."
    />
  );
}