# GTA 7 – Grovt Tillgrepp av Automobil

Ett litet GTA-inspirerat skämtspel som körs direkt i webbläsaren och är byggt för mobilen först. Version 0.1 är en bit av småstaden Sjuby: sno en röd bil och kör den till Lasses verkstad.

**Spela:** https://jmai80.github.io/gta7/

Lägg gärna till spelet på hemskärmen, så körs det i helskärm:
- **iPhone:** Safari → Dela → Lägg till på hemskärmen
- **Android:** Chrome → meny (⋮) → Lägg till på startskärmen. Spelet går också i helskärm direkt när du trycker på SPELA.

## Kontroller

| | Mobil | Dator |
|---|---|---|
| Gå och köra | Vänster tumme (spak). Uppåt är gas, nedåt broms och back | WASD eller piltangenterna, Shift springer |
| Stjäla, kliva in och ur | Den gula knappen, KLIV UR | E |
| Handbroms | HANDBROMS | Mellanslag |
| Tuta | TUTA | H |
| Titta runt | Dra på höger sida | Dra med musen |
| Paus | Pausknappen | Esc |

I pausmenyn finns ljud, körkontroll (spak eller pedaler), grafik (Auto, Batterisnål, Snygg) och en FPS-mätare.

## Innehåll i version 0.1

- **Uppdrag:** sno en röd bil (1 000 kr) och leverera den till Lasses Verkstad (upp till 5 000 kr, minus bucklor).
- **Trafik:** två bilmodeller, turordning i korsningar och förare som tutar när du står i vägen. Det går även folk på trottoarerna.
- **Övrigt:** bilkapning, hopp ut i farten, stunthopp på byggtomten och en biltvätt som lagar bucklor.
- **HUD:** minikarta med GPS, SMS från Lasse, fartmätare och bilens skick.

## Teknik

- three.js 0.184 (WebGL2) laddas från jsDelivr. Det finns inget byggsteg, bara vanliga ES-moduler.
- Allt genereras av kod: inga bilder, 3D-modeller eller ljudfiler. Ljudet syntetiseras med Web Audio.
- Stan slås ihop till omkring 30 ritanrop. Bilar och människor ritas med instancing och animeras i shadern.
- Skuggorna bakas en gång vid start. Bilarna har en egen enkel fysik, och upplösningen anpassas efter enhetens prestanda med ett tak på 60 fps.
- Simuleringen (trafik, fysik och uppdrag) är ren JavaScript utan grafik och testas i Node.

## Köra lokalt

ES-moduler behöver en webbserver. Det räcker alltså inte att dubbelklicka på `index.html`.

```sh
python3 -m http.server 8000    # eller: npx serve .
```

Öppna sedan http://localhost:8000. Kör testerna med `npm test` (kräver Node 18 eller senare).

## Filer

| Fil | Innehåll |
|---|---|
| `index.html` | Sidan, HUD, menyer och CSS |
| `src/main.js` | Uppstart, spel-loop och kopplingen mellan delarna |
| `src/game.js` | Simuleringens kärna |
| `src/layout.js` | Staden Sjuby som data: kvarter, hus, vägar och kolliderare |
| `src/vehicle.js`, `traffic.js`, `peds.js`, `player.js`, `mission.js` | Bilfysik, trafik-AI, fotgängare, spelaren och uppdragen |
| `src/render.js`, `shaders.js`, `worldmesh.js`, `models.js`, `geom.js`, `textures.js` | Grafiken |
| `src/hud.js`, `input.js`, `audio.js` | Gränssnitt, kontroller och ljud |
| `test/` | Simuleringstester för Node |

## Om namnet

Det här är ett skämtprojekt och inte kopplat till något riktigt spelbolag. Typsnittet är Big Shoulders Display och används under SIL Open Font License (se `fonts/OFL.txt`).
