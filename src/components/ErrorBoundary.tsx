import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render-time errors in the routed pages so a single page crash shows a
 * readable message instead of blanking the whole admin app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Admin UI error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
          <div className="max-w-md">
            <h1 className="text-lg font-semibold text-foreground">Something went wrong · 出错了</h1>
            <p className="mt-2 break-words text-sm text-muted-foreground">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Reload · 重新加载
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
