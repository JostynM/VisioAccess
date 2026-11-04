import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ApiError } from './errors.js';

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 12000;
const fail = (code, message, status = 422) => new ApiError(status, code, message);

export function validateUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) {
    throw fail('INVALID_URL', 'Ingresa una dirección web válida.');
  }
  let url;
  try { url = new URL(value); } catch { throw fail('INVALID_URL', 'La dirección web no es válida.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port))) {
    throw fail('INVALID_URL', 'Utiliza una URL HTTP o HTTPS pública sin credenciales ni puertos especiales.');
  }
  url.hash = '';
  return url;
}

export function isPublicAddress(address) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}

export async function resolveTarget(url, resolver = dns.lookup) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  try {
    addresses = ipaddr.isValid(hostname)
      ? [{ address: hostname, family: ipaddr.parse(hostname).kind() === 'ipv4' ? 4 : 6 }]
      : await resolver(hostname, { all: true, verbatim: true });
  } catch { throw fail('DNS_FAILED', 'No se pudo encontrar el sitio web.', 502); }
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw fail('BLOCKED_ADDRESS', 'Solo se permiten sitios públicos de Internet.');
  }
  return addresses[0];
}

// Pin the validated DNS answer to the socket; never resolve again at connection time.
export function requestPage(url, target, signal) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, {
      signal, agent: false,
      lookup: (_hostname, options, callback) => options.all
        ? callback(null, [target]) : callback(null, target.address, target.family),
      headers: { 'User-Agent': 'VisioAccess/1.0 (accessible public web reader)', Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity' },
    }, (response) => {
      const status = response.statusCode;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.destroy();
        resolve({ redirect: response.headers.location });
        return;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        reject(fail('UPSTREAM_ERROR', 'El sitio no permitió obtener la página.', 502));
        return;
      }
      const type = response.headers['content-type'] || '';
      if (!/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(type) ||
          (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
        response.destroy();
        reject(fail('UNSUPPORTED_CONTENT', 'La dirección debe devolver una página HTML sin compresión forzada.'));
        return;
      }
      let size = 0;
      const chunks = [];
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          reject(fail('PAGE_TOO_LARGE', 'La página supera el límite de 2 MB.', 413));
          response.destroy();
        } else chunks.push(chunk);
      });
      response.on('end', () => resolve({ body: Buffer.concat(chunks), contentType: type }));
      response.on('error', reject);
    });
    request.on('error', reject);
  });
}

export function extractContent(body, url, contentType = 'text/html') {
  const dom = new JSDOM(body, { url: url.href, contentType });
  try {
    const document = dom.window.document;
    document.querySelectorAll('script,style,noscript,iframe,form,[hidden],[aria-hidden="true"]').forEach(el => el.remove());
    const originalTitle = document.title;
    const lang = document.documentElement.lang || null;
    const article = new Readability(document.cloneNode(true), { maxElemsToParse: 20000 }).parse();
    const content = article?.content;
    const readable = content ? new JSDOM(content) : null;
    try {
      const root = readable?.window.document.body || document.querySelector('main,article');
      if (!root) throw fail('NO_CONTENT', 'No se encontró contenido legible. Puedes pegar el texto manualmente.');
      root.querySelectorAll('nav,header,footer,aside,button').forEach(el => el.remove());
      root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,br,div,section,tr').forEach(el => el.append('\n'));
      const text = root.textContent.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (text.length < 80) throw fail('NO_CONTENT', 'La página no contiene suficiente texto público. Puede requerir JavaScript o iniciar sesión.');
      if (text.length > 100000) throw fail('TEXT_TOO_LONG', 'El contenido supera el límite de lectura.');
      return { title: article?.title || originalTitle || url.hostname, text, url: url.href, language: lang, length: text.length };
    } finally { readable?.window.close(); }
  } finally { dom.window.close(); }
}

export async function readPage(value, { resolve = resolveTarget, request = requestPage } = {}) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const deadline = new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(fail('TIMEOUT', 'El sitio tardó demasiado en responder.', 504)), { once: true });
  });
  const work = async () => {
    let url = validateUrl(value);
    for (let hop = 0; hop <= 4; hop++) {
      const target = await resolve(url);
      signal.throwIfAborted();
      const result = await request(url, target, signal);
      if ('redirect' in result) {
        if (!result.redirect || hop === 4) throw fail('REDIRECT_LIMIT', 'El sitio devolvió demasiadas redirecciones.');
        url = validateUrl(new URL(result.redirect, url).href);
        continue;
      }
      return extractContent(result.body, url, result.contentType);
    }
  };
  try { return await Promise.race([work(), deadline]); }
  catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal.aborted) throw fail('TIMEOUT', 'El sitio tardó demasiado en responder.', 504);
    throw fail('FETCH_FAILED', 'No se pudo descargar el contenido del sitio.', 502);
  }
}
