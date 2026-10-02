import { useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Globe,
  LoaderCircle,
  Pause,
  Play,
  Square,
  Volume2,
} from "lucide-react";

import AccessibilityBar from "../components/AccessibilityBar";
import useSpeech from "../hooks/useSpeech";

const demoPages = [
  {
    id: "gob",
    name: "Gobierno del Perú",
    url: "https://www.gob.pe",
    title: "Plataforma digital del Estado Peruano",
    text: `La Plataforma Digital Única del Estado Peruano permite a los ciudadanos acceder a información, trámites y servicios públicos desde un mismo espacio digital.

Los usuarios pueden consultar información relacionada con documentos, servicios, orientación ciudadana y diferentes instituciones públicas.

VisioAccess presenta este contenido en una vista simplificada para facilitar la lectura y reducir elementos visuales innecesarios.`,
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    url: "https://es.wikipedia.org/wiki/Accesibilidad_web",
    title: "Accesibilidad web",
    text: `La accesibilidad web busca que las páginas y aplicaciones puedan ser utilizadas por la mayor cantidad posible de personas.

Esto incluye a usuarios con discapacidades visuales, auditivas, motoras o cognitivas, así como a personas mayores.

Entre las medidas de accesibilidad se encuentran el uso de texto legible, buen contraste, navegación mediante teclado y compatibilidad con tecnologías de asistencia.`,
  },
  {
    id: "utp",
    name: "Universidad",
    url: "https://www.utp.edu.pe",
    title: "Información académica",
    text: `Las plataformas universitarias permiten a los estudiantes consultar información relacionada con programas académicos, servicios, actividades y procedimientos.

Una interfaz accesible facilita que los usuarios puedan localizar la información principal sin depender de diseños complejos o elementos visuales pequeños.

VisioAccess puede representar este tipo de información mediante una estructura más clara y sencilla.`,
  },
];

function WebReader({
  increaseFont,
  decreaseFont,
  toggleContrast,
  highContrast,
}) {
  const [url, setUrl] = useState("");
  const [manualText, setManualText] = useState("");

  const [pageTitle, setPageTitle] = useState("");
  const [pageText, setPageText] = useState("");

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);

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

  const normalizeUrl = (value) => {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return "";
    }

    if (
      cleanValue.startsWith("http://") ||
      cleanValue.startsWith("https://")
    ) {
      return cleanValue;
    }

    return `https://${cleanValue}`;
  };

  const cleanText = (text) => {
    return text
      .replace(/\r/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const simulateLoading = () => {
    return new Promise((resolve) => {
      setTimeout(resolve, 900);
    });
  };

  const useDemoPage = async (demo) => {
    stop();

    setError("");
    setProcessing(true);

    setUrl(demo.url);

    await simulateLoading();

    setPageTitle(demo.title);
    setPageText(demo.text);
    setIsDemo(true);

    setProcessing(false);
  };

  const adaptUrl = async () => {
    stop();

    setError("");

    const normalizedUrl = normalizeUrl(url);

    if (!normalizedUrl) {
      setError(
        "Ingresa una dirección web antes de continuar.",
      );

      return;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError(
        "La dirección ingresada no parece ser válida.",
      );

      return;
    }

    setProcessing(true);

    await simulateLoading();

    const matchingDemo = demoPages.find((demo) => {
      const demoHostname = new URL(demo.url).hostname
        .replace("www.", "")
        .toLowerCase();

      const enteredHostname = new URL(normalizedUrl).hostname
        .replace("www.", "")
        .toLowerCase();

      return (
        enteredHostname === demoHostname ||
        enteredHostname.endsWith(`.${demoHostname}`)
      );
    });

    if (matchingDemo) {
      setPageTitle(matchingDemo.title);
      setPageText(matchingDemo.text);
      setIsDemo(true);
      setProcessing(false);

      return;
    }

    setProcessing(false);

    setError(
      "En esta versión del prototipo la aplicación no descarga automáticamente cualquier página externa. Utiliza uno de los ejemplos disponibles o pega el contenido que deseas adaptar.",
    );
  };

  const adaptManualText = async () => {
    stop();

    setError("");

    const text = cleanText(manualText);

    if (!text) {
      setError(
        "Pega algún contenido antes de adaptarlo.",
      );

      return;
    }

    setProcessing(true);

    await simulateLoading();

    setPageTitle("Contenido adaptado");
    setPageText(text);
    setIsDemo(false);

    setProcessing(false);
  };

  const clearReader = () => {
    stop();

    setPageTitle("");
    setPageText("");
    setError("");
    setIsDemo(false);
  };

  const handleRateChange = (event) => {
    setRate(Number(event.target.value));

    if (isSpeaking) {
      stop();
    }
  };

  return (
    <section className="web-page">
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

      <header className="web-header">
        <span className="section-label">
          PÁGINAS WEB
        </span>

        <h1>
          Adaptar una página web
        </h1>

        <p>
          Visualiza el contenido de una página en una
          interfaz más sencilla, legible y preparada para
          herramientas de accesibilidad.
        </p>
      </header>

      {!pageText && (
        <div className="web-layout">
          <div className="web-main-panel">
            <div className="url-reader-card">
              <div className="web-card-heading">
                <div className="web-heading-icon">
                  <Globe size={27} />
                </div>

                <div>
                  <h2>
                    Dirección de la página
                  </h2>

                  <p>
                    Ingresa la URL que deseas consultar.
                  </p>
                </div>
              </div>

              <label
                className="web-input-label"
                htmlFor="website-url"
              >
                Dirección web
              </label>

              <div className="url-input-container">
                <Globe size={20} />

                <input
                  id="website-url"
                  type="url"
                  value={url}
                  onChange={(event) =>
                    setUrl(event.target.value)
                  }
                  placeholder="https://www.ejemplo.com"
                  disabled={processing}
                />
              </div>

              <div className="web-actions">
                <button
                  type="button"
                  className="read-web-button"
                  onClick={adaptUrl}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <LoaderCircle
                        size={20}
                        className="loading-icon"
                      />

                      Adaptando...
                    </>
                  ) : (
                    <>
                      <Globe size={20} />

                      Adaptar página
                    </>
                  )}
                </button>

                {url && (
                  <a
                    href={normalizeUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="open-site-button"
                  >
                    <ExternalLink size={18} />

                    Abrir página original
                  </a>
                )}
              </div>
            </div>

            <div className="demo-pages">
              <span className="manual-label">
                EJEMPLOS DEL PROTOTIPO
              </span>

              <h2>
                Prueba una página
              </h2>

              <p>
                Estos ejemplos permiten demostrar el flujo
                completo de adaptación.
              </p>

              <div className="demo-page-grid">
                {demoPages.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    className="demo-page-button"
                    onClick={() =>
                      useDemoPage(demo)
                    }
                    disabled={processing}
                  >
                    <Globe size={20} />

                    <span>
                      <strong>
                        {demo.name}
                      </strong>

                      <small>
                        {demo.url}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="manual-reader-card">
              <span className="manual-label">
                TEXTO MANUAL
              </span>

              <h2>
                Pegar contenido
              </h2>

              <p>
                También puedes copiar texto de cualquier
                página y convertirlo directamente en una
                vista accesible.
              </p>

              <textarea
                value={manualText}
                onChange={(event) =>
                  setManualText(event.target.value)
                }
                placeholder="Pega aquí el contenido que deseas leer..."
                rows={8}
              />

              <button
                type="button"
                className="adapt-text-button"
                onClick={adaptManualText}
                disabled={processing}
              >
                Adaptar contenido
              </button>
            </div>

            {error && (
              <div
                className="error-message"
                role="alert"
              >
                <strong>
                  No se pudo continuar
                </strong>

                <p>
                  {error}
                </p>
              </div>
            )}
          </div>

          <aside className="web-help-panel">
            <span className="help-number">
              03
            </span>

            <h2>
              Lectura simplificada
            </h2>

            <div className="web-help-item">
              <span>1</span>

              <div>
                <strong>
                  Selecciona
                </strong>

                <p>
                  Utiliza una página de ejemplo o pega
                  contenido.
                </p>
              </div>
            </div>

            <div className="web-help-item">
              <span>2</span>

              <div>
                <strong>
                  Adaptamos
                </strong>

                <p>
                  VisioAccess presenta la información
                  de manera más clara.
                </p>
              </div>
            </div>

            <div className="web-help-item">
              <span>3</span>

              <div>
                <strong>
                  Lee o escucha
                </strong>

                <p>
                  Amplía, cambia el contraste o reproduce
                  el contenido mediante voz.
                </p>
              </div>
            </div>

            <div className="web-cors-note">
              <strong>
                Versión de prototipo
              </strong>

              <p>
                La recuperación automática de cualquier
                página externa se implementaría en una
                versión posterior.
              </p>
            </div>
          </aside>
        </div>
      )}

      {pageText && (
        <div className="web-reader-result">
          {isDemo && (
            <div className="prototype-notice">
              Demostración del flujo de adaptación
            </div>
          )}

          <div className="web-result-top">
            <div>
              <span className="section-label">
                VISTA ACCESIBLE
              </span>

              <h2>
                {pageTitle}
              </h2>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={clearReader}
            >
              Consultar otro contenido
            </button>
          </div>

          <div className="speech-toolbar">
            <div className="speech-main-controls">
              {!isSpeaking && (
                <button
                  type="button"
                  className="speech-primary-button"
                  onClick={() =>
                    speak(pageText)
                  }
                  disabled={!speechSupported}
                >
                  <Volume2 size={20} />

                  Escuchar contenido
                </button>
              )}

              {isSpeaking && (
                <>
                  <button
                    type="button"
                    className="speech-primary-button"
                    onClick={pauseOrResume}
                  >
                    {isPaused ? (
                      <>
                        <Play size={20} />
                        Continuar
                      </>
                    ) : (
                      <>
                        <Pause size={20} />
                        Pausar
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="speech-stop-button"
                    onClick={stop}
                  >
                    <Square size={18} />
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
                onChange={handleRateChange}
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
            className="web-readable-content"
            tabIndex="0"
            aria-label="Contenido de lectura accesible"
          >
            <div className="reader-status">
              <CheckCircle2 size={21} />
              Contenido adaptado
            </div>

            <div className="web-readable-text">
              {pageText}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default WebReader;