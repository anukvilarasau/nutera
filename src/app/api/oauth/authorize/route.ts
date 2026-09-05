import { randomBytes } from 'crypto'
import { createClient, createAdminClient } from '@/lib/supabase-server'

// Returns the list of allowed redirect_uris for a given client_id,
// checking the static env-var client first, then the oauth_clients table.
async function resolveRedirectUris(clientId: string): Promise<string[] | null> {
  if (clientId === process.env.OAUTH_CLIENT_ID) {
    return ['https://claude.ai/api/mcp/auth_callback']
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('oauth_clients')
    .select('redirect_uris')
    .eq('client_id', clientId)
    .single()

  return data ? (data.redirect_uris as string[]) : null
}

// ── GET: validate params + session, then show consent screen ──────────────────

export async function GET(req: Request) {
  const url              = new URL(req.url)
  const { searchParams } = url

  const clientId            = searchParams.get('client_id')
  const redirectUri         = searchParams.get('redirect_uri')
  const codeChallenge       = searchParams.get('code_challenge')
  const codeChallengeMethod = searchParams.get('code_challenge_method')
  const state               = searchParams.get('state')
  const responseType        = searchParams.get('response_type')

  if (responseType !== 'code') {
    return Response.json({ error: 'unsupported_response_type' }, { status: 400 })
  }
  if (!clientId) {
    return Response.json({ error: 'invalid_client' }, { status: 400 })
  }
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return Response.json({ error: 'invalid_request', error_description: 'PKCE S256 required' }, { status: 400 })
  }

  const allowedUris = await resolveRedirectUris(clientId)
  if (!allowedUris) {
    return Response.json({ error: 'invalid_client' }, { status: 400 })
  }
  if (!redirectUri || !allowedUris.includes(redirectUri)) {
    return Response.json({ error: 'invalid_redirect_uri' }, { status: 400 })
  }

  // Check session; if absent, redirect to login and come back here
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('next', url.pathname + url.search)
    return Response.redirect(loginUrl.toString(), 302)
  }

  // Params are valid and user is authenticated — show consent screen
  const consentUrl = new URL('/oauth/consent', url.origin)
  consentUrl.searchParams.set('client_id',             clientId)
  consentUrl.searchParams.set('redirect_uri',          redirectUri)
  consentUrl.searchParams.set('code_challenge',        codeChallenge)
  consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
  if (state) consentUrl.searchParams.set('state',      state)

  return Response.redirect(consentUrl.toString(), 302)
}

// ── POST: handle consent form submission ──────────────────────────────────────

export async function POST(req: Request) {
  let body: URLSearchParams
  try {
    body = new URLSearchParams(await req.text())
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const consent             = body.get('consent')
  const clientId            = body.get('client_id')
  const redirectUri         = body.get('redirect_uri')
  const codeChallenge       = body.get('code_challenge')
  const codeChallengeMethod = body.get('code_challenge_method')
  const state               = body.get('state')

  // Re-validate everything (hidden fields could be tampered with)
  if (!clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== 'S256') {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const allowedUris = await resolveRedirectUris(clientId)
  if (!allowedUris || !allowedUris.includes(redirectUri)) {
    return Response.json({ error: 'invalid_client' }, { status: 400 })
  }

  // Build the base callback URL once; state goes on every response
  const callback = new URL(redirectUri)
  if (state) callback.searchParams.set('state', state)

  // User clicked "Cancelar"
  if (consent !== 'allow') {
    callback.searchParams.set('error', 'access_denied')
    return Response.redirect(callback.toString(), 302)
  }

  // Re-verify session (cookie is still present at POST time)
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    callback.searchParams.set('error', 'access_denied')
    return Response.redirect(callback.toString(), 302)
  }

  // Issue authorization code (10-minute TTL)
  const code      = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { error } = await admin.from('oauth_codes').insert({
    code,
    user_id:        user.id,
    redirect_uri:   redirectUri,
    code_challenge: codeChallenge,
    expires_at:     expiresAt,
  })

  if (error) {
    console.error('[oauth/authorize] insert error:', error.message)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }

  callback.searchParams.set('code', code)
  return Response.redirect(callback.toString(), 302)
}
