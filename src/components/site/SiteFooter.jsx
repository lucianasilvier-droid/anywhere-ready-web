import { Link } from "@tanstack/react-router";
import { Nfc, MessageCircle, Mail, MapPin } from "lucide-react";
import { WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from "@/lib/site-content";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#050a15]">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#ffd97a] to-[#e0a12c]">
              <Nfc className="h-4.5 w-4.5 text-[#0a1128]" strokeWidth={2.4} />
            </span>
            <span className="font-heading text-sm font-extrabold tracking-[0.14em] text-white">
              GOOGLE NFC CONNECT
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
            Perfil da Empresa no Google, gestão contínua e placas NFC para facilitar o acesso dos
            seus clientes aos canais oficiais.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Serviços</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/60">
            <li><Link to="/servicos/perfil-google" className="hover:text-white">Criação de perfil no Google</Link></li>
            <li><Link to="/servicos/gestao-perfil" className="hover:text-white">Gestão e administração</Link></li>
            <li><Link to="/servicos/placa-nfc" className="hover:text-white">Placa NFC de avaliação</Link></li>
            <li><Link to="/servicos/criacao-site" className="hover:text-white">Criação de site</Link></li>
            <li><Link to="/loja" className="hover:text-white">Loja de placas</Link></li>
            <li><Link to="/conteudos" className="hover:text-white">Guias e conteúdos</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Acesso</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/60">
            <li><Link to="/conta" className="hover:text-white">Área do cliente</Link></li>
            <li><Link to="/seja-representante" className="hover:text-white">Seja um representante</Link></li>
            <li><Link to="/representante" className="hover:text-white">Painel do representante</Link></li>
            <li><Link to="/admin" className="hover:text-white">Painel administrativo</Link></li>
            <li><Link to="/login" className="hover:text-white">Entrar</Link></li>
            <li><Link to="/register" className="hover:text-white">Criar conta</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Contato</p>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" /> {WHATSAPP_DISPLAY}
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary/70" /> contato@googlenfcconnect.com.br
            </li>
            <li className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary/70" /> Atendimento em todo o Brasil
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 text-[12px] text-white/35 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Google NFC Connect. Todos os direitos reservados.</p>
          <p className="max-w-xl md:text-right">
            Não somos afiliados ao Google. Resultados de posicionamento e avaliações não são
            garantidos. A verificação do perfil segue os procedimentos oficiais do Google.
          </p>
        </div>
      </div>
    </footer>
  );
}