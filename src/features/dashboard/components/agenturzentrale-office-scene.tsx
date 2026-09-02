/**
 * Cinematic agency office backdrop for the Agenturzentrale hero.
 * Local SVG asset — no external runtime URL dependency.
 */
export function AgenturzentraleOfficeScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/agenturzentrale-office-scene.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080a10]/85 via-[#080a10]/35 to-[#080a10]/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080a10]/90 via-transparent to-[#080a10]/25" />
    </div>
  )
}
