import { createFileRoute } from "@tanstack/react-router";
import ServiceLanding from "@/components/site/ServiceLanding";

export const Route = createFileRoute("/_site/servicos/criacao-site")({
  head: () => ({
    meta: [
      { title: "Criação de Site com Google Maps e Agendamento pelo WhatsApp — Google NFC Connect" },
      {
        name: "description",
        content:
          "Site profissional para o seu negócio local, com mapa do Google Maps, botão de rota e agendamento direto pelo WhatsApp. Veja uma demonstração antes de contratar.",
      },
    ],
  }),
  component: CriacaoSitePage,
});

function CriacaoSitePage() {
  return (
    <ServiceLanding
      eyebrow="Serviço 04 · Site profissional"
      title="Seu negócio com um site que"
      highlight="agenda clientes."
      subtitle="Criamos um site de uma página para a sua empresa, com os seus serviços, o mapa do Google Maps e um formulário que envia o agendamento direto para o seu WhatsApp. Você vê uma demonstração pronta antes de contratar."
      bullets={[
        "Site rápido, bonito e pensado para o celular",
        "Mapa do Google Maps com botão de rota até a sua empresa",
        "Agendamento: o cliente escolhe serviço, dia e período e envia pelo WhatsApp",
        "Botão de WhatsApp sempre visível e link para avaliar no Google",
        "Textos criados para o seu ramo e a sua cidade",
        "Ajustes de WhatsApp, Instagram e horários sem custo extra",
      ]}
      steps={[
        { title: "Analisamos sua empresa", text: "Usamos os dados do seu perfil no Google para entender o seu negócio." },
        { title: "Criamos a demonstração", text: "Você recebe o link de um site pronto com a sua marca." },
        { title: "Você aprova", text: "Ajustamos o que quiser: serviços, textos, horários e contatos." },
        { title: "Site no ar", text: "Publicamos e você começa a receber agendamentos pelo WhatsApp." },
      ]}
      checklist={[
        "Nome da empresa e endereço",
        "Número de WhatsApp para os agendamentos",
        "Lista dos principais serviços",
        "Horário de atendimento",
        "Instagram (opcional)",
      ]}
      note="O agendamento é enviado como mensagem para o WhatsApp da empresa, que confirma o horário com o cliente. Não prometemos posição no Google nem quantidade de clientes."
      servico="criacao_site"
      formTitle="Quero um site para a minha empresa"
      formDescription="Conte sobre o seu negócio e receba uma demonstração do seu site."
    />
  );
}
