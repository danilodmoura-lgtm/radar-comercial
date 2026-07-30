// Vercel Serverless Function — armazém compartilhado do RADAR COMERCIAL
// Backend: Vercel KV / Upstash Redis (via REST). Sem dependências npm.
//   GET  /api/state         -> retorna o objeto salvo (ou {})
//   POST /api/state (body)  -> salva o objeto e retorna { ok:true }
// As variáveis de ambiente são injetadas automaticamente pelo Vercel ao
// conectar um KV/Upstash store ao projeto.

const KV_URL   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'radar_state_v1';

async function redis(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  return r.json(); // { result: ... } ou { error: ... }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!KV_URL || !KV_TOKEN) {
    res.status(200).json({ error: 'kv_not_configured' });
    return;
  }
  try {
    if (req.method === 'GET') {
      const j = await redis(['GET', KEY]);
      const val = (j && typeof j.result === 'string') ? JSON.parse(j.result) : {};
      res.status(200).json(val);
      return;
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      let bodyStr;
      if (typeof req.body === 'string') bodyStr = req.body;
      else if (req.body && typeof req.body === 'object') bodyStr = JSON.stringify(req.body);
      else bodyStr = '{}';
      const j = await redis(['SET', KEY, bodyStr]);
      res.status(200).json({ ok: !!(j && (j.result === 'OK' || j.result === 1)) });
      return;
    }
    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    res.status(200).json({ error: String((e && e.message) || e) });
  }
}
