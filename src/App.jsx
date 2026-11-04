import {
  useEffect,
  useState,
  lazy,
  Suspense,
} from "react";

import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import MobileHeader from "./components/MobileHeader";

import Home from "./pages/Home";
const PdfReader = lazy(() => import("./pages/PdfReader"));
const ImageReader = lazy(() => import("./pages/ImageReader"));
const WebReader = lazy(() => import("./pages/WebReader"));
const VoiceAssistant = lazy(() => import("./pages/VoiceAssistant"));
const MediaCaptions = lazy(() => import("./pages/MediaCaptions"));
const AccessibilitySettings = lazy(() => import("./pages/AccessibilitySettings"));

import { loadPreferences } from "./utils/preferences";
import RouteFocus from "./components/RouteFocus";

function App() {
  const [initialPreferences] = useState(loadPreferences);
  const [
    fontScale,
    setFontScale,
  ] = useState(initialPreferences.fontScale);

  const [
    themeMode,
    setThemeMode,
  ] = useState(initialPreferences.themeMode);

  const [
    highContrast,
    setHighContrast,
  ] = useState(initialPreferences.highContrast);

  const [
    simplifiedMode,
    setSimplifiedMode,
  ] = useState(initialPreferences.simplifiedMode);

  const [
    colorVisionMode,
    setColorVisionMode,
  ] = useState(initialPreferences.colorVisionMode);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('visioaccess.preferences', JSON.stringify({ fontScale, themeMode, highContrast, simplifiedMode, colorVisionMode })); } catch { /* Storage may be disabled. */ }
  }, [fontScale, themeMode, highContrast, simplifiedMode, colorVisionMode]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const sidebar = document.getElementById('main-sidebar');
    const previous = document.activeElement;
    const controls = () => [...sidebar.querySelectorAll('button,a[href]')].filter(el => el.getClientRects().length);
    controls()[0]?.focus();
    const trap = event => {
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [mobileMenuOpen]);

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
      <RouteFocus />
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
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

        <main id="main-content" tabIndex={-1} inert={mobileMenuOpen} className="main-content">
          <Suspense fallback={<p role="status">Cargando herramienta...</p>}>
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
            <Route path="*" element={<section><h1>Página no encontrada</h1><a href="/">Volver al inicio</a></section>} />
          </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;