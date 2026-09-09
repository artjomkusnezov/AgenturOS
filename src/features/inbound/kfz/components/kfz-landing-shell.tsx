import {
  ArrowRight,
  Check,
  Clock3,
  Languages,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
} from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'

import {
  KFZ_LANDING_ADDRESS,
  KFZ_LANDING_AGENCY_NAME,
  KFZ_LANDING_AGENCY_URL,
  KFZ_LANDING_CONTACT_EMAIL,
  KFZ_LANDING_CONTACT_PHONE,
  KFZ_LANDING_CONTACT_PHONE_E164,
  KFZ_LANDING_IMPRINT_URL,
  KFZ_LANDING_PRIVACY_URL,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'

type KfzLandingShellProps = { children: ReactNode }

const whatsappUrl = `https://wa.me/${KFZ_LANDING_CONTACT_PHONE_E164.replace('+', '')}`

/** Öffentliche Kfz-Landingpage für Allianz Kusnezov / Lengerich. */
export function KfzLandingShell({ children }: KfzLandingShellProps) {
  return (
    <div lang="de" className="min-h-full flex-1 overflow-x-hidden bg-white text-[#171717]">
      <header className="border-b border-[#d9e1ea] bg-white">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href={KFZ_LANDING_AGENCY_URL} target="_blank" rel="noreferrer" aria-label="Allianz Kusnezov auf allianz.de">
            <Image src="/kfz/allianz-logo.svg" width={154} height={40} alt="Allianz" priority className="h-auto w-[128px] sm:w-[154px]" />
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href={`tel:${KFZ_LANDING_CONTACT_PHONE_E164}`} className="hidden min-h-11 items-center gap-2 rounded-full border border-[#c8d4e2] px-4 text-sm font-semibold text-[#003781] transition hover:border-[#003781] hover:bg-[#f2f6fa] sm:inline-flex">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {KFZ_LANDING_CONTACT_PHONE}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#007a50] px-4 text-sm font-semibold text-white transition hover:bg-[#006543]">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">WhatsApp</span>
              <span className="sm:hidden">Kontakt</span>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 pt-4 sm:px-6 sm:pt-6" aria-labelledby="kfz-hero-title">
          <div className="relative mx-auto min-h-[590px] max-w-7xl overflow-hidden rounded-[1.75rem] bg-[#002f6c] sm:min-h-[620px] sm:rounded-[2.25rem]">
            <Image src="/kfz/lengerich-roemer-hero.webp" alt="Der Römer in Lengerich mit Kirche und einem Familienauto" fill priority sizes="(max-width: 768px) 100vw, 1280px" className="object-cover object-[64%_center] sm:object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,36,89,.98)_0%,rgba(0,43,98,.9)_38%,rgba(0,38,83,.25)_72%,rgba(0,20,48,.2)_100%)] sm:bg-[linear-gradient(90deg,rgba(0,36,89,.98)_0%,rgba(0,43,98,.86)_43%,rgba(0,38,83,.18)_72%,rgba(0,20,48,.08)_100%)]" />
            <div className="relative z-10 flex min-h-[590px] max-w-2xl flex-col justify-center px-6 py-14 text-white sm:min-h-[620px] sm:px-12 lg:px-16">
              <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3.5 py-2 text-sm font-medium backdrop-blur-sm">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Persönlich in Lengerich
              </div>
              <h1 id="kfz-hero-title" className="max-w-xl text-4xl font-semibold leading-[1.06] tracking-[-0.035em] sm:text-6xl">Kfz-Versicherung, persönlich geprüft.</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">Kein anonymer Vergleich. Artjom und Vera prüfen Ihre Anfrage persönlich und melden sich mit einer passenden Einschätzung.</p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <a href="#kfz-anfrage" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-[#003781] shadow-lg shadow-black/10 transition hover:bg-[#eef5ff] sm:w-auto">
                  Kfz-Check starten <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </a>
                <p className="text-sm font-medium text-white/85">Kostenlos · unverbindlich · ca. 2 Minuten</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-px px-5 py-5 sm:grid-cols-3 sm:px-8 sm:py-7" aria-label="Ihre Vorteile">
          <TrustItem icon={<ShieldCheck />} title="Persönlich geprüft" text="Keine automatische Tarifausgabe" />
          <TrustItem icon={<Clock3 />} title="Schnelle Rückmeldung" text="In der Regel innerhalb eines Werktags" />
          <TrustItem icon={<Languages />} title="Drei Sprachen" text="Deutsch, Russisch und Englisch" />
        </section>

        <section id="kfz-anfrage" className="scroll-mt-6 bg-[#f3f6f9] px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="kfz-form-heading">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[.78fr_1.22fr] lg:gap-16">
            <div className="lg:pt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0050aa]">Ihr Kfz-Check</p>
              <h2 id="kfz-form-heading" className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">In drei kurzen Schritten zur persönlichen Prüfung</h2>
              <p className="mt-5 text-lg leading-relaxed text-[#4a5565]">Wählen Sie zuerst Ihr Anliegen. Danach brauchen wir nur die Angaben, unter denen wir Sie erreichen können.</p>
              <ul className="mt-8 space-y-4 text-base text-[#263445]">
                <CheckItem>Keine Online-Preisgarantie</CheckItem>
                <CheckItem>Kein automatisches Tarifversprechen</CheckItem>
                <CheckItem>Unterlagen erst, wenn sie wirklich helfen</CheckItem>
              </ul>
            </div>
            <div className="rounded-[1.75rem] border border-[#d7e0ea] bg-white p-5 shadow-[0_18px_55px_rgba(0,55,129,.09)] sm:p-8">{children}</div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="team-heading">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0050aa]">Ihre Ansprechpartner</p>
              <h2 id="team-heading" className="mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">Hier prüfen Menschen, keine Maschine.</h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#4a5565]">Ihre Anfrage landet direkt bei uns in Lengerich. Wir schauen auf Ihre Situation und melden uns auf dem Weg, den Sie ausgewählt haben.</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Person image="/kfz/artjom-kusnezov.png" name="Artjom Kusnezov" languages="Deutsch · English · Русский" />
                <Person image="/kfz/vera-kusnezov.png" name="Vera Kusnezov" languages="Deutsch · Русский · English" />
              </div>
            </div>
            <a href={KFZ_LANDING_AGENCY_URL} target="_blank" rel="noreferrer" className="rounded-[1.75rem] border border-[#d7e0ea] bg-white p-7 shadow-[0_16px_45px_rgba(0,55,129,.08)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(0,55,129,.12)]">
              <p className="text-sm font-semibold text-[#4a5565]">Google Bewertungen</p>
              <div className="mt-4 flex items-end gap-3"><strong className="text-5xl font-semibold tracking-tight">4,9</strong><span className="pb-1 text-sm text-[#4a5565]">von 5</span></div>
              <div className="mt-3 flex gap-1 text-[#f5b700]" aria-label="5 von 5 Sternen">{[0, 1, 2, 3, 4].map((star) => <Star key={star} className="h-6 w-6 fill-current" aria-hidden="true" />)}</div>
              <p className="mt-4 font-medium text-[#263445]">48 Bewertungen</p>
              <p className="mt-2 text-sm text-[#5b6675]">Bewertungen auf dem offiziellen Agenturprofil ansehen</p>
            </a>
          </div>
        </section>

        <section className="bg-[#eef4fb] px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="faq-heading">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[.65fr_1fr]">
            <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0050aa]">Gut zu wissen</p><h2 id="faq-heading" className="mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">Häufige Fragen</h2><p className="mt-5 text-lg leading-relaxed text-[#4a5565]">Die wichtigsten Antworten, bevor Sie Ihre Anfrage senden.</p></div>
            <div className="divide-y divide-[#cbd8e6] border-y border-[#cbd8e6]">
              <Faq question="Kostet die Prüfung etwas?">Nein. Die erste Prüfung Ihrer Anfrage ist kostenlos und unverbindlich.</Faq>
              <Faq question="Muss ich anschließend wechseln?">Nein. Aus der Anfrage entsteht keine Verpflichtung zum Abschluss oder Wechsel.</Faq>
              <Faq question="Wann erhalte ich eine Rückmeldung?">Wir melden uns in der Regel innerhalb eines Werktags per WhatsApp, Telefon oder E-Mail.</Faq>
              <Faq question="Brauche ich sofort Unterlagen?">Nein. Der Upload ist optional. Wir fragen gezielt nach, falls Fahrzeugschein oder Beitragsrechnung für die Prüfung helfen.</Faq>
              <Faq question="Wie werden meine Daten verwendet?">Ausschließlich zur Bearbeitung Ihrer Kfz-Anfrage und zur Kontaktaufnahme dazu.</Faq>
            </div>
          </div>
        </section>

        <section className="bg-[#003781] px-5 py-14 text-white sm:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
            <div><p className="text-2xl font-semibold tracking-tight">Lieber direkt sprechen?</p><p className="mt-2 text-white/80">Artjom und Vera sind in Lengerich für Sie da.</p></div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a href={`tel:${KFZ_LANDING_CONTACT_PHONE_E164}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-[#003781]"><Phone className="h-5 w-5" aria-hidden="true" />{KFZ_LANDING_CONTACT_PHONE}</a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/50 px-5 font-semibold text-white hover:bg-white/10"><MessageCircle className="h-5 w-5" aria-hidden="true" />WhatsApp</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#07254c] px-5 py-10 text-sm text-white/75 sm:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-7 md:grid-cols-[1fr_auto] md:items-end">
          <div><p className="font-semibold text-white">{KFZ_LANDING_AGENCY_NAME} · Artjom Kusnezov Hauptvertretung</p><p className="mt-2">{KFZ_LANDING_ADDRESS}</p><p className="mt-1"><a href={`mailto:${KFZ_LANDING_CONTACT_EMAIL}`} className="hover:text-white">{KFZ_LANDING_CONTACT_EMAIL}</a></p></div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Rechtliche Hinweise">
            <a href={KFZ_LANDING_AGENCY_URL} target="_blank" rel="noreferrer" className="hover:text-white">Agenturprofil</a>
            <a href={KFZ_LANDING_IMPRINT_URL} target="_blank" rel="noreferrer" className="hover:text-white">Impressum</a>
            <a href={KFZ_LANDING_PRIVACY_URL} target="_blank" rel="noreferrer" className="hover:text-white">Datenschutz</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function TrustItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-3 border-b border-[#d9e1ea] py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0"><span className="text-[#0050aa] [&>svg]:h-6 [&>svg]:w-6" aria-hidden="true">{icon}</span><div><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-sm text-[#5b6675]">{text}</p></div></div>
}

function CheckItem({ children }: { children: ReactNode }) {
  return <li className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dcecff] text-[#0050aa]"><Check className="h-4 w-4" aria-hidden="true" /></span>{children}</li>
}

function Person({ image, name, languages }: { image: string; name: string; languages: string }) {
  return <div className="flex min-w-[250px] items-center gap-4 rounded-2xl bg-[#f3f6f9] p-3 pr-5"><Image src={image} alt={name} width={72} height={72} className="h-[72px] w-[72px] rounded-xl object-cover" /><div><p className="font-semibold">{name}</p><p className="mt-1 text-xs leading-relaxed text-[#5b6675]">{languages}</p></div></div>
}

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return <details className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-semibold"><span>{question}</span><span className="text-2xl font-light text-[#0050aa] transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-3 max-w-2xl pr-10 leading-relaxed text-[#4a5565]">{children}</p></details>
}
