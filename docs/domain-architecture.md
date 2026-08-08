# AgenturOS – Domain-Architektur (eingefroren)

Produkt- und Infrastrukturentscheidung. Gilt als langfristige Produktarchitektur.

## V1 (aktuell)

| Host / Adresse | Rolle |
|---|---|
| `app.artkus.de` | **Einzige** Anwendung: UI, Login, interne API-Routen |
| `app.artkus.de/api/*` | Sämtliche Webhooks und internen API-Endpunkte |
| `info@artkus.de` | Öffentliche AgenturOS-Eingangsadresse (E-Mail-Quelle) |

`api.artkus.de` wird in V1 **bewusst nicht** eingeführt.

## Architekturregel (Heute)

```text
artkus.de
└── app.artkus.de
      ├── UI
      ├── Login
      └── /api/*

Mail:
info@artkus.de
```

## Spätere Evolutionsstufe (optional)

`api.artkus.de` nur dann, wenn wirklich nötig für:

- öffentliche APIs
- Partner-Integrationen
- getrennte Infrastruktur
- eigene Skalierung

Bis dahin bleibt `app.artkus.de` die einzige technische Anwendung.

Einführung von `api.artkus.de` erfolgt ohne Produktbruch an UI oder `info@artkus.de` (Alias/Routing/URL-Umstellung der Maschinen-Clients).

## Abgrenzung

- Kein IMAP, kein Root-MX-Opfer für Receiving
- Technische Receiving-Adressen (z. B. Resend) sind **kein** Produktbestandteil
- Apex/`www` können Marketing/Redirect sein — nicht die Arbeitsanwendung
