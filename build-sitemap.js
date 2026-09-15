#!/usr/bin/env node
/**
 * build-sitemap.js — Oniks Diamonds & Gems
 *
 * Pravi sitemap.xml na osnovu stranica koje zaista postoje posle build-a.
 * Pokreće se POSLE build-blog.js i build-kategorije.js, jer tek tada
 * postoje generisani folderi (/blog/..., /verenicko-prstenje/ itd).
 *
 * Ne čita markdown ni JSON — prolazi kroz foldere i traži index.html.
 * Zato ne treba da se dira kad dodaš novi post, proizvod ili kategoriju.
 */

const fs = require('fs');
const path = require('path');

const SITE = 'https://oniksdiamonds.com';
const ROOT = process.cwd();

// Folderi koji nisu stranice — preskaču se zajedno sa svime unutar njih.
const SKIP = new Set([
  'admin',        // Decap CMS panel — ne sme u pretragu
  'content',      // izvorni markdown i JSON
  'images',
  'videos',
  'node_modules',
  '.git',
  '.netlify',
]);

// Stranice koje postoje, ali privremeno ne treba da idu u pretragu.
// Obriši red kad stranica dobije sadržaj — vraća se sama u sitemap.
const EXCLUDE = new Set([
  '/narukvice/',   // prazna dok ne uđe prva narukvica u CMS
]);

/**
 * Rekurzivno traži svaki folder koji sadrži index.html.
 * Vraća putanje oblika "blog/", "blog/hu/", "verenicko-prstenje/".
 */
function findPages(dir, rel = '') {
  const out = [];
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;

    const abs = path.join(dir, entry.name);
    const relPath = rel + entry.name + '/';

    if (fs.existsSync(path.join(abs, 'index.html'))) {
      out.push(relPath);
    }

    out.push(...findPages(abs, relPath));
  }

  return out;
}

/**
 * Iz same stranice izvlači linkove na drugu jezičku verziju.
 * Oslanja se na dugmad SRPSKI / MAGYAR u zaglavlju bloga.
 */
function findAlternates(urlPath) {
  const file =
    urlPath === '/'
      ? path.join(ROOT, 'index.html')
      : path.join(ROOT, urlPath.slice(1), 'index.html');

  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return null;
  }

  const re = /<a[^>]*href="([^"]+)"[^>]*>\s*(SRPSKI|MAGYAR)\s*<\/a>/gi;
  const found = {};
  let match;

  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    const lang = match[2].toUpperCase() === 'MAGYAR' ? 'hu' : 'sr';
    found[lang] = href.startsWith('http') ? href : SITE + (href.startsWith('/') ? href : '/' + href);
  }

  // Par ima smisla samo ako postoje obe strane i ako se razlikuju.
  if (found.sr && found.hu && found.sr !== found.hu) return found;
  return null;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- glavni deo ---------------------------------------------------------

const paths = ['/']
  .concat(findPages(ROOT).map((p) => '/' + p))
  .filter((p) => !EXCLUDE.has(p))
  .sort();

const blocks = paths.map((p) => {
  const loc = SITE + (p === '/' ? '/' : p);
  const lines = ['  <url>', '    <loc>' + escapeXml(loc) + '</loc>'];

  // hreflang samo za blog — naslovna menja jezik u pregledaču, bez posebne adrese.
  if (p.startsWith('/blog/') || p === '/blog/') {
    const alt = findAlternates(p);
    if (alt) {
      lines.push(
        '    <xhtml:link rel="alternate" hreflang="sr" href="' + escapeXml(alt.sr) + '"/>'
      );
      lines.push(
        '    <xhtml:link rel="alternate" hreflang="hu" href="' + escapeXml(alt.hu) + '"/>'
      );
    }
  }

  lines.push('  </url>');
  return lines.join('\n');
});

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  blocks.join('\n') +
  '\n</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');

console.log('sitemap.xml — upisano ' + paths.length + ' adresa:');
paths.forEach((p) => console.log('  ' + p));
