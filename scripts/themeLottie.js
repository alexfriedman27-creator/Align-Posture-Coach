#!/usr/bin/env node
/*
 * themeLottie.js — recolor a Lottie .json (or a whole folder of them) into the
 * Align palette so every exercise animation matches the app, regardless of
 * where it was sourced. Works best on line / monochrome / duotone animations.
 *
 * Usage:
 *   node scripts/themeLottie.js <file-or-dir> [--secondary]
 *
 *   <file-or-dir>  a single .json or a directory (recolors every .json inside)
 *   --secondary    two-tone mode: the lightest colors become the muted
 *                  secondary text color, everything else becomes the accent.
 *                  (default: single-tone — every stroke/fill becomes accent)
 *
 * Writes in place. Back up first (or rely on git) — recoloring is lossy.
 */
const fs = require('fs');
const path = require('path');

// Align palette (from lib/design/colors.ts)
const ACCENT = [0x2f, 0x6b, 0xff];      // #2F6BFF
const SECONDARY = [0x8a, 0x93, 0xa6];   // #8A93A6
const toUnit = (rgb) => rgb.map((c) => c / 255);

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
const twoTone = args.includes('--secondary');
if (!target) {
  console.error('Usage: node scripts/themeLottie.js <file-or-dir> [--secondary]');
  process.exit(1);
}

// luminance of a normalized [r,g,b,(a)] color
const lum = (k) => 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];

function recolor(node, stats) {
  if (Array.isArray(node)) {
    for (const item of node) recolor(item, stats);
    return;
  }
  if (!node || typeof node !== 'object') return;

  // Solid fill ('fl') and stroke ('st') shapes hold their color in c.k = [r,g,b,a]
  if ((node.ty === 'fl' || node.ty === 'st') && node.c && Array.isArray(node.c.k)) {
    const k = node.c.k;
    if (k.length >= 3 && typeof k[0] === 'number') {
      const alpha = k.length >= 4 ? k[3] : 1;
      const useSecondary = twoTone && lum(k) > 0.75; // near-white -> muted
      const rgb = toUnit(useSecondary ? SECONDARY : ACCENT);
      node.c.k = [rgb[0], rgb[1], rgb[2], alpha];
      stats.recolored += 1;
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'c') continue;
    recolor(node[key], stats);
  }
}

function themeFile(file) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stats = { recolored: 0 };
  recolor(json, stats);
  fs.writeFileSync(file, JSON.stringify(json));
  console.log(`themed ${path.basename(file)} — recolored ${stats.recolored} color(s)`);
}

const stat = fs.statSync(target);
if (stat.isDirectory()) {
  const files = fs.readdirSync(target).filter((f) => f.endsWith('.json'));
  if (!files.length) console.log('no .json files found in', target);
  for (const f of files) themeFile(path.join(target, f));
} else {
  themeFile(target);
}
