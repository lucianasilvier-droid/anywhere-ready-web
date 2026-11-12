import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site-content";

export default function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-[#062b14] shadow-[0_18px_45px_-16px_rgba(37,211,102,0.9)] transition-transform hover:-translate-y-0.5"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Fale conosco</span>
    </a>
  );
}