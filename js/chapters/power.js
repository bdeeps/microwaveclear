// Chapter 6: power levels. A classic transformer-powered magnetron has one setting, full power,
// so "50%" means on for half of each cycle and off for the rest (the cycle is roughly 10–30 s
// depending on the maker; this model uses 20 s). An inverter oven drives the magnetron from a
// switching power supply and can really turn it down, so it runs steadily at the lower power.
// Efficiency, from the wall (or gas) to 250 mL of water heated from 20 to 80 °C (62.7 kJ):
//  - microwave: 800 W out of ~1,250 W in, 85% of that absorbed → about 55%;
//  - electric kettle: about 80% (heating element sits in the water);
//  - induction hob and pan: about 85% (US DOE / ENERGY STAR figure for induction cooktops);
//  - gas hob and pan: about 32% (same source); much of the flame's heat goes round the pan.
import { THREE, M, canvasTexture, clamp, approach } from '../kit.js';
import { makeMicrowave, cavityPulses, heatColor, heatTime, OVEN, C_WATER } from '../microwave.js';

const CYCLE = 20, WIN = 60, RATE = 10;          // cycle (s), chart window (s), samples per second
const E_MUG = 0.25 * C_WATER * 60;             // J to heat 250 mL from 20 to 80 °C
const WAYS = [
  { name: 'Microwave', eff: (OVEN.pOut / OVEN.pIn) * 0.85, col: '#8ec2ff' },
  { name: 'Electric kettle', eff: 0.8, col: '#5ce1a9' },
  { name: 'Induction hob', eff: 0.85, col: '#c49bff' },
  { name: 'Gas hob', eff: 0.32, col: '#ff7a59' },
];

export default {
  id: 'power',
  short: 'Power levels',
  title: 'What “50% power” really means',
  subtitle: 'Most microwaves can’t turn down. They switch on and off instead.',
  view: { pos: [2.2, 4.6, 12.2], target: [1.0, 2.3, 0] },
  learn: `<p>A classic magnetron has one setting: <b>full power</b>. So when you choose 50%, the oven switches it <b>on and off</b>: on for 10 seconds, off for 10, over and over. You can often hear the hum change as it clicks. This is called the <b>duty cycle</b>.</p>
    <p>Low power is handy for <b>defrosting</b> and gentle cooking. In the off moments, heat has time to <b>spread</b> from hot spots into colder parts, so the edges don't cook while the middle is still frozen.</p>
    <p>An <b>inverter</b> microwave has electronics instead of the heavy transformer. It really can run the magnetron at half power, steadily, which cooks more gently and evenly.</p>
    <p>Is a microwave efficient? For a mug of water, a <b>kettle</b> wins: its element sits right in the water. But the microwave beats a <b>gas</b> flame, which loses much of its heat around the sides of the pan, and it heats only the food, not a pan or an oven full of air.</p>
    <p class="tip"><b>Try it:</b> set 30% and watch the classic oven switch on and off, then compare the inverter.</p>`,
  terms: [
    { t: 'Duty cycle', d: 'The share of the time a device is switched on. 50% power on a classic microwave means on half the time.' },
    { t: 'Inverter', d: 'Electronics that can supply the magnetron with less power, so it runs gently instead of on and off.' },
    { t: 'Average power', d: 'The power spread out over time: full power for half the time averages to half power.' },
    { t: 'Efficiency', d: 'The share of the energy you pay for that ends up where you want it: here, in the food.' },
  ],
  defaults: { level: 50, kind: 'classic' },
  controls: [
    { key: 'level', type: 'range', label: 'Power level', min: 10, max: 100, step: 10, ends: ['10%', '100%'], fmt: (v) => Math.round(v) + '%' },
    { key: 'kind', type: 'seg', label: 'Oven type', options: [{ v: 'classic', label: 'Classic (on/off)' }, { v: 'inverter', label: 'Inverter' }] },
  ],
  quiz: [
    { q: 'On a classic microwave, what does “50% power” do?', options: ['Runs the magnetron at half strength', 'Switches the magnetron fully on and off, half the time each', 'Uses half the turntable', 'Heats half the food'], answer: 1, why: 'A transformer-powered magnetron only runs at full power, so the oven cycles it on and off.' },
    { q: 'Why is low power good for defrosting?', options: ['Ice absorbs microwaves best at low power', 'The off moments let heat spread before thawed spots overheat', 'It uses a different frequency', 'It makes the ice harder'], answer: 1, why: 'Melted spots absorb far more than ice, so pausing lets heat even out.' },
    { q: 'Which usually heats a mug of water using the least energy?', options: ['A gas hob', 'An electric kettle', 'A candle', 'They are all the same'], answer: 1, why: 'The kettle’s element sits in the water, so about 80% of the electricity ends up as heat in it.' },
  ],
  reel: [
    { ms: 5600, caption: 'At 30% power, most ovens switch full power on and off. Inverter ovens really turn it down.', set: { level: 30, kind: 'classic' }, act: (s, inst) => inst.fill(s), view: { pos: [1.8, 4.8, 14.2], target: [1.5, 2.2, 0.2] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const mw = makeMicrowave(); mw.group.position.set(-1.6, 0, 0.6); mw.group.scale.setScalar(0.8); root.add(mw.group);
    mw.setXray(0.85); mw.setCavityOpacity(0.5);
    const pulses = cavityPulses(stage, mw.group);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 0.45, 40), M.plastic(0x3f6fae, { roughness: 0.3 }));
    bowl.position.set(-0.7, 0.75, -0.08); mw.parts.spin.add(bowl); bowl.position.set(0, 0.75, 0);
    const lblMag = stage.label('', [0.7, 3.25, 0.2], mw.group, 'hot');

    // Power over the last minute, both kinds side by side.
    const N = WIN * RATE;
    const hc = new Float32Array(N), hi = new Float32Array(N);
    let t = 0;
    const powerAt = (kind, level, tt) => (kind === 'classic' ? (((tt % CYCLE) / CYCLE) < level / 100 ? 1 : 0) : Math.max(0.1, level / 100));
    const chart = canvasTexture(760, 520, (g, w, h, level = 50, kind = 'classic') => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.86)'; g.fillRect(0, 0, w, h);
      g.font = 'bold 26px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText(`Magnetron power at ${level}%, last minute`, 22, 38);
      const x0 = 80, cw = w - 110;
      const lane = (hist, y0, lh, col, name, on) => {
        g.fillStyle = on ? '#e8eef8' : 'rgba(255,255,255,.55)'; g.font = (on ? 'bold ' : '') + '19px sans-serif'; g.fillText(name, x0, y0 - lh - 10);
        g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + cw, y0); g.moveTo(x0, y0 - lh); g.lineTo(x0 + cw, y0 - lh); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '16px sans-serif'; g.fillText('800 W', 14, y0 - lh + 6); g.fillText('0', 50, y0 + 6);
        g.beginPath(); g.moveTo(x0, y0);
        for (let i = 0; i < N; i++) g.lineTo(x0 + (i / (N - 1)) * cw, y0 - hist[i] * lh);
        g.lineTo(x0 + cw, y0); g.closePath(); g.fillStyle = col + (on ? '66' : '2a'); g.fill();
        g.strokeStyle = col; g.lineWidth = on ? 4 : 2; g.beginPath();
        for (let i = 0; i < N; i++) { const x = x0 + (i / (N - 1)) * cw, y = y0 - hist[i] * lh; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        const avg = hist.reduce((a, b) => a + b, 0) / N;
        g.setLineDash([8, 8]); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 - avg * lh); g.lineTo(x0 + cw, y0 - avg * lh); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '16px sans-serif'; g.fillText(`average ${Math.round(avg * OVEN.pOut)} W`, x0 + cw - 150, y0 - avg * lh - 8);
      };
      lane(hc, 240, 150, '#ffb547', 'Classic: full power, switched on and off', kind === 'classic');
      lane(hi, 460, 150, '#8ef0ff', 'Inverter: turned down, steady', kind === 'inverter');
      g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '16px sans-serif'; g.fillText('60 s ago', x0, h - 30); g.fillText('now', x0 + cw - 30, h - 30);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.01), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    board.position.set(3.4, 3.35, -0.7); board.rotation.y = -0.2; root.add(board);

    // Energy bars: wall energy to heat one mug of water, four ways.
    const bars = canvasTexture(760, 330, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.86)'; g.fillRect(0, 0, w, h);
      g.font = 'bold 24px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText('Energy to heat a mug of water, 20 → 80 °C', 22, 36);
      const max = E_MUG / 0.32, x0 = 200, bw = w - 330;
      WAYS.forEach((wy, i) => {
        const y = 70 + i * 62, E = E_MUG / wy.eff;
        g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '19px sans-serif'; g.fillText(wy.name, 22, y + 28);
        g.fillStyle = wy.col; g.fillRect(x0, y + 8, (E / max) * bw, 30);
        g.fillStyle = '#e8eef8'; g.font = 'bold 18px sans-serif'; g.fillText(`${Math.round(E / 1000)} kJ · ${Math.round(wy.eff * 100)}%`, x0 + (E / max) * bw + 10, y + 30);
      });
    });
    const board2 = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.91), new THREE.MeshBasicMaterial({ map: bars.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    board2.position.set(3.4, 1.0, 1.0); board2.rotation.set(-0.45, -0.2, 0); root.add(board2);

    let acc = 0, glow = 0, drawn = 0, shown = '';
    const push = (s) => {
      hc.copyWithin(0, 1); hi.copyWithin(0, 1);
      hc[N - 1] = powerAt('classic', s.level, t); hi[N - 1] = powerAt('inverter', s.level, t);
      t += 1 / RATE;
    };
    const api = {
      fill(s) { hc.fill(0); hi.fill(0); t = 0; for (let i = 0; i < N; i++) push(s); chart.redraw(s.level, s.kind); },
    };
    api.fill({ level: 50, kind: 'classic' });
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        const key = s.level + s.kind;
        if (key !== shown) { api.fill(s); shown = key; }
        acc += dt * RATE;
        let n = 0;
        while (acc >= 1 && n < 50) { push(s); acc -= 1; n++; }
        const p = powerAt(s.kind, s.level, t);
        glow = approach(glow, p, 12, dt);
        mw.setCooking(p > 0.01, glow);
        pulses.update(dt, p > 0.01, 0.5 + p);
        pulses.shells.forEach((m) => { m.material.opacity *= glow; });
        mw.parts.spin.rotation.y += dt * (Math.PI * 2 / 12);
        mw.parts.blades.rotation.z += dt * 30;
        drawn += dt; if (drawn > 0.25) { chart.redraw(s.level, s.kind); drawn = 0; }
        const P = Math.round(p * OVEN.pOut);
        lblMag.element.innerHTML = `Magnetron: <b>${P ? P + ' W' : 'off'}</b>`;
      },
      readout: (s) => {
        const avg = (s.kind === 'classic' ? s.level / 100 : Math.max(0.1, s.level / 100)) * OVEN.pOut;
        const on = (CYCLE * s.level) / 100;
        const tt = heatTime(0.25, 60, avg);
        return `<div class="big">Average ${Math.round(avg)} W</div>
          <div class="row"><span>${s.kind === 'classic' ? 'Each 20 s cycle' : 'Magnetron'}</span><b>${s.kind === 'classic' ? (s.level >= 100 ? 'always on' : `${Math.round(on)} s on, ${Math.round(CYCLE - on)} s off`) : `steady at ${Math.round(avg)} W`}</b></div>
          <div class="row"><span>A mug of water, 20 → 80 °C</span><b>${Math.floor(tt / 60)} min ${Math.round(tt % 60)} s</b></div>
          <small>Same average power either way. The inverter just delivers it gently.</small>`;
      },
    };
  },
};
