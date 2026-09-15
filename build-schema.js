#!/usr/bin/env node
/**
 * build-schema.js — Oniks Diamonds & Gems
 *
 * Ubacuje strukturirane podatke (JSON-LD) koje Google čita:
 *   - naslovna dobija podatke o zlatari (adresa, telefon, radno vreme)
 *   - blog postovi dobijaju oznaku članka sa datumom
 *
 * Rezultat: u rezultatima pretrage se umesto golog linka prikazuje
 * bogatiji zapis, a radnja može da uđe u lokalne rezultate i mapu.
 *
 * Podaci o radnji se menjaju samo u bloku RADNJA ispod.
 */

const fs = require('fs');
const path = require('path');

const SITE = 'https://oniksdiamonds.com';
const ROOT = process.cwd();
const MARKER = 'oniks-schema';

const SKIP = new Set([
  'admin',
  'content',
  'images',
  'videos',
  'node_modules',
  '.git',
  '.netlify',
]);

// --- RADNJA — jedino mesto koje se menja --------------------------------

const RADNJA = {
  '@context': 'https://schema.org',
  '@type': 'JewelryStore',
  '@id': SITE + '/#radnja',
  name: 'Oniks Diamonds & Gems',
  alternateName: 'Zlatara Oniks',
  description:
    'Dijamanti i fino drago kamenje. Vereničko prstenje, minđuše, ogrlice i izrada nakita po meri. Subotica, od 1994.',
  url: SITE,
  logo: SITE + '/images/logo.png',
  image: SITE + '/images/logo.png',
  telephone: '+381 24 553870',
  foundingDate: '1994',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Dimitrija Tucovića 5',
    addressLocality: 'Subotica',
    postalCode: '24000',
    addressCountry: 'RS',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '19:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '09:00',
      closes: '13:00',
    },
  ],
  sameAs: ['https://www.instagram.com/zlatara.oniks/'],
};

// -----------------------------------------------------------------------

const MESECI_SR = {
  JANUAR: '01', FEBRUAR: '02', MART: '03', APRIL: '04', MAJ: '05', JUN: '06',
  JUL: '07', AVGUST: '08', SEPTEMBAR: '09', OKTOBAR: '10', NOVEMBAR: '11', DECEMBAR: '12',
};

const MESECI_HU = {
  JANUÁR: '01', FEBRUÁR: '02', MÁRCIUS: '03', ÁPRILIS: '04', MÁJUS: '05', JÚNIUS: '06',
  JÚLIUS: '07', AUGUSZTUS: '08', SZEPTEMBER: '09', OKTÓBER: '10', NOVEMBER: '11', DECEMBER: '12',
};

/** Iz teksta stranice izvlači datum objave, ako uspe. Inače vraća null. */
function nadjiDatum(html, jeJeMadjarski) {
  if (jeJeMadjarski) {
    // oblik: 2026. SZEPTEMBER 14.
    const m = html.match(/(\d{4})\.\s*([A-ZÁÉÍÓÖŐÚÜŰ]+)\s*(\d{1,2})\./);
    if (m && MESECI_HU[m[2]]) {
      return m[1] + '-' + MESECI_HU[m[2]] + '-' + String(m[3]).padStart(2, '0');
    }
    return null;
  }

  // oblik: 14. SEPTEMBAR 2026.
  const m = html.match(/(\d{1,2})\.\s*([A-ZŠĐČĆŽ]+)\s*(\d{4})\./);
  if (m && MESECI_SR[m[2]]) {
    return m[3] + '-' + MESECI_SR[m[2]] + '-' + String(m[1]).padStart(2, '0');
  }
  return null;
}

/** Vadi sadržaj meta oznake ili naslova iz HTML-a. */
function meta(html, naziv) {
  const re = new RegExp(
    '<meta[^>]+(?:name|property)="' + naziv + '"[^>]+content="([^"]*)"',
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function naslov(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].replace(/&amp;/g, '&').trim() : null;
}

function findPages(dir, rel = '') {
  const out = [];
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    if (!entry.isDirectory()) continue;

    const abs = path.join(dir, entry.name);
    const relPath = rel + entry.name + '/';

    if (fs.existsSync(path.join(abs, 'index.html'))) out.push(relPath);
    out.push(...findPages(abs, relPath));
  }

  return out;
}

/** Odlučuje koji podatak ide na koju stranicu. */
function schemaZa(urlPath, html) {
  if (urlPath === '/') return RADNJA;

  // blog post = /blog/nesto/ ili /blog/hu/nesto/, ali ne sami indeksi
  const jePost =
    /^\/blog\/(hu\/)?[^/]+\/$/.test(urlPath) && urlPath !== '/blog/' && urlPath !== '/blog/hu/';

  if (!jePost) return null;

  const jeMadjarski = urlPath.startsWith('/blog/hu/');
  const t = naslov(html);
  const opis = meta(html, 'description');
  const datum = nadjiDatum(html, jeMadjarski);

  if (!t) return null;

  const clanak = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: t.split('—')[0].trim().slice(0, 110),
    url: SITE + urlPath,
    mainEntityOfPage: SITE + urlPath,
    inLanguage: jeMadjarski ? 'hu' : 'sr',
    publisher: {
      '@type': 'Organization',
      name: 'Oniks Diamonds & Gems',
      logo: { '@type': 'ImageObject', url: SITE + '/images/logo.png' },
    },
    author: { '@type': 'Organization', name: 'Oniks Diamonds & Gems' },
  };

  if (opis) clanak.description = opis;
  if (datum) {
    clanak.datePublished = datum;
    clanak.dateModified = datum;
  }

  return clanak;
}

// --- glavni deo ---------------------------------------------------------

const paths = ['/'].concat(findPages(ROOT).map((p) => '/' + p));
let ubaceno = 0;
let preskoceno = 0;

for (const urlPath of paths) {
  const file =
    urlPath === '/'
      ? path.join(ROOT, 'index.html')
      : path.join(ROOT, urlPath.slice(1), 'index.html');

  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch (err) {
    continue;
  }

  if (html.includes(MARKER) || !html.includes('</head>')) {
    preskoceno++;
    continue;
  }

  const podaci = schemaZa(urlPath, html);
  if (!podaci) {
    preskoceno++;
    continue;
  }

  const blok =
    '<script type="application/ld+json" data-' + MARKER + '>\n' +
    JSON.stringify(podaci, null, 2) +
    '\n</script>\n';

  html = html.replace('</head>', blok + '</head>');
  fs.writeFileSync(file, html, 'utf8');
  ubaceno++;
}

console.log('Strukturirani podaci — ubačeno u ' + ubaceno + ' stranica, preskočeno ' + preskoceno + '.');
