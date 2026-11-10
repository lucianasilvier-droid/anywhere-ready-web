import { BookOpen, PlayCircle, Video } from "lucide-react";

const TUTORIAIS = [
  {
    numero: "01",
    titulo: "Cadastro manual de empresa no CRM",
    descricao: "Aprenda a cadastrar uma empresa ou cliente manualmente, preencher os dados e salvar o registro no CRM.",
    arquivo: "/media/tutorials/01-cadastro-manual-crm.mp4",
  },
  {
    numero: "02",
    titulo: "Busca automática de empresas com IA",
    descricao: "Selecione o segmento, informe a cidade, faça a busca, confira os resultados e salve o lead no CRM.",
    arquivo: "/media/tutorials/02-busca-automatica-ia-crm.mp4",
  },
  {
    numero: "03",
    titulo: "Analisar empresa e pedir autorização pelo WhatsApp",
    descricao: "Abra o cadastro, analise a empresa, gere a mensagem de autorização, envie pelo WhatsApp e registre o envio no sistema.",
    arquivo: "/media/tutorials/03-analise-autorizacao-whatsapp.mp4",
  },
];

export default function TutoriaisRepresentante() {
  return (
    <section id="tutoriais" className="scroll-mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-white/[0.02] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">Central de aprendizagem</p>
          <h2 className="mt-1 font-heading text-lg font-extrabold text-white">Tutoriais de uso do sistema</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-white/50">
            Assista aos vídeos na sequência para aprender o fluxo de trabalho do GOOGLE NFC CONNECT.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {TUTORIAIS.map((tutorial) => (
          <article key={tutorial.numero} className="overflow-hidden rounded-xl border border-white/10 bg-[#080f20]/80">
            <div className="aspect-video bg-black">
              <video
                className="h-full w-full object-contain"
                controls
                playsInline
                preload="metadata"
                src={tutorial.arquivo}
                aria-label={tutorial.titulo}
              >
                Seu navegador não conseguiu reproduzir este vídeo.
              </video>
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-2 text-primary">
                <PlayCircle className="h-4 w-4" />
                <span className="text-[10px] font-extrabold tracking-[0.16em]">AULA {tutorial.numero}</span>
              </div>
              <h3 className="mt-2 text-[13px] font-bold leading-snug text-white">{tutorial.titulo}</h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">{tutorial.descricao}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
        <Video className="h-4 w-4 shrink-0 text-primary/80" />
        <p className="text-[11px] leading-relaxed text-white/45">
          Novos tutoriais serão acrescentados nesta mesma central, mantendo a ordem das aulas.
        </p>
      </div>
    </section>
  );
}
