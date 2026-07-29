import { PlusIcon } from '@/components/app/app-icons'

type QuickCaptureButtonProps = {
  variant?: 'inline' | 'floating'
}

export function QuickCaptureButton({
  variant = 'inline',
}: QuickCaptureButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-500'

  if (variant === 'floating') {
    return (
      <button
        type="button"
        disabled
        title="Folgt in einem späteren Schritt"
        aria-disabled="true"
        className={`${baseClasses} fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 h-14 min-w-14 px-4 shadow-sm lg:hidden`}
      >
        <PlusIcon className="h-5 w-5" />
        <span className="sr-only">Neu erfassen – folgt in einem späteren Schritt</span>
        <span aria-hidden="true">Neu erfassen</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled
      title="Folgt in einem späteren Schritt"
      aria-disabled="true"
      className={`${baseClasses} px-4 py-2.5`}
    >
      <PlusIcon className="h-4 w-4" />
      Neu erfassen
    </button>
  )
}
