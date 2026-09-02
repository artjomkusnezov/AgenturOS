/**
 * Shared dashboard surface variant — kept outside any `'use client'` module
 * so Server Components can import the type without crossing the client boundary.
 */
export type DashboardVariant = 'default' | 'agenturzentrale'
