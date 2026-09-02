import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'

/**
 * Agenturzentrale (38B) surface classes — dark command-center panels.
 */
export const azSurfaceClassName = 'az-panel'
export const azSurfaceEmphasizedClassName = 'az-panel-emphasis'

export const azSectionPaddingClassName = 'px-3.5 sm:px-4'
export const azSectionHeaderClassName =
  'text-[0.8125rem] font-semibold tracking-tight text-[var(--az-text-primary)]'

export const azRowClassName =
  'group flex items-start gap-2.5 rounded-lg px-1 py-1.5 transition-colors duration-150 hover:bg-[var(--az-bg-panel-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--az-accent-blue)] sm:px-1.5'

export const azCompactRowClassName =
  'group flex items-center gap-2 rounded-lg px-1 py-1 transition-colors duration-150 hover:bg-[var(--az-bg-panel-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--az-accent-blue)] sm:px-1.5'

export const azMetaClassName =
  'mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] leading-relaxed text-[var(--az-text-muted)]'

export const azAccentBorderOverdue = 'border-l-[3px] border-l-red-400'
export const azAccentBorderToday = 'border-l-[3px] border-l-orange-400'
export const azAccentBorderSoon = 'border-l-[3px] border-l-amber-400'

export const azLinkClassName =
  'text-sm text-[var(--az-accent-blue)] transition-opacity duration-150 hover:opacity-80'

export const azEmptyClassName = 'py-1.5 text-xs leading-relaxed text-[var(--az-text-muted)]'

export function resolveSurfaceClasses(variant: DashboardVariant): {
  surface: string
  surfaceEmphasized: string
  sectionPadding: string
  sectionHeader: string
  row: string
  compactRow: string
  meta: string
  link: string
  empty: string
  accentBorderOverdue: string
  accentBorderToday: string
  accentBorderSoon: string
  divider: string
  titleText: string
  bodyText: string
  subtleText: string
} {
  if (variant === 'agenturzentrale') {
    return {
      surface: azSurfaceClassName,
      surfaceEmphasized: azSurfaceEmphasizedClassName,
      sectionPadding: azSectionPaddingClassName,
      sectionHeader: azSectionHeaderClassName,
      row: azRowClassName,
      compactRow: azCompactRowClassName,
      meta: azMetaClassName,
      link: azLinkClassName,
      empty: azEmptyClassName,
      accentBorderOverdue: azAccentBorderOverdue,
      accentBorderToday: azAccentBorderToday,
      accentBorderSoon: azAccentBorderSoon,
      divider: 'divide-[var(--az-border-subtle)]',
      titleText: 'text-[var(--az-text-primary)]',
      bodyText: 'text-[var(--az-text-secondary)]',
      subtleText: 'text-[var(--az-text-muted)]',
    }
  }

  return {
    surface: 'rounded-xl bg-white shadow-[var(--aos-shadow-sm)] ring-1 ring-zinc-950/[0.04]',
    surfaceEmphasized:
      'rounded-xl bg-white shadow-[var(--aos-shadow-sm)] ring-1 ring-zinc-950/[0.05]',
    sectionPadding: 'px-3.5 sm:px-4',
    sectionHeader: 'text-[0.8125rem] font-semibold tracking-tight text-zinc-900',
    row: 'group flex items-start gap-2.5 rounded-lg px-1 py-1.5 transition-colors duration-150 hover:bg-zinc-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-1.5',
    compactRow:
      'group flex items-center gap-2 rounded-lg px-1 py-1 transition-colors duration-150 hover:bg-zinc-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-1.5',
    meta: 'mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] leading-relaxed text-zinc-500',
    link: 'text-sm transition-opacity duration-150 hover:opacity-80 aos-link',
    empty: 'py-1.5 text-xs leading-relaxed text-zinc-500',
    accentBorderOverdue: 'border-l-[3px] border-l-red-400',
    accentBorderToday: 'border-l-[3px] border-l-orange-400',
    accentBorderSoon: 'border-l-[3px] border-l-amber-300',
    divider: 'divide-zinc-100/80',
    titleText: 'text-zinc-900',
    bodyText: 'text-zinc-800',
    subtleText: 'text-zinc-500',
  }
}
