import fs from 'fs';
const c = JSON.parse(fs.readFileSync('/tmp/catalog.json','utf8'));
const ye = JSON.parse(fs.readFileSync('/tmp/ye.json','utf8'));
const colors = JSON.parse(fs.readFileSync('/tmp/colors.json','utf8'));
const h = {}; for (const e of ye) h[e.id] = { ...c.h[e.id], ml: e.ml };
const catalog = { B: c.B, Y: c.Y, H: h, PACKS: c.Ko, TIERS: c.ye, ZO: c.Zo, COLORS: colors, IDS: ye.map(e => e.id) };
let src = fs.readFileSync('worker.src.js','utf8').replace('/*CATALOG*/{}', JSON.stringify(catalog));
fs.mkdirSync('dist',{recursive:true}); fs.writeFileSync('dist/worker.js', src);
console.log('ok', src.length, 'octets,', catalog.IDS.length, 'articles,', catalog.PACKS.length, 'packs');
