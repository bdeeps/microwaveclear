// Chapter 4: standing waves in the cavity. Waves bouncing between the metal walls add up
// into a fixed pattern of hot and cold spots about λ/2 ≈ 6 cm apart. A plate of chocolate
// heats wherever the field is strong; the turntable carries it through the pattern.
//
// The field pattern at plate height is a mix of the 31 × 30 cm cavity's resonant patterns
// (modes) near 2.45 GHz: (m, n) = (5, 0), (0, 5), (4, 3), (3, 4), whose in-plane wavenumbers
// π√((m/a)² + (n/b)²) all sit within 1% of 2π/λ. Intensity ∝ Σ w·sin²(mπx/a)·sin²(nπz/b)
// (for n = 0 the z factor is 1). The (5, 0) mode gives hot stripes a/5 = 6.2 cm apart, so the
// chocolate trick gives c = 2 × 6.2 cm × 2.45 GHz ≈ 3.0 × 10⁸ m/s.
import { THREE, M, box, canvasTexture, clamp, approach } from '../kit.js';
import { CAV, PLATE_Y, F, C0, LAMBDA, heatColor } from '../microwave.js';

const A = CAV.x1 - CAV.x0, B = CAV.z1 - CAV.z0;      // 3.1 × 3.05 units = 31 × 30.5 cm
const MODES = [[5, 0, 0.3], [0, 5, 0.3], [4, 3, 0.2], [3, 4, 0.2]];
// Intensity (0..1) at a point measured from the cavity's corner.
export function intensity(x, z) {
  let I = 0;
  for (const [m, n, w] of MODES) I += w * Math.sin((m * Math.PI * x) / A) ** 2 * (n ? Math.sin((n * Math.PI * z) / B) ** 2 : 1);
  return I / 0.62;
}
const G = 72, R = 1.3;                     // heat grid over the plate (cells), plate radius (units)
const HOT = 5.5;                           // °C per second at the strongest spot (about 800 W over a thin layer)
const T0 = 20, MELT = 32;                  // cocoa butter starts to melt at about 30–35 °C

export default {
  id: 'waves',
  short: 'Hot and cold spots',
  title: 'Standing waves and the turntable',
  subtitle: 'Waves bouncing inside the box pile up into hot spots about 6 cm apart.',
  view: { pos: [0.3, 6.0, 6.4], target: [0.1, 1.3, -0.6] },
  learn: `<p>Inside the metal box, microwaves bounce off every wall. The waves going one way and the waves coming back add up into a pattern that stays in one place: a <b>standing wave</b>. Where they add, the field is strong and food gets <b>hot</b>. Where they cancel, at the <b>nodes</b>, it stays <b>cold</b>.</p>
    <p>The hot spots sit about <b>half a wavelength</b> apart: 12.2 cm ÷ 2 ≈ 6 cm. That is why a microwave without a turntable leaves cold patches in your food. The <b>turntable</b> carries every bit of the plate through hot and cold places in turn, so it evens out. (Some ovens use a spinning metal fan, a <b>mode stirrer</b>, to stir the pattern instead.)</p>
    <p>You can even measure the <b>speed of light</b> with it. Take out the turntable, heat a bar of chocolate for a few seconds, and measure the gap between melted spots. Speed = 2 × gap × frequency.</p>
    <p class="tip"><b>Try it:</b> switch the turntable off and heat the chocolate. Then start again with it on and compare.</p>`,
  terms: [
    { t: 'Standing wave', d: 'A wave pattern that stays in place, made when waves bounce back and overlap themselves.' },
    { t: 'Node', d: 'A spot in a standing wave where the waves cancel out, so there is almost no field.' },
    { t: 'Antinode', d: 'A spot where the waves add up to the strongest field: a hot spot.' },
    { t: 'Mode', d: 'One of the standing-wave patterns that fits neatly inside the metal box.' },
    { t: 'Mode stirrer', d: 'A slowly spinning metal fan that keeps changing the wave pattern.' },
  ],
  defaults: { turn: false, show: 'choc', field: true, go: 0 },
  controls: [
    { key: 'turn', type: 'toggle', label: 'Turntable', hint: 'Turns once every 12 seconds, like a real one.' },
    { key: 'show', type: 'seg', label: 'Show the plate as', options: [{ v: 'choc', label: 'Chocolate' }, { v: 'heat', label: 'Heat map' }] },
    { key: 'field', type: 'toggle', label: 'Show the standing wave' },
    { key: 'go', type: 'buttons', label: 'Plate', items: [{ label: 'Start again', act: (s, inst) => inst.restart() }, { label: 'Cook 10 s more', act: (s, inst) => inst.cook(s, 10) }] },
  ],
  quiz: [
    { q: 'About how far apart are the hot spots in a microwave oven?', options: ['About 1 mm', 'About 6 cm, half a wavelength', 'About 1 m', 'There are no hot spots'], answer: 1, why: 'The wavelength is about 12.2 cm, and hot spots of a standing wave are half a wavelength apart.' },
    { q: 'Why does a microwave have a turntable?', options: ['To look nice', 'To carry the food through the hot and cold spots so it heats evenly', 'To make the microwaves', 'To cool the magnetron'], answer: 1, why: 'The wave pattern stays put, so moving the food through it evens out the heating.' },
    { q: 'Melted spots on chocolate are 6.1 cm apart and the oven runs at 2.45 GHz. What speed does that give?', options: ['About 300 m/s', 'About 300,000 km/s', 'About 3 km/s', 'About 30 km/h'], answer: 1, why: '2 × 0.061 m × 2,450,000,000 per second ≈ 300,000,000 m/s: the speed of light.' },
  ],
  reel: [
    { ms: 5600, caption: 'Waves bouncing inside the box make a standing wave: hot spots about 6 cm apart.', set: { turn: false, show: 'choc', field: true }, act: (s, inst) => { inst.restart(); inst.cook(s, 5); }, view: { pos: [0.3, 5.6, 5.8], target: [0.1, 0.8, -0.3] }, spin: 0.1 },
    { ms: 5200, caption: 'Measure the melted spots on chocolate and you get the speed of light. The turntable evens it all out.', set: { turn: true, show: 'choc', field: false }, act: (s, inst) => { inst.restart(); inst.cook(s, 8); }, view: { pos: [0.3, 6.0, 6.4], target: [0.1, 1.3, -0.6] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const cx = (CAV.x0 + CAV.x1) / 2, cz = (CAV.z0 + CAV.z1) / 2;
    const box3 = new THREE.Group(); box3.position.set(-cx, 0, -cz); root.add(box3);      // cavity centred on the origin

    // The cavity: floor, back and side walls in see-through metal.
    const wallMat = M.clear(0xc9d3e0, 0.16);
    const floor = box(A + 0.08, 0.04, B, M.matte(0xd0d6de)); floor.position.set(cx, CAV.y0 - 0.02, cz); box3.add(floor);
    const walls = [[A + 0.08, CAV.y1 - CAV.y0, 0.04, cx, CAV.z0 - 0.02], [0.04, CAV.y1 - CAV.y0, B, CAV.x0 - 0.02, cz], [0.04, CAV.y1 - CAV.y0, B, CAV.x1 + 0.02, cz]];
    walls.forEach(([w, h, d, x, z]) => { const m = box(w, h, d, wallMat); m.position.set(x, (CAV.y0 + CAV.y1) / 2, z); m.castShadow = false; box3.add(m); });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(A, CAV.y1 - CAV.y0, B)), new THREE.LineBasicMaterial({ color: 0x8fa3bd, transparent: true, opacity: 0.6 }));
    edges.position.set(cx, (CAV.y0 + CAV.y1) / 2, cz); box3.add(edges);

    // The plate with its heat grid. T[i] is the temperature of a cell fixed to the plate.
    const T = new Float32Array(G * G).fill(T0);
    const inPlate = new Uint8Array(G * G);
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const u = ((i + 0.5) / G) * 2 - 1, v = ((j + 0.5) / G) * 2 - 1; inPlate[j * G + i] = u * u + v * v <= 1 ? 1 : 0; }
    let mode = 'choc';
    const tex = canvasTexture(G, G, (g, w, h) => {
      const img = g.createImageData(w, h), c = new THREE.Color();
      for (let k = 0; k < w * h; k++) {
        const t = T[k];
        if (!inPlate[k]) { img.data[k * 4 + 3] = 0; continue; }
        if (mode === 'heat') heatColor(t, c);
        else { const m = clamp((t - MELT + 3) / 6, 0, 1); c.setRGB(0.55 - 0.33 * m, 0.33 - 0.22 * m, 0.2 - 0.14 * m); if (t > 70) c.lerp(new THREE.Color(0x2a1208), clamp((t - 70) / 30, 0, 1)); }
        img.data[k * 4] = c.r * 255; img.data[k * 4 + 1] = c.g * 255; img.data[k * 4 + 2] = c.b * 255; img.data[k * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    tex.tex.magFilter = THREE.LinearFilter;
    const spin = new THREE.Group(); spin.position.set(0, PLATE_Y, 0); root.add(spin);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.2, 0.06, 64), M.clear(0xd9f1ff, 0.35)); plate.position.y = -0.04; spin.add(plate);
    const food = new THREE.Mesh(new THREE.CircleGeometry(R, 72), new THREE.MeshStandardMaterial({ map: tex.tex, transparent: true, roughness: 0.55 }));
    food.rotation.x = -Math.PI / 2; food.position.y = 0.01; spin.add(food);

    // The standing wave above the plate: a sheet that bobs up and down in place.
    const SEG = 64;
    const sheetGeo = new THREE.PlaneGeometry(A, B, SEG, SEG); sheetGeo.rotateX(-Math.PI / 2);
    const colors = new Float32Array((SEG + 1) ** 2 * 3); sheetGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const amp = new Float32Array((SEG + 1) ** 2);
    const pos = sheetGeo.attributes.position, c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const I = intensity(pos.getX(k) + A / 2, pos.getZ(k) + B / 2); amp[k] = Math.sqrt(I);
      c.setRGB(0.25 + 0.75 * I, 0.35 + 0.35 * I, 1 - 0.55 * I); colors.set([c.r, c.g, c.b], k * 3);
    }
    const sheet = new THREE.Mesh(sheetGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, wireframe: false }));
    sheet.position.y = 1.55; root.add(sheet);
    const sheetLbl = stage.label('Standing wave: it bobs in place, it doesn’t travel', [0, 2.45, -1.6], root);

    // A ruler across the plate showing λ/2.
    const ruler = new THREE.Group(); ruler.position.set(0, PLATE_Y + 0.02, 1.55); root.add(ruler);
    const rb = box(3.1, 0.02, 0.18, M.plastic(0xf2e6c4)); ruler.add(rb);
    for (let i = 0; i <= 5; i++) { const t = box(0.02, 0.03, 0.18, M.plastic(0x30343c)); t.position.x = -A / 2 + i * (A / 5); ruler.add(t); }
    stage.label(`Hot stripes ${((A / 5) * 10).toFixed(1)} cm apart`, [0, 0.25, 0.35], ruler);

    let ang = 0, drawn = 0, cooked = 0;
    const step = (s, dts) => {
      // Heat each plate cell by the field where the cell is right now.
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
        const k = j * G + i; if (!inPlate[k]) continue;
        const u = (((i + 0.5) / G) * 2 - 1) * R, v = (((j + 0.5) / G) * 2 - 1) * R;
        // texture (u, v) on the plate → room coordinates after the plate's rotation
        const x = u * ca + v * sa, z = -u * sa + v * ca;
        T[k] = Math.min(100, T[k] + HOT * intensity(x + A / 2, z + B / 2) * dts);
      }
      // A little conduction between neighbours.
      const k0 = 0.12 * Math.min(1, dts * 4);
      for (let j = 1; j < G - 1; j++) for (let i = 1; i < G - 1; i++) {
        const k = j * G + i; if (!inPlate[k]) continue;
        const nb = (T[k - 1] + T[k + 1] + T[k - G] + T[k + G]) / 4;
        T[k] += (nb - T[k]) * k0;
      }
      if (s.turn) ang += dts * (Math.PI * 2 / 12);
      cooked += dts;
    };
    const api = {
      restart() { T.fill(T0); cooked = 0; tex.redraw(); },
      cook(s, secs) { for (let i = 0; i < secs * 10; i++) step(s, 0.1); spin.rotation.y = ang; tex.redraw(); },
    };
    let ph = 0;
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.show !== mode) { mode = s.show; tex.redraw(); }
        if (cooked < 30) step(s, dt);
        else if (s.turn) ang += dt * (Math.PI * 2 / 12);
        spin.rotation.y = ang;
        drawn += dt; if (drawn > 0.1) { tex.redraw(); drawn = 0; }
        ph += dt * 5;
        sheet.visible = s.field; sheetLbl.visible = s.field;
        if (s.field) {
          const cph = Math.cos(ph);
          for (let k = 0; k < pos.count; k++) pos.setY(k, amp[k] * cph * 0.35);
          pos.needsUpdate = true;
        }
      },
      readout: (s) => {
        let sum = 0, sum2 = 0, n = 0, lo = 1e9, hi = -1e9;
        for (let k = 0; k < G * G; k++) if (inPlate[k]) { const t = T[k]; sum += t; sum2 += t * t; n++; if (t < lo) lo = t; if (t > hi) hi = t; }
        const mean = sum / n, sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
        const d = A / 5 / 10, c = 2 * d * F;
        return `<div class="big">Spots ${(d * 100).toFixed(1)} cm apart → c ≈ ${(c / 1e8).toFixed(2)} × 10⁸ m/s</div>
          <div class="row"><span>True speed of light</span><b>${(C0 / 1e8).toFixed(3)} × 10⁸ m/s</b></div>
          <div class="row"><span>Cooked for</span><b>${Math.round(cooked)} s ${s.turn ? 'with' : 'without'} turntable</b></div>
          <div class="row"><span>Coldest / hottest spot</span><b>${Math.round(lo)} °C / ${Math.round(hi)} °C</b></div>
          <div class="row"><span>Unevenness (spread)</span><b>± ${sd.toFixed(1)} °C</b></div>
          <small>c = 2 × spot gap × ${(F / 1e9).toFixed(2)} GHz. Half a wavelength is ${((LAMBDA / 2) * 100).toFixed(1)} cm.</small>`;
      },
    };
  },
};
