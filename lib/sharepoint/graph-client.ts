import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'

let graphClient: Client | null = null

export function getGraphClient(): Client {
  if (graphClient) return graphClient

  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!
  )

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })

  graphClient = Client.initWithMiddleware({ authProvider })
  return graphClient
}

export async function getSiteId(): Promise<string> {
  return process.env.SHAREPOINT_SITE_ID!
}

export async function listChangedFiles(deltaLink?: string) {
  const client = getGraphClient()
  const siteId = await getSiteId()

  const url = deltaLink
    ? deltaLink
    : `/sites/${siteId}/drive/root/delta`

  const response = await client.api(url).get()
  return response
}

export async function downloadFileContent(
  driveId: string,
  itemId: string
): Promise<Buffer> {
  const client = getGraphClient()
  const siteId = await getSiteId()

  const response = await client
    .api(`/sites/${siteId}/drives/${driveId}/items/${itemId}/content`)
    .getStream()

  const chunks: Buffer[] = []
  for await (const chunk of response) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
