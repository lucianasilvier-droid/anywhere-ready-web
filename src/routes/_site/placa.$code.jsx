import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Star, Instagram, MapPin, Nfc } from "lucide-react";
import { getPlateByCode } from "@/lib/server-fns";

export const Route = createFileRoute("/_site/placa/$code")({
  head: () => ({ meta: [{ title: "Avalie sua experiência — Google NFC Connect" }] }),
  component: PlacaPage,
});

function PlacaPage() {
  const { code } = Route.useParams();
  const buscar = useServerFn(getPlateByCode);
  const [placa, setPlaca] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    buscar({ data: { codigo: code } })
      .then((r) => ativo && setPlaca(r?.placa || null))
      .catch(() => ativo && setPlaca(null))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [code]);

  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      <div className="aurora absolute inset-0" />
      <div className="grid-bg absolute inset-0 opacity-25" />
      <div className="relative mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
        {carregando ? (
          <div className="flex items-center gap-2 py-20 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : !placa ? (
          <div className="glass-card w-full rounded-2xl p-8 text-center">
            <Nfc className="mx-auto h-9 w-9 text-white/30" />
            <p className="mt-3 font-heading text-lg font-bold text-white">Placa não encontrada</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
              Confira o endereço ou fale com a empresa que entregou a placa.
            </p>
            <p className="mt-3 font-mono text-[11px] text-white/25">{code}</p>
          </div>
        ) : (
          <>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Google NFC Connect
            </span>
            <h1 className="mt-5 text-center font-heading text-2xl font-extrabold leading-tight text-white">
              {placa.nome_exibicao || placa.empresa || "Sua empresa"}
            </h1>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-white/50">
              <MapPin className="h-3.5 w-3.5" /> Avalie sua experiência no Google
            </p>

            <div className="mt-4 flex gap-0.5 text-[#FBBC05]">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
            </div>

            <div className="mt-8 w-full space-y-3">
              {placa.google_review_url ? (
                <a
                  href={placa.google_review_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4285F4] to-[#2f6fdc] px-6 py-4 text-sm font-bold text-white shadow-[0_18px_40px_-18px_rgba(66,133,244,0.9)]"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[13px] font-bold text-[#4285F4]">
                    G
                  </span>
                  Avaliar no Google
                </a>
              ) : (
                <p className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-[12px] text-amber-200">
                  O link de avaliação ainda não foi configurado para esta placa.
                </p>
              )}

              {placa.instagram_url && (
                <a
                  href={placa.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-6 py-4 text-sm font-bold text-white"
                >
                  <Instagram className="h-4.5 w-4.5" /> Ver Instagram
                </a>
              )}
            </div>

            <div className="mt-8 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[11px] leading-relaxed text-white/35">
              <Nfc className="h-4 w-4 shrink-0" />
              Esta é a página exclusiva da placa. O chip NFC abre este mesmo endereço.
            </div>
            <p className="mt-4 text-center text-[10.5px] leading-relaxed text-white/25">
              Sua avaliação é espontânea e não é criada automaticamente por este sistema.
            </p>
          </>
        )}
      </div>
    </div>
  );
}