import test from "node:test";
import assert from "node:assert/strict";
import { summarize, header, stats, THEMES } from "./skin.mjs";

const user = { login: "octo", name: "A & B <x>", bio: "Builds\n  things", location: "Earth", public_repos: 4, followers: 1250, created_at: "2019-05-01T00:00:00Z" };
const repos = [
  { fork: false, language: "Go", stargazers_count: 5 },
  { fork: false, language: "Go", stargazers_count: 2 },
  { fork: false, language: "Rust", stargazers_count: 1 },
  { fork: false, language: null, stargazers_count: 0 },
  { fork: true, language: "C", stargazers_count: 99 },
];

test("summarize skips forks and ranks languages", () => {
  const d = summarize(user, repos);
  assert.equal(d.bio, "Builds things");
  assert.deepEqual(d.stats, [["Repos", 4], ["Stars", 8], ["Followers", 1250], ["Joined", "2019"]]);
  assert.deepEqual(d.languages.map((l) => l.name), ["Go", "Rust"]);
  assert.equal(d.languages[0].pct, 2 / 3);
});

test("every theme renders escaped SVG", () => {
  const d = summarize(user, repos);
  for (const t of Object.values(THEMES)) {
    for (const svg of [header(d, t), stats(d, t)]) {
      assert.ok(svg.startsWith("<svg") && svg.trimEnd().endsWith("</svg>"));
      assert.ok(!svg.includes("<x>") && !svg.includes("A & B"), "user text must be escaped");
    }
  }
  assert.ok(header(d, THEMES.dracula).includes("A &amp; B &lt;x&gt;"));
  assert.ok(stats(d, THEMES.light).includes(">1.3k<"));
});

test("empty profile still renders", () => {
  const d = summarize({ login: "new", public_repos: 0, followers: 0, created_at: "2024-01-01T00:00:00Z" }, []);
  assert.ok(header(d, THEMES.neon).includes("Hi, I&#39;m @new"));
  assert.ok(stats(d, THEMES.neon).includes("No public code yet"));
});
