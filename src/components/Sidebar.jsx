import {
  FileText,
  Globe,
  House,
  Image,
  Mic,
  MonitorPlay,
  Settings,
  X,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

function Sidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const getMenuClass = ({
    isActive,
  }) =>
    `menu-item ${
      isActive
        ? "active"
        : ""
    }`;

  const closeMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <aside
      id="main-sidebar"
      className={`sidebar ${
        mobileMenuOpen
          ? "mobile-open"
          : ""
      }`}
      aria-label="Menú principal"
    >
      <div className="sidebar-top">
        <div className="logo">
          <div className="logo-symbol">
            V
          </div>

          <div>
            <span className="logo-name">
              VisioAccess
            </span>

            <span className="logo-description">
              Lectura accesible
            </span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-mobile-close"
          onClick={closeMenu}
          aria-label="Cerrar menú"
        >
          <X size={23} />
        </button>
      </div>

      <nav
        className="sidebar-menu"
        aria-label="Navegación principal"
      >
        <NavLink
          to="/"
          end
          className={getMenuClass}
          onClick={closeMenu}
        >
          <House size={21} />
          <span>Inicio</span>
        </NavLink>

        <NavLink
          to="/pdf"
          className={getMenuClass}
          onClick={closeMenu}
        >
          <FileText size={21} />
          <span>Documentos</span>
        </NavLink>

        <NavLink
          to="/imagen"
          className={getMenuClass}
          onClick={closeMenu}
        >
          <Image size={21} />
          <span>Imágenes</span>
        </NavLink>

        <NavLink
          to="/web"
          className={getMenuClass}
          onClick={closeMenu}
        >
          <Globe size={21} />
          <span>Páginas web</span>
        </NavLink>

        <NavLink
          to="/voz"
          className={getMenuClass}
          onClick={closeMenu}
        >
          <Mic size={21} />
          <span>Asistente de voz</span>
        </NavLink>

        <NavLink
          to="/multimedia"
          className={getMenuClass}
          onClick={closeMenu}
        >
          <MonitorPlay size={21} />
          <span>Multimedia</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/accesibilidad"
          className={getMenuClass}
          onClick={closeMenu}
        >
          <Settings size={21} />
          <span>Accesibilidad</span>
        </NavLink>

        <div className="sidebar-brand-footer">
          <p>
            VisioAccess
          </p>

          <small>
            Información sin barreras
          </small>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;