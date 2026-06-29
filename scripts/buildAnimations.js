#!/usr/bin/env node
/*
 * buildAnimations.js — generates all exercise Lottie animations in one
 * consistent "minimal elegant" stick-figure style:
 *   thin vertical-gradient figure (bright #5E97FF -> accent #2F6BFF),
 *   big hollow head, rounded joints, movement arrows, transparent bg.
 *
 * Each exercise is a small pose spec (2-3 keyframe poses that loop). Run:
 *   node scripts/buildAnimations.js
 * Writes one <id>.json per exercise into assets/animations/exercises/.
 */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'animations', 'exercises');

const GROUND = [0.10196, 0.12941, 0.2, 1];
const ARROW = [0.86, 0.90, 0.98, 1];
const CARD = [0.07059, 0.09412, 0.14902, 1]; // #121826 — matches the ExerciseAnimation card so the head matte is invisible on it
const GTOP = [0.36863, 0.59216, 1];
const GBOT = [0.18431, 0.41961, 1];
const e_i = { x: [0.58], y: [1] };
const e_o = { x: [0.42], y: [0] };

const pathOf = (v) => ({ c: false, v: v.map((p) => [p[0], p[1]]), i: v.map(() => [0, 0]), o: v.map(() => [0, 0]) });
const stroke = (c, w) => ({ ty: 'st', c: { a: 0, k: c }, o: { a: 0, k: 100 }, w: { a: 0, k: w }, lc: 2, lj: 2, bm: 0, nm: 'st' });
const fillC = (c) => ({ ty: 'fl', c: { a: 0, k: c }, o: { a: 0, k: 100 }, r: 1, bm: 0, nm: 'fl' });
const gstroke = (w, yT, yB) => ({ ty: 'gs', o: { a: 0, k: 100 }, w: { a: 0, k: w }, s: { a: 0, k: [0, yT] }, e: { a: 0, k: [0, yB] }, t: 1, g: { p: 2, k: { a: 0, k: [0, ...GTOP, 1, ...GBOT] } }, lc: 2, lj: 2, bm: 0, nm: 'gs' });
const trg = () => ({ ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } });

function layer(ind, nm, items, ks) {
  return { ddd: 0, ind, ty: 4, nm, sr: 1, ks: ks || { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } }, ao: 0, shapes: [{ ty: 'gr', nm, it: items }], ip: 0, op: 0, st: 0, bm: 0 };
}

// chevron arrow (head + shaft) around center [x,y] pointing dir
function chevron(dir, x, y) {
  const L = 16, W = 8, H = 6;
  let head, shaft;
  if (dir === 'up') { head = [[x - W, y - L + H], [x, y - L], [x + W, y - L + H]]; shaft = [[x, y - L], [x, y + L]]; }
  else if (dir === 'down') { head = [[x - W, y + L - H], [x, y + L], [x + W, y + L - H]]; shaft = [[x, y - L], [x, y + L]]; }
  else if (dir === 'left') { head = [[x - L + H, y - W], [x - L, y], [x - L + H, y + W]]; shaft = [[x - L, y], [x + L, y]]; }
  else { head = [[x + L - H, y - W], [x + L, y], [x + L - H, y + W]]; shaft = [[x - L, y], [x + L, y]]; }
  return [{ ty: 'sh', nm: 'h', ks: { a: 0, k: pathOf(head) } }, { ty: 'sh', nm: 's', ks: { a: 0, k: pathOf(shaft) } }];
}

function arrowOpacity(phase, F) {
  const M = Math.round(F / 2);
  if (phase === 'second') return [
    { t: 0, s: [0] }, { i: e_i, o: e_o, t: M, s: [0] },
    { t: Math.round(F * 0.62), s: [85] }, { i: e_i, o: e_o, t: Math.round(F * 0.88), s: [85] }, { t: F, s: [0] }];
  if (phase === 'always') return [
    { i: e_i, o: e_o, t: 0, s: [35] }, { i: e_i, o: e_o, t: M, s: [90] }, { t: F, s: [35] }];
  // first (default)
  return [
    { i: e_i, o: e_o, t: 0, s: [0] }, { t: Math.round(F * 0.14), s: [85] },
    { t: Math.round(F * 0.4), s: [85] }, { i: e_i, o: e_o, t: M, s: [0] }, { t: F, s: [0] }];
}

function arrowLayer(ind, a, F) {
  const items = [...chevron(a.dir, a.at[0], a.at[1]), stroke(ARROW, 4), trg()];
  const ks = { o: { a: 1, k: arrowOpacity(a.phase, F) }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } };
  const L = layer(ind, 'arrow', items, ks); L.op = F; return L;
}

function buildExercise(spec) {
  const F = spec.frames || 70;
  const W = spec.w || 10, HR = spec.headR || 22, HW = spec.headW || 7;
  const poses = spec.poses;
  const seq = poses.concat([poses[0]]);
  const times = seq.map((_, i) => Math.round((i * F) / (seq.length - 1)));
  const names = Object.keys(poses[0].limbs);
  for (const nm of names) {
    const c0 = poses[0].limbs[nm].length;
    for (const p of poses) if (p.limbs[nm].length !== c0) throw new Error(`${spec.id}: limb ${nm} vertex mismatch`);
  }
  let ys = [];
  for (const p of poses) { for (const nm of names) for (const v of p.limbs[nm]) ys.push(v[1]); ys.push(p.head[1] - HR, p.head[1] + HR); }
  const yT = Math.min(...ys), yB = Math.max(...ys);

  // arrows (top)
  const arrowLs = (spec.arrows || []).map((a) => arrowLayer(0, a, F));

  // limbs
  const limbLs = names.map((nm) => {
    const moves = poses.some((p) => JSON.stringify(p.limbs[nm]) !== JSON.stringify(poses[0].limbs[nm]));
    let sh;
    if (moves) {
      const kf = seq.map((p, i) => { const o = { t: times[i], s: [pathOf(p.limbs[nm])] }; if (i < seq.length - 1) { o.i = e_i; o.o = e_o; } return o; });
      sh = { ty: 'sh', nm, ks: { a: 1, k: kf } };
    } else sh = { ty: 'sh', nm, ks: { a: 0, k: pathOf(poses[0].limbs[nm]) } };
    const L = layer(0, nm, [sh, gstroke(W, yT, yB), trg()]); L.op = F; return L;
  });

  // head: a card-colored matte (knocks out limbs passing behind it) + the hollow gradient ring on top
  const headMoves = poses.some((p) => p.head[0] !== poses[0].head[0] || p.head[1] !== poses[0].head[1]);
  const elP = headMoves
    ? { a: 1, k: seq.map((p, i) => { const o = { t: times[i], s: [p.head[0], p.head[1]] }; if (i < seq.length - 1) { o.i = e_i; o.o = e_o; } return o; }) }
    : { a: 0, k: poses[0].head };
  const ring = layer(0, 'headring', [{ ty: 'el', nm: 'r', p: elP, s: { a: 0, k: [HR * 2, HR * 2] } }, gstroke(HW, yT, yB), trg()]); ring.op = F;
  const matte = layer(0, 'headmatte', [{ ty: 'el', nm: 'm', p: elP, s: { a: 0, k: [(HR + HW / 2) * 2, (HR + HW / 2) * 2] } }, fillC(CARD), trg()]); matte.op = F;

  // auto neck: connect the head to the body. Skipped when a pose authors its own 'neck' limb.
  let neckL = null;
  if (!names.includes('neck')) {
    const anchorOf = (p) => { const L = p.limbs; return (L.torso && L.torso[0]) || (L.spine && L.spine[0]) || (L.body && L.body[0]) || (L.upper && L.upper[0]) || p.head; };
    const neckPath = (p) => {
      const a = anchorOf(p), h = p.head;
      const dx = a[0] - h[0], dy = a[1] - h[1], d = Math.hypot(dx, dy) || 1;
      const r = HR + HW / 2; // stop at the head's outer edge so the neck meets the head, never enters it
      return pathOf([[h[0] + (dx / d) * r, h[1] + (dy / d) * r], a]);
    };
    const nmoves = poses.some((p) => JSON.stringify(neckPath(p)) !== JSON.stringify(neckPath(poses[0])));
    let nsh;
    if (nmoves) { const kf = seq.map((p, i) => { const o = { t: times[i], s: [neckPath(p)] }; if (i < seq.length - 1) { o.i = e_i; o.o = e_o; } return o; }); nsh = { ty: 'sh', nm: 'neck', ks: { a: 1, k: kf } }; }
    else nsh = { ty: 'sh', nm: 'neck', ks: { a: 0, k: neckPath(poses[0]) } };
    neckL = layer(0, 'neck', [nsh, gstroke(W, yT, yB), trg()]); neckL.op = F;
  }

  let groundL = null;
  if (spec.ground) { groundL = layer(0, 'ground', [{ ty: 'sh', nm: 'g', ks: { a: 0, k: pathOf(spec.ground) } }, stroke(GROUND, 3), trg()]); groundL.op = F; }

  // order top -> bottom: arrows, head ring, head matte, limbs, neck, ground
  const layers = [...arrowLs, ring, matte, ...limbLs];
  if (neckL) layers.push(neckL);
  if (groundL) layers.push(groundL);
  layers.forEach((L, i) => { L.ind = i + 1; });

  return { v: '5.7.4', fr: 30, ip: 0, op: F, w: 480, h: 270, nm: spec.id, ddd: 0, assets: [], layers };
}

/* ---------- pose helpers ---------- */
// front-facing standing figure
const fstand = (o = {}) => {
  const sh = o.sh || [240, 100], hip = o.hip || [240, 168], head = o.head || [240, 70];
  const hands = o.hands || [[192, 154], [288, 154]], feet = o.feet || [[212, 236], [268, 236]];
  return { head, limbs: { torso: [sh, hip], armL: [sh, hands[0]], armR: [sh, hands[1]], legL: [hip, feet[0]], legR: [hip, feet[1]] } };
};
// side prone (face down, facing right), spine = head..hip line near ground
const prone = (o = {}) => {
  const head = o.head || [118, 196], sh = o.sh || [150, 198], hip = o.hip || [256, 198];
  const arm = o.arm || [222, 214], knee = o.knee || [300, 214], foot = o.foot || [340, 214];
  return { head, limbs: { spine: [sh, hip], arm: [sh, arm], leg: [hip, knee, foot] } };
};
// supine (face up, facing right)
const supine = (o = {}) => {
  const head = o.head || [120, 196], sh = o.sh || [150, 200], hip = o.hip || [250, 200];
  const arm = o.arm || [188, 210], knee = o.knee || [300, 178], foot = o.foot || [318, 210];
  return { head, limbs: { spine: [sh, hip], arm: [sh, arm], leg: [hip, knee, foot] } };
};
// quadruped (all-fours, facing right). Arm/leg auto-attach to the spine ends so
// the figure never detaches; head sits a short neck-length off the shoulder.
const quad = (o = {}) => {
  const spine = o.spine || [[196, 150], [300, 150]];
  const sh = spine[0], hip = spine[spine.length - 1];
  const head = o.head || [sh[0] - 30, sh[1] - 2];
  const hand = o.hand || [sh[0] + 6, 214];
  const knee = o.knee || [hip[0] + 4, 214];
  return { head, limbs: { spine, arm: [sh, hand], leg: [hip, knee] } };
};

/* ---------- exercise specs ---------- */
// reusable: arms-only standing variant (sh/hip/feet fixed, hands change)
const armPose = (hands, head = [240, 70]) => fstand({ hands, head });

const SPECS = [];
const A = (s) => SPECS.push(s);

/* NECK */
A({ id: 'chin_tuck', headR: 26, poses: [ // side profile head retract
  { head: [250, 92], limbs: { neck: [[238, 120], [250, 110]], torso: [[238, 120], [238, 210]], arm: [[238, 130], [214, 196]], leg: [[238, 210], [238, 250]] } },
  { head: [232, 90], limbs: { neck: [[238, 120], [232, 108]], torso: [[238, 120], [238, 210]], arm: [[238, 130], [214, 196]], leg: [[238, 210], [238, 250]] } },
], arrows: [{ dir: 'left', at: [292, 92], phase: 'first' }] });
A({ id: 'chin_tuck_wall', headR: 26, ground: [[300, 60], [300, 250]], poses: [
  { head: [250, 92], limbs: { neck: [[238, 120], [250, 110]], torso: [[238, 120], [238, 210]], leg: [[238, 210], [238, 250]] } },
  { head: [234, 90], limbs: { neck: [[238, 120], [234, 108]], torso: [[238, 120], [238, 210]], leg: [[238, 210], [238, 250]] } },
], arrows: [{ dir: 'left', at: [292, 92], phase: 'first' }] });
A({ id: 'chin_tuck_supine', headR: 24, ground: [[80, 214], [400, 214]], poses: [
  { head: [150, 196], limbs: { neck: [[176, 200], [162, 196]], torso: [[176, 200], [300, 200]], leg: [[300, 200], [340, 200]] } },
  { head: [158, 196], limbs: { neck: [[176, 200], [170, 198]], torso: [[176, 200], [300, 200]], leg: [[300, 200], [340, 200]] } },
], arrows: [{ dir: 'right', at: [120, 168], phase: 'first' }] });
A({ id: 'deep_neck_flexor_resisted', headR: 26, poses: [
  { head: [250, 92], limbs: { neck: [[238, 120], [250, 110]], torso: [[238, 120], [238, 210]], arm: [[238, 130], [274, 96]], leg: [[238, 210], [238, 250]] } },
  { head: [234, 90], limbs: { neck: [[238, 120], [234, 108]], torso: [[238, 120], [238, 210]], arm: [[238, 130], [262, 96]], leg: [[238, 210], [238, 250]] } },
], arrows: [{ dir: 'left', at: [292, 92], phase: 'first' }] });
A({ id: 'upper_trap_stretch', headR: 24, poses: [
  fstand({ head: [240, 72] }),
  { head: [262, 78], limbs: { torso: [[240, 100], [240, 168]], armL: [[240, 100], [192, 154]], armR: [[240, 100], [288, 154]], legL: [[240, 168], [212, 236]], legR: [[240, 168], [268, 236]] } },
], arrows: [{ dir: 'right', at: [292, 70], phase: 'first' }] });
A({ id: 'scalene_stretch', headR: 24, poses: [
  fstand({ head: [240, 72] }),
  { head: [218, 76], limbs: { torso: [[240, 100], [240, 168]], armL: [[240, 100], [192, 154]], armR: [[240, 100], [288, 154]], legL: [[240, 168], [212, 236]], legR: [[240, 168], [268, 236]] } },
], arrows: [{ dir: 'left', at: [188, 70], phase: 'first' }] });
A({ id: 'levator_scapulae_stretch', headR: 24, poses: [
  fstand({ head: [240, 72] }),
  { head: [262, 86], limbs: { torso: [[240, 100], [240, 168]], armL: [[240, 100], [192, 154]], armR: [[240, 100], [288, 154]], legL: [[240, 168], [212, 236]], legR: [[240, 168], [268, 236]] } },
], arrows: [{ dir: 'down', at: [292, 96], phase: 'first' }] });
A({ id: 'isometric_neck_extension', headR: 24, poses: [
  { head: [240, 72], limbs: { torso: [[240, 100], [240, 168]], armL: [[240, 100], [210, 64]], armR: [[240, 100], [270, 64]], legL: [[240, 168], [212, 236]], legR: [[240, 168], [268, 236]] } },
  { head: [240, 70], limbs: { torso: [[240, 100], [240, 168]], armL: [[240, 100], [210, 62]], armR: [[240, 100], [270, 62]], legL: [[240, 168], [212, 236]], legR: [[240, 168], [268, 236]] } },
], arrows: [{ dir: 'left', at: [196, 72], phase: 'always' }] });
A({ id: 'prone_neck_extension', headR: 24, ground: [[80, 214], [400, 214]], poses: [
  { head: [150, 200], limbs: { spine: [[180, 204], [300, 204]], arm: [[180, 204], [150, 212]], leg: [[300, 204], [340, 204]] } },
  { head: [150, 184], limbs: { spine: [[180, 204], [300, 204]], arm: [[180, 204], [150, 212]], leg: [[300, 204], [340, 204]] } },
], arrows: [{ dir: 'up', at: [150, 158], phase: 'first' }] });

/* SHOULDER */
A({ id: 'prone_y_raise', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [240, 196], limbs: { torso: [[240, 150], [240, 196]], armL: [[240, 158], [196, 120]], armR: [[240, 158], [284, 120]], leg: [[240, 196], [240, 214]] } },
  { head: [240, 190], limbs: { torso: [[240, 150], [240, 190]], armL: [[240, 152], [194, 110]], armR: [[240, 152], [286, 110]], leg: [[240, 190], [240, 214]] } },
], arrows: [{ dir: 'up', at: [240, 84], phase: 'first' }] });
A({ id: 'prone_t_raise', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [240, 196], limbs: { torso: [[240, 150], [240, 196]], armL: [[240, 168], [186, 168]], armR: [[240, 168], [294, 168]], leg: [[240, 196], [240, 214]] } },
  { head: [240, 190], limbs: { torso: [[240, 150], [240, 190]], armL: [[240, 164], [184, 158]], armR: [[240, 164], [296, 158]], leg: [[240, 190], [240, 214]] } },
], arrows: [{ dir: 'up', at: [240, 120], phase: 'first' }] });
A({ id: 'prone_w_raise', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [240, 196], limbs: { torso: [[240, 150], [240, 196]], armL: [[240, 160], [206, 138], [192, 168]], armR: [[240, 160], [274, 138], [288, 168]], leg: [[240, 196], [240, 214]] } },
  { head: [240, 190], limbs: { torso: [[240, 150], [240, 190]], armL: [[240, 156], [204, 130], [188, 160]], armR: [[240, 156], [276, 130], [292, 160]], leg: [[240, 190], [240, 214]] } },
], arrows: [{ dir: 'up', at: [240, 110], phase: 'first' }] });
A({ id: 'prone_i_raise', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [240, 196], limbs: { torso: [[240, 150], [240, 196]], armL: [[240, 156], [222, 116]], armR: [[240, 156], [258, 116]], leg: [[240, 196], [240, 214]] } },
  { head: [240, 190], limbs: { torso: [[240, 150], [240, 190]], armL: [[240, 150], [224, 106]], armR: [[240, 150], [256, 106]], leg: [[240, 190], [240, 214]] } },
], arrows: [{ dir: 'up', at: [240, 80], phase: 'first' }] });
A({ id: 'seated_scapular_squeeze', headR: 24, poses: [
  { head: [240, 76], limbs: { torso: [[240, 104], [240, 180]], armL: [[240, 116], [223, 133], [206, 150]], armR: [[240, 116], [257, 133], [274, 150]], legL: [[240, 180], [206, 196]], legR: [[240, 180], [274, 196]] } },
  { head: [240, 76], limbs: { torso: [[240, 104], [240, 180]], armL: [[240, 116], [212, 138], [196, 158]], armR: [[240, 116], [268, 138], [284, 158]], legL: [[240, 180], [206, 196]], legR: [[240, 180], [274, 196]] } },
], arrows: [{ dir: 'left', at: [196, 110], phase: 'second' }, { dir: 'right', at: [284, 110], phase: 'second' }] });
A({ id: 'prone_scapular_retraction', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [240, 196], limbs: { torso: [[240, 150], [240, 196]], armL: [[240, 162], [204, 180]], armR: [[240, 162], [276, 180]], leg: [[240, 196], [240, 214]] } },
  { head: [240, 192], limbs: { torso: [[240, 150], [240, 192]], armL: [[240, 158], [206, 168]], armR: [[240, 158], [274, 168]], leg: [[240, 192], [240, 214]] } },
], arrows: [{ dir: 'up', at: [240, 120], phase: 'first' }] });
A({ id: 'wall_slides', headR: 22, ground: [[330, 50], [330, 250]], poses: [
  armPose([[196, 132], [284, 132]]),
  armPose([[208, 96], [272, 96]]),
], arrows: [{ dir: 'up', at: [240, 56], phase: 'first' }, { dir: 'down', at: [240, 56], phase: 'second' }] });
A({ id: 'wall_angel', headR: 22, ground: [[330, 50], [330, 250]], poses: [
  armPose([[202, 130], [278, 130]]),
  armPose([[210, 98], [270, 98]]),
], arrows: [{ dir: 'up', at: [240, 60], phase: 'first' }, { dir: 'down', at: [240, 60], phase: 'second' }] });
A({ id: 'floor_slides_snow_angel', headR: 22, ground: [[70, 214], [410, 214]], poses: [
  { head: [240, 190], limbs: { torso: [[240, 150], [240, 196]], armL: [[240, 160], [196, 140]], armR: [[240, 160], [284, 140]], leg: [[240, 196], [240, 210]] } },
  { head: [240, 190], limbs: { torso: [[240, 150], [240, 196]], armL: [[240, 158], [206, 116]], armR: [[240, 158], [274, 116]], leg: [[240, 196], [240, 210]] } },
], arrows: [{ dir: 'up', at: [240, 92], phase: 'first' }] });
A({ id: 'serratus_punch_supine', headR: 22, ground: [[70, 214], [410, 214]], poses: [
  { head: [150, 198], limbs: { spine: [[178, 202], [280, 202]], arm: [[200, 202], [200, 150]], leg: [[280, 202], [330, 178], [350, 202]] } },
  { head: [150, 198], limbs: { spine: [[178, 202], [280, 202]], arm: [[200, 202], [200, 130]], leg: [[280, 202], [330, 178], [350, 202]] } },
], arrows: [{ dir: 'up', at: [200, 104], phase: 'first' }] });
A({ id: 'push_up_plus', headR: 22, ground: [[60, 222], [420, 222]], poses: [
  { head: [150, 168], limbs: { spine: [[182, 172], [310, 184]], arm: [[182, 172], [176, 218]], leg: [[310, 184], [360, 218]] } },
  { head: [150, 160], limbs: { spine: [[182, 162], [310, 176]], arm: [[182, 162], [176, 218]], leg: [[310, 176], [360, 218]] } },
], arrows: [{ dir: 'up', at: [240, 120], phase: 'first' }] });
A({ id: 'side_lying_external_rotation', headR: 22, ground: [[70, 220], [410, 220]], poses: [
  { head: [140, 196], limbs: { spine: [[170, 200], [280, 200]], upper: [[230, 200], [262, 210]], fore: [[262, 210], [292, 210]], leg: [[280, 200], [330, 214]] } },
  { head: [140, 196], limbs: { spine: [[170, 200], [280, 200]], upper: [[230, 200], [262, 210]], fore: [[262, 210], [286, 182]], leg: [[280, 200], [330, 214]] } },
], arrows: [{ dir: 'up', at: [300, 188], phase: 'first' }] });
A({ id: 'doorway_pec_stretch_mid', headR: 24, ground: [[300, 50], [300, 250]], poses: [
  { head: [220, 74], limbs: { torso: [[222, 102], [222, 176]], arm: [[222, 116], [286, 116], [292, 92]], legL: [[222, 176], [200, 236]], legR: [[222, 176], [250, 236]] } },
  { head: [212, 76], limbs: { torso: [[214, 104], [214, 176]], arm: [[214, 118], [286, 116], [292, 92]], legL: [[214, 176], [196, 236]], legR: [[214, 176], [244, 236]] } },
], arrows: [{ dir: 'left', at: [180, 120], phase: 'first' }] });
A({ id: 'doorway_pec_stretch_high', headR: 24, ground: [[300, 50], [300, 250]], poses: [
  { head: [220, 74], limbs: { torso: [[222, 102], [222, 176]], arm: [[222, 112], [284, 96], [294, 72]], legL: [[222, 176], [200, 236]], legR: [[222, 176], [250, 236]] } },
  { head: [212, 76], limbs: { torso: [[214, 104], [214, 176]], arm: [[214, 114], [284, 96], [294, 72]], legL: [[214, 176], [196, 236]], legR: [[214, 176], [244, 236]] } },
], arrows: [{ dir: 'left', at: [178, 116], phase: 'first' }] });
A({ id: 'scapular_posterior_tilt', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  quad({ spine: [[190, 152], [310, 152]] }),
  quad({ spine: [[190, 146], [310, 158]], head: [150, 146] }),
], arrows: [{ dir: 'up', at: [250, 116], phase: 'first' }] });
A({ id: 'standing_scapular_posterior_tilt', headR: 24, ground: [[300, 50], [300, 250]], poses: [
  fstand({ head: [248, 72], sh: [248, 100], hip: [248, 168], hands: [[214, 150], [282, 150]], feet: [[224, 236], [274, 236]] }),
  fstand({ head: [248, 72], sh: [248, 100], hip: [248, 168], hands: [[220, 140], [276, 140]], feet: [[224, 236], [274, 236]] }),
], arrows: [{ dir: 'down', at: [300, 120], phase: 'first' }] });

/* THORACIC */
A({ id: 'standing_thoracic_extension_wall', headR: 24, poses: [
  { head: [240, 72], limbs: { torso: [[240, 100], [240, 134], [240, 168]], armL: [[240, 104], [206, 150]], armR: [[240, 104], [274, 150]], legL: [[240, 168], [214, 236]], legR: [[240, 168], [266, 236]] } },
  { head: [240, 64], limbs: { torso: [[240, 96], [236, 140], [240, 168]], armL: [[240, 104], [206, 70]], armR: [[240, 104], [274, 70]], legL: [[240, 168], [214, 236]], legR: [[240, 168], [266, 236]] } },
], arrows: [{ dir: 'up', at: [300, 96], phase: 'first' }] });
A({ id: 'standing_backbend_reach', headR: 24, poses: [
  { head: [240, 70], limbs: { torso: [[240, 96], [240, 131], [240, 166]], armL: [[240, 104], [210, 110]], armR: [[240, 104], [270, 110]], legL: [[240, 166], [216, 236]], legR: [[240, 166], [264, 236]] } },
  { head: [240, 62], limbs: { torso: [[240, 96], [236, 138], [240, 166]], armL: [[240, 104], [212, 60]], armR: [[240, 104], [268, 60]], legL: [[240, 166], [216, 236]], legR: [[240, 166], [264, 236]] } },
], arrows: [{ dir: 'up', at: [240, 30], phase: 'first' }] });
A({ id: 'prone_extension_superman', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [150, 198], limbs: { spine: [[180, 202], [300, 202]], arm: [[180, 202], [140, 210]], leg: [[300, 202], [350, 208]] } },
  { head: [150, 182], limbs: { spine: [[180, 196], [300, 200]], arm: [[180, 196], [138, 176]], leg: [[300, 200], [350, 188]] } },
], arrows: [{ dir: 'up', at: [150, 150], phase: 'first' }] });
A({ id: 'swimmers_prone_extension', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [150, 192], limbs: { spine: [[180, 198], [300, 200]], armU: [[180, 198], [140, 178]], armD: [[180, 198], [150, 212]], legU: [[300, 200], [348, 188]], legD: [[300, 200], [346, 210]] } },
  { head: [150, 192], limbs: { spine: [[180, 198], [300, 200]], armU: [[180, 198], [148, 212]], armD: [[180, 198], [140, 178]], legU: [[300, 200], [346, 210]], legD: [[300, 200], [348, 188]] } },
], arrows: [{ dir: 'up', at: [240, 150], phase: 'always' }] });
A({ id: 'prone_cobra', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [150, 198], limbs: { spine: [[182, 202], [300, 202]], arm: [[182, 202], [160, 214]], leg: [[300, 202], [350, 206]] } },
  { head: [152, 176], limbs: { spine: [[184, 188], [300, 200]], arm: [[184, 188], [168, 214]], leg: [[300, 200], [350, 204]] } },
], arrows: [{ dir: 'up', at: [152, 146], phase: 'first' }] });
A({ id: 'cobra_pose_stretch', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [150, 196], limbs: { spine: [[182, 200], [300, 204]], arm: [[182, 200], [178, 220]], leg: [[300, 204], [352, 210]] } },
  { head: [156, 168], limbs: { spine: [[190, 182], [300, 204]], arm: [[190, 182], [186, 220]], leg: [[300, 204], [352, 208]] } },
], arrows: [{ dir: 'up', at: [156, 138], phase: 'first' }] });
A({ id: 'cat_cow', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  quad({ spine: [[200, 156], [250, 164], [300, 156]], head: [172, 168] }),
  quad({ spine: [[200, 150], [250, 132], [300, 150]], head: [172, 138] }),
], arrows: [{ dir: 'up', at: [250, 104], phase: 'first' }, { dir: 'down', at: [250, 104], phase: 'second' }] });
A({ id: 'quadruped_thoracic_rotation', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  quad({ spine: [[190, 152], [310, 152]], hand: [196, 214] }),
  { head: [150, 150], limbs: { spine: [[190, 152], [310, 152]], arm: [[230, 150], [248, 110]], leg: [[310, 152], [316, 214]], armB: [[190, 152], [196, 214]] } },
], arrows: [{ dir: 'up', at: [256, 92], phase: 'first' }] });
A({ id: 'child_pose_thoracic_stretch', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [196, 196], limbs: { spine: [[220, 200], [320, 210]], arm: [[220, 200], [120, 210]], leg: [[320, 210], [340, 200]] } },
  { head: [192, 200], limbs: { spine: [[218, 204], [320, 210]], arm: [[218, 204], [110, 214]], leg: [[320, 210], [340, 200]] } },
], arrows: [{ dir: 'left', at: [96, 210], phase: 'first' }] });

/* CORE */
A({ id: 'dead_bug', headR: 22, ground: [[70, 220], [410, 220]], poses: [
  { head: [150, 198], limbs: { spine: [[178, 202], [260, 202]], armU: [[200, 202], [200, 158]], armD: [[200, 202], [200, 158]], thigh: [[260, 202], [288, 170]], shin: [[288, 170], [288, 140]] } },
  { head: [150, 198], limbs: { spine: [[178, 202], [260, 202]], armU: [[200, 202], [168, 168]], armD: [[200, 202], [200, 158]], thigh: [[260, 202], [300, 196]], shin: [[300, 196], [330, 200]] } },
], arrows: [{ dir: 'up', at: [150, 150], phase: 'always' }] });
A({ id: 'supine_marching', headR: 22, ground: [[70, 220], [410, 220]], poses: [
  { head: [150, 198], limbs: { spine: [[178, 202], [260, 202]], arm: [[178, 202], [150, 210]], thigh: [[260, 202], [288, 168]], shin: [[288, 168], [288, 138]] } },
  { head: [150, 198], limbs: { spine: [[178, 202], [260, 202]], arm: [[178, 202], [150, 210]], thigh: [[260, 202], [300, 196]], shin: [[300, 196], [330, 202]] } },
], arrows: [{ dir: 'down', at: [320, 168], phase: 'first' }] });
A({ id: 'bird_dog', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  quad({ spine: [[190, 152], [310, 152]] }),
  { head: [150, 150], limbs: { spine: [[190, 150], [310, 150]], arm: [[190, 150], [140, 120]], leg: [[310, 150], [364, 122]] } },
], arrows: [{ dir: 'left', at: [120, 110], phase: 'first' }, { dir: 'right', at: [380, 112], phase: 'first' }] });
A({ id: 'standing_bird_dog', headR: 24, poses: [
  { head: [210, 96], limbs: { torso: [[224, 118], [288, 150]], arm: [[224, 118], [180, 150]], legS: [[288, 150], [292, 230]], legB: [[288, 150], [340, 150]] } },
  { head: [206, 92], limbs: { torso: [[222, 114], [290, 150]], arm: [[222, 114], [170, 120]], legS: [[290, 150], [294, 230]], legB: [[290, 150], [350, 132]] } },
], arrows: [{ dir: 'right', at: [372, 122], phase: 'first' }] });
A({ id: 'front_plank', headR: 22, ground: [[60, 222], [420, 222]], poses: [
  { head: [150, 168], limbs: { spine: [[182, 172], [322, 200]], arm: [[182, 172], [176, 218]], leg: [[322, 200], [368, 218]] } },
  { head: [150, 166], limbs: { spine: [[182, 170], [322, 198]], arm: [[182, 170], [176, 218]], leg: [[322, 198], [368, 218]] } },
], arrows: [{ dir: 'up', at: [250, 130], phase: 'always' }] });
A({ id: 'side_plank', headR: 22, ground: [[60, 222], [420, 222]], poses: [
  { head: [148, 150], limbs: { body: [[176, 162], [330, 218]], arm: [[176, 162], [172, 218]], legT: [[330, 218], [300, 196]] } },
  { head: [148, 146], limbs: { body: [[176, 158], [330, 218]], arm: [[176, 158], [172, 218]], legT: [[330, 218], [300, 192]] } },
], arrows: [{ dir: 'up', at: [250, 150], phase: 'always' }] });
A({ id: 'plank_shoulder_taps', headR: 22, ground: [[60, 222], [420, 222]], poses: [
  { head: [150, 168], limbs: { spine: [[182, 172], [322, 200]], arm: [[182, 172], [176, 218]], armT: [[260, 188], [200, 184]], leg: [[322, 200], [368, 218]] } },
  { head: [150, 168], limbs: { spine: [[182, 172], [322, 200]], arm: [[182, 172], [176, 218]], armT: [[260, 188], [196, 172]], leg: [[322, 200], [368, 218]] } },
], arrows: [{ dir: 'up', at: [210, 150], phase: 'first' }] });
A({ id: 'posterior_pelvic_tilt', headR: 22, ground: [[70, 220], [410, 220]], poses: [
  { head: [150, 198], limbs: { spine: [[178, 202], [262, 196]], arm: [[178, 202], [150, 210]], thigh: [[262, 196], [300, 176]], shin: [[300, 176], [318, 210]] } },
  { head: [150, 198], limbs: { spine: [[178, 204], [262, 204]], arm: [[178, 204], [150, 210]], thigh: [[262, 204], [300, 178]], shin: [[300, 178], [318, 210]] } },
], arrows: [{ dir: 'down', at: [240, 168], phase: 'first' }] });
A({ id: 'curl_up', headR: 22, ground: [[70, 220], [410, 220]], poses: [
  { head: [150, 198], limbs: { spine: [[176, 202], [262, 202]], arm: [[176, 202], [150, 210]], thigh: [[262, 202], [300, 176]], shin: [[300, 176], [318, 210]] } },
  { head: [158, 184], limbs: { spine: [[182, 190], [262, 202]], arm: [[182, 190], [158, 200]], thigh: [[262, 202], [300, 176]], shin: [[300, 176], [318, 210]] } },
], arrows: [{ dir: 'up', at: [150, 150], phase: 'first' }] });
A({ id: 'breathing_90_90', headR: 22, ground: [[70, 220], [410, 220]], poses: [
  { head: [150, 198], limbs: { spine: [[178, 202], [262, 202]], arm: [[210, 202], [210, 184]], thigh: [[262, 202], [300, 162]], shin: [[300, 162], [344, 162]] } },
  { head: [150, 198], limbs: { spine: [[178, 204], [262, 204]], arm: [[210, 204], [210, 190]], thigh: [[262, 204], [300, 162]], shin: [[300, 162], [344, 162]] } },
], arrows: [{ dir: 'up', at: [220, 158], phase: 'always' }] });

/* HIP */
A({ id: 'single_leg_glute_bridge', headR: 22, ground: [[70, 214], [410, 214]], poses: [
  { head: [150, 198], limbs: { spine: [[178, 202], [262, 198]], arm: [[178, 202], [150, 210]], legD: [[262, 198], [300, 200], [318, 210]], legU: [[262, 198], [320, 178]] } },
  { head: [150, 198], limbs: { spine: [[178, 200], [262, 150]], arm: [[178, 200], [150, 210]], legD: [[262, 150], [300, 168], [318, 210]], legU: [[262, 150], [330, 120]] } },
], arrows: [{ dir: 'up', at: [262, 110], phase: 'first' }] });
A({ id: 'clamshell', headR: 22, ground: [[70, 220], [410, 220]], poses: [
  { head: [140, 196], limbs: { spine: [[170, 200], [262, 200]], arm: [[170, 200], [200, 178]], thighD: [[262, 200], [300, 214]], thighU: [[262, 200], [298, 214]] } },
  { head: [140, 196], limbs: { spine: [[170, 200], [262, 200]], arm: [[170, 200], [200, 178]], thighD: [[262, 200], [300, 214]], thighU: [[262, 200], [306, 184]] } },
], arrows: [{ dir: 'up', at: [320, 188], phase: 'first' }] });
A({ id: 'prone_hip_extension', headR: 22, ground: [[60, 220], [420, 220]], poses: [
  { head: [150, 198], limbs: { spine: [[180, 202], [292, 202]], arm: [[180, 202], [150, 210]], legS: [[292, 202], [336, 202]], legL: [[292, 202], [332, 188], [332, 168]] } },
  { head: [150, 198], limbs: { spine: [[180, 202], [292, 202]], arm: [[180, 202], [150, 210]], legS: [[292, 202], [336, 202]], legL: [[292, 202], [330, 176], [330, 152]] } },
], arrows: [{ dir: 'up', at: [332, 132], phase: 'first' }] });
A({ id: 'figure_4_stretch', headR: 22, ground: [[70, 220], [410, 220]], poses: [
  { head: [140, 198], limbs: { spine: [[168, 202], [264, 202]], arm: [[168, 202], [200, 184]], thigh: [[264, 202], [298, 176]], shin: [[298, 176], [316, 206]], cross: [[286, 188], [322, 196]] } },
  { head: [140, 198], limbs: { spine: [[168, 202], [264, 198]], arm: [[168, 202], [200, 184]], thigh: [[264, 198], [288, 168]], shin: [[288, 168], [304, 196]], cross: [[278, 180], [314, 186]] } },
], arrows: [{ dir: 'left', at: [248, 168], phase: 'first' }] });
A({ id: 'hip_flexor_lunge_stretch', headR: 24, ground: [[60, 220], [420, 220]], poses: [
  { head: [220, 86], limbs: { torso: [[224, 110], [224, 176]], arm: [[224, 124], [224, 168]], legF: [[224, 176], [180, 200], [180, 220]], legB: [[224, 176], [290, 210], [330, 218]] } },
  { head: [222, 92], limbs: { torso: [[226, 116], [226, 180]], arm: [[226, 130], [226, 172]], legF: [[226, 180], [180, 202], [180, 220]], legB: [[226, 180], [298, 212], [338, 218]] } },
], arrows: [{ dir: 'right', at: [300, 160], phase: 'first' }] });
A({ id: 'standing_hip_flexor_stretch', headR: 24, ground: [[60, 220], [420, 220]], poses: [
  { head: [214, 78], limbs: { torso: [[218, 104], [218, 170]], arm: [[218, 118], [218, 162]], legF: [[218, 170], [190, 220]], legB: [[218, 170], [286, 220]] } },
  { head: [216, 84], limbs: { torso: [[220, 110], [220, 174]], arm: [[220, 124], [220, 166]], legF: [[220, 174], [194, 220]], legB: [[220, 174], [296, 220]] } },
], arrows: [{ dir: 'right', at: [300, 188], phase: 'first' }] });

/* INTEGRATION */
A({ id: 'single_leg_balance_reach', headR: 24, ground: [[60, 238], [420, 238]], poses: [
  { head: [240, 70], limbs: { torso: [[240, 98], [240, 168]], arm: [[240, 110], [288, 96]], legS: [[240, 168], [240, 236]], legL: [[240, 168], [284, 188]] } },
  { head: [236, 66], limbs: { torso: [[238, 94], [240, 166]], arm: [[238, 106], [296, 78]], legS: [[240, 166], [240, 236]], legL: [[240, 166], [292, 178]] } },
], arrows: [{ dir: 'up', at: [240, 36], phase: 'always' }] });
A({ id: 'tandem_stance_balance', headR: 24, ground: [[60, 238], [420, 238]], poses: [
  { head: [240, 70], limbs: { torso: [[240, 98], [240, 170]], armL: [[240, 110], [202, 142]], armR: [[240, 110], [278, 142]], legF: [[240, 170], [228, 236]], legB: [[240, 170], [256, 236]] } },
  { head: [244, 70], limbs: { torso: [[244, 98], [240, 170]], armL: [[244, 110], [206, 142]], armR: [[244, 110], [282, 142]], legF: [[240, 170], [228, 236]], legB: [[240, 170], [256, 236]] } },
], arrows: [{ dir: 'up', at: [240, 40], phase: 'always' }] });
A({ id: 'postural_awareness_cueing', headR: 24, poses: [
  fstand({ head: [240, 78], sh: [240, 106], hip: [240, 172] }),
  fstand({ head: [240, 68], sh: [240, 98], hip: [240, 168] }),
], arrows: [{ dir: 'up', at: [240, 34], phase: 'first' }] });
A({ id: 'phone_pickup_posture_check', headR: 24, poses: [
  { head: [236, 84], limbs: { torso: [[240, 108], [240, 176]], arm: [[240, 120], [276, 150]], phone: [[270, 142], [288, 158]], legL: [[240, 176], [216, 236]], legR: [[240, 176], [264, 236]] } },
  { head: [240, 72], limbs: { torso: [[240, 100], [240, 172]], arm: [[240, 112], [280, 96]], phone: [[274, 88], [292, 104]], legL: [[240, 172], [216, 236]], legR: [[240, 172], [264, 236]] } },
], arrows: [{ dir: 'up', at: [300, 120], phase: 'first' }] });
A({ id: 'brugger_relief', headR: 24, poses: [
  { head: [240, 80], limbs: { torso: [[240, 106], [240, 182]], armL: [[240, 118], [206, 150]], armR: [[240, 118], [274, 150]], legL: [[240, 182], [208, 200]], legR: [[240, 182], [272, 200]] } },
  { head: [240, 74], limbs: { torso: [[240, 100], [240, 182]], armL: [[240, 114], [196, 134]], armR: [[240, 114], [284, 134]], legL: [[240, 182], [208, 200]], legR: [[240, 182], [272, 200]] } },
], arrows: [{ dir: 'left', at: [180, 126], phase: 'second' }, { dir: 'right', at: [300, 126], phase: 'second' }] });

/* glute_bridge (already approved — keep identical geometry) */
A({ id: 'glute_bridge', headR: 25, ground: [[70, 214], [320, 214]], poses: [
  { head: [110, 188], limbs: { spine: [[150, 206], [236, 200]], arm: [[150, 206], [116, 214]], leg: [[236, 200], [284, 199], [304, 210]] } },
  { head: [110, 188], limbs: { spine: [[150, 206], [236, 150]], arm: [[150, 206], [116, 214]], leg: [[236, 150], [286, 166], [304, 210]] } },
], arrows: [{ dir: 'up', at: [250, 120], phase: 'first' }, { dir: 'down', at: [250, 120], phase: 'second' }] });

/* ---------- generate ---------- */
let ok = 0, fail = [];
for (const spec of SPECS) {
  try {
    const lottie = buildExercise(spec);
    fs.writeFileSync(path.join(OUT, spec.id + '.json'), JSON.stringify(lottie));
    ok++;
  } catch (e) { fail.push(spec.id + ': ' + e.message); }
}
console.log(`generated ${ok}/${SPECS.length} animations`);
if (fail.length) { console.log('FAILURES:'); fail.forEach((f) => console.log('  ' + f)); }
console.log('ids:', SPECS.map((s) => s.id).join(', '));
