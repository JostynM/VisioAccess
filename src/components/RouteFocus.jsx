import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
export default function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    document.title = `VisioAccess · ${{ '/':'Inicio', '/pdf':'Documentos', '/imagen':'Imágenes', '/web':'Páginas web', '/voz':'Asistente de voz', '/multimedia':'Multimedia', '/accesibilidad':'Accesibilidad' }[pathname] || 'Página no encontrada'}`;
  }, [pathname]);
  return null;
}
