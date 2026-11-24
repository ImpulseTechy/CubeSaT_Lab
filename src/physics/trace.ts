/**
 * Traced values: the foundation of "show your working".
 *
 * Every physics function in this engine returns a Traced<T> rather than a bare
 * number. The trace carries the formula, the substituted values and the source,
 * so the UI can always expand any number to its derivation without the physics
 * modules knowing the UI exists.
 *
 * This is deliberate architecture, not decoration: it is the one durable
 * advantage this project has over the closed-source tools in the same space.
 */

export interface Substitution {
  /** Symbol as it appears in the formula, e.g. "A_panel". */
  symbol: string;
  value: number;
  unit: string;
  /** Optional note, e.g. "3 deployable wings, one side each". */
  note?: string;
}

export interface Trace {
  /** Human-readable name of the quantity, e.g. "Orbit-average generation". */
  label: string;
  /** Formula in plain notation, e.g. "P = S x A x eta x cos(theta) x f_sun". */
  formula: string;
  /** The values substituted into the formula. */
  substitutions: Substitution[];
  /** Where the method or constants come from. */
  source?: string;
  /** Modelling limits a learner should know, e.g. "no self-shadowing". */
  assumptions?: string[];
}

export interface Traced<T = number> {
  value: T;
  unit: string;
  trace: Trace;
}

export function traced<T>(value: T, unit: string, trace: Trace): Traced<T> {
  return { value, unit, trace };
}

/** Shorthand for building a substitution. */
export function sub(
  symbol: string,
  value: number,
  unit: string,
  note?: string,
): Substitution {
  return { symbol, value, unit, note };
}

/**
 * Render a trace as plain text, with each substitution on its own line.
 * Used by the UI's expandable "show the working" panel and by test snapshots.
 */
export function explain(t: Traced<number>): string {
  const lines: string[] = [
    `${t.trace.label} = ${formatNumber(t.value)} ${t.unit}`,
    ``,
    `  ${t.trace.formula}`,
    ``,
  ];
  for (const s of t.trace.substitutions) {
    const note = s.note ? `   (${s.note})` : '';
    lines.push(`  ${s.symbol} = ${formatNumber(s.value)} ${s.unit}${note}`);
  }
  if (t.trace.assumptions?.length) {
    lines.push('', '  Assumes:');
    for (const a of t.trace.assumptions) lines.push(`    - ${a}`);
  }
  if (t.trace.source) lines.push('', `  Source: ${t.trace.source}`);
  return lines.join('\n');
}

/** Format for display: enough significant figures to be useful, not noisy. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  if (abs >= 1e5 || abs < 1e-3) return n.toExponential(2);
  if (abs >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(3);
}
