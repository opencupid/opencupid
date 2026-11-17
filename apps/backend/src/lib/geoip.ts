import { z } from 'zod'
import { appConfig } from '@/lib/appconfig'

const NetworkSchema = z.object({
  country: z.string().optional(),
  asn: z.number().optional(),
  asnOrganization: z.string().optional(),
})

export type IpNetwork = z.infer<typeof NetworkSchema>

/**
 * Country and network owner (ASN) of an IP, from the geoip-api service.
 * Returns null when the lookup fails: callers use it for diagnostics only.
 */
export async function lookupNetwork(ip: string): Promise<IpNetwork | null> {
  try {
    const res = await fetch(`${appConfig.GEOIP_API_URL}/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return null
    const parsed = NetworkSchema.safeParse(await res.json())
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
