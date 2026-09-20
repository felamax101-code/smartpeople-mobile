import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for ErrorBoundary');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeTruthy();
  });

  it('catches errors and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Restart Editor')).toBeTruthy();
    expect(screen.getByText('Report Error')).toBeTruthy();
  });

  it('displays custom fallback when provided', () => {
    const CustomFallback = <div>Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeFalsy();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('restarts when restart button is pressed', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // Initially should show normal content
    expect(screen.queryByText('Something went wrong')).toBeFalsy();

    // Trigger error
    rerender(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Press restart button
    const restartButton = screen.getByText('Restart Editor');
    fireEvent.press(restartButton);

    // Error state should be cleared
    expect(screen.queryByText('Something went wrong')).toBeFalsy();
  });

  it('reports error when report button is pressed', () => {
    const consoleLogSpy = jest.spyOn(console, 'log');

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const reportButton = screen.getByText('Report Error');
    fireEvent.press(reportButton);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Error Report:',
      expect.objectContaining({
        message: 'Test error for ErrorBoundary',
        stack: expect.any(String),
        timestamp: expect.any(String)
      })
    );

    consoleLogSpy.mockRestore();
  });

  it('shows error details in development mode', () => {
    const originalDev = __DEV__;
    (global as any).__DEV__ = true;

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development Only):')).toBeTruthy();
    expect(screen.getByText('Test error for ErrorBoundary')).toBeTruthy();

    (global as any).__DEV__ = originalDev;
  });

  it('hides error details in production mode', () => {
    const originalDev = __DEV__;
    (global as any).__DEV__ = false;

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development Only):')).toBeFalsy();
    expect(screen.queryByText('Test error for ErrorBoundary')).toBeFalsy();

    (global as any).__DEV__ = originalDev;
  });
});

describe('withErrorBoundary HOC', () => {
  it('wraps component with ErrorBoundary', () => {
    const { withErrorBoundary } = require('../ErrorBoundary');
    const TestComponent = () => <div>Wrapped Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Wrapped Component')).toBeTruthy();
  });

  it('passes error boundary props to ErrorBoundary', () => {
    const { withErrorBoundary } = require('../ErrorBoundary');
    const TestComponent = () => <div>Wrapped Component</div>;
    const CustomFallback = <div>Custom Fallback</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, {
      fallback: CustomFallback
    });

    render(<WrappedComponent />);

    expect(screen.getByText('Wrapped Component')).toBeTruthy();
  });
});

describe('useErrorBoundary hook', () => {
  it('provides triggerError function', () => {
    const { useErrorBoundary } = require('../ErrorBoundary');
    
    // Mock component that uses the hook
    const TestComponent = () => {
      const { triggerError } = useErrorBoundary();
      
      return (
        <button
          testID="trigger-error-button"
          onPress={() => triggerError(new Error('Hook test error'))}
        >
          Trigger Error
        </button>
      );
    };

    render(<TestComponent />);

    const triggerButton = screen.getByTestId('trigger-error-button');
    expect(triggerButton).toBeTruthy();
  });
});
