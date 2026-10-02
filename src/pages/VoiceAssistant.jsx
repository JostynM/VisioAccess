import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  Keyboard,
  Mic,
  MicOff,
  Navigation,
  RotateCcw,
  Square,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import AccessibilityBar from "../components/AccessibilityBar";

function VoiceAssistant({
  increaseFont,
  decreaseFont,
  toggleContrast,
  highContrast,
  simplifiedMode,
  toggleSimplifiedMode,
}) {
  const navigate = useNavigate();

  const recognitionRef =
    useRef(null);

  const [
    recognitionSupported,
    setRecognitionSupported,
  ] = useState(true);

  const [
    isListening,
    setIsListening,
  ] = useState(false);

  const [
    transcript,
    setTranscript,
  ] = useState("");

  const [
    interimTranscript,
    setInterimTranscript,
  ] = useState("");

  const [
    lastCommand,
    setLastCommand,
  ] = useState("");

  const [
    recognitionError,
    setRecognitionError,
  ] = useState("");

  const [
    mode,
    setMode,
  ] = useState("dictation");

  /*
   * ========================================
   * COMPROBAR SOPORTE DEL NAVEGADOR
   * ========================================
   */

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    setRecognitionSupported(
      Boolean(SpeechRecognition),
    );

    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // Evitamos errores al desmontar.
      }

      recognitionRef.current =
        null;
    };
  }, []);

  /*
   * ========================================
   * DETENER RECONOCIMIENTO
   * ========================================
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
    const command = spokenText
      .toLowerCase()
      .trim()
      .replace(
        /[.,;:!?¿¡]/g,
        "",
      );

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
        "modo normal",
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

    /*
     * Una frase por activación.
     * Es más estable para el prototipo.
     */

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

      if (
        mode === "commands"
      ) {
        setLastCommand("");
      }
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
        !finalText.trim()
      ) {
        return;
      }

      if (
        mode === "commands"
      ) {
        executeVoiceCommand(
          finalText,
        );

        return;
      }

      setTranscript(
        (current) => {
          const separator =
            current.trim()
              ? " "
              : "";

          return `${current}${separator}${finalText.trim()}`;
        },
      );
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
          "No se detectó voz. Intenta hablar nuevamente.",
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
        "No fue posible reconocer la voz. Intenta nuevamente.",
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

  /*
   * ========================================
   * CAMBIAR ENTRE MODOS
   * ========================================
   */

  const changeMode = (
    newMode,
  ) => {
    stopListening();

    setMode(newMode);

    setRecognitionError("");

    setInterimTranscript("");

    setLastCommand("");
  };

  /*
   * ========================================
   * LIMPIAR DICTADO
   * ========================================
   */

  const clearTranscript = () => {
    stopListening();

    setTranscript("");
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
          Usa VisioAccess con tu voz
        </h1>

        <p>
          Habla para convertir tu voz
          en texto o utiliza comandos
          sencillos para navegar por la
          aplicación sin depender del
          mouse.
        </p>
      </header>

      <div className="voice-mode-tabs">
        <button
          type="button"
          className={
            mode === "dictation"
              ? "active"
              : ""
          }
          onClick={() =>
            changeMode(
              "dictation",
            )
          }
        >
          <Mic size={19} />

          Voz a texto
        </button>

        <button
          type="button"
          className={
            mode === "commands"
              ? "active"
              : ""
          }
          onClick={() =>
            changeMode(
              "commands",
            )
          }
        >
          <Navigation
            size={19}
          />

          Comandos de voz
        </button>
      </div>

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

      {mode ===
        "dictation" && (
        <div className="voice-layout">
          <div className="voice-main-card">
            <div className="voice-card-heading">
              <div className="voice-feature-icon">
                <Mic size={27} />
              </div>

              <div>
                <span className="section-label">
                  VOZ A TEXTO
                </span>

                <h2>
                  Habla en lugar de
                  escribir
                </h2>

                <p>
                  Útil para usuarios que
                  presentan dificultades
                  para utilizar un teclado.
                </p>
              </div>
            </div>

            <div
              className={`microphone-area ${
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
                    ? "Detener micrófono"
                    : "Activar micrófono"
                }
              >
                {isListening ? (
                  <Square
                    size={29}
                  />
                ) : (
                  <Mic
                    size={35}
                  />
                )}
              </button>

              <strong>
                {isListening
                  ? "Te estamos escuchando"
                  : "Pulsa para hablar"}
              </strong>

              <p>
                {isListening
                  ? "Habla con claridad. VisioAccess mostrará tus palabras en pantalla."
                  : "Al utilizarlo por primera vez, el navegador solicitará permiso para acceder al micrófono."}
              </p>

              {interimTranscript && (
                <div
                  className="interim-text"
                  aria-live="polite"
                >
                  {
                    interimTranscript
                  }
                </div>
              )}
            </div>

            <div className="voice-transcript-header">
              <div>
                <label
                  htmlFor="voice-transcript"
                >
                  Texto reconocido
                </label>

                <span>
                  Puedes editar el
                  resultado manualmente.
                </span>
              </div>

              <span>
                {
                  transcript.length
                }{" "}
                caracteres
              </span>
            </div>

            <textarea
              id="voice-transcript"
              value={transcript}
              onChange={(event) =>
                setTranscript(
                  event.target.value,
                )
              }
              placeholder="Lo que digas aparecerá aquí..."
              rows={10}
            />

            <button
              type="button"
              className="clear-voice-button"
              onClick={
                clearTranscript
              }
              disabled={
                !transcript
              }
            >
              <RotateCcw
                size={18}
              />

              Limpiar texto
            </button>
          </div>

          <aside className="voice-help-card">
            <span className="help-number">
              04
            </span>

            <h2>
              ¿Cómo funciona?
            </h2>

            <div className="voice-help-step">
              <span>
                1
              </span>

              <div>
                <strong>
                  Activa el micrófono
                </strong>

                <p>
                  Pulsa el botón central
                  y concede el permiso.
                </p>
              </div>
            </div>

            <div className="voice-help-step">
              <span>
                2
              </span>

              <div>
                <strong>
                  Habla normalmente
                </strong>

                <p>
                  VisioAccess reconocerá
                  lo que digas.
                </p>
              </div>
            </div>

            <div className="voice-help-step">
              <span>
                3
              </span>

              <div>
                <strong>
                  Revisa el texto
                </strong>

                <p>
                  Puedes corregirlo o
                  continuar dictando.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {mode ===
        "commands" && (
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
                  Controla VisioAccess
                  hablando
                </h2>

                <p>
                  Utiliza comandos
                  sencillos para
                  navegar o modificar
                  opciones de
                  accesibilidad.
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
                  “Documentos” o
                  “Aumentar texto”.
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
              No reemplaza otros
              controles
            </h2>

            <p>
              La navegación por voz es
              una opción adicional.
              VisioAccess también puede
              utilizarse mediante mouse,
              teclado o pantalla táctil.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

export default VoiceAssistant;