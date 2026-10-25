# AquaVant – nettside (aquavant.no)

## Kort fortalt (for deg som ikke koder)

Tre kommandoer er alt du trenger. Åpne Terminal i denne mappen (høyreklikk mappen `Nettside` i Finder → «Ny terminal ved mappe») og skriv:

| Kommando | Hva den gjør |
|---|---|
| `npm start` | Viser nettsiden på http://localhost:8090 mens du jobber |
| `npm run build` | Oppdaterer de ferdige sidene etter en endring |
| `npm run check` | Bygger og sjekker hele nettsiden: døde lenker, manglende bilder og andre feil. Står det «All good» til slutt, er alt i orden |

Tommelfingerregler som hindrer problemer:
- **Tekst endres i `content/`** (eller i redigeringsverktøyet, se «Endre tekst»), aldri i `public/`. `public/` lages på nytt hver gang og overskrives.
- **Endre alltid begge språk** (`en` og `no`).
- **Kjør `npm run check` før du publiserer.**
- **Ikke flytt eller gi nytt navn til filer i `public/assets/`.** Sidene peker på dem.
- Trenger du bare Node.js (gratis, nodejs.org). Kjør `npm install` én gang i denne mappen før første bygg. Det henter bildeverktøyet (sharp) som komprimerer opplastede bilder.


Ny versjon bygget fra bunnen av, inspirert av inflect.co.uk: mørk videohero, blått budskapsbånd, animert popup-meny, en fast «Talk to us»-fane i høyre kant, store avrundede blokker og en karusell for MicroVant-serien.

Siden er på engelsk (rot) og norsk (`/no/`), med fem hovedsider per språk: Home, Technology, Services, About og Contact. I tillegg finnes personvernside og 404-side.

## Mapper

| Sti | Innhold |
|---|---|
| `content/en/*.json`, `content/no/*.json` | All synlig tekst, én fil per side og språk, pluss SEO-tittel og -beskrivelse |
| `content/site.json` | E-postadresser, org.nr. og LinkedIn-lenke (gjelder alle sider) |
| `content/images.json` | Hvilke bilder som brukes (fotoene, portrettene og delingsbildet), med bildetekst for Google og skjermlesere |
| `.pages.yml` | Oppsettet for redigeringsverktøyet Pages CMS: hvilke felt kunden ser |
| `src/pages/en/*.html`, `src/pages/no/*.html` | Oppsettet (HTML) for hver side. Teksten hentes inn fra `content/` der det står `{{t.seksjon.felt}}` |
| `build.mjs` | Felles meny, bunntekst, SEO-tagger, språkbytte og sitemap. Lager ferdige sider i `public/` |
| `public/` | Den ferdige nettsiden. Det er denne mappen som publiseres |
| `public/assets/` | CSS, JavaScript, fonter, logoer, bilder og video |
| `serve.mjs` | Lokal forhåndsvisning (`npm start`) |
| `tools/check.mjs` | Sjekker hele nettsiden (`npm run check`) |
| `package.json` | Navnene på kommandoene over |

## Endre tekst

**Enklest: i nettleseren med Pages CMS** (https://app.pagescms.org). Logg inn med GitHub, velg `aquavant-nettside`, velg side og språk, endre teksten i feltene og trykk **Save**. Netlify publiserer endringen automatisk i løpet av et par minutter. Alle tidligere versjoner ligger i GitHub og kan hentes tilbake.

**På egen maskin:**
1. Endre teksten i `content/en/<side>.json` eller `content/no/<side>.json`. E-post, org.nr. og LinkedIn ligger i `content/site.json`.
2. Kjør `npm run check`. Det bygger sidene og sjekker at alt virker.
3. Se resultatet med `npm start` og åpne http://localhost:8090.
4. Lagre til GitHub (commit og push). Netlify publiserer automatisk.

Vil du endre selve oppsettet (nye seksjoner, flere felt), endres `src/pages/` og `content/` sammen, og `.pages.yml` må få de nye feltene. Meny- og bunntekstord ligger i toppen av `build.mjs`.

Husk å endre begge språk når innholdet endres.

## Før lansering – gjenstår

- **Org.nr.** står som `[000 000 000]`. Fyll inn under «Company details» i Pages CMS (eller `orgno` i `content/site.json`).
- **LinkedIn**: fyll inn selskapets side under «Company details» (eller `linkedin` i `content/site.json`).
- **Portretter**: Kjetil Fyrand har portrett (`public/assets/img/team/kjetil-fyrand.jpg`, originalen ligger i `Bilder/Team/` i prosjektmappen). Cheng Xu vises fortsatt med initialer. Legg bilder i `public/assets/img/team/` (stående, ca. 600 × 750 px) og bytt `<div class="portrait">KF</div>` med `<div class="portrait"><img src="{{root}}assets/img/team/kjetil-fyrand.jpg" alt="Kjetil Fyrand" width="600" height="750"></div>` på About-sidene.
- **Personvernerklæringen**: dato («sist oppdatert») og lagringstid står i [hakeparentes] og må bekreftes av AquaVant.
- **Godkjenning av tekst**: all tekst bygger på materialet fra kunden. AquaVant må godkjenne alt om teknologien, produktnavnene og grunnleggerne. Punktlistene under hver tjeneste på Services-siden er forslag og må bekreftes spesielt.
- **Bilder**: bildene er AI-genererte (Yapper Soul 2). Vurder å bytte til ekte foto når det finnes.

Fortrolige tall fra kunden er bevisst holdt utenfor nettsiden.

## Bilder

Fotoene, portrettene av Kjetil og Cheng og delingsbildet kan byttes under **Images** i Pages CMS. Opplastede bilder havner i `public/assets/img/uploads/`, og byggesteget lager komprimerte kopier i riktig størrelse i `public/assets/img/cms/` (beskåret til 4:5 for portretter og 1200 × 630 for delingsbildet). Uten bilde vises initialene i portrettet. Hvalanimasjonen, havvideoen og logoene kan ikke byttes i verktøyet.

## Kontaktskjemaet

Skjemaet sendes til Netlify Forms (gratis, uten kredittbruk). Netlify lagrer meldingen og sender den på e-post til begge grunnleggerne. Oppsettet ligger i Netlify under **Forms**: «form detection» må være slått på, og e-postvarsler ligger under **Form notifications**. Innsendte meldinger kan leses og slettes samme sted. Et skjult felt (`bot-field`) stopper det meste av spam.

## Lansering på Netlify

1. Opprett en gratis konto på netlify.com med AquaVants e-post, slik at kunden eier kontoen.
2. **Anbefalt:** legg mappen i et GitHub-repo og koble det til Netlify. Netlify leser `netlify.toml`, kjører `node build.mjs` og publiserer `public/` automatisk ved hver endring.
3. **Uten GitHub:** kjør `node build.mjs` lokalt og dra `public`-mappen inn under Sites → «Deploy manually».
4. Koble til domenet under Domain management. HTTPS kommer automatisk.
5. Kontaktskjemaet trenger ikke oppsett: det åpner besøkerens eget e-postprogram med en ferdig melding til både Kjetil og Cheng (begge i «Til»-feltet). Adressene styres av `EMAIL` og `EMAIL2` øverst i `build.mjs`.

Besøkende med norsk nettleserspråk sendes til `/no/` når de går til forsiden. Språkvelgeren i menyen fungerer uansett.

## Teknisk

- Ren HTML, CSS og JavaScript. Ingen rammeverk og ingen CMS-lisens. Eneste eksterne kode er Lenis 1.3.4 (myk scrolling, MIT-lisens), lagret lokalt i `assets/js/vendor/`. Myk scrolling gjelder mus og styreflate; på mobil brukes telefonens egen scrolling, og den slås av ved «reduser bevegelse». Varigheten styres av `duration` øverst i `main.js`.
- Fonter (Sora og IBM Plex Sans, Open Font License) og video er selvhostet. Ingen informasjonskapsler eller sporing, så det trengs ikke cookie-banner.
- Herovideoen er komprimert fra 10,5 MB til 1,5 MB (720p, uten lyd). Den har pauseknapp og viser stillbilde ved «reduser bevegelse» eller datasparing.
- Toppmenyen (headeren) glir opp og ut av syne når man scroller ned, og glir inn igjen så snart man scroller opp (etter modell av Inflect, 0,8 sek). Bakgrunnen er «frostet glass» som hos Inflect: havblå med 80 % dekkevne og uskarphet, slik at siden skimtes gjennom, og headeren beholder samme størrelse hele tiden. Den vises alltid helt øverst på siden, når menyen er åpen og når man tabber inn i den med tastaturet.
- Menyen (etter modell av Leome & Partners) dekker hele skjermen: panelet rulles ned ovenfra, og lenkene stiger opp én etter én og retter seg ut. Ved hover dempes de andre lenkene og bokstavene ruller. Knappen viser «Menu»/«Meny» med et ikon som blir til et kryss. Logo og språkvalg er synlige mens menyen er åpen. Den lukkes med knappen eller Esc, og tastaturfokus holdes inne i menyen. Animasjonen ligger i `styles.css`, åpning og lukking i `main.js`.
- Scroll-animasjoner etter modell av Inflect: overskrifter stiger inn ord for ord, tekst og lister glir inn fra høyre som menylenkene, bokser og blokker stiger rolig opp på plass, bilder avdekkes av et «teppe» som trekkes opp nedenfra (i full størrelse, uten at kanter eller bilde vokser), bilder har en rolig parallakse, og budskapsteksten på det blå båndet fylles fra lyseblått til hvitt bokstav for bokstav når man scroller. Animasjonene kan reverseres (etter modell av Rothfinder): scroller man opp igjen, spilles de baklengs når elementet forsvinner nederst på skjermen, og de spilles på nytt når man scroller ned. Ut-animasjonen er litt raskere enn inn-animasjonen. Ingen ekstra HTML trengs: `main.js` finner elementene selv.
- Knapper etter modell av Inflect, kun i lyseblått, mørkeblått og hvitt (aldri kobber): kantete (5 px hjørner), fet tekst og romslig luft. Ved hover feier en ny farge opp fra bunnen mens teksten ruller opp og en kopi ruller inn nedenfra. Knappene «popper» inn når de scrolles fram. `main.js` bygger lagene selv, så knappene skrives fortsatt som vanlig `<a class="btn">Tekst</a>`.
- Typografihierarkiet følger Inflect, skalert fra deres 14 px brødtekst til 16 px: H1 ca. 53 px, H2 40 px, kortoverskrifter 22 px, fet «pretitle» over overskrifter på 22 px, halvfet introtekst på 20 px under sideoverskriftene, og stram linjeavstand (1,1 på store overskrifter). Størrelsene ligger som variabler øverst i `styles.css`.
- MicroVant-karusellen bytter lysbilde etter modell av Inflect: bildet viskes bort fra siden og avslører neste bilde under, den gamle teksten løftes ut, og den nye stiger inn linje for linje mens statusmerket «popper» inn. Karusellen går i ring begge veier, med piler og piltaster.
- Hvalsekvensen på forsiden (etter modell av Seasats): heroen står fast mens man scroller, havvideoen går rolig under, og en halefinne hever seg av vannet bilde for bilde til den står som V-en i logoen. Når halen står, glir det blå båndet opp over heroen mens halen fortsatt beveger seg, så den aldri står som et frosset bilde. Båndet dekker skjermen akkurat når siste ramme er nådd (`margin-top: -100svh` i `styles.css`). Bildene ligger i `assets/whale/` (168 rammer, hver eneste ramme fra de første 7 sekundene av klippet, AVIF ca. 4,5 MB med JPEG som reserve). Scrollen glir mykt mot målet og nabobilder blandes, så bevegelsen blir jevn. Mykheten styres av `LAG` i `main.js`. De lastes grovt først og fylles inn etter hvert, så sekvensen virker nesten med en gang. Kildeklippet (Veo 3.1) ligger i `Video/Hvalhale Veo (brukt på nettsiden).mp4` i prosjektmappen. Et alternativt Kling-klipp ligger ved siden av. Lager man et nytt klipp, eksporterer man nye rammer med samme filnavn (`frame-001` … `frame-168`) og justerer `data-count` i `index.html` om antallet endres. Ved «reduser bevegelse» eller datasparing vises vanlig hero uten sekvens.
- Alle animasjoner slås av ved «reduser bevegelse», og menyen får en kort fade i stedet. Uten JavaScript vises alt som vanlig.
- Bildene (fjord, vaksinering, emulsjon, lab, produksjon, forsøk) er generert med Soul 2 i Yapper i en filmatisk stil: lavt gyllent sollys, turkis himmel, varm hudtone og filmkorn. Alle 24 varianter ligger i `Bilder/` i prosjektmappen (valgte bilder i `Nettsidebilder`, de andre i `Soul 2 – andre varianter`), de gamle bildene i `Arkiv/Gamle bilder/`. Toppbildene på undersidene vises nå i full farge med en myk havblå gradient bak teksten.
- Lenkene til `styles.css`, `main.js` og Lenis får et fingeravtrykk (`?v=…`) ved hver bygging, så besøkende alltid får nyeste versjon selv om filene caches i en uke. Husk derfor å kjøre `npm run build` etter endringer i CSS eller JS.
- Kontrast er sjekket mot WCAG AA. Skjemaet har synlige etiketter, feilmeldinger ved feltene og tastaturstøtte.
- SEO: unik tittel og beskrivelse per side og språk, `hreflang`, canonical, Open Graph, strukturerte data (Organization med merkevaren MicroVant, brødsmuler), `sitemap.xml` med begge språk og `robots.txt`.

## Løpende kostnader

- Hosting: 0 kr på Netlifys gratisnivå for en så liten side. Sjekk gjeldende grense for skjemainnsendinger på netlify.com/pricing.
- Domene: årlig avgift til domeneregistrar.
- Lisenser og plugins: ingen.
