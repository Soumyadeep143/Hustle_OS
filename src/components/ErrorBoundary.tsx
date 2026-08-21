import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('HustleOS UI crashed:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Card className="mx-auto mt-12 max-w-xl border-l-4" style={{ borderLeftColor: 'var(--color-red)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 flex-shrink-0 text-[var(--color-red)]" size={24} />
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">Something went wrong</h2>
              <p className="text-sm text-[var(--color-ink-2)]">{this.state.error.message}</p>
              <Button variant="secondary" size="sm" onClick={this.handleReset}>
                Try again
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
