# Auditoría técnica y funcional de VisioAccess

Fecha: 4 de noviembre de 2026. Alcance: repositorio completo, frontend, API, extracción web, PDF/OCR, multimedia, preferencias, navegación, dependencias y despliegue Vercel. No equivale a una certificación WCAG ni a una prueba de penetración independiente.

## Hallazgos y correcciones

| Prioridad | Hallazgo | Corrección |
|---|---|---|
| Alta | El formulario web solo mostraba contenido simulado | API real con extracción de HTML público; botones sugeridos conectados al mismo servicio |
| Alta | Incompatibilidad ESM al iniciar la función Vercel | jsdom compatible y Node 24.x fijado; probado en preview |
| Alta | Un extractor de URLs puede acceder a recursos internos | Validación de DNS, fijación de IP al socket, bloqueo de rangos privados/reservados en cada redirección |
| Alta | Solicitudes remotas sin límites | Tiempo, tamaño de cuerpo/respuesta/texto, redirecciones, concurrencia y frecuencia limitados |
| Alta | Dependencias con avisos de seguridad | Actualización de Vite y Transformers.js; npm audit final sin vulnerabilidades reportadas |
| Media | PDF escaneado quedaba sin texto | OCR local por página cuando no hay texto seleccionable |
| Media | PDFs sin límite y tareas sin liberar | Límite de 20 MB/50 páginas/200000 caracteres; destrucción de tareas y motor OCR |
| Media | Imagen grande no se reducía por un error en el cálculo | Escalado máximo efectivo de 2800 píxeles; no convertir todos los píxeles a un Array de números |
| Media | OCR podía continuar al abandonar la herramienta | Terminación del worker y comprobación de cancelación |
| Media | Multimedia requería introducir toda la transcripción | Whisper Tiny local en un worker, español/inglés, máximo 2 minutos, cancelación y plazo de 5 minutos |
| Media | Subtítulos sin edición, importación ni exportación | Editor de texto/tiempos, SRT/VTT, validación de segmentos y pistas nativas para video/fullscreen |
| Media | Error de archivo multimedia oculto antes de seleccionar | Errores visibles independientemente del estado del archivo; captura de fallo de reproducción |
| Media | Preferencias desaparecían al recargar | Persistencia local con validación de valores y manejo de almacenamiento bloqueado |
| Media | Lecturas largas y callbacks de sesiones canceladas | Voz en fragmentos, identificador de sesión, limpieza y mensaje de error del motor de voz |
| Media | Navegación por teclado incompleta | Enlace para saltar al contenido, foco de ruta, foco visible, control del foco del menú móvil y flechas en grupos de opciones |
| Baja | Página en inglés y sin rutas desconocidas | Idioma español, títulos por ruta, metadescripción y pantalla de página no encontrada |
| Baja | Todas las herramientas se descargaban al inicio | Carga diferida por herramienta: entrada de aproximadamente 275 KB frente a 776 KB anteriores, sin contar CSS |
| Baja | Error técnico JSON mostrado al fallar la infraestructura | Mensaje comprensible ante respuestas no JSON |
| Baja | No existían controles automatizados | GitHub Actions, pruebas API/seguridad, subtítulos, preferencias y ciclo de lectura por voz |

## Evidencia funcional

Versión preview del conjunto principal: commit da31bf3. Cambios posteriores completan mensajes de voz, sincronización de texto importado y pistas nativas, con pruebas adicionales.

| Flujo | Resultado observado |
|---|---|
| PDF con texto, `tests/fixtures/text.pdf` | Texto real mostrado en el lector |
| PDF escaneado, `tests/fixtures/scanned.pdf` | OCR recuperó «VISIOACCESS», «Lectura accesible para todos» y «Documento de prueba 2026» |
| Imagen PNG, `tests/fixtures/text.png` | Mismo texto reconocido con las dos pasadas OCR |
| Web sugerida Wikipedia | Artículo real mostrado, no texto de demostración |
| URL fuera de sugerencias, example.com | Contenido real mostrado en la verificación del backend |
| Dirección interna 127.0.0.1 | Rechazo por política de sitios públicos |
| Audio WAV sintético con voz en inglés | Transcripción real generada con tiempos; «VisioAccess» fue reconocido con un error, demostrando la necesidad de revisión humana |
| Subtítulos SRT | Importación de dos segmentos con acentos; edición y descarga completadas |
| Subtítulos VTT | Descarga completada después de editar el texto |
| Preferencias | Tema noche y alto contraste conservados tras recargar; restablecimiento comprobado |
| Comando escrito «Documentos» | Navegó a /pdf |
| Ruta inexistente | Pantalla de página no encontrada y enlace al inicio |
| Voz sintética | El navegador remoto ofrece la API pero no permitió confirmar reproducción audible continua; ciclo de fragmentos/pausa/cancelación probado con motor controlado en tests |

## Validación reproducible

```bash
npm ci
npm test
npm run lint
npm run build
npm audit
```

15 casos automatizados: preferencias, borrador de subtítulos, formatos SRT/VTT, tiempos inválidos, URLs, rangos IP, extracción sin scripts/navegación, contenido vacío, redirecciones, transporte HTTP con servidor real de prueba, límites, API, rate limit y lectura por voz. Los archivos de `tests/fixtures` son datos sintéticos públicos de prueba, sin datos personales.

## Límites operativos

- La entrada de micrófono y la reproducción audible deben comprobarse en el dispositivo final con sus permisos y voces instaladas. No se ha certificado Safari/iOS ni un lector de pantalla físico. Se revisaron reglas responsive; la validación en dispositivos móviles reales queda fuera de la evidencia obtenida aquí.
- El procesamiento OCR necesita descargar datos de idioma la primera vez. La transcripción descarga aproximadamente 75 MB de modelo y el runtime WebAssembly; requiere memoria, Internet inicial y tiempo de CPU. El audio/video no se envía al backend. Whisper Tiny puede cometer errores: editar antes de publicar.
- La transcripción automática admite hasta 2 minutos. El borrador desde texto usa tiempos aproximados. Los archivos multimedia grandes pueden requerir conversión a un formato admitido por el navegador.
- No se extraen páginas privadas, protegidas por login, bloqueadas por el sitio o dependientes de JavaScript. No se intenta eludir estas restricciones.
- El rate limit y la concurrencia se aplican por proceso. Para tráfico público elevado, configurar límites distribuidos o del proveedor y monitorización de errores. No se implementó un almacén distribuido ni una prueba de carga a gran escala.
- No se requiere base de datos ni cuenta de usuario para el alcance actual: los archivos se procesan en la sesión local. No se agregaron pagos, autenticación o historial remoto sin una necesidad del producto.
- «Sin vulnerabilidades reportadas» describe el resultado de npm audit en esta fecha, no garantiza ausencia de vulnerabilidades.

## Ejecución y publicación

Véase README.md para Node 24, comandos locales, API, límites y Vercel. Se deben comprobar la URL de producción y `/api/health` después de integrar el PR. La evidencia de preview por sí sola no demuestra que producción use esa versión.
