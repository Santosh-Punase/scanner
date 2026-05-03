const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const NSE_EQUITY_LIST_URL =
  'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';

const CACHE_DIR = path.join(__dirname, '..', '..', 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'nse_equity_list.csv');
const SEED_FILE = path.join(__dirname, '..', '..', 'data', 'nse_seed.json');

// Cache TTL: 24h
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isCacheFresh() {
  if (!fs.existsSync(CACHE_FILE)) return false;
  const stat = fs.statSync(CACHE_FILE);
  return Date.now() - stat.mtimeMs < CACHE_TTL_MS;
}

async function downloadEquityListCsv() {
  // NSE blocks default user agents; mimic a browser.
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Accept: 'text/csv,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.nseindia.com/',
  };
  const res = await axios.get(NSE_EQUITY_LIST_URL, {
    headers,
    timeout: 15000,
    responseType: 'text',
  });
  ensureDir(CACHE_DIR);
  fs.writeFileSync(CACHE_FILE, res.data, 'utf8');
  return res.data;
}

function parseCsv(csvText) {
  const records = parse(csvText, {
    columns: (header) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    trim: true,
  });
  return records
    .filter((r) => r.SYMBOL && (r[' SERIES'] || r.SERIES) === 'EQ')
    .map((r) => ({
      symbol: r.SYMBOL,
      name: r['NAME OF COMPANY'] || r.NAME_OF_COMPANY || '',
      series: 'EQ',
      isin: r[' ISIN NUMBER'] || r.ISIN_NUMBER || r['ISIN NUMBER'] || '',
      yahoo: `${r.SYMBOL}.NS`,
    }));
}

function loadSeed() {
  if (!fs.existsSync(SEED_FILE)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    return raw.map((s) => ({
      symbol: s.symbol,
      name: s.name || '',
      series: 'EQ',
      isin: '',
      yahoo: `${s.symbol}.NS`,
    }));
  } catch {
    return [];
  }
}

let _cache = null;

async function getNseSymbols({ forceRefresh = false } = {}) {
  if (_cache && !forceRefresh) return _cache;

  let csvText = null;
  try {
    if (!forceRefresh && isCacheFresh()) {
      csvText = fs.readFileSync(CACHE_FILE, 'utf8');
    } else {
      csvText = await downloadEquityListCsv();
    }
    _cache = parseCsv(csvText);
  } catch (err) {
    console.warn(
      `[symbols] Failed to fetch NSE list (${err.message}); falling back to seed.`
    );
    _cache = loadSeed();
  }

  return _cache;
}

module.exports = { getNseSymbols };
