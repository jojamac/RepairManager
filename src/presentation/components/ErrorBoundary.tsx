import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '2rem',
            margin: '2rem auto',
            maxWidth: '600px',
            borderRadius: 'var(--border-radius-lg, 12px)',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            boxShadow: 'var(--shadow-md)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: 'var(--color-danger, #ef4444)', marginBottom: '1rem' }}>⚠️ Ocurrió un error inesperado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {this.state.error?.message || 'Se produjo un error al renderizar este componente.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
