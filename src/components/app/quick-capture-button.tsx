import { PlusIcon } from '@/components/app/app-icons'

type QuickCaptureButtonProps = {
  variant?: 'inline' | 'floating'
}

export function QuickCaptureButton({
  variant = 'inline',
}: QuickCaptureButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors duration-150'

  if (variant === 'floating') {
    return (
      <button
        type="button"
        disabled
        title="Folgt in einem späteren Schritt"
        aria-disabled="true"
        className={`${baseClasses} fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 h-12 min-w-12 border border-zinc-200/80 bg-white/95 px-4 text-zinc-500 shadow-lg shadow-zinc-900/5 ring-1 ring-zinc-200/60 backdrop-blur-sm lg:hidden`}
      >
        <PlusIcon className="h-4 w-4" />
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
      className={`${baseClasses} border border-zinc-200/80 bg-white px-4 py-2 text-zinc-600 ring-1 ring-zinc-200/50 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800`}
    >
      <PlusIcon className="h-4 w-4" />
      Neu erfassen
    </button>
  )
}
