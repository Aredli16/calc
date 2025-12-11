import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect } from 'vitest';

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

    it('toggles scientific mode', () => {
        render(<App />);
        const toggle = screen.getByText('Standard');
        fireEvent.click(toggle);
        expect(screen.getByText('Scientifique')).toBeInTheDocument();
    });
});
