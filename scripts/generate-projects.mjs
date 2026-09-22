#!/usr/bin/env node
// Renders a Matrix-themed "featured projects" panel SVG from GitHub's
// public REST API, so the profile README doesn't need plain markdown/badges.

const USERNAME = "ibrahimyankac";
const REPOS = [
  "karpilot-showcase",
  "transfer-learning-pneumonia-detection",
  "Ninja-Platform-Game",
  "Pacman-Game",
];

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

function truncate(s, max) {
  if (!s) return "no description";
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function main() {
  const projects = await Promise.all(
    REPOS.map(async (repo) => {
      const r = await githubJson(`https://api.github.com/repos/${USERNAME}/${repo}`);
      return {
        name: r.name,
        description: truncate(r.description, 62),
        language: r.language || "—",
        stars: r.stargazers_count,
      };
    })
  );

  process.stdout.write(renderSvg(projects));
}

function renderSvg(projects) {
  const rowHeight = 84;
  const top = 88;

  const rows = projects
    .map((p, i) => {
      const y = top + i * rowHeight;
      const zebra = i % 2 === 0 ? "#001400" : "#020602";
      const zebraOpacity = i % 2 === 0 ? ' fill-opacity=".42"' : "";
      const barColor = i % 2 === 0 ? "#00FF41" : "#0A641C";
      return `
    <g>
      <rect x="20" y="${y}" width="760" height="${rowHeight - 4}" fill="${zebra}"${zebraOpacity}/>
      <rect x="20" y="${y}" width="3" height="${rowHeight - 4}" fill="${barColor}"/>
      <text x="32" y="${y + 30}" fill="#D7FFD7" font-size="19" font-weight="700" letter-spacing=".3">${esc(p.name)}</text>
      <text x="748" y="${y + 30}" text-anchor="end" fill="#70FF70" font-size="15" font-weight="700">${esc(p.language)} &#9733; ${p.stars}</text>
      <text x="32" y="${y + 55}" fill="#4FAF61" font-size="15">${esc(p.description)}</text>
    </g>`;
    })
    .join("");

  const height = top + projects.length * rowHeight + 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}" role="img" aria-labelledby="projects-title projects-desc">
  <title id="projects-title">İbrahim Yankaç's featured projects</title>
  <desc id="projects-desc">${esc(projects.map((p) => `${p.name}: ${p.description}`).join(". "))}</desc>
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
    <text x="48" y="53" fill="#70FF70" font-size="26" font-weight="700" letter-spacing="3">FEATURED PROJECTS</text>
    <text x="28" y="87" fill="#00FF41" font-size="18">&gt; ls ~/projects --sort=stars<tspan class="cursor">_</tspan></text>
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
