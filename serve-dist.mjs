import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, normalize, resolve, sep } from 'node:path'

const root = resolve(process.cwd(), 'dist')
const port = Number(process.env.PORT || 5188)
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp'
}

const server = createServer(async (request, response) => {
  try {
    const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname)
    const relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^[/\\]+/, '')
    const filePath = resolve(root, normalize(relativePath))
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) throw new Error('forbidden')
    if (!(await stat(filePath)).isFile()) throw new Error('not found')
    response.writeHead(200, {
      'Content-Type': mime[extname(filePath)] || 'application/octet-stream',
      // 强制每次校验：构建产物文件名带 hash，但 index.html 不带。
      // 若放任浏览器启发式缓存 index.html，它就会一直引用"上一代"已被删掉的 chunk，
      // 表现为"首页能开、点导航 404 跳不动"。这里一律禁用缓存。
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0'
    })
    response.end(await readFile(filePath))
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`BatteryScope offline server is ready: http://127.0.0.1:${port}`)
  console.log('Close this window to stop the site.')
})
