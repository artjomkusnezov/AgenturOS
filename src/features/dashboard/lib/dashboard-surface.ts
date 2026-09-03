/**
 * Dashboard-spezifische Surface-Klassen (27C Polish).
 * Weicher als globale aos-card – weniger Rahmen, dezenter Schatten.
 */

export const dashboardSurfaceClassName =
  'dashboard-surface rounded-xl bg-white shadow-[var(--aos-shadow-sm)] ring-1 ring-zinc-950/[0.04]'

export const dashboardSurfaceEmphasizedClassName =
  'dashboard-surface rounded-xl bg-white shadow-[var(--aos-shadow-sm)] ring-1 ring-zinc-950/[0.05]'

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
