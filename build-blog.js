// Oniks Diamonds & Gems — blog builder
// Reads content/blog/*.md (written by the admin panel) and generates:
//   blog/index.html            list of all posts
//   blog/<slug>/index.html     one page per post
//   blog/posts.json            used by the homepage "Iz bloga" section
//   sitemap.xml                homepage + blog pages
// Runs automatically on Netlify (see netlify.toml). No dependencies.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'content', 'blog');
const OUT = path.join(ROOT, 'blog');
const SITE = 'https://oniksdiamonds.com';

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parseFrontmatter(txt) {
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: txt };
  const data = {};
  m[1].split(/\r?\n/).forEach(line => {
    const i = line.indexOf(':');
    if (i < 0) return;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    data[k] = v;
  });
  return { data, body: m[2] };
}

function inline(s) {
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

function markdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let para = [], list = null;
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.type}>` + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + `</${list.type}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushPara(); flushList(); const l = m[1].length + 1; out.push(`<h${l}>${inline(m[2])}</h${l}>`); continue; }
    if ((m = line.match(/^[-*]\s+(.*)$/))) { flushPara(); if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); out.push('<blockquote><p>' + inline(m[1]) + '</p></blockquote>'); continue; }
    if (list) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('\n');
}

const MONTHS = ['januar','februar','mart','april','maj','jun','jul','avgust','septembar','oktobar','novembar','decembar'];
function fmtDate(iso) { const d = new Date(iso); if (isNaN(d)) return ''; return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}.`; }
function absImg(p) { if (!p) return ''; return p.startsWith('http') ? p : '/' + p.replace(/^\/+/, ''); }

// ---------- templates ----------
const CSS = `
  :root{--cream:#FBF8F2;--white:#FFFFFF;--gold:#C6A664;--gold-deep:#8F7238;--gold-pale:#F1E7D0;--espresso:#1E1A16;--espresso-soft:#6B6255;--line:#E6DAC0;--serif:'Bodoni Moda',serif;--sans:'Jost',sans-serif;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--cream);color:var(--espresso);font-family:var(--sans);font-weight:300;line-height:1.7;-webkit-font-smoothing:antialiased;}
  img{max-width:100%;display:block;} a{color:inherit;text-decoration:none;}
  .wrap{max-width:1240px;margin:0 auto;padding:0 6vw;}
  header{padding:28px 6vw;display:flex;align-items:center;justify-content:space-between;gap:20px;}
  .brand{display:flex;align-items:center;gap:10px;} .brand img{height:24px;width:auto;}
  .brand-text{font-size:0.82rem;letter-spacing:0.24em;line-height:1;} .brand-text sup{font-size:0.52em;letter-spacing:0;margin-left:2px;vertical-align:super;opacity:.75;}
  nav{display:flex;gap:30px;font-size:0.72rem;letter-spacing:0.16em;color:var(--espresso-soft);flex-wrap:wrap;justify-content:flex-end;}
  nav a.on{color:var(--espresso);border-bottom:1px solid var(--gold);padding-bottom:3px;}
  .eyebrow{font-size:0.66rem;letter-spacing:0.22em;color:var(--gold-deep);text-transform:uppercase;}
  h1{font-family:var(--serif);font-weight:400;font-size:clamp(1.9rem,4.4vw,3rem);line-height:1.15;margin-top:14px;}
  .lead{color:var(--espresso-soft);font-size:1.05rem;margin-top:18px;max-width:640px;}
  /* list */
  .blog-head{padding:8vh 0 5vh;max-width:680px;}
  .posts{display:grid;grid-template-columns:1fr;gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:10vh;}
  @media(min-width:760px){.posts{grid-template-columns:repeat(2,1fr);}} @media(min-width:1080px){.posts{grid-template-columns:repeat(3,1fr);}}
  .post-card{background:var(--white);display:flex;flex-direction:column;}
  .post-card .ph{aspect-ratio:4/3;overflow:hidden;background:#F3F0EA;} .post-card .ph img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s ease;}
  .post-card:hover .ph img{transform:scale(1.03);}
  .post-card .tx{padding:26px 28px 30px;display:flex;flex-direction:column;gap:10px;flex:1;}
  .post-card .dt{font-size:0.64rem;letter-spacing:0.16em;color:var(--gold-deep);}
  .post-card h2{font-family:var(--serif);font-weight:400;font-size:1.3rem;line-height:1.25;}
  .post-card p{font-size:0.88rem;color:var(--espresso-soft);} .post-card .more{margin-top:auto;font-size:0.68rem;letter-spacing:0.16em;color:var(--espresso);padding-top:12px;}
  /* article */
  article{max-width:720px;margin:0 auto;padding:6vh 0 10vh;}
  article .hero{margin:32px 0 40px;aspect-ratio:16/9;overflow:hidden;background:#F3F0EA;} article .hero img{width:100%;height:100%;object-fit:cover;}
  article .meta{font-size:0.66rem;letter-spacing:0.16em;color:var(--gold-deep);margin-top:16px;}
  .body{font-size:1.02rem;} .body p{margin:0 0 1.3em;} .body h2{font-family:var(--serif);font-weight:400;font-size:1.65rem;margin:2.2em 0 .7em;line-height:1.2;}
  .body h3{font-family:var(--serif);font-weight:400;font-size:1.25rem;margin:1.8em 0 .5em;} .body ul,.body ol{margin:0 0 1.3em 1.3em;} .body li{margin-bottom:.4em;}
  .body a{border-bottom:1px solid var(--gold);color:var(--espresso);} .body strong{font-weight:500;} .body img{margin:1.6em 0;} .body blockquote{border-left:2px solid var(--gold);padding-left:18px;color:var(--espresso-soft);font-style:italic;margin:0 0 1.3em;}
  .cta{margin-top:56px;padding:34px 30px;background:var(--white);border:1px solid var(--line);text-align:center;}
  .cta h3{font-family:var(--serif);font-weight:400;font-size:1.4rem;margin-bottom:10px;} .cta p{color:var(--espresso-soft);font-size:0.9rem;max-width:480px;margin:0 auto 20px;}
  .btn{display:inline-block;padding:14px 26px;background:var(--espresso);color:var(--cream);font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;}
  .btn.ghost{background:none;color:var(--espresso);border:1px solid var(--line);margin-left:8px;}
  .back{display:inline-block;margin-top:40px;font-size:0.68rem;letter-spacing:0.16em;color:var(--espresso-soft);}
  footer{padding:40px 6vw;border-top:1px solid var(--line);font-size:0.68rem;color:var(--espresso-soft);display:flex;flex-wrap:wrap;gap:12px 28px;justify-content:space-between;}
`;

function page({ title, desc, canonical, ogImage, body, active, jsonld }) {
  return `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
${ogImage ? `<meta property="og:image" content="${SITE}${ogImage}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<header>
  <a class="brand" href="/"><img src="/images/logo.png" alt="Oniks amblem"><span class="brand-text">ONIKS DIAMONDS &amp; GEMS<sup>™</sup></span></a>
  <nav>
    <a href="/#kategorije">KOLEKCIJE</a>
    <a href="/#kamenje">DRAGO KAMENJE</a>
    <a href="/blog/" class="${active === 'blog' ? 'on' : ''}">BLOG</a>
    <a href="/#poseta">KONTAKT</a>
  </nav>
</header>
${body}
<footer>
  <span>© ${new Date().getFullYear()} Oniks Diamonds &amp; Gems · Dimitrija Tucovića 5, Subotica</span>
  <span>Isključivo prirodno kamenje</span>
</footer>
</body>
</html>`;
}

// ---------- build ----------
fs.mkdirSync(OUT, { recursive: true });
const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(f => f.endsWith('.md')) : [];
const posts = files.map(f => {
  const { data, body } = parseFrontmatter(fs.readFileSync(path.join(SRC, f), 'utf8'));
  const slug = f.replace(/\.md$/, '');
  return {
    slug, naslov: data.naslov || slug, datum: data.datum || '', slika: data.slika || '',
    uvod: data.uvod || '', meta_opis: data.meta_opis || data.uvod || '', html: markdown(body)
  };
}).filter(p => p.naslov).sort((a, b) => new Date(b.datum) - new Date(a.datum));

// post pages
for (const p of posts) {
  const url = `${SITE}/blog/${p.slug}/`;
  const body = `
<article>
  <span class="eyebrow">Blog</span>
  <h1>${esc(p.naslov)}</h1>
  <div class="meta">${esc(fmtDate(p.datum)).toUpperCase()}</div>
  ${p.slika ? `<div class="hero"><img src="${absImg(p.slika)}" alt="${esc(p.naslov)}"></div>` : ''}
  <div class="body">${p.html}</div>
  <div class="cta">
    <h3>Napravite svoj prsten</h3>
    <p>Izaberite kamen, oblik brušenja i boju zlata i pogledajte kako bi izgledao. Ili nam se javite — izrada po meri traje oko mesec dana.</p>
    <a class="btn" href="/#kamenje">Napravi svoj prsten</a><a class="btn ghost" href="/#poseta">Kontakt</a>
  </div>
  <a class="back" href="/blog/">← SVI TEKSTOVI</a>
</article>`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.naslov, description: p.meta_opis,
    datePublished: p.datum, image: p.slika ? SITE + absImg(p.slika) : undefined, mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Oniks Diamonds & Gems' },
    publisher: { '@type': 'Organization', name: 'Oniks Diamonds & Gems', logo: { '@type': 'ImageObject', url: SITE + '/images/logo.png' } }
  };
  fs.mkdirSync(path.join(OUT, p.slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, p.slug, 'index.html'),
    page({ title: `${p.naslov} — Oniks Diamonds & Gems`, desc: p.meta_opis, canonical: url, ogImage: absImg(p.slika), body, active: 'blog', jsonld }));
}

// list page
const listBody = `
<div class="wrap">
  <div class="blog-head">
    <span class="eyebrow">Blog</span>
    <h1>Saveti i vodiči o dijamantima i dragom kamenju</h1>
    <p class="lead">Kako se bira kamen, šta znače ocene na sertifikatu, koje zlato kome pristaje — sve što je dobro znati pre kupovine, iz zlatare koja to radi od 1994.</p>
  </div>
  <div class="posts">
    ${posts.map(p => `
    <a class="post-card" href="/blog/${p.slug}/">
      <div class="ph">${p.slika ? `<img src="${absImg(p.slika)}" alt="${esc(p.naslov)}" loading="lazy">` : ''}</div>
      <div class="tx">
        <span class="dt">${esc(fmtDate(p.datum)).toUpperCase()}</span>
        <h2>${esc(p.naslov)}</h2>
        <p>${esc(p.uvod)}</p>
        <span class="more">PROČITAJ →</span>
      </div>
    </a>`).join('')}
    ${posts.length === 0 ? '<div class="post-card"><div class="tx"><p>Uskoro.</p></div></div>' : ''}
  </div>
</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'),
  page({ title: 'Blog — Oniks Diamonds & Gems', desc: 'Saveti i vodiči o dijamantima, dragom kamenju, vereničkom prstenju i nakitu po meri. Zlatara Oniks, Subotica.', canonical: `${SITE}/blog/`, ogImage: '', body: listBody, active: 'blog' }));

// posts.json for the homepage
fs.writeFileSync(path.join(OUT, 'posts.json'), JSON.stringify({
  posts: posts.slice(0, 6).map(p => ({ slug: p.slug, naslov: p.naslov, datum: p.datum, slika: p.slika, uvod: p.uvod }))
}, null, 2));

// sitemap
const today = new Date().toISOString().slice(0, 10);
const urls = [{ loc: SITE + '/', lastmod: today, pri: '1.0' }, { loc: SITE + '/blog/', lastmod: today, pri: '0.7' }]
  .concat(posts.map(p => ({ loc: `${SITE}/blog/${p.slug}/`, lastmod: (p.datum || today).slice(0, 10), pri: '0.6' })));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority></url>`).join('\n') + `\n</urlset>\n`);

console.log(`blog: ${posts.length} post(s) built`);
