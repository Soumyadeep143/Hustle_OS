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
        <Card variant="dark" className="border-l-4 border-l-red-500 max-w-xl mx-auto mt-12">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-400 mt-1 flex-shrink-0" size={24} />
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
              <p className="text-sm text-zinc-400">{this.state.error.message}</p>
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
