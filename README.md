# GTA 7 – Grovt Tillgrepp av Automobil

Ett litet GTA-inspirerat skämtspel som körs direkt i webbläsaren och är byggt för mobilen först. Version 0.3 är en bit av småstaden Sjuby med tre uppdragsgivare, ett sidouppdrag och en uppdragslista där du själv väljer vad du tar dig an härnäst. I 0.3.1 fick bilarna och träden ett lyft.

**Spela:** https://jmai80.github.io/gta7/

Lägg gärna till spelet på hemskärmen, så körs det i helskärm:
- **iPhone:** Safari → Dela → Lägg till på hemskärmen
- **Android:** Chrome → meny (⋮) → Lägg till på startskärmen. Spelet går också i helskärm direkt när du trycker på SPELA.

## Kontroller

| | Mobil | Dator |
|---|---|---|
| Gå och köra | Vänster tumme (spak). Uppåt är gas, nedåt broms och back | WASD eller piltangenterna, Shift springer |
| Stjäla, kliva in och ur, prata | Den gula knappen, KLIV UR | E |
| Svara på uppdrags-sms | Tryck på sms:et | Klicka eller J |
| Uppdragslistan | Listknappen eller uppdragsrutan | U |
| Handbroms | HANDBROMS | Mellanslag |
| Tuta | TUTA | H |
| Titta runt | Dra på höger sida | Dra med musen |
| Paus | Pausknappen | Esc |

I pausmenyn finns ljud, körkontroll (spak eller pedaler), grafik (Auto, Batterisnål, Snygg) och en FPS-mätare.

## Uppdrag i version 0.3

Uppdragen kommer som sms. Tryck på sms:et och välj **Acceptera** för att följa uppdraget, så visar den gula linjen på kartan vägen, eller **Vänta** för att spara det i uppdragslistan. I listan (listknappen uppe till höger, eller tryck på uppdragsrutan) väljer du sedan vilket uppdrag du vill följa härnäst. Bokstäverna på kartan visar alla uppdrag du kan ta dig an.

Pizzabudet och gatloppet körs ett i taget. Lasses bil och tant Guns flagga räknas däremot när du än gör dem, även mitt i ett annat uppdrag. Misslyckas du kan du försöka igen.

- **L – Lasse (Verkstan):** sno en röd bil (1 000 kr) och kör den till Lasses Verkstad (upp till 5 000 kr, minus bucklor). Uppdraget kommer som ett SMS när spelet börjar.
- **S – Sanna (Pizzeria Sjuan):** Pizzabudet. Gå in i den gröna markören vid pizzerian på Kungsgatan och ta pizzabilen på parkeringen mittemot. Tre pizzor ska till tre adresser innan de kallnar. Du får 250 kr plus dricks per pizza (krockar sänker dricksen), och 500 kr i bonus om alla är varma.
- **K – Kim (Macken):** Gatloppet. Kör in i den blå markören på Macken med en bil. Det blir två varv runt stan mot Kim och Bosse, och ringarna visar vägen. Vinnaren får 2 500 kr.
- **G – Tant Gun (sidouppdrag):** tant Gun står i trädgården vid en villa på Storgatan och vinkar. Prata med henne och håll sedan inne knappen vid flaggstången för att hissa flaggan. Hon ger dig 300 kr och en kanelbulle.

Framstegen (pengar, klara uppdrag, uppdragslistan och statistik) sparas i webbläsaren. **Börja om** i pausmenyn raderar dem, men först efter att du tryckt två gånger.

## Övrigt i stan

- **Trafik:** två bilmodeller, turordning i korsningar och förare som tutar när du står i vägen. Det går även folk på trottoarerna.
- **Bilarna:** rundade karosser med hjulhus, däck med fälgar, fönster med stolpar och ramar, krom, backspeglar och lyktor fram och bak. Bullbilen är tvåfärgad med skylt på sidan.
- **Träden:** lövträd med flera lövklumpar, grenar och rotben, björkar med vit näver och granar med lager av hängande grenar. Lövverket rör sig lite i vinden.
- **Annat att göra:** bilkapning, hopp ut i farten, stunthopp på byggtomten och en biltvätt som lagar bucklor.
- **HUD:** minikarta med GPS och uppdragsbokstäver, SMS från uppdragsgivarna, fartmätare och bilens skick.

## Teknik

- three.js 0.184 (WebGL2) laddas från jsDelivr. Det finns inget byggsteg, bara vanliga ES-moduler.
- Allt genereras av kod: inga bilder, 3D-modeller eller ljudfiler. Ljudet syntetiseras med Web Audio.
- Stan slås ihop till omkring 30 ritanrop. Bilar och människor ritas med instancing och animeras i shadern.
- Skuggorna bakas en gång vid start. Bilarna har en egen enkel fysik, och upplösningen anpassas efter enhetens prestanda med ett tak på 60 fps.
- Simuleringen (trafik, fysik, datorförarna i gatloppet och uppdragen) är ren JavaScript utan grafik och testas i Node.

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
| `src/vehicle.js`, `traffic.js`, `peds.js`, `player.js` | Bilfysik, trafik-AI, fotgängare och spelaren |
| `src/mission.js`, `pizza.js`, `race.js`, `racer.js`, `flag.js` | Uppdragslistan, pizzabudet, gatloppet, datorförarna och tant Guns flagga |
| `src/render.js`, `shaders.js`, `worldmesh.js`, `models.js`, `geom.js`, `textures.js` | Grafiken |
| `src/hud.js`, `input.js`, `audio.js` | Gränssnitt, kontroller och ljud |
| `test/` | Simuleringstester för Node |

## Om namnet

Det här är ett skämtprojekt och inte kopplat till något riktigt spelbolag. Typsnittet är Big Shoulders Display och används under SIL Open Font License (se `fonts/OFL.txt`).
