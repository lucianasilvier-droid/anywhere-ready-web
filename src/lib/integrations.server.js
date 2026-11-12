// Secrets come from the environment variables of the server (.env / host panel).
import { env } from "@/lib/env.server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
  whatsapp: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_APP_SECRET"],
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
    WHATSAPP_APP_SECRET: "whatsapp_app_secret",
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


const digitsOnly = (value) => String(value || "").replace(/[^0-9]/g, "");

export function validarTelefoneWhatsApp(value) {
  const digits = digitsOnly(value);
  return digits.length === 10 || digits.length === 11 ||
    (digits.startsWith("55") && (digits.length === 12 || digits.length === 13));
}

export function validarEmailContato(value) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) return false;
  const domain = email.split("@")[1] || "";
  if (/(^|\.)(example|invalid|localhost|test)$/i.test(domain)) return false;
  if (/^(no[-_.]?reply|noreply|do[-_.]?not[-_.]?reply)@/i.test(email)) return false;
  return true;
}

function ipPublico(ip) {
  const tipo = isIP(ip);
  if (tipo === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    if (p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224) return false;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return false;
    if (p[0] === 169 && p[1] === 254) return false;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return false;
    if (p[0] === 192 && p[1] === 168) return false;
    if (p[0] === 192 && p[1] === 0 && (p[2] === 0 || p[2] === 2)) return false;
    if (p[0] === 198 && (p[1] === 18 || p[1] === 19 || (p[1] === 51 && p[2] === 100))) return false;
    if (p[0] === 203 && p[1] === 0 && p[2] === 113) return false;
    return true;
  }
  if (tipo === 6) {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1" || s.startsWith("::ffff:")) return false;
    if (/^(fc|fd|fe8|fe9|fea|feb|ff)/i.test(s)) return false;
    if (/^(2001:db8:|2001:0000:|2002:)/i.test(s)) return false;
    return true;
  }
  return false;
}

function mesmoHost(a, b) {
  const normalizar = (host) => String(host || "").toLowerCase().replace(/^www\./, "");
  return normalizar(a) === normalizar(b);
}

async function hostPublico(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || /(^|\.)(localhost|local|internal|test|example|invalid|onion)$/i.test(host)) return false;
  if (isIP(host)) return ipPublico(host);
  try {
    const enderecos = await lookup(host, { all: true, verbatim: true });
    return enderecos.length > 0 && enderecos.every((item) => ipPublico(item.address));
  } catch {
    return false;
  }
}

async function lerHtmlLimitado(response, maxBytes = 350000) {
  if (!response.body?.getReader) return (await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let texto = "";
  let total = 0;
  while (true) {
    const parte = await reader.read();
    if (parte.done) break;
    total += parte.value.byteLength;
    texto += decoder.decode(parte.value, { stream: true });
    if (total >= maxBytes) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return texto + decoder.decode();
}

async function buscarHtmlPublico(urlInicial, hostBase) {
  let atual;
  try {
    atual = new URL(urlInicial);
  } catch {
    return "";
  }
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (!["https:", "http:"].includes(atual.protocol)) return "";
    if (atual.username || atual.password || (atual.port && !["80", "443"].includes(atual.port))) return "";
    if (!mesmoHost(atual.hostname, hostBase) || !(await hostPublico(atual.hostname))) return "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600);
    let response;
    try {
      response = await fetch(atual.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; GoogleNFCConnectContactFinder/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return "";
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return "";
      try {
        const destino = new URL(location, atual);
        if (!mesmoHost(destino.hostname, hostBase)) return "";
        atual = destino;
        continue;
      } catch {
        return "";
      }
    }
    if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") || "")) return "";
    try {
      return await lerHtmlLimitado(response);
    } catch {
      return "";
    }
  }
  return "";
}

function emailsDaPagina(html, hostBase) {
  const limpo = String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const mailto = [...limpo.matchAll(/mailto:([^"'?\s<>]+)/gi)].map((m) => m[1]);
  const visiveis = limpo.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const siteHost = String(hostBase || "").toLowerCase().replace(/^www\./, "");
  const unicos = [...new Set([...mailto, ...visiveis].map((v) => decodeURIComponent(String(v).split("?")[0]).trim().toLowerCase()))]
    .filter(validarEmailContato);
  return unicos.sort((a, b) => {
    const da = a.split("@")[1] || "";
    const db = b.split("@")[1] || "";
    const ma = da === siteHost || da.endsWith("." + siteHost);
    const mb = db === siteHost || db.endsWith("." + siteHost);
    return Number(mb) - Number(ma);
  });
}

async function buscarEmailNoSite(site) {
  let inicio;
  try {
    inicio = new URL(String(site || ""));
  } catch {
    return "";
  }
  if (!["https:", "http:"].includes(inicio.protocol)) return "";
  const host = inicio.hostname;
  if (/facebook\.com$|instagram\.com$|linkedin\.com$|tiktok\.com$|youtube\.com$/i.test(host)) return "";
  const html = await buscarHtmlPublico(inicio.toString(), host);
  if (!html) return "";
  const primeiro = emailsDaPagina(html, host)[0];
  if (primeiro) return primeiro;

  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: m[1], texto: String(m[2] || "").replace(/<[^>]+>/g, " ") }))
    .filter((item) => /contato|contact|fale|sobre|about|atendimento/i.test(item.href + " " + item.texto))
    .map((item) => {
      try { return new URL(item.href, inicio).toString(); } catch { return ""; }
    })
    .filter(Boolean);
  const padroes = ["/contato", "/contact", "/fale-conosco", "/contact-us"];
  const destinos = [...new Set([...links, ...padroes.map((p) => new URL(p, inicio).toString())])]
    .filter((url) => {
      try { return mesmoHost(new URL(url).hostname, host); } catch { return false; }
    })
    .slice(0, 2);
  const paginas = await Promise.all(destinos.map((url) => buscarHtmlPublico(url, host)));
  for (const pagina of paginas) {
    const email = emailsDaPagina(pagina, host)[0];
    if (email) return email;
  }
  return "";
}

async function enriquecerContato(place) {
  const telefoneValido = validarTelefoneWhatsApp(place?.telefone);
  let telefone = telefoneValido ? String(place.telefone).trim() : "";
  let email = validarEmailContato(place?.email) ? String(place.email).trim().toLowerCase() : "";
  if (!telefone && !email && place?.site) email = await buscarEmailNoSite(place.site);
  if (!telefone && !email) return null;
  return {
    ...place,
    telefone,
    email,
    contato_tipo: telefone ? (email ? "whatsapp_e_email" : "whatsapp") : "email",
    contato_valido: true,
  };
}

async function filtrarEmpresasComContato(places) {
  const saida = [];
  const lista = Array.isArray(places) ? places : [];
  for (let i = 0; i < lista.length; i += 10) {
    const grupo = await Promise.all(lista.slice(i, i + 10).map(enriquecerContato));
    saida.push(...grupo.filter(Boolean));
  }
  return saida;
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
        "places.photos",
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
      site: p.websiteUri || "",
      categoria: p.primaryTypeDisplayName?.text || "",
      nota_google: typeof p.rating === "number" ? p.rating : null,
      total_avaliacoes: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
      fotos_google: (Array.isArray(p.photos) ? p.photos : []).slice(0, 5).map((foto) => ({
        name: String(foto?.name || ""),
        autor: String(foto?.authorAttributions?.[0]?.displayName || ""),
        autor_uri: String(foto?.authorAttributions?.[0]?.uri || ""),
      })).filter((foto) => /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_=-]+$/.test(foto.name)),
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
      // quem tem telefone ou site aparece primeiro (mais útil para prospecção)
      .sort((a, b) => Number(!!(b.telefone || b.site)) - Number(!!(a.telefone || a.site)))
      .slice(0, limite)
      .map((p) => ({ ...p, cidade: p.cidade || geo[0].name || local }));

    return { ok: true, places: lista, error: null };
  } catch (err) {
    return { ok: false, error: `Busca reserva (OpenStreetMap) indisponível: ${err.message}`, places: [] };
  }
}

/** Busca fotos e atribuições de um Place ID já salvo no CRM (usado ao gerar sites de leads antigos). */
export async function fetchGooglePlacePhotos(placeId, values = {}) {
  const key = values.google_maps_api_key || readSecret("GOOGLE_MAPS_API_KEY");
  if (!key || !placeId || /^osm:/i.test(String(placeId))) return [];
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "photos",
      },
    });
    if (!response.ok) return [];
    const payload = await response.json().catch(() => ({}));
    return (Array.isArray(payload.photos) ? payload.photos : []).slice(0, 5).map((foto) => ({
      name: String(foto?.name || ""),
      autor: String(foto?.authorAttributions?.[0]?.displayName || ""),
      autor_uri: String(foto?.authorAttributions?.[0]?.uri || ""),
    })).filter((foto) => /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_=-]+$/.test(foto.name));
  } catch {
    return [];
  }
}

/** Tenta o Google; se estiver bloqueado/sem chave, usa a busca reserva. */
export async function searchPlaces(args, values = {}) {
  const google = await searchGooglePlaces(args, values);
  if (google.ok) return google;
  const osm = await searchOpenStreetMap(args);
  if (osm.ok) {
    return {
      ...osm,
      aviso:
        "Busca feita pelo OpenStreetMap (a chave do Google não está funcionando). Pode haver menos empresas, sem nota e com menos telefones.",
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