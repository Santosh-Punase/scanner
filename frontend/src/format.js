/** Format helpers for the UI. */

export function fmtNum(n, d = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-IN', {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
}

export function fmtInt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN');
}

/** Compact human volume: 1.2M, 4.5K, 2.1B */
export function fmtCompact(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e7) return (n / 1e7).toFixed(2) + 'Cr'; // Indian crore
  if (abs >= 1e5) return (n / 1e5).toFixed(2) + 'L';  // Indian lakh
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return String(n);
}

export function toCsv(rows, columns) {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => escape(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escape(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(','))
    .join('\n');
  return head + '\n' + body;
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
