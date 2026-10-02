import {
  ArrowRight,
  FileText,
  Globe,
  Image,
  Mic,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import AccessibilityBar
  from "../components/AccessibilityBar";

function Home({
  increaseFont,
  decreaseFont,
  toggleContrast,
  highContrast,
}) {
  return (
    <section className="home">
      <AccessibilityBar
        increaseFont={increaseFont}
        decreaseFont={decreaseFont}
        toggleContrast={toggleContrast}
        highContrast={highContrast}
      />

      <div className="welcome-section">
        <span className="welcome-label">
          HOLA, BIENVENIDO
        </span>

        <h1>
          La información,{" "}
          <span>
            más fácil de leer.
          </span>
        </h1>

        <p>
          Elige qué contenido necesitas
          consultar y VisioAccess lo
          adaptará para facilitar su
          lectura.
        </p>
      </div>

      <div className="home-actions">
        <Link
          to="/pdf"
          className="action-card pdf-card"
        >
          <div className="card-icon">
            <FileText size={32} />
          </div>

          <div className="card-content">
            <span className="card-number">
              01
            </span>

            <h2>
              Documento PDF
            </h2>

            <p>
              Carga un documento y
              convierte su contenido en
              una versión más fácil de
              leer.
            </p>
          </div>

          <div className="card-button">
            <ArrowRight size={22} />
          </div>
        </Link>

        <Link
          to="/imagen"
          className="action-card image-card"
        >
          <div className="card-icon">
            <Image size={32} />
          </div>

          <div className="card-content">
            <span className="card-number">
              02
            </span>

            <h2>
              Imagen o fotografía
            </h2>

            <p>
              Reconoce palabras mediante
              OCR y conviértelas en texto
              accesible.
            </p>
          </div>

          <div className="card-button">
            <ArrowRight size={22} />
          </div>
        </Link>

        <Link
          to="/web"
          className="action-card web-card"
        >
          <div className="card-icon">
            <Globe size={32} />
          </div>

          <div className="card-content">
            <span className="card-number">
              03
            </span>

            <h2>
              Página web
            </h2>

            <p>
              Consulta información
              mediante una vista
              simplificada y accesible.
            </p>
          </div>

          <div className="card-button">
            <ArrowRight size={22} />
          </div>
        </Link>
      </div>

      <div className="voice-banner">
        <div className="voice-icon">
          <Mic size={27} />
        </div>

        <div className="voice-text">
          <strong>
            ¿Necesitas usar tu voz?
          </strong>

          <p>
            Dicta texto o controla
            VisioAccess mediante comandos
            de voz.
          </p>
        </div>

        <Link
          to="/voz"
          className="listen-page-button"
        >
          Abrir asistente
        </Link>
      </div>
    </section>
  );
}

export default Home;