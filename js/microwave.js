// MicrowaveClear's shared physics and parts: the numbers every chapter uses, a
// temperature colour scale, a canvas pattern for the door mesh, a water molecule,
// and a 3D countertop microwave oven built from its real parts.
// Scale: 1 unit = 10 cm. The oven is 48 cm wide, 28 cm tall and 38 cm deep, with a
// 31 × 21 × 30 cm cavity (a typical 20–25 litre "solo" oven).
import { THREE, M, rod, box, torus, clamp, lerp } from './kit.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- physics constants
export const C0 = 299792458;              // speed of light, m/s
export const F = 2.45e9;                  // ISM band used by home ovens (ITU Radio Regulations 5.150)
export const LAMBDA = C0 / F;             // 0.1224 m: the free-space wavelength
export const H_PLANCK = 6.62607015e-34;   // J·s (SI, exact)
export const EV = 1.602176634e-19;        // J per eV (SI, exact)
export const PHOTON_EV = (H_PLANCK * F) / EV;   // ≈ 1.0e-5 eV
export const C_WATER = 4180;              // J/(kg·K), liquid water near 20–80 °C
// Dielectric properties at 2.45 GHz. Water at 20–25 °C: ε' ≈ 78, ε'' ≈ 10
// (Kaatze 1989, J. Chem. Eng. Data 34:371; Meissner & Wentz 2004). Ice near −12 °C:
// ε' ≈ 3.2, ε'' ≈ 0.003 (von Hippel, Dielectric Materials and Applications, 1954).
export const WATER = { e1: 78, e2: 10 };
export const ICE = { e1: 3.2, e2: 0.003 };
// Power penetration depth, the depth where the power has fallen to 1/e (37%):
// Dp ≈ λ0 √ε' / (2π ε'') when ε'' ≪ ε'. Water ≈ 1.7 cm; ice ≈ 12 m.
export const penDepth = (m) => (LAMBDA * Math.sqrt(m.e1)) / (TAU * m.e2);
// A typical 800 W solo oven: about 1,250 W from the wall, about 65% turned into microwaves
// (magnetron data sheets such as the Panasonic 2M261 list 65–70% at 4 kV, 300 mA).
export const OVEN = { pIn: 1250, pOut: 800, anodeV: 4000, anodeI: 0.3 };
// Share of the microwave power a full cup of water soaks up. Lab tests of domestic ovens
// with a 1 kg water load (IEC 60705) put it around 80–90%; we use 85%.
export const ABSORBED = 0.85;
// Seconds to heat m kg of water by dT kelvin with P watts of microwaves.
export const heatTime = (kg, dT, P) => (kg * C_WATER * dT) / (ABSORBED * Math.max(1, P));

// Temperature colour: cool blue-grey → amber → red → near white.
const STOPS = [[-20, 0x9fd8ff], [0, 0xbfe8ff], [20, 0x3f6fae], [40, 0x7a64c9], [55, 0xffb547], [75, 0xff6a3d], [95, 0xffe2c4]];
const _a = new THREE.Color(), _b = new THREE.Color();
export function heatColor(T, out = new THREE.Color()) {
  if (T <= STOPS[0][0]) return out.set(STOPS[0][1]);
  for (let i = 1; i < STOPS.length; i++) {
    if (T <= STOPS[i][0]) { const k = (T - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0]); return out.copy(_a.set(STOPS[i - 1][1])).lerp(_b.set(STOPS[i][1]), k); }
  }
  return out.set(STOPS[STOPS.length - 1][1]);
}
export const heatCss = (T) => '#' + heatColor(T).getHexString();

// ---------------------------------------------------------------- door mesh texture
// Dark metal sheet with round holes. `pitch` and `hole` are in canvas pixels.
export function meshCanvas(w, h, pitch, hole, g) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(24,27,34,0.9)'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  const r = hole / 2;
  for (let y = pitch / 2, row = 0; y < h + pitch; y += pitch * 0.866, row++) {
    for (let x = (row % 2 ? pitch / 2 : 0); x < w + pitch; x += pitch) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  }
  g.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- water molecule
// H–O–H at 104.5°, O–H 0.96 Å, shown with oxygen at the origin and the dipole
// (from the O towards the middle of the two H) along +X.
export function makeWater(scale = 1, mats) {
  const g = new THREE.Group();
  const O = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 20, 14), mats?.O || M.plastic(0xff5a4f, { roughness: 0.3 }));
  g.add(O);
  const half = (104.5 / 2) * (Math.PI / 180), d = 0.2 * scale;
  for (const s of [1, -1]) {
    const Hh = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 16, 12), mats?.H || M.plastic(0xf2f4f7, { roughness: 0.3 }));
    Hh.position.set(Math.cos(half) * d, s * Math.sin(half) * d, 0);
    g.add(Hh);
  }
  return g;
}

// ---------------------------------------------------------------- the oven
export const CAV = { x0: -2.25, x1: 0.85, y0: 0.3, y1: 2.4, z0: -1.6, z1: 1.45 };   // inside of the cavity
export const PORT = new THREE.Vector3(0.84, 2.02, 0.18);                           // waveguide feed into the cavity
export const PLATE_Y = 0.5;                                                          // top of the glass turntable

export function makeMicrowave() {
  const group = new THREE.Group();
  const shellMat = M.plastic(0xe9ebef, { roughness: 0.35, transparent: true, opacity: 1 });
  const cavMat = M.matte(0xdfe3e8, { transparent: true, opacity: 1, side: THREE.DoubleSide });
  const dark = M.plastic(0x1f232c, { roughness: 0.5 });
  const steel = M.metal(0xc3c9d2, { roughness: 0.35 });
  const copper = M.metal(0xd07a3c, { roughness: 0.35 });

  // Outer case: a wrap-around top and sides, plus a back panel and a base.
  const shell = new THREE.Group();
  const top = box(4.8, 0.06, 3.7, shellMat); top.position.set(0, 2.77, -0.03);
  const left = box(0.06, 2.72, 3.7, shellMat); left.position.set(-2.37, 1.41, -0.03);
  const right = box(0.06, 2.72, 3.7, shellMat); right.position.set(2.37, 1.41, -0.03);
  const back = box(4.8, 2.72, 0.06, shellMat); back.position.set(0, 1.41, -1.85);
  shell.add(top, left, right, back);
  // Vent slots on the right side (the fan pulls air in here).
  for (let i = 0; i < 9; i++) { const v = box(0.02, 0.05, 0.9, dark); v.position.set(2.405, 1.4 + i * 0.12, -0.9); shell.add(v); }
  group.add(shell);
  const base = box(4.8, 0.08, 3.7, M.metal(0x9aa1ab, { roughness: 0.5 })); base.position.set(0, 0.08, -0.03); group.add(base);
  for (const [x, z] of [[-2.1, 1.5], [2.1, 1.5], [-2.1, -1.55], [2.1, -1.55]]) { const f = rod(-0.12, 0.12, 0.1, 0.1, dark); f.rotation.z = Math.PI / 2; f.position.set(x, 0.02, z); group.add(f); }

  // Cavity: five metal walls, painted. The front is the door.
  const cavity = new THREE.Group();
  const { x0, x1, y0, y1, z0, z1 } = CAV, cw = x1 - x0, ch = y1 - y0, cd = z1 - z0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const t = 0.04;
  const wall = (w, h, d, x, y, z) => { const m = box(w, h, d, cavMat); m.position.set(x, y, z); m.castShadow = false; cavity.add(m); return m; };
  wall(cw + 2 * t, t, cd, cx, y0 - t / 2, cz); wall(cw + 2 * t, t, cd, cx, y1 + t / 2, cz);
  wall(t, ch, cd, x0 - t / 2, cy, cz); wall(t, ch, cd, x1 + t / 2, cy, cz);
  wall(cw + 2 * t, ch + 2 * t, t, cx, cy, z0 - t / 2);
  // Front flange around the opening.
  const flange = new THREE.Group();
  [[cw + 0.3, 0.15, cx, y1 + 0.1], [cw + 0.3, 0.15, cx, y0 - 0.1]].forEach(([w, h, x, y]) => { const m = box(w, h, 0.05, steel); m.position.set(x, y, z1 + 0.3); flange.add(m); });
  [[x0 - 0.1], [x1 + 0.1]].forEach(([x]) => { const m = box(0.15, ch + 0.35, 0.05, steel); m.position.set(x, cy, z1 + 0.3); flange.add(m); });
  cavity.add(flange);
  // Throat between the cavity and the door.
  [[cw, 0.02, cx, y1, 0], [cw, 0.02, cx, y0, 0]].forEach(([w, h, x, y]) => { const m = box(w, h, 0.32, cavMat); m.position.set(x, y, z1 + 0.15); cavity.add(m); });
  // Mica cover over the feed port, and a lamp.
  const mica = box(0.02, 0.5, 0.62, M.matte(0xcdb88f)); mica.position.copy(PORT).x -= 0.01; cavity.add(mica);
  const lightMat = M.glow(0xfff1c9); lightMat.color.setScalar(0.25);
  const lamp = box(0.02, 0.18, 0.3, lightMat); lamp.position.set(x1 - 0.005, y1 - 0.25, 1.0); cavity.add(lamp);
  group.add(cavity);

  // Turntable: a motor under the floor, a roller ring and a glass plate.
  const turntable = new THREE.Group(); turntable.position.set(cx, 0, cz);
  const motor = rod(-0.15, 0.15, 0.2, 0.2, M.plastic(0xd8c9a3)); motor.rotation.z = Math.PI / 2; motor.position.y = y0 - 0.2; turntable.add(motor);
  const spin = new THREE.Group(); turntable.add(spin);
  const ring = torus(0.8, 0.025, M.plastic(0x30343c)); ring.rotation.x = Math.PI / 2; ring.position.y = y0 + 0.06; spin.add(ring);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU, w = rod(-0.05, 0.05, 0.07, 0.07, M.plastic(0x30343c)); w.position.set(Math.cos(a) * 0.8, y0 + 0.07, Math.sin(a) * 0.8); w.rotation.y = -a; spin.add(w); }
  const coupler = rod(-0.08, 0.08, 0.12, 0.12, M.plastic(0x30343c)); coupler.rotation.z = Math.PI / 2; coupler.position.y = y0 + 0.08; spin.add(coupler);
  const plateMat = M.clear(0xd9f1ff, 0.35, { roughness: 0.05 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.2, 0.06, 64), plateMat); plate.position.y = PLATE_Y - 0.03; spin.add(plate);
  const plateRim = torus(1.33, 0.03, M.clear(0xd9f1ff, 0.5)); plateRim.rotation.x = Math.PI / 2; plateRim.position.y = PLATE_Y; spin.add(plateRim);
  group.add(turntable);

  // Waveguide: a rectangular metal duct (8.6 × 4.3 cm inside, like WR-340) up the
  // outside of the cavity's right wall, open into the cavity behind the mica cover.
  const waveguide = new THREE.Group();
  const wgMat = M.metal(0xb7bcc4, { roughness: 0.4, transparent: true, opacity: 1 });
  const wg = box(0.43, 0.95, 0.86, wgMat); wg.position.set(x1 + 0.26, 1.87, PORT.z); waveguide.add(wg);
  group.add(waveguide);

  // Magnetron: anode block with cooling fins between two ring magnets, a steel yoke,
  // the antenna poking into the waveguide, and the filament filter box on the other end.
  const magnetron = new THREE.Group(); magnetron.position.set(1.68, 1.95, PORT.z);
  const anode = rod(-0.3, 0.3, 0.2, 0.2, copper); magnetron.add(anode);
  for (let i = 0; i < 5; i++) { const fin = box(0.02, 0.9, 0.9, M.metal(0xd9dde3, { roughness: 0.3 })); fin.position.x = -0.18 + i * 0.09; magnetron.add(fin); }
  for (const s of [-1, 1]) { const mg = rod(-0.07, 0.07, 0.3, 0.3, M.matte(0x3a3f4a)); mg.position.x = s * 0.33; magnetron.add(mg); }
  const yoke = new THREE.Group();
  for (const s of [-1, 1]) { const p = box(0.04, 0.95, 0.95, steel); p.position.x = s * 0.44; yoke.add(p); }
  const ytop = box(0.92, 0.04, 0.95, steel); ytop.position.y = 0.47; yoke.add(ytop);
  const ybot = box(0.92, 0.04, 0.95, steel); ybot.position.y = -0.47; yoke.add(ybot);
  magnetron.add(yoke);
  const antenna = rod(-0.7, -0.45, 0.07, 0.07, steel); magnetron.add(antenna);
  const antMat = M.glow(0x8ec2ff); antMat.color.setScalar(0.25);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), antMat); dome.position.x = -0.72; magnetron.add(dome);
  const filter = box(0.2, 0.5, 0.55, M.metal(0xa8aeb8, { roughness: 0.45 })); filter.position.x = 0.5; magnetron.add(filter);
  for (const s of [-1, 1]) { const tp = rod(0.6, 0.66, 0.03, 0.03, copper); tp.position.z = s * 0.12; magnetron.add(tp); }
  group.add(magnetron);

  // High-voltage transformer: laminated iron core with a thick primary and a fine secondary.
  const transformer = new THREE.Group(); transformer.position.set(1.62, 0.5, -0.95);
  const core = box(0.9, 0.7, 0.62, M.metal(0x5a606b, { roughness: 0.6 })); transformer.add(core);
  const prim = box(0.26, 0.5, 0.7, copper); prim.position.x = -0.2; transformer.add(prim);
  const sec = box(0.3, 0.5, 0.7, M.metal(0xb5652e, { roughness: 0.5 })); sec.position.x = 0.18; transformer.add(sec);
  group.add(transformer);

  // High-voltage capacitor (an oval can) and diode: with the transformer they make a voltage doubler.
  const capacitor = new THREE.Group(); capacitor.position.set(1.6, 0.36, 0.35);
  const can = rod(-0.35, 0.35, 0.17, 0.17, M.metal(0xc9ced6, { roughness: 0.3 })); can.rotation.y = Math.PI / 2; can.scale.set(1, 1, 1); capacitor.add(can);
  for (const s of [-1, 1]) { const tm = rod(0.35, 0.45, 0.03, 0.03, copper); tm.rotation.y = Math.PI / 2; tm.position.x = s * 0.06; capacitor.add(tm); }
  const diode = rod(-0.16, 0.16, 0.035, 0.035, M.plastic(0x15171c)); diode.position.set(0.4, 0.0, -0.15); diode.rotation.y = 0.6; capacitor.add(diode);
  group.add(capacitor);

  // Cooling fan at the back of the electronics bay, blowing over the magnetron.
  const fan = new THREE.Group(); fan.position.set(1.72, 1.55, -1.45);
  const fanMotor = rod(-0.12, 0.12, 0.16, 0.16, M.plastic(0x2e323a)); fanMotor.rotation.y = Math.PI / 2; fanMotor.position.z = -0.18; fan.add(fanMotor);
  const blades = new THREE.Group(); fan.add(blades);
  for (let k = 0; k < 5; k++) { const b = box(0.12, 0.42, 0.02, M.plastic(0x4f8cff, { transparent: true, opacity: 0.9 })); b.geometry.translate(0, 0.25, 0); b.rotation.z = (k / 5) * TAU; b.rotation.y = 0.35; blades.add(b); }
  const shroud = torus(0.5, 0.03, M.plastic(0x2e323a)); shroud.position.z = 0; fan.add(shroud);
  group.add(fan);

  // Control board behind the front panel.
  const board = new THREE.Group(); board.position.set(1.7, 1.55, 1.58);
  const pcb = box(1.05, 1.9, 0.04, M.plastic(0x1f7a4d, { roughness: 0.6 })); board.add(pcb);
  [[-0.2, 0.5], [0.2, 0.1], [-0.1, -0.4], [0.25, -0.6]].forEach(([x, y], i) => { const c = box(i === 0 ? 0.3 : 0.18, i === 0 ? 0.3 : 0.14, 0.05, dark); c.position.set(x, y, -0.04); board.add(c); });
  const relay = box(0.22, 0.2, 0.16, M.plastic(0x2f6bdc)); relay.position.set(0.25, 0.6, -0.1); board.add(relay);
  group.add(board);

  // Door interlock switches, where the door's hooks land.
  const interlocks = new THREE.Group();
  const swMats = [];
  [0.75, 1.35, 2.0].forEach((y) => {
    const m = M.plastic(0xffcf5a, { roughness: 0.4 }); swMats.push(m);
    const sw = box(0.18, 0.22, 0.3, m); sw.position.set(1.14, y, 1.3); interlocks.add(sw);
  });
  group.add(interlocks);

  // Front control panel.
  const panel = new THREE.Group(); panel.position.set(1.71, 1.41, 1.84);
  const face = box(1.32, 2.62, 0.1, M.plastic(0x2a2e37, { roughness: 0.4 })); panel.add(face);
  const dispC = document.createElement('canvas'); dispC.width = 256; dispC.height = 92;
  const dispTex = new THREE.CanvasTexture(dispC); dispTex.colorSpace = THREE.SRGBColorSpace;
  const showText = (txt) => { const g = dispC.getContext('2d'); g.fillStyle = '#07090d'; g.fillRect(0, 0, 256, 92); g.fillStyle = '#8ef0ff'; g.font = 'bold 60px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 50); dispTex.needsUpdate = true; };
  showText('0:30');
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.34), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false })); disp.position.set(0, 0.95, 0.052); panel.add(disp);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = box(0.26, 0.16, 0.04, M.plastic(0x3a4050)); k.position.set(-0.33 + c * 0.33, 0.42 - r * 0.24, 0.06); panel.add(k); }
  const startBtn = box(0.9, 0.24, 0.05, M.plastic(0x2f9a63)); startBtn.position.set(0, -0.62, 0.06); panel.add(startBtn);
  const knob = rod(0, 0.12, 0.22, 0.2, M.plastic(0x9aa3b2)); knob.rotation.y = -Math.PI / 2; knob.position.set(0, -1.0, 0.05); panel.add(knob);
  group.add(panel);

  // Door, hinged on the left. Its window is a metal sheet full of small holes behind glass.
  const doorPivot = new THREE.Group(); doorPivot.position.set(-2.4, 0, 1.83);
  const door = new THREE.Group(); doorPivot.add(door);
  const doorMat = M.plastic(0x1c2028, { roughness: 0.35 });
  const DW = 3.38, wx0 = 0.3, wx1 = 3.0, wy0 = 0.5, wy1 = 2.3;
  const frame = [[DW, 0.4, DW / 2, 0.3], [DW, 0.42, DW / 2, 2.51], [wx0, 1.8, wx0 / 2, 1.4], [DW - wx1, 1.8, (DW + wx1) / 2, 1.4]];
  frame.forEach(([w, h, x, y]) => { const m = box(w, h, 0.12, doorMat); m.position.set(x, y, 0.06); door.add(m); });
  const meshTex = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 680; meshCanvas(1024, 680, 11, 7, c.getContext('2d')); return c; })());
  meshTex.colorSpace = THREE.SRGBColorSpace; meshTex.anisotropy = 8;
  const meshMat = new THREE.MeshBasicMaterial({ map: meshTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, wy1 - wy0), meshMat); win.position.set((wx0 + wx1) / 2, (wy0 + wy1) / 2, 0.04); door.add(win);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, wy1 - wy0), M.clear(0xcfe8ff, 0.08)); glass.position.set((wx0 + wx1) / 2, (wy0 + wy1) / 2, 0.12); door.add(glass);
  const handle = box(0.12, 1.5, 0.16, M.plastic(0x2b303a)); handle.position.set(DW - 0.15, 1.4, 0.2); door.add(handle);
  const hooks = new THREE.Group();
  [0.75, 1.35, 2.0].forEach((y) => { const h = box(0.14, 0.12, 0.42, M.plastic(0x30343c)); h.position.set(DW + 0.02, y, -0.2); hooks.add(h); });
  door.add(hooks);
  group.add(doorPivot);

  const parts = { shell, base, cavity, flange, turntable, spin, plate, waveguide, magnetron, transformer, capacitor, fan, blades, board, interlocks, panel, doorPivot, door, hooks };
  return {
    group, parts,
    mats: { shellMat, cavMat, wgMat, lightMat, antMat, swMats, meshMat },
    showText,
    setXray(k) {
      shellMat.opacity = lerp(1, 0.12, k); shellMat.depthWrite = k < 0.5;
      wgMat.opacity = lerp(1, 0.45, k); wgMat.depthWrite = k < 0.5;
    },
    setCavityOpacity(o) { cavMat.opacity = o; cavMat.depthWrite = o > 0.9; },
    setDoor(a) { doorPivot.rotation.y = -a; },        // radians, opens towards the viewer
    setCooking(on, k = 1) {
      const v = on ? k : 0;
      lightMat.color.setScalar(0.25 + 0.75 * (on ? 1 : 0));
      antMat.color.setRGB(lerp(0.2, 0.55, v), lerp(0.2, 0.76, v), lerp(0.25, 1, v));
    },
  };
}

// Pulses spreading from the feed port through the cavity, clipped to its walls.
export function cavityPulses(stage, root, n = 5, color = 0x8ec2ff) {
  stage.renderer.localClippingEnabled = true;
  const { x0, x1, y0, y1, z0, z1 } = CAV;
  const planes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -x0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), x1),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0), new THREE.Plane(new THREE.Vector3(0, -1, 0), y1),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -z0), new THREE.Plane(new THREE.Vector3(0, 0, -1), z1),
  ];
  // The planes are in world space: move them with the parent (the oven may be moved or scaled).
  root.updateMatrixWorld(true);
  planes.forEach((p) => p.applyMatrix4(root.matrixWorld));
  const shells = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), M.ghost(color, 0.2, { clippingPlanes: planes, side: THREE.BackSide }));
    m.position.copy(PORT); root.add(m); shells.push(m);
  }
  let ph = 0;
  return {
    shells,
    update(dt, on, rate = 1) {
      ph += dt * 0.55 * rate;
      shells.forEach((m, i) => {
        const k = (ph + i / n) % 1;
        m.visible = on;
        m.scale.setScalar(0.1 + k * 3.6);
        m.material.opacity = 0.22 * (1 - k);
      });
    },
  };
}

// Little wavefront bars travelling down the waveguide from the antenna to the cavity.
export function guideWaves(root, color = 0x8ec2ff) {
  const bars = [];
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.8), M.ghost(color, 0.5)); root.add(b); bars.push(b); }
  let ph = 0;
  return {
    update(dt, on, rate = 1) {
      ph += dt * 0.9 * rate;
      bars.forEach((b, i) => {
        const k = (ph + i / 4) % 1;
        b.visible = on;
        b.position.set(lerp(1.22, 0.9, k), 1.95 + 0.07 * (1 - k), PORT.z);
        b.material.opacity = 0.55 * Math.sin(Math.PI * k);
      });
    },
  };
}

export { clamp };

// ---------------------------------------------------------------- fat lines
// A polyline of n points drawn with fat line segments. set(i, x, y, z) then done().
export function fatLine(stage, n, color, width = 3, o = {}) {
  const geo = new LineSegmentsGeometry();
  geo.setPositions(new Float32Array((n - 1) * 6));
  const mat = stage.lineMaterial({ color, linewidth: width, transparent: true, opacity: o.opacity ?? 1, depthWrite: false, ...o });
  const line = new LineSegments2(geo, mat);
  line.frustumCulled = false;
  const arr = geo.attributes.instanceStart.data.array, pts = new Float32Array(n * 3);
  line.set = (i, x, y, z) => { pts[i * 3] = x; pts[i * 3 + 1] = y; pts[i * 3 + 2] = z; };
  line.done = () => {
    for (let i = 0; i < n - 1; i++) { arr.set(pts.subarray(i * 3, i * 3 + 6), i * 6); }
    geo.attributes.instanceStart.data.needsUpdate = true;
    geo.computeBoundingSphere();
  };
  return line;
}
