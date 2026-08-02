/**
 * Lokale Demo-Daten für das Wochenziel (27C).
 * Ersetzbar, sobald ein echtes Zielmodell existiert — keine Persistenz, keine API.
 */
export const DASHBOARD_WEEKLY_GOAL_DEMO = {
  name: 'BU-Aktion',
  description: '10 Kunden zum Thema BU kontaktieren',
  current: 2,
  target: 10,
} as const

export function getWeeklyGoalRemaining(current: number, target: number): number {
  return Math.max(0, target - current)
}
