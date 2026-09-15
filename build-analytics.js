#!/usr/bin/env node
/**
 * build-analytics.js — Oniks Diamonds & Gems
 *
 * Ubacuje Google Analytics kod u <head> svake stranice posle build-a.
 * Pokreće se POSLE build-blog.js i build-kategorije.js, da bi zahvatio
 * i generisane blog i kategorijske stranice.
 *
 * Ne dira izvorne fajlove u GitHub-u trajno — radi nad kopijom koju
 * Netlify pravi pri svakom deploy-u.
 *
 * Ako ikad promeniš Analytics property, menja se samo red ispod.
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

const SNIPPET =
  '<!-- Google Analytics -->\n' +
  '<script async src="https://www.googletagmanager.com/gtag/js?id=' + GA_ID + '"></script>\n' +
  '<script>\n' +
  '  window.dataLayer = window.dataLayer || [];\n' +
  '  function gtag(){dataLayer.push(arguments);}\n' +
  "  gtag('js', new Date());\n" +
  "  gtag('config', '" + GA_ID + "');\n" +
  '</script>\n';

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

  // Već ima kod — ne duplira se.
  if (html.includes(GA_ID)) {
    preskoceno++;
    continue;
  }

  // Nema zaglavlje — nije prava stranica, preskače se.
  if (!html.includes('</head>')) {
    preskoceno++;
    continue;
  }

  html = html.replace('</head>', SNIPPET + '</head>');
  fs.writeFileSync(file, html, 'utf8');
  ubaceno++;
}

console.log('Analytics (' + GA_ID + ') — ubačen u ' + ubaceno + ' stranica, preskočeno ' + preskoceno + '.');
