import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi } from 'vitest';

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
