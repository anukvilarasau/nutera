import { randomBytes } from 'crypto'
import { createClient, createAdminClient } from '@/lib/supabase-server'

const ALLOWED_REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback'

export async function GET(req: Request) {
  const url           = new URL(req.url)
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
  if (clientId !== process.env.OAUTH_CLIENT_ID) {
    return Response.json({ error: 'invalid_client' }, { status: 400 })
  }
  if (redirectUri !== ALLOWED_REDIRECT_URI) {
    return Response.json({ error: 'invalid_redirect_uri' }, { status: 400 })
  }
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return Response.json({ error: 'invalid_request', error_description: 'PKCE S256 required' }, { status: 400 })
  }

  // Check active Supabase session
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    // Redirect to login, preserving the full authorize URL as the post-login destination
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
