#!/usr/bin/env node
/*
 * buildGallery.js — rebuilds mockups/all56-gallery.html from the current
 * generated Lottie files, so the live preview always matches what's on disk.
 * Loads lottie-web from a CDN (needs internet). Run after buildAnimations.js:
 *   node scripts/buildGallery.js && open mockups/all56-gallery.html
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'assets', 'animations', 'exercises');
const OUT = path.join(__dirname, '..', 'mockups', 'all56-gallery.html');
const exercises = require('../lib/data/exercises.json').exercises;

const cards = [];
const data = [];
exercises.forEach((ex, i) => {
  const f = path.join(DIR, ex.id + '.json');
  if (!fs.existsSync(f)) return;
  data.push(fs.readFileSync(f, 'utf8'));
  cards.push(
    `<div class='card'><div class='dot'></div><div class='l' id='l${data.length - 1}'></div>` +
    `<div class='cap'>${ex.name}<span>${ex.slot}</span></div></div>`
  );
});

const html =
`<!doctype html><html><head><meta charset='utf-8'><style>` +
`html,body{margin:0;background:#0A0E17;color:#F4F6FB;font-family:-apple-system,Helvetica,Arial,sans-serif}` +
`.wrap{padding:28px}h1{font-size:20px;margin:0 0 4px}.sub{color:#8A93A6;font-size:13px;margin-bottom:18px}` +
`.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}` +
`.card{position:relative;background:#121826;border-radius:14px;overflow:hidden;padding-bottom:6px}` +
`.dot{position:absolute;top:10px;right:12px;width:7px;height:7px;border-radius:4px;background:#2F6BFF;opacity:.85}` +
`.l{height:150px}.cap{font-size:13px;padding:6px 12px 8px;display:flex;justify-content:space-between}` +
`.cap span{color:#6B7488;font-size:11px}</style></head><body><div class='wrap'>` +
`<h1>Align — all ${data.length} exercises</h1>` +
`<div class='sub'>feet appear only on side-profile figures, all toes facing forward</div>` +
`<div class='grid'>${cards.join('')}</div></div>` +
`<script src='https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js'></script>` +
`<script>var D=[${data.join(',')}];` +
`D.forEach((d,i)=>lottie.loadAnimation({container:document.getElementById('l'+i),renderer:'svg',loop:true,autoplay:true,animationData:d}));` +
`</script></body></html>`;

fs.writeFileSync(OUT, html);
console.log('wrote', path.relative(path.join(__dirname, '..'), OUT), 'with', data.length, 'animations');
