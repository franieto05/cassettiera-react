import { useEffect, useId, useMemo, useRef, useState } from "react";
import "./MonsterDrawer.css";

/* ---------- Morphing generico: blob -> sagoma del mostro ---------- */
const N = 72; // punti per forma, uguale per blob e sagoma finale
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));

// Ricampiona un poligono su n punti mantenendo i vertici
function resample(v, n) {
  const m = v.length, len = [];
  let L = 0;
  for (let i = 0; i < m; i++) {
    const a = v[i], b = v[(i + 1) % m];
    len[i] = Math.hypot(b[0] - a[0], b[1] - a[1]);
    L += len[i];
  }
  const k = len.map((l) => Math.max(1, Math.floor((l / L) * n)));
  let sum = k.reduce((a, b) => a + b, 0);
  while (sum < n) {
    let best = 0, bv = -1;
    for (let i = 0; i < m; i++) { const r = (len[i] / L) * n - k[i]; if (r > bv) { bv = r; best = i; } }
    k[best]++; sum++;
  }
  while (sum > n) {
    let best = -1, bv = 1e9;
    for (let i = 0; i < m; i++) if (k[i] > 1) { const r = (len[i] / L) * n - k[i]; if (r < bv) { bv = r; best = i; } }
    k[best]--; sum--;
  }
  const out = [];
  for (let i = 0; i < m; i++) {
    const a = v[i], b = v[(i + 1) % m];
    for (let j = 0; j < k[i]; j++) out.push([lerp(a[0], b[0], j / k[i]), lerp(a[1], b[1], j / k[i])]);
  }
  return out;
}

// Forma indistinta di partenza
function blob({ cx, cy, r, phase }) {
  return Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
    const rr = r * (1 + 0.22 * Math.sin(3 * a + phase) + 0.12 * Math.sin(5 * a + 2 * phase));
    return [cx + rr * Math.cos(a), cy + rr * 0.8 * Math.sin(a)];
  });
}

// Punti -> path curvo (k=1 morbido, k~0.3 spigoloso)
function toPath(P, k) {
  const n = P.length;
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * k) / 6, p1[1] + ((p2[1] - p0[1]) * k) / 6];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * k) / 6, p2[1] - ((p3[1] - p1[1]) * k) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

// Prepara i punti di partenza e di arrivo di un mostro (una volta sola, via useMemo)
const prepare = (monster) =>
  (monster.layers ?? []).map((L) => ({
    to: resample(L.points, N),
    from: blob(L.blob),
    delay: L.delay,
    fade: L.fade,
  }));

// Disegna un fotogramma: p = avanzamento 0..1
function render(els, data, p, time = 0) {
  // Cassetto con immagine: emerge dal buio, sale dal fondo, trema e sfarfalla,
  // poi diventa nitida e a colori
  if (els.img) {
    const q = ease(p);
    const mid = Math.sin(Math.PI * q);                         // 0 all'inizio e alla fine, 1 a metà
    const flick = 1 + 0.3 * Math.sin(time * 0.05) * (1 - q);   // sfarfallio che si spegne
    const bright = Math.max(0.05, (0.1 + 0.9 * q) * flick);
    els.img.style.opacity = clamp(q * 1.6);
    els.img.style.filter =
      `blur(${((1 - q) * 18).toFixed(1)}px) brightness(${bright.toFixed(2)}) ` +
      `grayscale(${(1 - q).toFixed(2)}) contrast(${(1 + (1 - q) * 0.6).toFixed(2)})`;
    els.img.style.transform =
      `translate(${(Math.sin(time * 0.09) * mid * 2).toFixed(1)}px, ${((1 - q) * 28).toFixed(1)}px) ` +
      `rotate(${(Math.sin(time * 0.004) * (1 - q) * 3).toFixed(2)}deg) ` +
      `scale(${(0.8 + 0.2 * q).toFixed(3)})`;
    els.img.classList.toggle("alive", p >= 1);                 // a fine corsa parte il riflesso
    return;
  }
  data.forEach((L, i) => {
    const el = els.layers[i];
    if (!el) return;
    const q = ease((p - L.delay) / (1 - L.delay));
    const wob = Math.sin(Math.PI * q) * 4;
    const pts = L.to.map((t, j) => [
      lerp(L.from[j][0], t[0], q) + Math.sin(j * 0.9 + time * 0.004 + i) * wob,
      lerp(L.from[j][1], t[1], q) + Math.cos(j * 1.3 + time * 0.005 + i) * wob,
    ]);
    el.setAttribute("d", toPath(pts, lerp(1, 0.3, q)));
    if (L.fade) el.setAttribute("opacity", clamp(q * 2.5));
  });
  els.details.setAttribute("opacity", clamp((p - 0.85) / 0.15));
  els.blur.setAttribute("stdDeviation", (6 * Math.pow(1 - clamp(p * 1.15), 2)).toFixed(2));
  els.svg.classList.toggle("alive", p >= 1);
}

/* ---------- Componente ---------- */
export default function MonsterDrawer({
  monster,
  open: openProp,        // se lo passi, il cassetto è "controllato" dal genitore
  onToggle,              // chiamata al click quando è controllato
  duration = 2200,       // ms per la trasformazione completa
  closeDuration = 700,   // ms per tornare al blob
  delay = 450,           // attesa dopo l'apertura del cassetto
}) {
  const controlled = openProp !== undefined;
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlled ? openProp : innerOpen;
  const toggle = () => (controlled ? onToggle?.() : setInnerOpen((o) => !o));

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const blurId = `blur-${uid}`, glowId = `glow-${uid}`;
  const data = useMemo(() => prepare(monster), [monster]);

  // Immagine del cassetto (se c'è `images`, usa la prima)
  const imageSrc = monster.image ?? monster.images?.[0]?.src ?? null;
  const imageAlt = monster.alt ?? monster.images?.[0]?.alt ?? monster.name;

  const svgRef = useRef(null);
  const layerRefs = useRef([]);
  const detailsRef = useRef(null);
  const blurRef = useRef(null);
  const imgRef = useRef(null);
  const pRef = useRef(0);    // progresso corrente, persiste tra un'apertura e l'altra
  const rafRef = useRef(0);

  useEffect(() => {
    const els = {
      svg: svgRef.current, layers: layerRefs.current,
      details: detailsRef.current, blur: blurRef.current, img: imgRef.current,
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const go = (target, ms) => {
      cancelAnimationFrame(rafRef.current);
      const start = pRef.current, t0 = performance.now();
      const dur = ms * Math.abs(target - start);
      if (reduce || dur === 0) { pRef.current = target; render(els, data, target); return; }
      const tick = (now) => {
        const u = clamp((now - t0) / dur);
        pRef.current = lerp(start, target, u);
        render(els, data, pRef.current, now);
        if (u < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    let timer;
    if (open) timer = setTimeout(() => go(1, duration), delay);
    else go(0, closeDuration);

    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [open, data, duration, closeDuration, delay]);

  return (
    <div className={`monster-drawer${open ? " is-open" : ""}`}>
      <div className="md-interior">
        {imageSrc ? (
          <div ref={imgRef} className="md-imgbox">
            <img className="md-img" src={imageSrc} alt={imageAlt} draggable="false" />
          </div>
        ) : (
        <svg ref={svgRef} viewBox="0 0 240 280" role="img"
             aria-label={`Una forma scura che prende le sembianze di ${monster.name}`}>
          <defs>
            <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur ref={blurRef} stdDeviation="6" />
            </filter>
            <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
            {monster.layers.map((L, i) =>
              Array.isArray(L.fill) ? (
                <linearGradient key={L.key} id={`${uid}g${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={L.fill[0]} />
                  <stop offset="1" stopColor={L.fill[1]} />
                </linearGradient>
              ) : null
            )}
          </defs>

          <g filter={`url(#${blurId})`}>
            {monster.layers.map((L, i) => (
              <path
                key={L.key}
                ref={(el) => { layerRefs.current[i] = el; }}
                fill={Array.isArray(L.fill) ? `url(#${uid}g${i})` : L.fill}
                stroke={L.stroke}
                strokeWidth={L.strokeWidth ?? 1}
                strokeLinejoin="round"
                opacity={L.fade ? 0 : 1}
              />
            ))}
            <g ref={detailsRef} opacity="0">
              {monster.details(`url(#${glowId})`)}
            </g>
          </g>
        </svg>
        )}
      </div>

      <button
        type="button"
        className={`md-front${open ? " open" : ""}`}
        aria-expanded={open}
        aria-label={`${open ? "Chiudi" : "Apri"} il cassetto di ${monster.name}`}
        onClick={toggle}
      >
        <span className="md-handle" />
        <span className="md-label">{monster.name}</span>
      </button>
    </div>
  );
}
