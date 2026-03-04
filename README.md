# Sumrzr – Din Lokala AI-Mötessummerare

Sumrzr är en integritetsfokuserad, blixtsnabb applikation för att summera mötesanteckningar och tunga textfiler – helt lokalt på din egen dator. Inga molntjänster, inga prenumerationer och dina data lämnar aldrig din enhet.

Appen har ett noga utvalt retro-terminalgränssnitt och drivs av kraftfulla småspråksmodeller (SLM) som laddas ner automatiskt.

## Huvudfunktioner
- **100% Privat:** All AI-inferens (slutsatsdragning) sker på din lokala hårdvara (M-chip på Mac eller Vulkan på Windows).
- **Auto-nedladdning av Modeller:** Vid första starten hämtas automatiskt **Gemma 3n E2B (Q4_K_M)** för att systemet snabbt ska bli redo. Du kan även ladda ner och byta till **Mistral 3 3B** i inställningarna.
- **Kontext-bilagor:** Dra in eller bifoga obegränsat med tunga `.txt`-anteckningar direkt i chatten för att låta AI:n läsa och förstå dem utan att fylla din skärm med enorma textblock.
- **Sömlös Kopiering:** Med en klickning på kopiera-knappen kan du snabbt spara ut Summerings-resultat till urklippet.
- **Enkel Sessionshantering:** All historik sparas och du byter enkelt session via sidopanelen.

## Teknikstack
- **Frontend / Kärna:** [Tauri](https://tauri.app/), React, Vite och TypeScript.
- **AI Backend:** Rust via den ruggigt snabba `llama-cpp-2` containern, som i sin tur pratar med `llama.cpp` för Metal / Vulkan-accelerering.

## Utveckling
Tauri använder Node.js och Rust. För att bygga applikationen lokalt:

1. Säkerställ att du har de senaste paketen installerade:
```bash
npm install
```
2. Starta utvecklingsmiljön:
```bash
npx tauri dev
```
3. Kompilera för release:
```bash
npm run tauri build
```
*(Se nedan för detaljer om vilka features som krävs för respektive operativsystem).*

## Plattformar
Applikationen byggs automatiserat via GitHub Actions och drar nytta av hårdvaruacceleration för AI-modellerna:
- **macOS:** Byggd mot Apple Metal (`--features metal`).
- **Windows:** Byggd mot Vulkan (`--features vulkan`). Vulkan SDK måste finnas tillgängligt i byggmiljön.
