# GTA 7 – överlämning till nästa chatt

Senast uppdaterad: 10 oktober 2026, efter version 1.1 (tre nya namn: Melker, Jonte och Vera; nya cykelhjul vars ekrar stannar innanför däcket; Norrholmens badplats byggd på nytt).
Det här dokumentet är skrivet så att en ny Claude-session (eller en människa) kan fortsätta utan att läsa den gamla chatten.

---

## 1. Snabbstart för nästa session

1. Klona repot: `git clone https://github.com/Jmai80/gta7.git` (i molnsessioner: `add_repo` Jmai80/gta7 med push-behörighet, klona till `/home/claude/gta7`).
2. Installera three.js lokalt för testerna (finns inte i package.json, används bara av webbläsartesterna): `npm install --no-save three@0.184.0`.
3. Kör Node-testerna: `npm test` → ska sluta med `All checks passed`, `All extras passed`, `All mission checks passed`.
4. Starta en lokal server för webbläsartester: `python3 -m http.server 8765 --directory /home/claude/gta7` (servern dör ibland – starta om med `(nohup python3 -m http.server 8765 --directory /home/claude/gta7 > /dev/null 2>&1 &)`).
5. Webbläsargenomgångar (Playwright, Python, SwiftShader): `python3 test/browser/v09.py phone` (eller `land`, `desk`), `v091.py` för lastbilen i stadstrafiken, `v10.py` för Salong Saxen och Bullfesten och `v11.py` för namnen, cyklarna i en sväng (och en geometrikoll av hjulen) och badplatsen (ut på bryggan). Närbilder med handplacerad kamera: `beach_studio.py TAG [phone]` och `bike_studio.py TAG`. Skärmdumpar hamnar i `test/shots/` (gitignorerad).
6. Läs README.md (svenska, spelarperspektiv) och den här filen (utvecklarperspektiv).

## 2. Om användaren och arbetssättet

- Användaren skriver och läser **svenska**. Alla svar ska vara på svenska. Koden och kodkommentarerna är på engelska; all text i spelet är på svenska.
- Användaren **testar på mobilen** via GitHub Pages: https://jmai80.github.io/gta7/ – varje ändring ska därför **committas och pushas till `main`**.
- Commit-format: `GTA 7 vX.Y: kort beskrivning på svenska`, sedan en punktlista på svenska. Avsluta alltid med raderna
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` och `Claude-Session: <sessionslänk>` (sessionslänken anges i varje sessions systemmeddelande).
- Kör `git fetch` före push. Arbeta direkt på `main` (användaren har aldrig bett om grenar/PR).
- Versionsnummer höjs vid varje leverans: `package.json` (`version`), `index.html` (`<div class="ver">Version X · Sjuby och Norrholmen</div>`), README (första stycket och rubriken "Uppdrag i version X"), slutskärmens text i `index.html` (`#endcard`) och sms:et i `Missions.checkAllDone()`.
- Efter push: kontrollera att Pages byggt rätt commit med `gh run list -R Jmai80/gta7 -L 2 --json headSha,status,conclusion,createdAt`. **Kända problem:** `headSha` kan visa en äldre commit trots att bygget gällde den nya (jämför `createdAt` med commit-tiden). Om inget bygge alls startar inom ~5 min: pusha en tom commit (`git commit --allow-empty -m "…"`), det har fungerat. `gh api …/pages` och WebFetch av github.io blockeras ofta i sandlådan.
- Leveransmönster som användaren gillat: kort svensk sammanfattning (vad som är nytt, hur uppdragen fungerar, när sms kommer med sparat spel), plus ett skärmdumpsark (4–5 telefonbilder i rad med gula bildtexter) skickat som fil.
- Användaren fattar själv berättelsebeslut i stora drag ("bygg ön", "lägg till två side quests") och låter oss hitta på detaljer. Fråga bara om något är riktigt tvetydigt.

## 3. Vad spelet är

GTA 7 ("Grovt Tillgrepp av Automobil") – ett mobilanpassat GTA-skämtspel i webbläsaren, three.js 0.184 via jsDelivr, **inget byggsteg**, vanliga ES-moduler. Staden heter **Sjuby**; norr om stan ligger ön **Norrholmen** (bro x=40). Allt är procedurellt: inga bildfiler, modeller eller ljudfiler (ljud syntetiseras i Web Audio).

## 4. Arkitektur

### Körning
- `index.html` – all CSS och HTML-overlays (titel, HUD, paus, uppdragskort `#offer`, uppdragslista `#log`, samtalsruta `#talk`, Lasses butik `#shop`, slutskärm `#endcard`). Modulepreload-lista högst upp – **lägg till nya src-filer där**.
- `src/main.js` – spel-loop, tillstånd (`loading | title | play | pause | offer | log | talk | shop | end`), wire av händelser (`g.on('sms'|'offer'|'talk'|'shop'|'say'|…)`), samtalsrutan (`openTalk/showPage/nextTalk`), butiken (`openShop/renderShop/buyItem`), slutskärmens statistikrader, röster (`VOICES`, `voiceOf`, `npcVoice`). `window.__gta` exponerar `game`, `view`, `start`, `openOffer`, `nextTalk`, `openShop`, `buyItem` … för tester.
- Simulering med fast 60 Hz i ren JS (körbar i Node), rendering separat.

### Simulering (ingen three.js – körs i Node-testerna)
| Fil | Ansvar |
|---|---|
| `config.js` | Alla konstanter och platser (se avsnitt 7) |
| `layout.js` | Hela stan som data: prims, colliders, casters, skyltar, rampor, GPS-graf (`gpsGraph`). Exporterar `createLayout`, `M` (materialkoder), `onRoad/onIsland/onIsle` |
| `island.js` | Norrholmen: kust, vägar (`ROADS.loop/spine`), kolonilotter, bageri med gård, kvarn, fyr, Ingvars stuga, kontorets fönster/dörr, **badplatsen** (`BEACH` + `beach()`, v1.1: sand, strandpromenad, brygga, hytter, torn, kiosk, parasoller, folk, kolliderare och skuggor) |
| `collide.js` | Uniform kollisionsgrid (min −440, storlek 700 m, cell 8), `groundHeight` (golv → ramper → väg 0 → land CURB_H 0.15 → vatten −3), `raycast` |
| `game.js` | `Game`: fordon, trafik, folk, spelare, `step()`, `onCrash`, `spawnBike`, norra brons grind, `racers` (datorförare) |
| `vehicle.js` | Fordonsfysik (sedan, van, bike, `racebike` = Jontes röda racercykel, v1.0). `boost/top/armor` för Lasses uppgraderingar. Kod som gäller cyklar ska fråga `spec.bike`, inte `type === 'bike'` |
| `traffic.js`, `peds.js`, `player.js`, `input.js` | Trafik-AI, fotgängare (`Ped`, `makeLook`, `dressUp`, `STYLE_BITS`), spelaren (gå, köra, cykla, kliv ur), input |
| `route.js` | `routePoints(G, ax, az, bx, bz)` – kortaste väg på GPS-grafen (stad + bro + ö) |
| `mission.js` | `Missions`: uppdragslista `QUESTS`, timeline (sms-erbjudanden), `checkJobs` (markörer startar jobb), spara/ladda, mål-rutan, kartmål, Lasses butik, Kims långhopp, slutskärm |
| `indoors.js` + `interior.js` + `shop.js` + `office.js` + `salon.js` | Interiörer byggda ute till havs (x≈200, z≈200…240) som visas i stället för stan: höghusets plan 7 (`INT`), Hörnlivs (`SHOP`), bagerikontoret (`OFFICE`), Salong Saxen (`SALON`, v1.0). `Indoors.enter(done, where)` med `where` = `'tower' | 'shop' | 'office' | 'salon'`, `PLACES`-tabell för dörrar/utgångar, prompt `HISS` / `GÅ UT`. En ny interiör: layout + `…Into(B)` i egen fil, in i `interiorLayout/interiorInto`, `PLACES`, minikartans planritning i hud.js (`IN_ALL` + ritning) |
| Uppdragsfiler | `pizza.js`, `race.js`/`racer.js`, `flag.js`, `samuel.js`, `handover.js`, `bikejob.js` (inkl. återanvändbar `Chaser`), `livs.js`, `leif.js`, `safe.js`, `opening.js`, `upgrades.js`, `jar.js`, `factory.js`, `errands.js`, `barber.js` (Salong Saxen), `fest.js` (Bullfesten: `FestParty` + `FestJob`), `sander.js` (`Rider` + trottoarnätet) |

### Rendering (three.js)
| Fil | Ansvar |
|---|---|
| `render.js` | `View`: scen, instansierade bilar/människor, markörer, pilar, kamerariggen `CameraRig` (inkl. `camFocus` med `near`-läge för samtal, inomhuskamera som lutar mot rummets mitt via `PLACES`), interiörens rörliga delar (Melkers dörr, nycklar, Yasmins kasse, kassaskåpsdörren, receptet), cyklarna (`this.bikes` per typ, med bullar i Arnes låda när `bike.buns`), festen på torget (`this.fest`, syns när `game.festUp`), `bunBurst(x, z)` |
| `shaders.js` | En `ShaderMaterial` för allt (`worldMaterial(U, kind)`), materialkoder per vertex, människornas ben/poser i vertexshadern |
| `worldmesh.js` | Slår ihop layoutens prims till chunk-meshar (80 m) + interiörmesh |
| `models.js` | Bilar, cyklar (`buildBike(signUV, { racer })` → `buildArnes`/`buildRacer`, gemensamma hjul `bikeWheel(r, o)`, egna mått `RACER_GEO`), **människomodellen** `buildHumanGeometry()` + `STYLE`-bitar, nycklar, telefon, flagga, `buildFest()` (långbordet, bullar, flaggspel, ballonger, BULLFESTEN-banderoller), `buildBikeBuns()` |
| `textures.js` | Skuggkarta (bakas vid start, 1024×2048 över x −160..160, z −480..160), skyltatlas 1024×2048 (varnar `sign atlas full` i konsolen om den tar slut). Skyltar som bara används av rörliga modeller läggs direkt i `makeSignAtlas` (`bullbil`, `pizzatak`, Arnes `konditori`-låda, `festbanner`). Obs: Arnes låda heter också `konditori` och skriver över fasadskylten – därför står det "sedan 1952" på båda |
| `hud.js` | Minikarta (inkl. inomhusplanritning för alla interiörer), GPS-linje, blips, sms, toasts, hints, knappetiketter |
| `audio.js` | Allt ljud: motor, tuta, cykelklocka, `melody()` (Lasses melodituta), `voice(pitch, text, vol)` (samtalsröster), `talkOpen()`, `bell(k)` (k = lägre på avstånd), `salon(kind)` (pick, cut, shave, dye, happy, angry) |
| `beach.js` | (v1.1) Badplatsens saker som layout-prims `{ t: 'beach', kind, x, z, rot, … }`: parasoll, solstol (`flat` = ryggstödet nedfällt), handduk, badboll, kylväska, sandslott, badhytt, livräddartorn, glasskiosk, picknickbord, brygga, strandpromenad, flotte, bojar, volleybollnät, strandråg, vresros, vimpel, portal, cykelställ, papperskorg. island.js bestämmer var, beach.js hur det ser ut; worldmesh.js bygger in dem i stadens chunkar |
| `trees.js`, `geom.js` | Träd, `GeomBuilder` |

### Viktiga mönster
- **Jobb-API** (en aktiv åt gången, `mgr.active`): `start()`, `update(dt)`, `targets(T)`, `cleanup()`, valfritt `interact()`, `prompt`, `talkFx(fx)`, `talkDone()`, `onEnterCar(e)`, `onExitCar(e)`, `onCrash(e)`, `onBikeFall(e)`, `titleCard` (false = ingen startbanner). Avsluta med `mgr.complete(job, {title, sub, amount})`, `mgr.fail(job, reason, [WHO.x, sms])` eller `mgr.quit(job, sms)`.
- **Uppdragsfält i `QUESTS`:** `after` (kedja), `at` (sekunder efter `after` klarats, eller från start), `due(m)` (egen tidpunkt), `ready(m)` (extra villkor), `side`, `main`, `soon` (teaser i listan, ej spelbar), `sms` (sidouppdrag som erbjuds via sms), `anytime` (sms även mitt i ett annat jobb), `bridge` (kräver öppen norra bro), `startOnAccept` (jobbet startar direkt när man följer uppdraget, ingen markör), `needFoot` / `needCar`, `Job`, `x/z/r` (startmarkör).
- **Samtal:** jobbet sänder `g.emit('talk', { id, pages })`, sidor `{ who, letter, color, text, you?, fx?, last? }`. main.js visar en sida i taget, spelet står still, `talkFx` anropas när en sida med `fx` visas och `talkDone` efter sista sidan. Kameran: sätt `g.camFocus = { x, y, z, yaw, owner, near: true }` och nollställ i `cleanup`. `yaw` är kamerans blickriktning (kameran står bakom punkten); i stående mobilläge ryms bara ±1,8 m i sidled, så rama in en eller två personer åt gången. Bullfesten byter bild per replik med `fx: 'cam:<namn>'` (`SHOTS` i fest.js). Nya röster: `VOICES`/`NPC_VOICE` i main.js.
- **Folk som går någonstans (v1.0):** `ped.goto([[x, z], …], speed, faceH)` → läget `'goto'`, sedan `'stand'` och `ped.arrived = true`. Nollställ `arrived` innan du väntar på nästa `goto` (annars "kommer de fram" direkt). Sittande: läget `'lounge'` + `body.pose = 5`, cyklande: `'ride'` + `pose = 6` (någon annan ställer kroppen, som `Rider.pose()`). `MAX_HUMANS` i render.js är 64.
- **Ansikte mot ansikte-erbjudande:** `mgr.offer(id, 'talk')` öppnar uppdragskortet direkt (används efter kassaskåpet för "Nyöppningen").
- **Nästa del syns:** `Missions.nextMain()` + `list()` visar kommande huvuddel som *Kommer snart* och mål-rutan säger "Huvuduppdraget fortsätter snart – X hör av sig om en stund".
- **Jakt-AI:** `Chaser` i `bikejob.js` – kör efter GPS-grafen med pure pursuit, kurvhastigheter, trafikluckor, backar när den fastnar. `goal` sätts av jobbet; `mode` = `'chase' | 'home' | 'done'`; `retire(back, force)`; `release()` (v0.9.1: släpper bilen utan att parkera den, någon annan kör vidare); `polite: true` = rammar inte spelaren och saktar in bakom spelaren (används för flyende bil och lastbilen man skuggar). Lägg alltid till i `g.racers`. **Obs:** en `Chaser` väntar inte på sin tur i korsningarna (trafikens reservationer) och svänger brett, så med trafik kan den låsa sig med bilarna för gott. Det gör inget när spelaren jagas (då kommer man undan), men en bil som spelaren *måste* följa ska köra som trafik i stan – se nästa punkt.
- **Cyklisten Jonte (v1.0):** `Rider` i sander.js styr en cykel (`driver = 'racer'`, `locked` så att ingen kan hoppa på) med en person i läget `'ride'`. Den kör på `pavementGraph(layout)` – hörnen på kvarterens trottoarslingor (`layout.loops`), sidorna och övergångsställena mellan kvarteren – planerar en ny väg bort från spelaren med Dijkstra, saktar in i hörn, backar när den fastnar, plingar (`horn`-händelse med `car: bike`) på folk som då hoppar undan, och retas. Jobbet anropar `rider.pose(dt)` efter fysiken och `rider.fall(vx, vz)` när han åker av.
- **Festen på torget (v1.0):** `FestParty` (mission.party) sätts upp när `bullfest` är känt och spelaren inte ser torget, och plockas ner när uppdraget är klart och torget är utom synhåll: folk, Polis-Pia, Jonte, Arnes cykel med bullar vid bordet, den röda racercykeln, `g.festUp` (render.js ritar festen), bordets kolliderare (`fest: true` i layout.js, `h` 0 ↔ `hUp`) och tant Gun (`flag.pinned` + `hush`, egna festrepliker i `flag.interact`).
- **Bilar med mål i trafiken (v0.9.1):** `g.traffic.join(car, into, dir, dest, cruise)` sätter en bil som inte står på ett körfält (lastbilen vid brons slut) på väg in i korsning `into` i riktning `dir` (0 N, 1 E, 2 S, 3 W) och sedan kortaste vägen till `dest`. `ai.dest` gör att `extend()` väljer utfart med `towards()` (Dijkstra över de 16 korsningarna, `distTo`, ingen slump) i stället för `chooseExit`; `dest` följer med vid `replan`. Bilen reserverar korsningar och svänger som all annan trafik. `FactoryJob.steerTruck()` sköter bytet: `Chaser` på ön och bron, trafiken i stan, tillbaka till `Chaser` om bilen tappar vägen (`ai.lost`). Vid målet: `parkTruck()` (förare ut, `parkedSpot`, trafiken kör om).
- **Människornas stil:** `look.style` (bitmask: long 1, bun 2, beard 4, glasses 8, cap 16, apron 32, baker 64, jacket 128, swim 256) och `look.accent` (färg för jacka/förkläde/keps). Packas i instansattributet `iPants.w`. `dressUp(look)` ger gående en stil från deras utseende **utan att använda spelets slumptal**. `swim` (v1.1) = badkläder: färgplatserna 6–9 i modellen (ärmar, ben, skor, bälte) blir hud respektive byxfärg i shadern, och fötterna krymper; tröjan och byxorna blir baddräkten (sätt `shirt` = hudfärgen för bar överkropp).
- **Folk som bara syns (v1.1):** badgästerna i `layout.zones.beachFolk` (`{ x, z, list }`) är inga `Ped` – render.js gör kroppar av dem med `makeBody` och ritar dem när kameran är inom 170 m från stranden och man inte är inomhus. De påverkar inte simuleringen eller slumptalen; de som står upp har en `colCircle`, solbadarna en låg `colOBox` (h 0.6). Liggande: `lie: 1` med `lieDir` 1 = på mage (huvudet åt `h`), −1 = på rygg.
- **Determinism:** testerna förutsätter att `g.rng` dras i samma ordning. Nya saker som spawnar folk/bilar vid start ändrar slumpsekvensen och kan bryta gamla tester – spawna lat (vid behov) eller använd egna hash-slumpar (som `dressUp`).
- **Sparning:** `localStorage['gta7-progress']`, `progress()`/`restore()` i mission.js, `SAVE_VERSION = 2`. Sparar pengar, klara/kända/sedda uppdrag, följt uppdrag, statistik, `upg` (köpta uppgraderingar), `best` (längsta hopp). Pågående jobb sparas inte. `restore` lägger ut följder: flaggan hissad, cykeln vid Guns grind eller vid höghuset (efter `cykelretur`), Ingvar vid fyren, Lås-Leif utanför butiken.

## 5. Berättelsen och alla uppdrag (i ordning)

Huvudäventyret: receptet på **Sjubybullen** som **Arne** (tant Guns avlidne man, konditor på Sjuby Konditori) gömde i sin budcykel; **Bullbilen** (bageri på Norrholmen, chef **Bagar-Bengt**, ägare **direktör Dahlgren**) har jagat det i 30 år.

| id | Bokstav, givare | Titel | Typ | Kommer | Kort |
|---|---|---|---|---|---|
| lasse | L Lasse (Verkstan) | Röd bil | uppdrag | 1,4 s | Sno röd bil → Lasses Verkstad |
| pizza | S Sanna (Pizzerian) | Pizzabudet | uppdrag | 9 s | 3 pizzor, tidsgräns |
| race | K Kim (Macken) | Gatloppet | uppdrag | 18 s | 2 varv mot Kim och Bosse |
| flag | G Tant Gun | Flaggan i topp | sido | 24 s (prata med henne) | Hissa flaggan |
| samuel | ? Okänt nummer | Melkers cykelnycklar | huvud 1 | 40 s | Smyg in i höghuset plan 7, ta nycklarna |
| overlamning | ? Okänt nummer | Överlämningen | huvud 2 | 6 s efter | Bänken på bryggan – det är tant Gun |
| cykel | G Tant Gun | Arnes budcykel | huvud 3 | 14 s efter | Norra bron öppnar, cykeln vid lott 7, Bullbil jagar, halva receptet |
| livs | Y Yasmin (Hörnlivs) | Fyrvaktarens kasse | sido | 35 s efter överlämningen (bron öppen) | Kasse med 12 ägg till Ingvar vid fyren; krockar knäcker ägg |
| nycklar | N Lås-Leif | Melkers nya nycklar | sido | 14 s efter livs (kräver cykel klar) | Nycklar till Melker vid kolonilotterna på 65 s |
| kassaskap | G Tant Gun | Kassaskåpet | huvud 4 | 45 s efter livs, annars 150 s efter cykel | Bagerikontoret: ledtrådar (lapp + diplom = 1994), ta receptet, larm, Bengt, 2 Bullbilar jagar, till Gun |
| konditori | G Tant Gun | Nyöppningen | huvud 5 | erbjuds direkt efter kassaskåpet (kort), annars 6 s | Kardemumma (Hörnlivs), smör (Macken), mjöl (kvarnen, Bullbil jagar) → invigning, Bengt vill bli lärling |
| cykelretur | M Melker | Melkers cykel | sido, anytime | 4 s efter kassaskåpet | Cykla cykeln från Guns grind till Melker vid höghuset |
| hemleverans | Y Yasmin | Hemleverans | sido, anytime | 9 s efter kassaskåpet | 3 matkassar på 120 s |
| verkstad | L Lasse | Lasses trimning | sido | 25 s efter kassaskåpet | Butiken vid första garageporten (`$` på kartan): Turbo 3000, Krockskydd 2500, Melodituta 800 |
| hopp | K Kim | Långhoppet | sido | 15 s efter första köpet | Stunthopp ≥ 34 m på byggtomten (vanlig sats ≈ 27 m, lång sats ≈ 37 m, turbo hjälper) |
| syltburken | G Tant Gun | Syltburken | huvud 6 | 10 s efter konditori | Ramma den svarta bilen tills motorn dör, ta burken, Bengt känner igen Dahlgrens bil |
| fabriken | B Bagar-Bengt | Bullfabriken | huvud 7 | 12 s efter syltburken | Vänta vid bageriets infart, skugga lastbilen (≥ 9 m, ≤ 85 m) till byggtomten (i stan som vanlig trafik: Drottninggatan → Skolgatan, ca 48 s), smyg till baracken, Dahlgren avslöjas, Gun/Bengt/Polis-Pia, slutskärm |
| salong | V Vera (Salong Saxen) | Salong Saxen | sido, inomhus | 30 s efter konditori | Frisersalongen på Skolgatan: verktyg vid disken (sax, rakhyvel, tre färger), tre kunder (Kim: kort + blått, Bengt: raka, rör inte håret, Lasse: blont, skägget stannar), 55 s tålamod var, 2 av 3 nöjda räcker, upp till 1 200 kr |
| bullfest | G Tant Gun | Bullfesten | huvud 8 | 15 s efter fabriken | Festen på torget, Jonte snor Arnes cykel med bullarna, ta hans röda racercykel (eller en bil), ta tag i luvan / knuffa till honom (eller trafiken), spring ikapp honom till fots, Polis-Pia, slutskärm. För långt bort för länge: han kommer undan, försök igen (kortare samtal) |
| cykelgomman | P Polis-Pia | Cykelgömman | teaser (`soon`) | – | Nästa naturliga del att bygga: Jontes elva stulna cyklar i gamla båthuset vid hamnen, Veras cykelsadel |

Slutskärmen visas när alla 11 i `MAIN` är klara (`lasse, pizza, race, samuel, overlamning, cykel, kassaskap, konditori, syltburken, fabriken, bullfest`). Den som redan sett slutskärmen i 0.9 får den igen efter Bullfesten.

Personer och utseenden (look-konstanter finns i respektive uppdragsfil): tant Gun (lila kofta, glasögon, knut; förklädd: keps + mörk jacka), Melker (keps, huvtröja), Yasmin (långt hår, blått förkläde), fyrvaktaren Ingvar (skägg, kaptensmössa), Lås-Leif (mustasch, glasögon, läderförkläde), Bagar-Bengt (bagarmössa, skägg, förkläde), Mjölnar-Majken (knut, förkläde), direktör Dahlgren (glasögon, mörk kavaj), Polis-Pia (knut, keps, blå uniform), Vera (rött hår i knut, glasögon, orange förkläde över svart), cykeltjuven Jonte (blont långt hår under en mörkröd mössa, mörkröd luvtröja, gul T-shirt). Kunderna i salongen är Kim, Bagar-Bengt och Lasse (med eget hår/skägg som ändras när du klipper, rakar och färgar). Spelaren: blå tröja, mörk jacka.

**Namnbyte i v1.1:** Melker hette Samuel, cykeltjuven Jonte hette Sander och frisören Vera hette Fia (bokstäverna på kartan är M, J och V). I koden lever de gamla namnen kvar som id:n så att sparade spel fungerar: uppdragen `samuel` och `cykelretur` (Melker), `salong` (Vera) och filerna `samuel.js` (`SamuelJob`, `LOOK`), `sander.js` (`Rider`) och `barber.js` (`FIA`, `FIA_LOOK`, `job.fia`), samt `WHO.samuel`, `WHO.fia`, `SANDER`/`SANDER_LOOK` och `party.sander` i fest.js, `SAMUEL` i errands.js/leif.js/fest.js och npc-id:n `'samuel-out'`, `'sander'` och `'fia'`. Allt som syns i spelet (repliker, sms, skyltar, dörrskylten MELKER, slutskärmen) använder de nya namnen.

Förslag på fortsättning som användaren kan vilja ha: "Cykelgömman" (Polis-Pia: Jontes elva cyklar i gamla båthuset vid hamnen, lämna tillbaka dem till ägarna – Vera vill ha sin sadel), västra bron (stängd, `BRIDGES[1]`) som nästa område, fler butiker att lägga pengar i, kläder eller frisyr för spelaren (Salong Saxen finns redan).

## 6. Platser (världskoordinater: +x öst, +z syd, y upp; heading h: framåt = (sin h, cos h))

- Vägar i stan: x och z = −120, −40, 40, 120 (Västra Ringvägen, **Kungsgatan** x=−40, **Drottninggatan** x=40, Östra Ringvägen; Hamngatan z=−120, **Storgatan** z=−40, **Skolgatan** z=40, Södra Ringvägen). Kvarter = `blockRange(i)`, centrum-kvarteret B(1,1) x/z −32..32.
- Start: (−33.4, 4) på Kungsgatans trottoar, utanför **Hörnlivs** (dörr `LIVS_DOOR` (−32.9, −4.5)).
- Torget med fontän i centrum; **Sjuby Konditori** på torgets södra sida (`KONDITORI_DOOR` (−6, 19), markör (−6, 17.4)); **Leifs nyckelservice** på samma hus södra fasad mot Skolgatan (`LEIF` (4, 32.5)), och **Salong Saxen** längre österut på samma fasad (`SALON_DOOR` (22, 32.6), markis x 17.6–26.4).
- **Bullfesten** (`FEST` i config.js): markör (−6, 8.4) norr om långbordet (x −9.6..−2.4, z 11.6..12.5) framför konditoriet, Arnes cykel (−0.8, 12.2), den röda racercykeln (−2.6, 6.6), Jontes väg ut österut längs z 12.6 till Drottninggatans trottoar. Flaggspelen hänger från konditoriets markis till ekarna (−11, 5) och (6, 4).
- **Höghuset** vid torget (`TOWER_DOOR` (19, −6.2)), Melker väntar på sin cykel vid (20.2, −3.6).
- **Tant Guns villa** Storgatan (`GUN` (−100.2, −50.7), grind `GUN_GATE` (−97.5, −46.8), cykeln `GUN_BIKE`).
- **Lasses Verkstad** kvarter B(2,2), leveranszon (72, 67), butik `LASSE_SHOP` (76.6, 58.1). **Macken** (58, 2). Biltvätt `CARWASH`.
- **Bryggan** i hamnen (x −75, z −172..−146), bänken (−75, −169.4).
- **Byggtomten** B(0,2) x −112..−48, z 48..112: grind mot Skolgatan x −77..−63, stunthopp (kicker z 57–66), baracker/containrar (−62..−52, 103..106) med skylten DAHLGREN AB, `SITE_OFFICE` (−57, 100.8).
- **Norra bron** x=40 från z −125 till −230, grind z −178 (öppen när `cykel` är känd).
- **Badplatsen** (`BEACH` i island.js, v1.1): sanden mellan strandlinjen `BEACH.shore` (från (−34.5, −249.1) till (25.2, −230)) och kanten mot gräset `BEACH.inland` (z ≈ −255..−230). Portalen och strandpromenaden x 3.2–4.8 från kustvägen (z −251.2) till z −233.6, bryggan x 3.1–4.9, z −233.9..−220.5 (golv y = CURB_H + 0.02 i `layout.floors`; kustens vägg har en lucka där), fyra badhytter i västra änden (x ≈ −30..−22), vimpeln (−22.4, −250.8), livräddartornet (−3.6, −239.6), sandslottet (−0.4, −236.7), glasskiosken x 8.4–11.9, z −248.9..−246.3, volleybollplanen (19.6, −238.8), flotten (−7.6, −224.6), bojarna i hörnen av `BEACH.swim`.
- **Norrholmen** (`ISLE` i island.js): kustväg (loop) + mittväg (spine x=40), kolonilotter (lott 7, cykeln (7.5, −304.4)), **bageriet** x 58..102, z −334..−310 med gård norr om (x 50..108, z −310..−270, grind på x=50 vid z −292..−283), kontorets sidodörr `OFFICE_DOOR` (56.7, −322) och upplyst fönster på västra väggen, mjölsilor, **kvarnen** (−5, −360) med Majken vid (−2.6, −354.8), **fyren** (113, −386) och Ingvars stuga (`INGVAR` (102, −386.3)), badplats, båthamn. Lastbilsjaktens start `FACTORY_START` (42.6, −279).
- Interiörer ute till havs: `INDOOR` (200, 200): höghuset lokalt 0..16 × 0..11, Hörnlivs lokalt (28..37, 26..33), kontoret lokalt (0..9, 26..33), Salong Saxen lokalt (28..38, 4..11). Golvplattan täcker lokalt −40..55 × −40..50.

## 7. Tester

- `npm test` = `test/sim.mjs` (fysik, trafik), `test/extras.mjs` (stunthopp, biltvätt, badplatsen: sakerna, folket på torra land, gå ut på bryggan och in i räckena), `test/missions.mjs` (alla uppdrag, 28 sektioner; hela `npm test` har ~538 kontroller). De flesta uppdragstester kör `traffic: 0, peds: 0` – sektion 24 kör Bullfabriken med full trafik på fem frön. Varje nytt uppdrag har fått en egen sektion; följ samma stil (`check(ok, 'beskrivning')`, hjälpare `run`, `walkHere`, `press`, `enterCar`, `parkAt`, `walkTo`, `livsSave(doneList)`, `intoOffice`, `crackSafe`, `jumpFrom`, `festGame`, `festStart`). Sektion 25 är Salong Saxen, 26 Bullfesten (och Jontes racercykel).
- Webbläsartester i `test/browser/` (Python + Playwright; Chromium finns förinstallerat i molnsandlådan, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). `cdn.py` serverar three.js från `node_modules` eftersom sandlådan saknar CDN-åtkomst. Genomgångar per version: `v02.py` … `v11.py`, `v061.py`, `v091.py`; `people.py` (människor på rad), `bike.py`, `isle.py`, `visuals.py`, `perfcmp.py` m.fl. Skripten har hårdkodade sökvägar till `/home/claude/gta7`. Kör alltid `phone` (390×844) och gärna `land` (844×390) och kolla att `logs []` (inga konsolfel).
- Användbart i sidan: `window.__gta.game` (allt simuleringstillstånd), `window.__gta.view.rig`, `openOffer(id)`, `nextTalk()`, `openShop()`.

## 8. Fallgropar vi gått på

- **Max 16 vertex-attribut** (SwiftShader/många mobiler): människoshadern ligger på 15. Packa nya data i befintliga attribut (som `aBS.z` = valfri del, `iPants.w` = stilmask).
- Skyltatlasen har begränsad plats – kolla konsolen efter `sign atlas full` när nya skyltar läggs till.
- Kollisionsgridden täcker x/z −440..260. Interiörerna ligger inom; ny mark utanför kräver att `min`/storlek ändras i `collide.js`.
- `groundHeight`: nya landområden måste in i `onIsland/onIsle`, golv i `floors`.
- När ett jobb misslyckas sätts `cool = 6` och `armed = false`; markören armeras först när spelaren varit utanför `r + 1.5`. `startOnAccept`-jobb startar om först när `cool` gått ut.
- Ett jobb som avslutas med spelaren kvar i en markör startar inte om direkt (armed-logiken) – i tester: flytta spelaren bort först.
- `exitCar()` precis vid en markör kan starta jobbet direkt (gav fel i ett test).
- `camFocus` måste nollställas i `cleanup`; kameralutningen inomhus nollställs direkt utomhus (annars hamnar kameran ute till havs).
- Fönster/dörrar på fasader är bara lådor framför fasadens shader-fönster.
- Samtal öppnas en bildruta efter `talk`-händelsen – i webbläsartester: vänta några frames innan `nextTalk()`.
- Sandlådans nätverk: CDN, github.io och vissa GitHub-API:er är blockerade; `gh run list` fungerar.
- **Testa med trafik.** Uppdragstesterna kör utan trafik, så att lastbilen kunde låsa sig i korsningar (4 av 30 körningar) syntes bara i webbläsaren. Stresstesta datorförare på flera frön med `new Game({ seed })` (full trafik och folk) innan något blir ett måste att följa.
- `traffic.release()` på en bil som tappat vägen (`ai.lost`, `path: null`) kastade förut ett fel när städningen tog bort den (konsolfel och en hoppad bildruta) – nu kollas `path` först.
- `ped.arrived` blir kvar `true` efter en `goto`: kunderna i salongen försvann på stället när de skulle gå, tills `leave()` nollställde den.
- Placera inte folk med fasta förskjutningar bredvid spelaren i stan – de kan hamna inne i en vägg (Polis-Pia gjorde det). Välj en ledig plats (`world.query` + `circleVs`, som `exitCar` och Pias plats i fest.js).
- **Layoutens slump `R` i island.js** får inte användas av nytt innehåll före träden – då flyttar sig träd och annat över hela ön. Badplatsen använder `hash(i)` (island.js) och `rand(seed)` (beach.js). I v1.1 jämfördes hela layouten mot v1.0 utanför stranden: identisk.
- `GeomBuilder.box` hoppar över undersidan som standard (`skipBottom` är true). En undersida som ska kunna synas behöver `{ skipBottom: false }` – skosulorna var genomskinliga när någon låg ner.
- Cykelns ekrar var lådor som stack ut 24 cm utanför däcket (syntes mest när framhjulet svängde). Nu är de `tube` från navet till fälgens insida; `v11.py` kollar att inget i hjulen når utanför däcket (radie ≤ hjulets radie, och nära fälgen inte bredare än däcket).
- Tant Guns hejdå-replik från bryggan ("Norra bron, lilla vän. Glöm inte!") kom även på festen och vid konditoriet i ett laddat spel – den kräver nu att cykeluppdraget inte är klart och att hon inte är `pinned`/`konditori`.

## 9. Senaste ändringar (v0.6 → v1.1)

- v0.6: Norrholmen, norra bron, Arnes budcykel (cykel som fordon), Bullbilen-jakt (`Chaser`), GPS över ön.
- v0.6.1: Hörnlivs inifrån, Yasmin, Fyrvaktarens kasse (ägg), Ingvars stuga.
- v0.7: Kassaskåpet (kontoret, ledtrådar, larm, Bengt, två Bullbilar), Lås-Leif och Melkers nya nycklar, gemensamt interiörsystem.
- v0.8: Nyöppningen (tre ingredienser, invigning), Lasses trimning (pengar → uppgraderingar), Långhoppet.
- v0.8.1: ny människomodell med valfria delar, stilar för alla, röster i samtalen.
- v0.9: tydligare nästa steg (direkt erbjudande efter kassaskåpet, "fortsätter snart" i rutan och listan), Syltburken, Bullfabriken, Melkers cykel, Hemleverans, `Chaser.polite`, cooldown innan `startOnAccept`-jobb börjar om.
- v0.9.1: buggfix – Dahlgrens lastbil kunde fastna för gott i en korsning när det var trafik (oftast där bron når stan), och då gick sista huvuduppdraget inte att klara. Nu kör den som vanlig trafik i stan (`traffic.join`, `ai.dest`), parkerar vid grinden så att trafiken kör om, och har ett test med full trafik. Även: `traffic.release()` tål bilar som tappat vägen.
- v1.0: sidouppdraget Salong Saxen (inomhus, Veras frisersalong på Skolgatan: klippa, raka, färga), huvuduppdragets del 8 Bullfesten (festen på torget, cykeltjuven Jonte, röda racercykeln `racebike`, `Rider` på trottoarnätet, Polis-Pia), teasern Cykelgömman, `ped.goto`, festdekorationer och bullar i Arnes låda, nya röster och salongsljud, två nya rader på slutskärmen.
- v1.1: nya namn – Samuel heter Melker, Sander heter Jonte och Fia heter Vera (koden behåller de gamla id:na, se avsnitt 5). Cyklarna: nya hjul (runt däck, fälg, nav och korsade ekrar innanför fälgen – förut stack ekrarna ut genom däcket), Arnes cykel med kedjeskydd, pakethållare, stänkskärmar och vevar, och racercykeln med en riktig racerram och två stora hjul (`RACER_GEO`). Norrholmens badplats byggd på nytt (`beach.js`, `BEACH`): sand med våt kant och skum, strandpromenad och portal, brygga att gå ut på med hoppsvikt, badhytter, livräddartorn, glasskiosk, parasoller med solstolar och handdukar, volleyboll, sandslott, flotte och bojar, strandråg och vresrosor, och badgäster i badkläder (`STYLE.swim`) som bara ritas. Skosulorna har fått undersida.
