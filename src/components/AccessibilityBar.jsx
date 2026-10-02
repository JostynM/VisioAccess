function AccessibilityBar({
  increaseFont,
  decreaseFont,
  toggleContrast,
  highContrast,
}) {
  return (
    <div
      className="accessibility-bar"
      aria-label="Controles rápidos de accesibilidad"
    >
      <span>
        Visualización
      </span>

      <button
        type="button"
        onClick={
          decreaseFont
        }
        aria-label="Reducir tamaño del texto"
      >
        A-
      </button>

      <button
        type="button"
        onClick={
          increaseFont
        }
        aria-label="Aumentar tamaño del texto"
      >
        A+
      </button>

      <button
        type="button"
        className="contrast-button"
        onClick={
          toggleContrast
        }
        aria-pressed={
          highContrast
        }
      >
        ◐{" "}
        {highContrast
          ? "Contraste normal"
          : "Alto contraste"}
      </button>
    </div>
  );
}

export default AccessibilityBar;