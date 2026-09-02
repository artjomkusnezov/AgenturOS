type DashboardErrorBannerProps = {
  message: string
}

export function DashboardErrorBanner({ message }: DashboardErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-400/30 bg-red-950/40 px-5 py-4 text-sm text-red-300"
    >
      {message}
    </div>
  )
}
