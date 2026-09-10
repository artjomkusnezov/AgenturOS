'use client'

import { useRef, useState } from 'react'

import {
  readKfzLandingPreviewInboxAction,
  submitKfzLandingPreviewInquiryAction,
} from '@/features/inbound/kfz/actions/submit-kfz-landing-preview'
import { KfzLandingWithAnalytics } from '@/features/inbound/kfz/components/kfz-landing-with-analytics'
import type { KfzLandingSubmitFn } from '@/features/inbound/kfz/lib/kfz-landing-submit-session'
import type { KfzLandingSubmitState } from '@/features/inbound/kfz/types/kfz-landing-submit'

const FORCED_FAIL: KfzLandingSubmitState = {
  ok: false,
  error: 'Testfehler: Versand vorübergehend nicht möglich.',
  code: 'forced_fail',
  retryable: true,
}

type PreviewInboxItem = {
  id: string
  externalId: string | null
  preferredChannel: string | null
  request: string | null
  documents: Array<{ filename: string; reviewHref: string | null }>
}

/**
 * Local fail-then-retry seam around the public landing form.
 * First submit fails on purpose; retry uses the real inbound handler + memory store.
 */
export function KfzLandingPreviewApp() {
  const failNextRef = useRef(true)
  const [inbox, setInbox] = useState<PreviewInboxItem[]>([])

  const submitInquiry: KfzLandingSubmitFn = async (payload, files) => {
    if (failNextRef.current) {
      failNextRef.current = false
      return FORCED_FAIL
    }

    const result = await submitKfzLandingPreviewInquiryAction(payload, [...(files ?? [])])
    const preview = await readKfzLandingPreviewInboxAction()
    setInbox([...preview.items])
    return result
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950">
        Lokale Vorschau: der erste Versand schlägt absichtlich fehl. Danach geht derselbe
        Versuch durch den echten Intake-Handler in einen Memory-Store — kein Versand, keine
        Kundennachricht.{' '}
        <a className="font-semibold underline-offset-2 hover:underline" href="/dev/kfz-analytics">
          Interne Kfz-Messung
        </a>
      </p>
      <KfzLandingWithAnalytics mode="preview" submitInquiry={submitInquiry} />
      {inbox.length > 0 ? (
        <aside
          className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700"
          data-kfz-preview-inbox-count={inbox.length}
        >
          <p className="font-semibold text-zinc-900">
            Inbox (lokal): {inbox.length} Eintrag
          </p>
          <ul className="mt-2 space-y-1">
            {inbox.map((item) => (
              <li key={item.id}>
                {item.request ?? 'Anfrage'} · {item.preferredChannel ?? 'Kanal'} ·{' '}
                {item.documents.length} Dokument
                {item.documents[0]?.reviewHref ? (
                  <>
                    {' '}
                    ·{' '}
                    <a
                      className="font-semibold underline-offset-2 hover:underline"
                      href={item.documents[0].reviewHref}
                    >
                      Dokument prüfen
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  )
}
