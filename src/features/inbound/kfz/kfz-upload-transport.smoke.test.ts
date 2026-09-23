/**
 * Regression: a real Fahrzeugschein photo must stay inside the one Server
 * Action. Vercel rejects function bodies above 4.5 MB with HTTP 413 before
 * the action runs. The app still allows 8 MB per file, so photos are fitted
 * first. Bytes stay binary File/Blob objects — never base64 in the JSON payload.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { KFZ_LANDING_MAX_DOCUMENT_BYTES } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  KFZ_LANDING_ACTION_BODY_BUDGET_BYTES,
  KFZ_LANDING_IMAGE_PASSTHROUGH_BYTES,
  KFZ_VERCEL_FUNCTION_BODY_LIMIT_BYTES,
  kfzLandingFilesFitTransport,
  prepareKfzLandingFileForTransport,
  remainingKfzLandingTransportBudget,
  type KfzLandingImageEncoder,
  type KfzLandingImageFitAttempt,
} from '@/features/inbound/kfz/lib/kfz-landing-upload-transport'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function fileOf(bytes: number, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type, lastModified: 1_700_000_000_000 })
}

function encoderReturning(sizeFor: (attempt: KfzLandingImageFitAttempt) => number): KfzLandingImageEncoder {
  return async (_file, attempt) => new Blob([new Uint8Array(sizeFor(attempt))], { type: 'image/jpeg' })
}

describe('kfz upload transport budget', () => {
  it('keeps the action budget under the Vercel 4.5 MB function limit', () => {
    assert.equal(KFZ_VERCEL_FUNCTION_BODY_LIMIT_BYTES, 4_500_000)
    assert.ok(KFZ_LANDING_ACTION_BODY_BUDGET_BYTES < KFZ_VERCEL_FUNCTION_BODY_LIMIT_BYTES)
    assert.ok(KFZ_LANDING_ACTION_BODY_BUDGET_BYTES > 4_000_000)
    assert.ok(KFZ_LANDING_MAX_DOCUMENT_BYTES > KFZ_VERCEL_FUNCTION_BODY_LIMIT_BYTES)
  })

  it('leaves a small QA PNG unchanged and does not re-encode it', async () => {
    let encoded = 0
    const original = fileOf(70, 'QA-TEST.png', 'image/png')
    const prepared = await prepareKfzLandingFileForTransport(
      original,
      remainingKfzLandingTransportBudget(0),
      async () => {
        encoded += 1
        return null
      },
    )
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    assert.equal(encoded, 0)
    assert.equal(prepared.file, original)
    assert.equal(prepared.file.size, 70)
  })

  it('fits one realistic 6.5 MB Fahrzeugschein photo under the Vercel limit', async () => {
    const original = fileOf(6_500_000, 'Fahrzeugschein.png', 'image/png')
    const prepared = await prepareKfzLandingFileForTransport(
      original,
      remainingKfzLandingTransportBudget(0),
      encoderReturning((attempt) => (attempt.maxEdge >= 2400 ? 5_000_000 : 480_000)),
    )
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    assert.equal(prepared.file.type, 'image/jpeg')
    assert.equal(prepared.file.name, 'Fahrzeugschein.jpg')
    assert.equal(prepared.file.size, 480_000)
    assert.ok(prepared.file.size < KFZ_VERCEL_FUNCTION_BODY_LIMIT_BYTES)
    assert.equal(typeof prepared.file, 'object')
    assert.equal(prepared.file instanceof File, true)
    assert.equal(kfzLandingFilesFitTransport([prepared.file]), true)
    const bytes = new Uint8Array(await prepared.file.arrayBuffer())
    assert.equal(bytes.byteLength, 480_000)
    assert.equal(JSON.stringify({ uploads: [{ filename: prepared.file.name }] }).includes('base64'), false)
  })

  it('fits two 4 MB photos in one action by shrinking the second into the remaining budget', async () => {
    const encode = encoderReturning((attempt) => (attempt.maxEdge >= 2400 ? 3_000_000 : 700_000))
    const first = await prepareKfzLandingFileForTransport(
      fileOf(4_000_000, 'schein.jpg', 'image/jpeg'),
      remainingKfzLandingTransportBudget(0),
      encode,
    )
    assert.equal(first.ok, true)
    if (!first.ok) return
    const second = await prepareKfzLandingFileForTransport(
      fileOf(4_000_000, 'rechnung.jpg', 'image/jpeg'),
      remainingKfzLandingTransportBudget(first.file.size),
      encode,
    )
    assert.equal(second.ok, true)
    if (!second.ok) return
    assert.equal(first.file.size, 3_000_000)
    assert.equal(second.file.size, 700_000)
    const total = first.file.size + second.file.size
    assert.ok(total <= KFZ_LANDING_ACTION_BODY_BUDGET_BYTES)
    assert.ok(total < KFZ_VERCEL_FUNCTION_BODY_LIMIT_BYTES)
    assert.equal(kfzLandingFilesFitTransport([first.file, second.file]), true)
  })

  it('does not send a PDF that alone exceeds the function body', async () => {
    let encoded = 0
    const prepared = await prepareKfzLandingFileForTransport(
      fileOf(5_000_000, 'schein.pdf', 'application/pdf'),
      remainingKfzLandingTransportBudget(0),
      async () => {
        encoded += 1
        return new Blob([new Uint8Array(100)])
      },
    )
    assert.equal(encoded, 0)
    assert.equal(prepared.ok, false)
    if (prepared.ok) return
    assert.equal(prepared.code, 'oversized')
  })

  it('rejects a photo when even the smallest fit is still over the remaining budget', async () => {
    const prepared = await prepareKfzLandingFileForTransport(
      fileOf(6_000_000, 'schein.jpg', 'image/jpeg'),
      200_000,
      encoderReturning(() => 400_000),
    )
    assert.equal(prepared.ok, false)
  })

  it('passes a PDF through when it already fits the remaining budget', async () => {
    const original = fileOf(900_000, 'schein.pdf', 'application/pdf')
    const prepared = await prepareKfzLandingFileForTransport(
      original,
      remainingKfzLandingTransportBudget(0),
      async () => {
        throw new Error('pdf must not be re-encoded')
      },
    )
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    assert.equal(prepared.file, original)
    assert.ok(original.size < KFZ_LANDING_IMAGE_PASSTHROUGH_BYTES)
  })

  it('prepares files in the landing form before the single submit', () => {
    const form = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
      'utf8',
    )
    const action = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/actions/submit-kfz-landing-inquiry.ts'),
      'utf8',
    )
    assert.match(form, /prepareKfzLandingFileForTransport\(/)
    assert.match(form, /kfzLandingFilesFitTransport\(prepared\.files\)/)
    assert.match(action, /files: readonly File\[\]/)
    assert.doesNotMatch(action, /base64/)
    assert.doesNotMatch(form, /readAsDataURL/)
  })
})
