import { access, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = await readFile(join(root, 'README.md'), 'utf8');
const profile = JSON.parse(await readFile(join(root, 'data/profile.json'), 'utf8'));
const proofSnapshot = JSON.parse(await readFile(join(root, 'data/proof-snapshot.json'), 'utf8'));
const visibleReadmeText = readme
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/[`*_]/g, '')
  .replace(/\s+/g, ' ');
const errors = [];

const assetRefs = [...readme.matchAll(/(?:src|srcset)="([^"#?]+\.svg)"/g)].map((match) => match[1]);
const uniqueAssets = [...new Set(assetRefs)];

if (uniqueAssets.length !== 8) {
  errors.push(`README should reference 8 responsive theme assets; found ${uniqueAssets.length}.`);
}

for (const ref of uniqueAssets) {
  if (/^https?:\/\//i.test(ref)) {
    errors.push(`Remote image dependency is not allowed: ${ref}`);
    continue;
  }

  const normalized = ref.replace(/^\.\//, '');
  const fullPath = join(root, normalized);
  try {
    await access(fullPath);
  } catch {
    errors.push(`Missing asset: ${ref}`);
    continue;
  }

  const svg = await readFile(fullPath, 'utf8');
  const metadata = await stat(fullPath);
  if (metadata.size > 80_000) errors.push(`${ref} exceeds the 80 KB asset budget.`);
  if (!/<svg\b[^>]*\bwidth="\d+"[^>]*\bheight="\d+"[^>]*\bviewBox="[^"]+"/i.test(svg)) errors.push(`${ref} needs numeric intrinsic dimensions and a viewBox.`);
  if (!/<svg\b[^>]*\brole="img"/i.test(svg)) errors.push(`${ref} has no image role.`);
  if (!/<title\b/i.test(svg) || !/<desc\b/i.test(svg)) errors.push(`${ref} needs title and desc elements.`);
  if (/<(?:script|foreignObject|iframe|image|use)\b/i.test(svg)) errors.push(`${ref} contains an unsafe, externalizable, or fragile SVG element.`);
  if (/(?:href|xlink:href|url\()\s*["']?https?:\/\//i.test(svg)) errors.push(`${ref} contains an external SVG dependency.`);
  if (ref.includes('-mobile')) {
    const fontSizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((match) => Number(match[1]));
    if (!fontSizes.length || Math.min(...fontSizes) < 10) errors.push(`${ref} uses text smaller than the 10-unit mobile floor.`);
  }
}

const imgTags = [...readme.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
if (imgTags.length !== 2) errors.push(`README should contain exactly 2 fallback img tags; found ${imgTags.length}.`);
for (const tag of imgTags) {
  const alt = tag.match(/\balt="([^"]*)"/i)?.[1]?.trim();
  const width = tag.match(/\bwidth="(\d+)"/i)?.[1];
  if (!alt) errors.push('Every informative image needs non-empty alt text.');
  if (!width || Number(width) < 700) errors.push('Every fallback image needs a large numeric width so GitHub can scale it responsively.');
}

if (/<(?:script|style|iframe)\b/i.test(readme)) errors.push('README contains HTML that GitHub sanitizes aggressively.');
if (/!\[[^\]]*\]\(https?:\/\//i.test(readme)) errors.push('README contains a third-party remote Markdown image.');

for (const project of profile.projects) {
  if (!readme.includes(project.url)) errors.push(`Project URL missing from README: ${project.url}`);
  for (const value of [project.failureMode, project.name, project.evidence]) {
    if (!visibleReadmeText.includes(value)) errors.push(`Project data drifted from README: ${value}`);
  }
}
for (const item of profile.proof) {
  if (!readme.includes(item.url)) errors.push(`Proof URL missing from README: ${item.url}`);
  for (const value of [item.record, item.label]) {
    if (!visibleReadmeText.includes(value)) errors.push(`Proof data drifted from README: ${value}`);
  }
}

if (!readme.includes('./data/proof-snapshot.json')) errors.push('README does not link its dated proof snapshot.');
if (profile.verifiedAt !== proofSnapshot.verifiedAt || !visibleReadmeText.includes(profile.verifiedAt)) {
  errors.push('Verification dates disagree between profile data, proof snapshot, and README.');
}
const summary = proofSnapshot.summary;
const expectedSnapshotClaims = [
  `${summary.upstreamMerges} merged pull requests across ${summary.upstreamRepositories} repositories / ${summary.upstreamOrganizations} organizations`,
  `${summary.mswInspectorOutsideHumanContributors} outside human contributors in msw-inspector`,
  `msw-inspector-cli v${summary.mswInspectorNpmVersion}`,
  `agent-reliability-harness v${summary.agentReliabilityHarnessPypiVersion}`
];
for (const claim of expectedSnapshotClaims) {
  if (!visibleReadmeText.includes(claim)) errors.push(`Proof snapshot drifted from README: ${claim}`);
}

const requiredPhrases = [
  'I build software that leaves evidence.',
  'Evidence over adjectives.',
  'Have a failure mode you cannot see yet?'
];
for (const phrase of requiredPhrases) {
  if (!readme.includes(phrase)) errors.push(`Required profile thesis is missing: ${phrase}`);
}

if (errors.length) {
  console.error('Profile integrity check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Profile integrity check passed: ${uniqueAssets.length} assets, ${profile.projects.length} instruments, ${profile.proof.length} proof records.`);
