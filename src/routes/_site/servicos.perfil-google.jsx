import { createFileRoute } from "@tanstack/react-router";
import ServiceLanding from "@/components/site/ServiceLanding";
import { SERVICE_IMAGE_URL } from "@/lib/site-content";

export const Route = createFileRoute("/_site/servicos/perfil-google")({
  head: () => ({
    meta: [
      { title: "Criação de Perfil da Empresa no Google Maps — Google NFC Connect" },
      {
        name: "description",
        content:
          "Criamos e configuramos o Perfil da Empresa no Google: endereço, telefone, horários, fotos, categoria e links. Acompanhe cada etapa do serviço.",
      },
    ],
  }),
  component: PerfilGooglePage,
});

function PerfilGooglePage() {
  return (
    <ServiceLanding
      serviceImage={SERVICE_IMAGE_URL}
      eyebrow="Serviço 01 · Google Maps"
      title="Coloque sua empresa no"
      highlight="Google Maps!"
      subtitle="Mais visibilidade e mais clientes encontrando o seu negócio. Cuidamos da criação e configuração do Perfil da Empresa, com acompanhamento de cada etapa e respeito aos procedimentos oficiais do Google."
      bullets={[
        "Mais visibilidade para o seu negócio na busca e no mapa",
        "Apareça para clientes que procuram na sua região",
        "Endereço, telefone, horários, fotos e muito mais",
        "Seja encontrado com facilidade, no celular e no computador",
      ]}
      steps={[
        {
          title: "Briefing e coleta",
          text: "Você envia os dados, documentos e imagens da empresa pelo formulário ou pela área do cliente.",
        },
        {
          title: "Configuração do perfil",
          text: "Montamos categoria, descrição, horários, serviços, fotos, logo e links de site e redes sociais.",
        },
        {
          title: "Reivindicação e verificação",
          text: "A reivindicação e a verificação seguem o procedimento oficial do Google, com a sua autorização como proprietário.",
        },
        {
          title: "Acompanhamento",
          text: "Você acompanha o andamento etapa por etapa e recebe o histórico de tudo o que foi feito.",
        },
      ]}
      checklist={[
        "Nome comercial exatamente como deve aparecer",
        "Endereço completo com ponto de referência",
        "Telefone e WhatsApp de atendimento",
        "Categoria principal e categorias secundárias",
        "Descrição da empresa e principais serviços",
        "Horários de funcionamento",
        "Logotipo, fotos da fachada e do interior",
        "Links do site, Instagram e outras redes",
      ]}
      note="A publicação e a verificação do perfil dependem da análise do Google. Nenhum perfil é declarado publicado ou verificado sem confirmação real da plataforma."
      servico="perfil_google"
      formTitle="Solicitar criação de perfil"
      formDescription="Envie seus dados e receba o checklist completo para começar."
    />
  );
}