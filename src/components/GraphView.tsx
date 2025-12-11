import React, { useEffect, useRef } from 'react';
import functionPlot from 'function-plot';

interface GraphViewProps {
    expression: string;
}

const GraphView: React.FC<GraphViewProps> = ({ expression }) => {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!rootRef.current) return;

        try {
            const width = rootRef.current.clientWidth;
            const height = 300; // Fixed height for graph area

            // Safety: Ensure expression is potentially valid, fallback to x if empty
            const func = expression && expression !== "0" ? expression : "x";

            // Clean up expression for function-plot if needed (usually it handles simple math js syntax)
            // function-plot uses math.js under the hood so standard math is fine.

            functionPlot({
                target: rootRef.current,
                width,
                height,
                yAxis: { domain: [-5, 5] },
                grid: true,
                data: [{
                    fn: func,
                    color: '#8b5cf6' // Primary purple color
                }]
            });
        } catch (e) {
            console.warn("Invalid function for plot", e);
        }
    }, [expression]);

    return (
        <div className="graph-container">
            <div id="plot" ref={rootRef} style={{ width: '100%', height: '300px' }} />
        </div>
    );
};

export default GraphView;
