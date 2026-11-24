import { render, screen } from '@testing-library/react';
import GraphView from './GraphView';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import functionPlot from 'function-plot';

// Mock function-plot
vi.mock('function-plot', () => {
    return {
        default: vi.fn(),
    };
});

type PlotFn = (scope: { x: number }) => number;

/** Récupère la fonction passée à function-plot lors du dernier appel. */
const lastPlottedFn = (): PlotFn => {
    const calls = vi.mocked(functionPlot).mock.calls;
    const options = calls[calls.length - 1][0] as { data: { fn: PlotFn }[] };
    return options.data[0].fn;
};

describe('GraphView Component', () => {
    beforeEach(() => vi.mocked(functionPlot).mockClear());

    it('renders without crashing', () => {
        render(<GraphView expression="x^2" />);
    });

    it('plots the expression with the calculator engine', () => {
        render(<GraphView expression="2x^2+1" />);

        expect(functionPlot).toHaveBeenCalledWith(expect.objectContaining({
            target: expect.anything(),
            data: [expect.objectContaining({ graphType: 'polyline', sampler: 'builtIn' })],
        }));
        expect(lastPlottedFn()({ x: 3 })).toBe(19);
    });

    it('defaults to x if expression is empty or 0', () => {
        render(<GraphView expression="0" />);
        expect(lastPlottedFn()({ x: 4 })).toBe(4);
    });

    it('follows the angle mode', () => {
        render(<GraphView expression="sin(x)" angleMode="deg" />);
        expect(lastPlottedFn()({ x: 90 })).toBe(1);
    });

    it('shows an error and keeps the previous curve for an incomplete expression', () => {
        const { rerender } = render(<GraphView expression="x" />);
        expect(functionPlot).toHaveBeenCalledTimes(1);

        rerender(<GraphView expression="x+" />);
        expect(screen.getByRole('status')).toHaveTextContent('Expression incomplète');
        expect(functionPlot).toHaveBeenCalledTimes(1);
    });
});
