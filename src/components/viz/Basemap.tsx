import type { FusionState } from '@/types';
import { project } from '@/lib/geo';
import { SEVERITY_META } from '@/lib/format';
import { cn } from '@/lib/cn';

const W = 1000;
const H = 600;
const PAD = 70;

function px(x: number) { return PAD + x * (W - 2 * PAD); }
function py(y: number) { return PAD + y * (H - 2 * PAD); }

/** A polished, fully local SVG basemap of the La Guaira response area (no external tiles). */
export function Basemap({ state, onSelect, selectedId }: { state: FusionState; onSelect?: (id: string) => void; selectedId?: string | null }) {
  const pts = new Map(
    state.entities
      .filter((e) => e.coordinates)
      .map((e) => [e.id, { ...project(e.coordinates!), e }]),
  );
  const get = (canon: string) => {
    const e = state.entities.find((x) => x.dominantCanonicalId === canon);
    return e ? pts.get(e.id) : undefined;
  };
  const hosp = get('ENT-HOSP');
  const highway = get('ENT-HIGHWAY');
  const viaduct = get('ENT-VIADUCT');
  const port = get('ENT-PORT');
  const shelter = get('ENT-SHELTER');
  const water = get('ENT-WATER');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="La Guaira response basemap">
      <defs>
        <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e2a3f" />
          <stop offset="100%" stopColor="#0a1f30" />
        </linearGradient>
        <radialGradient id="terrain" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#11203a" />
          <stop offset="100%" stopColor="#0a1424" />
        </radialGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill="url(#terrain)" />
      {/* grid */}
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={`v${i}`} x1={(W / 14) * i} y1="0" x2={(W / 14) * i} y2={H} stroke="#94a3b815" />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={(H / 9) * i} x2={W} y2={(H / 9) * i} stroke="#94a3b815" />
      ))}

      {/* Caribbean coast */}
      <path
        d={`M ${px(0)} ${py(0.18)} C ${px(0.22)} ${py(0.24)}, ${px(0.48)} ${py(0.16)}, ${px(0.72)} ${py(0.22)} S ${px(0.94)} ${py(0.2)}, ${px(1)} ${py(0.16)}`}
        fill="none"
        stroke="url(#water)"
        strokeWidth="34"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d={`M ${px(0)} ${py(0.18)} C ${px(0.22)} ${py(0.24)}, ${px(0.48)} ${py(0.16)}, ${px(0.72)} ${py(0.22)} S ${px(0.94)} ${py(0.2)}, ${px(1)} ${py(0.16)}`}
        fill="none"
        stroke="#1f6f9c"
        strokeWidth="2"
        opacity="0.5"
      />

      {/* Coastal highway: hospital -> highway -> viaduct */}
      {hosp && highway && viaduct && (
        <g>
          <path
            d={`M ${px(hosp.x)} ${py(hosp.y)} L ${px(highway.x)} ${py(highway.y)} L ${px(viaduct.x)} ${py(viaduct.y)}`}
            fill="none"
            stroke="#fb923c"
            strokeWidth="5"
            strokeDasharray="2 9"
            strokeLinecap="round"
            opacity="0.8"
          />
          <text x={(px(hosp.x) + px(highway.x)) / 2} y={(py(hosp.y) + py(highway.y)) / 2 - 8} fill="#fb923c" fontSize="11" textAnchor="middle">Coastal highway (closed)</text>
        </g>
      )}
      {/* Port secondary lane and shelter/water movement */}
      {port && hosp && (
        <path d={`M ${px(port.x)} ${py(port.y)} Q ${px((port.x + hosp.x) / 2)} ${py(Math.min(port.y, hosp.y) - 0.08)} ${px(hosp.x)} ${py(hosp.y)}`} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="6 6" opacity="0.55" />
      )}
      {shelter && water && (
        <path d={`M ${px(shelter.x)} ${py(shelter.y)} Q ${px((shelter.x + water.x) / 2)} ${py(Math.max(shelter.y, water.y) + 0.08)} ${px(water.x)} ${py(water.y)}`} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="5 7" opacity="0.45" />
      )}

      {/* Viaduct closure marker */}
      {viaduct && (
        <g>
          <rect x={px(viaduct.x) - 14} y={py(viaduct.y) - 4} width="28" height="8" rx="2" fill="#f43f5e" opacity="0.9" transform={`rotate(35 ${px(viaduct.x)} ${py(viaduct.y)})`} />
        </g>
      )}

      {/* Entities */}
      {[...pts.values()].map(({ x, y, e }) => {
        const m = SEVERITY_META[e.riskLevel];
        const selected = selectedId === e.id;
        const critical = e.riskLevel === 'critical';
        return (
          <g key={e.id} className={cn(onSelect && 'cursor-pointer')} onClick={() => onSelect?.(e.id)}>
            {critical && <circle cx={px(x)} cy={py(y)} r="20" fill={m.hex} opacity="0.18" filter="url(#soft)" />}
            <circle cx={px(x)} cy={py(y)} r={selected ? 9 : 6.5} fill={m.hex} stroke={selected ? '#fff' : '#0b111d'} strokeWidth="2" />
            <text x={px(x) + 12} y={py(y) + 4} fill="#cbd5e1" fontSize="12" fontWeight={critical ? 600 : 400} className="select-none">
              {e.canonicalName}
            </text>
          </g>
        );
      })}

      <text x={PAD} y={H - 16} fill="#475569" fontSize="11" className="font-mono">LA GUAIRA RESPONSE AREA · simulated local basemap · grid 1km</text>
    </svg>
  );
}
