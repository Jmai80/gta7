# CLAUDE.md – GTA 7 (github.com/Jmai80/gta7)

Det här är startpunkten för en ny Claude Code-session, i molnet (claude.ai/code) eller lokalt. Claude Code läser in filen automatiskt när en session startar i repot. Läs hela filen och sedan `docs/HANDOFF.md`, som har alla detaljer: arkitektur, varje uppdrag, platser och koordinater, tester, fallgropar och versionshistorik.

Senast uppdaterad 10 oktober 2026, efter version 1.2 (huvuduppdragets del 9 Cykelgömman i grannen Birgers hus och sidouppdraget Cyklarna hem; den senaste buggfixen, Långhoppet i 1.1.1, står i avsnitt 4). Det finns ingen känd öppen bugg just nu.

---

## 0. Så startar du en ny session (för dig som äger projektet)

1. Gå till **claude.ai/code** och logga in. Den första gången ber sidan dig koppla GitHub. Följ stegen och godkänn på GitHub.
2. Om repot är privat: installera Claude GitHub-appen på ditt GitHub-konto och ge den tillgång till `gta7` (sidan erbjuder det under kopplingen). Ett publikt repo går att använda direkt.
3. Använd miljön **Default**, vars nätverksnivå heter **Trusted**. Den når npm, PyPI och GitHub, vilket räcker för testerna.
4. Välj repot **Jmai80/gta7** i väljaren under textrutan och skriv uppgiften, till exempel:

   > Läs CLAUDE.md och docs/HANDOFF.md. Sedan: <beskriv vad du vill ha, t.ex. "bygg nästa del i huvuduppdraget: Birger kommer hem" eller "när jag gör X händer Y, men det borde bli Z">. Testa i Node och i webbläsaren, höj versionen, uppdatera dokumenten och se till att ändringen hamnar på main. Svara på svenska och skicka ett skärmdumpsark när du är klar.

   Beskriv en bugg så som du upplevde den i spelet (var du var, vad du gjorde, vad som hände). Det räcker för att hitta felet.

5. Sessionen fortsätter även om du stänger fliken. Du kan följa den från mobilen under Code-fliken i Claude-appen.

---

## 1. Projektet på en minut

- **GTA 7** ("Grovt Tillgrepp av Automobil") är ett mobilanpassat GTA-skämtspel i webbläsaren. Staden heter **Sjuby** och ön norr om stan heter **Norrholmen** (dit leder norra bron, x = 40).
- three.js 0.184 laddas från jsDelivr via `src/three.js`. Det finns **inget byggsteg**, bara vanliga ES-moduler. Allt är procedurellt: inga bild-, modell- eller ljudfiler (ljudet syntetiseras i Web Audio, typsnitten ligger i `fonts/`).
- **Simuleringen** (fysik, trafik, folk, spelare, uppdrag) är ren JavaScript utan three.js. Den kör i fast 60 Hz och testas i Node. **Renderingen** (`render.js`, `shaders.js`, `worldmesh.js`, `models.js` med flera) är separat.
- Spelet ligger på **https://jmai80.github.io/gta7/**. GitHub Pages byggs från `main`, repots rot.
- Version 1.2 innehåller:
  - huvudäventyret om receptet på Sjubybullen i åtta delar, plus del 9 om Jontes cykelgömma,
  - nio sidouppdrag,
  - Lasses trimningsbutik,
  - Kims långhopp,
  - Norrholmen med Bullbilens bageri, kvarnen, fyren och badplatsen,
  - slutskärm och sparade framsteg i `localStorage`.

## 2. Användaren och arbetssättet (följ alltid)

- **Språk:** svara på **svenska**. Kod och kodkommentarer skrivs på engelska. All text i spelet (repliker, sms, skyltar, knappar) är på svenska.
- **Användaren provspelar på mobilen via GitHub Pages.** Varje leverans ska därför hamna på **`main`**. Användaren har aldrig bett om grenar eller PR:er.
  - Om sessionen jobbar på en egen gren (claude.ai/code gör ofta det, t.ex. `claude/…`): committa och pusha grenen. Slå sedan ihop den med main: `git fetch origin && git checkout main && git pull --ff-only origin main && git merge --ff-only <grenen> && git push origin main`.
  - Får sessionen inte pusha till main: skapa en PR och be användaren klicka **Merge** på GitHub.
- **Commit-meddelande:**
  - första raden `GTA 7 vX.Y: kort beskrivning på svenska` (eller `vX.Y.Z` för en buggfix),
  - en tom rad och en punktlista på svenska om vad som ändrats,
  - sist de attributionsrader som sessionens systeminstruktioner anger (hittills `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` och `Claude-Session: <den här sessionens länk>`).
- Kör `git fetch` (och vid behov `git pull --rebase`) före push.
- **Höj versionen vid varje leverans**, se checklistan i avsnitt 6.
- **Leverans till användaren:**
  - en kort svensk sammanfattning i spelartermer: vad som är nytt, var man hittar det, hur uppdragen fungerar och när sms:en kommer i ett sparat spel,
  - ett **skärmdumpsark**: 4–5 telefonbilder (390×844) i rad med **gula bildtexter** (#ffcf33, typsnittet Big Shoulders Display från `fonts/`, som PIL läser efter konvertering från woff2 med fonttools). Skicka det som fil om sessionen har ett verktyg för det, annars lägg det i `test/shots/` och beskriv det.
- **Beslut:** användaren bestämmer i stora drag ("lägg till ett sidouppdrag inomhus", "en cykeltjuv som heter …") och låter oss hitta på detaljerna: namn, repliker, platser och upplägg. Fråga bara när något är riktigt tvetydigt.
- Användaren läser inte kod. Förklara resultatet i spelartermer, inte i filnamn.

## 3. Kom igång (första kvarten i en ny session)

Stå i repots rot för alla kommandon. I claude.ai/code är repot redan klonat. Lokalt klonar du det med `git clone https://github.com/Jmai80/gta7.git`.

```sh
git log --oneline -3                         # överst: v1.2 eller senare
npm install --no-save three@0.184.0          # three.js lokalt – bara för webbläsartesterna
npm test                                     # ~650 kontroller, 1–2 min. Ska sluta med:
                                             #   All checks passed / All extras passed / All mission checks passed
(nohup python3 -m http.server 8765 --directory "$PWD" > /dev/null 2>&1 &)   # server för webbläsartesterna
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8765/index.html   # ska ge 200
mkdir -p test/shots                          # skärmdumparna hamnar här (gitignorerad)
python3 test/browser/v12.py phone            # en genomgång (Cykelgömman): ska sluta med "V12 ok" och "logs []"
```

**Webbläsartesterna** (`test/browser/*.py`) använder Python, Playwright och Chromium med SwiftShader (mjukvaru-WebGL). Kör dem från repots rot. Webbläsaren hittas på något av tre sätt:

1. **Anthropics sandlåda** har Chromium förinstallerat (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). Kör inte `playwright install` där. Saknas Python-paketet: `pip install --break-system-packages playwright`. Klagar Playwright sedan på att webbläsaren saknas (nyare version än den förinstallerade), kör testerna med `GTA7_CHROME=/opt/pw-browsers/chromium python3 test/browser/v111.py phone`.
2. **Annars** prövar du `pip install --break-system-packages playwright` och sedan `python3 -m playwright install --with-deps chromium`.
3. **Om den nedladdningen blockeras** (Playwrights egen nedladdningsserver finns inte i Trusted-listan):
   - hämta Chrome for Testing från storage.googleapis.com, som är tillåten: `npx -y @puppeteer/browsers install chrome@stable --path /opt/chrome`,
   - peka ut den med `export GTA7_CHROME=$(ls /opt/chrome/chrome/*/chrome-linux64/chrome | head -1)`. `test/browser/cdn.py` skickar då den sökvägen till Playwright,
   - saknas systembibliotek: `python3 -m playwright install-deps chromium`.

Går inget av det: kör Node-testerna och be användaren provspela på mobilen.

Fler saker att veta om testmiljön:

- **Sandlådan når oftast inte jsDelivr.** `test/browser/cdn.py` fångar därför spelets three.js-adresser och serverar filerna från `node_modules/three/build/`. Det är därför `npm install three` behövs.
- **Servern dör ibland.** Starta om den med raden ovan om sidan inte laddar.
- **Felsökning i sidan:** `window.__gta` har:
  - `game` (hela simuleringen) och `view` (`rig`, `camera`, `setDpr`),
  - `start()`, `pause()`, `resume()`,
  - `openOffer(id)`, `nextTalk()`, `openShop()`, `buyItem(id)`,
  - `perf.apply('pretty' | 'auto' | 'saver')`.
- **Mönster i genomgångarna:** stega simuleringen med `game.step(1/60, input)` och flytta spelaren direkt. Ett sparat spel läggs i `localStorage['gta7-progress']` (`{ v: 2, money, done, known, seen, stats }`). Se `v10.py`, `v11.py` och `v111.py`.
- **Studioskript:** `beach_studio.py TAG [phone]`, `bike_studio.py TAG` och `people.py` tar närbilder med fast kamera.

## 4. Senast fixat: Långhoppet (v1.1.1)

Användaren rapporterade: "Långhoppet visar en blå lysande cirkel på parkeringen rakt över gatan från Hörnlivs. Inget händer när man går in i cirkeln."

**Orsak:**

- K:et var bara en `contact`-markör utan `Job` på (−70, 10). Ingenting reagerade när man gick in i det.
- Uppdraget klarades bara av ett bilhopp på minst 34 m på byggtomtens kicker, var som helst ifrån. Från K:ets plats räckte inte ens en rak sats utan turbo (30 m).

**Fixen:**

- `hopp` har nu ett jobb, `LongJumpJob` i `src/longjump.js`.
- K:et står i parkeringens norra ände: `JUMP_START` (−70, −24) i config.js, rakt norr om kickern. Därifrån blir en rak sats utan turbo cirka 37–38 m och med turbo cirka 44 m.
- **Till fots eller på cykel:** en toast med texten i `needCar` (`needCar` kan nu vara en egen text).
- **Med bil, i vilken fart som helst** (`fastStart`): försöket startar. Det visar mål-rutan "Hoppa minst 34 m", en gul ring över Skolgatan och en vit ring precis efter kickern.
- **Kortare hopp eller missad kicker:** "Kör tillbaka till K:et", och GPS:en leder tillbaka.
- **Avbrott:** ur bilen i mer än 5 s eller mer än 200 m bort avbryter försöket tyst med `mgr.quit`.
- `Missions.onStunt()` avslutar jobbet med `complete` när hoppet räcker. Ett långt hopp utan försöket räknas fortfarande.

**Tester:**

- `test/missions.mjs`, sektion 17b:
  - till fots,
  - start med bil, även i full fart,
  - ringarna,
  - för kort hopp och tillbaka till K:et,
  - nytt försök, 38 m och klart,
  - missad kicker,
  - avbrott när man kliver ur.
- `test/browser/v111.py` (`phone`/`land`) ska sluta med `LONGJUMP ok`.

**Simulerade hopplängder** (sedan, full gas rakt söderut längs x = −70, ingen trafik):

| Start (z) | Utan turbo | Med turbo |
|---|---|---|
| 18 | 27 m | 35 m |
| 10 | 30 m | 38 m |
| 0 | 33 m | 41 m |
| −10 | 35 m | 43 m |
| −20 | 37 m | 43 m |
| −28 | 38 m | 44 m |

34 m kräver ungefär 100 km/h vid kanten.

## 5. Karta över koden (detaljer i docs/HANDOFF.md, avsnitt 4)

| Fil | Vad |
|---|---|
| `index.html` | All CSS och alla HTML-overlays: titel, HUD, paus, uppdragskortet `#offer`, uppdragslistan `#log`, samtalsrutan `#talk`, butiken `#shop`, slutskärmen `#endcard`. Överst finns en modulepreload-lista, så **lägg till nya src-filer där**. |
| `src/main.js` | Spel-loopen och tillstånden (`title, play, pause, offer, log, talk, shop, end`). Kopplar `game.on(...)`-händelser till HUD och ljud, samtalsrutan, butiken, slutskärmen och rösterna (`VOICES`). Exponerar `window.__gta`. |
| `src/config.js` | Konstanter och platser (dörrar, markörer, belöningar), `WHO` (uppdragsgivarnas namn) och `JUMP_GOAL`/`JUMP_REWARD`/`JUMP_START`. |
| `src/layout.js` | Hela stan som data: `prims` som byggs till meshar, `colliders`, `casters` (bakade skuggor), `signs`, `ramps`, `parked`, `zones`, `floors` och GPS-grafen. Exporterar `createLayout(seed)` och materialkoderna `M`. |
| `src/island.js` | Norrholmen: kust, vägar, kolonilotter, bageri, kvarn, fyr, båthamn och badplatsen (`BEACH`, `beach()`). |
| `src/game.js` | `Game`: fordon, trafik, folk, spelaren, `step()`, `spawnBike`, `spawnRedBike` och norra brons grind. |
| `src/mission.js` | `Missions`: uppdragslistan `QUESTS`, sms-erbjudanden, `checkJobs` (markörer som startar jobb), mål-rutan, `updateTargets`, spara och ladda, Lasses butik, `onStunt` (Långhoppet), `activities` (stunthopp, biltvätt) och slutskärmen. |
| Uppdragsfiler | `pizza.js`, `race.js` (gatloppet, ringar), `longjump.js` (Långhoppet), `hideout.js` (Cykelgömman) och `birger.js` (Birgers hus), `bikeshome.js` (Cyklarna hem), `flag.js`, `samuel.js` (Melker), `handover.js`, `bikejob.js` (inkl. jakt-AI:n `Chaser`), `livs.js`, `leif.js`, `safe.js`, `opening.js`, `jar.js`, `factory.js`, `errands.js`, `barber.js` och `salon.js` (Vera), `fest.js` och `sander.js` (Jonte). |
| `src/vehicle.js`, `traffic.js`, `peds.js`, `player.js`, `collide.js`, `route.js` | Fordonsfysik, trafik-AI, fotgängare och människornas stilar, spelaren, kollisioner och `groundHeight`, kortaste väg för GPS-linjen. |
| `src/render.js`, `shaders.js`, `worldmesh.js`, `models.js`, `beach.js`, `trees.js`, `geom.js`, `textures.js`, `hud.js`, `audio.js` | Grafik, modeller (bilar, cyklar, människomodellen), badplatsens saker, `GeomBuilder`, skuggkarta och skyltatlas, HUD med minikarta och GPS-linje, ljud. |
| `test/sim.mjs`, `test/extras.mjs`, `test/missions.mjs` | Node-testerna (`npm test`). Följ stilen `check(ok, 'beskrivning')`. Varje uppdrag har en egen sektion i `missions.mjs`. |
| `test/browser/` | Webbläsargenomgångar per version (`v02.py` … `v11.py`, `v111.py`, `v12.py`) och studioskript. |
| `docs/HANDOFF.md` | Den långa överlämningen. Håll den uppdaterad. |

**Namn i koden kontra i spelet:** Melker hette Samuel, Jonte hette Sander och Vera hette Fia (bytt i v1.1). Koden behåller de gamla id:na så att sparade spel fungerar:

- uppdragen `samuel`, `cykelretur` och `salong`,
- filerna `samuel.js`, `sander.js` och `barber.js` (med `FIA`),
- `WHO.samuel` och `WHO.fia`, `SANDER_LOOK` och `party.sander`.

Allt som syns i spelet ska använda de nya namnen.

## 6. Leveranschecklista

1. `npm test` är grönt (alla tre raderna "passed").
2. En webbläsargenomgång av det du ändrat, i `phone` (390×844) och gärna `land` (844×390). Kontrollera att den slutar med `logs []` och **titta på skärmdumparna**.
3. Versionen är höjd på alla ställen (`X.Y` för nytt innehåll, `X.Y.Z` för en buggfix):
   - `package.json`: `"version": "X.Y.Z"`,
   - `index.html`:
     - `<div class="ver">Version X.Y · Sjuby och Norrholmen</div>`,
     - slutskärmen `#endcard`: `aria-label="Version X.Y klar"` och "Det var version X.Y." i `.note`,
   - `src/mission.js` `checkAllDone()`: två sms med "Det var allt i version X.Y!",
   - `test/missions.mjs`: de två regexarna `/version X\.Y/` som hör till sms:en,
   - `README.md`: första stycket ("Version X.Y är …") och rubriken "## Uppdrag i version X.Y",
   - `docs/HANDOFF.md`: raden "Senast uppdaterad", versionshistoriken i avsnitt 9 och allt som ändrats,
   - den här filen, om något i den blivit fel.
4. Commit enligt formatet i avsnitt 2, `git fetch`, push så att det hamnar på `main`.
5. **GitHub Pages:**
   - kör `gh run list -R Jmai80/gta7 -L 2 --json headSha,status,conclusion,createdAt`. Den nya committen ska ha `conclusion: success`, oftast inom 1–2 minuter,
   - om `headSha` visar en äldre commit: jämför `createdAt` med commit-tiden,
   - startar inget bygge inom cirka 5 minuter: pusha en tom commit (`git commit --allow-empty -m "…"`),
   - `gh` finns i claude.ai/code-sessioner. Saknas det: be användaren titta på sidan.
6. Den svenska sammanfattningen och skärmdumpsarket (avsnitt 2).

## 7. De viktigaste fallgroparna (fler i docs/HANDOFF.md, avsnitt 8)

- **Determinism:** testerna förutsätter att spelets slump `g.rng` dras i samma ordning. Nya saker som spawnar vid start ändrar sekvensen och bryter gamla tester. Spawna lat eller använd egna hash-slumpar (som `dressUp` i peds.js).
- **Layoutens slump `R`** i layout.js och island.js får inte användas av nytt innehåll före träden, annars flyttar sig träd och annat i hela stan. Använd `hash(i)` (island.js) eller `rand(seed)` (beach.js).
- **Max 16 vertex-attribut** gäller för SwiftShader och många mobiler, och människoshadern ligger på 15. Packa nya data i befintliga attribut, som `aBS` och `iPants.w` (stilmasken).
- **Folk som bara syns:** badgästerna i `layout.zones.beachFolk` ritas av render.js och är inga `Ped`. De påverkar varken simuleringen eller slumpen.
- `GeomBuilder.box` hoppar över undersidan som standard (`skipBottom: true`). En synlig undersida kräver `{ skipBottom: false }`.
- **Skyltatlasen** har begränsad plats. Kolla konsolen efter `sign atlas full` när du lägger till skyltar.
- **Kollisionsgridden** täcker x/z −440..260. Ny mark måste in i `onIsland`/`onIsle`, och golv in i `layout.floors`.
- **Jobb-API:**
  - `start`, `update(dt)`, `targets(T)`, `cleanup`,
  - frivilliga krokar: `interact`, `prompt`, `onExitCar`, `onCrash`, `talkFx`, `talkDone`,
  - avsluta med `mgr.complete(job, …)`, `mgr.fail(job, …)` eller `mgr.quit(job)`,
  - `camFocus` måste nollställas i `cleanup`.
- **Testa med trafik.** Uppdragstesterna kör ofta `traffic: 0, peds: 0`. Stresstesta datorförare med `new Game({ seed })` på flera frön.
- **Samtal** öppnas en bildruta efter `talk`-händelsen. I webbläsartester: vänta några bildrutor innan `nextTalk()`.

## 8. Berättelsen och vad som kan komma

- **Huvudäventyret:** receptet på **Sjubybullen**. Det gömdes av **Arne**, tant Guns avlidne man och konditor på Sjuby Konditori, i hans budcykel. **Bullbilen** (Bagar-Bengt och direktör Dahlgren) har jagat receptet i 30 år.
- **Del 8, Bullfesten:** cykeltjuven **Jonte** snor Arnes cykel med bullarna och Polis-Pia tar honom.
- **Del 9, Cykelgömman (v1.2):** Jonte ljög om båthuset. Cyklarna finns hos tant Guns granne **Birger** (på kryssning sedan maj). Du letar inne i huset och stoppar sedan **Ronny**, Jontes kusin, i en skåpbil. Sidouppdraget **Cyklarna hem** följer. Slutskärmen visas när alla 12 uppdrag i `MAIN` är klara.
- **Personer:**
  - tant Gun,
  - Melker,
  - Yasmin (Hörnlivs),
  - Lasse (Verkstan),
  - Sanna (pizzerian),
  - Kim (Macken: gatloppet och långhoppet),
  - Lås-Leif,
  - Ingvar (fyren),
  - Mjölnar-Majken,
  - Bagar-Bengt,
  - direktör Dahlgren,
  - Polis-Pia,
  - Vera (Salong Saxen),
  - Jonte,
  - Birger (grannen, bortrest),
  - Ronny (Jontes kusin).
- **Nästa naturliga del:** Birger kommer hem från kryssningen "på lördag" (Pia och Gun nämner det), och de övriga åtta cyklarna ska till sina ägare.
- **Andra idéer användaren kan vilja ha:**
  - västra bron (stängd, `BRIDGES[1]`) som nästa område,
  - fler butiker att handla i,
  - kläder och frisyr för spelaren,
  - fler sidouppdrag.
