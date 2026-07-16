// CaP github-push: commits a generated dossier to GitHub using a token held
// server-side only. Repo/branch are fixed here, not client-supplied, so this
// function can't be repurposed to write anywhere else.
const CAP_GITHUB_TOKEN = Deno.env.get('CAP_GITHUB_TOKEN');
const CAP_SB_KEY = Deno.env.get('CAP_SB_KEY');
const GITHUB_REPO = 'DesignProdigySG/DP-Syntropy-May-2026';
const GITHUB_BRANCH = 'main';
const PATH_PATTERN = /^agents\/tabita\/accounts\/[a-z0-9-]+\/v1\.md$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (req.headers.get('apikey') !== CAP_SB_KEY) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  const { path, content, message } = await req.json();
  if (typeof path !== 'string' || !PATH_PATTERN.test(path)) {
    return new Response('Invalid path', { status: 400, headers: CORS });
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const ghHeaders = {
    Authorization: `Bearer ${CAP_GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  };

  let sha: string | null = null;
  try {
    const ex = await fetch(apiUrl, { headers: ghHeaders });
    if (ex.ok) sha = (await ex.json()).sha;
  } catch (_) {
    // no existing file — sha stays null, PUT below creates it fresh
  }

  const encoded = btoa(unescape(encodeURIComponent(content)));
  const body: Record<string, unknown> = { message, content: encoded, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const resultText = await res.text();
  return new Response(resultText, {
    status: res.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
