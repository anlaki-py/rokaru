import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RootErrorBoundary } from '../src/components/ui/ErrorBoundaries';

const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('RootErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <RootErrorBoundary>
        <div>Safe Content</div>
      </RootErrorBoundary>
    );
    
    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('should render error UI when a child throws', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <RootErrorBoundary>
        <ThrowError message="Test Error" />
      </RootErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Test Error/)).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('should reload the page when reload button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Workaround for JSDom window.location.reload
    const { location } = window;
    // @ts-ignore
    delete window.location;
    window.location = { ...location, reload: vi.fn() };
    
    render(
      <RootErrorBoundary>
        <ThrowError message="Test Error" />
      </RootErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Reload Application'));
    
    expect(window.location.reload).toHaveBeenCalled();
    
    // Restore window.location
    window.location = location;
    consoleSpy.mockRestore();
  });
});
