import React, { useEffect, useMemo, useRef } from 'react';
import functionPlot from 'function-plot';
import { compile, MathError, type AngleMode } from '../lib/mathEngine';

interface GraphViewProps {
    expression: string;
    angleMode?: AngleMode;
}

type Compiled = { ok: true; fn: (x: number) => number } | { ok: false; error: string };

/**
 * Trace l'expression saisie avec le moteur de la calculatrice : la courbe
 * suit donc exactement la même grammaire (2x, x², sin(x)^2, log = log10…)
 * et le même mode d'angle que le calcul.
 */
const GraphView: React.FC<GraphViewProps> = ({ expression, angleMode = 'rad' }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const source = expression && expression !== '0' ? expression : 'x';

    const compiled = useMemo<Compiled>(() => {
        try {
            return { ok: true, fn: compile(source, angleMode) };
        } catch (e) {
            return { ok: false, error: e instanceof MathError ? e.message : 'Expression invalide' };
        }
    }, [source, angleMode]);

    useEffect(() => {
        // Expression en cours de saisie (ex. « x+ ») : on garde la dernière courbe valide.
        if (!rootRef.current || !compiled.ok) return;
        const { fn } = compiled;

        try {
            functionPlot({
                target: rootRef.current,
                width: rootRef.current.clientWidth,
                height: 300,
                yAxis: { domain: [-5, 5] },
                grid: true,
                data: [{
                    // Le sampler « builtIn » appelle fn avec { x } (scope typé de façon générique).
                    fn: (scope: Record<string, unknown>) => fn(scope.x as number),
                    graphType: 'polyline',
                    sampler: 'builtIn',
                    color: '#8b5cf6',
                }],
            });
        } catch (e) {
            console.warn('Impossible de tracer la fonction', e);
        }
    }, [compiled]);

    return (
        <div className="graph-container">
            <div id="plot" ref={rootRef} style={{ width: '100%', height: '300px' }} />
            {!compiled.ok && (
                <div className="graph-error" role="status">{compiled.error}</div>
            )}
        </div>
    );
};

export default GraphView;
