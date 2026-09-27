// Chapter 3: why food gets hot. Dielectric heating of water molecules, why ice barely
// warms, how deep microwaves reach, and how long a mug of water takes.
// Numbers: water ε'' ≈ 10 and ice ε'' ≈ 0.003 at 2.45 GHz (see microwave.js), so ice soaks up
// about 3,300 times less power in the same field. Penetration depth Dp = λ0√ε'/(2πε''):
// 1.7 cm in water, about 12 m in ice. Heating time t = m·c·ΔT / (0.85·P).
import { THREE, M, box, arrow, canvasTexture, clamp, approach, lerp } from '../kit.js';
import { makeWater, heatColor, heatCss, penDepth, heatTime, WATER, ICE, C_WATER, ABSORBED } from '../microwave.js';

const KG = 0.25, C_ICE = 2100, T_WATER = 20, T_ICE = -18, LAPSE = 4;   // sim seconds per real second
const NX = 5, NY = 4, NZ = 3, SP = 0.66;

export default {
  id: 'heating',
  short: 'Why food heats',
  title: 'Why the food gets hot',
  subtitle: 'Microwaves twist water molecules back and forth billions of times a second.',
  view: { pos: [0.6, 4.6, 11.6], target: [0.6, 2.7, 0] },
  learn: `<p>A water molecule is lopsided. The oxygen end carries a little <b>negative</b> charge and the two hydrogen ends a little <b>positive</b> charge. That makes it a tiny <b>electric dipole</b>, and an electric field tries to twist it into line.</p>
    <p>A microwave is an electric field that flips direction <b>2.45 billion times a second</b>. The water molecules try to keep turning with it, but they keep bumping into their neighbours, which slows them down. All that jostling is <b>heat</b>. This is called <b>dielectric heating</b>.</p>
    <p><b>Ice</b> is different. Its molecules are locked in a crystal and can hardly turn, so ice soaks up thousands of times less energy than liquid water. That's why frozen food thaws so unevenly: any spot that melts starts heating fast.</p>
    <p>Microwaves don't cook "from the inside out". In wet food they are mostly used up in the outer <b>1 to 2 cm</b>. The middle warms more slowly as heat <b>conducts</b> inwards, which is why recipes say to let food stand.</p>
    <p class="tip"><b>Try it:</b> heat the mug of water, then switch to ice and watch the molecules stop dancing.</p>`,
  terms: [
    { t: 'Dipole', d: 'A molecule with a positive end and a negative end. Water is one.' },
    { t: 'Dielectric heating', d: 'Heating by a fast-flipping electric field that keeps twisting molecules against their neighbours.' },
    { t: 'Loss factor', d: 'How good a material is at turning a changing electric field into heat. High for water, tiny for ice.' },
    { t: 'Penetration depth', d: 'How deep microwaves reach before most of their power is used up: about 1.7 cm in water.' },
    { t: 'Conduction', d: 'Heat spreading from hot parts to cooler parts by contact, like the middle of a potato warming up.' },
  ],
  defaults: { power: 800, stuff: 'water', go: 0 },
  controls: [
    { key: 'power', type: 'range', label: 'Microwave power', min: 100, max: 1000, step: 50, ends: ['100 W', '1,000 W'], fmt: (v) => Math.round(v) + ' W' },
    { key: 'stuff', type: 'seg', label: 'In the mug', options: [{ v: 'water', label: 'Water' }, { v: 'ice', label: 'Ice' }], fmt: (v) => (v === 'ice' ? '250 g of ice at −18 °C' : '250 mL of water at 20 °C') },
    { key: 'go', type: 'buttons', label: 'Mug', items: [{ label: 'Start again', act: (s, inst) => inst.restart(s) }] },
  ],
  quiz: [
    { q: 'Why do microwaves heat water so well?', options: ['Water molecules are dipoles that the flipping field keeps twisting', 'Microwaves are hot', 'Water reflects microwaves', 'The turntable rubs the water'], answer: 0, why: 'The field keeps twisting the lopsided molecules back and forth, and they jostle their neighbours: that is heat.' },
    { q: 'Why does frozen food thaw unevenly?', options: ['Ice is heavier', 'Ice molecules are locked in a crystal and barely absorb, but melted spots absorb strongly', 'Microwaves can’t reach the freezer', 'Ice is magnetic'], answer: 1, why: 'Liquid water soaks up thousands of times more energy than ice, so any spot that melts races ahead.' },
    { q: 'About how deep do microwaves reach into wet food?', options: ['1 mm', '1 to 2 cm', '30 cm', 'All the way through anything'], answer: 1, why: 'In water most of the power is used up within about 1.7 cm. Deeper parts warm by conduction.' },
  ],
  reel: [
    { ms: 5600, caption: 'Water molecules are lopsided. The microwave field flips them 2.45 billion times a second, and the jostling is heat.', set: { stuff: 'water', power: 800 }, act: (s, inst) => inst.restart(s, 30), view: { pos: [-0.8, 2.6, 7.0], target: [-0.8, 1.5, 0.3] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);

    // ---- a magnified drop of water between two plates whose charge flips
    const drop = new THREE.Group(); drop.position.set(-0.8, 0.35, 0.3); root.add(drop);
    const W = (NX - 1) * SP + 1.1, Hh = (NY - 1) * SP + 1.0, D = (NZ - 1) * SP + 1.0;
    const cage = box(W, Hh, D, M.clear(0x9fd8ff, 0.07)); cage.position.y = Hh / 2 + 0.3; cage.castShadow = false; drop.add(cage);
    const plateMats = [M.glow(0xff6a3d), M.glow(0x3f8cff)];
    const plates = [Hh + 0.42, 0.18].map((y, i) => { const p = box(W + 0.2, 0.08, D + 0.2, plateMats[i]); p.position.y = y; drop.add(p); return p; });
    const eArrows = [-1.2, 0, 1.2].map((x) => { const a = arrow(0xffd27a, 1, 0.22, 0.03); a.position.set(x, Hh / 2 + 0.3, -D / 2 - 0.05); drop.add(a); return a; });
    const molMats = { O: M.plastic(0xff5a4f, { roughness: 0.3 }), H: M.plastic(0xf2f4f7, { roughness: 0.3 }) };
    const mols = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) {
      const m = makeWater(0.9, molMats);
      const home = new THREE.Vector3((i - (NX - 1) / 2) * SP, 0.3 + 0.5 + j * SP, (k - (NZ - 1) / 2) * SP);
      const n = mols.length;
      const lattice = ((i + j + k) % 2 ? 1 : -1) * 0.6 + ((n * 0.37) % 1 - 0.5) * 0.4;     // fixed orientation in the ice crystal
      m.position.copy(home); drop.add(m);
      mols.push({ m, home, th: (n * 2.4) % (Math.PI * 2), lattice, ph: n * 1.7, tilt: ((n * 0.61) % 1 - 0.5) * 0.9 });
    }
    const lblField = stage.label('', [0, -0.2, D / 2 + 0.3], drop);
    const lblKey = stage.label('Water: red O<sup>−</sup>, white H<sup>+</sup>', [W / 2 + 0.1, Hh + 0.75, 0], drop);

    // ---- a mug of water, coloured by its temperature
    const mug = new THREE.Group(); mug.position.set(3.35, 0, 0.6); root.add(mug);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.78, 2.0, 48, 1, true), M.clear(0xe6f6ff, 0.22)); glass.position.y = 1.02; mug.add(glass);
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 48), M.clear(0xe6f6ff, 0.35)); bottom.position.y = 0.03; mug.add(bottom);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 12, 32, Math.PI), M.clear(0xe6f6ff, 0.35)); handle.position.set(0.88, 1.05, 0); handle.rotation.z = -Math.PI / 2; mug.add(handle);
    const liqMat = M.plastic(0x3f6fae, { transparent: true, opacity: 0.85, roughness: 0.15 });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.76, 1.55, 48), liqMat); liquid.position.y = 0.84; mug.add(liquid);
    const iceMat = M.plastic(0xd8f2ff, { transparent: true, opacity: 0.8, roughness: 0.1 });
    const cubes = [];
    for (let i = 0; i < 9; i++) { const c = box(0.42, 0.42, 0.42, iceMat); c.position.set(((i % 3) - 1) * 0.45, 0.3 + Math.floor(i / 3) * 0.44, ((i * 5) % 3 - 1) * 0.3); c.rotation.set(i * 0.4, i * 0.7, 0); mug.add(c); cubes.push(c); }
    const steam = [];
    for (let i = 0; i < 10; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), M.ghost(0xffffff, 0.3)); mug.add(p); steam.push(p); }
    const lblMug = stage.label('', [0, 2.45, 0], mug, 'hot');

    // ---- how deep the microwaves reach
    const dW = penDepth(WATER), dI = penDepth(ICE);
    const chart = canvasTexture(620, 380, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.86)'; g.fillRect(0, 0, w, h);
      g.font = 'bold 26px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText('How deep microwaves reach', 22, 38);
      const x0 = 70, y0 = h - 58, cw = w - 100, ch = h - 130, ZMAX = 0.06;
      const X = (z) => x0 + (z / ZMAX) * cw, Y = (f) => y0 - f * ch;
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '18px sans-serif';
      for (const f of [0, 0.5, 1]) { g.beginPath(); g.moveTo(x0, Y(f)); g.lineTo(x0 + cw, Y(f)); g.stroke(); g.fillText(Math.round(f * 100) + '%', 12, Y(f) + 6); }
      for (let cm = 0; cm <= 6; cm++) g.fillText(cm + ' cm', X(cm / 100) - 16, y0 + 26);
      g.fillText('depth into the food', x0 + cw / 2 - 70, y0 + 50);
      const curve = (Dp, col) => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 120; i++) { const z = (i / 120) * ZMAX; const y = Y(Math.exp(-z / Dp)); i ? g.lineTo(X(z), y) : g.moveTo(X(z), y); } g.stroke(); };
      curve(dI, '#bfe8ff'); curve(dW, '#ff8a4a');
      g.font = 'bold 19px sans-serif';
      g.fillStyle = '#bfe8ff'; g.fillText('ice: goes almost straight through', X(0.018), Y(1) - 12);
      g.fillStyle = '#ff8a4a'; g.fillText(`water: half gone after ${(dW * Math.LN2 * 100).toFixed(1)} cm`, X(0.012), Y(0.34));
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.02), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    board.position.set(3.2, 3.45, -0.9); board.scale.setScalar(0.95); board.rotation.y = -0.12; root.add(board);

    let T = T_WATER, t = 0, stuff = 'water', ph = 0, E = 0;
    const col = new THREE.Color();
    const api = {
      restart(s, skip = 0) {
        stuff = s.stuff; t = 0; T = stuff === 'ice' ? T_ICE : T_WATER;
        for (let i = 0; i < skip; i++) api.heat(s.power, 1);
      },
      heat(P, dts) {
        if (T >= 100) { T = 100; return; }
        if (stuff === 'ice') T = Math.min(0, T + (ABSORBED * P * (ICE.e2 / WATER.e2) * dts) / (KG * C_ICE));
        else T += (ABSORBED * P * dts) / (KG * C_WATER);
        t += dts;
      },
    };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.stuff !== stuff) api.restart(s);
        api.heat(s.power, dt * LAPSE);
        const ice = stuff === 'ice';
        // The field, slowed about 5 billion times: one flip every second.
        ph += dt * Math.PI;
        E = Math.cos(ph);
        plates[0].material.color.set(E > 0 ? 0xff6a3d : 0x3f8cff); plates[1].material.color.set(E > 0 ? 0x3f8cff : 0xff6a3d);
        const e = Math.abs(E);
        const La = 0.3 + 1.4 * e; eArrows.forEach((a) => { a.set(La); a.rotation.z = E > 0 ? Math.PI : 0; a.position.y = (Hh / 2 + 0.3) + (E > 0 ? La / 2 : -La / 2); });
        const narrow = stage.host.clientWidth < 560;
        lblKey.visible = !narrow;
        lblField.element.innerHTML = narrow ? `Field points <b>${E > 0 ? 'down' : 'up'}</b>` : `Electric field points <b>${E > 0 ? 'down' : 'up'}</b> · flips 2.45 billion times a second`;
        // Water: the dipoles chase the field (a torque ∝ E·cos θ) but friction makes them lag.
        // Ice: held in the crystal, they only wobble. Warmer means more random jiggle.
        const heatJ = clamp((T + 20) / 120, 0.05, 1);
        const want = E > 0 ? -Math.PI / 2 : Math.PI / 2;      // H (positive) ends turn towards the negative plate
        mols.forEach((q, n) => {
          q.ph += dt * (4 + n % 5);
          if (ice) q.th = approach(q.th, q.lattice + 0.05 * Math.sin(q.ph), 3, dt);
          else {
            let d = ((want - q.th + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
            q.th += dt * 3.2 * e * d + dt * 1.5 * Math.sin(q.ph * 1.3) * heatJ;
          }
          const jig = ice ? 0.01 : 0.03 + 0.08 * heatJ;
          q.m.position.set(q.home.x + Math.sin(q.ph * 1.1) * jig, q.home.y + Math.cos(q.ph * 0.9) * jig, q.home.z + Math.sin(q.ph * 0.7) * jig);
          q.m.rotation.set(q.tilt, ice ? 0 : Math.sin(q.ph * 0.5) * 0.4, q.th);
        });
        molMats.O.color.set(0xff4a3d).lerp(heatColor(ice ? T : Math.max(T, 20), col), 0.3);
        // Mug.
        liquid.visible = !ice; cubes.forEach((c) => { c.visible = ice; });
        liqMat.color.copy(heatColor(T, col));
        steam.forEach((p, i) => { const k = (ph * 0.15 + i / steam.length) % 1; p.visible = !ice && T > 60; p.position.set(Math.sin(i * 2.1) * 0.4, 1.8 + k * 1.4, Math.cos(i * 1.3) * 0.3); p.scale.setScalar(0.6 + k * 1.6); p.material.opacity = 0.25 * (1 - k) * clamp((T - 60) / 30, 0, 1); });
        lblMug.element.innerHTML = `${T >= 99.9 ? 'Boiling · ' : ''}<b>${T.toFixed(ice ? 1 : 0)} °C</b> after ${Math.round(t)} s`;
      },
      readout: (s) => {
        if (s.stuff === 'ice') {
          return `<div class="big">Ice barely warms</div>
            <div class="row"><span>Soaks up, compared with water</span><b>about ${(Math.round(WATER.e2 / ICE.e2 / 100) * 100).toLocaleString('en')}× less</b></div>
            <div class="row"><span>Penetration depth in ice</span><b>about ${Math.round(dI)} m</b></div>
            <small>In a real freezer bag a few spots are always a little wet. Those spots grab the energy, which is why defrost runs at low power.</small>`;
        }
        const tt = heatTime(KG, 60, s.power);
        return `<div class="big">20 → 80 °C in ${tt >= 90 ? Math.floor(tt / 60) + ' min ' + Math.round(tt % 60) + ' s' : Math.round(tt) + ' s'}</div>
          <div class="row"><span>250 mL of water at</span><b>${Math.round(s.power)} W</b></div>
          <div class="row"><span>Energy needed</span><b>${Math.round((KG * C_WATER * 60) / 1000)} kJ</b></div>
          <div class="row"><span>Penetration depth in water</span><b>${(dW * 100).toFixed(1)} cm</b></div>
          <small>t = m × c × ΔT ÷ (${Math.round(ABSORBED * 100)}% × power). The mug runs ${LAPSE}× faster.</small>`;
      },
    };
  },
};
