import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main role="alert"><h1>No se pudo cargar esta pantalla</h1><p>Recarga la aplicación para intentarlo nuevamente.</p><button onClick={() => window.location.reload()}>Recargar VisioAccess</button></main>;
    return this.props.children;
  }
}
