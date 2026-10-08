// Turns index.html into the shape a claude.ai artifact expects: no <html>/<head>/<body>,
// fonts from Google Fonts (the artifact sandbox only allows that font host).
// Usage: node tools/artifact.mjs > artifact.html
import fs from 'node:fs';

let s = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
s = s.replace(/<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*/gi, '')
  .replace(/<meta name="(mobile-web-app-capable|apple-mobile-web-app-[a-z-]+)"[^>]*>\s*/gi, '')
  .replace(/<link rel="preload" href="fonts\/[^>]*>\s*/gi, '')
  .replace(/\/\* fonts:start[\s\S]*?\/\* fonts:end \*\/\n/, '')
  .replace(/<\/head>\s*<body>\s*/i, '\n')
  .replace(/<\/body>\s*<\/html>\s*$/i, '\n');
s = s.replace('<style>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800;900&display=swap">\n<style>');
process.stdout.write(s);
