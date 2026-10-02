import {
  useEffect,
  useState,
} from "react";

import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import MobileHeader from "./components/MobileHeader";

import Home from "./pages/Home";
import PdfReader from "./pages/PdfReader";
import ImageReader from "./pages/ImageReader";
import WebReader from "./pages/WebReader";
import VoiceAssistant from "./pages/VoiceAssistant";
import MediaCaptions from "./pages/MediaCaptions";
import AccessibilitySettings from "./pages/AccessibilitySettings";

function App() {
  const [
    fontScale,
    setFontScale,
  ] = useState(1);

  const [
    themeMode,
    setThemeMode,
  ] = useState("light");

  const [
    highContrast,
    setHighContrast,
  ] = useState(false);

  const [
    simplifiedMode,
    setSimplifiedMode,
  ] = useState(false);

  const [
    colorVisionMode,
    setColorVisionMode,
  ] = useState("standard");

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  /*
   * ========================================
   * TAMAÑO GLOBAL DEL TEXTO
   * ========================================
   */

  useEffect(() => {
    document.documentElement.style.fontSize =
      `${16 * fontScale}px`;

    return () => {
      document.documentElement.style.fontSize =
        "16px";
    };
  }, [fontScale]);

  /*
   * ========================================
   * ESC CIERRA MENÚ MÓVIL
   * ========================================
   */

  useEffect(() => {
    const handleEscape = (
      event,
    ) => {
      if (
        event.key === "Escape"
      ) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  /*
   * ========================================
   * BLOQUEAR SCROLL EN MENÚ MÓVIL
   * ========================================
   */

  useEffect(() => {
    document.body.style.overflow =
      mobileMenuOpen
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [mobileMenuOpen]);

  /*
   * ========================================
   * CERRAR MENÚ AL VOLVER A ESCRITORIO
   * ========================================
   */

  useEffect(() => {
    const handleResize = () => {
      if (
        window.innerWidth > 768
      ) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, []);

  /*
   * ========================================
   * ACCESIBILIDAD
   * ========================================
   */

  const increaseFont = () => {
    setFontScale(
      (current) =>
        Math.min(
          Number(
            (
              current + 0.1
            ).toFixed(1),
          ),
          1.4,
        ),
    );
  };

  const decreaseFont = () => {
    setFontScale(
      (current) =>
        Math.max(
          Number(
            (
              current - 0.1
            ).toFixed(1),
          ),
          0.9,
        ),
    );
  };

  const changeThemeMode = (
    mode,
  ) => {
    setThemeMode(mode);
  };

  const toggleContrast = () => {
    setHighContrast(
      (current) =>
        !current,
    );
  };

  const toggleSimplifiedMode =
    () => {
      setSimplifiedMode(
        (current) =>
          !current,
      );
    };

  const changeColorVisionMode = (
    mode,
  ) => {
    setColorVisionMode(mode);
  };

  const resetAccessibility =
    () => {
      setFontScale(1);

      setThemeMode("light");

      setHighContrast(false);

      setSimplifiedMode(false);

      setColorVisionMode(
        "standard",
      );
    };

  const accessibilityProps = {
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
  };

  return (
    <BrowserRouter>
      <div
        className={[
          "app",

          themeMode === "dark"
            ? "theme-dark"
            : "theme-light",

          highContrast
            ? "high-contrast"
            : "",

          simplifiedMode
            ? "simplified-mode"
            : "",

          `color-${colorVisionMode}`,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <MobileHeader
          mobileMenuOpen={
            mobileMenuOpen
          }
          setMobileMenuOpen={
            setMobileMenuOpen
          }
        />

        <Sidebar
          mobileMenuOpen={
            mobileMenuOpen
          }
          setMobileMenuOpen={
            setMobileMenuOpen
          }
        />

        {mobileMenuOpen && (
          <div
            className="mobile-menu-overlay"
            onClick={() =>
              setMobileMenuOpen(
                false,
              )
            }
            aria-hidden="true"
          />
        )}

        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  {...accessibilityProps}
                />
              }
            />

            <Route
              path="/pdf"
              element={
                <PdfReader
                  {...accessibilityProps}
                />
              }
            />

            <Route
              path="/imagen"
              element={
                <ImageReader
                  {...accessibilityProps}
                />
              }
            />

            <Route
              path="/web"
              element={
                <WebReader
                  {...accessibilityProps}
                />
              }
            />

            <Route
              path="/voz"
              element={
                <VoiceAssistant
                  {...accessibilityProps}
                />
              }
            />

            <Route
              path="/multimedia"
              element={
                <MediaCaptions
                  {...accessibilityProps}
                />
              }
            />

            <Route
              path="/accesibilidad"
              element={
                <AccessibilitySettings
                  {...accessibilityProps}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;