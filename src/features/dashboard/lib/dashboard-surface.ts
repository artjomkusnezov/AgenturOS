/**
 * Dashboard-spezifische Surface-Klassen (27C Polish + 38B zentrale depth).
 * Weicher als globale aos-card – erhöhte Panels auf dunklem Ambient-Hintergrund.
 */

export const dashboardSurfaceClassName =
  'rounded-xl bg-[var(--aos-color-surface)] shadow-[var(--aos-shadow-zentrale-panel)] ring-1 ring-white/60'

export const dashboardSurfaceEmphasizedClassName =
  'rounded-xl bg-[var(--aos-color-surface)] shadow-[var(--aos-shadow-zentrale-panel)] ring-1 ring-white/70'

export const dashboardSectionPaddingClassName = 'px-3.5 sm:px-4'

export const dashboardSectionHeaderClassName =
  'text-[0.8125rem] font-semibold tracking-tight text-zinc-900'

export const dashboardRowClassName =
  'group flex items-start gap-2.5 rounded-lg px-1 py-1.5 transition-colors duration-150 hover:bg-zinc-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-1.5'

export const dashboardCompactRowClassName =
  'group flex items-center gap-2 rounded-lg px-1 py-1 transition-colors duration-150 hover:bg-zinc-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-1.5'

export const dashboardMetaClassName =
  'mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] leading-relaxed text-zinc-500'

export const dashboardAccentBorderOverdue = 'border-l-[3px] border-l-red-400'
export const dashboardAccentBorderToday = 'border-l-[3px] border-l-orange-400'
export const dashboardAccentBorderSoon = 'border-l-[3px] border-l-amber-300'
