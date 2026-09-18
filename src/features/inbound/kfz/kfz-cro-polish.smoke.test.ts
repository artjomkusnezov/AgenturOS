/**
 * Visual CRO contract for the current /kfz Meta-test funnel.
 * Does not change routing, consent semantics, or backend persistence.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  KFZ_LANDING_BRANCHES,
  KFZ_QUESTIONS,
  buildKfzLandingScreens,
  validateKfzQuestionAnswer,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { kfzLandingSubmitStatusLabel } from '@/features/inbound/kfz/lib/kfz-landing-submit-guard'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function readSrc(relativeFromSrc: string): string {
  return fs.readFileSync(path.join(srcRoot, relativeFromSrc), 'utf8')
}

describe('kfz CRO polish contract', () => {
  it('keeps public /kfz free of measurement-consent UI', () => {
    const publicJourney = [
      'app/kfz/page.tsx',
      'features/inbound/kfz/components/kfz-landing-with-analytics.tsx',
      'features/inbound/kfz/components/kfz-landing-form.tsx',
      'features/inbound/kfz/components/kfz-landing-shell.tsx',
      'features/inbound/kfz/components/kfz-landing-analytics-root.tsx',
    ]
      .map(readSrc)
      .join('\n')
    assert.doesNotMatch(publicJourney, /Nutzung dieser Seite messen\?/)
    assert.doesNotMatch(publicJourney, /Messung erlauben/)
    assert.doesNotMatch(publicJourney, /Messung beenden/)
    assert.doesNotMatch(publicJourney, /KfzAnalyticsConsentBanner/)
    assert.doesNotMatch(publicJourney, /document\.cookie|gtag\(|facebook\.net/)
  })

  it('makes upload_documents the visual default without changing the six-branch contract', () => {
    assert.deepEqual(
      KFZ_LANDING_BRANCHES.map((branch) => branch.id),
      [
        'upload_documents',
        'no_documents',
        'first_car',
        'additional_car',
        'switch_car',
        'evb',
      ],
    )
    assert.equal(
      KFZ_LANDING_BRANCHES.find((branch) => branch.highlighted)?.id,
      'upload_documents',
    )
    assert.equal(KFZ_LANDING_BRANCHES.filter((branch) => branch.highlighted).length, 1)

    const form = readSrc('features/inbound/kfz/components/kfz-landing-form.tsx')
    assert.match(form, /data-kfz-branch-group="recommended"/)
    assert.match(form, /data-kfz-branch-group="fallback"/)
    assert.match(form, /Keine Unterlagen senden\?/)
    assert.match(form, /data-kfz-manual-fallback/)
    assert.doesNotMatch(form, /Am häufigsten/)
    assert.doesNotMatch(form, /Anderer Anlass\?/)
    assert.match(form, /KFZ_LANDING_BRANCHES\.filter\(\(branch\) => branch\.highlighted\)/)
    assert.match(form, /KFZ_LANDING_BRANCHES\.filter\(\(branch\) => !branch\.highlighted\)/)
    assert.match(form, /data-kfz-branch-option=\{branch\.id\}/)
  })

  it('does not show send-ready copy before the final submit action', () => {
    assert.equal(kfzLandingSubmitStatusLabel('idle'), '')
    assert.equal(kfzLandingSubmitStatusLabel('submitting'), 'Wird gesendet …')
    const form = readSrc('features/inbound/kfz/components/kfz-landing-form.tsx')
    assert.doesNotMatch(form, /Bereit zum Senden/)
    assert.match(form, /Weiter/)
    assert.match(form, /Zurück/)
    assert.match(form, /Unverbindliche Anfrage senden/)
    assert.match(form, /isLastScreen \? 'final' : 'mobile'/)
  })

  it('keeps mobile sticky Weiter off the final consent screen and desktop static', () => {
    const form = readSrc('features/inbound/kfz/components/kfz-landing-form.tsx')
    assert.match(form, /data-kfz-sticky-actions/)
    assert.match(form, /safe-area-inset-bottom/)
    assert.match(form, /sm:static/)
    assert.match(form, /isLastScreen/)
    assert.match(form, /Schritt \$\{screenIndex \+ 1\} von \$\{screens\.length\}/)
    assert.doesNotMatch(form, /Persönliche Prüfung/)
  })

  it('keeps native date values as ISO while showing German TT.MM.JJJJ guidance', () => {
    const dates = KFZ_QUESTIONS.filter((question) => question.kind === 'date')
    assert.ok(dates.length >= 6)
    for (const question of dates) {
      assert.equal(question.placeholder, 'TT.MM.JJJJ')
      const invalid = validateKfzQuestionAnswer(question, '18.09.2026')
      assert.equal(invalid.ok, false)
      const valid = validateKfzQuestionAnswer(question, '2026-09-18')
      assert.equal(valid.ok, true)
    }

    const fields = readSrc('features/inbound/kfz/components/kfz-questionnaire-fields.tsx')
    assert.match(fields, /type=\{unknownSelected \? 'text' : inputType\}/)
    assert.match(fields, /TT\.MM\.JJJJ/)
    assert.match(fields, /lang=\{question\.kind === 'date' \? 'de' : undefined\}/)
    assert.match(fields, /\(optional\)/)
    assert.match(fields, /Pflichtfeld/)
  })

  it('puts the first useful action above the explainer on mobile after the hero CTA', () => {
    const shell = readSrc('features/inbound/kfz/components/kfz-landing-shell.tsx')
    assert.match(shell, /Kfz-Check starten/)
    assert.match(shell, /#kfz-anfrage/)
    assert.match(shell, /order-1/)
    assert.match(shell, /order-2 lg:order-1/)
    assert.match(shell, /lg:order-2/)
  })

  it('does not collapse questionnaire routing when answers are empty', () => {
    for (const branch of KFZ_LANDING_BRANCHES) {
      const screens = buildKfzLandingScreens(branch.id, {})
      assert.equal(screens[0]?.kind, 'branch')
      if (branch.path === 'upload') {
        assert.deepEqual(
          screens.map((screen) => screen.kind),
          ['branch', 'documents', 'contact'],
        )
      } else {
        assert.ok(screens.some((screen) => screen.kind === 'questions'))
        assert.ok(screens.at(-1)?.kind === 'contact')
      }
    }
  })
})
