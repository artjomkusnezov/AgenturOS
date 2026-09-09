'use client'

import {
  KFZ_ANSWER_UNKNOWN,
  KFZ_ANSWER_UNKNOWN_LABEL,
  getKfzQuestion,
  type KfzQuestionDefinition,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'

const fieldClassName =
  'mt-1.5 w-full min-h-12 rounded-xl border border-[#cbd6e2] bg-white px-3.5 py-3 text-base text-zinc-900 outline-none transition focus:border-[#0050aa] focus:ring-2 focus:ring-[#0050aa]/20 disabled:cursor-not-allowed disabled:bg-zinc-100'

const labelClassName = 'block text-sm font-medium text-zinc-800'

type KfzQuestionnaireFieldsProps = {
  questionIds: readonly string[]
  answers: Record<string, string>
  disabled?: boolean
  formId: string
  onChange: (questionId: string, value: string) => void
}

function RequiredMark() {
  return (
    <span className="text-red-700" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

function UnknownButton({
  disabled,
  selected,
  onClick,
}: {
  disabled: boolean
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`mt-2 text-sm font-medium underline-offset-2 hover:underline ${
        selected ? 'text-[#003781]' : 'text-zinc-600'
      }`}
    >
      {KFZ_ANSWER_UNKNOWN_LABEL}
    </button>
  )
}

function QuestionField({
  question,
  value,
  disabled,
  formId,
  onChange,
}: {
  question: KfzQuestionDefinition
  value: string
  disabled: boolean
  formId: string
  onChange: (value: string) => void
}) {
  const inputId = `${formId}-${question.id}`
  const unknownSelected = value === KFZ_ANSWER_UNKNOWN

  if (question.kind === 'choice') {
    return (
      <fieldset className="space-y-2">
        <legend className="text-base font-semibold text-zinc-900">
          {question.prompt}
          {question.required ? <RequiredMark /> : null}
        </legend>
        {question.hint ? <p className="text-sm text-zinc-600">{question.hint}</p> : null}
        <div className="grid gap-2">
          {(question.options ?? []).map((option) => {
            const selected = value === option.id
            return (
              <label
                key={option.id}
                className={`relative flex min-h-12 cursor-pointer items-center rounded-2xl border px-4 py-3 text-base font-medium transition ${
                  selected
                    ? 'border-[#0050aa] bg-[#eaf3ff] text-[#003781] ring-1 ring-[#0050aa]'
                    : 'border-zinc-200 bg-white text-zinc-900 hover:border-[#8eb6e5] hover:bg-[#f8fbff]'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  className="sr-only"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onChange(option.id)}
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
    )
  }

  const inputType = question.kind === 'date' ? 'date' : 'text'

  return (
    <div>
      <label className={labelClassName} htmlFor={inputId}>
        {question.prompt}
        {question.required ? <RequiredMark /> : null}
      </label>
      {question.hint ? (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{question.hint}</p>
      ) : null}
      <input
        id={inputId}
        name={question.id}
        type={unknownSelected ? 'text' : inputType}
        inputMode={question.inputMode}
        disabled={disabled}
        maxLength={question.maxLength}
        placeholder={question.placeholder}
        className={fieldClassName}
        value={unknownSelected ? KFZ_ANSWER_UNKNOWN_LABEL : value}
        onChange={(event) => onChange(event.target.value)}
      />
      <UnknownButton
        disabled={disabled}
        selected={unknownSelected}
        onClick={() => onChange(unknownSelected ? '' : KFZ_ANSWER_UNKNOWN)}
      />
    </div>
  )
}

export function KfzQuestionnaireFields({
  questionIds,
  answers,
  disabled = false,
  formId,
  onChange,
}: KfzQuestionnaireFieldsProps) {
  return (
    <div className="space-y-5">
      {questionIds.map((questionId) => {
        const question = getKfzQuestion(questionId)
        if (!question) {
          return null
        }
        return (
          <QuestionField
            key={question.id}
            question={question}
            value={answers[question.id] ?? ''}
            disabled={disabled}
            formId={formId}
            onChange={(value) => onChange(question.id, value)}
          />
        )
      })}
    </div>
  )
}
