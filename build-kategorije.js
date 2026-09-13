// Oniks Diamonds & Gems — category page builder
// Reads content/proizvodi.json + content/kolekcije.json (written by the admin panel)
// and generates one page per jewellery type:
//   verenicko-prstenje/index.html
//   prstenje/index.html
//   mindjuse/index.html
//   ogrlice-i-privesci/index.html
//   narukvice/index.html
// and adds those URLs to sitemap.xml (run AFTER build-blog.js — see netlify.toml).
// Styles and header are lifted from index.html at build time so the pages
// always match the homepage. No dependencies.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://oniksdiamonds.com';

const CATS = [
  { key: 'verenicko', slug: 'verenicko-prstenje', name: 'Vereničko prstenje', label: 'VERENIČKO PRSTENJE',
    lead: 'Dijamantski verenički prstenovi u 14K zlatu — solitaire, halo i klaster modeli. Svaki kamen je prirodan i dolazi sa sertifikatom.',
    meta: 'Verenički prstenovi sa prirodnim dijamantima u 14K belom, žutom i roze zlatu. Oniks Diamonds & Gems, Subotica.' },
  { key: 'prstenje', slug: 'prstenje', name: 'Prstenje', label: 'PRSTENJE',
    lead: 'Prstenje sa dijamantima i dragim kamenjem — za svakodnevno nošenje i za posebne prilike.',
    meta: 'Prstenje sa dijamantima, safirima, topazom i drugim prirodnim kamenjem u 14K zlatu. Oniks Diamonds & Gems, Subotica.' },
  { key: 'mindjuse', slug: 'mindjuse', name: 'Minđuše', label: 'MINĐUŠE',
    lead: 'Minđuše sa dijamantima — od sitnih komada za svaki dan do onih koje se pamte.',
    meta: 'Minđuše sa prirodnim dijamantima i dragim kamenjem u 14K zlatu. Oniks Diamonds & Gems, Subotica.' },
  { key: 'ogrlice', slug: 'ogrlice-i-privesci', name: 'Ogrlice i privesci', label: 'OGRLICE I PRIVESCI',
    lead: 'Privesci i ogrlice sa dijamantima, sa lančićem, u belom i žutom zlatu.',
    meta: 'Ogrlice i privesci sa prirodnim dijamantima u 14K zlatu, sa lančićem. Oniks Diamonds & Gems, Subotica.' },
  { key: 'narukvice', slug: 'narukvice', name: 'Narukvice', label: 'NARUKVICE',
    lead: 'Narukvice sa dijamantima i dragim kamenjem u 14K zlatu.',
    meta: 'Narukvice sa prirodnim dijamantima i dragim kamenjem u 14K zlatu. Oniks Diamonds & Gems, Subotica.' }
];

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => String(s || '').toLowerCase().replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const absImg = p => { if (!p) return ''; return p.startsWith('http') ? p : '/' + p.replace(/^\/+/, ''); };
const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return fallback; } };

// ---------- data ----------
const prods = (readJson('content/proizvodi.json', {}).proizvodi || []).map(p => ({
  ...p,
  naziv: String(p.naziv || '').trim(),
  kolekcija: String(p.kolekcija || '').trim(),
  vrsta: (Array.isArray(p.vrsta) ? p.vrsta : [p.vrsta]).filter(Boolean),
  slike: (p.slike || []).filter(Boolean)
}));
const cols = readJson('content/kolekcije.json', {}).kolekcije || [];

// ---------- styles + header lifted from index.html ----------
const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const homeCss = (home.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
const fonts = (home.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [''])[0];

// header + mobile panel from the homepage, with links made absolute and no language switcher
let header = (home.match(/<header id="siteHeader">[\s\S]*?<\/header>\s*<div class="mobile-panel"[\s\S]*?<\/div>\n/) || [''])[0];
header = header
  .replace(/href="#([a-z]+)"/g, 'href="/#$1"')
  .replace(/href="blog\/"/g, 'href="/blog/"')
  .replace(/href="([a-z-]+)\/"/g, 'href="/$1/"')
  .replace(/src="images\//g, 'src="/images/')
  .replace(/<span class="lang" id="langBar">[\s\S]*?<\/span>\s*<\/span>/, '</span>')   // desktop lang
  .replace(/<span class="lang" id="langBarM">[\s\S]*?<\/span>/, '')                     // mobile lang
  .replace('<header id="siteHeader">', '<header id="siteHeader" class="on-light">');

const CSS = `
  body{padding-top:0;}
  header{background:rgba(251,248,242,0.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--line);}
  .cat-page{padding:calc(88px + 6vh) 0 12vh;}
  .cat-strip{display:flex; gap:26px; flex-wrap:wrap; justify-content:center; font-size:0.7rem; letter-spacing:0.16em; color:var(--espresso-soft); margin-bottom:7vh;}
  .cat-strip a{padding-bottom:5px; border-bottom:1px solid transparent;}
  .cat-strip a.on{color:var(--espresso); border-bottom-color:var(--gold);}
  .catp-head{text-align:center; max-width:620px; margin:0 auto 6vh;}
  .catp-head h1{font-family:var(--serif); font-weight:400; font-size:clamp(2rem,5vw,3.4rem); line-height:1.15; margin-top:10px;}
  .catp-head p.lead{color:var(--espresso-soft); margin-top:18px; font-size:0.98rem; max-width:52ch; margin-left:auto; margin-right:auto;}
  .catp-head .count{margin-top:16px; font-family:var(--serif); font-style:italic; font-size:0.95rem; color:var(--gold-deep);}
    .empty{padding:8vh 0; max-width:52ch; margin:0 auto; text-align:center; font-family:var(--serif); font-style:italic; font-size:1.2rem; color:var(--espresso-soft);}
  .cat-cta{margin-top:12vh; padding:9vh 6vw; background:var(--white); border-top:1px solid var(--line); border-bottom:1px solid var(--line); text-align:center;}
  .cat-cta h2{font-family:var(--serif); font-weight:400; font-style:italic; font-size:clamp(1.5rem,3.2vw,2.2rem); max-width:24ch; margin:0 auto; line-height:1.3;}
  .cat-cta p{color:var(--espresso-soft); max-width:52ch; margin:18px auto 0; font-size:0.95rem;}
  .cat-cta .btns{display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:30px;}
  .btn.ghost{border-color:var(--line); color:var(--espresso-soft);}
  .btn.ghost:hover{background:none; border-color:var(--gold); color:var(--espresso);}
  .other{padding:10vh 0 4vh;}
  .other h2{font-family:var(--serif); font-weight:400; font-size:clamp(1.5rem,3vw,2rem); margin-bottom:4vh; text-align:center;}
  .other .tiles{gap:12px;}
  .other .tile{aspect-ratio:4/5;}
  @media(min-width:700px){ .other .tiles{grid-template-columns:repeat(4,1fr);} .other .tile{aspect-ratio:3/4;} }
  footer{border-top:1px solid var(--line);}
`;

// ---------- product card (same markup as the homepage grid) ----------
function card(p) {
  const imgs = p.slike.map(absImg);
  const metaBits = [p.kolekcija ? 'KOLEKCIJA ' + p.kolekcija.toUpperCase() : '', (p.materijal || '').toUpperCase(), (p.kamenje || '').toUpperCase(), p.cena || ''].filter(Boolean);
  const slides = imgs.map(s => `<img loading="lazy" decoding="async" src="${esc(s)}" alt="${esc(p.naziv)}">`).join('');
  const dots = imgs.length > 1 ? `<div class="dots">${imgs.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>` : '';
  return `<div class="prod" data-col="${esc(slug(p.kolekcija))}" data-imgs="${esc(imgs.join('|'))}" data-name="${esc(p.naziv)}" data-meta="${esc(metaBits.join(' · '))}">
  <div class="ph"><div class="slider">${slides}</div>${dots}${imgs.length > 1 ? '<button class="nav-arrow prev" aria-label="Prethodna">&#10094;</button><button class="nav-arrow next" aria-label="Sledeća">&#10095;</button>' : ''}</div>
  <div class="nm">${esc(p.naziv)}</div>
  <div class="mt">${esc([p.kolekcija, p.materijal].filter(Boolean).join(' · ').toUpperCase())}</div>
  ${p.kamenje ? `<div class="sp">${esc(p.kamenje)}</div>` : ''}
  <div class="pr">${esc(p.cena || 'Cena na upit')}</div>
  <div class="instore">Kupovina isključivo u radnji</div>
</div>`;
}

const TILE_IMG = { verenicko: '/images/cluster-hand.jpg', prstenje: '/images/sapphire-hand.jpg', mindjuse: '/images/earring-model.jpg', ogrlice: '/images/cross-pendant.jpg', narukvice: '/images/baguette-hand.jpg' };

const JS = `
  const menuBtn = document.getElementById('menuBtn'), panel = document.getElementById('mobilePanel'), moreWrap = document.getElementById('moreWrap');
  const isDesktop = () => window.matchMedia('(min-width:860px)').matches;
  if (menuBtn) menuBtn.addEventListener('click', e => { e.stopPropagation(); if (isDesktop()) moreWrap.classList.toggle('open'); else panel.classList.toggle('open'); });
  if (panel) panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => panel.classList.remove('open')));
  document.addEventListener('click', e => { if (moreWrap && !moreWrap.contains(e.target)) moreWrap.classList.remove('open'); });
  const drops = document.querySelectorAll('.has-drop');
  drops.forEach(d => { const b = d.querySelector('.drop-btn'); if (b) b.addEventListener('click', e => { e.stopPropagation(); drops.forEach(o => { if (o !== d) o.classList.remove('open'); }); d.classList.toggle('open'); }); });
  document.addEventListener('click', () => drops.forEach(d => d.classList.remove('open')));
  // collection filter
  const colBar = document.getElementById('colFilters');
  if (colBar) colBar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    colBar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const col = b.dataset.col;
    document.querySelectorAll('#prodGrid .prod').forEach(p => p.classList.toggle('hide', !(col === 'sve' || p.dataset.col === col)));
  });
  // sliders + arrows
  document.querySelectorAll('#prodGrid .prod').forEach(p => {
    const sl = p.querySelector('.slider'), dots = p.querySelectorAll('.dots i');
    if (sl && dots.length) sl.addEventListener('scroll', () => { const i = Math.round(sl.scrollLeft / sl.clientWidth); dots.forEach((d, n) => d.classList.toggle('on', n === i)); }, { passive: true });
    const step = dir => { if (!sl) return; const w = sl.clientWidth, i = Math.round(sl.scrollLeft / w), total = sl.children.length; sl.scrollTo({ left: ((i + dir + total) % total) * w, behavior: 'smooth' }); };
    const prev = p.querySelector('.nav-arrow.prev'), nxt = p.querySelector('.nav-arrow.next');
    if (prev) prev.addEventListener('click', e => { e.stopPropagation(); step(-1); });
    if (nxt) nxt.addEventListener('click', e => { e.stopPropagation(); step(1); });
  });
  // lightbox
  const lb = document.getElementById('lightbox');
  if (lb) {
    const track = document.getElementById('lbTrack'), dotsEl = document.getElementById('lbDots');
    track.addEventListener('scroll', () => { const i = Math.round(track.scrollLeft / track.clientWidth); dotsEl.querySelectorAll('i').forEach((d, n) => d.classList.toggle('on', n === i)); }, { passive: true });
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
    document.getElementById('lbClose').addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    const lbStep = dir => { const w = track.clientWidth, total = track.children.length; if (!total) return; const i = Math.round(track.scrollLeft / w); track.scrollTo({ left: ((i + dir + total) % total) * w, behavior: 'smooth' }); };
    document.getElementById('lbPrev').addEventListener('click', e => { e.stopPropagation(); lbStep(-1); });
    document.getElementById('lbNext').addEventListener('click', e => { e.stopPropagation(); lbStep(1); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (!lb.classList.contains('open')) return; if (e.key === 'ArrowLeft') lbStep(-1); if (e.key === 'ArrowRight') lbStep(1); });
    document.querySelectorAll('#prodGrid .prod').forEach(p => {
      p.onclick = () => {
        const imgs = (p.dataset.imgs || '').split('|').filter(Boolean);
        track.innerHTML = imgs.map(s => '<img src="' + s + '" alt="">').join('');
        dotsEl.innerHTML = imgs.length > 1 ? imgs.map((_, i) => '<i class="' + (i === 0 ? 'on' : '') + '"></i>').join('') : '';
        document.getElementById('lbName').textContent = p.dataset.name || '';
        document.getElementById('lbMeta').textContent = p.dataset.meta || '';
        track.scrollLeft = 0; lb.classList.toggle('multi', imgs.length > 1);
        lb.classList.add('open'); document.body.style.overflow = 'hidden';
      };
    });
  }
`;

function page(cat, items) {
  const url = `${SITE}/${cat.slug}/`;
  const presentCols = [];
  items.forEach(p => { const s = slug(p.kolekcija); if (s && !presentCols.includes(s)) presentCols.push(s); });
  const nameOf = s => { const c = cols.find(x => slug(x.naziv) === s); return c ? c.naziv : items.find(p => slug(p.kolekcija) === s).kolekcija; };
  const filters = presentCols.length > 1 ? `
    <div class="filter-row" style="margin-bottom:6vh;">
      <span class="filter-lab">KOLEKCIJA</span>
      <div class="cat-filters" id="colFilters" style="margin-bottom:0;">
        <button class="on" data-col="sve">SVE</button>
        ${presentCols.map(s => `<button data-col="${esc(s)}">${esc(nameOf(s).toUpperCase())}</button>`).join('')}
      </div>
    </div>` : '';
  const count = items.length === 1 ? '1 komad' : (items.length % 10 >= 2 && items.length % 10 <= 4 && !(items.length % 100 >= 12 && items.length % 100 <= 14)) ? `${items.length} komada` : `${items.length} komada`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${cat.name} — Oniks Diamonds & Gems`, url,
    mainEntity: { '@type': 'ItemList', itemListElement: items.map((p, i) => {
      const priceNum = (String(p.cena || '').match(/[\d.]+/) || [''])[0].replace(/\./g, '');
      const prod = { '@type': 'Product', name: p.naziv, image: p.slike.map(s => SITE + absImg(s)), material: p.materijal || undefined, brand: { '@type': 'Brand', name: 'Oniks Diamonds & Gems' } };
      if (priceNum) prod.offers = { '@type': 'Offer', priceCurrency: 'RSD', price: priceNum, availability: 'https://schema.org/InStoreOnly' };
      return { '@type': 'ListItem', position: i + 1, item: prod };
    }) }
  };
  const others = CATS.filter(c => c.key !== cat.key);
  return `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(cat.name)} — Oniks Diamonds &amp; Gems, Subotica</title>
<meta name="description" content="${esc(cat.meta)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#FBF8F2">
<meta property="og:title" content="${esc(cat.name)} — Oniks Diamonds &amp; Gems">
<meta property="og:description" content="${esc(cat.meta)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${TILE_IMG[cat.key]}">
<link rel="preconnect" href="https://fonts.googleapis.com">
${fonts}
<style>${homeCss}${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
${header}
<main class="cat-page">
  <div class="wrap">
    <nav class="cat-strip" aria-label="Vrste nakita">
      ${CATS.map(c => `<a href="/${c.slug}/" class="${c.key === cat.key ? 'on' : ''}">${esc(c.label)}</a>`).join('\n      ')}
    </nav>
    <div class="catp-head">
      <p class="eyebrow">Nakit</p>
      <h1>${esc(cat.name)}</h1>
      <p class="lead">${esc(cat.lead)}</p>
      ${items.length ? `<p class="count">${count} u ponudi</p>` : ''}
    </div>
    ${filters}
    ${items.length ? `<div class="prod-grid" id="prodGrid">${items.map(card).join('\n')}</div>`
      : `<p class="empty">Trenutno nema komada iz ove kategorije na sajtu. Izrađujemo ih po meri — javite nam se ili svratite u radnju.</p>`}
  </div>
  <div class="cat-cta">
    <h2>Ne vidite baš ono što tražite?</h2>
    <p>Bilo koji kamen, bilo koji oblik brušenja, vaš ili naš dizajn. Izrada po meri traje oko mesec dana od dogovora.</p>
    <div class="btns"><a class="btn" href="/#kamenje">Napravite svoj prsten</a><a class="btn ghost" href="/#poseta">Zakažite razgovor</a></div>
  </div>
  <div class="wrap other">
    <h2>Ostale vrste nakita</h2>
    <div class="tiles">
      ${others.map(c => `<a class="tile" href="/${c.slug}/"><img src="${TILE_IMG[c.key]}" alt="${esc(c.name)}" loading="lazy"><div class="tx"><h3>${esc(c.name)}</h3><span class="go">ISTRAŽITE</span></div></a>`).join('\n      ')}
    </div>
  </div>
</main>
<div class="lb" id="lightbox">
  <button class="lb-close" id="lbClose" aria-label="Zatvori">&times;</button>
  <button class="lb-arrow prev" id="lbPrev" aria-label="Prethodna">&#10094;</button>
  <button class="lb-arrow next" id="lbNext" aria-label="Sledeća">&#10095;</button>
  <div class="lb-track" id="lbTrack"></div>
  <div class="lb-info"><div class="lb-dots" id="lbDots"></div><div class="n" id="lbName"></div><div class="m" id="lbMeta"></div><div class="s">Kupovina isključivo u radnji</div></div>
</div>
<footer>
  <div class="wrap">
    <div class="footer-row">
      <a class="brand" style="color:var(--espresso);" href="/"><img class="mark" src="/images/logo.png" alt="Oniks amblem"><span class="brand-text" style="color:var(--espresso);">ONIKS DIAMONDS &amp; GEMS<sup>™</sup></span></a>
      <div class="footer-nav">
        ${CATS.map(c => `<a href="/${c.slug}/">${esc(c.name)}</a>`).join('\n        ')}
        <a href="/#kamenje">Drago kamenje</a>
        <a href="/blog/">Blog</a>
        <a href="/#poseta">Kontakt</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} Oniks Diamonds &amp; Gems · Dimitrija Tucovića 5, Subotica · Isključivo prirodno kamenje</span>
      <span>062 178 8052</span>
    </div>
  </div>
</footer>
<script>${JS}</script>
</body>
</html>`;
}

// ---------- build ----------
let built = 0;
for (const cat of CATS) {
  const items = prods.filter(p => p.vrsta.includes(cat.key) && p.naziv);
  const dir = path.join(ROOT, cat.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(cat, items));
  built++;
  console.log(`kategorije: /${cat.slug}/ — ${items.length} product(s)`);
}

// ---------- sitemap: add category URLs (keeps whatever build-blog.js wrote) ----------
const smPath = path.join(ROOT, 'sitemap.xml');
const today = new Date().toISOString().slice(0, 10);
let sm = fs.existsSync(smPath) ? fs.readFileSync(smPath, 'utf8') : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;
sm = sm.split('\n').filter(l => !CATS.some(c => l.includes(`<loc>${SITE}/${c.slug}/</loc>`))).join('\n');
const entries = CATS.map(c => `  <url><loc>${SITE}/${c.slug}/</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>`).join('\n');
sm = sm.replace(/\n?<\/urlset>/, `\n${entries}\n</urlset>`);
fs.writeFileSync(smPath, sm);
console.log(`kategorije: ${built} page(s) built, sitemap updated`);
