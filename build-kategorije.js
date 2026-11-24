// Oniks Diamonds & Gems — category page builder
// Reads content/proizvodi.json + content/kolekcije.json (written by the admin panel)
// and generates one page per jewellery type:
//   verenicko-prstenje/index.html
//   prstenje/index.html
//   mindjuse/index.html
//   ogrlice-i-privesci/index.html
//   narukvice/index.html
//   lab-grown-dijamanti/index.html  (products marked "Laboratorijski" in the admin — shown ONLY here)
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

// Lab grown — own page; these products never appear on the natural pages above
const LAB = { key: 'lab', slug: 'lab-grown-dijamanti', name: 'Lab grown dijamanti', label: 'LAB GROWN',
  lead: 'Nakit sa dijamantima nastalim u laboratoriji. Svaki komad na ovoj stranici je jasno označen kao laboratorijski.',
  meta: 'Nakit sa laboratorijskim (lab grown) dijamantima u zlatu, jasno označen. Oniks Diamonds & Gems, Subotica.' };

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
const isLab = p => p.dijamant === 'lab';
const natural = prods.filter(p => !isLab(p));
const labProds = prods.filter(p => isLab(p) && p.naziv);

// ---------- styles + header lifted from index.html ----------
const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const homeCss = (home.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
const fonts = (home.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [''])[0];

// header + mobile panel from the homepage, links made absolute, language switcher kept
let header = (home.match(/<header id="siteHeader">[\s\S]*?<\/header>\s*<div class="mobile-panel"[\s\S]*?<\/div><!-- \/mobile-panel -->\n/) || [''])[0];
header = header
  .replace(/href="#([a-z]+)"/g, 'href="/#$1"')
  .replace(/href="blog\/"/g, 'href="/blog/"')
  .replace(/href="([a-z-]+)\/"/g, 'href="/$1/"')
  .replace(/src="images\//g, 'src="/images/')
  .replace('<header id="siteHeader">', '<header id="siteHeader" class="on-light">');
{
  const present = [];
  natural.forEach(p => { const s = slug(p.kolekcija); if (s && !present.includes(s)) present.push(s); });
  { const ord = s => { const i = cols.findIndex(c => slug(c.naziv) === s); return i < 0 ? 999 : i; }; present.sort((a, b) => ord(a) - ord(b)); }
  const nm = s => { const c = cols.find(x => slug(x.naziv) === s); return (c ? c.naziv : natural.find(p => slug(p.kolekcija) === s).kolekcija).trim(); };
  const links = present.map(s => `<a href="/#kolekcija-${s}">${esc(nm(s))}</a>`).join('\n          ') + '\n          <a href="/#kategorije">Sve kolekcije</a>';
  header = header.replace(/(<span class="drop-menu" id="colMenu">)[\s\S]*?(<\/span>)/, `$1\n          ${links}\n        $2`);
}

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
  .cat-strip a.lab{color:var(--gold-deep);}
  .lab-tag{display:inline-block; margin:2px 0 8px; padding:4px 9px; border:1px solid var(--gold); font-size:0.62rem; letter-spacing:0.16em; color:var(--gold-deep); background:var(--white);}
  .lab-info{max-width:680px; margin:0 auto 7vh; padding:26px 28px; background:var(--white); border:1px solid var(--line);}
  .lab-info h2{font-family:var(--serif); font-weight:400; font-size:1.35rem; line-height:1.3;}
  .lab-info p{margin-top:12px; color:var(--espresso-soft); font-size:0.95rem; line-height:1.7;}
  .lab-info a{color:var(--gold-deep); border-bottom:1px solid var(--gold); padding-bottom:1px;}
`;

// ---------- dostupnost (polje "Dostupnost" u adminu; prazno = na stanju) ----------
const STANJE = { 'na-stanju': 'Na stanju', 'po-porudzbini': 'Izrada po porudžbini · oko mesec dana' };
const stanjeOf = p => p.stanje === 'po-porudzbini' ? 'po-porudzbini' : 'na-stanju';

// ---------- product card (same markup as the homepage grid) ----------
function card(p) {
  const stanje = stanjeOf(p);
  const imgs = p.slike.map(absImg);
  const metaBits = [isLab(p) ? 'LAB GROWN DIJAMANT' : '', p.kolekcija ? 'KOLEKCIJA ' + p.kolekcija.toUpperCase() : '', (p.materijal || '').toUpperCase(), (p.kamenje || '').toUpperCase(), p.cena || ''].filter(Boolean);
  const slides = imgs.map(s => `<img loading="lazy" decoding="async" src="${esc(s)}" alt="${esc(p.naziv)}">`).join('');
  const dots = imgs.length > 1 ? `<div class="dots">${imgs.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>` : '';
  return `<div class="prod" data-col="${esc(slug(p.kolekcija))}" data-cat="${esc(p.vrsta.join(' '))}" data-imgs="${esc(imgs.join('|'))}" data-name="${esc(p.naziv)}" data-meta="${esc(metaBits.join(' · '))}" data-stanje="${stanje}">
  <div class="ph"><div class="slider">${slides}</div>${dots}${imgs.length > 1 ? '<button class="nav-arrow prev" aria-label="Prethodna">&#10094;</button><button class="nav-arrow next" aria-label="Sledeća">&#10095;</button>' : ''}</div>
  ${isLab(p) ? '<div class="lab-tag">LAB GROWN DIJAMANT</div>' : ''}
  <div class="nm">${esc(p.naziv)}</div>
  <div class="mt">${esc([p.kolekcija, p.materijal].filter(Boolean).join(' · ').toUpperCase())}</div>
  ${p.kamenje ? `<div class="sp">${esc(p.kamenje)}</div>` : ''}
  <div class="pr">${esc(p.cena || 'Cena na upit')}</div>
  <div class="st${stanje === 'po-porudzbini' ? ' order' : ''}">${esc(STANJE[stanje])}</div>
  <div class="instore">Kupovina isključivo u radnji</div>
</div>`;
}


// ---------- jezik (preuzet sa naslovne) ----------
const I18N_SRC = (home.match(/const I18N = (\{[\s\S]*?\});\n/) || ['', '{}'])[1];
const DOP = {
  en: {
    "Dijamantski verenički prstenovi u 14K zlatu — solitaire, halo i klaster modeli. Svaki kamen je prirodan i dolazi sa sertifikatom.": "Diamond engagement rings in 14K gold — solitaire, halo and cluster designs. Every stone is natural and comes with a certificate.",
    "Prstenje sa dijamantima i dragim kamenjem — za svakodnevno nošenje i za posebne prilike.": "Rings with diamonds and gemstones — for everyday wear and for special occasions.",
    "Minđuše sa dijamantima — od sitnih komada za svaki dan do onih koje se pamte.": "Earrings with diamonds — from small everyday pieces to ones that are remembered.",
    "Privesci i ogrlice sa dijamantima, sa lančićem, u belom i žutom zlatu.": "Pendants and necklaces with diamonds, chain included, in white and yellow gold.",
    "Narukvice sa dijamantima i dragim kamenjem u 14K zlatu.": "Bracelets with diamonds and gemstones in 14K gold.",
    "komad u ponudi": "piece available", "komada u ponudi": "pieces available",
    "Trenutno nema komada iz ove kategorije na sajtu. Izrađujemo ih po meri — javite nam se ili svratite u radnju.": "There are currently no pieces from this category on the site. We make them to order — get in touch or visit the shop.",
    "Ne vidite baš ono što tražite?": "Not quite what you were looking for?",
    "Bilo koji kamen, bilo koji oblik brušenja, vaš ili naš dizajn. Izrada po meri traje oko mesec dana od dogovora.": "Any stone, any cut, your design or ours. Made-to-order pieces take around a month from the agreement.",
    "Napravite svoj prsten": "Design your ring",
    "Ostale vrste nakita": "Other types of jewellery",
    "Vrste nakita": "Jewellery types",
    "Lab grown dijamanti": "Lab-grown diamonds", "LAB GROWN": "LAB-GROWN", "LAB GROWN DIJAMANT": "LAB-GROWN DIAMOND", "Kolekcije": "Collections", "Sve kolekcije": "All collections",
    "Nakit sa dijamantima nastalim u laboratoriji. Svaki komad na ovoj stranici je jasno označen kao laboratorijski.": "Jewellery with laboratory-grown diamonds. Every piece on this page is clearly labelled as lab-grown.",
    "Šta je lab grown dijamant?": "What is a lab-grown diamond?",
    "Dijamant koji je nastao u laboratoriji, a ne u zemlji. Hemijski sastav, tvrdoća i sjaj su isti kao kod prirodnog dijamanta, i razlika se ne vidi golim okom — utvrđuje se samo gemološkom opremom. Razlika je u poreklu, a time i u ceni.": "A diamond formed in a laboratory rather than in the earth. Its chemical composition, hardness and brilliance are the same as a natural diamond's, and the difference cannot be seen with the naked eye — only gemological equipment can tell them apart. The difference is in origin, and therefore in price.",
    "Zato su lab grown komadi kod nas uvek odvojeni od prirodnog nakita i jasno označeni. Više o razlici:": "That is why our lab-grown pieces are always kept separate from natural jewellery and clearly labelled. More on the difference:",
    "Lab grown komadi uskoro na sajtu. Za ponudu nas pozovite ili svratite u radnju.": "Lab-grown pieces coming to the site soon. Call us or visit the shop for what's available.",
    "Nakit sa prirodnim dijamantima": "Jewellery with natural diamonds"
  },
  hu: {
    "Dijamantski verenički prstenovi u 14K zlatu — solitaire, halo i klaster modeli. Svaki kamen je prirodan i dolazi sa sertifikatom.": "Gyémánt eljegyzési gyűrűk 14K aranyban — szoliter, halo és klaszter modellek. Minden kő természetes, és tanúsítvánnyal érkezik.",
    "Prstenje sa dijamantima i dragim kamenjem — za svakodnevno nošenje i za posebne prilike.": "Gyűrűk gyémánttal és drágakővel — mindennapi viseletre és különleges alkalmakra.",
    "Minđuše sa dijamantima — od sitnih komada za svaki dan do onih koje se pamte.": "Fülbevalók gyémánttal — az apró, mindennapi daraboktól az emlékezetesekig.",
    "Privesci i ogrlice sa dijamantima, sa lančićem, u belom i žutom zlatu.": "Medálok és nyakláncok gyémánttal, lánccal együtt, fehér és sárga aranyban.",
    "Narukvice sa dijamantima i dragim kamenjem u 14K zlatu.": "Karkötők gyémánttal és drágakővel 14K aranyban.",
    "komad u ponudi": "darab elérhető", "komada u ponudi": "darab elérhető",
    "Trenutno nema komada iz ove kategorije na sajtu. Izrađujemo ih po meri — javite nam se ili svratite u radnju.": "Ebből a kategóriából jelenleg nincs darab az oldalon. Egyedileg készítjük — keressen minket, vagy látogasson el az üzletbe.",
    "Ne vidite baš ono što tražite?": "Nem egészen azt látja, amit keres?",
    "Bilo koji kamen, bilo koji oblik brušenja, vaš ili naš dizajn. Izrada po meri traje oko mesec dana od dogovora.": "Bármilyen kő, bármilyen csiszolás, az Ön vagy a mi tervünk. Az egyedi készítés a megegyezéstől számítva körülbelül egy hónap.",
    "Napravite svoj prsten": "Tervezze meg a gyűrűjét",
    "Ostale vrste nakita": "Más ékszertípusok",
    "Vrste nakita": "Ékszertípusok",
    "Lab grown dijamanti": "Laborban növesztett gyémántok", "LAB GROWN": "LABORGYÉMÁNT", "LAB GROWN DIJAMANT": "LABORBAN NÖVESZTETT GYÉMÁNT", "Kolekcije": "Kollekciók", "Sve kolekcije": "Összes kollekció",
    "Nakit sa dijamantima nastalim u laboratoriji. Svaki komad na ovoj stranici je jasno označen kao laboratorijski.": "Ékszerek laborban növesztett gyémánttal. Ezen az oldalon minden darab egyértelműen laborgyémántként van jelölve.",
    "Šta je lab grown dijamant?": "Mi a laborban növesztett gyémánt?",
    "Dijamant koji je nastao u laboratoriji, a ne u zemlji. Hemijski sastav, tvrdoća i sjaj su isti kao kod prirodnog dijamanta, i razlika se ne vidi golim okom — utvrđuje se samo gemološkom opremom. Razlika je u poreklu, a time i u ceni.": "Olyan gyémánt, amely laboratóriumban keletkezett, nem a földben. Kémiai összetétele, keménysége és ragyogása ugyanaz, mint a természetes gyémánté, a különbség szabad szemmel nem látható — csak gemológiai műszerekkel állapítható meg. A különbség az eredetben, és így az árban van.",
    "Zato su lab grown komadi kod nas uvek odvojeni od prirodnog nakita i jasno označeni. Više o razlici:": "Ezért nálunk a laborgyémántos darabok mindig külön vannak a természetes ékszerektől, és egyértelműen jelölve. Bővebben a különbségről:",
    "Lab grown komadi uskoro na sajtu. Za ponudu nas pozovite ili svratite u radnju.": "Laborgyémántos darabok hamarosan az oldalon. A kínálatért hívjon minket vagy látogasson el az üzletbe.",
    "Nakit sa prirodnim dijamantima": "Ékszerek természetes gyémánttal"
  }
};
const LANG_JS = `
  const I18N = ${I18N_SRC};
  const DOP = ${JSON.stringify(DOP)};
  for (const j of Object.keys(DOP)) Object.assign(I18N[j] = I18N[j] || {}, DOP[j]);
  let LANG = 'sr';
  const ORIG = new WeakMap();
  function walkText(node, fn){
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, { acceptNode(n){
      const p = n.parentNode; if (!p) return NodeFilter.FILTER_REJECT;
      const t = p.nodeName; if (t === 'SCRIPT' || t === 'STYLE') return NodeFilter.FILTER_REJECT;
      return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }});
    let n; while ((n = w.nextNode())) fn(n);
  }
  function applyLang(lang, root){
    root = root || document.body;
    const map = I18N[lang];
    walkText(root, n => {
      if (!ORIG.has(n)) ORIG.set(n, n.nodeValue);
      const src = ORIG.get(n); const key = src.trim(); if (!key) return;
      if (!map){ n.nodeValue = src; return; }
      const hit = map[key]; if (hit) n.nodeValue = src.replace(key, hit);
    });
    document.documentElement.lang = lang || 'sr';
    try { localStorage.setItem('oniks_lang', lang || 'sr'); } catch(e){}
  }
  function setLang(lang){
    LANG = lang;
    applyLang(lang === 'sr' ? null : lang);
    document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  }
  ['langBar','langBarM'].forEach(id => {
    const bar = document.getElementById(id);
    if (bar) bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      setLang(b.dataset.l);
    });
  });
  try { const saved = localStorage.getItem('oniks_lang'); if (saved && saved !== 'sr') setLang(saved); } catch(e){}
`;

const TILE_IMG = { verenicko: '/images/verenicko-cover.jpg', prstenje: '/images/sapphire-hand.jpg', mindjuse: '/images/earring-model.jpg', ogrlice: '/images/cross-pendant.jpg', narukvice: '/images/baguette-hand.jpg' };

const JS = `
  const menuBtn = document.getElementById('menuBtn'), panel = document.getElementById('mobilePanel'), moreWrap = document.getElementById('moreWrap');
  const isDesktop = () => window.matchMedia('(min-width:860px)').matches;
  const setMenu = open => { panel.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { const c = document.getElementById('menuClose'); if (c) c.focus(); } };
  if (menuBtn) menuBtn.addEventListener('click', e => { e.stopPropagation(); if (isDesktop()) moreWrap.classList.toggle('open'); else setMenu(!panel.classList.contains('open')); });
  const menuClose = document.getElementById('menuClose'); if (menuClose) menuClose.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel && panel.classList.contains('open')) setMenu(false); });
  if (panel) panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => panel.classList.remove('open')));
  document.addEventListener('click', e => { if (moreWrap && !moreWrap.contains(e.target)) moreWrap.classList.remove('open'); });
  const drops = document.querySelectorAll('.has-drop');
  drops.forEach(d => { const b = d.querySelector('.drop-btn'); if (b) b.addEventListener('click', e => { e.stopPropagation(); drops.forEach(o => { if (o !== d) o.classList.remove('open'); }); d.classList.toggle('open'); }); });
  document.addEventListener('click', () => drops.forEach(d => d.classList.remove('open')));
  // collection + type filters
  let curCol = 'sve', curCat = 'sve';
  const applyF = () => document.querySelectorAll('#prodGrid .prod').forEach(p => p.classList.toggle('hide',
    !((curCol === 'sve' || p.dataset.col === curCol) && (curCat === 'sve' || (p.dataset.cat || '').split(' ').includes(curCat)))));
  const colBar = document.getElementById('colFilters');
  if (colBar) colBar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    colBar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    curCol = b.dataset.col; applyF();
  });
  const typeBar = document.getElementById('typeFilters');
  if (typeBar) typeBar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    typeBar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    curCat = b.dataset.cat; applyF();
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
        const stEl = document.getElementById('lbStanje'), stCard = p.querySelector('.st');
        if (stEl && stCard) { stEl.textContent = stCard.textContent; stEl.classList.toggle('order', p.dataset.stanje === 'po-porudzbini'); }
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
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${cat.name} — Oniks Diamonds & Gems`, url,
    mainEntity: { '@type': 'ItemList', itemListElement: items.map((p, i) => {
      const priceNum = (String(p.cena || '').match(/[\d.]+/) || [''])[0].replace(/\./g, '');
      const prod = { '@type': 'Product', name: p.naziv, image: p.slike.map(s => SITE + absImg(s)), material: p.materijal || undefined, brand: { '@type': 'Brand', name: 'Oniks Diamonds & Gems' } };
      if (priceNum) prod.offers = { '@type': 'Offer', priceCurrency: 'RSD', price: priceNum, availability: stanjeOf(p) === 'po-porudzbini' ? 'https://schema.org/MadeToOrder' : 'https://schema.org/InStoreOnly' };
      return { '@type': 'ListItem', position: i + 1, item: prod };
    }) }
  };
  const lab = cat.key === 'lab';
  const others = lab ? CATS.filter(c => natural.some(p => p.vrsta.includes(c.key))).slice(0, 4) : CATS.filter(c => c.key !== cat.key);
  const presentTypes = lab ? CATS.filter(c => items.some(p => p.vrsta.includes(c.key))) : [];
  const typeFilter = presentTypes.length > 1 ? `
    <div class="filter-row" style="margin-bottom:6vh;">
      <span class="filter-lab">VRSTA NAKITA</span>
      <div class="cat-filters" id="typeFilters" style="margin-bottom:0;">
        <button class="on" data-cat="sve">SVE</button>
        ${presentTypes.map(c => `<button data-cat="${c.key}">${esc(c.label)}</button>`).join('')}
      </div>
    </div>` : '';
  const ogImg = lab ? (items[0] && items[0].slike[0] ? (items[0].slike[0].startsWith('http') ? items[0].slike[0] : SITE + absImg(items[0].slike[0])) : SITE + TILE_IMG.verenicko) : SITE + TILE_IMG[cat.key];
  const labInfo = lab ? `
    <div class="lab-info">
      <h2>Šta je lab grown dijamant?</h2>
      <p>Dijamant koji je nastao u laboratoriji, a ne u zemlji. Hemijski sastav, tvrdoća i sjaj su isti kao kod prirodnog dijamanta, i razlika se ne vidi golim okom — utvrđuje se samo gemološkom opremom. Razlika je u poreklu, a time i u ceni.</p>
      <p>Zato su lab grown komadi kod nas uvek odvojeni od prirodnog nakita i jasno označeni. Više o razlici: <a href="/blog/prirodni-ili-laboratorijski-dijamant/">prirodni ili laboratorijski dijamant</a>.</p>
    </div>` : '';
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
<meta property="og:image" content="${ogImg}">
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
      <a href="/${LAB.slug}/" class="lab${lab ? ' on' : ''}">${esc(LAB.label)}</a>
    </nav>
    <div class="catp-head">
      <p class="eyebrow">Nakit</p>
      <h1>${esc(cat.name)}</h1>
      <p class="lead">${esc(cat.lead)}</p>
    </div>
    ${labInfo}
    ${typeFilter}
    ${filters}
    ${items.length ? `<div class="prod-grid" id="prodGrid">${items.map(card).join('\n')}</div>`
      : `<p class="empty">${lab ? 'Lab grown komadi uskoro na sajtu. Za ponudu nas pozovite ili svratite u radnju.' : 'Trenutno nema komada iz ove kategorije na sajtu. Izrađujemo ih po meri — javite nam se ili svratite u radnju.'}</p>`}
  </div>
  <div class="cat-cta">
    <h2>Ne vidite baš ono što tražite?</h2>
    <p>Bilo koji kamen, bilo koji oblik brušenja, vaš ili naš dizajn. Izrada po meri traje oko mesec dana od dogovora.</p>
    <div class="btns"><a class="btn" href="/#kamenje">Napravite svoj prsten</a><a class="btn ghost" href="/#poseta">Zakažite razgovor</a></div>
  </div>
  <div class="wrap other">
    <h2>${lab ? 'Nakit sa prirodnim dijamantima' : 'Ostale vrste nakita'}</h2>
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
  <div class="lb-info"><div class="lb-dots" id="lbDots"></div><div class="n" id="lbName"></div><div class="m" id="lbMeta"></div><div class="st" id="lbStanje"></div><div class="s">Kupovina isključivo u radnji</div></div>
</div>
<footer>
  <div class="wrap">
    <div class="footer-row">
      <a class="brand" style="color:var(--espresso);" href="/"><img class="mark" src="/images/logo.png" alt="Oniks amblem"><span class="brand-text" style="color:var(--espresso);">ONIKS DIAMONDS &amp; GEMS<sup>™</sup></span></a>
      <div class="footer-nav">
        ${CATS.map(c => `<a href="/${c.slug}/">${esc(c.name)}</a>`).join('\n        ')}
        <a href="/${LAB.slug}/">${esc(LAB.name)}</a>
        <a href="/#kategorije">Kolekcije</a>
        <a href="/#kamenje">Drago kamenje</a>
        <a href="/blog/">Blog</a>
        <a href="/#poseta">Kontakt</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} Oniks Diamonds &amp; Gems · Dimitrija Tucovića 5, Subotica</span>
      <span>+381 62 178 8052</span>
    </div>
  </div>
</footer>
<script>${JS}
${LANG_JS}</script>
</body>
</html>`;
}

// ---------- build ----------
let built = 0;
for (const cat of CATS) {
  const items = natural.filter(p => p.vrsta.includes(cat.key) && p.naziv);
  const dir = path.join(ROOT, cat.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(cat, items));
  built++;
  console.log(`kategorije: /${cat.slug}/ — ${items.length} product(s)`);
}

{
  const dir = path.join(ROOT, LAB.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(LAB, labProds));
  built++;
  console.log(`kategorije: /${LAB.slug}/ — ${labProds.length} product(s)`);
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
