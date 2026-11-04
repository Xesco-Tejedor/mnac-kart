# MNAC KART — Curses al Museu

Joc de curses de karts d'estil arcade retro (16 bits) que corre **dins del MNAC**
(Museu Nacional d'Art de Catalunya). Pixel art i música xip 100% procedurals:
no hi ha cap asset extern.

## Jugar

**Demo online:** https://xesco-tejedor.github.io/mnac-kart/

Obre l'enllaç amb Chrome (escriptori o Android). En mòbil, juga en panoràmic.

## Pilots

| Pilot | Kart | Estil |
|---|---|---|
| Mestre Pintor | Cavallet V8 | equilibrat |
| Serafí | Seis Ales | acceleració |
| Crist Majestat | Maiestas | velocitat punta |
| Sant Lluc de les Brases Rojes | Braser Rodó | ràpid i lliscant |
| AgnusDei | Set Rodes (¡7 rodes!) | adherència màxima |
| Gàrgola | Pedra Viva | pes pesat |
| Musa Modernista | Flor de Ferro | estable |
| Diable de Taüll | Banyut | sortida explosiva |

## Circuits

1. **Gran Vestíbul** — oval ràpid entre columnes
2. **Sala dels Capitells** — tècnic, amb xicanes
3. **Absis de Taüll** — revolts entre frescos
4. **Terrassa del Mirador** — rectes llargues sota les estrelles

## Modes

- **Gran Premi MNAC**: les 4 curses seguides amb puntuació (9-7-5-3-2-1)
- **Cursa Ràpida**: tria circuit i pilot
- **Contrarellotge**: sol contra el temps; els rècords es guarden al navegador
- Dues cilindrades: 100cc i 150cc

## Controls

**Mòbil (tàctil):** ◀ ▶ per girar · DERRAP (mantén en corba i deixa anar per al turbo) · OBJETE · FRE

**Teclat:** ← → girar · ↓/S frenar · Espai/Maj derrapar · X/Intro objecte · Esc/P pausa

**Orientació:** el joc aguanta la pantalla en panoràmic durant la cursa, encara que
el mòbil interpreti la inclinació del gir com un canvi de posició: a Chrome/Android
bloqueja l'orientació de debò (pantalla completa), i on el navegador no ho permet
(p. ex. iPhone) el joc rota internament i la cursa no s'interromp.

## Objectes

Pinzellada (pintura lliscant) · Llança de Sant Jordi (perseguidora) ·
Ales de Serafí (turbo) · Escut del Capitell (protecció)

Les monedes romàniques (màx. 10) pugen la velocitat punta. Les fletxes ambre són turbos.

## Contacte sòlid

Els karts no es travessen: ni entre ells ni amb les parets. Si mantens premut
contra un rival, l'empeny sense enfonsar-t'hi; contra una paret, rellisques o
reboten, però mai hi quedes encastat ni la travesses a poc a poc.

## Tècnic

`index.html` + `styles.css` + `game.js` (sense dependències ni build).
Render Mode 7 per línies d'escaneig sobre `<canvas>`, so WebAudio generatiu.
`tests.html` executa la bateria automàtica de mecàniques (56 proves).
