import {
  Menu,
  X,
} from "lucide-react";

function MobileHeader({
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const toggleMenu = () => {
    setMobileMenuOpen(
      (current) => !current,
    );
  };

  return (
    <header className="mobile-header">
      <div className="mobile-logo">
        <div className="logo-symbol">
          V
        </div>

        <div className="mobile-logo-text">
          <strong>
            VisioAccess
          </strong>

          <small>
            Lectura accesible
          </small>
        </div>
      </div>

      <button
        type="button"
        className="mobile-menu-button"
        onClick={toggleMenu}
        aria-label={
          mobileMenuOpen
            ? "Cerrar menú"
            : "Abrir menú"
        }
        aria-expanded={
          mobileMenuOpen
        }
        aria-controls="main-sidebar"
      >
        {mobileMenuOpen ? (
          <X size={27} />
        ) : (
          <Menu size={27} />
        )}
      </button>
    </header>
  );
}

export default MobileHeader;