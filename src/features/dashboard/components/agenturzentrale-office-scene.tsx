/**
 * Cinematic agency office backdrop for the Agenturzentrale hero.
 * Inline SVG — no external runtime URL dependency.
 */
export function AgenturzentraleOfficeScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full object-cover opacity-95"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="azSky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e2838" />
            <stop offset="45%" stopColor="#121820" />
            <stop offset="100%" stopColor="#080a10" />
          </linearGradient>
          <linearGradient id="azWindowGlow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.6" />
            <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="azFloor" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a2030" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0a0c12" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="azWarm" cx="72%" cy="18%" r="42%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="azCool" cx="18%" cy="78%" r="38%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1200" height="400" fill="url(#azSky)" />
        <rect width="1200" height="400" fill="url(#azWarm)" />
        <rect width="1200" height="400" fill="url(#azCool)" />

        {/* Far city silhouette through windows */}
        <g opacity="0.35">
          <rect x="620" y="70" width="28" height="90" fill="#2a3344" />
          <rect x="660" y="40" width="36" height="120" fill="#243041" />
          <rect x="710" y="55" width="24" height="105" fill="#2a3344" />
          <rect x="750" y="30" width="42" height="130" fill="#1f2937" />
          <rect x="810" y="60" width="30" height="100" fill="#243041" />
          <rect x="860" y="45" width="38" height="115" fill="#2a3344" />
          <rect x="920" y="75" width="26" height="85" fill="#1f2937" />
        </g>

        {/* Window frames — warm morning light */}
        <g>
          <rect x="580" y="20" width="200" height="160" rx="4" fill="url(#azWindowGlow)" opacity="0.85" />
          <rect
            x="580"
            y="20"
            width="200"
            height="160"
            rx="4"
            fill="none"
            stroke="#64748b"
            strokeOpacity="0.35"
            strokeWidth="3"
          />
          <line x1="680" y1="20" x2="680" y2="180" stroke="#64748b" strokeOpacity="0.3" strokeWidth="2" />
          <line x1="580" y1="100" x2="780" y2="100" stroke="#64748b" strokeOpacity="0.3" strokeWidth="2" />

          <rect x="820" y="20" width="160" height="160" rx="4" fill="url(#azWindowGlow)" opacity="0.55" />
          <rect
            x="820"
            y="20"
            width="160"
            height="160"
            rx="4"
            fill="none"
            stroke="#64748b"
            strokeOpacity="0.28"
            strokeWidth="3"
          />
          <line x1="900" y1="20" x2="900" y2="180" stroke="#64748b" strokeOpacity="0.25" strokeWidth="2" />
          <line x1="820" y1="100" x2="980" y2="100" stroke="#64748b" strokeOpacity="0.25" strokeWidth="2" />
        </g>

        {/* Desk / counter plane */}
        <path d="M0 290 H1200 V400 H0 Z" fill="url(#azFloor)" />
        <path
          d="M40 290 H1160"
          stroke="#94a3b8"
          strokeOpacity="0.18"
          strokeWidth="2"
        />

        {/* Monitor silhouettes on desk */}
        <g opacity="0.55">
          <rect x="120" y="210" width="110" height="72" rx="3" fill="#151b26" stroke="#3b82f6" strokeOpacity="0.25" />
          <rect x="128" y="218" width="94" height="52" rx="2" fill="#1e293b" />
          <rect x="165" y="282" width="20" height="8" fill="#1a2030" />

          <rect x="280" y="200" width="130" height="82" rx="3" fill="#151b26" stroke="#60a5fa" strokeOpacity="0.2" />
          <rect x="288" y="208" width="114" height="60" rx="2" fill="#0f172a" />
          <rect x="300" y="220" width="50" height="4" rx="1" fill="#3b82f6" fillOpacity="0.5" />
          <rect x="300" y="230" width="80" height="3" rx="1" fill="#64748b" fillOpacity="0.4" />
          <rect x="300" y="238" width="70" height="3" rx="1" fill="#64748b" fillOpacity="0.3" />
          <rect x="335" y="282" width="20" height="8" fill="#1a2030" />
        </g>

        {/* Soft lamp glow left */}
        <circle cx="90" cy="240" r="36" fill="#fbbf24" fillOpacity="0.12" />
        <circle cx="90" cy="240" r="16" fill="#fcd34d" fillOpacity="0.2" />
      </svg>

      <div className="absolute inset-0 bg-gradient-to-r from-[#080a10]/88 via-[#080a10]/30 to-[#080a10]/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080a10]/92 via-transparent to-[#080a10]/28" />
    </div>
  )
}
