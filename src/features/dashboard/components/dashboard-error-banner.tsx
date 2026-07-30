type DashboardErrorBannerProps = {
  message: string
}

export function DashboardErrorBanner({ message }: DashboardErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700"
    >
      {message}
    </div>
  )
}
