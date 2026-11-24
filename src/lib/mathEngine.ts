/**
 * Moteur mathématique de la calculatrice.
 *
 * Pipeline : texte → tokens → AST → fonction compilée `(x) => number`.
 *
 * Remplace l'ancien `new Function(...)` + `.replace()` : plus aucune exécution
 * de code arbitraire, et la même grammaire sert au calcul et au graphique.
 *
 * Grammaire (de la priorité la plus faible à la plus forte) :
 *
 *   expr     := term (('+' | '-') term)*
 *   term     := unary (('*' | '/') unary | <implicite> unary)*
 *   unary    := ('-' | '+') unary | power
 *   power    := postfix ('^' unary)?          (associatif à droite : 2^3^2 = 2^9)
 *   postfix  := primary ('!' | '%')*
 *   primary  := nombre | constante | x | fonction primary | '(' expr ')'
 *
 * Particularités :
 *  - multiplication implicite : 2π, 3x, 2(1+1), (1)(2), 2sin(x), x²…
 *  - `-2^2 = -4` (comme en mathématiques)
 *  - pourcentage contextuel : `200 + 10%` = 220, `50 × 10%` = 5
 *  - parenthèses fermées automatiquement en fin d'expression : `sin(30` est valide
 *  - factorielle étendue aux réels via la fonction Gamma
 */

export type AngleMode = "deg" | "rad";

export type Node =
  | { kind: "num"; value: number }
  | { kind: "var" }
  | { kind: "unary"; op: "-"; arg: Node }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { kind: "postfix"; op: "!" | "%"; arg: Node }
  | { kind: "call"; fn: FunctionName; arg: Node };

export class MathError extends Error {
  /** Index (dans la chaîne source) où l'erreur a été détectée, si pertinent. */
  readonly position: number | undefined;

  constructor(message: string, position?: number) {
    super(message);
    this.name = "MathError";
    this.position = position;
  }
}

/* ------------------------------------------------------------------ */
/* Fonctions et constantes                                             */
/* ------------------------------------------------------------------ */

const FUNCTION_NAMES = [
  "asin", "acos", "atan", "sqrt", "sin", "cos", "tan", "log", "ln", "abs", "exp",
] as const;
export type FunctionName = (typeof FUNCTION_NAMES)[number];

const CONSTANTS: Record<string, number> = { pi: Math.PI, "π": Math.PI, e: Math.E };

/** Mots reconnus, du plus long au plus court pour un découpage glouton. */
const WORDS: string[] = [...FUNCTION_NAMES, ...Object.keys(CONSTANTS), "x"].sort(
  (a, b) => b.length - a.length,
);

/** Valeur sous laquelle un résultat trigonométrique est considéré comme nul (sin(π) → 0). */
const TRIG_EPSILON = 1e-14;

function snap(v: number): number {
  return Math.abs(v) < TRIG_EPSILON ? 0 : v;
}

function toRad(v: number, mode: AngleMode): number {
  return mode === "deg" ? (v * Math.PI) / 180 : v;
}

function fromRad(v: number, mode: AngleMode): number {
  return mode === "deg" ? (v * 180) / Math.PI : v;
}

/** En degrés, les multiples de 90° sont traités exactement (cos(90) = 0, tan(90) indéfini). */
function exactDegrees(v: number, mode: AngleMode): number | null {
  if (mode !== "deg" || !Number.isInteger(v / 90)) return null;
  return (((v / 90) % 4) + 4) % 4; // quadrant 0..3
}

function applyFunction(fn: FunctionName, v: number, mode: AngleMode): number {
  switch (fn) {
    case "sin": {
      const q = exactDegrees(v, mode);
      if (q !== null) return [0, 1, 0, -1][q];
      return snap(Math.sin(toRad(v, mode)));
    }
    case "cos": {
      const q = exactDegrees(v, mode);
      if (q !== null) return [1, 0, -1, 0][q];
      return snap(Math.cos(toRad(v, mode)));
    }
    case "tan": {
      const q = exactDegrees(v, mode);
      if (q !== null) return q % 2 === 0 ? 0 : NaN;
      return snap(Math.tan(toRad(v, mode)));
    }
    case "asin":
      return fromRad(Math.asin(v), mode);
    case "acos":
      return fromRad(Math.acos(v), mode);
    case "atan":
      return fromRad(Math.atan(v), mode);
    case "sqrt":
      return Math.sqrt(v);
    case "log":
      return Math.log10(v);
    case "ln":
      return Math.log(v);
    case "abs":
      return Math.abs(v);
    case "exp":
      return Math.exp(v);
  }
}

/**
 * Fonction Gamma — précision relative ~1e-14.
 *  - z < 0.5 : formule de réflexion d'Euler
 *  - sinon : on décale z au-delà de 15 par récurrence Γ(z) = Γ(z+1)/z,
 *    puis série asymptotique de Stirling (coefficients issus des nombres de Bernoulli).
 */
export function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  let shift = 1;
  while (z < 15) {
    shift *= z;
    z += 1;
  }
  const z2 = z * z;
  const lnGamma =
    (z - 0.5) * Math.log(z) - z + 0.5 * Math.log(2 * Math.PI) +
    1 / (12 * z) - 1 / (360 * z * z2) + 1 / (1260 * z * z2 * z2) - 1 / (1680 * z * z2 * z2 * z2);
  return Math.exp(lnGamma) / shift;
}

export function factorial(n: number): number {
  if (Number.isInteger(n)) {
    if (n < 0) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  return gamma(n + 1);
}

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

type Token =
  | { type: "num"; value: number; pos: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" | "!" | "%"; pos: number }
  | { type: "lparen"; pos: number }
  | { type: "rparen"; pos: number }
  | { type: "func"; value: FunctionName; pos: number }
  | { type: "const"; value: number; pos: number }
  | { type: "var"; pos: number };

const SYMBOL_ALIASES: Record<string, string> = {
  "×": "*", "·": "*", "÷": "/", "−": "-", "√": "sqrt", "²": "^2", "³": "^3",
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const src = source;
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Nombres : 12, 3.5, .5 — pas de notation « 1e5 » : « 2e » se lit 2·e.
    // Les très grands résultats sont écrits 1.5*10^21, qui se relit naturellement.
    if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
      if (!m) throw new MathError("Nombre invalide", i);
      if (/^\d*\.\d*\./.test(src.slice(i))) throw new MathError("Nombre avec plusieurs virgules", i);
      tokens.push({ type: "num", value: parseFloat(m[0]), pos: i });
      i += m[0].length;
      continue;
    }

    const alias = SYMBOL_ALIASES[ch];
    if (alias) {
      // Réinjecte l'alias dans le flux (ex. « √ » → « sqrt »).
      const sub = tokenize(alias).map((t) => ({ ...t, pos: i }));
      tokens.push(...sub);
      i++;
      continue;
    }

    if ("+-*/^!%".includes(ch)) {
      tokens.push({ type: "op", value: ch as "+", pos: i });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", pos: i });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", pos: i });
      i++;
      continue;
    }

    if (/[a-zπ]/i.test(ch)) {
      const rest = src.slice(i).toLowerCase();
      const word = WORDS.find((w) => rest.startsWith(w));
      if (!word) {
        const bad = /^[a-z]+/i.exec(src.slice(i))?.[0] ?? ch;
        throw new MathError(`Fonction inconnue « ${bad} »`, i);
      }
      if (word === "x") tokens.push({ type: "var", pos: i });
      else if (word in CONSTANTS) tokens.push({ type: "const", value: CONSTANTS[word], pos: i });
      else tokens.push({ type: "func", value: word as FunctionName, pos: i });
      i += word.length;
      continue;
    }

    throw new MathError(`Caractère inattendu « ${ch} »`, i);
  }

  return tokens;
}

/* ------------------------------------------------------------------ */
/* Parser (descente récursive)                                         */
/* ------------------------------------------------------------------ */

export function parse(source: string): Node {
  const tokens = tokenize(source);
  let p = 0;

  const peek = (): Token | undefined => tokens[p];
  const isOp = (t: Token | undefined, ...ops: string[]) =>
    t?.type === "op" && ops.includes(t.value);
  const endPos = () => source.length;

  /** Un token peut-il commencer un opérande ? (sert à la multiplication implicite) */
  const startsOperand = (t: Token | undefined) =>
    !!t && (t.type === "num" || t.type === "const" || t.type === "var" || t.type === "func" || t.type === "lparen");

  function parseExpr(): Node {
    let left = parseTerm();
    while (isOp(peek(), "+", "-")) {
      const op = (tokens[p++] as { value: "+" | "-" }).value;
      const right = parseTerm();
      // Pourcentage contextuel : a + b% = a + a·b/100
      if (right.kind === "postfix" && right.op === "%") {
        left = { kind: "binary", op, left, right: { kind: "binary", op: "*", left, right } };
      } else {
        left = { kind: "binary", op, left, right };
      }
    }
    return left;
  }

  function parseTerm(): Node {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (isOp(t, "*", "/")) {
        p++;
        left = { kind: "binary", op: (t as { value: "*" | "/" }).value, left, right: parseUnary() };
      } else if (startsOperand(t)) {
        left = { kind: "binary", op: "*", left, right: parseUnary() };
      } else {
        return left;
      }
    }
  }

  function parseUnary(): Node {
    const t = peek();
    if (isOp(t, "-")) {
      p++;
      return { kind: "unary", op: "-", arg: parseUnary() };
    }
    if (isOp(t, "+")) {
      p++;
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): Node {
    const base = parsePostfix();
    if (isOp(peek(), "^")) {
      p++;
      return { kind: "binary", op: "^", left: base, right: parseUnary() };
    }
    return base;
  }

  function parsePostfix(): Node {
    let node = parsePrimary();
    while (isOp(peek(), "!", "%")) {
      node = { kind: "postfix", op: (tokens[p++] as { value: "!" | "%" }).value, arg: node };
    }
    return node;
  }

  function parsePrimary(): Node {
    const t = tokens[p++];
    if (!t) throw new MathError("Expression incomplète", endPos());

    switch (t.type) {
      case "num":
        return { kind: "num", value: t.value };
      case "const":
        return { kind: "num", value: t.value };
      case "var":
        return { kind: "var" };
      case "func": {
        // sin(x)^2 = (sin x)^2 : avec parenthèses, l'argument s'arrête à la parenthèse.
        // Sans parenthèses (√9, sin 30), l'argument est un opérande simple avec ses ! et %.
        if (!peek()) throw new MathError(`Argument manquant pour ${t.value}`, endPos());
        const arg = peek()?.type === "lparen" ? parsePrimary() : parsePostfix();
        return { kind: "call", fn: t.value, arg };
      }
      case "lparen": {
        if (peek()?.type === "rparen") throw new MathError("Parenthèses vides", t.pos);
        const inner = parseExpr();
        const close = peek();
        if (close?.type === "rparen") {
          p++;
        } else if (close) {
          throw new MathError("Parenthèse fermante attendue", close.pos);
        } // sinon : fin d'expression → fermeture implicite
        return inner;
      }
      case "rparen":
        throw new MathError("Parenthèse fermante inattendue", t.pos);
      case "op":
        throw new MathError(`Opérateur « ${t.value} » mal placé`, t.pos);
    }
  }

  if (tokens.length === 0) throw new MathError("Expression vide", 0);
  const ast = parseExpr();
  const extra = peek();
  if (extra) {
    throw new MathError(
      extra.type === "rparen" ? "Parenthèse fermante inattendue" : "Expression mal formée",
      extra.pos,
    );
  }
  return ast;
}

/* ------------------------------------------------------------------ */
/* Évaluation                                                          */
/* ------------------------------------------------------------------ */

export function usesVariable(node: Node): boolean {
  switch (node.kind) {
    case "var":
      return true;
    case "num":
      return false;
    case "binary":
      return usesVariable(node.left) || usesVariable(node.right);
    default:
      return usesVariable(node.arg);
  }
}

export function evaluateNode(node: Node, x: number | undefined, mode: AngleMode): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var":
      if (x === undefined) throw new MathError("La variable x n'est utilisable qu'en mode graphique");
      return x;
    case "unary":
      return -evaluateNode(node.arg, x, mode);
    case "postfix": {
      const v = evaluateNode(node.arg, x, mode);
      return node.op === "!" ? factorial(v) : v / 100;
    }
    case "call":
      return applyFunction(node.fn, evaluateNode(node.arg, x, mode), mode);
    case "binary": {
      const a = evaluateNode(node.left, x, mode);
      const b = evaluateNode(node.right, x, mode);
      switch (node.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return a / b;
        case "^":
          return Math.pow(a, b);
      }
    }
  }
}

export type EvalResult =
  | { ok: true; value: number; display: string; raw: string }
  | { ok: false; error: string; position?: number };

/**
 * Évalue une expression et renvoie soit le résultat formaté, soit un message d'erreur
 * lisible. Ne lève jamais d'exception.
 */
export function evaluate(source: string, mode: AngleMode = "rad"): EvalResult {
  try {
    const value = evaluateNode(parse(source), undefined, mode);
    if (Number.isNaN(value)) return { ok: false, error: "Résultat non défini" };
    if (!Number.isFinite(value)) {
      return { ok: false, error: value > 0 ? "Résultat infini" : "Résultat infini négatif" };
    }
    return { ok: true, value, display: formatDisplay(value), raw: formatRaw(value) };
  } catch (e) {
    if (e instanceof MathError) return { ok: false, error: e.message, position: e.position };
    return { ok: false, error: "Erreur" };
  }
}

/**
 * Compile une expression en fonction de x (pour le graphique).
 * Lève une `MathError` si l'expression est invalide.
 */
export function compile(source: string, mode: AngleMode = "rad"): (x: number) => number {
  const ast = parse(source);
  return (x: number) => evaluateNode(ast, x, mode);
}

/* ------------------------------------------------------------------ */
/* Formatage                                                           */
/* ------------------------------------------------------------------ */

/** Arrondit à 12 chiffres significatifs pour masquer le bruit flottant (0.1+0.2). */
export function clean(value: number): number {
  if (value === 0) return 0;
  return parseFloat(value.toPrecision(12));
}

/** Représentation ré-injectable dans l'expression (pas de séparateurs de milliers). */
export function formatRaw(value: number): string {
  const v = clean(value);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
    const [mantissa, exponent] = v.toExponential().split("e");
    return `${parseFloat(mantissa)}*10^${parseInt(exponent, 10)}`;
  }
  return String(v);
}

/** Représentation lisible (séparateurs de milliers). */
export function formatDisplay(value: number): string {
  const raw = formatRaw(value);
  if (raw.includes("^")) return raw.replace("*", "×");
  const [int, dec] = raw.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec ? `${grouped}.${dec}` : grouped;
}
