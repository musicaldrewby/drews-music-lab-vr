import http from 'node:http';
import { stat, realpath } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app-runtime'));
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const port = Number(flag('--port') || process.env.PORT || 3000);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.m4a':'audio/mp4','.mp4':'video/mp4','.webm':'video/webm','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.txt':'text/plain; charset=utf-8','.pdf':'application/pdf'};
const GALLERY_UPSTREAM = 'https://drews-music-lab-vr.musicaldrewby.chatgpt.site';
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/gallery' || url.pathname.startsWith('/api/gallery/')) {
      const upstreamUrl = GALLERY_UPSTREAM + url.pathname + url.search;
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const headers = {
        'Origin': 'https://musicaldrewby.github.io',
        'Content-Type': req.headers['content-type'] || 'application/json'
      };
      if (req.headers['x-gallery-device']) headers['X-Gallery-Device'] = req.headers['x-gallery-device'];
      const upstream = await fetch(upstreamUrl, { method: req.method, headers, body });
      const resBody = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      return res.end(resBody);
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}); return res.end(); }
    const pathname = decodeURIComponent(url.pathname);
    let target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    let info = await stat(target);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(301, {Location:url.pathname+'/' + url.search}); return res.end(); }
      target = path.join(target, 'index.html'); info = await stat(target);
    }
    target = await realpath(target);
    if (!target.startsWith(root + path.sep) || !info.isFile()) { res.writeHead(403); return res.end(); }
    const headers = {'Content-Type':mime[path.extname(target).toLowerCase()] || 'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
    let start = 0, end = info.size - 1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      let valid = !!match && !!(match[1] || match[2]) && info.size > 0;
      if (valid) {
        if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
        else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
        valid = Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && end >= start && start < info.size;
      }
      if (!valid) { res.writeHead(416, {...headers, 'Content-Range':`bytes */${info.size}`}); return res.end(); }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || info.size === 0) return res.end();
    const stream = createReadStream(target, {start,end});
    stream.on('error', () => res.destroy()); stream.pipe(res);
  } catch (error) {
    res.writeHead(error instanceof URIError ? 400 : 404); res.end('Not found');
  }
});
server.listen(port, '0.0.0.0', () => console.log(`App available on port ${port}`));
