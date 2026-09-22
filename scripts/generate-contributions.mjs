#!/usr/bin/env node
// Renders a static, always-visible Matrix-themed contribution heatmap
// from GitHub's own public contribution graph fragment (no token needed),
// so the squares reflect real per-day contribution levels instead of an
// animation that hides most of the grid at any single moment.

const USERNAME = "ibrahimyankac";

async function main() {
  const res = await fetch(`https://github.com/users/${USERNAME}/contributions`, {
    headers: { "User-Agent": USERNAME },
  });
  if (!res.ok) throw new Error(`GitHub contributions page failed: ${res.status}`);
  const html = await res.text();

  const totalMatch = html.match(/([0-9,]+)\s+contributions?\s+in the last year/i);
  const total = totalMatch ? totalMatch[1] : "?";

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const cellRe = /<td[^>]*data-date="([^"]+)"[^>]*data-level="([0-9])"[^>]*>/g;

  const rows = [];
  let rowMatch;
  while ((rowMatch = rowRe.exec(html))) {
    const cells = [];
    let cellMatch;
    cellRe.lastIndex = 0;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      cells.push({ date: cellMatch[1], level: Number(cellMatch[2]) });
    }
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) throw new Error("No contribution rows parsed");

  process.stdout.write(renderSvg(rows, total));
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const LEVEL_COLORS = ["#020602", "#063B12", "#0A641C", "#00FF41", "#70FF70"];

function renderSvg(rows, total) {
  const cell = 10;
  const gap = 3;
  const weeks = Math.max(...rows.map((r) => r.length));
  const gridWidth = weeks * (cell + gap) - gap;
  const gridHeight = rows.length * (cell + gap) - gap;

  const padX = 24;
  const top = 96;
  const gridX = padX;
  const gridY = top;

  const squares = rows
    .map((row, r) =>
      row
        .map((day, c) => {
          const x = gridX + c * (cell + gap);
          const y = gridY + r * (cell + gap);
          const color = LEVEL_COLORS[day.level] ?? LEVEL_COLORS[0];
          return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${color}" stroke="#0A641C" stroke-opacity="0.35"><title>${esc(day.date)}</title></rect>`;
        })
        .join("")
    )
    .join("");

  const totalY = gridY + gridHeight + 30;
  const legendY = totalY + 30;
  const legendStartX = gridX + 30;
  const legendSwatches = LEVEL_COLORS.map((color, i) => {
    const x = legendStartX + i * (cell + gap);
    return `<rect x="${x}" y="${legendY - 10}" width="${cell}" height="${cell}" rx="2" fill="${color}" stroke="#0A641C" stroke-opacity="0.35"/>`;
  }).join("");

  const width = gridX + gridWidth + padX;
  const height = legendY + 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="contrib-title contrib-desc">
  <title id="contrib-title">İbrahim Yankaç's GitHub contribution graph</title>
  <desc id="contrib-desc">${esc(total)} contributions in the last year, rendered as a Matrix-themed heatmap from GitHub's public contribution calendar.</desc>
  <style>
    text { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
    .cursor { animation: blink 1.05s steps(1, end) infinite; }
    @keyframes blink { 0%, 46% { opacity: 1; } 47%, 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .cursor { animation: none; opacity: 1; }
    }
  </style>
  <rect width="${width}" height="${height}" fill="#000000"/>
  <rect x="14.5" y="20.5" width="${width - 29}" height="${height - 41}" rx="3" fill="#020602" stroke="#063B12"/>
  <path d="M15 ${top - 25.5}H${width - 15}" stroke="#063B12"/>
  <g>
    <rect x="28" y="42" width="8" height="8" fill="#00FF41"/>
    <text x="48" y="53" fill="#70FF70" font-size="26" font-weight="700" letter-spacing="3">CONTRIBUTIONS</text>
    <text x="28" y="87" fill="#00FF41" font-size="18">&gt; cat contributions.log --user=${esc(USERNAME)}<tspan class="cursor">_</tspan></text>
  </g>
  ${squares}
  <text x="${gridX}" y="${totalY}" fill="#4FAF61" font-size="14">${esc(total)} contributions in the last year</text>
  <text x="${gridX}" y="${legendY}" fill="#0A641C" font-size="12">Less</text>
  ${legendSwatches}
  <text x="${legendStartX + LEVEL_COLORS.length * (cell + gap) + 6}" y="${legendY}" fill="#0A641C" font-size="12">More</text>
  <text x="${width - 20}" y="${height - 16}" text-anchor="end" fill="#0A641C" font-size="12">SOURCE: github.com/${esc(USERNAME)} // LIVE</text>
</svg>
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
