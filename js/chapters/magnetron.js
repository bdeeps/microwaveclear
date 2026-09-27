// Chapter 2: inside the magnetron. Electrons leave a hot cathode, a magnet bends them
// into curves, and they swirl past ten resonant cavities in the copper anode.
//
// The model uses the two classic magnetron conditions for a cylindrical tube:
//  - Hull cut-off: electrons only reach the anode directly if V > (e/8m)·B²·ra²·(1 − rc²/ra²)².
//  - Hartree threshold: they only fall into step with the wave (and give it energy) if
//    V > (ω/n)·B·(ra² − rc²)/2 − (m/2e)·(ωra/n)², with n = 5 for the π-mode of a 10-vane anode.
// Between the two lines the magnetron oscillates. Dimensions are those of a typical domestic
// 2.45 GHz tube (10 vanes, anode bore about 9 mm, cathode about 3.8 mm across), which puts
// the working point near 4 kV and 0.17–0.2 T. References: Collins, "Microwave Magnetrons"
// (MIT Rad Lab Series vol. 6, 1948); Pozar, "Microwave Engineering".
// Current above the Hartree line rises steeply (dynamic resistance ~900 Ω, capped by the supply).
import { THREE, M, box, tube as tubeMesh, torus, arrow, canvasTexture, clamp, approach, lerp } from '../kit.js';
import { F, LAMBDA } from '../microwave.js';

const E = 1.602176634e-19, ME = 9.1093837e-31;
const RA = 4.5e-3, RC = 1.9e-3, N_VANES = 10, NMODE = N_VANES / 2, W = 2 * Math.PI * F;
export const hartree = (B) => (W / NMODE) * B * (RA * RA - RC * RC) / 2 - (ME / (2 * E)) * (W * RA / NMODE) ** 2;
export const hull = (B) => (E / (8 * ME)) * B * B * RA * RA * (1 - (RC * RC) / (RA * RA)) ** 2;
const R_DYN = 900, I_MAX = 0.5, ETA = 0.68;

export function operate(V, B) {
  const vh = hartree(B), vc = hull(B);
  if (V >= vc) return { mode: 'short', I: I_MAX, eta: 0, vh, vc };
  if (V < vh) return { mode: 'cut', I: 0, eta: 0, vh, vc };
  const I = clamp((V - vh) / R_DYN, 0, I_MAX);
  const eta = ETA * clamp((vc - V) / (0.25 * (vc - vh)), 0, 1);   // falls away close to the Hull line
  return { mode: 'osc', I, eta, vh, vc };
}
// Largest radius an electron reaches below cut-off, from V = (e/8m)B²r²(1 − rc²/r²)².
function hubRadius(V, B) {
  let lo = RC, hi = RA;
  for (let i = 0; i < 40; i++) { const r = (lo + hi) / 2, v = (E / (8 * ME)) * B * B * r * r * (1 - (RC * RC) / (r * r)) ** 2; if (v < V) lo = r; else hi = r; }
  return lo;
}

// Model scale: the anode bore (4.5 mm) is 1 unit.
// Drawn about 1.3× wider in the bore than a real tube, so the electrons are easier to see.
const S = 1.3 / (RA * 1000), rA = 1.3, rC = RC * 1000 * S, R_OUT = 2.6, R_HOLE = 1.95, HOLE = 0.33, SLOT = 0.09, H = 0.9;

function anodeShape() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, R_OUT, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  const d = Math.asin(SLOT / rA), dh = Math.asin(SLOT / HOLE);
  for (let k = 0; k < N_VANES; k++) {
    const p = (k / N_VANES) * Math.PI * 2, next = ((k + 1) / N_VANES) * Math.PI * 2;
    const c = [Math.cos(p), Math.sin(p)], n = [-Math.sin(p), Math.cos(p)];
    // slot, one side
    const a0 = [rA * Math.cos(p - d), rA * Math.sin(p - d)];
    if (k === 0) hole.moveTo(...a0); else hole.lineTo(...a0);
    const hx = c[0] * R_HOLE, hy = c[1] * R_HOLE, back = Math.sqrt(HOLE * HOLE - SLOT * SLOT);
    hole.lineTo(hx - c[0] * back - n[0] * SLOT, hy - c[1] * back - n[1] * SLOT);
    // round the hole (clockwise, so it goes the long way round)
    const start = Math.atan2(-c[1] * back - n[1] * SLOT, -c[0] * back - n[0] * SLOT);
    const end = Math.atan2(-c[1] * back + n[1] * SLOT, -c[0] * back + n[0] * SLOT);
    hole.absarc(hx, hy, HOLE, start, end, false);
    hole.lineTo(rA * Math.cos(p + d), rA * Math.sin(p + d));
    hole.absarc(0, 0, rA, p + d, next - d, false);
  }
  shape.holes.push(hole);
  return shape;
}

export default {
  id: 'magnetron',
  short: 'The magnetron',
  title: 'How a magnetron makes microwaves',
  subtitle: 'Electrons whirl in a magnetic field past copper cavities that ring like whistles.',
  view: { pos: [1.9, 11.4, 7.0], target: [1.9, 0.6, -1.3] },
  learn: `<p>The magnetron is a <b>vacuum tube</b> the size of a fist. In the middle is a <b>cathode</b>, a coil of wire heated until it glows and boils off <b>electrons</b>. Around it is a thick copper <b>anode</b>, with about 4,000 volts pulling the electrons outwards.</p>
    <p>On their own, the electrons would fly straight across. But two strong <b>magnets</b> above and below bend their paths into curves, so they whirl around the cathode instead.</p>
    <p>The anode is carved with ten little <b>cavities</b>. Like blowing across a bottle makes it whistle, the swirling electrons make each cavity <b>ring</b>, with electric charge sloshing back and forth 2.45 billion times a second. The ringing bunches the electrons into turning <b>spokes</b>, which feed the cavities more energy. An <b>antenna</b> carries the energy off into the waveguide as microwaves, about <b>12.2 cm</b> long.</p>
    <p>It only works in a sweet spot. Too weak a magnet and the electrons crash straight into the anode. Too little voltage and they never reach it.</p>
    <p class="tip"><b>Try it:</b> weaken the magnet until the electrons short straight across, then lower the voltage until they just circle the cathode.</p>`,
  terms: [
    { t: 'Cathode', d: 'The hot centre of the tube. It gives off electrons.' },
    { t: 'Anode', d: 'The copper block around the cathode, held at a high positive voltage.' },
    { t: 'Resonant cavity', d: 'A hollow in the metal that rings at one frequency, like a bottle you blow across.' },
    { t: 'Spokes', d: 'Bunches of electrons that turn in step with the ringing cavities and feed them energy.' },
    { t: 'Frequency', d: 'How many times a second a wave wiggles. Microwave ovens use 2.45 GHz: 2.45 billion times.' },
    { t: 'Wavelength', d: 'The length of one wiggle: the speed of light divided by the frequency. About 12.2 cm here.' },
  ],
  defaults: { V: 4.2, B: 0.175 },
  controls: [
    { key: 'V', type: 'range', label: 'Anode voltage', min: 1.5, max: 6, step: 0.05, ends: ['low', 'high'], fmt: (v) => (v * 1000).toLocaleString('en', { maximumFractionDigits: 0 }) + ' V' },
    { key: 'B', type: 'range', label: 'Magnet strength', min: 0.05, max: 0.3, step: 0.005, ends: ['weak', 'strong'], fmt: (v) => v.toFixed(3) + ' T' },
  ],
  quiz: [
    { q: 'What do the magnets in a magnetron do?', options: ['Hold the tube in place', 'Bend the electrons into curved paths so they whirl around', 'Heat the cathode', 'Stop the microwaves escaping'], answer: 1, why: 'A magnetic field pushes sideways on a moving electron, turning its straight path into a curve.' },
    { q: 'What sets the magnetron’s frequency of 2.45 GHz?', options: ['The wall socket', 'The size of the cavities in the copper anode', 'How hot the cathode is', 'The turntable'], answer: 1, why: 'Each cavity rings at a frequency set by its size, just as a bigger bottle gives a lower note.' },
    { q: 'What happens if the magnet is too weak?', options: ['More microwaves', 'The electrons fly straight into the anode and no microwaves are made', 'The frequency doubles', 'Nothing changes'], answer: 1, why: 'Without enough bending, electrons short straight across. Current flows but it only makes heat.' },
  ],
  reel: [
    { ms: 5600, caption: 'In a magnetron, a magnet bends electrons into spokes that whirl past ten copper cavities.', set: { V: 4.2, B: 0.175 }, view: { pos: [1.2, 7.4, 5.0], target: [0.3, 0, 0.2] }, spin: 0.3 },
    { ms: 5000, caption: 'Weaken the magnet and the electrons crash straight into the copper: no microwaves at all.', set: { V: 4.2 }, anim: { B: [0.175, 0.08] }, view: { pos: [1.2, 7.4, 5.0], target: [0.3, 0, 0.2] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tube = new THREE.Group(); tube.position.set(-0.4, 0.6, 0.4); tube.scale.setScalar(1.15); root.add(tube);

    // Copper anode block with ten keyhole cavities, axis vertical.
    const geo = new THREE.ExtrudeGeometry(anodeShape(), { depth: H, bevelEnabled: false, curveSegments: 48 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, -H / 2, 0);
    const anode = new THREE.Mesh(geo, M.metal(0xd07a3c, { roughness: 0.3 })); anode.castShadow = true; anode.receiveShadow = true;
    tube.add(anode);
    // Vane tips glow + and − in turn: the π-mode, neighbours always opposite.
    const tips = [];
    for (let k = 0; k < N_VANES; k++) {
      const p = ((k + 0.5) / N_VANES) * Math.PI * 2, m = M.glow(0xffffff);
      const t = box(0.05, H + 0.02, 0.3, m); t.position.set(Math.cos(p) * (rA + 0.03), 0, Math.sin(p) * (rA + 0.03)); t.rotation.y = -p;
      tube.add(t); tips.push(t);
    }
    // Hot cathode: a glowing helix around a support rod.
    const cathode = new THREE.Group(); tube.add(cathode);
    const cMat = M.glow(0xffa24a);
    const helix = []; for (let i = 0; i <= 160; i++) { const a = i * 0.45; helix.push(new THREE.Vector3(Math.cos(a) * rC * 0.85, -0.42 + (i / 160) * 0.84, Math.sin(a) * rC * 0.85)); }
    cathode.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 400, 0.035, 8), cMat));
    const cRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 12), M.metal(0x9aa3b2)); cRod.position.y = -0.8; cathode.add(cRod);
    // Ring magnets and their field arrows.
    const magMat = M.clear(0x9aa3b2, 0.16);
    const magnets = [2.3, -1.3].map((y) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.7, 64, 1, true), magMat); const cap = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.9, 64), magMat); cap.rotation.x = -Math.PI / 2; cap.position.y = y > 0 ? 0.35 : -0.35; g.add(cap); g.position.y = y; tube.add(g); return g; });
    const fieldArrows = [];
    for (let k = 0; k < 3; k++) { const a = arrow(0x9fb8ff, 1.6, 0.2, 0.016); const p = (k / 3) * Math.PI * 2 + 0.3; a.position.set(Math.cos(p) * 1.0, -0.8, Math.sin(p) * 1.0); tube.add(a); fieldArrows.push(a); }
    // Antenna from one vane up through the top magnet.
    tube.add(tubeMesh([[0, H / 2, -(rA + 0.05)], [0, 1.0, -(rA + 0.05)], [0, 1.15, -0.6], [0.3, 1.3, 0.05], [0.3, 3.3, 0.05]], 0.05, M.metal(0xd8dde4)));
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), M.glow(0x8ec2ff)); antTip.position.set(0.3, 3.45, 0.05); tube.add(antTip);
    const rings = [];
    for (let i = 0; i < 3; i++) { const r = torus(0.3, 0.02, M.ghost(0x8ec2ff, 0.6)); r.rotation.x = Math.PI / 2; r.position.set(0.3, 3.5, 0.05); tube.add(r); rings.push(r); }

    // Electrons in the gap between cathode and anode (mid-plane).
    const NE = 420;
    const el = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), M.glow(0x8ef0ff), NE);
    el.instanceMatrix.setUsage(THREE.DynamicDrawUsage); tube.add(el);
    const seed = Array.from({ length: NE }, (_, i) => ({ u: (i * 0.618034) % 1, j: Math.sin(i * 91.7) * 0.5 + 0.5, a: (i * 2.39996) % (Math.PI * 2), y: (((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1) * 0.7 }));
    const o = new THREE.Object3D();

    const L = (t, p, cls) => stage.label(t, p, tube, cls);
    L("Hot cathode", [-0.5, 1.1, -0.9], "hot");
    L('Copper anode with 10 cavities', [-0.9, 0.5, 2.5]);
    const mags = [L('Magnet (lifted to show inside)', [1.6, 2.7, -1.0]), L('Magnet', [-2.0, -1.3, 1.0])];
    L('Antenna: microwaves out', [0.3, 4.1, 0]);
    const lblMode = L('', [0, -0.2, 3.0]);

    // V–B map: where the magnetron works.
    const BMIN = 0.05, BMAX = 0.3, VMAX = 8000;
    let now = { V: 4200, B: 0.175 };
    const chart = canvasTexture(620, 520, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.86)'; g.fillRect(0, 0, w, h);
      const x0 = 78, y0 = h - 62, cw = w - 110, chh = h - 140;
      const X = (B) => x0 + ((B - BMIN) / (BMAX - BMIN)) * cw, Y = (V) => y0 - (clamp(V, 0, VMAX) / VMAX) * chh;
      g.font = 'bold 26px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText('Where a magnetron works', 24, 40);
      // shaded working zone
      g.beginPath(); for (let i = 0; i <= 80; i++) { const B = BMIN + (i / 80) * (BMAX - BMIN); g.lineTo(X(B), Y(Math.min(hull(B), VMAX))); }
      for (let i = 80; i >= 0; i--) { const B = BMIN + (i / 80) * (BMAX - BMIN); g.lineTo(X(B), Y(Math.max(0, hartree(B)))); }
      g.closePath(); g.fillStyle = 'rgba(92,225,169,.18)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '18px sans-serif';
      for (let V = 0; V <= VMAX; V += 2000) { g.beginPath(); g.moveTo(x0, Y(V)); g.lineTo(x0 + cw, Y(V)); g.stroke(); g.fillText(V / 1000 + ' kV', 18, Y(V) + 6); }
      for (let B = 0.05; B <= 0.301; B += 0.05) g.fillText(B.toFixed(2), X(B) - 18, y0 + 26);
      g.fillText('magnet strength (tesla)', x0 + cw / 2 - 90, y0 + 52);
      const curve = (fn, col) => { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 80; i++) { const B = BMIN + (i / 80) * (BMAX - BMIN); const v = fn(B); if (v > VMAX * 1.02) break; i ? g.lineTo(X(B), Y(v)) : g.moveTo(X(B), Y(v)); } g.stroke(); };
      curve(hull, '#ff7a59'); curve(hartree, '#8ec2ff');
      g.font = 'bold 19px sans-serif';
      g.fillStyle = '#ff7a59'; g.fillText('electrons crash straight across', X(0.07), Y(7400));
      g.fillStyle = '#5ce1a9'; g.fillText('microwaves', X(0.2), Y(6200));
      g.fillStyle = '#8ec2ff'; g.fillText('electrons never arrive', X(0.19), Y(1800));
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(now.B), Y(now.V), 11, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#07080c'; g.lineWidth = 3; g.stroke();
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.52), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    board.position.set(4.7, 1.7, 0.7); board.scale.setScalar(0.9); board.rotation.set(-0.9, 0, 0); root.add(board);

    let spoke = 0, rf = 0, amp = 0, drawn = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        mags.forEach((l) => { l.visible = stage.host.clientWidth >= 560; });
        const V = s.V * 1000, op = operate(V, s.B);
        const key = V.toFixed(0) + s.B.toFixed(4);
        if (key !== drawn) { now = { V, B: s.B }; chart.redraw(); drawn = key; }
        amp = approach(amp, op.mode === 'osc' ? clamp(op.I / 0.3, 0.3, 1.4) : 0, 5, dt);
        spoke += dt * 0.6;             // real spokes turn at ω/5 ≈ 3 billion rad/s; shown far slower
        rf += dt * 0.6 * NMODE;        // the vanes flip each time a spoke passes a vane
        const rHub = hubRadius(Math.min(V, op.vc * 0.999), s.B) * 1000 * S;
        for (let i = 0; i < NE; i++) {
          const q = seed[i];
          let r, a;
          if (op.mode === 'osc' && q.j > 0.25) {
            q.u = (q.u + dt * 0.35 * (0.6 + amp)) % 1;
            const k = i % NMODE;
            r = rC + (rA - rC) * q.u;
            a = spoke + (k / NMODE) * Math.PI * 2 - 0.55 * q.u + (q.j - 0.6) * 0.42 * (1 - q.u * 0.6);
          } else if (op.mode === 'short') {
            q.u = (q.u + dt * 0.7) % 1;
            const bend = (s.B / 0.08) * 0.8;
            r = rC + (rA - rC) * q.u; a = q.a - bend * q.u * q.u;
          } else {
            q.a -= dt * (1.4 + q.j);
            const h = Math.max(0.03, (op.mode === 'osc' ? rC + 0.18 : rHub) - rC);
            r = rC + h * 0.5 * (1 - Math.cos(q.a * 3 + q.j * 6)); a = q.a;
          }
          o.position.set(Math.cos(a) * r, (q.y - 0.35) * 0.4, Math.sin(a) * r);
          o.scale.setScalar(1); o.updateMatrix(); el.setMatrixAt(i, o.matrix);
        }
        el.instanceMatrix.needsUpdate = true;
        const flip = Math.cos(rf) * amp;
        tips.forEach((t, k) => { const sgn = (k % 2 ? 1 : -1) * flip; t.material.color.setRGB(0.3 + Math.max(0, sgn) * 0.7, 0.3, 0.3 + Math.max(0, -sgn) * 0.7); });
        fieldArrows.forEach((a) => a.set(0.4 + (s.B / 0.3) * 1.5));
        rings.forEach((r, i) => { const k = (spoke * 0.8 + i / 3) % 1; r.visible = amp > 0.05; r.position.y = 3.5 + k * 1.2; r.scale.setScalar(1 + k * 2); r.material.opacity = 0.7 * (1 - k) * Math.min(1, amp); });
        antTip.material.color.setRGB(lerp(0.2, 0.55, Math.min(1, amp)), lerp(0.22, 0.76, Math.min(1, amp)), lerp(0.28, 1, Math.min(1, amp)));
        lblMode.element.innerHTML = op.mode === 'osc' ? '<b>Spokes</b> of electrons whirl past the cavities' : op.mode === 'short' ? 'Magnet too weak: electrons <b>crash</b> into the anode' : 'Too little voltage: electrons just <b>circle</b> the cathode';
      },
      readout: (s) => {
        const V = s.V * 1000, op = operate(V, s.B), Pin = V * op.I, Pout = Pin * op.eta;
        const head = op.mode === 'osc' ? `${Math.round(Pout / 10) * 10} W of microwaves` : op.mode === 'short' ? 'Shorted: no microwaves' : 'Cut off: no current';
        return `<div class="big">${head}</div>
          <div class="row"><span>Anode current</span><b>${op.mode === 'short' ? 'as much as the supply allows' : Math.round(op.I * 1000) + ' mA'}</b></div>
          <div class="row"><span>Power in</span><b>${op.mode === 'short' ? 'all wasted as heat' : Math.round(Pin) + ' W'}</b></div>
          <div class="row"><span>Efficiency</span><b>${op.mode === 'osc' ? Math.round(op.eta * 100) + '%' : 'none'}</b></div>
          <div class="row"><span>Frequency, set by the cavities</span><b>${(F / 1e9).toFixed(2)} GHz, λ = ${(LAMBDA * 100).toFixed(1)} cm</b></div>
          <small>Works between ${(op.vh / 1000).toFixed(1)} and ${(op.vc / 1000).toFixed(1)} kV at ${s.B.toFixed(2)} T. Motion shown billions of times slower.</small>`;
      },
    };
  },
};
