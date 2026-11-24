/**
 * Putting a design in the URL.
 *
 * Two reasons this matters more than it looks:
 *
 *  - A student who builds something can keep it. Without this, closing the tab
 *    throws away everything they worked out.
 *  - A teacher can send a specific broken design and say "fix this". That turns
 *    the simulator from a toy into something you can set as homework, and it
 *    costs nothing to support because the whole state fits in a link.
 *
 * The encoding is deliberately short and readable rather than clever: a design
 * is a handful of choices, so it compresses into a few dozen characters without
 * needing a library or a server.
 */

import { DEFAULT_DESIGN, type Design } from '../physics/design';
import type { Subsystem } from '../data/catalogue';
import type { FormFactor } from '../physics/constants';
import type { AttitudeMode } from '../physics/power';

const SUBSYSTEMS: Subsystem[] = [
  'structure', 'eps', 'battery', 'solar', 'obc', 'adcs', 'comms', 'payload',
];

/** Short codes keep the link readable; full ids would triple its length. */
const ATTITUDE_CODE: Record<AttitudeMode, string> = {
  tumbling: 't', nadir: 'n', 'sun-tracking': 's',
};
const CODE_ATTITUDE: Record<string, AttitudeMode> = {
  t: 'tumbling', n: 'nadir', s: 'sun-tracking',
};

/** Round-trip safe number formatting - no trailing noise in the link. */
const num = (n: number, dp = 2) => String(Number(n.toFixed(dp)));

export function encodeDesign(d: Design): string {
  const parts = [
    `f=${d.formFactor}`,
    `c=${SUBSYSTEMS.map((s) => d.components[s] ?? '').join(',')}`,
    `a=${ATTITUDE_CODE[d.attitude]}`,
    `d=${num(d.payloadDuty)}`,
    `r=${d.dataRateBps}`,
    `m=${num(d.contingency)}`,
    // Separate keys rather than one dotted value: inclination contains a
    // decimal point, so packing them together silently truncated 51.6 to 51.
    `alt=${num(d.orbit.altitudeKm, 0)}`,
    `inc=${num(d.orbit.inclinationDeg, 1)}`,
    `raan=${num(d.orbit.raanDeg ?? 0, 0)}`,
    `g=${d.stationId}`,
  ];
  return parts.join('&');
}

/**
 * Decode a design from a link.
 *
 * Anything missing or malformed falls back to the default rather than throwing:
 * a half-broken link should still open something usable, because the person
 * clicking it did not write it and cannot fix it.
 */
export function decodeDesign(encoded: string): Design {
  const q = new URLSearchParams(encoded);
  const d: Design = {
    ...DEFAULT_DESIGN,
    components: { ...DEFAULT_DESIGN.components },
    orbit: { ...DEFAULT_DESIGN.orbit },
  };

  const f = q.get('f');
  if (f && ['1U', '1.5U', '2U', '3U', '6U'].includes(f)) {
    d.formFactor = f as FormFactor;
  }

  const c = q.get('c');
  if (c) {
    const ids = c.split(',');
    const next: Design['components'] = {};
    SUBSYSTEMS.forEach((s, i) => {
      if (ids[i]) next[s] = ids[i];
    });
    if (Object.keys(next).length) d.components = next;
  }

  const a = q.get('a');
  if (a && CODE_ATTITUDE[a]) d.attitude = CODE_ATTITUDE[a];

  const duty = Number(q.get('d'));
  if (Number.isFinite(duty) && duty >= 0 && duty <= 1) d.payloadDuty = duty;

  const rate = Number(q.get('r'));
  if (Number.isFinite(rate) && rate > 0) d.dataRateBps = rate;

  const cont = Number(q.get('m'));
  if (Number.isFinite(cont) && cont >= 0 && cont <= 1) d.contingency = cont;

  const alt = Number(q.get('alt'));
  if (Number.isFinite(alt) && alt >= 100 && alt <= 2000) d.orbit.altitudeKm = alt;

  const inc = Number(q.get('inc'));
  if (q.get('inc') !== null && Number.isFinite(inc) && inc >= 0 && inc <= 180) {
    d.orbit.inclinationDeg = inc;
  }

  const raan = Number(q.get('raan'));
  if (q.get('raan') !== null && Number.isFinite(raan) && raan >= 0 && raan <= 360) {
    d.orbit.raanDeg = raan;
  }

  const g = q.get('g');
  if (g) d.stationId = g;

  return d;
}

/** The full shareable link for a design. */
export function designLink(d: Design): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#${encodeDesign(d)}`;
}

/** Read a design out of the current URL, or null if there isn't one. */
export function designFromUrl(): Design | null {
  const hash = location.hash.replace(/^#/, '');
  if (!hash || !hash.includes('=')) return null;
  return decodeDesign(hash);
}

/** Quietly keep the address bar in step, without adding history entries. */
export function syncUrl(d: Design): void {
  history.replaceState(null, '', `#${encodeDesign(d)}`);
}

const STORAGE_KEY = 'cubesat-lab.design';

export function saveLocally(d: Design): void {
  try {
    localStorage.setItem(STORAGE_KEY, encodeDesign(d));
  } catch {
    // Private browsing and blocked storage are fine - the URL still works.
  }
}

export function loadLocally(): Design | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? decodeDesign(s) : null;
  } catch {
    return null;
  }
}
