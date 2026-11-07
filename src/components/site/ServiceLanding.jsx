import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import ServiceRequestForm from "@/components/site/ServiceRequestForm";

export default function ServiceLanding({
  eyebrow,
  title,
  highlight,
  subtitle,
  bullets = [],
  steps = [],
  checklist = [],
  note,
  servico,
  formTitle,
  formDescription,
  aside,
}) {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="aurora absolute inset-0" />
        <div className="grid-bg absolute inset-0 opacity-30 [mask-image:radial-gradient(60%_60%_at_50%_0%,#000_10%,transparent_100%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">{eyebrow}</p>
              <h1 className="mt-4 font-heading text-[2.1rem] font-extrabold leading-[1.08] text-white sm:text-[2.9rem]">
                {title} <span className="text-gradient-gold">{highlight}</span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">{subtitle}</p>

              <ul className="mt-7 space-y-3">
                {bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-[14px] leading-relaxed text-white/70">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              {steps.length > 0 && (
                <div className="mt-9 grid gap-3 sm:grid-cols-2">
                  {steps.map((s, i) => (
                    <div key={s.title} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <p className="font-heading text-[11px] font-bold text-primary/80">
                        ETAPA 0{i + 1}
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-white">{s.title}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{s.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {aside}
            </div>

            <div className="lg:sticky lg:top-24">
              <ServiceFormWrapper
                servico={servico}
                titulo={formTitle}
                descricao={formDescription}
              />

              {checklist.length > 0 && (
                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                    Checklist de informações
                  </p>
                  <ul className="mt-3 space-y-2">
                    {checklist.map((c) => (
                      <li key={c} className="flex gap-2 text-[12.5px] leading-snug text-white/55">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                        {c}
                      </li>
                    ))}
                  </ul>
                  {note && <p className="mt-3 text-[11px] leading-relaxed text-white/35">{note}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(255,194,74,0.12),transparent)] px-6 py-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-heading text-lg font-bold text-white">Quer contratar ou tirar dúvidas?</p>
            <p className="mt-1 text-[13px] text-white/55">
              Fale com a equipe e receba a proposta do serviço ideal para o seu negócio.
            </p>
          </div>
          <Link
            to="/loja"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-5 py-2.5 text-sm font-bold text-[#0a1128]"
          >
            Ver placas NFC
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function ServiceFormWrapper(props) {
  return <ServiceRequestForm {...props} />;
}