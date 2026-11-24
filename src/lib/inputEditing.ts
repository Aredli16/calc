/**
 * Règles d'édition de la ligne de saisie, sous forme de fonctions pures
 * (testables sans React). L'état est la chaîne saisie + un indicateur
 * « on vient d'appuyer sur = ».
 */

export interface InputState {
  input: string;
  /** Vrai juste après « = » : un chiffre démarre un nouveau calcul, un opérateur continue. */
  justEvaluated: boolean;
}

export const INITIAL_STATE: InputState = { input: "0", justEvaluated: false };

const BINARY_OPERATORS = ["+", "-", "*", "/", "^"];
const POSTFIX_OPERATORS = ["!", "%"];
const FUNCTIONS = ["asin", "acos", "atan", "sqrt", "sin", "cos", "tan", "log", "ln", "abs", "exp"];

/** Ajoute un fragment (chiffre, opérateur, constante, « sin(», …) à la saisie. */
export function append(state: InputState, fragment: string): InputState {
  const { input, justEvaluated } = state;
  const isOperator = BINARY_OPERATORS.includes(fragment) || POSTFIX_OPERATORS.includes(fragment);

  // Après « = » : un opérateur continue sur le résultat, autre chose repart de zéro.
  if (justEvaluated && !isOperator) {
    return { input: fragment === "." ? "0." : fragment, justEvaluated: false };
  }

  if (input === "0") {
    if (isOperator || fragment === ".") return { input: input + fragment, justEvaluated: false };
    return { input: fragment, justEvaluated: false };
  }

  // Deux opérateurs binaires à la suite : le second remplace le premier
  // (sauf « - » après « * / ^ », qui sert de signe : 2*-3, 2^-1).
  const last = input.slice(-1);
  if (BINARY_OPERATORS.includes(fragment) && BINARY_OPERATORS.includes(last)) {
    const isSign = fragment === "-" && last !== "-" && last !== "+";
    if (!isSign) return { input: input.slice(0, -1) + fragment, justEvaluated: false };
  }

  // Pas deux virgules dans le même nombre.
  if (fragment === ".") {
    const currentNumber = /[\d.]*$/.exec(input)?.[0] ?? "";
    if (currentNumber.includes(".")) return { input, justEvaluated: false };
  }

  return { input: input + fragment, justEvaluated: false };
}

/** Efface le dernier élément — un nom de fonction entier (« sin( ») d'un coup. */
export function backspace(state: InputState): InputState {
  const { input } = state;
  for (const fn of FUNCTIONS) {
    if (input.endsWith(fn + "(")) {
      const next = input.slice(0, -(fn.length + 1));
      return { input: next || "0", justEvaluated: false };
    }
  }
  return { input: input.length > 1 ? input.slice(0, -1) : "0", justEvaluated: false };
}

/** ± : change le signe du nombre en cours de saisie, ou de toute l'expression. */
export function toggleSign(state: InputState): InputState {
  const { input } = state;
  if (input === "0") return state;

  // Nombre seul : bascule simplement le signe.
  if (/^-?[\d.]+$/.test(input)) {
    return { input: input.startsWith("-") ? input.slice(1) : "-" + input, justEvaluated: false };
  }

  // Dernier nombre précédé d'un opérateur : 5+3 → 5+(-3) ; 5+(-3) → 5+3
  const wrapped = /\(-([\d.]+)\)$/.exec(input);
  if (wrapped) {
    return { input: input.slice(0, wrapped.index) + wrapped[1], justEvaluated: false };
  }
  const trailing = /([+\-*/^])([\d.]+)$/.exec(input);
  if (trailing) {
    const head = input.slice(0, trailing.index + 1);
    return { input: `${head}(-${trailing[2]})`, justEvaluated: false };
  }

  // Sinon : négation de toute l'expression.
  if (input.startsWith("-(") && input.endsWith(")")) {
    return { input: input.slice(2, -1), justEvaluated: false };
  }
  return { input: `-(${input})`, justEvaluated: false };
}

/** Rend la saisie plus lisible à l'écran (× ÷ − au lieu de * / -). */
export function prettify(input: string): string {
  return input
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/sqrt/g, "√")
    .replace(/pi/g, "π");
}

/** Nombre de parenthèses ouvertes non refermées (affichées en fantôme). */
export function missingParens(input: string): number {
  let depth = 0;
  for (const ch of input) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
  }
  return depth;
}
