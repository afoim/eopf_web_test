'use server'

import tls from 'tls'
import https from 'https'
import http from 'http'
import dns from 'dns'
import { URL } from 'url'
import { promisify } from 'util'
import { headers } from 'next/headers'

const resolveCname = promisify(dns.resolveCname)

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, number>()

export interface SiteInfo {
  url: string
  ip?: string
  cname?: string
  supportsHttp1_1: boolean
  tlsVersion?: string
  cipher?: string
  cert?: {
    subject: string
    issuer: string
    validFrom: string
    validTo: string
    daysRemaining: number
    serialNumber: string
    fingerprint: string
  }
  supportsHttp2: boolean
  supportsHttp3: boolean
  supportsHsts: boolean
  headers?: Record<string, string>
  statusCode?: number
  timings?: {
    dns: number
    tcp: number
    tls: number
    ttfb: number
    total: number
  }
  title?: string
  description?: string
  icon?: string
  ipInfo?: {
      ip: string
      country?: string
      region?: string
      city?: string
      isp?: string
  }
  error?: string
}

export async function checkSite(inputUrl: string): Promise<SiteInfo> {
  // Rate Limiting Logic
  const headersList = await headers()
  let clientIp = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
  
  // If x-forwarded-for contains multiple IPs, take the first one
  if (clientIp.includes(',')) {
    clientIp = clientIp.split(',')[0].trim()
  }

  const now = Date.now()
  const lastRequestTime = rateLimitMap.get(clientIp)

  if (lastRequestTime && (now - lastRequestTime) < 10000) {
    const remainingSeconds = Math.ceil((10000 - (now - lastRequestTime)) / 1000)
    return {
        url: inputUrl,
        supportsHttp1_1: false,
        supportsHttp2: false,
        supportsHttp3: false,
        supportsHsts: false,
        error: `请求过于频繁，请等待 ${remainingSeconds} 秒后再试`
    }
  }

  // Update rate limit
  rateLimitMap.set(clientIp, now)
  // Cleanup after 10 seconds to free memory
  setTimeout(() => rateLimitMap.delete(clientIp), 10000)

  console.log(`[CheckSite] Starting check for: ${inputUrl} from IP: ${clientIp}`);
  let urlStr = inputUrl
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    return {
        url: urlStr,
        supportsHttp1_1: false,
        supportsHttp2: false,
        supportsHttp3: false,
        supportsHsts: false,
        error: 'URL 必须包含 http:// 或 https:// 前缀'
    }
  }

  try {
    const url = new URL(urlStr)
    const host = url.hostname
    const protocol = url.protocol
    const port = url.port || (protocol === 'https:' ? 443 : 80)

    let cname = undefined
    try {
        const cnames = await resolveCname(host)
        if (cnames && cnames.length > 0) {
            cname = cnames[0]
        }
    } catch (e) {
        // No CNAME or error, ignore
    }

    let tlsResult: Partial<SiteInfo> = {}

    // 1. TLS and Cert Check (Only for HTTPS)
    if (protocol === 'https:') {
        try {
            tlsResult = await new Promise<Partial<SiteInfo>>((resolve, reject) => {
                const options = {
                    host: host,
                    port: Number(port),
                    servername: host, // SNI
                    ALPNProtocols: ['h2', 'http/1.1'],
                    rejectUnauthorized: false // Allow self-signed for testing
                }

                const socket = tls.connect(options, () => {
                    try {
                        const cert = socket.getPeerCertificate(true) // true for detailed
                        const cipher = socket.getCipher()
                        const proto = socket.getProtocol()
                        const alpn = socket.alpnProtocol
                        const remoteAddress = socket.remoteAddress

                        const now = new Date()
                        const validTo = new Date(cert.valid_to)
                        const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                        const info: Partial<SiteInfo> = {
                            ip: remoteAddress,
                            tlsVersion: proto || '未知',
                            cipher: cipher ? `${cipher.name} (${cipher.version})` : '未知',
                            supportsHttp2: alpn === 'h2',
                            cert: {
                                subject: cert.subject?.CN || (typeof cert.subject === 'object' ? Object.entries(cert.subject).map(([k,v]) => `${k}=${v}`).join(', ') : String(cert.subject)),
                                issuer: cert.issuer?.CN || (typeof cert.issuer === 'object' ? Object.entries(cert.issuer).map(([k,v]) => `${k}=${v}`).join(', ') : String(cert.issuer)),
                                validFrom: cert.valid_from,
                                validTo: cert.valid_to,
                                daysRemaining,
                                serialNumber: cert.serialNumber,
                                fingerprint: cert.fingerprint
                            }
                        }
                        socket.end()
                        resolve(info)
                    } catch (err) {
                        socket.destroy()
                        reject(err)
                    }
                })

                socket.on('error', (err) => {
                    console.error('[TLS Error]', err);
                    resolve({ error: `TLS 连接失败: ${err.message}` })
                })

                socket.setTimeout(10000, () => {
                    socket.destroy()
                    resolve({ error: 'TLS 连接超时' })
                })
            })
        } catch (e: any) {
             console.error('[TLS Exception]', e);
             tlsResult = { error: `TLS 检测异常: ${e.message}` }
        }

        if (tlsResult.error) {
           // Even if TLS fails, we might want to try HTTP request? 
           // Usually if TLS fails, HTTPS request will also fail.
           return { url: urlStr, supportsHttp1_1: false, supportsHttp2: false, supportsHttp3: false, supportsHsts: false, cname, ...tlsResult } as SiteInfo
        }
    } else {
        // HTTP
        tlsResult = {
            tlsVersion: 'N/A',
            cipher: 'N/A',
            supportsHttp2: false 
        }
    }

    // 2. HTTP Request
    const httpResult = await new Promise<Partial<SiteInfo>>((resolve) => {
      const requestModule = protocol === 'https:' ? https : http
      
      const t0 = performance.now()
      let t1 = 0 // DNS lookup
      let t2 = 0 // TCP connect
      let t3 = 0 // TLS secureConnect
      let t4 = 0 // Response
      let remoteIP = ''

      // Collect data for parsing
      const MAX_SIZE = 100 * 1024 // 100KB
      let data = ''

      const req = requestModule.request(urlStr, { 
          method: 'GET', // Use GET to fetch body
          rejectUnauthorized: false,
          headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; WebSecurityInspector/1.0)'
          }
      }, (res) => {
        t4 = performance.now()

        const headers: Record<string, string> = {}
        for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === 'string') headers[key] = value
            else if (Array.isArray(value)) headers[key] = value.join(', ')
        }

        const altSvc = headers['alt-svc']
        const supportsHttp3 = !!(altSvc && (altSvc.includes('h3=') || altSvc.includes('h3-29=')))
        
        const supportsHttp1_1 = res.httpVersion === '1.1' || res.httpVersion === '2.0'
        
        const hsts = headers['strict-transport-security']
        const supportsHsts = !!hsts

        // Calculate timings
        if (t1 === 0) t1 = t0
        if (t2 === 0) t2 = t1
        if (t3 === 0) t3 = t2

        const timings = {
            dns: Math.round(t1 - t0),
            tcp: Math.round(t2 - t1),
            tls: Math.round(t3 - t2),
            ttfb: Math.round(t4 - t3),
            total: Math.round(t4 - t0)
        }
        
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
            if (data.length < MAX_SIZE) {
                data += chunk
            } else {
                req.destroy()
            }
        })

        const finish = async () => {
             // Parse HTML
             const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i)
             const title = titleMatch ? titleMatch[1].trim() : undefined

             const descMatch = data.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || data.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)
             const description = descMatch ? descMatch[1].trim() : undefined

             let icon = undefined
             const iconMatch = data.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["'][^>]*>/i)
             if (iconMatch) {
                icon = iconMatch[1]
             }
             
             // Resolve icon path
             if (icon) {
                 try {
                    icon = new URL(icon, urlStr).href
                 } catch (e) {}
             } else {
                 try {
                    icon = new URL('/favicon.ico', urlStr).href
                 } catch (e) {}
             }

             // Fetch IP Geo Info
             let ipInfo = undefined
             if (remoteIP) {
                 try {
                    // Using a free IP geolocation API (e.g., ip-api.com)
                    // Note: In production, consider a paid/reliable service or DB
                    const geoRes = await fetch(`http://ip-api.com/json/${remoteIP}?fields=status,country,regionName,city,isp`)
                    const geoData = await geoRes.json()
                    if (geoData.status === 'success') {
                        ipInfo = {
                            ip: remoteIP,
                            country: geoData.country,
                            region: geoData.regionName,
                            city: geoData.city,
                            isp: geoData.isp
                        }
                    } else {
                         ipInfo = { ip: remoteIP }
                    }
                 } catch (e) {
                     ipInfo = { ip: remoteIP }
                 }
             }

             resolve({
                headers,
                supportsHttp3,
                supportsHttp1_1,
                supportsHsts,
                statusCode: res.statusCode,
                timings,
                title,
                description,
                icon,
                ipInfo
             })
        }

        res.on('end', finish)
        res.on('close', () => {
             // Ensure resolve if destroyed
             if (!res.complete) finish() 
        })

        // Handle errors in response stream context
        res.on('error', (e) => {
             // If we destroyed it manually, we might treat it as partial success
             if (data.length >= MAX_SIZE) {
                  finish()
             }
        })
      })

      req.on('socket', (socket) => {
          socket.on('lookup', (err, address) => { 
              t1 = performance.now() 
              remoteIP = address
          })
          socket.on('connect', () => { t2 = performance.now() })
          socket.on('secureConnect', () => { t3 = performance.now() })
      })

      req.on('error', (e) => {
        // If we destroyed it manually (to stop download), it might emit error
        if (data.length >= MAX_SIZE) {
             // Treat as success with partial data
             const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i)
             const title = titleMatch ? titleMatch[1].trim() : undefined
             resolve({ supportsHttp3: false, supportsHttp1_1: false, supportsHsts: false, error: 'Partial content (Size limit)', title })
        } else {
             console.error('[HTTP Error]', e);
             resolve({ supportsHttp3: false, supportsHttp1_1: false, supportsHsts: false, error: `HTTP 请求失败: ${e.message}` })
        }
      })
      
      req.setTimeout(10000, () => {
          req.destroy()
          resolve({ supportsHttp3: false, supportsHttp1_1: false, supportsHsts: false, error: 'HTTP 请求超时' })
      })

      req.end()
    })

    return {
      url: urlStr,
      cname,
      ...tlsResult,
      ...httpResult,
    } as SiteInfo

  } catch (err: any) {
    console.error('[CheckSite Exception]', err);
    return {
      url: urlStr,
      supportsHttp1_1: false,
      supportsHttp2: false,
      supportsHttp3: false,
      supportsHsts: false,
      error: err.message || '发生未知错误'
    }
  }
}
