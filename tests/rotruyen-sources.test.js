const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'rotruyen-sources.js'), 'utf8');
assert.match(source, /module\\.exports = async function handler/);
assert.match(source, /noThirdPartyScrapingByDefault: true/);
assert.match(source, /id: 'mangadex'/);
assert.match(source, /id: 'truyenviet-adapters'/);
assert.match(source, /state: 'not_enabled'/);
console.log('RoTruyen provider registry static checks passed.');
