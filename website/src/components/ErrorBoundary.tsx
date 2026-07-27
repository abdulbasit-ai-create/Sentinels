'use client'

import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-0 flex items-center justify-center p-8">
          <div className="terminal-card max-w-md w-full">
            <div className="terminal-header">
              <span className="terminal-dot bg-threat-danger/70" />
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Something went wrong
              </span>
            </div>
            <div className="p-5 text-center">
              <p className="text-sm text-neutral-400 font-mono mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
                className="btn-accent text-xs"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
