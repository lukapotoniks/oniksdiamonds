#!/usr/bin/env node
/**
 * build-analytics.js — Oniks Diamonds & Gems
 *
 * Ubacuje u <head> svake stranice:
 *   1. traku za pristanak na kolačiće (krem/zlatna, u duhu sajta)
 *   2. Google Analytics, ali SAMO ako je posetilac prihvatio
 *
 * Ako posetilac odbije, ne postavlja se nijedan kolačić i GA se ne učitava.
 * Izbor se pamti u pregledaču, pa se traka pojavljuje jednom.
 *
 * Pokreće se POSLE build-blog.js i build-kategorije.js.
 * Ako menjaš Analytics property, menja se samo GA_ID red ispod.
 */

const fs = require('fs');
const path = require('path');

const GA_ID = 'G-TT58LZBQX3';
const ROOT = process.cwd();

// Folderi koji se preskaču — /admin/ je Decap panel, njega ne merimo.
const SKIP = new Set([
  'admin',
  'content',
  'images',
  'videos',
  'node_modules',
  '.git',
  '.netlify',
]);

// Oznaka po kojoj skript prepoznaje da je stranica već obrađena.
const MARKER = 'oniks-kolacici';

const SNIPPET = `<!-- Oniks: kolačići + Google Analytics -->
<style>
  #${MARKER} {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 9999;
    display: none; gap: 1.25rem; align-items: center; justify-content: center;
    flex-wrap: wrap;
    padding: 1rem 1.5rem;
    background: #FBF8F2;
    border-top: 1px solid #E4DCCB;
    box-shadow: 0 -2px 20px rgba(0,0,0,.06);
    font-family: inherit; font-size: .85rem; line-height: 1.5; color: #3A342C;
  }
  #${MARKER} p { margin: 0; max-width: 46rem; }
  #${MARKER} .oniks-dugmad { display: flex; gap: .6rem; flex-shrink: 0; }
  #${MARKER} button {
    font: inherit; font-size: .78rem; letter-spacing: .06em; text-transform: uppercase;
    padding: .6rem 1.4rem; border-radius: 2px; cursor: pointer;
    border: 1px solid #B99A55; background: #B99A55; color: #fff;
    transition: opacity .2s;
  }
  #${MARKER} button:hover { opacity: .85; }
  #${MARKER} button.oniks-odbij { background: transparent; color: #7A6F5C; border-color: #D8CEBB; }
  @media (max-width: 640px) {
    #${MARKER} { flex-direction: column; align-items: flex-start; gap: .9rem; }
    #${MARKER} .oniks-dugmad { width: 100%; }
    #${MARKER} button { flex: 1; }
  }
</style>
<script>
(function () {
  var GA_ID = '${GA_ID}';
  var KLJUC = '${MARKER}';

  var TEKST = {
    sr: {
      poruka: 'Koristimo kolačiće da bismo razumeli kako se sajt koristi i tako ga učinili boljim. Bez vaše saglasnosti ne postavljamo nijedan.',
      da: 'Prihvatam',
      ne: 'Odbijam'
    },
    hu: {
      poruka: 'Sütiket használunk, hogy megértsük az oldal használatát és jobbá tegyük. Az Ön hozzájárulása nélkül egyet sem helyezünk el.',
      da: 'Elfogadom',
      ne: 'Elutasítom'
    },
    en: {
      poruka: 'We use cookies to understand how the site is used and make it better. We set none without your consent.',
      da: 'Accept',
      ne: 'Decline'
    }
  };

  var izbor = null;
  try { izbor = localStorage.getItem(KLJUC); } catch (e) {}

  function ucitajGA() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  if (izbor === 'da') { ucitajGA(); return; }
  if (izbor === 'ne') { return; }

  function prikaziTraku() {
    var jezik = (document.documentElement.lang || 'sr').slice(0, 2).toLowerCase();
    var t = TEKST[jezik] || TEKST.sr;

    var traka = document.createElement('div');
    traka.id = KLJUC;
    traka.setAttribute('role', 'dialog');
    traka.innerHTML =
      '<p></p><div class="oniks-dugmad">' +
      '<button class="oniks-odbij" type="button"></button>' +
      '<button class="oniks-prihvati" type="button"></button>' +
      '</div>';

    traka.querySelector('p').textContent = t.poruka;
    traka.querySelector('.oniks-odbij').textContent = t.ne;
    traka.querySelector('.oniks-prihvati').textContent = t.da;

    function zapamti(vrednost) {
      try { localStorage.setItem(KLJUC, vrednost); } catch (e) {}
      traka.remove();
      if (vrednost === 'da') ucitajGA();
    }

    traka.querySelector('.oniks-prihvati').addEventListener('click', function () { zapamti('da'); });
    traka.querySelector('.oniks-odbij').addEventListener('click', function () { zapamti('ne'); });

    document.body.appendChild(traka);
    traka.style.display = 'flex';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prikaziTraku);
  } else {
    prikaziTraku();
  }
})();
</script>
`;

/** Skuplja putanje do svih index.html fajlova. */
function findHtml(dir) {
  const out = [];
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;

    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...findHtml(abs));
    } else if (entry.name === 'index.html') {
      out.push(abs);
    }
  }

  return out;
}

// --- glavni deo ---------------------------------------------------------

const files = findHtml(ROOT);
let ubaceno = 0;
let preskoceno = 0;

for (const file of files) {
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

  html = html.replace('</head>', SNIPPET + '</head>');
  fs.writeFileSync(file, html, 'utf8');
  ubaceno++;
}

console.log(
  'Analytics + kolačići (' + GA_ID + ') — ubačeno u ' + ubaceno + ' stranica, preskočeno ' + preskoceno + '.'
);
