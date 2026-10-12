# CLAUDE.md – GTA 7 (github.com/Jmai80/gta7)

Det här är startpunkten för en ny Claude Code-session, i molnet (claude.ai/code) eller lokalt. Claude Code läser in filen automatiskt när en session startar i repot. Läs hela filen och sedan `docs/HANDOFF.md`, som har alla detaljer: arkitektur, varje uppdrag, platser och koordinater, tester, fallgropar och versionshistorik.

Senast uppdaterad 12 oktober 2026, efter version 1.13.1 (bara dokument: överlämningen inför huvudäventyrets del 14, se "Nästa uppgift" nedan och docs/HANDOFF.md avsnitt 10). Version 1.13 gav (två sidouppdrag inomhus i nya byggnader: **Fredagsrusningen** i köket på Pizzeria Sjuan – baka sex beställningar efter lapparna när Pino bränt handen – och **Möss i kvarnen** inne i Mjölnar-Majkens väderkvarn – täpp till hålen, smyg ikapp sju möss, den tama Kimchi hem till Nova). Version 1.12 gav (huvuduppdragets del 13 **Flaskposten**: Dahlgren diskar utanför konditoriet och du torkar, Ingvars flaskpost leder till en plåtask under fyrens nya stentrappa, och brevet han aldrig vågade ge går till Elsa i det gröna huset bredvid kapellet – inifrån, där du letar efter hennes glasögon – innan söndagen i kapellet; plus en ny bromsspak vid kvarnen). Version 1.11 gav huvuduppdragets del 12 **Arnes skattjakt** (Arnes sista bröllopsdagsskattjakt till tant Gun – rimmade gåtor utan GPS från lapp till lapp över hela kartan, två kodlås, en kvarnvinge som ska bromsas rakt ner, ett telefonsamtal mot klockan och till sist det som inte stod i receptet: stött kardemumma). Version 1.10 gav kyrkoherde Ingas sidouppdrag Kyrkkaffet (tant Guns söndagsbullar på Arnes cykel ut till kapellet, kyrkklockan, gästerna – och orgeln, ett minispel där du spelar efter det Inga sjunger). Version 1.9 gav Söderholmens kapell inifrån: bänkrader med mittgång, altare och kyrkoherde Inga. Version 1.8.2 gav nya blomsterplanteringar på tivolit. Version 1.8.1 gav (parkdammen visar sitt vatten igen – stenkanten var en hel skiva över vattnet – och gummiankorna är nya och simmar runt). Version 1.8 gav åtta hemligheter/påskägg, bland annat en skateboard och en telefonkiosk som ringer. Version 1.7 gav tre uppdrag på Söderholmens tivoli: huvuduppdragets del 11 Utsikten och sidouppdragen Var är Ebbe? och Måsen har fastnat. Version 1.6 gav ön Söderholmen med Tivoli Lyckoland. Version 1.5 gav huvuduppdragets del 10 Birger kommer hem med bilen Sjuby Spider, och pusslet Badhyttsgåtan på stranden. I v1.10 rättades också altartavlan i kapellet: texten FRID VARE MED ER låg inuti sin förgyllda ram och syntes inte. I v1.11 fick psalmtavlan i kapellet sina tre nummer (den tredje raden ritades aldrig). Den senaste buggfixen (1.8.2) gjorde om tivolits blommor och (1.8.1) parkdammen; den förra (1.4.1) en cykel som spärrade badrumsdörren i Birgers hus, se HANDOFF avsnitt 9; Långhoppet i 1.1.1 står i avsnitt 4. Det finns ingen känd öppen bugg just nu.

**Nästa uppgift (skriven efter v1.13):** bygg **huvudäventyrets del 14**. Läs docs/HANDOFF.md **avsnitt 10**. Där finns:
- de lösa trådarna,
- tre förslag. Rekommenderat är **"Den gyllene bullen"**: Dahlgren bakar inne i ett nytt konditori-interiör, ett foto från bullmästerskapet 1985, pokalen han stal och gömde bland granarna (hemligheten `goldbun`), ledtråden under hans tomte (`gnome`), och ett nytt bullmästerskap på torget,
- checklistan för en ny huvuddel (`MAIN` blir 17 delar och slutskärmstesterna ändras),
- lediga platser för nya interiörer,
- lärdomar från v1.12–v1.13.

Har användaren inte sagt vad del 14 ska handla om: bygg förslag A och säg kort vad du valde.

---

## 0. Så startar du en ny session (för dig som äger projektet)

1. Gå till **claude.ai/code** och logga in. Den första gången ber sidan dig koppla GitHub. Följ stegen och godkänn på GitHub.
2. Om repot är privat: installera Claude GitHub-appen på ditt GitHub-konto och ge den tillgång till `gta7` (sidan erbjuder det under kopplingen). Ett publikt repo går att använda direkt.
3. Använd miljön **Default**, vars nätverksnivå heter **Trusted**. Den når npm, PyPI och GitHub, vilket räcker för testerna.
4. Välj repot **Jmai80/gta7** i väljaren under textrutan och skriv uppgiften, till exempel:

   > Läs CLAUDE.md och docs/HANDOFF.md. Sedan: <beskriv vad du vill ha, t.ex. "bygg nästa del i huvuduppdraget" eller "när jag gör X händer Y, men det borde bli Z">. Testa i Node och i webbläsaren, höj versionen, uppdatera dokumenten och se till att ändringen hamnar på main. Svara på svenska och skicka ett skärmdumpsark när du är klar.

   Beskriv en bugg så som du upplevde den i spelet (var du var, vad du gjorde, vad som hände). Det räcker för att hitta felet.

5. Sessionen fortsätter även om du stänger fliken. Du kan följa den från mobilen under Code-fliken i Claude-appen.

**I Claude-appen på Macen (eller mobilen):** Code-fliken i appen startar samma sorts molnsession som claude.ai/code, med samma GitHub-koppling. Välj repot **Jmai80/gta7** och miljön **Default**, och skriv uppgiften som ovan. Inget behöver installeras på datorn, och Claude pushar till `main` som vanligt.

---

## 1. Projektet på en minut

- **GTA 7** ("Grovt Tillgrepp av Automobil") är ett mobilanpassat GTA-skämtspel i webbläsaren. Staden heter **Sjuby**, ön norr om stan heter **Norrholmen** (dit leder norra bron, x = 40) och ön söder om stan heter **Söderholmen** (södra bron, x = −40, från v1.6).
- three.js 0.184 laddas från jsDelivr via `src/three.js`. Det finns **inget byggsteg**, bara vanliga ES-moduler. Allt är procedurellt: inga bild-, modell- eller ljudfiler (ljudet syntetiseras i Web Audio, typsnitten ligger i `fonts/`).
- **Simuleringen** (fysik, trafik, folk, spelare, uppdrag) är ren JavaScript utan three.js. Den kör i fast 60 Hz och testas i Node. **Renderingen** (`render.js`, `shaders.js`, `worldmesh.js`, `models.js` med flera) är separat.
- Spelet ligger på **https://jmai80.github.io/gta7/**. GitHub Pages byggs från `main`, repots rot.
- Version 1.13 innehåller:
  - huvudäventyret om receptet på Sjubybullen i åtta delar, plus del 9 om Jontes cykelgömma, del 10 där Birger kommer hem, del 11 Utsikten på tivolit (v1.7), del 12 Arnes skattjakt (v1.11, `skattjakt.js`, kodlåsen i `lock.js`) och del 13 Flaskposten (v1.12, `flaskpost.js`),
  - Elsas hus bredvid kapellet inifrån (v1.12, `elsa.js`),
  - Pizzeria Sjuan inifrån med sidouppdraget Fredagsrusningen (v1.13, `pizzeria.js`, `kitchen.js`) och väderkvarnen inifrån med sidouppdraget Möss i kvarnen (v1.13, `millroom.js`, `mice.js`; pizzorna och mössen ritas i `insideview.js`),
  - **Sjuby Spider -62**, en exklusiv öppen bil (`spider`) som finns att låna efter del 10,
  - sexton sidouppdrag (senast Fredagsrusningen och Möss i kvarnen, v1.13, Kyrkkaffet i Söderholmens kapell, v1.10, och Var är Ebbe? och Måsen har fastnat på tivolit, v1.7),
  - åtta hemligheter (påskägg, v1.8, `secrets.js`): skateboarden man kan åka på, telefonkiosken som ringer, gummiankorna, hjärtat i stubben, den gyllene bullen, trädgårdstomten, flaskposten och Sjubyodjuret,
  - Lasses trimningsbutik,
  - Kims långhopp,
  - Norrholmen med Bullbilens bageri, kvarnen, fyren och badplatsen,
  - Söderholmen (v1.6) med Tivoli Lyckoland: pariserhjul (åk ett varv för 20 kr), karusell, berg-och-dalbanan Måsen, radiobilar och kiosker, plus parkering, några hus och ett kapell. Ingen strand – klippor runt om,
  - Söderholmens kapell inifrån (v1.9, `chapel.js`): GÅ IN vid tornets dörr, sex bänkrader på var sida om mittgången, altare, och kyrkoherde Inga att prata med. Sedan v1.10 ett kaffebord vid dörren, klockrepet (RINGA, när som helst) och orgeln (SPELA: fritt spel efter Kyrkkaffet, `organ.js`),
  - sidouppdraget Kyrkkaffet (v1.10, `kyrkkaffe.js`): bullarna hos tant Gun, cykelturen på Arnes cykel till kapellet, klockan, gästerna och psalmen på orgeln,
  - bilradio (en kanal per bilfärg, `radio.js`, av från början) och skylten LJUD AV när ljudet är avstängt (M på datorn),
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
git log --oneline -3                         # överst: v1.13.1 eller senare
npm install --no-save three@0.184.0          # three.js lokalt – bara för webbläsartesterna
npm test                                     # ~1 220 kontroller, 1–2 min. Ska sluta med:
                                             #   All checks passed / All extras passed / All mission checks passed
(nohup python3 -m http.server 8765 --directory "$PWD" > /dev/null 2>&1 &)   # server för webbläsartesterna
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8765/index.html   # ska ge 200
mkdir -p test/shots                          # skärmdumparna hamnar här (gitignorerad)
python3 test/browser/v12.py phone            # en genomgång (Cykelgömman): ska sluta med "V12 ok" och "logs []"
python3 test/browser/v1_10.py phone          # Kyrkkaffet och orgeln (~3 min): "V1_10 ok" och "logs []"
python3 test/browser/v1_11.py phone          # Arnes skattjakt (~5 min): "V1_11 ok" och "logs []"
python3 test/browser/v1_12.py phone          # Flaskposten (~6 min): "V1_12 ok" och "logs []"
python3 test/browser/v1_13.py phone          # Fredagsrusningen och Möss i kvarnen (~5 min): "V1_13 ok" och "logs []"
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
- **Studioskript:** `south_studio.py TAG [phone] [speltid]` (Söderholmen och tivolit), `beach_studio.py TAG [phone]`, `bike_studio.py TAG` och `people.py` tar närbilder med fast kamera.

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
| `src/secrets.js` | (v1.8) Hemligheterna: platser, texter, telefonens ledtrådar, rekvisitan (`secretsInto`) och sjöodjurets rörelse. Skateboarden är fordonstypen `skate` i vehicle.js. |
| `src/chapel.js` | (v1.9) Söderholmens kapell inifrån: `CHAPEL` (spawn, dörr, Inga, bänkfolket), `CHAPEL_DOOR` utanför, `PEWS`, `chapelLayout`/`chapelInto`. Dörren, Inga och samtalen sköts av `Indoors` i indoors.js. (v1.10) `CHAPEL_KAFFE` (kaffebordet, klockrepet, orgelbänken, var Inga står), `pewSeat(rad, x)` och `ropeInto`. |
| `src/kyrkkaffe.js`, `src/organ.js` | (v1.10) Sidouppdraget Kyrkkaffet (`ChurchJob`, `churchWorld` som håller Arnes cykel vid Guns grind, `KYRK`, `GUESTS`) och orgeln (`Organ`, `PSALM`, `VERSES`, `ORGAN`): ren simulering. Orgeln bor i `Indoors` (`indoors.organ`), main.js ritar tangenterna (`#organ`). |
| `src/skattjakt.js`, `src/lock.js` | (v1.11) Huvuduppdragets del 12 Arnes skattjakt (`HuntJob`, `HUNT` med alla platser och kameror, `RIDDLES`, `huntWorld` som håller Gun och Bengt vid konditoriet, kontrollpunkten `stats.hunt`) och kodlåset `CodeLock` (ligger i `game.lock` medan det visas; main.js ritar `#lock`). Kvarnens vingar snurrar i simuleringen (`MILL`, `game.millA/millW/millHold` i game.js). |
| `src/flaskpost.js`, `src/elsa.js` | (v1.12) Huvuduppdragets del 13 Flaskposten (`BottleJob`, `FLASK`, `flaskWorld` som håller Gun, Dahlgren vid diskbordet och Ingvar vid konditoriet, kontrollpunkten `stats.flask`) och Elsas hus inifrån (`ELSA_HOUSE`, `ELSA_DOOR`, `ELSA_SPOTS`, `elsaLayout`/`elsaInto`; `PLACES.elsa` i indoors.js). Diskbordet och plåtasken ritas i render.js (`makeFlask`/`syncFlask`). |
| `src/pizzeria.js`, `src/kitchen.js`, `src/millroom.js`, `src/mice.js`, `src/insideview.js` | (v1.13) Pizzeria Sjuan inifrån (`PIZZA_ROOM`, `PIZZA_DOOR`, `TOPPINGS`) och sidouppdraget Fredagsrusningen (`KitchenJob`, `MENU`, `RUSH`; main.js ritar lapparna `#tickets` ur `job.tickets`); väderkvarnen inifrån (`MILL_ROOM`, `MILL_DOOR`, `HOLES`) och sidouppdraget Möss i kvarnen (`MiceJob`, `MICE`, mössens beteende, kontrollpunkten `stats.mice`); `InsideProps` ritar pizzorna och mössen. Ett jobb kan ha `mapDots()` för egna prickar på inomhuskartan. |
| `src/tivolijobs.js` | (v1.7) Uppdragen på tivolit: Utsikten (`ViewJob`), Var är Ebbe? (`EbbeJob`), Måsen har fastnat (`CoasterJob`) och `southWorld`, som sätter ut personerna medan du korsar södra bron. |
| `src/southisle.js`, `tivoli.js`, `rides.js` | (v1.6) Söderholmen och Tivoli Lyckoland som data (`SOUTH`, `onSouth`, `WHEEL`, `COASTER` …, och de rörliga delarnas rörelse som funktioner av `game.time`), de rörliga delarnas grafik (`buildTivoli`) och åkturen i pariserhjulet (`Rides`, spelarläget `'ride'`). |
| `src/game.js` | `Game`: fordon, trafik, folk, spelaren, `step()`, `spawnBike`, `spawnRedBike` och norra brons grind. |
| `src/mission.js` | `Missions`: uppdragslistan `QUESTS`, sms-erbjudanden, `checkJobs` (markörer som startar jobb), mål-rutan, `updateTargets`, spara och ladda, Lasses butik, `onStunt` (Långhoppet), `activities` (stunthopp, biltvätt) och slutskärmen. |
| Uppdragsfiler | `pizza.js`, `race.js` (gatloppet, ringar), `longjump.js` (Långhoppet), `hideout.js` (Cykelgömman) och `birger.js` (Birgers hus), `bikeshome.js` (Cyklarna hem), `concert.js` (Konsertbiljetten) och `nova.js` (Novas rum), `homecoming.js` (Birger kommer hem, Spidern), `beachhuts.js` (Badhyttsgåtan), `flag.js`, `samuel.js` (Melker), `handover.js`, `bikejob.js` (inkl. jakt-AI:n `Chaser`), `livs.js`, `leif.js`, `safe.js`, `opening.js`, `jar.js`, `factory.js`, `errands.js`, `barber.js` och `salon.js` (Vera), `fest.js` och `sander.js` (Jonte). |
| `src/vehicle.js`, `traffic.js`, `peds.js`, `player.js`, `collide.js`, `route.js` | Fordonsfysik, trafik-AI, fotgängare och människornas stilar, spelaren, kollisioner och `groundHeight`, kortaste väg för GPS-linjen. |
| `src/render.js`, `shaders.js`, `worldmesh.js`, `models.js`, `beach.js`, `trees.js`, `geom.js`, `textures.js`, `hud.js`, `audio.js`, `radio.js` | Grafik, modeller (bilar, cyklar, människomodellen), badplatsens saker, `GeomBuilder`, skuggkarta och skyltatlas, HUD med minikarta och GPS-linje, ljud och bilradions kanaler. |
| `test/sim.mjs`, `test/extras.mjs`, `test/missions.mjs` | Node-testerna (`npm test`). Följ stilen `check(ok, 'beskrivning')`. Varje uppdrag har en egen sektion i `missions.mjs`. |
| `test/browser/` | Webbläsargenomgångar per version (`v02.py` … `v11.py`, `v111.py`, `v12.py`, `v13.py` för ljud och bilradio, `v14.py` för Konsertbiljetten, `v15.py` för Birger kommer hem och Badhyttsgåtan, `v16.py` för Söderholmen och pariserhjulet, `v17.py` för uppdragen på tivolit, `v18.py` för hemligheterna, `v19.py` för kapellet, `v1_10.py` för Kyrkkaffet och orgeln, `v1_11.py` för Arnes skattjakt, `v1_12.py` för Flaskposten, `v1_13.py` för Fredagsrusningen och Möss i kvarnen) och studioskript. |
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
     - `<div class="ver">Version X.Y · Sjuby, Norrholmen och Söderholmen</div>`,
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
- **Kollisionsgridden** täcker x/z −440..320 (sedan v1.6). Ny mark måste in i `onIsland`/`onIsle`/`onSouth`, och golv in i `layout.floors`.
- **Rörliga saker** som simuleringen bryr sig om (pariserhjulets gondoler) ska följa `game.time` genom rena funktioner i en simuleringsfil, och uppdateras i render.js före `syncHumans`.
- **Jobb-API:**
  - `start`, `update(dt)`, `targets(T)`, `cleanup`,
  - frivilliga krokar: `interact`, `prompt`, `onExitCar`, `onCrash`, `talkFx`, `talkDone`,
  - avsluta med `mgr.complete(job, …)`, `mgr.fail(job, …)` eller `mgr.quit(job)`,
  - `camFocus` måste nollställas i `cleanup`.
- **Testa att man kan gå dit.** Teleportera inte bara spelaren till varje ställe i en ny interiör: kör `reachable()` i missions.mjs (flood fill från dörren). I v1.4 spärrade en cykel badrumsdörren i Birgers hus och testerna märkte det inte.
- **Testa med trafik.** Uppdragstesterna kör ofta `traffic: 0, peds: 0`. Stresstesta datorförare med `new Game({ seed })` på flera frön.
- **Ljud:** M på tangentbordet stänger av allt ljud och sparas. Säger användaren att ljudet försvunnit: fråga först om skylten LJUD AV syns. Ljudet går inte att höra i sandlådan; `v13.py` mäter spelets utgång med en analysator.
- **Samtal** öppnas en bildruta efter `talk`-händelsen. I webbläsartester: vänta några bildrutor innan `nextTalk()`.
- **Inget tak i interiörer, och väggar på högst ~2,6 m** – kameran står ovanför väggarna (v1.13: ett tak i kvarnen skymde allt).
- **Kameran inomhus** (`camFocus` med `near`) står 6,2 m bakom fokuspunkten i stående mobilläge. I ett litet rum hamnar den annars bakom en vägg: i kapellet tittar den söderut (`yaw` nära 0) mot altaret och orgeln, eller norrut (`yaw` nära π) mot dörren. Räkna ut var kameran hamnar och titta på skärmdumpen.
- **Närbilder (v1.11):** `camFocus` kan få `dist`/`height` (med `near`) eller en fast kamera `cam: { x, y, z, fov }`. Ställ spelaren bredvid det som ska synas – annars står kameran i spelarens rygg. En skylt man ska läsa på nära håll behöver `ppm` (atlasen ger annars högst 72 pixlar per meter), och textskyltar har högst tre rader (`rows: true` för rubrik + rader).
- **Knappens ordning:** `Missions.prompt` är inomhusets knapp, sedan jobbets, sedan tant Guns, pariserhjulets och hemligheternas. Står en cykel nära Gun vinner hennes PRATA över CYKLA – därför ger Kyrkkaffet-jobbet själv CYKLA när du står vid Arnes cykel.

## 8. Berättelsen och vad som kan komma

- **Huvudäventyret:** receptet på **Sjubybullen**. Det gömdes av **Arne**, tant Guns avlidne man och konditor på Sjuby Konditori, i hans budcykel. **Bullbilen** (Bagar-Bengt och direktör Dahlgren) har jagat receptet i 30 år.
- **Del 8, Bullfesten:** cykeltjuven **Jonte** snor Arnes cykel med bullarna och Polis-Pia tar honom.
- **Del 9, Cykelgömman (v1.2):** Jonte ljög om båthuset. Cyklarna finns hos tant Guns granne **Birger** (på kryssning sedan maj). Du letar inne i huset och stoppar sedan **Ronny**, Jontes kusin, i en skåpbil. Sidouppdraget **Cyklarna hem** följer.
- **Del 10, Birger kommer hem (v1.5):** Birger vann **Sjuby Spider -62** på bingon. Du kör honom runt stan och hem, och sedan får du låna bilen.
- **Del 11, Utsikten (v1.7):** Dahlgren säljer sina bilder av receptet till Kexfabriken på tivolit. Du ser honom från pariserhjulet, springer ikapp honom och raderar bilderna. Han erkänner att han aldrig lyckats baka Arnes bullar.
- **Del 12, Arnes skattjakt (v1.11):** Bengts bullar efter receptet blir inte som Arnes. Gun hittar Arnes sista bröllopsdagsskattjakt (1995, aldrig öppnad). Gåtorna leder till ekstubben i parken (kodlås 1971), kvarnen (Majken; bromsa det gula seglet rakt ner), fyren (Ingvar – han var rösten i telefonkiosken), kiosken på kajen (Ingvar läser sista lappen i telefon) och kapellet (altarlådan, koden 287 från psalmtavlan). I smörlådan med A + G: Guns mammas mortel och Arnes brev – han stötte kardemumman själv, aldrig malen ur påse. Dahlgren följer doften och får diska hos Gun.
- **Del 13, Flaskposten (v1.12):** Dahlgren diskar hos Gun (diskmaskinen gick sönder första dagen) – du torkar tolv tallrikar. Ingvar har sett sin flaskpost från 1974 i kikaren på Söderholmens klippor i femtio år. Lappen leder till fyrens nya stentrappa och en plåtask (kodlås 1974) med ett brev till **Elsa**, flickan i grön klänning på dansen sommaren -74. Elsa bor i det gröna huset bredvid kapellet (inifrån, med katten **Måns**, som ligger på hennes glasögon). Hon har suttit på tredje raden varje söndag i femtio år och väntat; Ingvar har suttit längst bak. Hon svarar, och på söndagen sätter han sig bredvid henne. Slutskärmen visas när alla 16 uppdrag i `MAIN` är klara.
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
  - Nova (Kims lillasyster, 13) och hennes mamma,
  - Birger (grannen, hemma från kryssningen sedan del 10),
  - Livräddar-Tove och ungarna Alva, Bosse, Cleo och Dante (badplatsen),
  - Ronny (Jontes kusin),
  - på tivolit (v1.7): Tivoli-Rut (ägaren), Hanna och sonen Ebbe (5), Popcorn-Pelle, Karusell-Kalle och Maja vid Måsen,
  - Elsa i det gröna huset bredvid kapellet och katten Måns (v1.12),
  - pizzabagaren Pino på Pizzeria Sjuan, Majkens gamla katt Sotis och Novas tama mus Kimchi (v1.13),
  - kyrkoherde Inga i Söderholmens kapell (v1.9). Hon minns tant Guns och Arnes bröllop där 1972 – hon satt längst bak, femton år gammal (v1.10). Kantorn (sjuk i v1.10) har vi aldrig sett.
- **Nästa naturliga del (del 14):** se HANDOFF avsnitt 10 – rekommenderat "Den gyllene bullen" (Dahlgren bakar inne i konditoriet, pokalen från bullmästerskapet 1985, tomten och den gyllene bullen bland granarna). Andra trådar: Ingvar och Elsa (fyren inifrån); Birger har bjudit på kaffe och vill höra hela historien om cyklarna; de övriga åtta cyklarna ska till sina ägare; Spidern kunde få en egen trimning hos Lasse. Kodlåset (`lock.js`) och den fasta kameran går att återanvända.
- **Bilradion:** användaren tyckte att midimusiken lät för mycket glassbil/party. Den är av från början sedan v1.4. Användaren tänker ladda ner en mjuk radioslinga att spela i stället – då läggs en ljudfil in (den första i projektet).
- **Hemligheterna (v1.8)** är påskägg men knyts så sakta till berättelsen: i Arnes skattjakt (v1.11) blev "A + G 1971" i stubben koden till Arnes första plåtask, och rösten i telefonkiosken visade sig vara Ingvar (han har en kikare i fyren). Flaskposten knöts i v1.12 (Flaskposten). Kvar att knyta: den gyllene bullen och Dahlgrens tomte.
- **Kapellet** (v1.9) fick Ingas sidouppdrag Kyrkkaffet i v1.10: Guns söndagsbullar på Arnes cykel, klockan, gästerna och orgeln. "Psalmen" var Beethovens Ode till glädjen, Arnes önskan till bröllopet 1972. Ingvar satt längst bak och sa bara "Amen." – sedan v1.12 sitter han bredvid Elsa på tredje raden efter Flaskposten. Orgeln (`organ.js`) kan få fler melodier (ett eget minispel, en låt till Bullfesten).
- **Pizzerian och kvarnen** (v1.13) har interiörer nu: de kan få fler uppdrag (en lördag i pizzerian, kvarnens övervåning med kvarnstenarna). Bullbilens bageri står tomt – med sex möss under lastkajen.
- **Tivolit** kan få mer att göra: åka berg-och-dalbanan eller radiobilarna, ett lyckohjul att snurra.
- **Andra idéer användaren kan vilja ha:**
  - västra bron (stängd, `BRIDGES[1]`) som nästa område,
  - fler butiker att handla i,
  - kläder och frisyr för spelaren,
  - fler sidouppdrag.
