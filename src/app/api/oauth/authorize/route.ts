import { randomBytes } from 'crypto'
import { createClient, createAdminClient } from '@/lib/supabase-server'

// Resolve allowed redirect_uris for a client_id.
// Checks the static env-var client first (no DB round-trip for the existing integration),
// then falls back to the oauth_clients table for dynamically registered clients.
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

  // Validate client and redirect_uri together
  const allowedUris = await resolveRedirectUris(clientId)
  if (!allowedUris) {
    return Response.json({ error: 'invalid_client' }, { status: 400 })
  }
  if (!redirectUri || !allowedUris.includes(redirectUri)) {
    return Response.json({ error: 'invalid_redirect_uri' }, { status: 400 })
  }

  // Check active Supabase session
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('next', url.pathname + url.search)
    return Response.redirect(loginUrl.toString(), 302)
  }

  // Generate authorization code (10-minute TTL)
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

  const callbackUrl = new URL(redirectUri)
  callbackUrl.searchParams.set('code', code)
  if (state) callbackUrl.searchParams.set('state', state)

  return Response.redirect(callbackUrl.toString(), 302)
}
