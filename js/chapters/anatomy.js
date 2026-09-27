// Chapter 1: take a countertop microwave apart.
import { THREE, approach } from '../kit.js';
import { exploder } from '../kit.js';
import { makeMicrowave, cavityPulses, guideWaves, OVEN, LAMBDA, F } from '../microwave.js';

export default {
  id: 'anatomy',
  short: 'Inside a microwave',
  title: 'Inside a microwave oven',
  subtitle: 'A metal box, a radio valve called a magnetron, and a lot of high voltage.',
  view: { pos: [6.6, 6.0, 5.6], target: [-0.5, 1.8, 0.2] },
  learn: `<p>Open up a microwave and most of it is empty metal box. The food sits in the <b>cavity</b>, a box of painted steel. Metal walls reflect microwaves, so the waves bounce around inside until the food soaks them up. A glass <b>turntable</b> slowly turns the food.</p>
    <p>The busy part is the column on the right. A heavy <b>transformer</b> turns the 230 V from the wall into about 2,000 V. A <b>capacitor</b> and a <b>diode</b> double that to about <b>4,000 V</b>. This powers the <b>magnetron</b>, a special vacuum tube that turns electricity into microwaves. A metal duct called the <b>waveguide</b> carries them into the cavity. A <b>fan</b> keeps the magnetron cool.</p>
    <p>The <b>door</b> has a metal sheet full of tiny holes, and <b>interlock switches</b> cut the power the moment you open it. A little <b>control board</b> runs the timer and the power level.</p>
    <p class="tip"><b>Try it:</b> switch on X-ray and take the oven apart. Then press cook and watch the microwaves spread from the waveguide.</p>`,
  terms: [
    { t: 'Magnetron', d: 'A vacuum tube where electrons whirl past metal cavities and make microwaves.' },
    { t: 'Waveguide', d: 'A hollow metal duct that carries microwaves from the magnetron to the cavity.' },
    { t: 'Cavity', d: 'The metal box you put food in. Its walls reflect the microwaves back and forth.' },
    { t: 'Transformer', d: 'Two coils on an iron core that turn mains voltage into a much higher voltage.' },
    { t: 'Voltage doubler', d: 'A capacitor and a diode that together double the transformer’s voltage.' },
    { t: 'Interlock', d: 'A switch that only lets the oven run when the door is fully shut.' },
  ],
  defaults: { explode: 0, xray: true, cook: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray the case' },
    { key: 'cook', type: 'toggle', label: 'Cook', hint: 'Turns on the magnetron, the fan and the turntable.' },
  ],
  quiz: [
    { q: 'Which part actually makes the microwaves?', options: ['The transformer', 'The magnetron', 'The turntable', 'The light bulb'], answer: 1, why: 'The magnetron is a vacuum tube that turns high-voltage electricity into microwaves.' },
    { q: 'What does the waveguide do?', options: ['Cools the magnetron', 'Carries the microwaves from the magnetron into the cavity', 'Holds the food', 'Measures the time'], answer: 1, why: 'It is a hollow metal duct. The waves bounce along inside it, like water in a pipe.' },
    { q: 'An 800 W microwave draws about 1,250 W from the wall. Where does the rest go?', options: ['Into the food as well', 'Mostly as heat in the magnetron and transformer, carried off by the fan', 'Back into the wall socket', 'Into the turntable motor'], answer: 1, why: 'A magnetron turns about 65% of its power into microwaves. The rest becomes heat, which the fan blows out.' },
  ],
  reel: [
    { ms: 5600, caption: 'A microwave oven is a metal box, a magnetron that makes the waves, and a lot of high voltage.', set: { xray: true, cook: false }, anim: { explode: [0, 1] }, view: { pos: [7.4, 6.6, 12.0], target: [0.5, 1.7, 0.8] }, spin: 0.4 },
    { ms: 5000, caption: 'At about 4,000 volts the magnetron makes microwaves, and a metal duct pipes them into the box.', set: { xray: true, cook: true, explode: 0 }, view: { pos: [5.2, 4.6, 7.2], target: [0.4, 1.5, 0.1] }, spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const mw = makeMicrowave(); root.add(mw.group);
    const P = mw.parts;
    const setExplode = exploder([
      { obj: P.shell, off: [0, 2.4, -0.6] },
      { obj: P.doorPivot, off: [-0.4, 0, 2.6] },
      { obj: P.panel, off: [0.4, 0, 2.6] },
      { obj: P.board, off: [0.9, 0.2, 1.7] },
      { obj: P.interlocks, off: [0, 0, 1.0] },
      { obj: P.magnetron, off: [1.9, 1.5, 0] },
      { obj: P.waveguide, off: [0.8, 1.5, 0] },
      { obj: P.transformer, off: [2.2, -0.2, -0.8] },
      { obj: P.capacitor, off: [2.6, -0.1, 0.6] },
      { obj: P.fan, off: [1.3, 0.6, -1.3] },
      { obj: P.spin, off: [0, 0.35, 2.4] },
    ]);
    const L = (text, obj, pos, cls) => stage.label(text, pos, obj, cls);
    L('Door with metal mesh', P.door, [1.4, 2.9, 0.1]);
    L('Cavity', P.cavity, [-1.6, 2.2, -0.8]);
    const minor = [L('Control panel', P.panel, [0.2, -1.05, 0.1]), L('Glass turntable', P.spin, [-0.9, 0.35, 1.0])];
    const inner = [
      L('Magnetron', P.magnetron, [0.35, 0.75, 0.3], 'hot'),
      L('Waveguide', P.waveguide, [1.0, 2.5, -0.6]),
      L('Transformer', P.transformer, [0.2, 0.5, 0]),
      L('Capacitor + diode', P.capacitor, [0.3, -0.25, 0.5]),
      L('Cooling fan', P.fan, [0.3, 0.7, 0]),
      L('Control board', P.board, [0, -0.7, 0]),
      L('Interlock switches', P.interlocks, [1.1, 2.5, 1.55]),
    ];
    const pulses = cavityPulses(stage, root);
    const guide = guideWaves(P.waveguide);
    guide.update(0, false);

    let x = 1, spin = 0, fan = 0, on = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        setExplode(s.explode);
        x = approach(x, s.xray || s.explode > 0.05 ? 1 : 0, 6, dt);
        mw.setXray(x);
        mw.setCavityOpacity(1 - 0.7 * x);
        // On a narrow screen, keep only the main labels.
        const narrow = stage.host.clientWidth < 560;
        inner.forEach((l, i) => { l.visible = (s.explode > 0.3 || s.xray) && (!narrow || i < 3); });
        minor.forEach((l) => { l.visible = !narrow; });
        on = approach(on, s.cook ? 1 : 0, 4, dt);
        mw.setCooking(s.cook, on);
        spin += dt * on * (Math.PI * 2 / 12);          // a turntable turns about 5 times a minute
        P.spin.rotation.y = spin;
        fan += dt * on * 30;
        P.blades.rotation.z = fan;
        const live = s.cook && s.explode < 0.05;
        pulses.update(dt, live);
        guide.update(dt, s.cook && s.explode < 0.3);
      },
      readout: (s) => {
        if (!s.cook) return `<div class="big">Switched off</div>Press cook to start the magnetron.`;
        return `<div class="big">${OVEN.pOut} W of microwaves</div>
          <div class="row"><span>Power from the wall</span><b>about ${OVEN.pIn.toLocaleString('en')} W</b></div>
          <div class="row"><span>Magnetron voltage</span><b>about ${OVEN.anodeV.toLocaleString('en')} V</b></div>
          <div class="row"><span>Wave</span><b>${(F / 1e9).toFixed(2)} GHz, ${(LAMBDA * 100).toFixed(1)} cm long</b></div>
          <small>A typical 800 W, 20-litre oven. About ${Math.round((OVEN.pOut / OVEN.pIn) * 100)}% of the wall power becomes microwaves.</small>`;
      },
    };
  },
};
