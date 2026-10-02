import { useRef, useState } from "react";
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

      const loadingTask =
        pdfjsLib.getDocument({
          data:
            new Uint8Array(
              arrayBuffer,
            ),
        });

      const pdf =
        await loadingTask.promise;

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

        const pageText =
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
        "No fue posible procesar el documento. Intenta utilizar otro archivo PDF.",
      );
    } finally {
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
                Formato admitido: PDF
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
                        Extrayendo el texto
                        del PDF...
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
              esta sesión y no se almacena.
            </p>
          </div>

        </aside>
      </div>
    </section>
  );
}

export default PdfReader;