import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Test Content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders fallback UI when error occurs', () => {
        const ThrowError = () => {
            throw new Error('Test error');
        };

        // Suppress console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Noe gikk galt')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /last inn på nytt/i })).toBeInTheDocument();

        consoleSpy.mockRestore();
    });
});
