# Auditoría técnica y funcional de VisioAccess

**Estado más reciente:** el PR #5 sustituye el modelo de subtítulos y supera la regresión BlindSense con 17,33 % WER, sin bucles. Los apartados anteriores conservan la evidencia histórica de los fallos y sus correcciones. La transcripción automática sigue requiriendo revisión humana y no se declara certificación WCAG.

Actualización: 5 de noviembre de 2026 (UTC). Alcance: repositorio completo, frontend, API, extracción web, PDF/OCR, multimedia, preferencias, navegación, dependencias y despliegue Vercel. No equivale a una certificación WCAG ni a una prueba de penetración independiente.

## Hallazgos y correcciones

| Prioridad | Hallazgo | Corrección |
|---|---|---|
| Alta | El formulario web solo mostraba contenido simulado | API real con extracción de HTML público; botones sugeridos conectados al mismo servicio |
| Alta | Incompatibilidad ESM al iniciar la función Vercel | jsdom compatible y Node 24.x fijado; probado en preview |
| Alta | Un extractor de URLs puede acceder a recursos internos | Validación de DNS, fijación de IP al socket, bloqueo de rangos privados/reservados en cada redirección |
| Alta | En Vercel, el proxy compartía la identidad del limitador entre visitantes | Clave por IP del visitante suministrada por Vercel; fuera de la plataforma se ignoran cabeceras manipulables |
| Alta | Solicitudes remotas sin límites | Tiempo, tamaño de cuerpo/respuesta/texto, redirecciones, concurrencia y frecuencia limitados |
| Alta | Dependencias con avisos de seguridad | Actualización de Vite y Transformers.js; npm audit final sin vulnerabilidades reportadas |
| Media | PDF escaneado quedaba sin texto | OCR local por página cuando no hay texto seleccionable |
| Media | PDFs sin límite y tareas sin liberar | Límite de 20 MB/50 páginas/200000 caracteres; destrucción de tareas y motor OCR |
| Media | Imagen grande no se reducía por un error en el cálculo | Escalado máximo efectivo de 2800 píxeles; no convertir todos los píxeles a un Array de números |
| Media | OCR podía continuar al abandonar la herramienta | Terminación del worker y comprobación de cancelación |
| Media | Multimedia requería introducir toda la transcripción | Whisper Tiny local en un worker, español/inglés, máximo 2 minutos, cancelación, progreso por fragmentos y límites de tiempo por fase |
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

26 casos automatizados: preferencias, borrador de subtítulos, formatos SRT/VTT, tiempos inválidos, URLs, rangos IP, extracción sin scripts/navegación, contenido vacío, redirecciones, transporte HTTP con servidor real de prueba, límites, API, rate limit lectura por voz y separación del límite por visitante en Vercel. Los archivos de `tests/fixtures` son datos sintéticos públicos de prueba, sin datos personales.

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

## Publicación verificada

El PR #1 se integró en `main` y la versión `0066db2` llegó a producción el 4 de noviembre de 2026. Se comprobó en `https://visio-access.vercel.app` el health check, extracción web real y video MP4 con subtítulos nativos visibles, incluida la activación/desactivación sin duplicación. La inspección de logs detectó la configuración del proxy del limitador; la corrección y su prueba de regresión se incluyen en el cambio posterior.


## Segunda revisión integral: 5 de noviembre de 2026

Base de esta revisión: `74506f8` en main. Cambios en PR #3. Se revisaron la API y su transporte HTTP, validación de URLs/DNS/IP, errores, concurrencia, configuración Vercel, frontend y rutas, preferencias, lectura por voz, OCR de imágenes y PDF, transcripción y formatos de subtítulos, dependencias y CI. La revisión de código y las pruebas automáticas no sustituyen las pruebas con usuarios y dispositivos finales.

### Nuevos hallazgos

| Prioridad | Evidencia / problema | Acción y estado |
|---|---|---|
| Alta | El MP4 de BlindSense de 105,43 s acababa con «Revisa el texto y los tiempos del segmento 1», perdiendo el resultado reconocido | Corregido: conservar palabras cuando el modelo devuelve tiempos nulos o de duración cero; reconstruir tiempos dentro del fragmento y avisar de que son aproximados |
| Alta | La inferencia larga carecía de resultados parciales y de progreso útil | Corregido: ventanas secuenciales de hasta 22 s, corte cerca de silencios, progreso por fragmento y subtítulos acumulados; límite de generación de tokens |
| Media | Cancelación o fallo posterior podía dejar al usuario sin resultados | Se conservan fragmentos terminados para edición/exportación; pruebas de fallo a mitad del proceso. Preparación 45 s, carga 180 s, cada fragmento 150 s, techo global 15 min |
| Media | «Imágenes» y otros comandos con tildes no coincidían correctamente | Normalización de tildes, puntuación y espacios antes de resolver el comando; prueba de regresión |
| Media | PNG con texto negro y fondo transparente podía transformarse en fondo negro durante OCR | Composición sobre blanco antes de convertir a grises y aplicar umbral |
| Media | PDF podía crear o continuar tareas tras abandonar la pantalla | Comprobaciones de montaje tras lecturas y creación de recursos; destrucción en limpieza y finally |
| Media | No existía evidencia automatizada de recuperación tras saturación | Nueva prueba: cuatro peticiones activas, quinta 503, health disponible y liberación de capacidad después de un error 500 |

### Resultados y límites de la segunda revisión

- `npm test`: 26 pruebas aprobadas, 0 fallos. Incluyen transporte abortado por timeout, saturación y recuperación, comandos con tildes, audio largo sin huecos, desplazamiento global de tiempos, resultados parciales, silencio y recuperación de tiempos inválidos.
- `npm run lint` y `npm run build`: aprobados. Entrada JS aproximada de 275 KB sin comprimir; OCR, PDF y reconocimiento se descargan al abrir cada herramienta. El runtime WASM de voz es grande (unos 27 MB sin comprimir), además del modelo. No se ha realizado una medición Lighthouse ni de Core Web Vitals con usuarios reales.
- `npm audit`: 0 vulnerabilidades reportadas en esta ejecución. No implica ausencia absoluta de vulnerabilidades.
- Seguridad de extracción: sin ejecución de scripts o HTML remoto en React, con DNS fijado y destinos internos bloqueados en cada salto. Los tests usan servidores y datos sintéticos; no se realizó una prueba de penetración externa ni una prueba de carga distribuida.
- Accesibilidad: revisión de nombres/etiquetas, estado ocupado, mensajes, navegación, foco, teclado y preferencias. Falta validación presencial con NVDA/VoiceOver, micrófono y reproducción audible, Safari/iOS y móviles reales. No se declara conformidad WCAG certificada.
- No hay base de datos, autenticación ni historial remoto en el alcance actual. Archivos y transcripciones permanecen en la sesión del navegador. Recargar o cerrar la pestaña pierde resultados no descargados; no se promete guardado automático.
- Para tráfico elevado siguen pendientes límites globales entre instancias y monitorización operativa continua. Los límites actuales por proceso son adecuados para pruebas/piloto, sin garantía de capacidad de producción masiva.


### Evidencia real nueva y criterio de cierre

Preview `cd8aa0b` completó los seis fragmentos del MP4 BlindSense (105,43 s), mostró resultados parciales y generó 15 segmentos, desde 0 hasta aproximadamente 105,4 s. La UI mostró explícitamente recuperación de tiempos aproximados. Descargas SRT y VTT completadas desde los botones reales.

**Hallazgo de calidad de la segunda revisión (corregido posteriormente en PR #5).** En esta grabación con voz sintética española, Whisper Tiny produjo texto con bucles y contenido inexacto. El procesamiento ya finaliza, pero ese texto no sirve como transcripción final sin corrección. Se añadió detección heurística de frases repetidas con advertencia visible y prueba de regresión; no se presenta como una puntuación de confianza ni detecta todos los errores. No se certifica una mejora de precisión del modelo. El siguiente trabajo de producto debe comparar modelos más precisos y grabaciones reales en español con transcripciones de referencia, midiendo exactitud, tiempo y memoria antes de sustituir el modelo. Las alternativas manuales e importación SRT/VTT siguen disponibles.

El resultado de aquella revisión fue **apto para piloto con limitaciones documentadas**, no «producto terminado sin pendientes». El reconocimiento automático de este audio no supera el criterio de calidad. Quedan también la matriz de dispositivos/lectores de pantalla y controles distribuidos para escalar tráfico.


## Cierre del reconocimiento: PR #5

Se sustituyó Whisper Tiny por `onnx-community/whisper-small` q8, fijando la revisión `36050c46d777d46dc4b5f43f6d90574fc38f8732`. Se limitan repeticiones en generación (`repetition_penalty=1.1`, `no_repeat_ngram_size=6`) además del presupuesto de 192 tokens por fragmento. La carga inicial dispone de hasta 300 segundos; se mantienen los plazos por fragmento y techo global. La UI informa de la descarga inicial aproximada de 250 MB. No se envía audio al backend ni se requiere clave o servicio de pago.

Prueba con referencia: guion original de 300 palabras del MP4 BlindSense de 105,418625 s. WER tras normalizar mayúsculas, puntuación y tildes; los números escritos y cifras permanecen distintos. Criterio de aceptación de esta regresión: WER ≤25 %, sin bucles detectados y finalización de seis fragmentos. Este criterio es específico de la muestra y no una certificación de precisión general.

| Configuración | Palabras reconocidas | Ediciones | WER | Tiempo CPU con caché |
|---|---:|---:|---:|---:|
| Tiny anterior | 921 | 901 | 300,33 % | 22,9 s |
| Small q8 con control de repetición | 292 | 52 | 17,33 % | 31,1 s |

La mayor parte de los errores restantes afecta a nombres propios, términos y la pronunciación sintética. El texto ya es coherente y no entra en bucles en esta muestra; siempre se requiere revisión editorial. WER superior a 100 % en Tiny refleja inserciones, no una tasa de «exactitud negativa». Son mediciones de Node/ONNX en CPU del entorno de prueba, no tiempos prometidos para el equipo del usuario. El benchmark repetido con el script del repositorio registró alrededor de 1,3 GiB de RSS máximo; se debe disponer de memoria suficiente. No se declara compatibilidad en todos los móviles.

Se añadieron una referencia con huella SHA-256 del video, un evaluador reproducible opcional y una prueba del cálculo de WER. Las pruebas habituales no descargan modelos ni hacen inferencia en CI. Siguen vigentes los límites del informe sobre dispositivos/lectores de pantalla reales y tráfico distribuido; no son funciones faltantes de este flujo local.


Verificación en Chrome/WASM de la configuración elegida: seis fragmentos completados del video, 292 palabras, 48 ediciones sobre 300 de referencia (WER 16 %), sin repetición detectada ni reconstrucción de tiempos. Exportaciones SRT y VTT descargadas; 25 segmentos válidos desde 0 s hasta 104,2 s, dentro de la duración del archivo (la cola final contiene silencio). La diferencia con Node puede deberse al remuestreo y al backend; no se combinan ambas métricas como si fueran una sola prueba. La revisión fijada se verificó también con el evaluador nativo.

Validación final de código: 27 pruebas automatizadas, lint y compilación. No se ha extendido el alcance a grabación por micrófono ni se afirma certificación de accesibilidad o compatibilidad universal.
