import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  LoaderCircle,
  Pause,
  Play,
  ScanText,
  Square,
  Upload,
  Volume2,
  X,
} from "lucide-react";

import {
  createWorker,
  PSM,
} from "tesseract.js";

import AccessibilityBar from "../components/AccessibilityBar";
import useSpeech from "../hooks/useSpeech";

import {
  preprocessImage,
} from "../utils/preprocessImage";

function ImageReader({
  increaseFont,
  decreaseFont,
  toggleContrast,
  highContrast,
}) {
  const inputRef =
    useRef(null);

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    extractedText,
    setExtractedText,
  ] = useState("");

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    processingStage,
    setProcessingStage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

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

  /*
   * Liberar la URL temporal
   * cuando cambie la imagen
   * o se cierre el componente.
   */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }
    };
  }, [previewUrl]);

  /*
   * Validar imagen.
   */

  const validateImage = (file) => {
    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setError(
        "Selecciona una imagen JPG, PNG o WEBP.",
      );

      return;
    }

    /*
     * Máximo 15 MB.
     */

    const maxSize =
      15 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      setError(
        "La imagen es demasiado grande. Utiliza una imagen de máximo 15 MB.",
      );

      return;
    }

    stop();

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    const newPreviewUrl =
      URL.createObjectURL(
        file,
      );

    setSelectedImage(file);

    setPreviewUrl(
      newPreviewUrl,
    );

    setExtractedText("");

    setProgress(0);

    setProcessingStage("");

    setError("");
  };

  /*
   * Seleccionar desde PC.
   */

  const handleFileChange = (
    event,
  ) => {
    const file =
      event.target.files?.[0];

    validateImage(file);
  };

  /*
   * Arrastrar imagen.
   */

  const handleDrop = (
    event,
  ) => {
    event.preventDefault();

    const file =
      event.dataTransfer
        .files?.[0];

    validateImage(file);
  };

  const handleDragOver = (
    event,
  ) => {
    event.preventDefault();
  };

  /*
   * Quitar imagen.
   */

  const removeImage = () => {
    stop();

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    setSelectedImage(null);

    setPreviewUrl("");

    setExtractedText("");

    setProgress(0);

    setProcessingStage("");

    setError("");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  /*
   * Tamaño visible.
   */

  const formatFileSize = (
    bytes,
  ) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  /*
   * Limpieza ligera.
   *
   * No inventamos palabras ni
   * corregimos automáticamente
   * el contenido reconocido.
   */

  const cleanOcrText = (
    text,
  ) => {
    return text
      .replace(/\r/g, "")
      .replace(
        /[ \t]{2,}/g,
        " ",
      )
      .replace(
        /\n{3,}/g,
        "\n\n",
      )
      .split("\n")
      .map((line) =>
        line.trim(),
      )
      .filter(
        (line) =>
          line.length > 0,
      )
      .join("\n")
      .trim();
  };

  /*
   * Dar una puntuación aproximada
   * a cada resultado.
   */

  const calculateTextScore = (
    text,
    confidence,
  ) => {
    if (!text) {
      return 0;
    }

    const usefulCharacters =
      text.match(
        /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/g,
      )?.length ?? 0;

    const unusualCharacters =
      text.match(
        /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,;:¿?¡!()/%&@#'"-]/g,
      )?.length ?? 0;

    return (
      usefulCharacters * 2 +
      confidence * 2 -
      unusualCharacters * 3
    );
  };

  /*
   * Procesamiento OCR.
   */

  const processImage =
    async () => {
      if (!selectedImage) {
        return;
      }

      let worker = null;

      /*
       * El logger necesita saber
       * qué pasada se está ejecutando.
       */

      let currentPass = 0;

      try {
        stop();

        setProcessing(true);

        setProgress(0);

        setError("");

        setExtractedText("");

        /*
         * PASO 1
         * Optimizar imagen.
         */

        setProcessingStage(
          "Preparando imagen...",
        );

        const {
          enhancedBlob,
          binaryBlob,
        } =
          await preprocessImage(
            selectedImage,
          );

        setProgress(10);

        /*
         * PASO 2
         * Cargar motor OCR.
         *
         * Español + inglés.
         */

        setProcessingStage(
          "Preparando reconocimiento...",
        );

        worker =
          await createWorker(
            [
              "spa",
              "eng",
            ],
            undefined,
            {
              logger:
                (message) => {
                  if (
                    message.status !==
                    "recognizing text"
                  ) {
                    return;
                  }

                  /*
                   * Primera pasada:
                   * 15% - 55%
                   *
                   * Segunda pasada:
                   * 55% - 95%
                   */

                  if (
                    currentPass === 1
                  ) {
                    setProgress(
                      15 +
                        Math.round(
                          message.progress *
                            40,
                        ),
                    );
                  }

                  if (
                    currentPass === 2
                  ) {
                    setProgress(
                      55 +
                        Math.round(
                          message.progress *
                            40,
                        ),
                    );
                  }
                },
            },
          );

        /*
         * SPARSE_TEXT funciona bien
         * cuando hay texto repartido
         * en distintas posiciones.
         */

        await worker.setParameters({
          tessedit_pageseg_mode:
            PSM.SPARSE_TEXT,

          preserve_interword_spaces:
            "1",

          user_defined_dpi:
            "300",
        });

        /*
         * PASADA 1
         * Imagen en grises y contraste.
         */

        currentPass = 1;

        setProcessingStage(
          "Reconociendo texto...",
        );

        const enhancedResult =
          await worker.recognize(
            enhancedBlob,
          );

        /*
         * PASADA 2
         * Blanco y negro.
         */

        currentPass = 2;

        setProcessingStage(
          "Mejorando resultado...",
        );

        const binaryResult =
          await worker.recognize(
            binaryBlob,
          );

        /*
         * Limpiar resultados.
         */

        const enhancedText =
          cleanOcrText(
            enhancedResult.data.text,
          );

        const binaryText =
          cleanOcrText(
            binaryResult.data.text,
          );

        /*
         * Comparar calidad.
         */

        const enhancedScore =
          calculateTextScore(
            enhancedText,
            enhancedResult.data
              .confidence,
          );

        const binaryScore =
          calculateTextScore(
            binaryText,
            binaryResult.data
              .confidence,
          );

        const bestText =
          binaryScore >
          enhancedScore
            ? binaryText
            : enhancedText;

        setProgress(100);

        setProcessingStage(
          "Proceso completado",
        );

        if (
          !bestText ||
          bestText.length < 2
        ) {
          setError(
            "No se encontró texto suficientemente legible. Prueba con una imagen más clara, cercana o enfocada.",
          );

          return;
        }

        setExtractedText(
          bestText,
        );
      } catch (ocrError) {
        console.error(
          "Error OCR:",
          ocrError,
        );

        setError(
          "No fue posible reconocer el texto de la imagen. Intenta nuevamente.",
        );
      } finally {
        if (worker) {
          await worker.terminate();
        }

        setProcessing(false);
      }
    };

  /*
   * Velocidad de lectura.
   */

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
    <section className="ocr-page">
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

      <Link
        to="/"
        className="back-link"
        onClick={stop}
      >
        <ArrowLeft
          size={19}
        />

        Volver al inicio
      </Link>

      <header className="ocr-header">
        <span className="section-label">
          RECONOCIMIENTO DE TEXTO
        </span>

        <h1>
          Leer una imagen
        </h1>

        <p>
          Selecciona una fotografía o
          imagen. VisioAccess mejorará
          automáticamente la imagen y
          reconocerá las palabras para
          convertirlas en texto accesible.
        </p>
      </header>

      <div className="ocr-layout">
        <div className="ocr-main-panel">

          {!selectedImage && (
            <div
              className="ocr-drop-zone"
              onDrop={
                handleDrop
              }
              onDragOver={
                handleDragOver
              }
            >
              <div className="ocr-upload-icon">
                <ImageIcon
                  size={36}
                />
              </div>

              <h2>
                Arrastra una imagen aquí
              </h2>

              <p>
                Puedes utilizar una
                fotografía, captura o
                documento que contenga
                texto.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  handleFileChange
                }
                className="file-input"
              />

              <button
                type="button"
                className="select-image-button"
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                <Upload
                  size={20}
                />

                Seleccionar imagen
              </button>

              <small>
                JPG, PNG o WEBP
              </small>
            </div>
          )}

          {selectedImage && (
            <div className="selected-image">

              <div className="selected-image-header">

                <div className="selected-image-icon">
                  <ImageIcon
                    size={28}
                  />
                </div>

                <div className="selected-image-data">
                  <strong>
                    {
                      selectedImage.name
                    }
                  </strong>

                  <span>
                    {formatFileSize(
                      selectedImage.size,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className="remove-image-button"
                  onClick={
                    removeImage
                  }
                  disabled={
                    processing
                  }
                  aria-label="Quitar imagen"
                >
                  <X
                    size={21}
                  />
                </button>

              </div>

              <div className="image-preview">
                <img
                  src={
                    previewUrl
                  }
                  alt="Vista previa de la imagen seleccionada"
                />
              </div>

              {!processing &&
                !extractedText && (
                  <button
                    type="button"
                    className="process-image-button"
                    onClick={
                      processImage
                    }
                  >
                    <ScanText
                      size={21}
                    />

                    Reconocer texto
                  </button>
                )}

              {processing && (
                <div
                  className="ocr-processing"
                  aria-live="polite"
                >
                  <div className="ocr-processing-info">

                    <LoaderCircle
                      size={29}
                      className="loading-icon"
                    />

                    <div>
                      <strong>
                        {
                          processingStage
                        }
                      </strong>

                      <p>
                        VisioAccess está
                        optimizando y
                        analizando la imagen.
                      </p>
                    </div>

                    <span>
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
                      Texto reconocido
                    </strong>

                    <p>
                      La imagen fue
                      procesada y optimizada
                      correctamente.
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
                No pudimos reconocer
                correctamente el contenido
              </strong>

              <p>
                {error}
              </p>
            </div>
          )}

          {extractedText && (
            <div className="reader-result">

              <div className="result-heading">

                <span className="section-label">
                  TEXTO RECONOCIDO
                </span>

                <h2>
                  Contenido de la imagen
                </h2>

                <p>
                  Puedes leer el texto,
                  ampliarlo o escucharlo
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
                        onClick={
                          stop
                        }
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
                aria-label="Texto reconocido de la imagen"
              >
                {
                  extractedText
                }
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={
                  removeImage
                }
              >
                Seleccionar otra imagen
              </button>

            </div>
          )}

        </div>

        <aside className="ocr-help-panel">

          <span className="help-number">
            02
          </span>

          <h2>
            Para obtener un mejor
            resultado
          </h2>

          <div className="ocr-tip">

            <span>1</span>

            <div>
              <strong>
                Buena iluminación
              </strong>

              <p>
                Evita fotografías
                demasiado oscuras.
              </p>
            </div>

          </div>

          <div className="ocr-tip">

            <span>2</span>

            <div>
              <strong>
                Imagen enfocada
              </strong>

              <p>
                Las letras deben verse
                lo más nítidas posible.
              </p>
            </div>

          </div>

          <div className="ocr-tip">

            <span>3</span>

            <div>
              <strong>
                Acércate al texto
              </strong>

              <p>
                Cuanto más espacio ocupe
                el texto dentro de la
                imagen, mayor será la
                precisión.
              </p>
            </div>

          </div>

          <div className="ocr-note">

            <strong>
              El resultado puede variar
            </strong>

            <p>
              Fotografías con tipografías
              decorativas, fondos complejos
              o texto muy pequeño pueden
              producir errores de
              reconocimiento.
            </p>

          </div>

        </aside>

      </div>
    </section>
  );
}

export default ImageReader;