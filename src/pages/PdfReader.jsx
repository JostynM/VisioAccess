import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Pause,
  Play,
  Square,
  Upload,
  Volume2,
  X,
} from "lucide-react";

import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from
  "pdfjs-dist/build/pdf.worker.min.mjs?url";

import AccessibilityBar
  from "../components/AccessibilityBar";

import useSpeech
  from "../hooks/useSpeech";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  pdfWorker;

function PdfReader({
  increaseFont,
  decreaseFont,
  toggleContrast,
  highContrast,
}) {
  const inputRef = useRef(null);
  const taskRef = useRef(null);
  const ocrRef = useRef(null);
  const activeRef = useRef(true);
  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; taskRef.current?.destroy(); ocrRef.current?.terminate(); }; }, []);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [extractedText, setExtractedText] =
    useState("");

  const [error, setError] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(0);

  const {
    speak,
    pauseOrResume,
    stop,
    isSpeaking,
    isPaused,
    rate,
    setRate,
    speechSupported,
    speechError,
  } = useSpeech();

  const validateFile = (file) => {
    if (!file) {
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setError(
        "Selecciona un archivo en formato PDF.",
      );

      setSelectedFile(null);

      return;
    }

    if (processing) return;
    if (file.size > 20 * 1024 * 1024) { setError("El PDF debe pesar como máximo 20 MB."); return; }
    stop();

    setError("");
    setExtractedText("");
    setProgress(0);
    setTotalPages(0);
    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    const file =
      event.target.files?.[0];

    validateFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const file =
      event.dataTransfer.files?.[0];

    validateFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const removeFile = () => {
    stop();

    setSelectedFile(null);
    setExtractedText("");
    setError("");
    setProgress(0);
    setTotalPages(0);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  const processPdf = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      stop();

      setProcessing(true);
      setError("");
      setExtractedText("");
      setProgress(0);

      const arrayBuffer =
        await selectedFile.arrayBuffer();

      if (!activeRef.current) return;
      const loadingTask =
        pdfjsLib.getDocument({
          data:
            new Uint8Array(
              arrayBuffer,
            ),
        });

      taskRef.current = loadingTask;
      const pdf =
        await loadingTask.promise;

      if (!activeRef.current) return;
      if (pdf.numPages > 50) throw new Error("Utiliza un PDF de hasta 50 páginas.");
      setTotalPages(
        pdf.numPages,
      );

      let completeText = "";

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber += 1
      ) {
        const page =
          await pdf.getPage(
            pageNumber,
          );

        const textContent =
          await page.getTextContent();

        if (!activeRef.current) return;
        let pageText =
          textContent.items
            .map((item) => {
              if (!("str" in item)) {
                return "";
              }

              return `${item.str}${
                item.hasEOL
                  ? "\n"
                  : " "
              }`;
            })
            .join("")
            .trim();

        if (!pageText.trim()) {
          if (!ocrRef.current) {
            const { createWorker } = await import('tesseract.js');
            if (!activeRef.current) return;
            ocrRef.current = await createWorker(['spa', 'eng']);
            if (!activeRef.current) return;
          }
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(2, 1600 / Math.max(base.width, base.height)) });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const result = await ocrRef.current.recognize(canvas);
          pageText = result.data.text.trim();
          canvas.width = 0; canvas.height = 0;
        }
        page.cleanup();
        if (completeText.length + pageText.length > 200000) throw new Error('El documento contiene demasiado texto. Divídelo en archivos más pequeños.');
        completeText +=
          `\n\nPágina ${pageNumber}\n\n${pageText}`;

        setProgress(
          Math.round(
            (
              pageNumber /
              pdf.numPages
            ) * 100,
          ),
        );
      }

      const cleanText =
        completeText.trim();

      const contentWithoutHeaders =
        cleanText
          .replace(
            /Página \d+/g,
            "",
          )
          .trim();

      if (!contentWithoutHeaders) {
        setError(
          "No se encontró texto seleccionable. Es posible que el PDF sea un documento escaneado.",
        );

        return;
      }

      setExtractedText(
        cleanText,
      );
    } catch (pdfError) {
      console.error(
        "Error procesando PDF:",
        pdfError,
      );

      setError(
        pdfError.name === 'PasswordException' ? 'El PDF está protegido con contraseña. Utiliza una copia desbloqueada.' :
        /hasta 50|demasiado texto/.test(pdfError.message) ? pdfError.message :
        'No fue posible procesar el documento. Comprueba el archivo y tu conexión para el OCR.',
      );
    } finally {
      await taskRef.current?.destroy().catch(() => {});
      taskRef.current = null;
      await ocrRef.current?.terminate().catch(() => {});
      ocrRef.current = null;
      setProcessing(false);
    }
  };

  const handleRateChange = (
    event,
  ) => {
    setRate(
      Number(
        event.target.value,
      ),
    );

    if (isSpeaking) {
      stop();
    }
  };

  return (
    <section className="pdf-page">

      <AccessibilityBar
        increaseFont={increaseFont}
        decreaseFont={decreaseFont}
        toggleContrast={toggleContrast}
        highContrast={highContrast}
      />

      <Link
        to="/"
        className="back-link"
        onClick={stop}
      >
        <ArrowLeft size={19} />

        Volver al inicio
      </Link>

      <header className="pdf-header">
        <span className="section-label">
          DOCUMENTOS
        </span>

        <h1>
          Leer un documento PDF
        </h1>

        <p>
          Selecciona un documento y
          VisioAccess extraerá su contenido
          para presentarlo de una manera más
          clara y fácil de leer.
        </p>
      </header>

      <div className="pdf-layout">

        <div className="pdf-main-panel">

          {!selectedFile && (
            <div
              className="pdf-drop-zone"
              onDrop={handleDrop}
              onDragOver={
                handleDragOver
              }
            >
              <div className="pdf-upload-icon">
                <Upload size={35} />
              </div>

              <h2>
                Arrastra tu documento aquí
              </h2>

              <p>
                También puedes seleccionarlo
                desde tu computadora.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={
                  handleFileChange
                }
                className="file-input"
              />

              <button
                type="button"
                className="select-file-button"
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                <FileText size={20} />

                Seleccionar PDF
              </button>

              <small>
                PDF · Máximo 20 MB y 50 páginas
              </small>
            </div>
          )}

          {selectedFile && (
            <div className="selected-pdf">

              <div className="selected-pdf-top">

                <div className="selected-file-icon">
                  <FileText size={30} />
                </div>

                <div className="selected-file-data">
                  <strong>
                    {selectedFile.name}
                  </strong>

                  <span>
                    {formatFileSize(
                      selectedFile.size,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className="remove-file-button"
                  onClick={
                    removeFile
                  }
                  disabled={
                    processing
                  }
                  aria-label="Quitar documento"
                >
                  <X size={21} />
                </button>
              </div>

              {!processing &&
                !extractedText && (
                  <button
                    type="button"
                    className="process-pdf-button"
                    onClick={
                      processPdf
                    }
                  >
                    Procesar documento
                  </button>
                )}

              {processing && (
                <div
                  className="processing-box"
                  aria-live="polite"
                >
                  <div className="processing-info">

                    <LoaderCircle
                      size={29}
                      className="loading-icon"
                    />

                    <div>
                      <strong>
                        Procesando documento
                      </strong>

                      <p>
                        Extrayendo texto; las páginas escaneadas
                        se reconocen mediante OCR...
                      </p>
                    </div>

                    <span className="progress-number">
                      {progress}%
                    </span>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-value"
                      style={{
                        width:
                          `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {extractedText && (
                <div
                  className="success-message"
                  aria-live="polite"
                >
                  <CheckCircle2
                    size={23}
                  />

                  <div>
                    <strong>
                      Documento procesado
                    </strong>

                    <p>
                      Se procesaron{" "}
                      {totalPages}{" "}
                      {totalPages === 1
                        ? "página"
                        : "páginas"}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              className="error-message"
              role="alert"
            >
              <strong>
                No pudimos extraer
                el contenido
              </strong>

              <p>{error}</p>
            </div>
          )}

          {extractedText && (
            <div className="reader-result">

              <div className="result-heading">
                <span className="section-label">
                  TEXTO EXTRAÍDO
                </span>

                <h2>
                  Contenido del documento
                </h2>

                <p>
                  Puedes leer el contenido,
                  ampliar el texto o escucharlo
                  en voz alta.
                </p>
              </div>

              {speechError && <p role="alert" className="error-message">{speechError}</p>}
              <div className="speech-toolbar">

                <div className="speech-main-controls">

                  {!isSpeaking && (
                    <button
                      type="button"
                      className="speech-primary-button"
                      onClick={() =>
                        speak(
                          extractedText,
                        )
                      }
                      disabled={
                        !speechSupported
                      }
                    >
                      <Volume2
                        size={20}
                      />

                      Escuchar contenido
                    </button>
                  )}

                  {isSpeaking && (
                    <>
                      <button
                        type="button"
                        className="speech-primary-button"
                        onClick={
                          pauseOrResume
                        }
                      >
                        {isPaused ? (
                          <>
                            <Play
                              size={20}
                            />
                            Continuar
                          </>
                        ) : (
                          <>
                            <Pause
                              size={20}
                            />
                            Pausar
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="speech-stop-button"
                        onClick={stop}
                      >
                        <Square
                          size={18}
                        />

                        Detener
                      </button>
                    </>
                  )}
                </div>

                <label className="speech-rate">
                  <span>
                    Velocidad
                  </span>

                  <select
                    value={rate}
                    onChange={
                      handleRateChange
                    }
                    aria-label="Velocidad de lectura"
                  >
                    <option value="0.75">
                      0.75x
                    </option>

                    <option value="1">
                      1x
                    </option>

                    <option value="1.25">
                      1.25x
                    </option>

                    <option value="1.5">
                      1.5x
                    </option>

                    <option value="2">
                      2x
                    </option>
                  </select>
                </label>
              </div>

              <div
                className="document-text"
                tabIndex="0"
              >
                {extractedText}
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={
                  removeFile
                }
              >
                Seleccionar otro documento
              </button>
            </div>
          )}
        </div>

        <aside className="help-panel">

          <span className="help-number">
            01
          </span>

          <h2>
            ¿Cómo funciona?
          </h2>

          <div className="help-step">
            <span>1</span>

            <div>
              <strong>
                Selecciona
              </strong>

              <p>
                Carga un documento PDF
                desde tu dispositivo.
              </p>
            </div>
          </div>

          <div className="help-step">
            <span>2</span>

            <div>
              <strong>
                Procesa
              </strong>

              <p>
                VisioAccess buscará el
                texto disponible dentro
                del documento.
              </p>
            </div>
          </div>

          <div className="help-step">
            <span>3</span>

            <div>
              <strong>
                Lee o escucha
              </strong>

              <p>
                Consulta el texto de forma
                visual o utiliza la lectura
                por voz.
              </p>
            </div>
          </div>

          <div className="privacy-message">
            <strong>
              Tus documentos permanecen
              privados
            </strong>

            <p>
              El archivo se procesa durante
              esta sesión y no se alma…474 tokens truncated…================
   */

  const stopListening = () => {
    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignorar.
    }

    setIsListening(false);
    setInterimTranscript("");
  };

  /*
   * ========================================
   * EJECUTAR COMANDO
   * ========================================
   */

  const executeVoiceCommand = (
    spokenText,
  ) => {
    const command = normalizeVoiceCommand(spokenText);

    /*
     * NAVEGACIÓN
     */

    if (
      command === "inicio" ||
      command.includes(
        "ir al inicio",
      )
    ) {
      setLastCommand(
        'Comando ejecutado: "Inicio"',
      );

      navigate("/");

      return;
    }

    if (
      command.includes(
        "documento",
      ) ||
      command.includes("pdf")
    ) {
      setLastCommand(
        'Comando ejecutado: "Documentos"',
      );

      navigate("/pdf");

      return;
    }

    if (
      command.includes(
        "imagen",
      )
    ) {
      setLastCommand(
        'Comando ejecutado: "Imágenes"',
      );

      navigate("/imagen");

      return;
    }

    if (
      command.includes(
        "pagina web",
      ) ||
      command.includes(
        "página web",
      ) ||
      command.includes(
        "paginas web",
      ) ||
      command.includes(
        "páginas web",
      )
    ) {
      setLastCommand(
        'Comando ejecutado: "Páginas web"',
      );

      navigate("/web");

      return;
    }

    if (
      command.includes(
        "multimedia",
      ) ||
      command.includes(
        "video",
      )
    ) {
      setLastCommand(
        'Comando ejecutado: "Multimedia"',
      );

      navigate(
        "/multimedia",
      );

      return;
    }

    if (
      command.includes(
        "accesibilidad",
      ) ||
      command.includes(
        "configuracion",
      ) ||
      command.includes(
        "configuración",
      )
    ) {
      setLastCommand(
        'Comando ejecutado: "Accesibilidad"',
      );

      navigate(
        "/accesibilidad",
      );

      return;
    }

    /*
     * APARIENCIA
     */

    if (
      command.includes(
        "modo noche",
      ) ||
      command.includes(
        "tema oscuro",
      ) ||
      command.includes(
        "activar modo noche",
      )
    ) {
      if (
        themeMode !== "dark"
      ) {
        changeThemeMode(
          "dark",
        );
      }

      setLastCommand(
        'Comando ejecutado: "Modo noche"',
      );

      return;
    }

    if (
      command.includes(
        "modo dia",
      ) ||
      command.includes(
        "modo día",
      ) ||
      command.includes(
        "tema claro",
      ) ||
      command.includes(
        "activar modo dia",
      ) ||
      command.includes(
        "activar modo día",
      )
    ) {
      if (
        themeMode !== "light"
      ) {
        changeThemeMode(
          "light",
        );
      }

      setLastCommand(
        'Comando ejecutado: "Modo día"',
      );

      return;
    }

    /*
     * TAMAÑO DEL TEXTO
     */

    if (
      command.includes(
        "aumentar texto",
      ) ||
      command.includes(
        "agrandar texto",
      ) ||
      command.includes(
        "texto mas grande",
      ) ||
      command.includes(
        "texto más grande",
      )
    ) {
      increaseFont();

      setLastCommand(
        'Comando ejecutado: "Aumentar texto"',
      );

      return;
    }

    if (
      command.includes(
        "reducir texto",
      ) ||
      command.includes(
        "disminuir texto",
      ) ||
      command.includes(
        "texto mas pequeño",
      ) ||
      command.includes(
        "texto más pequeño",
      )
    ) {
      decreaseFont();

      setLastCommand(
        'Comando ejecutado: "Reducir texto"',
      );

      return;
    }

    /*
     * CONTRASTE
     */

    if (
      command.includes(
        "desactivar contraste",
      ) ||
      command.includes(
        "quitar contraste",
      ) ||
      command.includes(
        "contraste normal",
      )
    ) {
      if (highContrast) {
        toggleContrast();
      }

      setLastCommand(
        'Comando ejecutado: "Desactivar contraste"',
      );

      return;
    }

    if (
      command.includes(
        "activar contraste",
      ) ||
      command.includes(
        "alto contraste",
      )
    ) {
      if (!highContrast) {
        toggleContrast();
      }

      setLastCommand(
        'Comando ejecutado: "Activar contraste"',
      );

      return;
    }

    /*
     * MODO SIMPLIFICADO
     */

    if (
      command.includes(
        "desactivar modo simplificado",
      ) ||
      command.includes(
        "quitar modo simplificado",
      )
    ) {
      if (simplifiedMode) {
        toggleSimplifiedMode();
      }

      setLastCommand(
        'Comando ejecutado: "Desactivar modo simplificado"',
      );

      return;
    }

    if (
      command.includes(
        "activar modo simplificado",
      ) ||
      command ===
        "modo simplificado"
    ) {
      if (!simplifiedMode) {
        toggleSimplifiedMode();
      }

      setLastCommand(
        'Comando ejecutado: "Activar modo simplificado"',
      );

      return;
    }

    setLastCommand(
      `No se reconoció el comando: "${spokenText.trim()}"`,
    );
  };

  /*
   * ========================================
   * INICIAR RECONOCIMIENTO
   * ========================================
   */

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(
        false,
      );

      setRecognitionError(
        "El reconocimiento de voz no está disponible en este navegador.",
      );

      return;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignorar.
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      "es-PE";

    recognition.continuous =
      false;

    recognition.interimResults =
      true;

    recognition.maxAlternatives =
      1;

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionError("");
      setInterimTranscript("");
      setLastCommand("");
    };

    recognition.onresult = (
      event,
    ) => {
      let finalText = "";
      let temporaryText = "";

      for (
        let index =
          event.resultIndex;
        index <
        event.results.length;
        index += 1
      ) {
        const result =
          event.results[index];

        const recognizedText =
          result[0].transcript;

        if (result.isFinal) {
          finalText +=
            recognizedText;
        } else {
          temporaryText +=
            recognizedText;
        }
      }

      setInterimTranscript(
        temporaryText,
      );

      if (
        finalText.trim()
      ) {
        executeVoiceCommand(
          finalText,
        );
      }
    };

    recognition.onerror = (
      event,
    ) => {
      setIsListening(false);
      setInterimTranscript("");

      if (
        event.error ===
        "not-allowed"
      ) {
        setRecognitionError(
          "Debes permitir el acceso al micrófono para utilizar esta función.",
        );

        return;
      }

      if (
        event.error ===
        "no-speech"
      ) {
        setRecognitionError(
          "No se detectó voz. Intenta decir un comando nuevamente.",
        );

        return;
      }

      if (
        event.error ===
        "aborted"
      ) {
        return;
      }

      setRecognitionError(
        "No fue posible reconocer el comando. Intenta nuevamente.",
      );
    };

    recognition.onend =
      () => {
        setIsListening(false);
        setInterimTranscript(
          "",
        );
      };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      setRecognitionError(
        "No fue posible iniciar el micrófono.",
      );

      setIsListening(false);
    }
  };

  return (
    <section className="voice-page">
      <AccessibilityBar
        increaseFont={
          increaseFont
        }
        decreaseFont={
          decreaseFont
        }
        toggleContrast={
          toggleContrast
        }
        highContrast={
          highContrast
        }
      />

      <header className="voice-page-header">
        <span className="section-label">
          ASISTENTE DE VOZ
        </span>

        <h1>
          Controla VisioAccess con tu voz
        </h1>

        <p>
          Navega por la aplicación y
          modifica opciones de
          accesibilidad mediante comandos
          hablados, reduciendo la necesidad
          de localizar controles
          visualmente.
        </p>
      </header>

      {!recognitionSupported && (
        <div
          className="voice-warning"
          role="alert"
        >
          <MicOff size={22} />

          <div>
            <strong>
              Micrófono no disponible
            </strong>

            <p>
              Este navegador no permite
              utilizar reconocimiento de
              voz. Las demás funciones
              de VisioAccess seguirán
              disponibles.
            </p>
          </div>
        </div>
      )}

      {recognitionError && (
        <div
          className="error-message"
          role="alert"
        >
          <strong>
            No pudimos utilizar el
            micrófono
          </strong>

          <p>
            {recognitionError}
          </p>
        </div>
      )}

      <form className="command-list-card" onSubmit={event => { event.preventDefault(); if (typedCommand.trim()) executeVoiceCommand(typedCommand); }}>
        <label htmlFor="typed-command">También puedes escribir un comando</label>
        <input id="typed-command" value={typedCommand} onChange={event => setTypedCommand(event.target.value)} placeholder="Por ejemplo: Documentos" maxLength={100} />
        <button type="submit" className="secondary-button">Ejecutar comando</button>
      </form>
      <div className="commands-layout">
        <div className="command-list-card">
          <div className="voice-card-heading">
            <div className="voice-feature-icon">
              <Navigation
                size={27}
              />
            </div>

            <div>
              <span className="section-label">
                NAVEGACIÓN POR VOZ
              </span>

              <h2>
                Di un comando
              </h2>

              <p>
                Utiliza instrucciones
                sencillas para navegar o
                modificar la
                visualización de
                VisioAccess.
              </p>
            </div>
          </div>

          <div
            className={`command-microphone ${
              isListening
                ? "listening"
                : ""
            }`}
          >
            <button
              type="button"
              className="microphone-button"
              onClick={
                isListening
                  ? stopListening
                  : startListening
              }
              disabled={
                !recognitionSupported
              }
              aria-label={
                isListening
                  ? "Detener escucha"
                  : "Escuchar comando"
              }
            >
              {isListening ? (
                <Square
                  size={26}
                />
              ) : (
                <Mic
                  size={30}
                />
              )}
            </button>

            <div>
              <strong>
                {isListening
                  ? "Escuchando comando..."
                  : "Pulsa y di un comando"}
              </strong>

              <p>
                Por ejemplo:
                “Documentos”,
                “Aumentar texto” o
                “Modo noche”.
              </p>
            </div>
          </div>

          {interimTranscript && (
            <div className="command-heard">
              Escuchando:{" "}
              <strong>
                {
                  interimTranscript
                }
              </strong>
            </div>
          )}

          {lastCommand && (
            <div
              className="command-result"
              aria-live="polite"
            >
              <CheckCircle2
                size={20}
              />

              {
                lastCommand
              }
            </div>
          )}

          <div className="commands-grid">
            <div className="command-group">
              <h3>
                Navegación
              </h3>

              <span>
                “Inicio”
              </span>

              <span>
                “Documentos”
              </span>

              <span>
                “Imágenes”
              </span>

              <span>
                “Páginas web”
              </span>

              <span>
                “Multimedia”
              </span>

              <span>
                “Accesibilidad”
              </span>
            </div>

            <div className="command-group">
              <h3>
                Visualización
              </h3>

              <span>
                “Aumentar texto”
              </span>

              <span>
                “Reducir texto”
              </span>

              <span>
                “Modo día”
              </span>

              <span>
                “Modo noche”
              </span>

              <span>
                “Activar contraste”
              </span>

              <span>
                “Desactivar contraste”
              </span>
            </div>

            <div className="command-group">
              <h3>
                Interfaz
              </h3>

              <span>
                “Activar modo
                simplificado”
              </span>

              <span>
                “Desactivar modo
                simplificado”
              </span>
            </div>
          </div>
        </div>

        <aside className="command-info-card">
          <Keyboard
            size={27}
          />

          <h2>
            Una alternativa de navegación
          </h2>

          <p>
            Los comandos de voz reducen la
            necesidad de localizar botones
            visualmente. VisioAccess también
            puede utilizarse mediante mouse,
            teclado o pantalla táctil.
          </p>
        </aside>
      </div>
    </section>
  );
}

export default VoiceAssistant;
