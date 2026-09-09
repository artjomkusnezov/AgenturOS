'use client'

import { useEffect, useId, useRef } from 'react'

import {
  INBOX_SEARCH_CLEAR_LABEL,
  INBOX_SEARCH_KEYBOARD_HINT,
  INBOX_SEARCH_NAV_LABEL,
  INBOX_SEARCH_PLACEHOLDER,
} from '@/features/inbox/lib/inbox-factual-search'
import { aosBtnGhostClassName, aosInputLgClassName } from '@/lib/design-system'

type InboxFactualSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}

export function InboxFactualSearchField({
  value,
  onChange,
  onClear,
}: InboxFactualSearchFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      event.preventDefault()
      inputRef.current?.focus()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="aos-inbox-search">
      <label htmlFor={inputId} className="aos-inbox-search-label">
        {INBOX_SEARCH_NAV_LABEL}
      </label>
      <div className="aos-inbox-search-row">
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={INBOX_SEARCH_PLACEHOLDER}
          className={`${aosInputLgClassName} aos-inbox-search-input`}
        />
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className={`${aosBtnGhostClassName} aos-inbox-search-clear min-h-11 min-w-11`}
          >
            {INBOX_SEARCH_CLEAR_LABEL}
          </button>
        ) : null}
      </div>
      <p className="aos-inbox-search-hint">{INBOX_SEARCH_KEYBOARD_HINT}</p>
    </div>
  )
}
