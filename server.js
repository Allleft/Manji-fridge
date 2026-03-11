import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function sendNotFound(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('404 Not Found');
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const relativePath = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
  const targetPath = resolve(rootDir, normalize(relativePath));

  if (!targetPath.startsWith(rootDir)) {
    sendNotFound(response);
    return;
  }

  try {
    const fileStat = await stat(targetPath);
    const finalPath = fileStat.isDirectory() ? join(targetPath, 'index.html') : targetPath;
    const contentType = mimeTypes[extname(finalPath)] || 'application/octet-stream';

    response.writeHead(200, { 'Content-Type': contentType });
    createReadStream(finalPath).pipe(response);
  } catch {
    sendNotFound(response);
  }
});

server.listen(port, () => {
  console.log(`Manji Fridge is running at http://localhost:${port}`);
});
