import { describe, it, expect } from "vitest";
import { evaluate, compile, factorial, gamma, formatRaw, formatDisplay } from "./mathEngine";

const value = (src: string, mode: "deg" | "rad" = "rad") => {
  const r = evaluate(src, mode);
  if (!r.ok) throw new Error(`« ${src} » → ${r.error}`);
  return r.value;
};
const error = (src: string, mode: "deg" | "rad" = "rad") => {
  const r = evaluate(src, mode);
  if (r.ok) throw new Error(`« ${src} » aurait dû échouer, a donné ${r.value}`);
  return r.error;
};

describe("arithmétique et priorités", () => {
  it.each([
    ["1+2", 3],
    ["2+3*4", 14],
    ["(2+3)*4", 20],
    ["10/4", 2.5],
    ["10-2-3", 5],
    ["2^3^2", 512], // associatif à droite
    ["-2^2", -4], // la puissance l'emporte sur le moins unaire
    ["(-2)^2", 4],
    ["2^-1", 0.5],
    ["2*-3", -6],
    ["--3", 3],
    ["1.5+.5", 2],
    ["3×4÷2", 6],
    ["5−3", 2],
  ])("%s = %d", (src, expected) => {
    expect(value(src)).toBeCloseTo(expected, 12);
  });
});

describe("multiplication implicite", () => {
  it.each([
    ["2π", 2 * Math.PI],
    ["2(3+1)", 8],
    ["(1+1)(2+2)", 8],
    ["3e", 3 * Math.E],
    ["2sqrt(9)", 6],
    ["πe", Math.PI * Math.E],
    ["2³", 8],
  ])("%s", (src, expected) => {
    expect(value(src)).toBeCloseTo(expected, 12);
  });
});

describe("fonctions", () => {
  it("log est décimal, ln est népérien", () => {
    expect(value("log(1000)")).toBeCloseTo(3);
    expect(value("ln(e)")).toBeCloseTo(1);
  });

  it("√ sans parenthèses", () => {
    expect(value("√9")).toBe(3);
    expect(value("√9^2")).toBe(9); // (√9)², comme sin(x)^2
  });

  it("sin(x)^2 = (sin x)^2", () => {
    expect(value("sin(30)^2", "deg")).toBeCloseTo(0.25, 12);
  });

  it("valeur absolue et exp", () => {
    expect(value("abs(-4)")).toBe(4);
    expect(value("exp(0)")).toBe(1);
  });

  it("referme automatiquement les parenthèses", () => {
    expect(value("sin(90", "deg")).toBe(1);
    expect(value("2*(3+(1")).toBe(8);
  });
});

describe("trigonométrie et modes d'angle", () => {
  it("degrés exacts sur les angles remarquables", () => {
    expect(value("sin(30)", "deg")).toBeCloseTo(0.5, 15);
    expect(value("cos(90)", "deg")).toBe(0);
    expect(value("sin(180)", "deg")).toBe(0);
    expect(value("cos(-180)", "deg")).toBe(-1);
    expect(value("tan(45)", "deg")).toBeCloseTo(1, 15);
  });

  it("tan(90°) est indéfini", () => {
    expect(error("tan(90)", "deg")).toBe("Résultat non défini");
  });

  it("radians : sin(π) vaut 0, pas 1.22e-16", () => {
    expect(value("sin(π)")).toBe(0);
    expect(value("cos(π)")).toBe(-1);
  });

  it("fonctions réciproques suivent le mode", () => {
    expect(value("asin(1)", "deg")).toBeCloseTo(90, 12);
    expect(value("asin(1)", "rad")).toBeCloseTo(Math.PI / 2, 12);
  });
});

describe("factorielle", () => {
  it("entiers", () => {
    expect(value("5!")).toBe(120);
    expect(value("0!")).toBe(1);
    expect(value("3!!")).toBe(720);
    expect(value("2+3!")).toBe(8);
  });

  it("réels via Gamma", () => {
    expect(factorial(0.5)).toBeCloseTo(Math.sqrt(Math.PI) / 2, 12);
    expect(gamma(5)).toBeCloseTo(24, 10);
  });

  it("négatifs entiers : indéfini", () => {
    expect(error("(-1)!")).toBe("Résultat non défini");
  });
});

describe("pourcentages contextuels", () => {
  it.each([
    ["10%", 0.1],
    ["200+10%", 220],
    ["200-10%", 180],
    ["50*10%", 5],
    ["80/50%", 160],
  ])("%s = %d", (src, expected) => {
    expect(value(src)).toBeCloseTo(expected, 12);
  });
});

describe("précision et formatage", () => {
  it("masque le bruit flottant", () => {
    const r = evaluate("0.1+0.2");
    expect(r.ok && r.raw).toBe("0.3");
  });

  it("grands nombres en notation ré-injectable", () => {
    expect(formatRaw(1e21)).toBe("1*10^21");
    expect(formatDisplay(1.5e21)).toBe("1.5×10^21");
    expect(value(formatRaw(1.5e21))).toBe(1.5e21);
    expect(formatRaw(2.5e-12)).toBe("2.5*10^-12");
  });

  it("séparateurs de milliers à l'affichage", () => {
    expect(formatDisplay(1234567.891)).toBe("1 234 567.891");
    expect(formatDisplay(-1234)).toBe("-1 234");
  });
});

describe("erreurs lisibles", () => {
  it.each([
    ["1/0", "Résultat infini"],
    ["sqrt(-1)", "Résultat non défini"],
    ["1+", "Expression incomplète"],
    ["2*/3", "Opérateur « / » mal placé"],
    ["1+2)", "Parenthèse fermante inattendue"],
    ["()", "Parenthèses vides"],
    ["foo(2)", "Fonction inconnue « foo »"],
    ["1.2.3", "Nombre avec plusieurs virgules"],
    ["2x", "La variable x n'est utilisable qu'en mode graphique"],
  ])("%s → %s", (src, message) => {
    expect(error(src)).toBe(message);
  });

  it("indique la position de l'erreur", () => {
    const r = evaluate("1+2)");
    expect(!r.ok && r.position).toBe(3);
  });

  it("n'exécute jamais de code JavaScript", () => {
    expect(evaluate("alert(1)").ok).toBe(false);
    expect(evaluate("constructor").ok).toBe(false);
  });
});

describe("compile (graphique)", () => {
  it("évalue en fonction de x", () => {
    const f = compile("2x^2+1");
    expect(f(3)).toBe(19);
    expect(f(-1)).toBe(3);
  });

  it("respecte le mode d'angle", () => {
    expect(compile("sin(x)", "deg")(90)).toBe(1);
    expect(compile("sin(x)", "rad")(Math.PI / 2)).toBe(1);
  });

  it("lève une erreur sur une expression invalide", () => {
    expect(() => compile("x+")).toThrow("Expression incomplète");
  });
});
