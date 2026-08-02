import { cache } from 'react'

import { getNavigationBadgeCountsForCurrentUser } from '@/features/navigation/repositories/navigation-badges-repository'
import {
  EMPTY_NAVIGATION_BADGE_COUNTS,
  type NavigationBadgeCounts,
} from '@/features/navigation/types/navigation-badges'
import { createClient } from '@/lib/supabase/server'

type CachedNavigationBadgeCountsResult =
  | { success: true; counts: NavigationBadgeCounts }
  | { success: false; counts: NavigationBadgeCounts }

export const getCachedNavigationBadgeCounts = cache(
  async (): Promise<CachedNavigationBadgeCountsResult> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        counts: EMPTY_NAVIGATION_BADGE_COUNTS,
      }
    }

    const result = await getNavigationBadgeCountsForCurrentUser(user.id)

    if (!result.success) {
      return {
        success: false,
        counts: EMPTY_NAVIGATION_BADGE_COUNTS,
      }
    }

    return {
      success: true,
      counts: result.counts,
    }
  },
)
