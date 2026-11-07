import { Link } from "@tanstack/react-router";
import { MessageCircle, ArrowRight } from "lucide-react";
import { whatsappLink, WHATSAPP_DISPLAY } from "@/lib/site-content";

export default function FinalCta() {
  return (
    <section className="border-t border-white/[0.06] bg-[#050a15] py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,rgba(255,194,74,0.14),rgba(66,133,244,0.10)_55%,transparent)] px-6 py-12 sm:px-12">
          <div className="grid-bg absolute inset-0 opacity-25" />
          <div className="relative flex flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-heading text-2xl font-extrabold leading-tight text-white sm:text-[2.1rem]">
                Garanta já o seu e comece a ser encontrado hoje.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Fale com a nossa equipe pelo WhatsApp, tire suas dúvidas e receba a proposta do
                serviço ideal para o seu momento.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a
                href={whatsappLink("Olá! Quero fazer meu pedido.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-bold text-[#062b14]"
              >
                <MessageCircle className="h-4 w-4" />
                {WHATSAPP_DISPLAY}
              </a>
              <Link
                to="/loja"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white hover:border-primary/50"
              >
                Ver a loja
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}