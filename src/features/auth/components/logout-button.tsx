import { logoutAction } from '@/features/auth/actions/logout'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-60"
      >
        Abmelden
      </button>
    </form>
  )
}
