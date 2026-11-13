import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { zipSync, strToU8 } from "fflate";
import { Copy, Download, ExternalLink, Globe, Loader2, MessageCircle, Plus, RefreshCw, Save, Server, Wand2 } from "lucide-react";
import { atualizarSiteFn, gerarSiteFn, registrarVendaSiteFn, representantesParaSiteFn, siteDoLeadFn } from "@/lib/sites-clientes-fns";
import { competenciaAtual } from "@/lib/representante-ui";
import { MENSALIDADE_SITE, PRECO_SITE, custosDoSite, resumoFinanceiro } from "@/lib/preco-site";
import { brl } from "@/lib/format";

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[caractere]);
}

function exportarSiteZip(site) {
  const conteudo = site.conteudo || {};
  const fotos = (Array.isArray(site.fotos) ? site.fotos : []).filter((foto) => foto?.url && /^https:\/\//i.test(foto.url)).slice(0, 8);
  const publico = {
    slug: site.slug, empresa: site.empresa, categoria: site.categoria || "",
    endereco: site.endereco || "", cidade: site.cidade || "", bairro: site.bairro || "",
    estado: site.estado || "", telefone: site.telefone || "", whatsapp: site.whatsapp || "",
    instagram: site.instagram || "", horario: site.horario || "", fotos, conteudo,
  };
  const servicos = (conteudo.servicos || []).map((item) =>
    "<article class='service-card'><span class='card-mark'>✦</span><h3>" + escaparHtml(item.nome) + "</h3><p>" + escaparHtml(item.descricao) + "</p></article>"
  ).join("");
  const cardapio = (conteudo.cardapio || []).map((item) =>
    "<article class='menu-card'>" + (item.imagem_url ? '<img src="' + escaparHtml(item.imagem_url) + '" alt="' + escaparHtml(item.nome) + '">' : "") +
    "<small>" + escaparHtml(item.categoria) + "</small><h3>" + escaparHtml(item.nome) + "</h3><p>" +
    escaparHtml(item.descricao) + "</p>" + (item.preco ? "<strong>" + escaparHtml(item.preco) + "</strong>" : "") + "</article>"
  ).join("");
  const perguntas = (conteudo.perguntas || []).map((item) =>
    "<details><summary>" + escaparHtml(item.pergunta) + "</summary><p>" + escaparHtml(item.resposta) + "</p></details>"
  ).join("");
  const local = [site.endereco, site.bairro, site.cidade, site.estado].filter(Boolean).join(", ");
  const numero = String(site.whatsapp || site.telefone || "").replace(/\D/g, "");
  const wa = numero ? "https://wa.me/" + (numero.length <= 11 ? "55" + numero : numero) + "?text=" + encodeURIComponent("Olá, " + site.empresa + "! Gostaria de mais informações.") : "";
  const mapa = "https://www.google.com/maps?q=" + encodeURIComponent([site.empresa, local].filter(Boolean).join(", ")) + "&output=embed";
  const galeria = fotos.length ? "<section class='gallery-section'><div class='section-heading'><span class='eyebrow'>CONHEÇA O ESPAÇO</span><h2>Imagens de " + escaparHtml(site.empresa) + "</h2></div><div class='gallery'>" + fotos.map((foto) => "<figure><img src='" + escaparHtml(foto.url) + "' alt='Foto de " + escaparHtml(site.empresa) + "' loading='lazy'>" + ((foto.creditos || []).some((x) => x.nome) ? "<figcaption>Imagem do Google Maps</figcaption>" : "") + "</figure>").join("") + "</div></section>" : "";
  const html = [
    "<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>",
    "<meta name='theme-color' content='#101c2c'><title>" + escaparHtml(site.empresa) + (site.cidade ? " — " + escaparHtml(site.cidade) : "") + "</title>",
    "<meta name='description' content='" + escaparHtml(conteudo.seo_descricao || conteudo.subtitulo || site.empresa) + "'><link rel='preconnect' href='https://fonts.googleapis.com'><link rel='preconnect' href='https://fonts.gstatic.com' crossorigin><link href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap' rel='stylesheet'><link rel='stylesheet' href='styles.css'></head><body>",
    "<header class='site-header'><a class='brand' href='#topo'>" + escaparHtml(site.empresa) + "</a><nav><a href='#servicos'>Serviços</a>" + (cardapio ? "<a href='#cardapio'>Cardápio</a>" : "") + "<a href='#sobre'>Sobre</a><a href='#local'>Localização</a></nav>" + (wa ? "<a class='button button-small' href='" + wa + "' target='_blank' rel='noreferrer'>Fale conosco ↗</a>" : "") + "</header>",
    "<main id='topo'><section class='hero'><div class='hero-copy'><span class='eyebrow'>" + escaparHtml(conteudo.slogan || site.categoria || "SEJA BEM-VINDO") + "</span><h1>" + escaparHtml(conteudo.titulo || site.empresa) + "</h1><p class='lead'>" + escaparHtml(conteudo.subtitulo) + "</p>" + (wa ? "<a class='button' href='" + wa + "' target='_blank' rel='noreferrer'>Conversar pelo WhatsApp <span>↗</span></a>" : "") + (local ? "<p class='hero-location'>⌖ " + escaparHtml(local) + "</p>" : "") + "</div>" + (fotos[0] ? "<div class='hero-photo'><img src='" + escaparHtml(fotos[0].url) + "' alt='Foto de " + escaparHtml(site.empresa) + "'></div>" : "<div class='hero-placeholder'><span>✦</span><strong>" + escaparHtml(site.empresa) + "</strong></div>") + "</section>",
    galeria,
    servicos ? "<section id='servicos'><div class='section-heading'><span class='eyebrow'>O QUE OFERECEMOS</span><h2>Serviços e especialidades</h2></div><div class='grid'>" + servicos + "</div></section>" : "",
    cardapio ? "<section id='cardapio' class='menu-section'><div class='section-heading'><span class='eyebrow'>NOSSAS OPÇÕES</span><h2>Cardápio</h2></div><div class='grid'>" + cardapio + "</div></section>" : "",
    "<section id='sobre' class='about-section'><div><span class='eyebrow'>NOSSA HISTÓRIA</span><h2>Sobre " + escaparHtml(site.empresa) + "</h2></div><div><p>" + escaparHtml(conteudo.sobre).replace(/\n/g, "<br>") + "</p>" + (conteudo.observacao_operador ? "<p>" + escaparHtml(conteudo.observacao_operador) + "</p>" : "") + "</div></section>",
    perguntas ? "<section class='faq-section'><div class='section-heading'><span class='eyebrow'>DÚVIDAS FREQUENTES</span><h2>Como podemos ajudar?</h2></div>" + perguntas + "</section>" : "",
    "<section id='local' class='location-section'><div class='section-heading'><span class='eyebrow'>ESTAMOS AQUI</span><h2>Venha nos conhecer</h2><p>" + escaparHtml(local) + "</p></div><iframe title='Mapa de localização' loading='lazy' src='" + mapa + "'></iframe></section>",
    "</main><footer><strong>" + escaparHtml(site.empresa) + "</strong><span>" + escaparHtml(site.categoria || "") + "</span><small>Informações sujeitas à confirmação diretamente com a empresa.</small></footer>" + (wa ? "<a class='whatsapp-float' href='" + wa + "' target='_blank' rel='noreferrer' aria-label='Falar pelo WhatsApp'>WhatsApp ↗</a>" : "") + "</body></html>",
  ].join("");
  const css = [
    "*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;background:#f7f8fa;color:#172437;font:16px/1.7 'DM Sans',Arial,sans-serif}a{color:inherit;text-decoration:none}.site-header,main,footer{max-width:1160px;margin:auto;padding-left:28px;padding-right:28px}.site-header{height:82px;display:flex;justify-content:space-between;gap:24px;align-items:center}.brand{font-weight:800;font-size:19px;letter-spacing:-.04em}.site-header nav{display:flex;gap:26px;color:#637083;font-size:13px;font-weight:600}.site-header nav a:hover{color:#172437}.button{display:inline-flex;align-items:center;gap:16px;background:#176b58;color:#fff;padding:15px 23px;border-radius:999px;font-weight:700;box-shadow:0 12px 28px #176b5830;transition:transform .2s,box-shadow .2s}.button:hover{transform:translateY(-2px);box-shadow:0 16px 32px #176b5840}.button-small{padding:10px 17px;font-size:12px}.hero{display:grid;grid-template-columns:1fr .9fr;gap:55px;align-items:center;padding-top:65px;padding-bottom:78px;min-height:490px}.hero-copy{max-width:560px}.eyebrow{display:inline-block;color:#176b58;font-size:11px;font-weight:800;letter-spacing:.17em;text-transform:uppercase}.hero h1,h2{font-family:'Playfair Display',Georgia,serif;letter-spacing:-.035em;line-height:1.08}.hero h1{font-size:clamp(42px,6vw,72px);margin:19px 0}.lead{font-size:18px;color:#647184;max-width:540px;margin-bottom:28px}.hero-location{font-size:13px;color:#6e7a8a;margin-top:20px}.hero-photo,.hero-placeholder{height:410px;border-radius:28px;overflow:hidden;background:#e6ecea;box-shadow:0 28px 65px #14233820}.hero-photo img{width:100%;height:100%;object-fit:cover}.hero-placeholder{display:grid;place-content:center;text-align:center;color:#176b58;gap:12px}.hero-placeholder span{font-size:48px}.hero-placeholder strong{font:700 24px 'Playfair Display',Georgia,serif}.section-heading{margin-bottom:30px}.section-heading h2,.about-section h2{font-size:clamp(30px,4vw,44px);margin:10px 0}.section-heading p{color:#667487}.gallery-section,#servicos,#cardapio,.faq-section,.location-section{padding-top:58px;padding-bottom:58px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}.gallery figure{margin:0;height:210px;border-radius:18px;overflow:hidden;background:#e8ecef;position:relative}.gallery img{width:100%;height:100%;object-fit:cover}.gallery figcaption{position:absolute;bottom:0;left:0;right:0;padding:20px 12px 9px;background:linear-gradient(transparent,#0009);color:white;font-size:10px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px}.service-card,.menu-card,details{background:#fff;border:1px solid #e7ebef;border-radius:20px;padding:25px;box-shadow:0 12px 30px #17243708}.service-card h3,.menu-card h3{font-size:18px;margin:12px 0 7px}.service-card p,.menu-card p,details p{color:#6b7787;font-size:14px}.card-mark{color:#176b58;font-size:22px}.menu-section{background:#eef3f1;margin:0 -28px;padding-left:28px;padding-right:28px}.menu-card img{width:100%;height:175px;object-fit:cover;border-radius:13px}.menu-card small{display:block;color:#176b58;margin-top:12px}.menu-card strong{color:#176b58}.about-section{display:grid;grid-template-columns:.75fr 1.25fr;gap:55px;padding:76px 0;border-top:1px solid #e3e8ec}.about-section p{color:#596779}.faq-section details{margin:12px 0;padding:18px 22px}.faq-section summary{font-weight:700;cursor:pointer}.location-section iframe{width:100%;height:330px;border:0;border-radius:22px}.location-section{padding-bottom:80px}footer{padding-top:28px;padding-bottom:35px;border-top:1px solid #e3e8ec;display:flex;align-items:center;gap:18px;flex-wrap:wrap}footer small{width:100%;color:#7a8492}.whatsapp-float{position:fixed;right:22px;bottom:22px;background:#176b58;color:white;padding:13px 20px;border-radius:999px;box-shadow:0 10px 30px #0003;font-weight:700;font-size:13px;z-index:5}@media(max-width:760px){.site-header,main,footer{padding-left:19px;padding-right:19px}.site-header{height:auto;min-height:74px;flex-wrap:wrap;padding-top:15px;padding-bottom:15px}.site-header nav{order:3;width:100%;gap:17px;overflow-x:auto;padding-bottom:5px}.site-header nav a{white-space:nowrap}.button-small{margin-left:auto}.hero{grid-template-columns:1fr;gap:27px;padding-top:38px;padding-bottom:48px;min-height:0}.hero h1{font-size:clamp(39px,11vw,58px)}.lead{font-size:16px}.hero-photo,.hero-placeholder{height:280px}.gallery-section,#servicos,#cardapio,.faq-section,.location-section{padding-top:42px;padding-bottom:42px}.gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.gallery figure{height:145px}.grid{grid-template-columns:1fr}.menu-section{margin:0 -19px;padding-left:19px;padding-right:19px}.about-section{grid-template-columns:1fr;gap:10px;padding:50px 0}.location-section iframe{height:260px}.whatsapp-float{right:14px;bottom:14px}}",
  ].join("");
  const arquivos = {
    "index.html": strToU8(html),
    "styles.css": strToU8(css),
    "site.json": strToU8(JSON.stringify(publico, null, 2)),
    "README.txt": strToU8("SITE EDITÁVEL — " + site.empresa + "\n\nAbra index.html no navegador. Edite o conteúdo em site.json e o visual em styles.css. O layout é responsivo e não exige dependências pagas.\n\nAs fotos cadastradas do Google Maps e do cardápio são exibidas por URL; a disponibilidade depende da validade e das permissões dessas imagens.\n"),
    "assets/README.txt": strToU8("As imagens deste site são carregadas pelas URLs registradas no cadastro. Para manter fotos locais, baixe-as respeitando os direitos e as condições de uso de cada imagem.\n"),
  };
  const pacote = zipSync(arquivos, { level: 6 });
  const blob = new Blob([pacote], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "site-" + (site.slug || "demonstracao") + ".zip";
  link.click();
  URL.revokeObjectURL(url);
}
const STATUS = {
  demonstracao: { label: "Demonstração", cls: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
  publicado: { label: "Publicado", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  desativado: { label: "Desativado", cls: "border-white/15 bg-white/5 text-white/50" },
};

/**
 * Cartão do CRM: cria uma demonstração local sem API paga a partir dos dados cadastrados no CRM.
 */
export default function SiteDoLead({ lead, onUsarMensagem, onGerado }) {
  const buscar = useServerFn(siteDoLeadFn);
  const gerar = useServerFn(gerarSiteFn);
  const atualizar = useServerFn(atualizarSiteFn);
  const [site, setSite] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [orientacoes, setOrientacoes] = useState("");
  const [ajustes, setAjustes] = useState({ whatsapp: "", instagram: "", horario: "", slug: "" });

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscar({ data: { leadId: lead.id } })
      .then((r) => ativo && setSite(r?.site || null))
      .catch(() => {})
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    if (site) setAjustes({ whatsapp: site.whatsapp || "", instagram: site.instagram || "", horario: site.horario || "", slug: site.slug || "" });
  }, [site]);

  const mGerarAutomatico = useMutation({
    mutationFn: () => gerar({ data: { leadId: lead.id, orientacoes } }),
    onSuccess: (r) => {
      if (!r?.ok || !r?.site) {
        toast.error("O CRM não confirmou a criação do site.");
        return;
      }
      setSite(r.site);
      if (Number(r.site.fotos_count) > 0) {
        toast.success(`Site salvo com ${r.site.fotos_count} foto(s) reais do Google. Link pronto para revisão.`);
      } else {
        toast.warning(`Site salvo, mas a galeria não foi validada: ${r.site.fotos_mensagem || "fotos indisponíveis"}. Não apresente ao cliente antes de revisar as imagens.`);
      }
      onGerado?.();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível criar o site."),
  });

  const mAtualizar = useMutation({
    mutationFn: (patch) => atualizar({ data: { id: site.id, ...patch } }),
    onSuccess: (r) => {
      setSite(r?.site || site);
      toast.success("Site atualizado.");
    },
    onError: (e) => toast.error(e?.message || "Não foi possível atualizar o site."),
  });

  const semSite = !lead.site;
  const url = site && typeof window !== "undefined" ? `${window.location.origin}/site/${site.slug}` : "";


  return (
    <section className={`rounded-2xl border p-4 ${semSite ? "border-primary/30 bg-primary/[0.05]" : "border-white/[0.08] bg-white/[0.025]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/60">
          <Globe className="h-4 w-4 text-primary" /> Site para o cliente
        </p>
        {site && (
          <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${STATUS[site.status]?.cls || STATUS.demonstracao.cls}`}>
            {STATUS[site.status]?.label || site.status}
          </span>
        )}
      </div>

      {carregando ? (
        <p className="mt-3 flex items-center gap-2 text-[12px] text-white/40"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando...</p>
      ) : !site ? (
        <div className="mt-2.5 space-y-3">
          <p className="text-[12.5px] leading-relaxed text-white/65">
            {semSite ? (
              <><strong className="text-white">Esta empresa ainda não tem site.</strong> </>
            ) : (
              <><strong className="text-white">Esta empresa já tem site.</strong> Você também pode preparar uma nova demonstração moderna para apresentar ao cliente. </>
            )}
            Crie a demonstração diretamente no sistema. O gerador usa os dados já cadastrados no CRM, salva o site e prepara o link para você enviar ao cliente, sem API paga ou etapas de copiar e colar.
          </p>
          <textarea
            value={orientacoes}
            onChange={(e) => setOrientacoes(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="Observação opcional que aparecerá no site (não inclua dados não confirmados)"
            className={inputCls}
          />
          <button
            onClick={() => mGerarAutomatico.mutate()}
            disabled={mGerarAutomatico.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
          >
            {mGerarAutomatico.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {mGerarAutomatico.isPending ? "Criando demonstração..." : "Criar site automaticamente"}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="truncate text-[13px] font-semibold text-white">{site.conteudo?.titulo || site.empresa}</p>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] text-white/45">{site.conteudo?.subtitulo}</p>
            <a href={`/site/${site.slug}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 break-all text-[11.5px] font-semibold text-[#8ab4f8] hover:underline">
              /site/{site.slug} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <a href={`/site/${site.slug}`} target="_blank" rel="noreferrer" className={btnCls}>
              <ExternalLink className="h-3 w-3" /> Ver site
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(url);
                toast.success("Link copiado.");
              }}
              className={btnCls}
            >
              <Copy className="h-3 w-3" /> Copiar link
            </button>
            <button onClick={() => exportarSiteZip(site)} className={btnCls}>
              <Download className="h-3 w-3" /> Exportar ZIP editável
            </button>
            <button
              onClick={() =>
                onUsarMensagem?.(
                  `Olá! Tudo bem? Preparamos uma demonstração gratuita de site para a ${site.empresa}, com mapa do Google e contato direto pelo WhatsApp:\n${url}\n\nSe gostar, ativamos com o seu domínio e ajustamos o que quiser. Posso te explicar como funciona?`,
                )
              }
              className={btnCls}
            >
              <MessageCircle className="h-3 w-3" /> Oferecer pelo WhatsApp
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
              WhatsApp para contato e reservas
              <input value={ajustes.whatsapp} onChange={(e) => setAjustes({ ...ajustes, whatsapp: e.target.value })} placeholder="(11) 99999-9999" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
              Instagram
              <input value={ajustes.instagram} onChange={(e) => setAjustes({ ...ajustes, instagram: e.target.value })} placeholder="@empresa" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
              Horário de atendimento
              <input value={ajustes.horario} onChange={(e) => setAjustes({ ...ajustes, horario: e.target.value })} placeholder="Seg a sáb, 9h às 19h" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
              Endereço do site
              <input value={ajustes.slug} onChange={(e) => setAjustes({ ...ajustes, slug: e.target.value })} placeholder="nome-da-empresa" className={`${inputCls} mt-1`} />
            </label>
          </div>
          <p className="text-[10.5px] leading-relaxed text-white/30">
            Se a empresa não usa WhatsApp no telefone do Google, informe o número correto para contato ou reservas.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => mAtualizar.mutate(ajustes)} disabled={mAtualizar.isPending} className={`${btnCls} border-primary/40 text-primary`}>
              {mAtualizar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar ajustes
            </button>
            <select
              value={site.status}
              onChange={(e) => mAtualizar.mutate({ status: e.target.value })}
              disabled={mAtualizar.isPending}
              className="rounded-full border border-white/12 bg-[#0d1729] px-2.5 py-1.5 text-[11px] font-semibold text-white"
            >
              <option value="demonstracao">Demonstração (com aviso, fora do Google)</option>
              <option value="publicado">Publicado (cliente contratou)</option>
              <option value="desativado">Desativado</option>
            </select>
          </div>

          <PrecoDoSite site={site} salvando={mAtualizar.isPending} onSalvar={(patch) => mAtualizar.mutate(patch)} />

          <div className="rounded-xl border border-white/[0.07] p-3">
            <p className="text-[11.5px] font-semibold text-white/55">Atualizar demonstração</p>
            <textarea
              value={orientacoes}
              onChange={(e) => setOrientacoes(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="Orientações opcionais para a atualização"
              className={`${inputCls} mt-2`}
            />
            <button onClick={() => mGerarAutomatico.mutate()} disabled={mGerarAutomatico.isPending} className={`${btnCls} mt-2`}>
              {mGerarAutomatico.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Atualizar site automaticamente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Valor do site, comissão e mensalidade de administração (R$ 150/mês: R$ 50 representante, R$ 100 empresa). */
function PrecoDoSite({ site, salvando, onSalvar }) {
  const valorAtual = Number(site.valor_final ?? site.valor_sugerido) || 0;
  const [valor, setValor] = useState(valorAtual);
  useEffect(() => setValor(valorAtual), [valorAtual]);

  if (!valorAtual) return null;
  const d = site.preco_detalhes || {};
  const mensalidade = !!site.mensalidade_contratada;
  const custos = custosDoSite(site);
  const r = resumoFinanceiro(valorAtual, { mensalidade, custos });
  const ano = mensalidade
    ? {
        cliente: r.site.cliente_paga + 12 * r.mensalidade.cliente_paga_por_mes,
        rep: r.site.representante + 12 * r.mensalidade.representante_por_mes,
        empresa: r.site.empresa + 12 * r.mensalidade.empresa_por_mes,
      }
    : null;
  const valido = valor >= PRECO_SITE.minimo && valor <= PRECO_SITE.maximo;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-[11.5px] text-white/60">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">Preço do site</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[10.5px] text-white/40">
          Valor final (R$)
          <input
            type="number"
            min={PRECO_SITE.minimo}
            max={PRECO_SITE.maximo}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            className={`${inputCls} mt-1 w-32`}
          />
        </label>
        <button
          onClick={() => onSalvar({ valor_final: valor })}
          disabled={salvando || !valido || valor === valorAtual}
          className={`${btnCls} border-primary/40 text-primary`}
        >
          <Save className="h-3 w-3" /> Salvar valor
        </button>
        <span className="pb-1.5 text-white/35">
          Sugerido {brl(site.valor_sugerido)} · tabela {brl(site.valor_calculado)}
          {d.fonte === "ia" ? ` · ajuste do Claude ${Math.round((d.ajuste_ia || 0) * 100)}%` : ""}
        </span>
      </div>
      {!valido && <p className="mt-1 text-red-300">O valor deve ficar entre {brl(PRECO_SITE.minimo)} e {brl(PRECO_SITE.maximo)}.</p>}
      {d.justificativa && <p className="mt-2 leading-relaxed">{d.justificativa}</p>}
      {d.argumento_cliente && <p className="mt-1 italic text-white/45">Para o representante: “{d.argumento_cliente}”</p>}

      <label className="mt-3 flex items-center gap-2 text-white/70">
        <input type="checkbox" checked={mensalidade} disabled={salvando} onChange={(e) => onSalvar({ mensalidade_contratada: e.target.checked })} />
        Cliente contratou a administração do site ({brl(MENSALIDADE_SITE.valor)}/mês)
      </label>

      <table className="mt-2 w-full text-left">
        <thead className="text-[10px] uppercase tracking-wider text-white/30">
          <tr><th className="py-1 font-semibold"></th><th className="font-semibold">Cliente paga</th><th className="font-semibold">Representante</th><th className="font-semibold">Empresa</th></tr>
        </thead>
        <tbody className="text-white/75">
          <tr><td className="py-0.5">Site (uma vez)</td><td>{brl(r.site.cliente_paga)}</td><td>{brl(r.site.representante)}</td><td>{brl(r.site.empresa)}</td></tr>
          {mensalidade && (
            <>
              <tr><td className="py-0.5">Por mês</td><td>{brl(r.mensalidade.cliente_paga_por_mes)}</td><td>{brl(r.mensalidade.representante_por_mes)}</td><td>{brl(r.mensalidade.empresa_por_mes)}</td></tr>
              <tr className="font-semibold text-white"><td className="py-0.5">1º ano</td><td>{brl(ano.cliente)}</td><td>{brl(ano.rep)}</td><td>{brl(ano.empresa)}</td></tr>
            </>
          )}
        </tbody>
      </table>
      <p className="mt-2 text-[10.5px] leading-relaxed text-white/30">
        As comissões só são liberadas após a confirmação do pagamento. A mensalidade gera {brl(MENSALIDADE_SITE.comissao_representante)} ao representante a cada mês pago.
        Domínio ({brl(custos.dominio_anual)}/ano) e hospedagem ({brl(custos.hospedagem_mensal)}/mês) ficam fora do preço e da comissão
        {mensalidade && custos.hospedagem_inclusa ? ` — a hospedagem está dentro da mensalidade, então a parte da empresa fica em ~${brl(r.mensalidade.empresa_liquida_estimada)}/mês` : ""}.
      </p>

      <DominioHospedagem site={site} custos={custos} resumo={r} mensalidade={mensalidade} salvando={salvando} onSalvar={onSalvar} />
      <VendaDoRepresentante site={site} mensalidade={mensalidade} salvando={salvando} onSalvar={onSalvar} />
    </div>
  );
}

/** Domínio próprio e hospedagem de cada site. São custos repassados ao cliente, fora da comissão. */
function DominioHospedagem({ site, custos, resumo, mensalidade, salvando, onSalvar }) {
  const inicial = () => ({
    dominio: custos.dominio,
    dominio_valor_anual: custos.dominio_anual,
    hospedagem_valor_mensal: custos.hospedagem_mensal,
    hospedagem_inclusa: custos.hospedagem_inclusa,
  });
  const [form, setForm] = useState(inicial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(inicial()), [site.id, site.dominio, site.dominio_valor_anual, site.hospedagem_valor_mensal, site.hospedagem_inclusa]);

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
        <Server className="h-3.5 w-3.5" /> Domínio e hospedagem
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="text-[10.5px] text-white/40 sm:col-span-3">
          Domínio próprio
          <input
            value={form.dominio}
            onChange={(e) => setForm({ ...form, dominio: e.target.value })}
            placeholder="empresa.com.br (deixe vazio se ainda não tiver)"
            className={`${inputCls} mt-1`}
          />
        </label>
        <label className="text-[10.5px] text-white/40">
          Domínio (R$ por ano)
          <input type="number" min={0} step="0.01" value={form.dominio_valor_anual} onChange={(e) => setForm({ ...form, dominio_valor_anual: Number(e.target.value) })} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-[10.5px] text-white/40">
          Hospedagem (R$ por mês)
          <input type="number" min={0} step="0.01" value={form.hospedagem_valor_mensal} onChange={(e) => setForm({ ...form, hospedagem_valor_mensal: Number(e.target.value) })} className={`${inputCls} mt-1`} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-[11px] text-white/60">
          <input type="checkbox" checked={form.hospedagem_inclusa} onChange={(e) => setForm({ ...form, hospedagem_inclusa: e.target.checked })} />
          Hospedagem incluída na mensalidade
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={() => onSalvar(form)} disabled={salvando} className={`${btnCls} border-primary/40 text-primary`}>
          <Save className="h-3 w-3" /> Salvar domínio e hospedagem
        </button>
        <span className="text-[10.5px] text-white/35">
          Cliente paga à parte: domínio {brl(resumo.custos.cliente_paga_dominio_ano)}/ano
          {resumo.custos.cliente_paga_hospedagem_mes > 0 ? ` + hospedagem ${brl(resumo.custos.cliente_paga_hospedagem_mes)}/mês` : " (hospedagem dentro da mensalidade)"}
        </span>
      </div>
      {form.hospedagem_inclusa && !mensalidade && (
        <p className="mt-1 text-[10.5px] text-amber-300/80">A hospedagem só fica incluída quando o cliente contrata a administração mensal.</p>
      )}
    </div>
  );
}

/** Representante responsável e lançamento das comissões do site. */
function VendaDoRepresentante({ site, mensalidade, salvando, onSalvar }) {
  const listarReps = useServerFn(representantesParaSiteFn);
  const registrar = useServerFn(registrarVendaSiteFn);
  const [reps, setReps] = useState([]);
  const [competencia, setCompetencia] = useState(competenciaAtual());

  useEffect(() => {
    listarReps().then((r) => setReps(r?.representantes || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mVenda = useMutation({
    mutationFn: (tipo) => registrar({ data: { id: site.id, tipo, competencia } }),
    onSuccess: (r) =>
      toast.success(
        r?.duplicada
          ? `Já estava lançado (${r.venda?.numero}). Nada foi duplicado.`
          : `Venda ${r?.venda?.numero || ""} lançada para o representante. Confirme o pagamento para liberar a comissão.`,
      ),
    onError: (e) => toast.error(e?.message || "Não foi possível lançar a venda."),
  });

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">Representante e comissões</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[10.5px] text-white/40">
          Representante do site
          <select
            value={site.representante_id || ""}
            disabled={salvando}
            onChange={(e) => onSalvar({ representante_id: e.target.value })}
            className="mt-1 block rounded-lg border border-white/10 bg-[#0d1729] px-2.5 py-2 text-[12px] text-white"
          >
            <option value="">Sem representante</option>
            {site.representante_id && !reps.some((r) => r.id === site.representante_id) && (
              <option value={site.representante_id}>{site.representante_nome || "Representante atual"}</option>
            )}
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}{r.codigo ? ` · ${r.codigo}` : ""}</option>
            ))}
          </select>
        </label>
        <button onClick={() => mVenda.mutate("site")} disabled={!site.representante_id || mVenda.isPending} className={btnCls}>
          {mVenda.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Lançar venda do site
        </button>
        {mensalidade && (
          <>
            <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className={`${inputCls} w-36`} />
            <button onClick={() => mVenda.mutate("mensalidade_site")} disabled={!site.representante_id || mVenda.isPending} className={btnCls}>
              <Plus className="h-3 w-3" /> Lançar mensalidade do mês
            </button>
          </>
        )}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/30">
        O site aparece no painel do representante. Ao lançar a venda, a comissão entra como aguardando pagamento e é liberada
        quando você confirmar o pagamento em Representantes › Vendas.
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] normal-case tracking-normal text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none";
const btnCls =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 hover:border-primary/40 hover:text-white disabled:opacity-50";
