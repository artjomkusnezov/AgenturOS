import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  formatWhatsAppConfigError,
  getInboundWhatsAppRuntimeConfig,
  listMissingInboundWhatsAppEnvFields,
} from '@/features/whatsapp/config/inbound-whatsapp-config'
import { shortenWhatsAppExternalId } from '@/features/whatsapp/lib/whatsapp-inbound-log'

const ENV_KEYS = [
  'INBOUND_WHATSAPP_AGENCY_ID',
  'INBOUND_WHATSAPP_ACTOR_USER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_ACCESS_TOKEN',
  'META_APP_SECRET',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_SKIP_SIGNATURE_VERIFY',
  'NODE_ENV',
] as const

function setNodeEnv(value: string | undefined) {
  const env = process.env as Record<string, string | undefined>
  if (value === undefined) {
    delete env.NODE_ENV
  } else {
    env.NODE_ENV = value
  }
}

describe('whatsapp config fail-fast', () => {
  const previous: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key]
      if (key === 'NODE_ENV') {
        continue
      }
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (key === 'NODE_ENV') {
        setNodeEnv(previous[key])
        continue
      }
      const value = previous[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it('lists missing verify token and agency fields', () => {
    setNodeEnv('production')
    const missing = listMissingInboundWhatsAppEnvFields()
    assert.ok(missing.includes('WHATSAPP_VERIFY_TOKEN'))
    assert.ok(missing.includes('INBOUND_WHATSAPP_AGENCY_ID'))
    assert.ok(missing.includes('INBOUND_WHATSAPP_ACTOR_USER_ID'))
    assert.ok(missing.includes('WHATSAPP_ACCESS_TOKEN'))
    assert.ok(missing.includes('META_APP_SECRET'))
    assert.ok(missing.includes('WHATSAPP_PHONE_NUMBER_ID'))
    assert.ok(missing.includes('WHATSAPP_BUSINESS_ACCOUNT_ID'))
    assert.equal(getInboundWhatsAppRuntimeConfig(), null)
    assert.match(formatWhatsAppConfigError(missing), /WHATSAPP_VERIFY_TOKEN/)
    assert.doesNotMatch(formatWhatsAppConfigError(missing), /sk_|EAA|secret=/i)
  })

  it('requires META_APP_SECRET in production even with skip flag', () => {
    setNodeEnv('production')
    process.env.INBOUND_WHATSAPP_AGENCY_ID = 'a'
    process.env.INBOUND_WHATSAPP_ACTOR_USER_ID = 'b'
    process.env.WHATSAPP_VERIFY_TOKEN = 'v'
    process.env.WHATSAPP_ACCESS_TOKEN = 't'
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'p'
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'w'
    process.env.WHATSAPP_SKIP_SIGNATURE_VERIFY = 'true'
    const missing = listMissingInboundWhatsAppEnvFields()
    assert.ok(missing.includes('META_APP_SECRET'))
    assert.equal(getInboundWhatsAppRuntimeConfig(), null)
  })

  it('loads complete production config and never enables skip', () => {
    setNodeEnv('production')
    process.env.INBOUND_WHATSAPP_AGENCY_ID = 'agency'
    process.env.INBOUND_WHATSAPP_ACTOR_USER_ID = 'actor'
    process.env.WHATSAPP_VERIFY_TOKEN = 'verify'
    process.env.WHATSAPP_ACCESS_TOKEN = 'token'
    process.env.META_APP_SECRET = 'app-secret'
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id'
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'test-waba'
    process.env.WHATSAPP_SKIP_SIGNATURE_VERIFY = 'true'

    const config = getInboundWhatsAppRuntimeConfig()
    assert.ok(config)
    assert.equal(config?.skipSignatureVerify, false)
    assert.equal(config?.phoneNumberId, 'test-phone-id')
  })
})

describe('whatsapp inbound log helpers', () => {
  it('shortens external ids without leaking full value when long', () => {
    assert.equal(shortenWhatsAppExternalId('short'), 'short')
    assert.equal(
      shortenWhatsAppExternalId('wamid.ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
      'wamid.ABCDEF…',
    )
  })
})
