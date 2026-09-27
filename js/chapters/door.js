// Chapter 5: why it's safe. The door's metal mesh reflects microwaves because its holes are far
// smaller than the 12.2 cm wavelength; interlocks cut the power when the door opens; and a
// microwave photon carries far too little energy to break a chemical bond.
//
// Leak through the mesh: each round hole of radius r lets through a share ≈ (64/27π²)(kr)⁴ of
// the power falling on it when kr ≪ 1 (Bethe, "Theory of diffraction by small holes",
// Phys. Rev. 66, 163, 1944), where k = 2π/λ. We blend that smoothly towards "all of it" for
// holes bigger than the wave, and multiply by the open area (holes at 1.6 × their size apart
// cover about 35% of the sheet). It ignores the sheet's thickness, which cuts the leak further.
// Photon energy E = h·f ≈ 1.0 × 10⁻⁵ eV. A carbon–carbon bond takes about 3.6 eV to break.
// US rule (21 CFR 1030.10): leakage at most 1 mW/cm² at 5 cm when sold, 5 mW/cm² for its life,
// and at least two interlocks.
import { THREE, M, box, arrow, canvasTexture, clamp, approach, lerp } from '../kit.js';
import { makeMicrowave, meshCanvas, fatLine, LAMBDA, PHOTON_EV, PORT, CAV } from '../microwave.js';

const K = (2 * Math.PI) / LAMBDA;
const OPEN = (Math.PI / 4) / (1.6 * 1.6 * 0.866);          // open-area share of a hex hole pattern
export const holeLeak = (d) => { const kr = K * (d / 2); return 1 - Math.exp(-(64 / (27 * Math.PI * Math.PI)) * kr ** 4); };
export const meshLeak = (d) => OPEN * holeLeak(d);
const BOND_EV = 3.6;

function fmtShare(x) {
  if (x >= 0.01) return Math.round(x * 100) + '%';
  const n = Math.round(1 / x);
  if (n < 1e6) return '1 part in ' + n.toLocaleString('en');
  const e = Math.floor(Math.log10(n)), m = n / 10 ** e;
  return `1 part in ${m.toFixed(0)} × 10<sup>${e}</sup>`;
}

export default {
  id: 'door',
  short: 'Why it’s safe',
  title: 'The door, the mesh and the switches',
  subtitle: 'Holes much smaller than the wave act like solid metal.',
  view: { pos: [7.4, 4.6, 8.6], target: [-0.6, 2.1, 2.2] },
  learn: `<p>You can see through the door, but microwaves can't get out. The window has a <b>metal sheet</b> full of holes about <b>1 to 2 mm</b> across. A microwave is about <b>12 cm</b> long, far too big to squeeze through holes that small, so the sheet reflects it like solid metal. Light waves are less than a thousandth of a millimetre long, so they pass straight through.</p>
    <p>If you open the door, at least two <b>interlock switches</b> cut the power before it opens, so the magnetron stops.</p>
    <p><b>Metal</b> inside is a different story. A flat, smooth metal bowl mostly just reflects the waves. But the field crowds onto sharp points and thin edges, like the tines of a fork or gold trim on a plate, and it can jump across the air as a <b>spark</b>.</p>
    <p>Microwaves are <b>non-ionising</b>. One microwave photon carries about <b>0.00001 eV</b> of energy, hundreds of thousands of times too little to break a chemical bond. They can heat you, like any heater, but they can't damage DNA the way X-rays or UV can.</p>
    <p class="tip"><b>Try it:</b> make the holes bigger and watch the wave start to leak out. Then open the door, and put a fork inside.</p>`,
  terms: [
    { t: 'Faraday cage', d: 'A metal box or mesh that keeps electromagnetic waves in or out.' },
    { t: 'Interlock switch', d: 'A switch that cuts the power the moment the door starts to open.' },
    { t: 'Arcing', d: 'A spark jumping through the air where the field crowds onto sharp metal points.' },
    { t: 'Photon', d: 'The smallest packet of light or microwave energy.' },
    { t: 'Non-ionising', d: 'Radiation too weak to knock electrons off atoms or break chemical bonds.' },
  ],
  defaults: { hole: 1.5, open: false, fork: false },
  controls: [
    { key: 'hole', type: 'log', label: 'Mesh hole size', min: 0.5, max: 150, ends: ['0.5 mm', '15 cm'], fmt: (v) => (v < 10 ? v.toFixed(1) + ' mm' : (v / 10).toFixed(1) + ' cm'), hint: 'Real doors use holes about 1 to 2 mm across.' },
    { key: 'open', type: 'toggle', label: 'Open the door' },
    { key: 'fork', type: 'toggle', label: 'Put a fork inside' },
  ],
  quiz: [
    { q: 'Why can’t microwaves get through the holes in the door?', options: ['The glass blocks them', 'The holes are far smaller than the 12 cm wave, so the metal sheet reflects it', 'The door is magnetic', 'Microwaves only travel downwards'], answer: 1, why: 'Waves can’t squeeze through holes much smaller than their wavelength. Light, with a tiny wavelength, can.' },
    { q: 'What happens when you open the door while it’s running?', options: ['Microwaves pour out', 'Interlock switches cut the power first', 'The turntable speeds up', 'Nothing, it keeps running'], answer: 1, why: 'Safety rules require at least two interlocks that stop the magnetron before the door opens.' },
    { q: 'Why can’t microwaves damage DNA like X-rays?', options: ['They are too slow', 'Each photon has far too little energy to break a chemical bond', 'DNA reflects them', 'They only heat metal'], answer: 1, why: 'A microwave photon carries about 0.00001 eV. Breaking a bond takes a few eV, hundreds of thousands of times more.' },
  ],
  reel: [
    { ms: 5400, caption: 'The door’s holes are far smaller than a 12 cm microwave, so the metal mesh reflects it.', set: { open: false, fork: false, hole: 1.5 }, view: { pos: [5.4, 3.6, 8.8], target: [-1.3, 1.4, 2.7] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const mw = makeMicrowave(); root.add(mw.group);
    mw.setXray(1); mw.setCavityOpacity(0.35);
    const P = mw.parts;

    // A magnified patch of the door mesh, floating in front of the window.
    const MAG = 1.0;                                             // this patch shows a 10 cm square of the door, enlarged
    const patchC = canvasTexture(512, 512, (g, w, h, dmm = 1.5) => { const px = (dmm / 100) * w; meshCanvas(w, h, Math.max(2, px * 1.6), Math.max(1, px), g); });
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * MAG, 1.7 * MAG), new THREE.MeshBasicMaterial({ map: patchC.tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    patch.position.set(-3.0, 1.6, 3.5); patch.rotation.y = 0.9; root.add(patch);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.7, 1.7)), new THREE.LineBasicMaterial({ color: 0xffb547 }));
    frame.position.copy(patch.position); frame.rotation.copy(patch.rotation); root.add(frame);
    const lblPatch = stage.label('', [-3.0, 2.7, 3.5], root);

    // The wave along a line from the middle of the cavity out through the door (real scale:
    // 12.2 cm = 1.22 units). Inside: incoming + reflected = a standing wave with a node at the metal.
    // Outside: whatever leaks through, travelling away.
    const ZD = 1.9, Z0 = -1.2, Z1 = 5.4, NP = 260, AMP = 0.42;
    const wave = fatLine(stage, NP, 0x8ec2ff, 3.5);
    const wx = -1.15, wy = 1.0;
    root.add(wave);
    const lblIn = stage.label('Inside: reflected back, a standing wave', [wx, wy + 0.7, 0.0], root);
    const lblOut = stage.label('', [wx, wy + 0.75, 4.1], root, 'hot');
    const ruler = new THREE.Group(); ruler.position.set(wx, wy - 0.62, 3.0); root.add(ruler);
    const rbar = box(0.03, 0.03, LAMBDA * 10, M.glow(0xffb547)); ruler.add(rbar);
    stage.label('one wavelength: 12.2 cm', [0, -0.25, 0], ruler);

    // Fork with sparks at its tines.
    const fork = new THREE.Group(); fork.position.set(-1.2, 0.56, 0.1); fork.rotation.y = 0.5; root.add(fork);
    const steel = M.metal(0xd6dbe3, { roughness: 0.2 });
    const handle = box(1.2, 0.04, 0.12, steel); handle.position.x = -0.5; fork.add(handle);
    const neck = box(0.25, 0.04, 0.2, steel); neck.position.x = 0.2; fork.add(neck);
    const tipsPos = [];
    for (let i = 0; i < 4; i++) { const tn = box(0.4, 0.035, 0.03, steel); const z = -0.08 + i * 0.053; tn.position.set(0.5, 0, z); fork.add(tn); tipsPos.push(new THREE.Vector3(0.7, 0.02, z)); }
    const NS = 60;
    const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 4), M.glow(0xd9e6ff), NS);
    sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); fork.add(sparks);
    const flash = new THREE.PointLight(0x9fc4ff, 0, 3); flash.position.set(0.75, 0.2, 0); fork.add(flash);
    const lblFork = stage.label('Sparks at the sharp tips', [0.8, 0.55, 0], fork, 'hot');
    const o = new THREE.Object3D();

    // Interlock switch indicators.
    const lblLock = stage.label('', [1.15, 2.95, 1.6], root);

    let door = 0, on = 1, ph = 0, holeDrawn = -1, sparkT = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        door = approach(door, s.open ? 1.35 : 0, 3, dt);
        mw.setDoor(door);
        const running = door < 0.02 && !s.open;
        on = approach(on, running ? 1 : 0, 10, dt);
        mw.setCooking(running, on);
        mw.mats.swMats.forEach((m) => m.color.set(running ? 0x5ce1a9 : 0xff7a59));
        lblLock.element.innerHTML = running ? 'Interlocks <b>closed</b>: power on' : 'Interlocks <b>open</b>: power cut';
        if (Math.abs(s.hole - holeDrawn) > 0.01) { patchC.redraw(s.hole); holeDrawn = s.hole; }
        lblPatch.element.innerHTML = `Door mesh, magnified: holes ${s.hole < 10 ? s.hole.toFixed(1) + ' mm' : (s.hole / 10).toFixed(1) + ' cm'}`;
        patch.visible = frame.visible = lblPatch.visible = door < 0.3;
        // Wave.
        ph += dt * 3.0;                                     // shown ~1 billion times slower
        const lk = meshLeak(s.hole / 1000), ta = Math.sqrt(lk) * AMP;
        for (let i = 0; i < NP; i++) {
          const z = Z0 + ((Z1 - Z0) * i) / (NP - 1);
          let y;
          if (door > 0.3) y = 0;
          else if (z < ZD) { const ref = Math.sqrt(1 - lk); y = AMP * (Math.cos(ph - K * (z - ZD) / 10) - ref * Math.cos(ph + K * (z - ZD) / 10)) * 0.5; }
          else y = ta * Math.cos(ph - K * (z - ZD) / 10);
          wave.set(i, wx, wy + y * on, z);
        }
        wave.done();
        lblIn.visible = door < 0.3;
        lblOut.element.innerHTML = door > 0.3 ? '' : lk < 1e-3 ? 'Outside: almost nothing gets through' : `Outside: ${fmtShare(lk)} leaks through`;
        lblOut.visible = door < 0.3;
        // Fork and sparks.
        fork.visible = s.fork; lblFork.visible = s.fork && running;
        mw.mats.meshMat.opacity = s.fork ? 0.4 : 1;          // let you see the fork through the door
        sparkT += dt;
        const live = s.fork && running;
        const burst = live && Math.sin(sparkT * 23) + Math.sin(sparkT * 37) > 0.6;
        flash.intensity = burst ? 2.5 : 0;
        for (let i = 0; i < NS; i++) {
          const t = tipsPos[i % 4], k = ((i * 0.618 + sparkT * 3) % 1);
          if (!burst) { o.scale.setScalar(0.0001); }
          else { o.scale.setScalar(1 - k * 0.7); o.position.set(t.x + k * 0.25 * Math.cos(i * 1.7), t.y + k * 0.3 * Math.abs(Math.sin(i * 2.3)), t.z + k * 0.15 * Math.sin(i * 3.1)); }
          o.updateMatrix(); sparks.setMatrixAt(i, o.matrix);
        }
        sparks.instanceMatrix.needsUpdate = true;
      },
      readout: (s) => {
        const lk = meshLeak(s.hole / 1000), ratio = (LAMBDA * 1000) / s.hole;
        const lines = [
          `<div class="row"><span>Hole vs wave</span><b>${ratio >= 1 ? Math.round(ratio) + '× smaller than 12.2 cm' : 'bigger than the wave'}</b></div>`,
          `<div class="row"><span>Leaks through the mesh</span><b>${fmtShare(lk)}</b></div>`,
          `<div class="row"><span>One microwave photon</span><b>${PHOTON_EV.toExponential(1).replace('e-5', ' × 10⁻⁵')} eV</b></div>`,
          `<div class="row"><span>To break a C–C bond</span><b>about ${BOND_EV} eV, ${(Math.round(BOND_EV / PHOTON_EV / 1e4) * 1e4).toLocaleString('en')}× more</b></div>`,
        ];
        const head = s.open ? 'Door open: magnetron off' : lk < 1e-4 ? 'Waves reflected, food cooking' : lk < 0.05 ? 'Leaking! Holes too big' : 'Waves pouring out';
        return `<div class="big">${head}</div>${lines.join('')}<small>${s.fork && !s.open ? 'Sharp metal: the field crowds onto the tips and sparks jump. ' : ''}US law: under 5 mW/cm² at 5 cm, and two interlocks.</small>`;
      },
    };
  },
};
