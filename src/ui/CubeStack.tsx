/**
 * Rotating CubeSats, built from CSS 3D transforms.
 *
 * A cube is six squares, which is exactly what CSS 3D does natively. Three.js
 * would cost ~150 KB to draw something the browser can already do for nothing,
 * and the research says our users are on 4 GB school laptops.
 *
 * The cubes are drawn to scale against each other, so a 6U genuinely looks six
 * times the volume of a 1U. That comparison is the whole point of the section.
 */

const UNIT = 34; // pixels per 10 cm unit

export interface CubeSpec {
  /** Units long (the stacking direction). */
  long: number;
  /** Units wide. */
  wide?: number;
  /** Units tall. */
  tall?: number;
}

/** Real CubeSat proportions: 6U and 12U widen rather than just getting longer. */
export const CUBE_SHAPES: Record<string, CubeSpec> = {
  '1U': { long: 1 },
  '2U': { long: 2 },
  '3U': { long: 3 },
  '6U': { long: 3, wide: 2 },
  '12U': { long: 3, wide: 2, tall: 2 },
};

export function Cube({
  spec,
  spin = true,
  wings = false,
  size = 1,
}: {
  spec: CubeSpec;
  spin?: boolean;
  wings?: boolean;
  size?: number;
}) {
  const w = (spec.wide ?? 1) * UNIT * size;
  const h = spec.long * UNIT * size;
  const d = (spec.tall ?? 1) * UNIT * size;

  const faces: { cls: string; style: React.CSSProperties }[] = [
    { cls: 'front', style: { width: w, height: h, transform: `translateZ(${d / 2}px)` } },
    { cls: 'back', style: { width: w, height: h, transform: `rotateY(180deg) translateZ(${d / 2}px)` } },
    { cls: 'right', style: { width: d, height: h, left: w / 2 - d / 2, transform: `rotateY(90deg) translateZ(${w / 2}px)` } },
    { cls: 'left', style: { width: d, height: h, left: w / 2 - d / 2, transform: `rotateY(-90deg) translateZ(${w / 2}px)` } },
    { cls: 'top', style: { width: w, height: d, top: h / 2 - d / 2, transform: `rotateX(90deg) translateZ(${h / 2}px)` } },
    { cls: 'bottom', style: { width: w, height: d, top: h / 2 - d / 2, transform: `rotateX(-90deg) translateZ(${h / 2}px)` } },
  ];

  return (
    <div className="cube-scene" style={{ width: w + 40, height: h + 40 }}>
      <div className={`cube${spin ? ' spin' : ''}`} style={{ width: w, height: h }}>
        {faces.map((f) => (
          <div key={f.cls} className={`face ${f.cls}`} style={f.style}>
            {/* solar cell grid on the long faces */}
            {(f.cls === 'front' || f.cls === 'back' || f.cls === 'left' || f.cls === 'right') && (
              <div className="cells">
                {Array.from({ length: spec.long * 2 }, (_, i) => <span key={i} />)}
              </div>
            )}
          </div>
        ))}
        {wings && (
          <>
            <div className="wing left-wing"
                 style={{ width: w * 1.6, height: h * 0.78, transform: `translateX(${-w * 1.6}px) rotateY(12deg)` }} />
            <div className="wing right-wing"
                 style={{ width: w * 1.6, height: h * 0.78, transform: `translateX(${w}px) rotateY(-12deg)` }} />
          </>
        )}
      </div>
    </div>
  );
}

/** All five sizes side by side, drawn to the same scale. */
export function SizeComparison({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="size-row">
      {Object.entries(CUBE_SHAPES).map(([id, spec]) => (
        <button
          key={id}
          className={`size-cell${selected === id ? ' on' : ''}`}
          onClick={() => onSelect(id)}
          aria-pressed={selected === id}
        >
          <div className="size-cube">
            <Cube spec={spec} spin={selected === id} size={0.62} />
          </div>
          <span className="size-name">{id}</span>
        </button>
      ))}
    </div>
  );
}
