#!/usr/bin/env node
// Renders a Matrix-themed "activity log" SVG from GitHub's public REST API,
// so the profile README doesn't depend on third-party badge services.

const USERNAME = "ibrahimyankac";
const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": USERNAME,
};
if (token) headers.Authorization = `token ${token}`;

async function githubJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${url} failed: ${res.status}`);
  return res.json();
}

async function main() {
  const user = await githubJson(`https://api.github.com/users/${USERNAME}`);

  let repos = [];
  for (let page = 1; ; page++) {
    const batch = await githubJson(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&type=owner`
    );
    repos = repos.concat(batch);
    if (batch.length < 100) break;
  }

  const ownRepos = repos.filter((r) => !r.fork);
  const totalStars = ownRepos.reduce((sum, r) => sum + r.stargazers_count, 0);

  const langCounts = {};
  for (const r of ownRepos) {
    if (!r.language) continue;
    langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  }
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([lang]) => lang);

  const stats = [
    ["PUBLIC REPOS", String(user.public_repos)],
    ["TOTAL STARS", String(totalStars)],
    ["FOLLOWERS", String(user.followers)],
    ["TOP LANGUAGES", topLanguages.length ? topLanguages.join(" / ") : "N/A"],
  ];

  process.stdout.write(renderSvg(stats));
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderSvg(stats) {
  const rowHeight = 64;
  const top = 88;

  const rows = stats
    .map(([label, value], i) => {
      const y = top + i * rowHeight;
      const zebra = i % 2 === 0 ? "#001400" : "#020602";
      const zebraOpacity = i % 2 === 0 ? ' fill-opacity=".42"' : "";
      const barColor = i % 2 === 0 ? "#00FF41" : "#0A641C";
      return `
    <g>
      <rect x="20" y="${y}" width="760" height="${rowHeight - 4}" fill="${zebra}"${zebraOpacity}/>
      <rect x="20" y="${y}" width="3" height="${rowHeight - 4}" fill="${barColor}"/>
      <text x="32" y="${y + 39}" fill="#D7FFD7" font-size="19" font-weight="700" letter-spacing=".4">${esc(label)}</text>
      <text x="748" y="${y + 39}" text-anchor="end" fill="#70FF70" font-size="20" font-weight="700">${esc(value)}</text>
    </g>`;
    })
    .join("");

  const height = top + stats.length * rowHeight + 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}" role="img" aria-labelledby="activity-title activity-desc">
  <title id="activity-title">İbrahim Yankaç's GitHub activity log</title>
  <desc id="activity-desc">Public repository count, total stars, followers, and top languages, generated from the GitHub REST API.</desc>
  <style>
    text { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
    .cursor { animation: blink 1.05s steps(1, end) infinite; }
    @keyframes blink { 0%, 46% { opacity: 1; } 47%, 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .cursor { animation: none; opacity: 1; }
    }
  </style>
  <rect width="800" height="${height}" fill="#000000"/>
  <rect x="14.5" y="20.5" width="771" height="${height - 41}" rx="3" fill="#020602" stroke="#063B12"/>
  <path d="M15 ${top - 17.5}H785" stroke="#063B12"/>
  <g>
    <rect x="28" y="42" width="8" height="8" fill="#00FF41"/>
    <text x="48" y="53" fill="#70FF70" font-size="26" font-weight="700" letter-spacing="3">ACTIVITY LOG</text>
    <text x="28" y="87" fill="#00FF41" font-size="18">&gt; scan --activity --user=${esc(USERNAME)}<tspan class="cursor">_</tspan></text>
  </g>
  ${rows}
  <text x="772" y="${height - 16}" text-anchor="end" fill="#0A641C" font-size="12">SOURCE: api.github.com // LIVE</text>
</svg>
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
