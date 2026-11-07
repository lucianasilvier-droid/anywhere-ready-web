import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera, Copy, ExternalLink, Loader2, Save, Trash2, Users, ShoppingBag } from "lucide-react";
import { minhaPaginaFn, salvarMinhaPaginaFn } from "@/lib/landing-representante-fns";
import SemVinculo, { PainelCarregando } from "@/components/representante/SemVinculo";
import { brl, dataHora } from "@/lib/format";

export const Route = createFileRoute("/_authed/representante/pagina")({
  head: () => ({ meta: [{ title: "Minha página — Representante" }] }),
  component: MinhaPagina,
});

const SERVICO_LABEL = {
  perfil_google: "Perfil no Google",
  gestao_perfil: "Gestão mensal",
  placa_nfc: "Placa NFC",
  criacao_site: "Criação de site",
  nao_sei: "A definir",
};

function slugify(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40);
}

/** Reduz a foto para no máximo 640px e converte para JPEG antes do envio. */
function reduzirFoto(arquivo) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 640;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Não foi possível ler esta imagem."));
    img.src = URL.createObjectURL(arquivo);
  });
}

function MinhaPagina() {
  const carregarFn = useServerFn(minhaPaginaFn);
  const salvarFn = useServerFn(salvarMinhaPaginaFn);
  const [dados, setDados] = useState(null);
  const [form, setForm] = useState(null);
  const [foto, setFoto] = useState(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const preencher = (pagina, nome) =>
    setForm({
      pagina_slug: pagina.pagina_slug || slugify(nome),
      pagina_titulo: pagina.pagina_titulo,
      pagina_bio: pagina.pagina_bio,
      pagina_cidade: pagina.pagina_cidade,
      pagina_instagram: pagina.pagina_instagram,
      pagina_whatsapp: pagina.pagina_whatsapp,
      pagina_ativa: pagina.pagina_ativa,
    });

  const carregar = useCallback(async () => {
    try {
      const d = await carregarFn();
      setDados(d);
      if (d.vinculado) preencher(d.pagina, d.pagina.nome);
    } catch (e) {
      setErro(e?.message || "Não foi possível carregar sua página.");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) return <PainelCarregando />;
  if (!dados?.vinculado) return <SemVinculo erro={erro} />;

  const { pagina, contatos, pedidos } = dados;
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const link = pagina.pagina_slug ? `${origem}/r/${pagina.pagina_slug}` : "";
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const fotoAtual = foto || (removerFoto ? "" : pagina.foto);

  async function escolherFoto(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    try {
      setFoto(await reduzirFoto(arquivo));
      setRemoverFoto(false);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function salvar(event) {
    event.preventDefault();
    setSalvando(true);
    try {
      const r = await salvarFn({
        data: {
          ...form,
          pagina_slug: slugify(form.pagina_slug).replace(/-+$/, ""),
          ...(foto ? { foto } : {}),
          remover_foto: removerFoto,
        },
      });
      setDados((d) => ({ ...d, pagina: r.pagina }));
      preencher(r.pagina, r.pagina.nome);
      setFoto(null);
      setRemoverFoto(false);
      toast.success("Página atualizada.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const input = "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none";
  const rotulo = "text-[11px] font-semibold uppercase tracking-wider text-white/45";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Minha página</p>
          <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Sua landing page de vendas</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-white/45">
            Divulgue este link. Os contatos chegam aqui e no CRM, e as compras feitas na loja a partir dele
            geram comissão automaticamente.
          </p>
        </div>
        {link && pagina.pagina_ativa && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copiado."))}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 hover:text-white"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar link
            </button>
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11.5px] font-bold text-[#0a1128]">
              <ExternalLink className="h-3.5 w-3.5" /> Ver página
            </a>
          </div>
        )}
      </header>

      {pagina.status !== "ativo" && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12.5px] text-amber-200">
          Seu cadastro não está ativo, por isso a página não aparece para o público. Fale com o administrador.
        </p>
      )}

      <form onSubmit={salvar} className="grid gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-36 w-36 overflow-hidden rounded-full border-2 border-primary/40 bg-white/5">
            {fotoAtual ? (
              <img src={fotoAtual} alt="Sua foto" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center font-heading text-4xl font-extrabold text-primary">
                {pagina.nome.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 hover:text-white">
            <Camera className="h-3.5 w-3.5" /> {fotoAtual ? "Trocar foto" : "Enviar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={escolherFoto} />
          </label>
          {fotoAtual && (
            <button type="button" onClick={() => { setFoto(null); setRemoverFoto(true); }} className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-red-300">
              <Trash2 className="h-3 w-3" /> Remover foto
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={rotulo}>Endereço da página</span>
            <div className="mt-1.5 flex items-center rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-primary/50">
              <span className="pl-3.5 text-sm text-white/35">{origem}/r/</span>
              <input
                value={form.pagina_slug}
                onChange={(e) => setForm((f) => ({ ...f, pagina_slug: slugify(e.target.value) }))}
                className="w-full bg-transparent py-2.5 pr-3.5 text-sm text-white focus:outline-none"
              />
            </div>
          </label>
          <label>
            <span className={rotulo}>Título</span>
            <input className={input} value={form.pagina_titulo} onChange={set("pagina_titulo")} placeholder="Representante comercial" />
          </label>
          <label>
            <span className={rotulo}>Cidade / região</span>
            <input className={input} value={form.pagina_cidade} onChange={set("pagina_cidade")} placeholder="São Paulo - SP" />
          </label>
          <label>
            <span className={rotulo}>WhatsApp</span>
            <input className={input} value={form.pagina_whatsapp} onChange={set("pagina_whatsapp")} placeholder="(11) 90000-0000" />
          </label>
          <label>
            <span className={rotulo}>Instagram</span>
            <input className={input} value={form.pagina_instagram} onChange={set("pagina_instagram")} placeholder="@seuperfil" />
          </label>
          <label className="sm:col-span-2">
            <span className={rotulo}>Apresentação</span>
            <textarea rows={4} maxLength={1200} className={input} value={form.pagina_bio} onChange={set("pagina_bio")} placeholder="Conte quem você é e como ajuda as empresas da sua região." />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-white/70 sm:col-span-2">
            <input type="checkbox" checked={form.pagina_ativa} onChange={(e) => setForm((f) => ({ ...f, pagina_ativa: e.target.checked }))} className="h-4 w-4 accent-[#f0ac2b]" />
            Página publicada (visível para o público)
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={salvando} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-5 py-2.5 text-sm font-bold text-[#0a1128] disabled:opacity-60">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar página
            </button>
          </div>
        </div>
      </form>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 font-heading text-sm font-bold text-white">
          <Users className="h-4 w-4 text-primary" /> Contatos recebidos pela página ({contatos.length})
        </h2>
        {contatos.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-[12.5px] text-white/45">
            Nenhum contato ainda. Compartilhe seu link no WhatsApp e nas redes sociais.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-2xl border border-white/[0.08]">
            {contatos.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-white">
                    {c.empresa}{c.nome && c.nome !== c.empresa ? ` · ${c.nome}` : ""}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {SERVICO_LABEL[c.servico] || c.servico}{c.cidade ? ` · ${c.cidade}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.telefone && (
                    <a
                      href={`https://wa.me/${c.telefone.replace(/\D/g, "").replace(/^(?!55)/, "55")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11.5px] font-semibold text-emerald-300 hover:underline"
                    >
                      {c.telefone}
                    </a>
                  )}
                  <span className="whitespace-nowrap text-[10.5px] text-white/30">{dataHora(c.criado_em)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 font-heading text-sm font-bold text-white">
          <ShoppingBag className="h-4 w-4 text-primary" /> Pedidos da loja indicados por você ({pedidos.length})
        </h2>
        {pedidos.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-[12.5px] text-white/45">
            Quando um cliente comprar na loja depois de visitar sua página, o pedido aparece aqui e a comissão é lançada em Histórico de vendas.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-2xl border border-white/[0.08]">
            {pedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[12.5px]">
                <span className="font-mono text-white">{p.numero}</span>
                <span className="truncate text-white/60">{p.cliente_nome}</span>
                <span className="font-semibold text-primary">{brl(p.total)}</span>
                <span className="text-[11px] text-white/40">{p.status_pagamento === "pago" ? "Pago" : "Aguardando pagamento"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
