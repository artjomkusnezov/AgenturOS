import {
  AgenturzentraleDashboard,
  type AgenturzentraleDashboardProps,
} from '@/features/dashboard/components/agenturzentrale-dashboard'

/**
 * Thin adapter: page still imports DashboardWorkOverview.
 * Presentation geometry lives only in AgenturzentraleDashboard.
 */
export function DashboardWorkOverview(props: AgenturzentraleDashboardProps) {
  return <AgenturzentraleDashboard {...props} />
}
