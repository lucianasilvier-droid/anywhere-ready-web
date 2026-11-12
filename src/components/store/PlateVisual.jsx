import { Nfc, Star } from "lucide-react";
import { brl } from "@/lib/format";

/** Prévia visual da placa (usada quando o produto não tem foto cadastrada). */
export default function PlateVisual({ nome = "Sua Empresa", compacto = false }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-[#101b30] via-[#0c1524] to-[#0a1220] ${
        compacto ? "p-4" : "p-6"
      }`}
    >
      <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_20%_10%,#4285F4,transparent_45%),radial-gradient(circle_at_80%_80%,#FBBC05,transparent_45%)]" />
      <div className="relative flex items-center justify-between">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[13px] font-bold text-[#4285F4]">
          G
        </span>
        <div className="flex items-center gap-1.5 text-white/50">
          <Nfc className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={`relative mt-3 font-heading font-bold text-white ${compacto ? "text-xs" : "text-sm"}`}>
        Avalie-nos no Google
      </p>
      <p className="relative mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wider text-[#FBBC05]">
        {nome}
      </p>
      <div className="relative mt-2 flex gap-0.5 text-[#FBBC05]">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={compacto ? "h-2.5 w-2.5 fill-current" : "h-3 w-3 fill-current"} />
        ))}
      </div>
      <div className="relative mt-3 flex items-center justify-between rounded-md bg-gradient-to-r from-[#4285F4]/70 via-[#EA4335]/70 to-[#34A853]/70 px-2 py-1">
        <span className="text-[8px] font-bold uppercase tracking-widest text-white">
          Aproxime o celular
        </span>
        <span className="text-[8px] font-bold text-white/80">{brl(55)}</span>
      </div>
    </div>
  );
}