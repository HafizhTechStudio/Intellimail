# KI E-Mail Beschwerde-Analyse Dashboard

Dashboard zur KI-gestützten Analyse von Kunden-E-Mails und Beschwerden. Dieses System kategorisiert automatisch eingehende E-Mails, analysiert die Stimmung und ordnet sie entsprechenden Filialen zu.

## Features

- Automatisierte Analyse von EML- und MSG-Dateien
- Stimmungsanalyse (Sentiment Analysis)
- Kategorisierung und Filialzuordnung
- Detaillierte Statistiken und Berichte
- KI-gestützte Zusammenfassungen

## Installation

```bash
npm install
```

## Environment Setup

Erstellen Sie eine `.env.local` Datei im Wurzelverzeichnis und fügen Sie Ihren API-Key hinzu:

```env
GEMINI_API_KEY=Ihr_Gemini_API_Key

Standardmäßig wird gemini-3-pro-preview verwendet. 
Falls dieses Modell in Ihrem Konto nicht verfügbar ist, passen Sie den Modellnamen in api/analyze-email.ts 
entsprechend an (z.B. gemini-flash-latest oder ein anderes in Google AI Studio verfügbares Modell).
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
