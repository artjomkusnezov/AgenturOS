export function resolveTaskMemberName(
  userId: string | null | undefined,
  memberNameMap: Record<string, string>,
): string {
  if (!userId) {
    return 'Nicht zugewiesen'
  }

  return memberNameMap[userId] ?? 'Unbekanntes Mitglied'
}

export function buildMemberNameMap(
  members: Array<{ userId: string; displayName: string }>,
): Record<string, string> {
  return Object.fromEntries(members.map((member) => [member.userId, member.displayName]))
}
