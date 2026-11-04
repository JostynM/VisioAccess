# VisioAccess

Lector accesible con React, Vite y una API Node.js/Express para extraer texto de páginas públicas mediante Mozilla Readability. La API devuelve texto, nunca HTML ejecutable. No requiere base de datos ni claves de servicios externos.

## Desarrollo local

Requiere Node.js 24.x.

```bash
npm ci
npm run server
```

En otra terminal:

```bash
npm run dev
```

Vite envía `/api` al backend en `127.0.0.1:3001`. Abre la dirección que muestra Vite y entra a Páginas web. Pega una URL pública y pulsa Adaptar página. Los botones de páginas sugeridas y el formulario descargan el contenido real del sitio.

`PORT` y `HOST` configuran el servidor independiente. El host predeterminado es loopback; en un contenedor usa `HOST=0.0.0.0` y un proxy HTTPS delante del servicio. No configures confianza indiscriminada en cabeceras de proxy.

## API

- `GET /api/health`: disponibilidad del proceso, no prueba la conectividad externa.
- `POST /api/web-reader`, Content-Type `application/json`, cuerpo `{"url":"https://example.com"}`.
- Respuesta: `title`, `text`, `url` final, `language`, `length`.
- Error: `{"error":{"code":"BLOCKED_ADDRESS","message":"..."}}` y estado HTTP correspondiente. `X-Request-Id` identifica la solicitud.

Se usan 422 para URL/contenido inválidos, 413 para límites de tamaño, 429 para límite de solicitudes, 502 para fallo del sitio remoto, 503 para saturación y 504 para tiempo agotado. Ninguna respuesta se almacena en caché.

## Límites y seguridad

Solo HTTP/HTTPS, sin credenciales ni puertos especiales. Se valida la resolución DNS completa y se fija la IP validada a la conexión conservando el hostname para TLS. Se rechazan direcciones privadas, loopback, link-local, reservadas y redirecciones hacia ellas. Máximo cuatro redirecciones, 12 segundos para red y DNS, 2 MB por página, 100000 caracteres extraídos, 4 KB de JSON y cuatro extracciones simultáneas por proceso. Las páginas se analizan sin ejecutar scripts ni descargar recursos secundarios.

Se permiten 20 consultas por minuto por IP y proceso. En despliegues con varias instancias, aplica también un límite distribuido o reglas del proveedor: el contador en memoria no es global. Una política de salida de red que bloquee destinos internos es una defensa adicional recomendada para producción.

Solo se extrae el HTML público recibido. No se inicia sesión, no se evitan bloqueos del sitio y no se ejecuta JavaScript remoto. Sitios que requieren esas funciones pueden no producir contenido. El lector manual continúa disponible. Multimedia permite transcripción local con Whisper Tiny de hasta 2 minutos (descarga inicial de unos 75 MB), edición e importación/exportación SRT/VTT. El audio no se envía al backend. Revisa el resultado: no se garantiza exactitud automática.

## Vercel

El repositorio incluye la función `api/index.js` y las rutas en `vercel.json` para servir API y frontend desde el mismo origen, sin configurar CORS ni URLs de backend en el navegador. Usa Node.js 24 en la configuración del proyecto y el build Vite (`npm run build`, salida `dist`). No requiere un túnel local.

Tras desplegar verifica `/api/health` y una URL pública con contenido real desde el formulario. El despliegue remoto y su conectividad deben comprobarse en el proveedor; las pruebas locales no los sustituyen.

## Validación

```bash
npm test
npm run lint
npm run build
```

Las pruebas verifican API, extracción con acentos, DNS, redes privadas, redirecciones, transporte HTTP real con servidor de prueba, tamaños y rate limit. GitHub Actions ejecuta estas comprobaciones en Node 24.
