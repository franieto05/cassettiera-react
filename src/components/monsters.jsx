/*
  STRUTTURA DEI CASSETTI (nessun mostro disegnato)

  Ogni cassetto è un oggetto con:
  - id        identificativo unico
  - name      testo sulla targhetta del cassetto
  - layers    elenco di forme che nascono da una macchia indistinta e si trasformano
              nella sagoma finale. Per ogni forma:
                points  vertici della sagoma finale (viewBox 240x280), IN SENSO ORARIO,
                        partendo dal punto più alto al centro
                fill    colore pieno oppure [colore alto, colore basso] per un gradiente
                blob    macchia di partenza: centro (cx, cy), raggio r, phase (varia l'aspetto)
                delay   0..1: quando inizia a trasformarsi rispetto all'animazione totale
                fade    true se deve comparire gradualmente
  - details   funzione che disegna i dettagli finali (appaiono alla fine).
              Riceve `glow`, un filtro luminoso da usare con filter={glow}.

  Qui ogni cassetto usa una sagoma segnaposto (un rettangolo arrotondato con un numero).
  Quando avrete i disegni veri, sostituite `layers` e `details` di quel cassetto.
*/

// Sagoma neutra: rettangolo arrotondato. Sostituibile con i vostri vertici.
const FORMA_SEGNAPOSTO = [
  [120, 90], [152, 90], [170, 108], [170, 192], [152, 210],
  [120, 210], [88, 210], [70, 192], [70, 108], [88, 90],
];

// Crea un cassetto segnaposto
export const cassetto = ({ id, name, label = "?", phase = 0 }) => ({
  id,
  name,
  layers: [
    {
      key: "forma",
      points: FORMA_SEGNAPOSTO,
      fill: ["#5a5a68", "#2c2c36"],
      stroke: "#15151c",
      strokeWidth: 1.5,
      blob: { cx: 120, cy: 215, r: 34, phase },
      delay: 0.0,
      fade: false,
    },
  ],
  details: () => (
    <text x="120" y="172" textAnchor="middle" fontSize="56" fill="#ffffff"
          fontFamily="Georgia, serif">
      {label}
    </text>
  ),
});

// Elenco dei cassetti: aggiungi o togli righe
export const CASSETTI = [
  { id: "c1", name: "Baba Yaga", image: "/img/babayaga.jpg", alt: "Baba Yaga" },
  {id: "c3", name:"Maciara", image: "/img/maciara.jpg", alt: "Maciara"},
  cassetto({ id: "c2", name: "Yokai", label: "2", phase: 1.2 }),
  cassetto({ id: "c4", name: "Dracula", label: "4", phase: 3.6 }),
  cassetto({ id: "c5", name: "Mummia", label: "5", phase: 4.8 }),
];
// Alias: funziona anche se App.jsx importa MONSTERS
export const MONSTERS = CASSETTI;
