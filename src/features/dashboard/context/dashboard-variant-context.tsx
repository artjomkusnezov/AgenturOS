'use client'

import { createContext, useContext } from 'react'

import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'

export type { DashboardVariant }

const DashboardVariantContext = createContext<DashboardVariant>('default')

type DashboardVariantProviderProps = {
  variant: DashboardVariant
  children: React.ReactNode
}

export function DashboardVariantProvider({
  variant,
  children,
}: DashboardVariantProviderProps) {
  return (
    <DashboardVariantContext.Provider value={variant}>
      {children}
    </DashboardVariantContext.Provider>
  )
}

export function useDashboardVariant(): DashboardVariant {
  return useContext(DashboardVariantContext)
}
