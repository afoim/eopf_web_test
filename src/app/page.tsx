'use client'

import { useState } from 'react'
import { checkSite, SiteInfo } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Globe, Shield, Server, AlertCircle, CheckCircle, XCircle, Timer, Info, Github, User } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SiteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await checkSite(url)
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(`发生意外错误: ${err.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
            网站安全检测工具
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            即时分析 HTTP 版本、TLS 支持和证书详情。
          </p>
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>输入网站 URL</CardTitle>
            <CardDescription>必须包含 http:// 或 https://，且不跟随重定向</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-4">
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    检测中
                  </>
                ) : (
                  '开始检测'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && !result.error && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Connection Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">连接支持</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">状态码</span>
                    <Badge variant={result.statusCode && result.statusCode < 400 ? "outline" : "destructive"}>
                        {result.statusCode || '未知'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">HTTP/1.1</span>
                    {result.supportsHttp1_1 ? (
                      <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/> 支持</Badge>
                    ) : (
                      <Badge variant="outline"><XCircle className="w-3 h-3 mr-1"/> 否</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">HTTP/2</span>
                    {result.supportsHttp2 ? (
                      <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/> 支持</Badge>
                    ) : (
                      <Badge variant="outline"><XCircle className="w-3 h-3 mr-1"/> 否</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">HTTP/3 (QUIC)</span>
                    {result.supportsHttp3 ? (
                      <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/> 支持</Badge>
                    ) : (
                      <Badge variant="outline">未检测到</Badge>
                    )}
                  </div>
                   <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">HSTS 支持</span>
                    {result.supportsHsts ? (
                      <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/> 是</Badge>
                    ) : (
                      <Badge variant="outline"><XCircle className="w-3 h-3 mr-1"/> 否</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">TLS 版本</span>
                    <Badge variant="secondary">{result.tlsVersion}</Badge>
                  </div>
                   <div className="flex flex-col space-y-1 mt-2">
                    <span className="text-sm font-medium">加密套件</span>
                    <span className="text-xs text-muted-foreground break-all">{result.cipher}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timings Info */}
            <Card className="md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">连接耗时</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="mt-4 space-y-4">
                  {result.timings ? (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>DNS 解析</span>
                          <span className="font-mono">{result.timings.dns}ms</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                           <div className="h-full bg-blue-500" style={{ width: `${Math.max(5, (result.timings.dns / result.timings.total) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>TCP 连接</span>
                          <span className="font-mono">{result.timings.tcp}ms</span>
                        </div>
                         <div className="h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                           <div className="h-full bg-orange-500" style={{ width: `${Math.max(5, (result.timings.tcp / result.timings.total) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>TLS 握手</span>
                          <span className="font-mono">{result.timings.tls}ms</span>
                        </div>
                         <div className="h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                           <div className="h-full bg-purple-500" style={{ width: `${Math.max(5, (result.timings.tls / result.timings.total) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>TTFB (首字节)</span>
                          <span className="font-mono">{result.timings.ttfb}ms</span>
                        </div>
                         <div className="h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                           <div className="h-full bg-green-500" style={{ width: `${Math.max(5, (result.timings.ttfb / result.timings.total) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="pt-2 border-t mt-2 flex justify-between items-center">
                        <span className="font-semibold text-sm">总计</span>
                        <span className="font-bold font-mono text-lg">{result.timings.total}ms</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">耗时数据不可用</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Certificate Info */}
            <Card className="md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SSL 证书</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">颁发给 (Subject)</span>
                    <p className="text-sm font-medium truncate" title={result.cert?.subject}>{result.cert?.subject}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">颁发者 (Issuer)</span>
                    <p className="text-sm font-medium truncate" title={result.cert?.issuer}>{result.cert?.issuer}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">有效期起始</span>
                        <p className="text-sm">{result.cert?.validFrom ? new Date(result.cert.validFrom).toLocaleDateString() : '不可用'}</p>
                     </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">有效期截止</span>
                        <p className="text-sm">{result.cert?.validTo ? new Date(result.cert.validTo).toLocaleDateString() : '不可用'}</p>
                     </div>
                  </div>
                   <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">有效期状态</span>
                    {result.cert?.daysRemaining !== undefined && (
                        <div className="flex items-center mt-1">
                             <Badge variant={result.cert.daysRemaining > 30 ? "default" : "destructive"}>
                                剩余 {result.cert.daysRemaining} 天
                             </Badge>
                        </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Site Info */}
            <Card className="md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">站点信息</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center space-x-3">
                     {result.icon ? (
                       <img src={result.icon} alt="Favicon" className="w-8 h-8 rounded-sm object-contain" />
                     ) : (
                       <Globe className="w-8 h-8 text-gray-400" />
                     )}
                     <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate" title={result.title || '无标题'}>{result.title || '无标题'}</p>
                     </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground line-clamp-3" title={result.description}>
                      {result.description || '暂无描述信息'}
                    </p>
                  </div>
                  
                  {/* IP Info */}
                  {result.ipInfo && (
                      <div className="pt-2 border-t mt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">服务器 IP</span>
                            <span className="text-sm font-mono">{result.ipInfo.ip}</span>
                        </div>
                        {result.cname && (
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CNAME</span>
                                <span className="text-sm font-mono truncate max-w-[180px]" title={result.cname}>{result.cname}</span>
                            </div>
                        )}
                        {result.ipInfo.country && (
                            <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-1">
                                <Badge variant="outline">{result.ipInfo.country}</Badge>
                                {result.ipInfo.region && <Badge variant="outline">{result.ipInfo.region}</Badge>}
                                {result.ipInfo.city && <Badge variant="outline">{result.ipInfo.city}</Badge>}
                                {result.ipInfo.isp && <Badge variant="secondary" className="ml-auto">{result.ipInfo.isp}</Badge>}
                            </div>
                        )}
                      </div>
                  )}
                </div>
              </CardContent>
            </Card>

             {/* Headers Info (Optional, but useful) */}
             <Card className="md:col-span-2">
                 <CardHeader>
                     <CardTitle className="text-sm font-medium">响应头 (部分)</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <div className="bg-slate-950 text-slate-50 p-4 rounded-md text-xs font-mono overflow-x-auto max-h-60">
                         {result.headers ? (
                             Object.entries(result.headers).slice(0, 10).map(([k, v]) => (
                                 <div key={k} className="mb-1">
                                     <span className="text-blue-400">{k}:</span> <span className="text-green-400 break-all">{v}</span>
                                 </div>
                             ))
                         ) : (
                             <span className="text-gray-500">无可用响应头</span>
                         )}
                         {result.headers && Object.keys(result.headers).length > 10 && (
                             <div className="text-gray-500 mt-2">... 更多</div>
                         )}
                     </div>
                 </CardContent>
             </Card>

          </div>
        )}
        
        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-12 pb-8 space-y-2">
            <div className="flex items-center justify-center gap-4">
                <a 
                    href="https://github.com/afoim/eopf_web_test" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    <Github className="w-4 h-4 mr-1.5" />
                    <span>开源项目</span>
                </a>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <a 
                    href="https://space.bilibili.com/325903362" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    <User className="w-4 h-4 mr-1.5" />
                    <span>作者主页</span>
                </a>
            </div>
            <p className="text-xs text-gray-400">
                 &copy; {new Date().getFullYear()} Website Security Inspector.            </p>
        </div>
      </div>
    </div>
  )
}
