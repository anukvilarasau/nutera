import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_client_metadata' }, { status: 400 })
  }

  const redirectUris = body['redirect_uris']
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return Response.json(
      { error: 'invalid_client_metadata', error_description: 'redirect_uris is required' },
      { status: 400 },
    )
  }

  for (const uri of redirectUris) {
    if (typeof uri !== 'string') {
      return Response.json({ error: 'invalid_redirect_uri' }, { status: 400 })
    }
    try { new URL(uri) } catch {
      return Response.json(
        { error: 'invalid_redirect_uri', error_description: `Not a valid URL: ${uri}` },
        { status: 400 },
      )
    }
  }

  const clientId     = randomBytes(16).toString('hex')
  const clientSecret = randomBytes(32).toString('hex')

  const admin = createAdminClient()
  const { error } = await admin.from('oauth_clients').insert({
    client_id:     clientId,
    client_secret: clientSecret,
    redirect_uris: redirectUris,
  })

  if (error) {
    console.error('[oauth/register] insert error:', error.message)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }

  return Response.json(
    {
      client_id:                  clientId,
      client_secret:              clientSecret,
      redirect_uris:              redirectUris,
      grant_types:                ['authorization_code'],
      response_types:             ['code'],
      token_endpoint_auth_method: 'client_secret_post',
    },
    { status: 201 },
  )
}
