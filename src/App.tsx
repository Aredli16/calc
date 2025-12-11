import React, { useState, useEffect, useCallback } from "react";
import { Copy, History, Sparkles, Calculator, X, Activity } from "lucide-react";
import GraphView from "./components/GraphView";
import "./App.css";

// Helper type for buttons
type ButtonType = "number" | "operator" | "action" | "scientific" | "variable";

interface CalcButton {
  label: string;
  value: string;
  type: ButtonType;
  span?: number; // grid column span
}

const App: React.FC = () => {
  type Mode = "standard" | "scientific" | "graph";
  const [mode, setMode] = useState<Mode>("standard");
  const [input, setInput] = useState<string>("0");
  const [result, setResult] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Handle key press
  const handlePress = (value: string, type: ButtonType) => {
    if (type === "action") {
      switch (value) {
        case "AC":
          setInput("0");
          setResult("");
          break;
        case "DEL":
          setInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
          break;
        case "=":
          calculateResult(true);
          break;
        case "+/-":
          setInput((prev) => {
            if (prev === "0") return prev;
            return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
          });
          break;
        case "%":
          setInput((prev) => String(parseFloat(prev) / 100));
          break;
      }
    } else if (type === "scientific") {
      handleScientific(value);
    } else if (type === "variable") {
      // Treat variable like a number (append directly) but check for implicit multiply
      setInput((prev) => {
        if (prev === "0") return value;
        // if prev ends with number or ), add *
        const lastChar = prev.slice(-1);
        if (/[0-9)]/.test(lastChar)) {
          return prev + "*" + value;
        }
        return prev + value;
      });
    } else {
      // Numbers and Operators
      setInput((prev) => {
        if (prev === "0" && !["+", "-", "*", "/", "."].includes(value)) return value;
        return prev + value;
      });
    }
  };

  const handleScientific = (func: string) => {
    // Simple immediate execution for single operand functions for now, or append syntax
    // Let's append syntax like sin(
    setInput(prev => {
      const lastChar = prev.slice(-1);
      const isOperator = ["+", "-", "*", "/"].includes(lastChar);
      const prefix = prev === "0" ? "" : (isOperator ? prev : prev + "*");
      return prefix + func + "(";
    });
  }

  const calculateResult = useCallback((finalize: boolean = false) => {
    try {
      // Replace symbols for JS eval
      const expression = input
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, "Math.PI")
        .replace(/e/g, "Math.E")
        .replace(/sin/g, "Math.sin")
        .replace(/cos/g, "Math.cos")
        .replace(/tan/g, "Math.tan")
        .replace(/sqrt/g, "Math.sqrt")
        .replace(/log/g, "Math.log10")
        .replace(/ln/g, "Math.log");

      // Safety check? We keep it local client side, it's fine.
      // Eval is evil but standard for calc apps unless we use a parser.
      // We'll use Function constructor which is slightly cleaner than direct eval
      const evalResult = new Function(`return ${expression}`)();

      const formattedResult = Number(evalResult).toLocaleString("en-US", { maximumFractionDigits: 10 });

      if (finalize) {
        setHistory(prev => [`${input} = ${formattedResult}`, ...prev].slice(0, 10));
        setInput(String(evalResult));
        setResult("");
      } else {
        setResult(formattedResult);
      }
    } catch {
      if (finalize) setResult("Error");
    }
  }, [input]);

  // Auto-calculate preview
  useEffect(() => {
    if (input && input !== "0") {
      // Debounce slightly or just run
      const timer = setTimeout(() => calculateResult(false), 300);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setResult(""), 0);
    }
  }, [input, calculateResult]);

  const standardButtons: CalcButton[] = [
    { label: "C", value: "AC", type: "action" },
    { label: "±", value: "+/-", type: "action" },
    { label: "%", value: "%", type: "action" },
    { label: "÷", value: "/", type: "operator" },
    { label: "7", value: "7", type: "number" },
    { label: "8", value: "8", type: "number" },
    { label: "9", value: "9", type: "number" },
    { label: "×", value: "*", type: "operator" },
    { label: "4", value: "4", type: "number" },
    { label: "5", value: "5", type: "number" },
    { label: "6", value: "6", type: "number" },
    { label: "-", value: "-", type: "operator" },
    { label: "1", value: "1", type: "number" },
    { label: "2", value: "2", type: "number" },
    { label: "3", value: "3", type: "number" },
    { label: "+", value: "+", type: "operator" },
    { label: "0", value: "0", type: "number", span: 2 },
    { label: ".", value: ".", type: "number" },
    { label: "=", value: "=", type: "action" },
  ];

  const scientificButtons: CalcButton[] = [
    { label: "sin", value: "sin", type: "scientific" },
    { label: "cos", value: "cos", type: "scientific" },
    { label: "tan", value: "tan", type: "scientific" },
    { label: "log", value: "log", type: "scientific" },
    { label: "ln", value: "ln", type: "scientific" },
    { label: "√", value: "sqrt", type: "scientific" },
    { label: "π", value: "π", type: "number" },
    { label: "e", value: "e", type: "number" },
    { label: "(", value: "(", type: "number" },
    { label: ")", value: ")", type: "number" },
    { label: "x", value: "x", type: "variable" },
  ];

  return (
    <div className="calculator-container">
      <div className="glass-card">
        {/* Header */}
        <div className="header">
          <div className="mode-toggle" onClick={() => {
            if (mode === "standard") setMode("scientific");
            else if (mode === "scientific") setMode("graph");
            else setMode("standard");
          }}>
            {mode === "standard" && <Sparkles size={18} />}
            {mode === "scientific" && <Calculator size={18} />}
            {mode === "graph" && <Activity size={18} />}

            <span>
              {mode === "standard" && "Standard"}
              {mode === "scientific" && "Scientifique"}
              {mode === "graph" && "Graphique"}
            </span>
          </div>
          <button className="icon-btn" onClick={() => setShowHistory(true)}>
            <History size={20} />
          </button>
        </div>

        {/* Display */}
        <div className="display-area">
          {mode === "graph" ? (
            <GraphView expression={input} />
          ) : (
            <div className="history-preview">
              {result && <span className="preview-value">{result}</span>}
            </div>
          )}

          <div className={`main-input ${input.length > 12 ? 'small-text' : ''}`} data-testid="display">
            {input}
          </div>
        </div>

        {/* Scientific Pad (Collapsible) */}
        <div className={`scientific-pad ${mode !== 'standard' ? 'open' : ''}`}>
          {scientificButtons.map((btn) => (
            <button
              key={btn.label}
              className="calc-btn scientific-btn"
              onClick={() => handlePress(btn.value, btn.type)}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Keypad */}
        <div className="keypad">
          {standardButtons.map((btn) => (
            <button
              key={btn.label}
              className={`calc-btn ${btn.type} ${btn.value === "AC" ? "clear-btn" : ""} ${btn.value === "=" ? "equals-btn" : ""}`}
              style={btn.span ? { gridColumn: `span ${btn.span}` } : {}}
              onClick={() => handlePress(btn.value, btn.type)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Overlay */}
      {showHistory && (
        <div className="history-overlay">
          <div className="history-header">
            <h3>Historique</h3>
            <button onClick={() => setShowHistory(false)}><X size={20} /></button>
          </div>
          <div className="history-list">
            {history.length === 0 && <p className="empty-history">Vide</p>}
            {history.map((item, i) => (
              <div key={i} className="history-item">
                {item}
                <button onClick={() => {
                  const val = item.split("=")[1].trim();
                  setInput(val);
                  setShowHistory(false);
                }}>
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
          {history.length > 0 && (
            <button className="clear-history-btn" onClick={() => setHistory([])}>
              Effacer l'historique
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
