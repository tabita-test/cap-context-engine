// CaP db-proxy: forwards PostgREST calls with the real Supabase key held
// server-side only. Client never sees CAP_SB_KEY — it authenticates to this
// function with the same key via the apikey header, checked below.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const CAP_SB_KEY = Deno.env.get('CAP_SB_KEY');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (req.headers.get('apikey') !== CAP_SB_KEY) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  const url = new URL(req.url);
  const restPath = url.pathname.replace(/^\/db-proxy\/?/, '');
  const target = `${SUPABASE_URL}/rest/v1/${restPath}${url.search}`;

  const res = await fetch(target, {
    method: req.method,
    headers: {
      apikey: CAP_SB_KEY!,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
