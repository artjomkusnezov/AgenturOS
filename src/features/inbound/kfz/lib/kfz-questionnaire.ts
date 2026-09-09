/**
 * Step-by-step Kfz facts for a manual Allianz quotation review.
 *
 * Source boundary: the repository has no approved Allianz quotation script,
 * tariff names, discounts, eligibility rules or legal wording. Questions below
 * collect facts an agent needs for a manual Angebotsberechnung. They are
 * AgenturOS intake questions — not an official Allianz question order.
 */

export const KFZ_ANSWER_UNKNOWN = 'unknown' as const
export const KFZ_ANSWER_UNKNOWN_LABEL = 'Weiß ich nicht' as const

export const KFZ_QUESTIONNAIRE_BOUNDARIES = [
  'Offizielle Allianz-Fragenreihenfolge, Tarifnamen und Rechtsformulierungen sind im Repository nicht dokumentiert.',
  'Allianz-Nachlässe, SF-Übertragung und Zulassungsregeln werden nicht berechnet — nur Angaben eingesammelt.',
  'Optionale Allianz-Zusatzbausteine wurden nicht abgefragt, weil sie in den freigegebenen Quellen fehlen.',
  'Selbstbeteiligungen sind auswählbare Beträge ohne Tarifempfehlung. Teilkasko hat keine SF-Klasse.',
] as const

export const KFZ_LANDING_BRANCHES = [
  {
    id: 'upload_documents',
    label: 'Unterlagen hochladen',
    path: 'upload',
    highlighted: false,
  },
  {
    id: 'no_documents',
    label: 'Keine Unterlagen vorhanden',
    path: 'questionnaire',
    highlighted: false,
  },
  {
    id: 'first_car',
    label: 'Erstes Auto versichern',
    path: 'questionnaire',
    highlighted: false,
  },
  {
    id: 'additional_car',
    label: 'Weiteres Auto versichern',
    path: 'questionnaire',
    highlighted: false,
  },
  {
    id: 'switch_car',
    label: 'Bestehendes Auto wechseln',
    path: 'questionnaire',
    highlighted: true,
  },
  {
    id: 'evb',
    label: 'eVB für Zulassung',
    path: 'questionnaire',
    highlighted: false,
  },
] as const

export type KfzLandingBranchId = (typeof KFZ_LANDING_BRANCHES)[number]['id']
export type KfzLandingPath = (typeof KFZ_LANDING_BRANCHES)[number]['path']

export type KfzQuestionnaireIntent =
  | 'first_car'
  | 'additional_car'
  | 'switch_car'
  | 'evb'
  | 'unspecified'

export type KfzQuestionKind = 'choice' | 'text' | 'date' | 'number'

export type KfzChoicePresentation = 'stack' | 'chips' | 'dropdown'

export type KfzQuestionOption = {
  id: string
  label: string
}

export type KfzQuestionDefinition = {
  id: string
  prompt: string
  hint?: string
  kind: KfzQuestionKind
  required: boolean
  options?: readonly KfzQuestionOption[]
  placeholder?: string
  inputMode?: 'numeric' | 'text'
  maxLength?: number
  presentation?: KfzChoicePresentation
}

export type KfzQuestionScreenDefinition = {
  id: string
  title: string
  questionIds: readonly string[]
}

export type KfzLandingScreenKind = 'branch' | 'questions' | 'contact' | 'documents'

export type KfzLandingScreen = {
  id: string
  title: string
  kind: KfzLandingScreenKind
  questionIds: readonly string[]
}

export type KfzQuestionnaireAnswers = Record<string, string>

export const KFZ_SCREEN_BRANCH = 'branch' as const
export const KFZ_SCREEN_CONTACT = 'contact' as const
export const KFZ_SCREEN_DOCUMENTS = 'documents' as const

const UNKNOWN_OPTION: KfzQuestionOption = {
  id: KFZ_ANSWER_UNKNOWN,
  label: KFZ_ANSWER_UNKNOWN_LABEL,
}

function choice(
  id: string,
  prompt: string,
  options: readonly KfzQuestionOption[],
  extras: Partial<KfzQuestionDefinition> = {},
): KfzQuestionDefinition {
  return {
    id,
    prompt,
    kind: 'choice',
    required: true,
    options: [...options, UNKNOWN_OPTION],
    ...extras,
  }
}

function buildSfClassOptions(): KfzQuestionOption[] {
  const special: KfzQuestionOption[] = [
    { id: 'M', label: 'M' },
    { id: '0', label: '0' },
    { id: 'S', label: 'S' },
    { id: '1/2', label: '1/2' },
  ]
  const numbered: KfzQuestionOption[] = []
  for (let n = 1; n <= 50; n += 1) {
    const id = String(n)
    numbered.push({ id, label: id })
  }
  return [...special, ...numbered]
}

/** Factual German no-claims classes. No calculation, transfer or recommendation. */
export const KFZ_SF_CLASS_OPTIONS: readonly KfzQuestionOption[] = buildSfClassOptions()

export const KFZ_SF_CLASS_HAFTPFLICHT_ID = 'sf_class_haftpflicht' as const
export const KFZ_SF_CLASS_VOLLKASKO_ID = 'sf_class_vollkasko' as const
export const KFZ_DEDUCTIBLE_PARTIAL_ID = 'deductible_partial' as const
export const KFZ_DEDUCTIBLE_FULL_ID = 'deductible_full' as const
export const KFZ_DEDUCTIBLE_COMBINATION_ID = 'deductible_combination' as const

export const KFZ_TEILKASKO_DEDUCTIBLE_OPTIONS: readonly KfzQuestionOption[] = [
  { id: '0', label: '0 €' },
  { id: '150', label: '150 €' },
  { id: '300', label: '300 €' },
  { id: '500', label: '500 €' },
  { id: '1000', label: '1.000 €' },
]

export const KFZ_VOLLKASKO_DEDUCTIBLE_OPTIONS: readonly KfzQuestionOption[] = [
  { id: '0', label: '0 €' },
  { id: '300', label: '300 €' },
  { id: '500', label: '500 €' },
  { id: '1000', label: '1.000 €' },
  { id: '2500', label: '2.500 €' },
]

export const KFZ_QUESTIONS: readonly KfzQuestionDefinition[] = [
  choice(
    'intent',
    'Worum geht es konkret?',
    [
      { id: 'first_car', label: 'Erstes Auto versichern' },
      { id: 'additional_car', label: 'Weiteres Auto versichern' },
      { id: 'switch_car', label: 'Bestehendes Auto wechseln' },
      { id: 'evb', label: 'eVB für Zulassung' },
      { id: 'other', label: 'Sonstiges' },
    ],
    {
      hint: 'Ohne Unterlagen brauchen wir das Anliegen, um nur passende Fragen zu stellen.',
    },
  ),
  {
    id: 'intent_other',
    prompt: 'Bitte kurz beschreiben, worum es geht.',
    kind: 'text',
    required: true,
    maxLength: 400,
  },
  choice(
    'registration_status',
    'Wie ist der Zulassungsstand?',
    [
      { id: 'registered', label: 'Fahrzeug ist bereits zugelassen' },
      { id: 'needs_registration', label: 'Fahrzeug wird zugelassen / eVB wird benötigt' },
      { id: 'not_purchased', label: 'Fahrzeug ist noch nicht gekauft oder noch nicht vorhanden' },
    ],
  ),
  choice(
    'evb_purpose',
    'Wofür wird die eVB benötigt?',
    [
      { id: 'first_registration', label: 'Neuzulassung' },
      { id: 're_registration', label: 'Wiederzulassung' },
      { id: 'owner_change', label: 'Umschreibung / Halterwechsel' },
    ],
  ),
  {
    id: 'license_plate',
    prompt: 'Aktuelles Kennzeichen',
    kind: 'text',
    required: false,
    placeholder: 'z. B. OS-AB 1234',
    maxLength: 20,
  },
  {
    id: 'start_date',
    prompt: 'Gewünschter Versicherungsbeginn',
    kind: 'date',
    required: true,
  },
  {
    id: 'hsn',
    prompt: 'Herstellerschlüssel (HSN)',
    hint: 'Aus dem Fahrzeugschein, falls bekannt. Keine Pflicht.',
    kind: 'text',
    required: false,
    placeholder: '4 Ziffern',
    inputMode: 'numeric',
    maxLength: 8,
  },
  {
    id: 'tsn',
    prompt: 'Typschlüssel (TSN)',
    hint: 'Aus dem Fahrzeugschein, falls bekannt. Keine Pflicht.',
    kind: 'text',
    required: false,
    placeholder: '3 Zeichen',
    maxLength: 8,
  },
  {
    id: 'vehicle_make',
    prompt: 'Hersteller / Marke',
    kind: 'text',
    required: true,
    maxLength: 80,
  },
  {
    id: 'vehicle_model',
    prompt: 'Modell',
    kind: 'text',
    required: true,
    maxLength: 80,
  },
  {
    id: 'first_registration',
    prompt: 'Datum der Erstzulassung',
    kind: 'date',
    required: true,
  },
  {
    id: 'current_mileage',
    prompt: 'Aktueller Kilometerstand',
    kind: 'number',
    required: false,
    placeholder: 'km',
    inputMode: 'numeric',
    maxLength: 10,
  },
  choice(
    'owner_is_policyholder',
    'Sind Halter und Versicherungsnehmer dieselbe Person?',
    [
      { id: 'yes', label: 'Ja' },
      { id: 'no', label: 'Nein' },
    ],
  ),
  choice(
    'owner_relationship',
    'In welchem Verhältnis steht der Halter zum Versicherungsnehmer?',
    [
      { id: 'spouse', label: 'Ehe- oder Lebenspartner' },
      { id: 'child', label: 'Kind / Familienangehörige' },
      { id: 'company', label: 'Firma / Gewerbe' },
      { id: 'other', label: 'Sonstiges' },
    ],
  ),
  choice(
    'financing',
    'Wie ist das Fahrzeug finanziert?',
    [
      { id: 'owned', label: 'Eigentum / bar oder bereits abbezahlt' },
      { id: 'financed', label: 'Finanziert' },
      { id: 'leased', label: 'Leasing' },
    ],
  ),
  choice(
    'usage',
    'Wofür wird das Fahrzeug genutzt?',
    [
      { id: 'private', label: 'Privat' },
      { id: 'commute', label: 'Privat und Arbeitsweg' },
      { id: 'commercial', label: 'Gewerblich' },
    ],
  ),
  {
    id: 'annual_mileage',
    prompt: 'Jahresfahrleistung in Kilometern',
    hint: 'Bitte die erwarteten Kilometer pro Jahr angeben.',
    kind: 'number',
    required: true,
    placeholder: 'km pro Jahr',
    inputMode: 'numeric',
    maxLength: 10,
  },
  choice(
    'parking',
    'Wo steht das Fahrzeug über Nacht regelmäßig?',
    [
      { id: 'garage', label: 'Einzelgarage' },
      { id: 'carport', label: 'Carport' },
      { id: 'underground', label: 'Tiefgarage' },
      { id: 'yard', label: 'Hof / privates Grundstück' },
      { id: 'street', label: 'Öffentliche Straße' },
    ],
  ),
  {
    id: 'policyholder_dob',
    prompt: 'Geburtsdatum der Versicherungsnehmerin / des Versicherungsnehmers',
    kind: 'date',
    required: true,
  },
  {
    id: 'license_date',
    prompt: 'Führerscheindatum der Versicherungsnehmerin / des Versicherungsnehmers',
    kind: 'date',
    required: true,
  },
  choice(
    'drivers',
    'Wer fährt das Fahrzeug regelmäßig?',
    [
      { id: 'policyholder_only', label: 'Nur ich' },
      { id: 'with_partner', label: 'Ich und Partner/in' },
      { id: 'others', label: 'Weitere Fahrerinnen oder Fahrer' },
    ],
  ),
  {
    id: 'partner_dob',
    prompt: 'Geburtsdatum der Partnerin / des Partners',
    kind: 'date',
    required: true,
  },
  {
    id: 'partner_license_date',
    prompt: 'Führerscheindatum der Partnerin / des Partners',
    kind: 'date',
    required: true,
  },
  {
    id: 'youngest_driver_dob',
    prompt: 'Geburtsdatum der jüngsten regelmäßigen Fahrerin / des jüngsten Fahrers',
    kind: 'date',
    required: true,
  },
  {
    id: 'additional_drivers_note',
    prompt: 'Weitere Fahrerinnen/Fahrer (Namen, Geburtsdaten, Führerscheindaten, soweit bekannt)',
    kind: 'text',
    required: false,
    maxLength: 400,
  },
  choice(
    'has_previous_kfz',
    'Besteht bereits eine Kfz-Versicherung?',
    [
      { id: 'yes', label: 'Ja' },
      { id: 'no', label: 'Nein, erste Kfz-Versicherung' },
    ],
  ),
  {
    id: 'previous_insurer',
    prompt: 'Bisheriger Versicherer',
    kind: 'text',
    required: true,
    maxLength: 80,
  },
  {
    id: 'previous_policy_number',
    prompt: 'Versicherungsscheinnummer (falls bekannt)',
    kind: 'text',
    required: false,
    maxLength: 40,
  },
  {
    id: 'previous_contract_end',
    prompt: 'Vertragsende oder gewünschter Wechseltermin',
    kind: 'date',
    required: false,
  },
  choice(
    KFZ_SF_CLASS_HAFTPFLICHT_ID,
    'SF-Klasse Haftpflicht',
    KFZ_SF_CLASS_OPTIONS,
    {
      hint: 'Bitte die bekannte Klasse wählen. Es wird nichts berechnet oder übertragen.',
      presentation: 'chips',
    },
  ),
  choice(
    KFZ_SF_CLASS_VOLLKASKO_ID,
    'SF-Klasse Vollkasko',
    KFZ_SF_CLASS_OPTIONS,
    {
      hint: 'Nur angeben, wenn eine Vollkasko-Klasse bekannt ist. Unabhängig von der Haftpflicht.',
      presentation: 'chips',
    },
  ),
  choice(
    'sf_source',
    'Woher stammt die SF-Klasse?',
    [
      { id: 'previous_policy', label: 'Aus bestehender Vorversicherung' },
      { id: 'second_car', label: 'Zweitwagenregelung' },
      { id: 'transfer', label: 'Übernahme von Partner oder Familie' },
      { id: 'first_policy', label: 'Noch keine SF / erste Versicherung' },
    ],
  ),
  choice(
    'has_claims',
    'Gab es Vorschäden in der Kfz-Versicherung?',
    [
      { id: 'yes', label: 'Ja' },
      { id: 'no', label: 'Nein' },
    ],
  ),
  {
    id: 'claims_details',
    prompt: 'Bitte Vorschäden kurz beschreiben (Jahr, Art, soweit bekannt)',
    kind: 'text',
    required: true,
    maxLength: 400,
  },
  choice(
    'coverage',
    'Welchen Schutz wünschen Sie?',
    [
      { id: 'liability', label: 'Haftpflicht' },
      { id: 'partial', label: 'Haftpflicht und Teilkasko' },
      { id: 'full', label: 'Haftpflicht und Vollkasko' },
      { id: 'undecided', label: 'Noch unsicher — bitte persönlich beraten' },
    ],
  ),
  choice(
    KFZ_DEDUCTIBLE_PARTIAL_ID,
    'Selbstbeteiligung Teilkasko',
    KFZ_TEILKASKO_DEDUCTIBLE_OPTIONS,
    {
      hint: 'Bitte den gewünschten Betrag wählen.',
      presentation: 'chips',
    },
  ),
  choice(
    KFZ_DEDUCTIBLE_FULL_ID,
    'Selbstbeteiligung Vollkasko',
    KFZ_VOLLKASKO_DEDUCTIBLE_OPTIONS,
    {
      hint: 'Bitte den gewünschten Betrag wählen.',
      presentation: 'chips',
    },
  ),
] as const

export type KfzQuestionId = (typeof KFZ_QUESTIONS)[number]['id']

export const KFZ_QUESTION_SCREENS: readonly KfzQuestionScreenDefinition[] = [
  { id: 'intent', title: 'Anliegen', questionIds: ['intent', 'intent_other'] },
  {
    id: 'registration',
    title: 'Zulassung',
    questionIds: ['registration_status', 'evb_purpose', 'license_plate', 'start_date'],
  },
  {
    id: 'vehicle',
    title: 'Fahrzeug',
    questionIds: ['hsn', 'tsn', 'vehicle_make', 'vehicle_model', 'first_registration', 'current_mileage'],
  },
  {
    id: 'ownership',
    title: 'Halter',
    questionIds: ['owner_is_policyholder', 'owner_relationship', 'financing'],
  },
  {
    id: 'usage',
    title: 'Nutzung',
    questionIds: ['usage', 'annual_mileage', 'parking'],
  },
  {
    id: 'drivers',
    title: 'Fahrer',
    questionIds: [
      'policyholder_dob',
      'license_date',
      'drivers',
      'partner_dob',
      'partner_license_date',
      'youngest_driver_dob',
      'additional_drivers_note',
    ],
  },
  {
    id: 'insurance',
    title: 'Vorversicherung',
    questionIds: [
      'has_previous_kfz',
      'previous_insurer',
      'previous_policy_number',
      'previous_contract_end',
      KFZ_SF_CLASS_HAFTPFLICHT_ID,
      KFZ_SF_CLASS_VOLLKASKO_ID,
      'sf_source',
    ],
  },
  { id: 'claims', title: 'Vorschäden', questionIds: ['has_claims', 'claims_details'] },
  {
    id: 'coverage',
    title: 'Schutz',
    questionIds: ['coverage', KFZ_DEDUCTIBLE_PARTIAL_ID, KFZ_DEDUCTIBLE_FULL_ID],
  },
] as const

const QUESTION_BY_ID = new Map(KFZ_QUESTIONS.map((question) => [question.id, question]))

export function getKfzLandingBranch(
  idOrLabel: string | null | undefined,
): (typeof KFZ_LANDING_BRANCHES)[number] | null {
  const value = idOrLabel?.trim() ?? ''
  if (!value) {
    return null
  }
  return (
    KFZ_LANDING_BRANCHES.find((branch) => branch.id === value || branch.label === value) ??
    null
  )
}

export function isKfzLandingBranchId(value: string): value is KfzLandingBranchId {
  return KFZ_LANDING_BRANCHES.some((branch) => branch.id === value)
}

export function isKfzLandingBranchLabel(value: string): boolean {
  return KFZ_LANDING_BRANCHES.some((branch) => branch.label === value.trim())
}

export function isUploadDocumentsBranch(
  branchId: string | null | undefined,
): boolean {
  return getKfzLandingBranch(branchId)?.id === 'upload_documents'
}

export function isQuestionnaireBranch(branchId: string | null | undefined): boolean {
  return getKfzLandingBranch(branchId)?.path === 'questionnaire'
}

const LEGACY_REASON_TO_BRANCH: Record<string, KfzLandingBranchId> = {
  'Versicherung wechseln': 'switch_car',
  'Neues Fahrzeug': 'first_car',
  Zweitwagen: 'additional_car',
  'Bestehendes Angebot prüfen': 'no_documents',
}

export function resolveKfzLandingBranchId(
  branchId: string | null | undefined,
  inquiryReason: string | null | undefined,
): KfzLandingBranchId | '' {
  const fromId = getKfzLandingBranch(branchId ?? '')
  if (fromId) {
    return fromId.id
  }
  const fromLabel = getKfzLandingBranch(inquiryReason ?? '')
  if (fromLabel) {
    return fromLabel.id
  }
  return ''
}

export function mapLegacyKfzLandingReason(
  inquiryReason: string | null | undefined,
): KfzLandingBranchId | '' {
  const resolved = resolveKfzLandingBranchId('', inquiryReason)
  if (resolved) {
    return resolved
  }
  return LEGACY_REASON_TO_BRANCH[inquiryReason?.trim() ?? ''] ?? ''
}

export function getKfzQuestion(id: string): KfzQuestionDefinition | null {
  return QUESTION_BY_ID.get(id) ?? null
}

export function readQuestionnaireAnswer(
  answers: KfzQuestionnaireAnswers | null | undefined,
  id: string,
): string {
  const value = answers?.[id]
  return typeof value === 'string' ? value.trim() : ''
}

export function isUnknownQuestionnaireAnswer(value: string | null | undefined): boolean {
  const trimmed = value?.trim().toLowerCase() ?? ''
  return (
    trimmed === KFZ_ANSWER_UNKNOWN ||
    trimmed === KFZ_ANSWER_UNKNOWN_LABEL.toLowerCase() ||
    trimmed === 'unbekannt'
  )
}

export function resolveQuestionnaireIntent(
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): KfzQuestionnaireIntent {
  const branch = getKfzLandingBranch(branchId)
  if (!branch || branch.id === 'upload_documents') {
    return 'unspecified'
  }
  if (branch.id === 'first_car' || branch.id === 'additional_car' || branch.id === 'switch_car' || branch.id === 'evb') {
    return branch.id
  }
  const intent = readQuestionnaireAnswer(answers, 'intent')
  if (
    intent === 'first_car' ||
    intent === 'additional_car' ||
    intent === 'switch_car' ||
    intent === 'evb'
  ) {
    return intent
  }
  return 'unspecified'
}

function hasPreviousInsurance(
  intent: KfzQuestionnaireIntent,
  answers: KfzQuestionnaireAnswers,
): boolean {
  if (intent === 'switch_car') {
    return true
  }
  return readQuestionnaireAnswer(answers, 'has_previous_kfz') === 'yes'
}

/**
 * Vollkasko SF is independent from Haftpflicht and only asked when a previous
 * policy may actually carry a Vollkasko class. Teilkasko has no SF class.
 */
export function shouldAskKfzVollkaskoSf(
  intent: KfzQuestionnaireIntent,
  answers: KfzQuestionnaireAnswers,
): boolean {
  return hasPreviousInsurance(intent, answers)
}

export function isKfzQuestionVisible(
  questionId: string,
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): boolean {
  const branch = getKfzLandingBranch(branchId)
  if (!branch || branch.path !== 'questionnaire') {
    return false
  }

  const intent = resolveQuestionnaireIntent(branch.id, answers)
  const registration = readQuestionnaireAnswer(answers, 'registration_status')
  const notPurchased = registration === 'not_purchased'
  const drivers = readQuestionnaireAnswer(answers, 'drivers')
  const coverage = readQuestionnaireAnswer(answers, 'coverage')
  const ownerIsPolicyholder = readQuestionnaireAnswer(answers, 'owner_is_policyholder')

  switch (questionId) {
    case 'intent':
      return branch.id === 'no_documents'
    case 'intent_other':
      return branch.id === 'no_documents' && readQuestionnaireAnswer(answers, 'intent') === 'other'
    case 'registration_status':
    case 'start_date':
    case 'hsn':
    case 'tsn':
    case 'vehicle_make':
    case 'vehicle_model':
    case 'current_mileage':
    case 'usage':
    case 'annual_mileage':
    case 'parking':
    case 'policyholder_dob':
    case 'license_date':
    case 'drivers':
    case KFZ_SF_CLASS_HAFTPFLICHT_ID:
    case 'sf_source':
    case 'coverage':
      return true
    case KFZ_SF_CLASS_VOLLKASKO_ID:
      return shouldAskKfzVollkaskoSf(intent, answers)
    case 'first_registration':
      return !notPurchased
    case 'evb_purpose':
      return intent === 'evb' || registration === 'needs_registration'
    case 'license_plate':
      return registration === 'registered'
    case 'owner_is_policyholder':
    case 'financing':
      return !notPurchased
    case 'owner_relationship':
      return !notPurchased && ownerIsPolicyholder === 'no'
    case 'partner_dob':
    case 'partner_license_date':
      return drivers === 'with_partner'
    case 'youngest_driver_dob':
    case 'additional_drivers_note':
      return drivers === 'others'
    case 'has_previous_kfz':
      return intent !== 'switch_car'
    case 'previous_insurer':
    case 'previous_policy_number':
    case 'previous_contract_end':
      return hasPreviousInsurance(intent, answers)
    case 'has_claims':
      return hasPreviousInsurance(intent, answers) || intent === 'additional_car'
    case 'claims_details':
      return readQuestionnaireAnswer(answers, 'has_claims') === 'yes'
    case KFZ_DEDUCTIBLE_PARTIAL_ID:
      return coverage === 'partial' || coverage === 'full'
    case KFZ_DEDUCTIBLE_FULL_ID:
      return coverage === 'full'
    default:
      return false
  }
}

export function listVisibleKfzQuestions(
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): KfzQuestionDefinition[] {
  return KFZ_QUESTIONS.filter((question) =>
    isKfzQuestionVisible(question.id, branchId, answers),
  )
}

export function visibleQuestionIdsOnScreen(
  screen: KfzQuestionScreenDefinition,
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): string[] {
  return screen.questionIds.filter((id) => isKfzQuestionVisible(id, branchId, answers))
}

export function buildKfzLandingScreens(
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): KfzLandingScreen[] {
  const branch = getKfzLandingBranch(branchId)
  const screens: KfzLandingScreen[] = [
    {
      id: KFZ_SCREEN_BRANCH,
      title: 'Start',
      kind: 'branch',
      questionIds: [],
    },
  ]

  if (!branch) {
    return screens
  }

  if (branch.path === 'upload') {
    screens.push(
      {
        id: KFZ_SCREEN_CONTACT,
        title: 'Kontakt',
        kind: 'contact',
        questionIds: [],
      },
      {
        id: KFZ_SCREEN_DOCUMENTS,
        title: 'Unterlagen',
        kind: 'documents',
        questionIds: [],
      },
    )
    return screens
  }

  for (const screen of KFZ_QUESTION_SCREENS) {
    const questionIds = visibleQuestionIdsOnScreen(screen, branch.id, answers)
    if (questionIds.length === 0) {
      continue
    }
    screens.push({
      id: screen.id,
      title: screen.title,
      kind: 'questions',
      questionIds,
    })
  }

  screens.push({
    id: KFZ_SCREEN_CONTACT,
    title: 'Kontakt',
    kind: 'contact',
    questionIds: [],
  })

  return screens
}

export function resolveKfzLandingScreenId(
  screens: readonly KfzLandingScreen[],
  screenId: string | null | undefined,
): string {
  if (screenId && screens.some((screen) => screen.id === screenId)) {
    return screenId
  }
  return screens[0]?.id ?? KFZ_SCREEN_BRANCH
}

export function nextKfzLandingScreenId(
  screens: readonly KfzLandingScreen[],
  screenId: string,
): string | null {
  const index = screens.findIndex((screen) => screen.id === screenId)
  if (index < 0 || index >= screens.length - 1) {
    return null
  }
  return screens[index + 1]?.id ?? null
}

export function previousKfzLandingScreenId(
  screens: readonly KfzLandingScreen[],
  screenId: string,
): string | null {
  const index = screens.findIndex((screen) => screen.id === screenId)
  if (index <= 0) {
    return null
  }
  return screens[index - 1]?.id ?? null
}

export type KfzQuestionnaireValidation =
  | { ok: true }
  | { ok: false; error: string; code: string; questionId?: string }

function isFilledAnswer(value: string): boolean {
  return value.length > 0
}

export function validateKfzQuestionAnswer(
  question: KfzQuestionDefinition,
  raw: string,
): KfzQuestionnaireValidation {
  const value = raw.trim()
  if (!question.required && !isFilledAnswer(value)) {
    return { ok: true }
  }
  if (question.required && !isFilledAnswer(value)) {
    return {
      ok: false,
      error: `Bitte ${question.prompt} angeben.`,
      code: 'missing_field',
      questionId: question.id,
    }
  }
  if (isUnknownQuestionnaireAnswer(value)) {
    return { ok: true }
  }
  if (question.kind === 'choice') {
    const allowed = new Set((question.options ?? []).map((option) => option.id))
    if (!allowed.has(value)) {
      return {
        ok: false,
        error: 'Bitte eine der vorgegebenen Antworten wählen.',
        code: 'invalid_field',
        questionId: question.id,
      }
    }
  }
  if (question.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      ok: false,
      error: 'Bitte ein gültiges Datum angeben.',
      code: 'invalid_field',
      questionId: question.id,
    }
  }
  if (question.kind === 'number' && !/^\d+$/.test(value)) {
    return {
      ok: false,
      error: 'Bitte eine Zahl angeben.',
      code: 'invalid_field',
      questionId: question.id,
    }
  }
  if (question.maxLength && value.length > question.maxLength) {
    return {
      ok: false,
      error: 'Die Angabe ist zu lang.',
      code: 'oversized_field',
      questionId: question.id,
    }
  }
  return { ok: true }
}

export function validateKfzQuestionScreen(
  screen: Pick<KfzLandingScreen, 'questionIds'>,
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): KfzQuestionnaireValidation {
  for (const questionId of screen.questionIds) {
    const question = getKfzQuestion(questionId)
    if (!question || !isKfzQuestionVisible(questionId, branchId, answers)) {
      continue
    }
    const result = validateKfzQuestionAnswer(
      question,
      readQuestionnaireAnswer(answers, questionId),
    )
    if (!result.ok) {
      return result
    }
  }
  return { ok: true }
}

export function validateKfzQuestionnaireComplete(
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): KfzQuestionnaireValidation {
  if (!isQuestionnaireBranch(branchId)) {
    return { ok: true }
  }
  for (const question of listVisibleKfzQuestions(branchId, answers)) {
    const result = validateKfzQuestionAnswer(
      question,
      readQuestionnaireAnswer(answers, question.id),
    )
    if (!result.ok) {
      return result
    }
  }
  return { ok: true }
}

export function labelKfzQuestionValue(
  question: KfzQuestionDefinition,
  value: string,
): string {
  if (!value) {
    return ''
  }
  if (isUnknownQuestionnaireAnswer(value)) {
    return KFZ_ANSWER_UNKNOWN_LABEL
  }
  const option = question.options?.find((entry) => entry.id === value)
  return option?.label ?? value
}

export function isKfzSfQuestionId(id: string): boolean {
  return id === KFZ_SF_CLASS_HAFTPFLICHT_ID || id === KFZ_SF_CLASS_VOLLKASKO_ID
}

export function isKfzDeductibleQuestionId(id: string): boolean {
  return id === KFZ_DEDUCTIBLE_PARTIAL_ID || id === KFZ_DEDUCTIBLE_FULL_ID
}

export function hasKfzTeilkaskoSfQuestion(): boolean {
  return KFZ_QUESTIONS.some(
    (question) =>
      question.id.includes('teilkasko') && question.id.includes('sf'),
  )
}

/**
 * Writes one questionnaire answer without copying Haftpflicht into Vollkasko
 * or the other way around.
 */
export function setKfzQuestionnaireAnswer(
  answers: KfzQuestionnaireAnswers,
  questionId: string,
  value: string,
): KfzQuestionnaireAnswers {
  return { ...answers, [questionId]: value }
}

export function formatKfzDeductibleCombination(
  answers: KfzQuestionnaireAnswers,
): string | null {
  const coverage = readQuestionnaireAnswer(answers, 'coverage')
  if (coverage !== 'partial' && coverage !== 'full') {
    return null
  }

  const tkQuestion = getKfzQuestion(KFZ_DEDUCTIBLE_PARTIAL_ID)
  const vkQuestion = getKfzQuestion(KFZ_DEDUCTIBLE_FULL_ID)
  const tkRaw = readQuestionnaireAnswer(answers, KFZ_DEDUCTIBLE_PARTIAL_ID)
  const vkRaw = readQuestionnaireAnswer(answers, KFZ_DEDUCTIBLE_FULL_ID)
  const tkLabel = tkQuestion && tkRaw ? labelKfzQuestionValue(tkQuestion, tkRaw) : ''
  const vkLabel = vkQuestion && vkRaw ? labelKfzQuestionValue(vkQuestion, vkRaw) : ''

  if (coverage === 'full') {
    const parts: string[] = []
    if (vkLabel) {
      parts.push(`Vollkasko ${vkLabel}`)
    }
    if (tkLabel) {
      parts.push(`Teilkasko ${tkLabel}`)
    }
    return parts.length > 0 ? parts.join(' / ') : null
  }

  return tkLabel ? `Teilkasko ${tkLabel}` : null
}

export type KfzQuestionnaireAnswerRecord = {
  id: string
  label: string
  value: string
  unknown: boolean
}

export function listAnsweredKfzQuestions(
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): KfzQuestionnaireAnswerRecord[] {
  const records: KfzQuestionnaireAnswerRecord[] = []
  for (const question of listVisibleKfzQuestions(branchId, answers)) {
    const raw = readQuestionnaireAnswer(answers, question.id)
    if (!raw) {
      continue
    }
    records.push({
      id: question.id,
      label: question.prompt,
      value: labelKfzQuestionValue(question, raw),
      unknown: isUnknownQuestionnaireAnswer(raw),
    })
  }

  const combination = formatKfzDeductibleCombination(answers)
  if (combination) {
    records.push({
      id: KFZ_DEDUCTIBLE_COMBINATION_ID,
      label: 'Gewünschte Selbstbeteiligung',
      value: combination,
      unknown: false,
    })
  }

  return records
}

export function listKfzQuestionnaireMissingFacts(
  branchId: string,
  answers: KfzQuestionnaireAnswers,
): string[] {
  if (!isQuestionnaireBranch(branchId)) {
    return []
  }
  const missing: string[] = []
  for (const question of listVisibleKfzQuestions(branchId, answers)) {
    const raw = readQuestionnaireAnswer(answers, question.id)
    if (!raw && question.required) {
      missing.push(question.prompt)
      continue
    }
    if (isUnknownQuestionnaireAnswer(raw)) {
      missing.push(question.prompt)
    }
  }
  return missing
}

export function extractVehicleFactsFromAnswers(answers: KfzQuestionnaireAnswers): {
  make: string
  model: string
  year: string
} {
  const make = readQuestionnaireAnswer(answers, 'vehicle_make')
  const model = readQuestionnaireAnswer(answers, 'vehicle_model')
  const firstRegistration = readQuestionnaireAnswer(answers, 'first_registration')
  const yearMatch = firstRegistration.match(/^(\d{4})/)
  return {
    make: isUnknownQuestionnaireAnswer(make) ? '' : make,
    model: isUnknownQuestionnaireAnswer(model) ? '' : model,
    year: yearMatch?.[1] ?? '',
  }
}

export function formatKfzQuestionnaireNotes(
  branchLabel: string,
  records: readonly KfzQuestionnaireAnswerRecord[],
  missingFacts: readonly string[],
): string {
  const lines = [`Zweig: ${branchLabel}`]
  for (const record of records) {
    lines.push(`${record.label}: ${record.value}`)
  }
  if (missingFacts.length > 0) {
    lines.push(`Offene Angaben: ${missingFacts.join('; ')}`)
  }
  return lines.join('\n')
}
