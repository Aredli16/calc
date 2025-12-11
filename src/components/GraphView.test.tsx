import { render } from '@testing-library/react';
import GraphView from './GraphView';
import { describe, it, expect, vi } from 'vitest';
import functionPlot from 'function-plot';

// Mock function-plot
vi.mock('function-plot', () => {
    return {
        default: vi.fn(),
    };
});

describe('GraphView Component', () => {
    it('renders without crashing', () => {
        render(<GraphView expression="x^2" />);
    });

    it('calls functionPlot with correct arguments', () => {
        const expression = "sin(x)";
        render(<GraphView expression={expression} />);

        expect(functionPlot).toHaveBeenCalledWith(expect.objectContaining({
            target: expect.anything(),
            data: expect.arrayContaining([
                expect.objectContaining({
                    fn: expression
                })
            ])
        }));
    });

    it('defaults to x if expression is empty or 0', () => {
        render(<GraphView expression="0" />);
        expect(functionPlot).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.arrayContaining([
                expect.objectContaining({
                    fn: "x"
                })
            ])
        }));
    });
});
