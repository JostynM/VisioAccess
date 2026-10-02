import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  Play,
  RotateCcw,
  Upload,
  Video,
  X,
} from "lucide-react";

import AccessibilityBar from "../components/AccessibilityBar";

const exampleTranscript = `Bienvenido a VisioAccess.

Esta aplicación busca facilitar el acceso a la información digital.

VisioAccess ofrece herramientas como alto contraste, tamaño de texto configurable y navegación simplificada.

También permite trabajar con documentos, imágenes, páginas web y herramientas de asistencia por voz.

Los subtítulos ayudan a que las personas con dificultades auditivas puedan comprender mejor el contenido multimedia.`;

function MediaCaptions({
  increaseFont,
  decreaseFont,
  toggleContrast,
  highContrast,
}) {
  const inputRef =
    useRef(null);

  const videoRef =
    useRef(null);

  const [
    videoFile,
    setVideoFile,
  ] = useState(null);

  const [
    videoUrl,
    setVideoUrl,
  ] = useState("");

  const [
    transcript,
    setTranscript,
  ] = useState("");

  const [
    subtitleItems,
    setSubtitleItems,
  ] = useState([]);

  const [
    currentSubtitle,
    setCurrentSubtitle,
  ] = useState("");

  const [
    videoDuration,
    setVideoDuration,
  ] = useState(0);

  const [
    subtitlesVisible,
    setSubtitlesVisible,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /*
   * ========================================
   * LIBERAR URL DEL VIDEO
   * ========================================
   */

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(
          videoUrl,
        );
      }
    };
  }, [videoUrl]);

  /*
   * ========================================
   * SELECCIONAR VIDEO
   * ========================================
   */

  const selectVideo = (
    file,
  ) => {
    if (!file) {
      return;
    }

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setError(
        "Selecciona un archivo MP4, WEBM u OGG.",
      );

      return;
    }

    const maxSize =
      100 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      setError(
        "Para el prototipo utiliza un video de máximo 100 MB.",
      );

      return;
    }

    if (videoUrl) {
      URL.revokeObjectURL(
        videoUrl,
      );
    }

    const newUrl =
      URL.createObjectURL(
        file,
      );

    setVideoFile(file);

    setVideoUrl(newUrl);

    setVideoDuration(0);

    setSubtitleItems([]);

    setCurrentSubtitle("");

    setError("");

    setSuccess("");
  };

  const handleFileChange = (
    event,
  ) => {
    selectVideo(
      event.target.files?.[0],
    );
  };

  /*
   * ========================================
   * QUITAR VIDEO
   * ========================================
   */

  const removeVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }

    if (videoUrl) {
      URL.revokeObjectURL(
        videoUrl,
      );
    }

    setVideoFile(null);

    setVideoUrl("");

    setVideoDuration(0);

    setSubtitleItems([]);

    setCurrentSubtitle("");

    setTranscript("");

    setError("");

    setSuccess("");

    if (
      inputRef.current
    ) {
      inputRef.current.value =
        "";
    }
  };

  /*
   * ========================================
   * TAMAÑO DEL ARCHIVO
   * ========================================
   */

  const formatFileSize = (
    bytes,
  ) => {
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
   * ========================================
   * DIVIDIR TEXTO
   * ========================================
   */

  const createTextBlocks = (
    text,
  ) => {
    const cleanText =
      text
        .replace(
          /\r/g,
          "",
        )
        .trim();

    if (!cleanText) {
      return [];
    }

    /*
     * Primero utilizamos párrafos.
     */

    let blocks =
      cleanText
        .split(
          /\n+/,
        )
        .map(
          (item) =>
            item.trim(),
        )
        .filter(Boolean);

    /*
     * Si solamente hay un párrafo,
     * intentamos dividir por frases.
     */

    if (
      blocks.length ===
      1
    ) {
      blocks =
        cleanText
          .split(
            /(?<=[.!?])\s+/,
          )
          .map(
            (item) =>
              item.trim(),
          )
          .filter(Boolean);
    }

    /*
     * Si una frase es demasiado larga,
     * la dividimos aproximadamente.
     */

    const finalBlocks =
      [];

    blocks.forEach(
      (block) => {
        if (
          block.length <=
          120
        ) {
          finalBlocks.push(
            block,
          );

          return;
        }

        const words =
          block.split(" ");

        let current = "";

        words.forEach(
          (word) => {
            const candidate =
              current
                ? `${current} ${word}`
                : word;

            if (
              candidate.length >
              100
            ) {
              if (current) {
                finalBlocks.push(
                  current,
                );
              }

              current =
                word;
            } else {
              current =
                candidate;
            }
          },
        );

        if (current) {
          finalBlocks.push(
            current,
          );
        }
      },
    );

    return finalBlocks;
  };

  /*
   * ========================================
   * GENERAR SUBTÍTULOS
   * ========================================
   */

  const generateSubtitles =
    () => {
      setError("");

      setSuccess("");

      if (!videoFile) {
        setError(
          "Selecciona primero un video.",
        );

        return;
      }

      if (
        !transcript.trim()
      ) {
        setError(
          "Escribe o pega una transcripción.",
        );

        return;
      }

      if (
        !videoDuration ||
        !Number.isFinite(
          videoDuration,
        )
      ) {
        setError(
          "Espera unos segundos a que el video termine de cargar.",
        );

        return;
      }

      const blocks =
        createTextBlocks(
          transcript,
        );

      if (
        blocks.length === 0
      ) {
        setError(
          "No se encontró texto suficiente para generar subtítulos.",
        );

        return;
      }

      const timePerBlock =
        videoDuration /
        blocks.length;

      const generated =
        blocks.map(
          (
            text,
            index,
          ) => ({
            id:
              index + 1,

            start:
              index *
              timePerBlock,

            end:
              (index + 1) *
              timePerBlock,

            text,
          }),
        );

      setSubtitleItems(
        generated,
      );

      setCurrentSubtitle(
        "",
      );

      setSubtitlesVisible(
        true,
      );

      setSuccess(
        `Se generaron ${generated.length} segmentos de subtítulos.`,
      );
    };

  /*
   * ========================================
   * ACTUALIZAR SUBTÍTULO
   * ========================================
   */

  const updateSubtitle =
    () => {
      const video =
        videoRef.current;

      if (
        !video ||
        !subtitlesVisible
      ) {
        setCurrentSubtitle(
          "",
        );

        return;
      }

      const currentTime =
        video.currentTime;

      const active =
        subtitleItems.find(
          (item) =>
            currentTime >=
              item.start &&
            currentTime <
              item.end,
        );

      setCurrentSubtitle(
        active?.text || "",
      );
    };

  /*
   * ========================================
   * FORMATEAR TIEMPO
   * ========================================
   */

  const formatTime = (
    seconds,
  ) => {
    const total =
      Math.max(
        0,
        Math.floor(
          seconds,
        ),
      );

    const minutes =
      Math.floor(
        total / 60,
      );

    const remaining =
      total % 60;

    return `${minutes}:${String(
      remaining,
    ).padStart(
      2,
      "0",
    )}`;
  };

  /*
   * ========================================
   * LIMPIAR SUBTÍTULOS
   * ========================================
   */

  const clearSubtitles =
    () => {
      setSubtitleItems([]);

      setCurrentSubtitle("");

      setSuccess("");
    };

  return (
    <section className="media-page">
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

      <header className="media-header">
        <span className="section-label">
          MULTIMEDIA ACCESIBLE
        </span>

        <h1>
          Subtítulos para videos
        </h1>

        <p>
          Añade subtítulos a un video
          para facilitar el acceso al
          contenido hablado.
        </p>
      </header>

      <div className="media-layout">
        <div className="media-main">

          {!videoFile && (
            <div className="video-upload-card">
              <div className="video-upload-icon">
                <Video
                  size={38}
                />
              </div>

              <h2>
                Carga un video
              </h2>

              <p>
                Selecciona un video
                corto para probar la
                función de subtítulos
                accesibles.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                className="file-input"
                onChange={
                  handleFileChange
                }
              />

              <button
                type="button"
                className="select-video-button"
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                <Upload
                  size={20}
                />

                Seleccionar video
              </button>

              <small>
                MP4, WEBM u OGG
              </small>
            </div>
          )}

          {videoFile && (
            <>
              <div className="selected-video-card">

                <div className="selected-video-header">
                  <div className="selected-video-icon">
                    <Video
                      size={27}
                    />
                  </div>

                  <div className="selected-video-data">
                    <strong>
                      {
                        videoFile.name
                      }
                    </strong>

                    <span>
                      {formatFileSize(
                        videoFile.size,
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="remove-video-button"
                    onClick={
                      removeVideo
                    }
                    aria-label="Quitar video"
                  >
                    <X
                      size={20}
                    />
                  </button>
                </div>

                <div className="accessible-video">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    onLoadedMetadata={(
                      event,
                    ) => {
                      setVideoDuration(
                        event.currentTarget
                          .duration,
                      );
                    }}
                    onTimeUpdate={
                      updateSubtitle
                    }
                    onSeeked={
                      updateSubtitle
                    }
                    onEnded={() =>
                      setCurrentSubtitle(
                        "",
                      )
                    }
                  />

                  {subtitlesVisible &&
                    currentSubtitle && (
                      <div
                        className="video-caption-overlay"
                        aria-live="polite"
                      >
                        {
                          currentSubtitle
                        }
                      </div>
                    )}
                </div>

                <div className="subtitle-toggle-row">
                  <div>
                    <strong>
                      Subtítulos
                    </strong>

                    <span>
                      Mostrar texto
                      sincronizado
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`subtitle-switch ${
                      subtitlesVisible
                        ? "enabled"
                        : ""
                    }`}
                    onClick={() =>
                      setSubtitlesVisible(
                        (current) =>
                          !current,
                      )
                    }
                    role="switch"
                    aria-checked={
                      subtitlesVisible
                    }
                    aria-label="Mostrar u ocultar subtítulos"
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className="caption-generator-card">
                <span className="section-label">
                  TRANSCRIPCIÓN
                </span>

                <h2>
                  Texto del video
                </h2>

                <p>
                  Para este prototipo,
                  introduce el texto que
                  se escucha en el video.
                  VisioAccess lo dividirá
                  y sincronizará
                  automáticamente.
                </p>

                <textarea
                  value={
                    transcript
                  }
                  onChange={(
                    event,
                  ) =>
                    setTranscript(
                      event.target
                        .value,
                    )
                  }
                  rows={8}
                  placeholder="Escribe o pega aquí lo que se escucha en el video..."
                />

                <div className="caption-generator-actions">
                  <button
                    type="button"
                    className="example-transcript-button"
                    onClick={() =>
                      setTranscript(
                        exampleTranscript,
                      )
                    }
                  >
                    <Play
                      size={18}
                    />

                    Usar ejemplo
                  </button>

                  <button
                    type="button"
                    className="generate-subtitles-button"
                    onClick={
                      generateSubtitles
                    }
                  >
                    Generar subtítulos
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="error-message"
                  role="alert"
                >
                  <strong>
                    No fue posible
                    continuar
                  </strong>

                  <p>
                    {error}
                  </p>
                </div>
              )}

              {success && (
                <div
                  className="success-message"
                  aria-live="polite"
                >
                  <CheckCircle2
                    size={22}
                  />

                  <div>
                    <strong>
                      Subtítulos generados
                    </strong>

                    <p>
                      {success}
                    </p>
                  </div>
                </div>
              )}

              {subtitleItems.length >
                0 && (
                <div className="subtitle-list-card">

                  <div className="subtitle-list-header">
                    <div>
                      <span className="section-label">
                        SECUENCIA
                      </span>

                      <h2>
                        Subtítulos generados
                      </h2>
                    </div>

                    <button
                      type="button"
                      className="clear-subtitles-button"
                      onClick={
                        clearSubtitles
                      }
                    >
                      <RotateCcw
                        size={17}
                      />

                      Limpiar
                    </button>
                  </div>

                  <div className="subtitle-list">
                    {subtitleItems.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="subtitle-item"
                        >
                          <span>
                            {formatTime(
                              item.start,
                            )}
                            {" – "}
                            {formatTime(
                              item.end,
                            )}
                          </span>

                          <p>
                            {
                              item.text
                            }
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="media-help-panel">
          <span className="help-number">
            05
          </span>

          <h2>
            ¿Cómo funciona?
          </h2>

          <div className="media-help-step">
            <span>
              1
            </span>

            <div>
              <strong>
                Selecciona un video
              </strong>

              <p>
                Carga un archivo
                multimedia desde tu
                dispositivo.
              </p>
            </div>
          </div>

          <div className="media-help-step">
            <span>
              2
            </span>

            <div>
              <strong>
                Añade la transcripción
              </strong>

              <p>
                Escribe el contenido
                hablado del video.
              </p>
            </div>
          </div>

          <div className="media-help-step">
            <span>
              3
            </span>

            <div>
              <strong>
                Genera subtítulos
              </strong>

              <p>
                El texto aparecerá
                mientras se reproduce
                el video.
              </p>
            </div>
          </div>

          <div className="media-prototype-note">
            <strong>
              Prototipo
            </strong>

            <p>
              En una versión posterior,
              la transcripción podría
              generarse automáticamente
              mediante reconocimiento
              del audio.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default MediaCaptions;