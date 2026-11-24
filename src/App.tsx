import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Copy, History, Sparkles, Calculator, X, Activity } from "lucide-react";
import GraphView from "./components/GraphView";
import { evaluate, type AngleMode } from "./lib/mathEngine";
import {
  INITIAL_STATE,
  append,
  backspace,
  toggleSign,
  prettify,
  missingParens,
  type InputState,
} from "./lib/inputEditing";
import "./App.css";

type ButtonType = "number" | "operator" | "action" | "scientific" | "variable";
type Mode = "standard" | "scientific" | "graph";

interface CalcButton {
  label: string;
  value: string;
  type: ButtonType;
  span?: number; // grid column span
  title?: string;
}

interface HistoryEntry {
  expression: string;
  result: string; // valeur brute, ré-injectable
}

const HISTORY_KEY = "calc.history";
const HISTORY_SIZE = 20;

function loadHistory(): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((e): e is HistoryEntry => typeof e?.expression === "string" && typeof e?.result === "string")
      : [];
  } catch {
    return [];
  }
}

const standardButtons: CalcButton[] = [
  { label: "C", value: "AC", type: "action", title: "Tout effacer (Échap)" },
  { label: "±", value: "+/-", type: "action" },
  { label: "%", value: "%", type: "operator" },
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
  { label: "=", value: "=", type: "action", title: "Calculer (Entrée)" },
];

const scientificButtons: CalcButton[] = [
  { label: "sin", value: "sin", type: "scientific" },
  { label: "cos", value: "cos", type: "scientific" },
  { label: "tan", value: "tan", type: "scientific" },
  { label: "ln", value: "ln", type: "scientific", title: "Logarithme népérien" },
  { label: "log", value: "log", type: "scientific", title: "Logarithme décimal" },
  { label: "√", value: "sqrt", type: "scientific" },
  { label: "xʸ", value: "^", type: "operator", title: "Puissance (^)" },
  { label: "n!", value: "!", type: "operator", title: "Factorielle (!)" },
  { label: "π", value: "π", type: "number" },
  { label: "e", value: "e", type: "number" },
  { label: "(", value: "(", type: "number" },
  { label: ")", value: ")", type: "number" },
  { label: "x", value: "x", type: "variable", title: "Variable (mode graphique)" },
  { label: "|x|", value: "abs", type: "scientific", title: "Valeur absolue" },
  { label: "DEG", value: "angle", type: "action", title: "Basculer degrés / radians" },
];

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>("standard");
  const [angleMode, setAngleMode] = useState<AngleMode>("deg");
  const [state, setState] = useState<InputState>(INITIAL_STATE);
  const [error, setError] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const { input } = state;

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  // Aperçu en direct : le moteur est assez rapide pour s'exécuter à chaque frappe.
  const preview = useMemo(() => {
    if (state.justEvaluated || input === "0" || mode === "graph") return "";
    const r = evaluate(input, angleMode);
    return r.ok && r.raw !== input ? r.display : "";
  }, [input, angleMode, mode, state.justEvaluated]);

  const update = useCallback((fn: (s: InputState) => InputState) => {
    setError("");
    setState(fn);
  }, []);

  const calculate = useCallback(() => {
    const r = evaluate(input, angleMode);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError("");
    setHistory((prev) => [{ expression: input, result: r.raw }, ...prev].slice(0, HISTORY_SIZE));
    setState({ input: r.raw, justEvaluated: true });
  }, [input, angleMode]);

  const handlePress = useCallback(
    (value: string, type: ButtonType) => {
      if (type === "action") {
        switch (value) {
          case "AC":
            update(() => INITIAL_STATE);
            break;
          case "DEL":
            update(backspace);
            break;
          case "=":
            calculate();
            break;
          case "+/-":
            update(toggleSign);
            break;
          case "angle":
            setAngleMode((m) => (m === "deg" ? "rad" : "deg"));
            break;
        }
      } else if (type === "scientific") {
        update((s) => append(s, value + "("));
      } else {
        update((s) => append(s, value));
      }
    },
    [calculate, update],
  );

  // Saisie au clavier physique
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const k = e.key;
      let handled = true;
      if (k === "Enter" || k === "=") handlePress("=", "action");
      else if (k === "Backspace") handlePress("DEL", "action");
      else if (k === "Escape" || k === "Delete") {
        if (showHistory) setShowHistory(false);
        else handlePress("AC", "action");
      } else if (/^[0-9.+\-*/^!%()]$/.test(k)) handlePress(k, "number");
      else if (k === ",") handlePress(".", "number");
      else if (/^[a-z]$/i.test(k)) handlePress(k.toLowerCase(), "number");
      else handled = false;

      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePress, showHistory]);

  const ghostParens = ")".repeat(missingParens(input));
  const displayText = prettify(input);

  return (
    <div className="calculator-container">
      <div className="glass-card">
        {/* Header */}
        <div className="header">
          <button
            className="mode-toggle"
            onClick={() => {
              if (mode === "standard") setMode("scientific");
              else if (mode === "scientific") setMode("graph");
              else setMode("standard");
            }}
          >
            {mode === "standard" && <Sparkles size={18} />}
            {mode === "scientific" && <Calculator size={18} />}
            {mode === "graph" && <Activity size={18} />}

            <span>
              {mode === "standard" && "Standard"}
              {mode === "scientific" && "Scientifique"}
              {mode === "graph" && "Graphique"}
            </span>
          </button>
          <div className="header-right">
            {mode !== "standard" && (
              <span className="angle-badge" data-testid="angle-mode">
                {angleMode === "deg" ? "DEG" : "RAD"}
              </span>
            )}
            <button className="icon-btn" onClick={() => setShowHistory(true)} aria-label="Historique">
              <History size={20} />
            </button>
          </div>
        </div>

        {/* Display */}
        <div className="display-area">
          {mode === "graph" ? (
            <GraphView expression={input} angleMode={angleMode} />
          ) : (
            <div className="history-preview" aria-live="polite">
              {error ? (
                <span className="preview-error" role="alert">{error}</span>
              ) : (
                preview && <span className="preview-value" data-testid="preview">= {preview}</span>
              )}
            </div>
          )}

          <div
            className={`main-input ${displayText.length > 12 ? "small-text" : ""} ${error ? "shake" : ""}`}
            data-testid="display"
            key={error ? "err-" + error : "ok"}
          >
            {displayText}
            {ghostParens && <span className="ghost-parens" aria-hidden="true">{ghostParens}</span>}
          </div>
        </div>

        {/* Scientific Pad (Collapsible) */}
        <div className={`scientific-pad ${mode !== "standard" ? "open" : ""}`}>
          {scientificButtons.map((btn) => (
            <button
              key={btn.value}
              className={`calc-btn scientific-btn ${btn.value === "angle" ? "angle-btn" : ""}`}
              title={btn.title}
              tabIndex={mode === "standard" ? -1 : 0}
              onClick={() => handlePress(btn.value, btn.type)}
            >
              {btn.value === "angle" ? (angleMode === "deg" ? "DEG" : "RAD") : btn.label}
            </button>
          ))}
        </div>

        {/* Keypad */}
        <div className="keypad">
          {standardButtons.map((btn) => (
            <button
              key={btn.label}
              title={btn.title}
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
            <button onClick={() => setShowHistory(false)} aria-label="Fermer"><X size={20} /></button>
          </div>
          <div className="history-list">
            {history.length === 0 && <p className="empty-history">Vide</p>}
            {history.map((item, i) => (
              <div key={i} className="history-item">
                <span>
                  <span className="history-expr">{prettify(item.expression)}</span>
                  <span className="history-result"> = {item.result.replace("*", "×")}</span>
                </span>
                <button
                  aria-label={`Réutiliser ${item.result}`}
                  onClick={() => {
                    update(() => ({ input: item.result, justEvaluated: true }));
                    setShowHistory(false);
                  }}
                >
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
