import {
  Check,
  Contrast,
  Eye,
  Moon,
  RotateCcw,
  Sun,
  Type,
} from "lucide-react";

import AccessibilityBar from "../components/AccessibilityBar";

function AccessibilitySettings({
  fontScale,

  increaseFont,
  decreaseFont,

  themeMode,
  changeThemeMode,

  highContrast,
  toggleContrast,

  simplifiedMode,
  toggleSimplifiedMode,

  colorVisionMode,
  changeColorVisionMode,

  resetAccessibility,
}) {
  const activeSettings =
    (fontScale !== 1
      ? 1
      : 0) +
    (themeMode !== "light"
      ? 1
      : 0) +
    (highContrast
      ? 1
      : 0) +
    (simplifiedMode
      ? 1
      : 0) +
    (
      colorVisionMode !==
      "standard"
        ? 1
        : 0
    );

  const colorModes = [
    {
      id: "standard",

      name: "Estándar",

      description:
        "Paleta original de VisioAccess.",
    },

    {
      id: "protanopia",

      name: "Protanopia",

      description:
        "Adaptación para dificultad en la percepción de tonos rojos.",
    },

    {
      id: "deuteranopia",

      name: "Deuteranopia",

      description:
        "Adaptación para dificultad en la percepción de tonos verdes.",
    },

    {
      id: "tritanopia",

      name: "Tritanopia",

      description:
        "Adaptación para dificultad en la percepción de tonos azules.",
    },
  ];

  return (
    <section className="settings-page">
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

      <header className="settings-header">
        <span className="section-label">
          ACCESIBILIDAD
        </span>

        <h1>
          Configuración de accesibilidad
        </h1>

        <p>
          Personaliza VisioAccess según tus
          necesidades visuales y de navegación.
        </p>
      </header>

      <div className="settings-status">
        <div>
          <strong>
            Preferencias activas
          </strong>

          <span>
            {activeSettings === 0
              ? "Configuración estándar"
              : `${activeSettings} ajuste${
                  activeSettings !== 1
                    ? "s"
                    : ""
                } personalizado${
                  activeSettings !== 1
                    ? "s"
                    : ""
                }`}
          </span>
        </div>

        <button
          type="button"
          className="reset-settings-button"
          onClick={
            resetAccessibility
          }
        >
          <RotateCcw
            size={18}
          />

          Restablecer
        </button>
      </div>

      <div className="settings-grid">

        {/* ===============================
            APARIENCIA
        =============================== */}

        <article className="settings-card appearance-card">
          <div className="settings-card-heading">
            <h2>
              Apariencia
            </h2>

            <p>
              Selecciona una apariencia clara
              para el día o una interfaz oscura
              para entornos con poca iluminación.
            </p>
          </div>

          <div
            className="theme-options"
            role="radiogroup"
            aria-label="Seleccionar apariencia"
          >
            <button
              type="button"
              className={`theme-option ${
                themeMode ===
                "light"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                changeThemeMode(
                  "light",
                )
              }
              role="radio"
              aria-checked={
                themeMode ===
                "light"
              }
            >
              <div className="theme-option-icon light-icon">
                <Sun
                  size={25}
                />
              </div>

              <div>
                <strong>
                  Modo día
                </strong>

                <span>
                  Fondo claro y apariencia
                  estándar.
                </span>
              </div>

              {themeMode ===
                "light" && (
                <div className="theme-check">
                  <Check
                    size={17}
                  />
                </div>
              )}
            </button>

            <button
              type="button"
              className={`theme-option ${
                themeMode ===
                "dark"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                changeThemeMode(
                  "dark",
                )
              }
              role="radio"
              aria-checked={
                themeMode ===
                "dark"
              }
            >
              <div className="theme-option-icon dark-icon">
                <Moon
                  size={25}
                />
              </div>

              <div>
                <strong>
                  Modo noche
                </strong>

                <span>
                  Fondo oscuro para reducir
                  el brillo de la interfaz.
                </span>
              </div>

              {themeMode ===
                "dark" && (
                <div className="theme-check">
                  <Check
                    size={17}
                  />
                </div>
              )}
            </button>
          </div>
        </article>

        {/* ===============================
            TAMAÑO DE TEXTO
        =============================== */}

        <article className="settings-card">
          <div className="settings-card-icon">
            <Type
              size={25}
            />
          </div>

          <div className="settings-card-heading">
            <h2>
              Tamaño del texto
            </h2>

            <p>
              Aumenta o reduce el tamaño
              general del contenido.
            </p>
          </div>

          <div className="font-size-control">
            <button
              type="button"
              onClick={
                decreaseFont
              }
              disabled={
                fontScale <=
                0.9
              }
              aria-label="Reducir tamaño del texto"
            >
              A-
            </button>

            <div className="font-size-value">
              <strong>
                {Math.round(
                  fontScale *
                    100,
                )}
                %
              </strong>

              <span>
                Tamaño actual
              </span>
            </div>

            <button
              type="button"
              onClick={
                increaseFont
              }
              disabled={
                fontScale >=
                1.4
              }
              aria-label="Aumentar tamaño del texto"
            >
              A+
            </button>
          </div>
        </article>

        {/* ===============================
            ALTO CONTRASTE
        =============================== */}

        <article className="settings-card">
          <div className="settings-card-icon">
            <Contrast
              size={25}
            />
          </div>

          <div className="settings-card-heading">
            <h2>
              Alto contraste
            </h2>

            <p>
              Aumenta la diferencia entre texto,
              fondos y controles para mejorar
              su identificación.
            </p>
          </div>

          <div className="settings-switch-row">
            <div>
              <strong>
                Alto contraste
              </strong>

              <span>
                {highContrast
                  ? "Activado"
                  : "Desactivado"}
              </span>
            </div>

            <button
              type="button"
              className={`settings-switch ${
                highContrast
                  ? "enabled"
                  : ""
              }`}
              onClick={
                toggleContrast
              }
              role="switch"
              aria-checked={
                highContrast
              }
              aria-label="Activar o desactivar alto contraste"
            >
              <span />
            </button>
          </div>
        </article>

        {/* ===============================
            MODO SIMPLIFICADO
        =============================== */}

        <article className="settings-card">
          <div className="settings-card-icon">
            <Eye
              size={25}
            />
          </div>

          <div className="settings-card-heading">
            <h2>
              Modo simplificado
            </h2>

            <p>
              Reduce elementos secundarios
              y prioriza las acciones
              principales.
            </p>
          </div>

          <div className="settings-switch-row">
            <div>
              <strong>
                Navegación simplificada
              </strong>

              <span>
                {simplifiedMode
                  ? "Activada"
                  : "Desactivada"}
              </span>
            </div>

            <button
              type="button"
              className={`settings-switch ${
                simplifiedMode
                  ? "enabled"
                  : ""
              }`}
              onClick={
                toggleSimplifiedMode
              }
              role="switch"
              aria-checked={
                simplifiedMode
              }
              aria-label="Activar o desactivar modo simplificado"
            >
              <span />
            </button>
          </div>
        </article>

        {/* ===============================
            PERCEPCIÓN DEL COLOR
        =============================== */}

        <article className="settings-card color-vision-card">
          <div className="settings-card-icon">
            <Eye
              size={25}
            />
          </div>

          <div className="settings-card-heading">
            <h2>
              Percepción del color
            </h2>

            <p>
              Ajusta la paleta para diferentes
              tipos de daltonismo. VisioAccess
              evita depender solamente del color
              para comunicar información.
            </p>
          </div>

          <div
            className="color-mode-options"
            role="radiogroup"
            aria-label="Modo de percepción del color"
          >
            {colorModes.map(
              (mode) => {
                const selected =
                  colorVisionMode ===
                  mode.id;

                return (
                  <button
                    key={
                      mode.id
                    }
                    type="button"
                    className={`color-mode-option ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      changeColorVisionMode(
                        mode.id,
                      )
                    }
                    role="radio"
                    aria-checked={
                      selected
                    }
                  >
                    <div className="color-mode-top">
                      <div
                        className={`color-preview color-preview-${mode.id}`}
                        aria-hidden="true"
                      >
                        <span />
                        <span />
                        <span />
                      </div>

                      {selected && (
                        <div className="color-selected-icon">
                          <Check
                            size={16}
                          />
                        </div>
                      )}
                    </div>

                    <strong>
                      {mode.name}
                    </strong>

                    <p>
                      {
                        mode.description
                      }
                    </p>

                    {selected && (
                      <span className="selected-label">
                        Seleccionado
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>

          <div className="color-accessibility-note">
            <strong>
              Información accesible
            </strong>

            <p>
              Los estados se acompañan de texto,
              iconos, bordes y otros indicadores
              para evitar depender exclusivamente
              del color.
            </p>
          </div>
        </article>

        {/* ===============================
            TECLADO
        =============================== */}

        <article className="settings-card keyboard-card">
          <div className="settings-card-heading">
            <h2>
              Navegación mediante teclado
            </h2>

            <p>
              VisioAccess puede recorrerse
              utilizando controles básicos
              del teclado.
            </p>
          </div>

          <div className="keyboard-shortcuts">
            <div>
              <kbd>
                Tab
              </kbd>

              <span>
                Avanzar entre controles
              </span>
            </div>

            <div>
              <kbd>
                Shift
              </kbd>

              <span>
                +
              </span>

              <kbd>
                Tab
              </kbd>

              <span>
                Retroceder
              </span>
            </div>

            <div>
              <kbd>
                Enter
              </kbd>

              <span>
                Activar el elemento
                seleccionado
              </span>
            </div>

            <div>
              <kbd>
                Esc
              </kbd>

              <span>
                Cerrar el menú móvil
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default AccessibilitySettings;