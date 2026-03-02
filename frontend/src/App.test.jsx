import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';

// Um componente defeituoso para disparar o fallback
const BuggyComponent = () => {
    throw new Error('Erro Simulado de Teste!');
};

describe('ErrorBoundary', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        // Esconde o trace gigantesco do console do React para nao poluir o log do teste
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div data-testid="safe-child">Tudo certo</div>
            </ErrorBoundary>
        );

        expect(screen.getByTestId('safe-child')).toBeInTheDocument();
        expect(screen.getByText('Tudo certo')).toBeInTheDocument();
    });

    it('renders fallback UI when an error is thrown', () => {
        render(
            <ErrorBoundary>
                <BuggyComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Ops! Algo deu errado.')).toBeInTheDocument();
        expect(screen.getByText('A aplicação encontrou um erro inesperado.')).toBeInTheDocument();
        // O stack trace no ErrorBoundary chama console.error
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
