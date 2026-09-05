export function GET(req: Request) {
  const base = new URL(req.url).origin
  return Response.json({
    resource:             `${base}/api/mcp`,
    authorization_servers: [base],
  })
}
