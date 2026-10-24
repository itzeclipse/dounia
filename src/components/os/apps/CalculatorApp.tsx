"use client";
import React from 'react';

import { useEffect, useRef, useState } from "react";

type Operator = "+" | "-" | "×" | "÷" | null;

interface HistoryItem {
  expression: string;
  result: string;
}

const KEYS: Array<Array<{ label: string; kind: "num" | "op" | "fn" | "eq"; value: string }>> = [
  [
    { label: "AC", kind: "fn", value: "clear" },
    { label: "±", kind: "fn", value: "negate" },
    { label: "%", kind: "fn", value: "percent" },
    { label: "÷", kind: "op", value: "÷" },
  ],
  [
    { label: "7", kind: "num", value: "7" },
    { label: "8", kind: "num", value: "8" },
    { label: "9", kind: "num", value: "9" },
    { label: "×", kind: "op", value: "×" },
  ],
  [
    { label: "4", kind: "num", value: "4" },
    { label: "5", kind: "num", value: "5" },
    { label: "6", kind: "num", value: "6" },
    { label: "-", kind: "op", value: "-" },
  ],
  [
    { label: "1", kind: "num", value: "1" },
    { label: "2", kind: "num", value: "2" },
    { label: "3", kind: "num", value: "3" },
    { label: "+", kind: "op", value: "+" },
  ],
  [
    { label: "0", kind: "num", value: "0" },
    { label: ".", kind: "num", value: "." },
    { label: "⌫", kind: "fn", value: "back" },
    { label: "=", kind: "eq", value: "equals" },
  ],
];

export function CalculatorApp() {
  const [display, setDisplay] = useState("0");
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waiting, setWaiting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expression, setExpression] = useState("");
  const lastResult = useRef<string>("0");

  const compute = (left: number, right: number, op: Operator): number => {
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "×":
        return left * right;
      case "÷":
        return right === 0 ? NaN : left / right;
      default:
        return right;
    }
  };

  const format = (value: number): string => {
    if (!Number.isFinite(value)) return "Error";
    const rounded = Math.round(value * 1e10) / 1e10;
    if (Math.abs(rounded) >= 1e12 || (rounded !== 0 && Math.abs(rounded) < 1e-6)) {
      return rounded.toExponential(6);
    }
    return String(rounded);
  };

  const press = (value: string, kind: string) => {
    if (kind === "num") {
      if (value === "." && display.includes(".")) return;
      const next = waiting || display === "0" ? (value === "." ? "0." : value) : `${display}${value}`;
      setDisplay(next);
      setWaiting(false);
      return;
    }

    if (kind === "fn") {
      if (value === "clear") {
        setDisplay("0");
        setAccumulator(null);
        setOperator(null);
        setWaiting(false);
        setExpression("");
        return;
      }
      if (value === "negate") {
        setDisplay(display.startsWith("-") ? display.slice(1) : display === "0" ? "0" : `-${display}`);
        return;
      }
      if (value === "percent") {
        setDisplay(format(Number(display) / 100));
        return;
      }
      if (value === "back") {
        setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
        return;
      }
    }

    if (kind === "op") {
      const current = Number(display);
      if (operator && accumulator !== null && !waiting) {
        const result = compute(accumulator, current, operator);
        setAccumulator(result);
        setDisplay(format(result));
        setExpression(`${format(result)} ${value}`);
        lastResult.current = format(result);
      } else {
        setAccumulator(current);
        setExpression(`${display} ${value}`);
      }
      setOperator(value as Operator);
      setWaiting(true);
      return;
    }

    if (kind === "eq") {
      if (operator === null || accumulator === null) return;
      const result = compute(accumulator, Number(display), operator);
      const text = format(result);
      setHistory((previous) =>
        [{ expression: `${format(accumulator)} ${operator} ${display}`, result: text }, ...previous].slice(0, 8),
      );
      setDisplay(text);
      setExpression(`${format(accumulator)} ${operator} ${display} =`);
      setAccumulator(null);
      setOperator(null);
      setWaiting(true);
      lastResult.current = text;
    }
  };

  /* Keyboard support while the app is open. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest("input, textarea")) return;
      const key = event.key;
      if (/^[0-9]$/.test(key)) {
        press(key, "num");
        event.preventDefault();
        return;
      }
      if (key === "." || key === ",") {
        press(".", "num");
        event.preventDefault();
        return;
      }
      const map: Record<string, [string, string]> = {
        "+": ["+", "op"],
        "-": ["-", "op"],
        "*": ["×", "op"],
        "x": ["×", "op"],
        "/": ["÷", "op"],
        "Enter": ["equals", "eq"],
        "=": ["equals", "eq"],
        "Backspace": ["back", "fn"],
        "Escape": ["clear", "fn"],
        "%": ["percent", "fn"],
      };
      const action = map[key];
      if (action) {
        press(action[0], action[1]);
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="calc">
      <div className="calc-screen">
        <span className="calc-expression">{expression || "\u00a0"}</span>
        <span className="calc-value">{display}</span>
      </div>
      <div className="calc-keys">
        {KEYS.flat().map((key) => (
          <button
            key={key.value}
            type="button"
            className={`calc-key ${key.kind}`}
            onClick={() => press(key.value, key.kind)}
          >
            {key.label}
          </button>
        ))}
      </div>
      <div className="calc-history">
        <p>Historial</p>
        {history.length === 0 && <span className="calc-none">Sin operaciones todavía.</span>}
        {history.map((item, index) => (
          <div key={`${item.expression}-${index}`} className="calc-hist-row">
            <span>{item.expression}</span>
            <strong>{item.result}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
