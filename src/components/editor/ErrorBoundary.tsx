import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

// Optional Sentry integration
let Sentry: any = null;
try {
  Sentry = require('@sentry/react-native');
} catch (e) {
  // Sentry not available, will handle gracefully
  console.warn('Sentry not available, error reporting will be limited');
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Send error to Sentry if available
    try {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          errorBoundary: true
          }
        });
    } catch (sentryError) {
      console.warn('Failed to send error to Sentry:', sentryError);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRestart = () => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Attempt to reload the app
    try {
      // For React Native, we can use Updates.reloadAsync() if available
      // or simply clear the error state and let the user retry
      if (typeof require !== 'undefined') {
        const { Updates } = require('expo-updates');
        if (Updates && Updates.reloadAsync) {
          Updates.reloadAsync();
          return;
        }
      }
    } catch (e) {
      // Fallback: just clear the error state
      console.warn('Could not reload app, clearing error state instead');
    }
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;
    
    if (error && errorInfo) {
      // Create error report
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: 'React Native App'
      };

      // Log error report

      // Try to send to Sentry again
      try {
        Sentry.captureException(error, {
          extra: {
            componentStack: errorInfo.componentStack,
            errorReport
          }
        });
      } catch (e) {
        console.warn('Failed to send error report to Sentry:', e);
      }

      // In a real app, you might want to send this to your own error tracking service
      // or show a "Report sent" message
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              The video editor encountered an unexpected error. You can try restarting the app or report this issue.
            </Text>
            
            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Development Only):</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorText}>
                    Component Stack:{'\n'}{this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={this.handleRestart}
              >
                <Text style={styles.buttonText}>Restart Editor</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={this.handleReportError}
              >
                <Text style={styles.buttonText}>Report Error</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for triggering errors in development
export const useErrorBoundary = () => {
  const triggerError = (error: Error) => {
    if (__DEV__) {
      throw error;
    } else {
      console.error('Error triggered:', error);
    }
  };

  return { triggerError };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorDetails: {
    maxHeight: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#4a4a4a',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ErrorBoundary;
