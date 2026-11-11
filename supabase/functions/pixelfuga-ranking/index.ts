// Ranking e cópia do progresso do Pixel Lab (antigo Pixel Fuga).
// GET  -> lista pública (top 100): nome, fase atual, fases concluídas, fases do desafio.
// POST -> { device, action: 'save' | 'me' | 'delete' | 'backup' | 'restore', name?, progress?, data?, code? }
//   backup:  junta a cópia do progresso do aparelho com a guardada (fica o melhor de cada fase), ligada ao código curto (ABCD-EFGH).
//   restore: { device (aparelho novo), code } devolve a cópia e passa a linha do ranking para o aparelho novo.
//            Sem code, aceita o formato antigo (device = código longo do aparelho antigo).
// Só esta função toca nas tabelas pixelfuga_* (service role). As tabelas não têm acesso público.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://pixellabirinto.vercel.app", "https://pixellab8bit.vercel.app", "https://pixellabgame.vercel.app", "https://pixelfuga.vercel.app", "https://fuga-neon.vercel.app"];
const MAX_BODY = 8000, MAX_SAVE = 6000;
const RATE_WINDOW_MS = 10 * 60 * 1000, RATE_MAX = 120;
const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/; // sem I, L, O, 0 e 1, que se confundem
const BAD_WORDS = new Set(["porra","caralho","merda","puta","puto","putaria","fdp","viado","buceta","arrombado","arrombada","cuzao","foder","fodase","foda","fodido","vagabunda","vagabundo","corno","piranha","bosta","desgracado","desgracada","otario","otaria","babaca","vadia","cacete","pqp","vsf","vtnc","krl","prr"]);
const RANK_ORDER: [string, boolean][] = [["current_level", false], ["levels_done", false], ["challenge_levels", false], ["total_time_s", true], ["created_at", true]];

function headers(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}
const reply = (h: Record<string, string>, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: h });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// nome que aparece para todos: sem links, sem @perfil e com palavrões escondidos
function cleanName(raw: unknown) {
  let t = String(raw ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60)
    .replace(/(?:https?:\/\/|www\.)\S*/gi, "")
    .replace(/\b[\w-]+\.(?:com|net|org|br|io|xyz|me|link|app|site|online|info|ly|gg|tk|ru)(?:\/\S*)?/gi, "")
    .replace(/@\w+/g, "");
  t = t.split(/(\s+)/).map((w) => {
    const base = w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return BAD_WORDS.has(base) ? "*".repeat(w.length) : w;
  }).join("");
  t = t.replace(/\s+/g, " ").trim().slice(0, 20);
  return t.length >= 2 ? t : null;
}
// só os campos públicos saem da função (nunca o código do aparelho)
const pub = (r: any, pos: number | null) => ({ pos, name: r.name, current_level: r.current_level, levels_done: r.levels_done,
  challenge_levels: r.challenge_levels, ultra_done: r.ultra_done, won: r.challenge_levels >= 100 });
// junta a cópia nova com a que já está guardada, ficando com o melhor de cada fase (nada se perde)
const obj = (v: unknown) => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, any> : {};
function mergeSave(oldD: unknown, incD: unknown) {
  const o = obj(oldD), n = obj(incD), out: Record<string, any> = { ...o, ...n };
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  for (const k of ["soloMax", "ultraMax"]) if (o[k] != null || n[k] != null) out[k] = Math.max(num(o[k]), num(n[k]));
  const ub: Record<string, number> = { ...obj(o.ultraBest) };
  for (const [k, v] of Object.entries(obj(n.ultraBest))) { const t = num(v); if (t > 0 && (!ub[k] || t < ub[k])) ub[k] = t; }
  if (Object.keys(ub).length) out.ultraBest = ub;
  const cl: Record<string, any> = { ...obj(obj(o.camp).l) };
  for (const [k, e] of Object.entries(obj(obj(n.camp).l))) {
    if (!Array.isArray(e) || e.length < 3) continue;
    const old = cl[k];
    if (!Array.isArray(old) || num(old[2]) < num(e[2]) || (num(old[2]) === num(e[2]) && num(e[0]) < num(old[0]))) cl[k] = e;
  }
  if (o.camp || n.camp) out.camp = { v: 1, l: cl };
  if (o.prizeSeen || n.prizeSeen) out.prizeSeen = true;
  if (!n.name && o.name) out.name = o.name;
  return out;
}
const int = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export async function handle(req: Request, db: any, ip: string): Promise<Response> {
  const origin = req.headers.get("origin") || "";
  const h = headers(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return reply(h, 403, { error: "Origem não permitida." });

  const ordered = (q: any) => RANK_ORDER.reduce((acc, [col, asc]) => acc.order(col, { ascending: asc }), q);

  if (req.method === "GET") {
    const { data, error } = await ordered(db.from("pixelfuga_players")
      .select("name, current_level, levels_done, challenge_levels, ultra_done")).limit(100);
    if (error) throw error;
    const { count } = await db.from("pixelfuga_players").select("id", { count: "exact", head: true });
    return reply(h, 200, { total: count ?? data.length, rows: data.map((r: any, i: number) => pub(r, i + 1)) });
  }
  if (req.method !== "POST") return reply(h, 405, { error: "Método não permitido." });

  // limite por conexão: 120 envios a cada 10 minutos
  const ipHash = await sha256("pxf-ip|" + ip);
  const { data: rl } = await db.from("pixelfuga_rate").select("window_start, hits").eq("ip_hash", ipHash).maybeSingle();
  const now = Date.now();
  if (rl && now - new Date(rl.window_start).getTime() < RATE_WINDOW_MS) {
    if (rl.hits >= RATE_MAX) return reply(h, 429, { error: "Muitas tentativas. Tente de novo em alguns minutos." });
    await db.from("pixelfuga_rate").update({ hits: rl.hits + 1 }).eq("ip_hash", ipHash);
  } else {
    await db.from("pixelfuga_rate").upsert({ ip_hash: ipHash, window_start: new Date(now).toISOString(), hits: 1 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return reply(h, 413, { error: "Dados grandes demais." });
  let body: any;
  try { body = JSON.parse(raw); } catch { return reply(h, 400, { error: "Dados inválidos." }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(h, 400, { error: "Dados inválidos." });
  // "instagram" ainda é aceito (e ignorado) para versões antigas do jogo guardadas no aparelho
  const allowed = new Set(["device", "action", "name", "instagram", "progress", "data", "code"]);
  if (Object.keys(body).some((k) => !allowed.has(k))) return reply(h, 400, { error: "Dados inválidos." });
  if (typeof body.device !== "string" || !/^[A-Za-z0-9_-]{20,100}$/.test(body.device)) return reply(h, 400, { error: "Aparelho inválido." });
  const deviceHash = await sha256("pxf-dev|" + body.device);
  if (body.code !== undefined && (typeof body.code !== "string" || !CODE_RE.test(body.code))) return reply(h, 400, { error: "Código inválido. Ele tem 8 letras e números, como ABCD-EFGH." });
  const codeHash = body.code ? await sha256("pxf-rc|" + body.code) : null;

  const position = async () => {
    const { data, error } = await ordered(db.from("pixelfuga_players").select("device_hash")).limit(10000);
    if (error) throw error;
    const i = data.findIndex((r: any) => r.device_hash === deviceHash);
    return i >= 0 ? i + 1 : null;
  };
  const { data: prev, error: prevErr } = await db.from("pixelfuga_players")
    .select("name, current_level, levels_done, challenge_levels, ultra_done, total_time_s, updated_at")
    .eq("device_hash", deviceHash).maybeSingle();
  if (prevErr) throw prevErr;

  if (body.action === "backup") {
    const d = body.data;
    if (!d || typeof d !== "object" || Array.isArray(d)) return reply(h, 400, { error: "Dados inválidos." });
    const okKeys = new Set(["v", "soloMax", "soloLast", "ultraMax", "ultraBest", "camp", "name", "prizeSeen"]);
    if (Object.keys(d).some((k) => !okKeys.has(k))) return reply(h, 400, { error: "Dados inválidos." });
    if (JSON.stringify(d).length > MAX_SAVE) return reply(h, 413, { error: "Dados grandes demais." });
    const { data: cur } = await db.from("pixelfuga_saves").select("data").eq("device_hash", deviceHash).maybeSingle();
    const merged = mergeSave(cur?.data, d);
    if (JSON.stringify(merged).length > MAX_SAVE) return reply(h, 413, { error: "Dados grandes demais." });
    const row: Record<string, unknown> = { device_hash: deviceHash, data: merged, updated_at: new Date(now).toISOString() };
    if (codeHash) row.code_hash = codeHash;
    const { error } = await db.from("pixelfuga_saves").upsert(row);
    if (error) {
      if (error.code === "23505") return reply(h, 409, { error: "Código em uso.", retry: true }); // o jogo sorteia outro código
      throw error;
    }
    return reply(h, 200, { ok: true });
  }
  if (body.action === "restore") {
    const q = db.from("pixelfuga_saves").select("device_hash, data, updated_at");
    const { data, error } = await (codeHash ? q.eq("code_hash", codeHash) : q.eq("device_hash", deviceHash)).maybeSingle();
    if (error) throw error;
    if (!data) return reply(h, 404, { error: "Não achei progresso com esse código. Confira as letras e tente de novo." });
    if (codeHash && data.device_hash !== deviceHash) {
      // o aparelho novo assume a cópia e a linha do ranking do aparelho antigo
      await db.from("pixelfuga_saves").delete().eq("device_hash", deviceHash);
      const { error: e1 } = await db.from("pixelfuga_saves").update({ device_hash: deviceHash }).eq("code_hash", codeHash);
      if (e1) throw e1;
      const { data: oldRow } = await db.from("pixelfuga_players").select("id").eq("device_hash", data.device_hash).maybeSingle();
      if (oldRow) {
        await db.from("pixelfuga_players").delete().eq("device_hash", deviceHash);
        const { error: e2 } = await db.from("pixelfuga_players").update({ device_hash: deviceHash }).eq("id", oldRow.id);
        if (e2) throw e2;
      }
    }
    return reply(h, 200, { ok: true, data: data.data, updated_at: data.updated_at });
  }
  if (body.action === "delete") {
    await db.from("pixelfuga_players").delete().eq("device_hash", deviceHash);
    await db.from("pixelfuga_saves").delete().eq("device_hash", deviceHash);
    return reply(h, 200, { ok: true });
  }
  if (body.action === "me") {
    if (!prev) return reply(h, 200, { registered: false });
    return reply(h, 200, { registered: true, ...pub(prev, await position()) });
  }
  if (body.action !== "save") return reply(h, 400, { error: "Ação inválida." });

  const name = cleanName(body.name);
  if (!name) return reply(h, 400, { error: "Digite um nome com pelo menos 2 letras." });
  const p = body.progress && typeof body.progress === "object" ? body.progress : {};
  let cur = int(p.current_level, 1, 1000), done = int(p.levels_done, 0, 1000), chal = int(p.challenge_levels, 0, 100),
    ultra = int(p.ultra_done, 0, 10), secs = int(p.total_time_s, 0, 100000000);
  if (cur === null || done === null || chal === null || ultra === null || secs === null) return reply(h, 400, { error: "Progresso inválido." });
  // valores precisam fazer sentido entre si
  done = Math.min(done, cur); chal = Math.min(chal, done); if (secs < done * 3) done = chal = Math.floor(secs / 3);
  if (prev) {
    // ninguém sobe de repente: no máximo 2 fases + 1 a cada 20 s desde o último envio
    const jump = 2 + Math.floor((now - new Date(prev.updated_at).getTime()) / 20000);
    cur = Math.max(prev.current_level, Math.min(cur, prev.current_level + jump));
    done = Math.max(prev.levels_done, Math.min(done, prev.levels_done + jump));
    chal = Math.max(prev.challenge_levels, Math.min(chal, prev.challenge_levels + jump, done));
    ultra = Math.max(prev.ultra_done, Math.min(ultra, prev.ultra_done + jump));
    secs = Math.max(prev.total_time_s, secs);
  }
  const row = { name, current_level: cur, levels_done: done, challenge_levels: chal, ultra_done: ultra, total_time_s: secs };
  const res = prev
    ? await db.from("pixelfuga_players").update(row).eq("device_hash", deviceHash)
    : await db.from("pixelfuga_players").insert({ device_hash: deviceHash, ...row });
  if (res.error) throw res.error;
  return reply(h, 200, { ok: true, ...pub(row, await position()) });
}

if (typeof Deno !== "undefined" && Deno.serve) {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  Deno.serve(async (req) => {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sem-ip";
    try { return await handle(req, db, ip); }
    catch (e) {
      const id = crypto.randomUUID();
      console.error("pixelfuga-ranking", id, (e as Error)?.message);
      return reply(headers(req.headers.get("origin") || ""), 500, { error: "Erro no servidor. Tente de novo.", id });
    }
  });
}
