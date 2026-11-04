import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { validateUrl, resolveTarget, isPublicAddress, extractContent, readPage, requestPage } from '../server/reader.js';

const paragraph = 'Este artículo presenta información pública sobre accesibilidad digital para facilitar que todas las personas puedan consultar y escuchar su contenido. ';
const html = `<html lang="es"><head><meta charset="utf-8"><title>Accesibilidad</title></head><body><nav>MENÚ AJENO</nav><main><h1>Accesibilidad</h1><p>${paragraph.repeat(10)}</p><script>alert('PELIGRO')</script></main></body></html>`;

test('only public HTTP URLs without credentials or special ports', () => {
  for (const url of ['file:///etc/passwd', 'ftp://example.com', 'http://user:pass@example.com', 'https://example.com:9000', '', null]) {
    assert.throws(() => validateUrl(url));
  }
  assert.equal(validateUrl('https://example.com/path#test').href, 'https://example.com/path');
});
test('blocks private, metadata, mapped IPv4, loopback and reserved networks', async () => {
  for (const address of ['127.0.0.1','10.0.0.1','192.168.1.2','169.254.169.254','0.0.0.0','::1','fc00::1','::ffff:127.0.0.1','100.64.0.1']) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  await assert.rejects(resolveTarget(new URL('https://example.com'), async () => [{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]), {code:'BLOCKED_ADDRESS'});
});
test('extracts real text and metadata without scripts or navigation', () => {
  const result = extractContent(Buffer.from(html), new URL('https://example.com/article'));
  assert.match(result.text, /información pública/);
  assert.doesNotMatch(result.text, /PELIGRO|MENÚ AJENO/);
  assert.equal(result.language, 'es');
  assert.equal(result.length, result.text.length);
});
test('rejects empty or JS-only documents', () => {
  assert.throws(() => extractContent(Buffer.from('<html><body><div id="app"></div></body></html>'),new URL('https://example.com')), {code:'NO_CONTENT'});
});
test('validates every redirect destination before downloading', async () => {
  let downloads = 0;
  await assert.rejects(readPage('https://example.com', {
    resolve: async url => resolveTarget(url, async () => [{ address: url.hostname === 'example.com' ? '8.8.8.8' : '127.0.0.1',family:4}]),
    request: async () => { downloads++; return {redirect:'http://internal.example'}; },
  }), {code:'BLOCKED_ADDRESS'});
  assert.equal(downloads, 1);
});
test('redirect limit prevents loops', async () => {
  await assert.rejects(readPage('https://example.com', {resolve:async()=>({}),request:async()=>({redirect:'/again'})}), {code:'REDIRECT_LIMIT'});
});
test('HTTP transport handles HTML, unsupported types, upstream errors and byte limit', async t => {
  const server = http.createServer((req,res) => {
    if (req.url === '/bad') {res.writeHead(403).end();return;}
    res.setHeader('Content-Type',req.url === '/pdf' ? 'application/pdf' : 'text/html');
    res.end(req.url === '/large' ? 'x'.repeat(2*1024*1024+1) : html);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const target = {address:'127.0.0.1',family:4};
  const download = path=>requestPage(new URL(`http://example.test:${server.address().port}${path}`),target,AbortSignal.timeout(2000));
  assert.match((await download('/')).body.toString(),/Accesibilidad/);
  await assert.rejects(download('/bad'),{code:'UPSTREAM_ERROR'});
  await assert.rejects(download('/pdf'),{code:'UNSUPPORTED_CONTENT'});
  await assert.rejects(download('/large'),{code:'PAGE_TOO_LARGE'});
});
test('API health, extraction, validation, malformed JSON and missing routes', async () => {
  const app = createApp({reader: async value => {validateUrl(value);return extractContent(Buffer.from(html),new URL(value));}});
  await request(app).get('/api/health').expect(200);
  const result = await request(app).post('/api/web-reader').send({url:'https://example.com'}).expect(200);
  assert.match(result.body.text,/información pública/);
  assert.equal(result.headers['cache-control'],'no-store');
  await request(app).post('/api/web-reader').send({url:'file:///test'}).expect(422);
  await request(app).post('/api/web-reader').set('Content-Type','application/json').send('{').expect(400);
  await request(app).post('/api/web-reader').send({url:'x'.repeat(5000)}).expect(413);
  await request(app).get('/api/missing').expect(404);
});
test('rate limits extraction requests', async () => {
  const app = createApp({reader:async()=>({text:paragraph})});
  for(let i=0;i<20;i++) await request(app).post('/api/web-reader').send({url:'https://example.com'}).expect(200);
  await request(app).post('/api/web-reader').send({url:'https://example.com'}).expect(429);
});
