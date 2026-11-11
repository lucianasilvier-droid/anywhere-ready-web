// Secrets come from the environment variables of the server (.env / host panel).
import { env } from "@/lib/env.server";

export function readSecret(name) {
  try {
    return env(name) || null;
  } catch {
    return null;
  }
}

export const SECRET_NAMES = {
  google_places: ["GOOGLE_MAPS_API_KEY"],
  groq: ["GROQ_API_KEY"],
  claude: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  whatsapp: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
};

export function integrationConfigured(tipo) {
  const names = SECRET_NAMES[tipo] || [];
  return names.length > 0 && names.every((n) => !!readSecret(n));
}

/** Nome do campo exibido no painel → chave salva na configuração da integração. */
export const CREDENTIAL_KEYS = {
  google_places: { GOOGLE_MAPS_API_KEY: "google_maps_api_key" },
  groq: { GROQ_API_KEY: "groq_api_key" },
  claude: { ANTHROPIC_API_KEY: "anthropic_api_key" },
  openai: { OPENAI_API_KEY: "openai_api_key" },
  whatsapp: {
    WHATSAPP_ACCESS_TOKEN: "whatsapp_access_token",
    WHATSAPP_PHONE_NUMBER_ID: "whatsapp_phone_number_id",
    WHATSAPP_VERIFY_TOKEN: "whatsapp_verify_token",
  },
};

async function readStoredConfig(base44, tipo) {
  try {
    const cliente = base44?.asServiceRole || base44;
    const page = await cliente.entities.Integracao.filter({ tipo }, { limit: 1 });
    const registros = Array.isArray(page) ? page : page?.items || [];
    return registros[0]?.config || {};
  } catch {
    return {};
  }
}

/**
 * Chaves salvas pelo administrador no painel têm prioridade sobre os segredos
 * do ambiente. Os valores nunca são enviados ao navegador: o painel recebe
 * apenas se cada campo está preenchido e de onde ele vem.
 */
export async function resolveCredentials(base44, tipo) {
  const salvo = await readStoredConfig(base44, tipo);
  const mapa = CREDENTIAL_KEYS[tipo] || {};
  const values = {};
  const origem = {};
  for (const [campo, chave] of Object.entries(mapa)) {
    const painel = String(salvo?.[chave] || "").trim();
    const ambiente = String(readSecret(campo) || "").trim();
    values[chave] = painel || ambiente;
    origem[campo] = painel ? "painel" : ambiente ? "ambiente" : null;
  }
  return { values, origem };
}


/* ----------------------- Contatos públicos dos leads ---------------------- */

// Um telefone brasileiro com 11 dígitos e nono dígito é um celular compatível
// com WhatsApp. Isso não confirma que a conta esteja ativa no WhatsApp.
function isBrazilianMobile(value) {
  const digits = String(value || "").replace(/\\D/g, "");
  const national = digits.startsWith("55") && digits.length >= 13 ? digits.slice(2) : digits;
  return /^\\d{2}9\\d{8}$/.test(national);
}

function validPublicEmail(value) {
  const email = String(value || "").trim().replace(/^mailto:/i, "").split(/[?#]/)[0].toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)) return "";
  if (/^(no-?reply|noreply|mailer-daemon)@|example\\.|wixpress|sentry/i.test(email)) return "";
  return email;
}

function emailsFromHtml(html) {
  const source = String(html || "").replace(/&amp;/gi, "&").replace(/&#64;|&commat;/gi, "@").replace(/\\s*\\[at\\]\\s*|\\s*\\(at\\)\\s*/gi, "@");
  const found = [];
  for (const match of source.matchAll(/href\\s*=\\s*["']mailto:([^"'?#]+)[^"']*["']/gi)) {
    const email = validPublicEmail(match[1]);
    if (email) found.push(email);
  }
  const visible = source.replace(/<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  for (const match of visible.matchAll(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\\.[a-z]{2,}/gi)) {
    const email = validPublicEmail(match[0]);
    if (email) found.push(email);
  }
  return [...new Set(found)];
}

function samePublicHost(candidate, origin) {
  return candidate.protocol === "https:" || candidate.protocol === "http:"
    ? candidate.hostname === origin.hostname || candidate.hostname === "www." + origin.hostname || origin.hostname === "www." + candidate.hostname
    : false;
}

async function readPublicPage(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "GoogleNFCConnect-CRM/1.0 (contato comercial publico)" },
      redirect: "manual",
      signal: AbortSignal.timeout(3500),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return null;
      const next = new URL(location, url);
      if (!samePublicHost(next, new URL(url))) return null;
      const redirected = await fetch(next, {
        headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "GoogleNFCConnect-CRM/1.0 (contato comercial publico)" },
        redirect: "manual",
        signal: AbortSignal.timeout(3500),
      });
      if (!redirected.ok || !/text\\/(html|xhtml)/i.test(redirected.headers.get("content-type") || "")) return null;
      return { html: (await redirected.text()).slice(0, 500000), url: next };
    }
    if (!response.ok || !/text\\/(html|xhtml)/i.test(response.headers.get("content-type") || "")) return null;
    return { html: (await response.text()).slice(0, 500000), url: new URL(url) };
  } catch {
    return null;
  }
}

// Procura somente e-mails publicados no próprio site informado pelo estabelecimento.
// Não presume e-mail a partir do domínio nem inventa endereços.
async function findPublicBusinessEmail(site) {
  try {
    const origin = new URL(String(site || "").trim());
    if (!["http:", "https:"].includes(origin.protocol) || !origin.hostname || origin.hostname === "localhost" || origin.hostname.endsWith(".local")) return "";
    const home = await readPublicPage(origin);
    if (!home) return "";
    const emails = emailsFromHtml(home.html);
    if (emails.length) return emails[0];

    const links = [];
    for (const match of home.html.matchAll(/href\\s*=\\s*["']([^"'#]+)["']/gi)) {
      const href = match[1].replace(/&amp;/gi, "&");
      if (!/(contato|contact|fale-conosco|faleconosco|atendimento)/i.test(href)) continue;
      try {
        const candidate = new URL(href, home.url);
        if (samePublicHost(candidate, origin) && !links.some((item) => item.href === candidate.href)) links.push(candidate);
      } catch { /* link inválido */ }
      if (links.length >= 2) break;
    }
    for (const link of links) {
      const page = await readPublicPage(link);
      if (!page) continue;
      const found = emailsFromHtml(page.html);
      if (found.length) return found[0];
    }
    return "";
  } catch {
    return "";
  }
}

async function enrichLeadContactChannels(places) {
  return Promise.all((places || []).map(async (place) => {
    const publicPhone = String(place.telefone_publico || place.telefone || "").trim();
    const mobile = isBrazilianMobile(publicPhone);
    const email = validPublicEmail(place.email) || (place.site ? await findPublicBusinessEmail(place.site) : "");
    return {
      ...place,
      telefone_publico: publicPhone,
      telefone: mobile ? publicPhone : "",
      whatsapp_disponivel: mobile,
      email,
      canais_contato: [mobile ? "whatsapp" : "", email ? "email" : ""].filter(Boolean),
    };
  })).then((places) => places.filter((place) => place.whatsapp_disponivel || place.email));
}

/* ----------------------------- Google Places ----------------------------- */

async function searchGooglePlaces({ textQuery, maxResultCount = 10 }, values = {}) {
  const key = values.google_maps_api_key || readSecret("GOOGLE_MAPS_API_KEY");
  if (!key) {
    return {
      ok: false,
      error:
        "A chave da Google Places API não está configurada. Cole a chave em Integrações e APIs no painel para pesquisar empresas reais.",
      places: [],
    };
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.primaryTypeDisplayName",
        "places.addressComponents",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "pt-BR",
      regionCode: "BR",
      pageSize: Math.min(Math.max(maxResultCount, 1), 20),
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.error?.message || "";
    if (/blocked|API_KEY_SERVICE_BLOCKED|not been used|disabled/i.test(msg)) {
      return {
        ok: false,
        error:
          "O Google bloqueou esta chamada: ative a \"Places API (New)\" no projeto do Google Cloud, mantenha o faturamento ativo e, em Credenciais > sua chave > Restrições de API, inclua a \"Places API (New)\" (ou deixe sem restrição de API). Restrição de aplicativo: use \"Nenhuma\" ou IP, pois a chamada parte do servidor. Detalhe: " + msg,
        places: [],
      };
    }
    return {
      ok: false,
      error:
        msg ||
        `A Google Places API respondeu ${res.status}. Verifique se a Places API está ativa e se a chave permite este uso.`,
      places: [],
    };
  }

  const places = (payload.places || []).map((p) => {
    const comp = p.addressComponents || [];
    const pick = (type) =>
      comp.find((c) => (c.types || []).includes(type))?.longText ||
      comp.find((c) => (c.types || []).includes(type))?.shortText ||
      "";
    return {
      place_id: p.id || "",
      empresa: p.displayName?.text || "Empresa sem nome",
      endereco: p.formattedAddress || p.shortFormattedAddress || "",
      bairro: pick("sublocality_level_1") || pick("neighborhood"),
      cidade: pick("administrative_area_level_2") || pick("locality"),
      estado: pick("administrative_area_level_1"),
      telefone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
      telefone_publico: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
      email: "",
      site: p.websiteUri || "",
      categoria: p.primaryTypeDisplayName?.text || "",
      nota_google: typeof p.rating === "number" ? p.rating : null,
      total_avaliacoes: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    };
  });

  return { ok: true, places, error: null };
}


/* --------------- Busca reserva: OpenStreetMap (sem chave de API) --------------- */

const OSM_UA = "GoogleNFCConnect-CRM/1.0 (prospeccao de empresas)";

// termo em português -> filtros de tags do OpenStreetMap
const OSM_CATEGORIAS = [
  [/barbear/i, ['["shop"="hairdresser"]', '["amenity"="barber"]']],
  [/sal[aã]o|cabelei|beleza/i, ['["shop"="hairdresser"]', '["shop"="beauty"]']],
  [/restaurante/i, ['["amenity"="restaurant"]']],
  [/lanchonete|hamb[uú]rguer/i, ['["amenity"="fast_food"]']],
  [/pizz/i, ['["cuisine"="pizza"]']],
  [/cafeteria|caf[eé]/i, ['["amenity"="cafe"]']],
  [/padaria/i, ['["shop"="bakery"]']],
  [/bar\b|boteco/i, ['["amenity"~"bar|pub"]']],
  [/academia|fitness|crossfit/i, ['["leisure"="fitness_centre"]']],
  [/dentist|odonto/i, ['["amenity"="dentist"]', '["healthcare"="dentist"]']],
  [/cl[ií]nica|m[eé]dic/i, ['["amenity"~"clinic|doctors"]', '["healthcare"]']],
  [/farm[aá]cia|drogaria/i, ['["amenity"="pharmacy"]']],
  [/pet\s?shop|veterin/i, ['["shop"="pet"]', '["amenity"="veterinary"]']],
  [/mercado|supermercado/i, ['["shop"~"supermarket|convenience"]']],
  [/hotel|pousada/i, ['["tourism"~"hotel|guest_house|hostel"]']],
  [/oficina|mec[aâ]nic/i, ['["shop"="car_repair"]', '["amenity"="car_repair"]']],
  [/autope[cç]a/i, ['["shop"="car_parts"]']],
  [/loja de roupa|boutique|moda/i, ['["shop"="clothes"]']],
  [/[oó]tica/i, ['["shop"="optician"]']],
  [/escola|col[eé]gio/i, ['["amenity"~"school|kindergarten"]']],
  [/est[eé]tica|manicure|unha/i, ['["shop"~"beauty|nails"]']],
  [/tatuagem|tattoo/i, ['["shop"="tattoo"]']],
  [/contabil|advoca|imobili[aá]ria/i, ['["office"]']],
];

async function osmFetchJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { "User-Agent": OSM_UA, ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(`OpenStreetMap respondeu ${res.status}`);
  return res.json();
}

function osmParaLead(el) {
  const t = el.tags || {};
  const tel = t.phone || t["contact:phone"] || t["contact:mobile"] || t.mobile || "";
  const email = t.email || t["contact:email"] || "";
  const site = t.website || t["contact:website"] || t["contact:facebook"] || "";
  const rua = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", ");
  const cidade = t["addr:city"] || "";
  const estado = t["addr:state"] || "";
  const categoria =
    t.cuisine || t.shop || t.amenity || t.office || t.healthcare || t.leisure || t.tourism || "";
  return {
    place_id: `osm:${el.type}/${el.id}`,
    empresa: t.name || "Empresa sem nome",
    endereco: [rua, t["addr:suburb"], cidade, estado].filter(Boolean).join(" - "),
    bairro: t["addr:suburb"] || t["addr:neighbourhood"] || "",
    cidade,
    estado,
    telefone: tel,
    telefone_publico: tel,
    email,
    site,
    categoria,
    nota_google: null,
    total_avaliacoes: null,
    fonte: "openstreetmap",
  };
}

export async function searchOpenStreetMap({ textQuery, maxResultCount = 10 }) {
  try {
    const m = textQuery.match(/^(.*?)\s+em\s+(.+)$/i);
    const termo = (m ? m[1] : textQuery).trim();
    const local = (m ? m[2] : "").trim();
    const limite = Math.min(Math.max(maxResultCount, 1), 20);

    if (!local) {
      return { ok: false, error: "Informe também a cidade ou bairro para pesquisar.", places: [] };
    }

    // 1) acha a área (caixa) do local
    const geo = await osmFetchJson(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(local)}`,
    );
    if (!geo[0]) return { ok: true, places: [], error: null, aviso: `Local "${local}" não encontrado.` };
    const [s, n, w, e] = geo[0].boundingbox; // sul, norte, oeste, leste
    const bbox = `${s},${w},${n},${e}`;

    // 2) busca por categoria (tags) e por nome
    const cat = OSM_CATEGORIAS.find(([re]) => re.test(termo));
    const filtros = cat ? cat[1] : [];
    const nomeRe = termo.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/)[0] || termo;
    const partes = [
      ...filtros.map((f) => `nwr${f}["name"](${bbox});`),
      `nwr["name"~"${nomeRe}",i](${bbox});`,
    ].join("\n");
    const query = `[out:json][timeout:25];(\n${partes}\n);out center tags ${limite * 4};`;

    const data = await osmFetchJson("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
    });

    const vistos = new Set();
    const lista = (data.elements || [])
      .filter((el) => el.tags?.name && !vistos.has(`${el.type}${el.id}`) && vistos.add(`${el.type}${el.id}`))
      .map(osmParaLead)
      // Prioriza registros com algum canal de contato público.
      .sort((a, b) => Number(!!(b.telefone || b.email || b.site)) - Number(!!(a.telefone || a.email || a.site)))
      .slice(0, limite)
      .map((p) => ({ ...p, cidade: p.cidade || geo[0].name || local }));

    const contatos = await enrichLeadContactChannels(lista);
    return { ok: true, places: contatos, error: null, aviso: "Resultados filtrados: somente empresas com celular compatível com WhatsApp ou e-mail comercial público. A existência de conta WhatsApp não é confirmada pela fonte." };
  } catch (err) {
    return { ok: false, error: `Busca reserva (OpenStreetMap) indisponível: ${err.message}`, places: [] };
  }
}

/** Tenta o Google; se estiver bloqueado/sem chave, usa a busca reserva. */
export async function searchPlaces(args, values = {}) {
  const google = await searchGooglePlaces(args, values);
  if (google.ok) {
    const places = await enrichLeadContactChannels(google.places);
    return {
      ...google,
      places,
      aviso: "Resultados filtrados: somente empresas com celular compatível com WhatsApp ou e-mail comercial público. A existência de conta WhatsApp não é confirmada pela fonte.",
    };
  }
  const osm = await searchOpenStreetMap(args);
  if (osm.ok) {
    return {
      ...osm,
      aviso:
        (osm.aviso ? osm.aviso + " " : "Busca feita pelo OpenStreetMap (a chave do Google não está funcionando). ") +
        "Resultados filtrados: somente empresas com celular compatível com WhatsApp ou e-mail comercial público. A existência de conta WhatsApp não é confirmada pela fonte.",
    };
  }
  return { ...google, error: `${google.error} | ${osm.error}` };
}

/* --------------------------------- Groq ---------------------------------- */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
/** Modelo principal da IA e modelos reserva (usados se o principal estiver sobrecarregado). */
export const GROQ_MODELO = "openai/gpt-oss-120b";
const GROQ_MODELOS_RESERVA = ["openai/gpt-oss-20b"];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function interpretarJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

async function chamarGroq(modelo, key, prompt, schemaHint) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content:
            prompt + (schemaHint ? `\n\nResponda SOMENTE com um JSON válido neste formato: ${schemaHint}` : ""),
        },
      ],
      ...(schemaHint ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error:
        payload?.error?.message ||
        `A API Roq respondeu ${res.status}. Verifique se a chave está correta e ativa.`,
    };
  }
  const text = (payload.choices?.[0]?.message?.content || "").trim();
  return { ok: true, text };
}

/** Reserva: Claude (mesma ligação já usada pelo sistema na criação de sites). */
async function chamarClaude(prompt, schemaHint, apiKey) {
  const key = apiKey || readSecret("ANTHROPIC_API_KEY");
  if (!key) {
    return {
      ok: false,
      error: "Claude indisponível: cadastre a chave Anthropic em Integrações e APIs no painel.",
    };
  }
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey: key });
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content:
            prompt + (schemaHint ? `\n\nResponda SOMENTE com um JSON válido neste formato: ${schemaHint}` : ""),
        },
      ],
    });
    const text = (resp.content || []).map((c) => c.text || "").join("").trim();
    return text ? { ok: true, text } : { ok: false, error: "Claude não retornou conteúdo." };
  } catch (e) {
    return { ok: false, error: `Claude indisponível: ${e?.message || e}` };
  }
}

export async function iaJSON(prompt, schemaHint, values = {}) {
  const key = values.groq_api_key || readSecret("GROQ_API_KEY");
  let ultimoErro = key
    ? ""
    : "A chave da API Roq não está configurada. Cadastre a chave em Integrações e APIs no painel para usar os recursos de IA.";
  let usado = GROQ_MODELO;
  let texto = "";

  if (key) {
    // modelo principal + reserva; em sobrecarga (429/500/503) tenta de novo com pausa curta
    const modelos = [GROQ_MODELO, ...GROQ_MODELOS_RESERVA];
    busca: for (const modelo of modelos) {
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        const r = await chamarGroq(modelo, key, prompt, schemaHint);
        if (r.ok && r.text) {
          texto = r.text;
          usado = modelo;
          break busca;
        }
        ultimoErro = r.error || "A API Roq não retornou conteúdo.";
        const sobrecarga = [429, 500, 503].includes(r.status);
        if (sobrecarga && tentativa === 0) {
          await esperar(1500);
          continue;
        }
        break; // 400/401/403/404: tenta o próximo modelo
      }
    }
  }

  if (!texto) {
    const r = await chamarClaude(prompt, schemaHint, values.anthropic_api_key);
    if (r.ok) {
      texto = r.text;
      usado = "claude-sonnet-5-5";
    } else {
      ultimoErro = `${ultimoErro} | ${r.error}`;
    }
  }

  const extra = { modelo: usado, modelo_solicitado: GROQ_MODELO };
  if (!texto) return { ok: false, error: ultimoErro || "A IA não retornou conteúdo.", data: null, ...extra };
  if (!schemaHint) return { ok: true, data: texto, error: null, ...extra };

  const data = interpretarJSON(texto);
  if (data) return { ok: true, data, error: null, ...extra };
  return { ok: false, error: "Não foi possível interpretar a resposta da IA.", data: null, ...extra };
}

/* ------------------------------- WhatsApp -------------------------------- */

export async function sendWhatsappText({ to, body }, values = {}) {
  const token = values.whatsapp_access_token || readSecret("WHATSAPP_ACCESS_TOKEN");
  const phoneId = values.whatsapp_phone_number_id || readSecret("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) {
    return {
      ok: false,
      error:
        "WhatsApp Business não configurado. Informe o access token e o phone number ID em Integrações e APIs no painel.",
    };
  }
  const digits = String(to || "").replace(/\D/g, "");
  if (digits.length < 10) return { ok: false, error: "Telefone inválido para envio no WhatsApp." };
  const number = digits.startsWith("55") ? digits : `55${digits}`;

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: number,
      type: "text",
      text: { preview_url: true, body },
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.error?.message || "";
    return {
      ok: false,
      error:
        msg ||
        `O WhatsApp respondeu ${res.status}. A mensagem só pode ser enviada para números com autorização válida.`,
    };
  }
  return { ok: true, messageId: payload?.messages?.[0]?.id || null, error: null };
}

/* -------------------------------- Testes --------------------------------- */

export async function testIntegration(tipo, values = {}) {
  if (tipo === "google_places") {
    const result = await searchGooglePlaces({ textQuery: "cafeteria em São Paulo", maxResultCount: 1 }, values);
    if (!result.ok) return { status: "erro", mensagem: result.error };
    return {
      status: "conectado",
      mensagem: `Conexão bem-sucedida com a Google Places API. ${result.places.length} resultado(s) de teste retornado(s).`,
    };
  }

  if (tipo === "groq") {
    const result = await iaJSON('Responda apenas com a palavra "ok" e nada mais.', null, values);
    if (!result.ok) return { status: "erro", mensagem: result.error };
    return {
      status: "conectado",
      mensagem: `Conexão bem-sucedida com a API Roq (modelo ${result.modelo}${result.modelo === result.modelo_solicitado ? "" : ` — solicitado: ${result.modelo_solicitado}`}).`,
    };
  }

  if (tipo === "claude") {
    const key = values.anthropic_api_key || readSecret("ANTHROPIC_API_KEY");
    if (!key) return { status: "aguardando_configuracao", mensagem: "Cadastre a chave Anthropic em Integrações e APIs." };
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({ apiKey: key });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5-5",
        max_tokens: 24,
        messages: [{ role: "user", content: "Responda somente: OK" }],
      });
      const answer = (response.content || []).filter((part) => part.type === "text").map((part) => part.text).join("").trim();
      return answer
        ? { status: "conectado", mensagem: "Conexão com Claude AI confirmada. Modelo claude-sonnet-5-5 respondeu ao teste." }
        : { status: "erro", mensagem: "Claude respondeu sem conteúdo de texto." };
    } catch (e) {
      return { status: "erro", mensagem: e?.message || "Falha ao testar a conexão com Claude AI." };
    }
  }

  if (tipo === "openai") {
    const key = values.openai_api_key || readSecret("OPENAI_API_KEY");
    if (!key) return { status: "aguardando_configuracao", mensagem: "Cadastre a chave OpenAI em Integrações e APIs." };
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-5.5",
          reasoning: { effort: "none" },
          max_output_tokens: 24,
          input: "Responda somente: OK",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return { status: "erro", mensagem: payload?.error?.message || `OpenAI respondeu ${res.status}.` };
      const answer = (payload.output || [])
        .flatMap((item) => item.content || [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text || "")
        .join("")
        .trim();
      return answer
        ? { status: "conectado", mensagem: "Conexão com ChatGPT confirmada. O modelo GPT-5.5 respondeu ao teste." }
        : { status: "erro", mensagem: "OpenAI respondeu sem conteúdo." };
    } catch (e) {
      return { status: "erro", mensagem: e?.message || "Falha ao testar a conexão com OpenAI." };
    }
  }

  if (tipo === "whatsapp") {
    const token = values.whatsapp_access_token || readSecret("WHATSAPP_ACCESS_TOKEN");
    const phoneId = values.whatsapp_phone_number_id || readSecret("WHATSAPP_PHONE_NUMBER_ID");
    if (!token || !phoneId) {
      return {
        status: "aguardando_configuracao",
        mensagem:
          "Aguardando configuração: informe o access token e o phone number ID no painel para ativar o envio.",
      };
    }
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        status: "erro",
        mensagem:
          payload?.error?.message ||
          `A API do WhatsApp respondeu ${res.status}. Verifique o token e o Phone Number ID.`,
      };
    }
    return {
      status: "conectado",
      mensagem: `Conexão bem-sucedida: ${payload.verified_name || "conta"} · ${payload.display_phone_number || phoneId}.`,
    };
  }

  return { status: "erro", mensagem: "Integração desconhecida." };
}