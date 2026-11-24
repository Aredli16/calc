import { describe, it, expect } from "vitest";
import { INITIAL_STATE, append, backspace, toggleSign, prettify, missingParens, type InputState } from "./inputEditing";

const type = (...fragments: string[]) =>
  fragments.reduce<InputState>((s, f) => append(s, f), INITIAL_STATE).input;
const s = (input: string, justEvaluated = false): InputState => ({ input, justEvaluated });

describe("append", () => {
  it("remplace le 0 initial", () => {
    expect(type("7")).toBe("7");
    expect(type("sin(")).toBe("sin(");
  });

  it("garde le 0 devant un opérateur ou une virgule", () => {
    expect(type("+", "1")).toBe("0+1");
    expect(type(".", "5")).toBe("0.5");
  });

  it("un opérateur remplace le précédent", () => {
    expect(type("5", "+", "*")).toBe("5*");
  });

  it("autorise le signe moins après × ÷ ^", () => {
    expect(type("2", "*", "-", "3")).toBe("2*-3");
    expect(type("2", "^", "-", "1")).toBe("2^-1");
  });

  it("refuse une deuxième virgule dans un même nombre", () => {
    expect(type("1", ".", "2", ".", "3")).toBe("1.23");
    expect(type("1", ".", "2", "+", "3", ".", "4")).toBe("1.2+3.4");
  });

  it("après =, un chiffre recommence, un opérateur continue", () => {
    expect(append(s("42", true), "7").input).toBe("7");
    expect(append(s("42", true), "+").input).toBe("42+");
    expect(append(s("42", true), ".").input).toBe("0.");
  });
});

describe("backspace", () => {
  it("efface un caractère", () => {
    expect(backspace(s("123")).input).toBe("12");
    expect(backspace(s("1")).input).toBe("0");
  });

  it("efface un nom de fonction en entier", () => {
    expect(backspace(s("2+sin(")).input).toBe("2+");
    expect(backspace(s("sqrt(")).input).toBe("0");
  });
});

describe("toggleSign", () => {
  it("nombre seul", () => {
    expect(toggleSign(s("5")).input).toBe("-5");
    expect(toggleSign(s("-5")).input).toBe("5");
    expect(toggleSign(s("0")).input).toBe("0");
  });

  it("dernier nombre d'une expression", () => {
    expect(toggleSign(s("5+3")).input).toBe("5+(-3)");
    expect(toggleSign(s("5+(-3)")).input).toBe("5+3");
  });

  it("expression entière sinon", () => {
    expect(toggleSign(s("sin(30)")).input).toBe("-(sin(30))");
    expect(toggleSign(s("-(sin(30))")).input).toBe("sin(30)");
  });
});

describe("affichage", () => {
  it("prettify", () => {
    expect(prettify("2*3/sqrt(4)")).toBe("2×3÷√(4)");
  });

  it("missingParens", () => {
    expect(missingParens("sin(2*(3")).toBe(2);
    expect(missingParens("(1)")).toBe(0);
  });
});
