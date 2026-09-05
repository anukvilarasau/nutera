import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase-server'

function verifyPKCE(verifier: string, challenge: string): boolean {
  const computed = createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return computed === challenge
}

// Returns true if the client_id/client_secret pair is valid.
// Checks the static env-var client first, then the oauth_clients table.
async function validateClientCredentials(clientId: string, clientSecret: string): Promise<boolean> {
  if (
    clientId     === process.env.OAUTH_CLIENT_ID &&
    clientSecret === process.env.OAUTH_CLIENT_SECRET
  ) {
    return true
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('oauth_clients')
    .select('client_secret')
    .eq('client_id', clientId)
    .single()

  return !!data && data.client_secret === clientSecret
}

export async function POST(req: Request) {
  let body: URLSearchParams
  try {
    body = new URLSearchParams(await req.text())
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const grantType    = body.get('grant_type')
  const code         = body.get('code')
  const redirectUri  = body.get('redirect_uri')
  const clientId     = body.get('client_id')
  const clientSecret = body.get('client_secret')
  const codeVerifier = body.get('code_verifier')

  if (grantType !== 'authorization_code') {
    return Response.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }
  if (!clientId || !clientSecret) {
    return Response.json({ error: 'invalid_client' }, { status: 401 })
  }
  if (!code || !redirectUri || !codeVerifier) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!await validateClientCredentials(clientId, clientSecret)) {
    return Response.json({ error: 'invalid_client' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: row, error: lookupErr } = await admin
    .from('oauth_codes')
    .select('user_id, redirect_uri, code_challenge, expires_at')
    .eq('code', code)
    .single()

  if (lookupErr || !row) {
    return Response.json({ error: 'invalid_grant' }, { status: 400 })
  }

  // One-time use: delete immediately regardless of outcome below
  await admin.from('oauth_codes').delete().eq('code', code)

  if (new Date(row.expires_at) < new Date()) {
    return Response.json({ error: 'invalid_grant', error_description: 'Code expired' }, { status: 400 })
  }
  if (row.redirect_uri !== redirectUri) {
    return Response.json({ error: 'invalid_grant' }, { status: 400 })
  }
  if (!verifyPKCE(codeVerifier, row.code_challenge)) {
    return Response.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400 })
  }

  const accessToken = randomBytes(32).toString('hex')
  const expiresAt   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: insertErr } = await admin.from('oauth_tokens').insert({
    access_token: accessToken,
    user_id:      row.user_id,
    expires_at:   expiresAt,
  })

  if (insertErr) {
    console.error('[oauth/token] insert error:', insertErr.message)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }

  return Response.json({
    access_token: accessToken,
    token_type:   'Bearer',
    expires_in:   86400,
  })
}
