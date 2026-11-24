import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock function-plot to avoid canvas/d3 issues in jsdom
vi.mock('function-plot', () => {
    return {
        default: vi.fn(),
    };
});

describe('Calculator App', () => {
    it('renders calculator', () => {
        render(<App />);
        expect(screen.getByText('Standard')).toBeInTheDocument();
        const display = screen.getByTestId('display');
        expect(display).toHaveTextContent('0');
    });

    it('performs addition', () => {
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: '1' }));
        fireEvent.click(screen.getByRole('button', { name: '+' }));
        fireEvent.click(screen.getByRole('button', { name: '2' }));
        fireEvent.click(screen.getByRole('button', { name: '=' }));

        const display = screen.getByTestId('display');
        expect(display).toHaveTextContent('3');
    });

    it('clears display', () => {
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: '5' }));
        fireEvent.click(screen.getByRole('button', { name: 'C' }));

        const display = screen.getByTestId('display');
        expect(display).toHaveTextContent('0');
    });

    it('cycles through modes: Standard -> Scientific -> Graph -> Standard', () => {
        render(<App />);

        // Initial State: Standard
        const toggle = screen.getByText('Standard');
        expect(toggle).toBeInTheDocument();

        // Click 1: Scientific
        fireEvent.click(toggle);
        expect(screen.getByText('Scientifique')).toBeInTheDocument();
        expect(screen.queryByText('Standard')).not.toBeInTheDocument();

        // Click 2: Graph
        fireEvent.click(screen.getByText('Scientifique'));
        expect(screen.getByText('Graphique')).toBeInTheDocument();

        // Check if GraphView is likely rendered (looking for x button or similar, or we can check logic later)
        // In graph mode, 'sin' button should still be visible as it's part of scientific buttons which are open
        expect(screen.getByRole('button', { name: 'sin' })).toBeVisible();

        // Click 3: Back to Standard
        fireEvent.click(screen.getByText('Graphique'));
        expect(screen.getByText('Standard')).toBeInTheDocument();
    });
});

describe('Moteur, clavier et historique', () => {
    beforeEach(() => localStorage.clear());

    const press = (...labels: string[]) =>
        labels.forEach((l) => fireEvent.click(screen.getByRole('button', { name: l })));
    const typeKeys = (keys: string) =>
        [...keys].forEach((key) => fireEvent.keyDown(window, { key }));

    it('accepte la saisie au clavier physique', () => {
        render(<App />);
        typeKeys('2*(3+4');
        expect(screen.getByTestId('preview')).toHaveTextContent('= 14');
        fireEvent.keyDown(window, { key: 'Enter' });
        expect(screen.getByTestId('display')).toHaveTextContent(/^14$/);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getByTestId('display')).toHaveTextContent(/^0$/);
    });

    it('affiche une erreur lisible au lieu de « Error »', () => {
        render(<App />);
        press('1', '÷', '0', '=');
        expect(screen.getByRole('alert')).toHaveTextContent('Résultat infini');
    });

    it('0.1 + 0.2 donne 0.3', () => {
        render(<App />);
        press('.', '1', '+', '.', '2', '=');
        expect(screen.getByTestId('display')).toHaveTextContent(/^0\.3$/);
    });

    it('calcule le pourcentage comme une calculatrice de poche', () => {
        render(<App />);
        typeKeys('200+10%');
        fireEvent.keyDown(window, { key: 'Enter' });
        expect(screen.getByTestId('display')).toHaveTextContent(/^220$/);
    });

    it('bascule degrés / radians', () => {
        render(<App />);
        fireEvent.click(screen.getByText('Standard'));
        expect(screen.getByTestId('angle-mode')).toHaveTextContent('DEG');

        press('sin', '9', '0');
        expect(screen.getByTestId('preview')).toHaveTextContent('= 1');

        fireEvent.click(screen.getByRole('button', { name: 'DEG' }));
        expect(screen.getByTestId('angle-mode')).toHaveTextContent('RAD');
        expect(screen.getByTestId('preview')).toHaveTextContent('= 0.893996663601');
    });

    it('persiste l\'historique entre deux sessions', () => {
        const { unmount } = render(<App />);
        press('6', '×', '7', '=');
        unmount();

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
        expect(screen.getByText('6×7')).toBeInTheDocument();
        expect(screen.getByText('= 42')).toBeInTheDocument();
    });
});
