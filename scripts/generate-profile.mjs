import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(join(root, 'data/profile.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');

const palettes = {
  light: {
    background: '#F7F4EC',
    panel: '#FCFBF7',
    ink: '#1F2328',
    muted: '#59636E',
    grid: '#D7D1C5',
    border: '#8C867B',
    green: '#116329',
    greenSoft: '#DDF3E4',
    amber: '#9A4D00',
    amberSoft: '#FDE8C4'
  },
  dark: {
    background: '#0B0F14',
    panel: '#111820',
    ink: '#F0F6FC',
    muted: '#9DA7B3',
    grid: '#27313C',
    border: '#59636E',
    green: '#3FB950',
    greenSoft: '#132A1C',
    amber: '#E3A22B',
    amberSoft: '#34250B'
  }
};

const xml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function grid(width, height, color, xStep = 80, yStep = 60) {
  const lines = [];
  for (let x = xStep; x < width; x += xStep) {
    lines.push(`<path d="M${x} 0V${height}" stroke="${color}" stroke-width="1" opacity="0.28"/>`);
  }
  for (let y = yStep; y < height; y += yStep) {
    lines.push(`<path d="M0 ${y}H${width}" stroke="${color}" stroke-width="1" opacity="0.28"/>`);
  }
  return lines.join('\n');
}

function ticks(width, y, color) {
  const marks = [];
  for (let x = 30; x < width - 20; x += 30) {
    const height = x % 120 === 0 ? 10 : 5;
    marks.push(`<path d="M${x} ${y}v${height}" stroke="${color}" stroke-width="1"/>`);
  }
  return marks.join('\n');
}

function chip(x, y, label, palette, tone = 'neutral', fontSize = 14) {
  const width = Math.max(88, Math.round(label.length * fontSize * 0.64 + 28));
  const fill = tone === 'green' ? palette.greenSoft : tone === 'amber' ? palette.amberSoft : palette.panel;
  const stroke = tone === 'green' ? palette.green : tone === 'amber' ? palette.amber : palette.border;
  const color = tone === 'green' ? palette.green : tone === 'amber' ? palette.amber : palette.ink;
  return {
    width,
    markup: `<g transform="translate(${x} ${y})">
      <rect width="${width}" height="32" fill="${fill}" stroke="${stroke}"/>
      <text x="14" y="21" fill="${color}" font-size="${fontSize}" font-weight="700" letter-spacing="0.7">${xml(label)}</text>
    </g>`
  };
}

function svgShell({ width, height, title, description, body, palette, axis = 'x', travel = 0 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${xml(title)}</title>
  <desc id="desc">${xml(description)}</desc>
  <style>
    @keyframes signal-travel {
      0%, 12% { transform: translate${axis.toUpperCase()}(0); opacity: 0; }
      20% { opacity: 1; }
      72% { transform: translate${axis.toUpperCase()}(${travel}px); opacity: 1; }
      86%, 100% { transform: translate${axis.toUpperCase()}(${travel}px); opacity: 0; }
    }
    @keyframes gate-breathe {
      0%, 100% { opacity: 0.72; }
      50% { opacity: 1; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .signal-pulse { animation: signal-travel 5.2s cubic-bezier(.4,0,.2,1) infinite; }
      .policy-gate { animation: gate-breathe 2.6s ease-in-out infinite; }
    }
  </style>
  <rect width="${width}" height="${height}" fill="${palette.background}"/>
  ${body}
</svg>\n`;
}

function heroDesktop(theme) {
  const p = palettes[theme];
  const [lineOne, lineTwo] = data.hero.headline;
  const [summaryOne, summaryTwo, summaryThree] = data.hero.summary;
  const nodes = [770, 870, 970, 1070];
  const labels = ['INPUT', 'OBSERVE', 'VERIFY', 'SHIP'];
  let chipX = 52;
  const chips = data.hero.disciplines.map((label, index) => {
    const result = chip(chipX, 390, label, p, index === 1 ? 'green' : 'neutral', 13);
    chipX += result.width + 12;
    return result.markup;
  }).join('\n');

  const body = `${grid(1200, 480, p.grid)}
  <rect x="14" y="14" width="1172" height="452" fill="none" stroke="${p.border}"/>
  ${ticks(1200, 14, p.border)}
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
    <text x="52" y="56" fill="${p.muted}" font-size="14" font-weight="700" letter-spacing="1.8">${xml(data.hero.eyebrow)}</text>
    <path d="M52 76H1148" stroke="${p.border}" stroke-width="1"/>
    <text x="52" y="123" fill="${p.ink}" font-size="18" font-weight="700" letter-spacing="3">${xml(data.hero.name)}</text>
    <text x="52" y="194" fill="${p.ink}" font-size="48" font-weight="800" letter-spacing="-1.8">${xml(lineOne)}</text>
    <text x="52" y="250" fill="${p.green}" font-size="48" font-weight="800" letter-spacing="-1.8">${xml(lineTwo)}</text>
    <text x="52" y="305" fill="${p.ink}" font-size="17">${xml(summaryOne)}</text>
    <text x="52" y="333" fill="${p.muted}" font-size="17">${xml(summaryTwo)}</text>
    <text x="52" y="361" fill="${p.muted}" font-size="17">${xml(summaryThree)}</text>
    ${chips}

    <path d="M718 96V434" stroke="${p.border}" stroke-dasharray="4 7"/>
    <text x="758" y="119" fill="${p.green}" font-size="14" font-weight="700" letter-spacing="1.8">SIGNAL ACQUIRED</text>
    <text x="1148" y="119" fill="${p.muted}" font-size="12" text-anchor="end">TRACE / ACTIVE</text>
    <path d="M${nodes[0]} 178H${nodes[3]}" stroke="${p.border}" stroke-width="2"/>
    ${nodes.map((x, index) => `<circle cx="${x}" cy="178" r="9" fill="${index === 2 ? p.greenSoft : p.panel}" stroke="${index === 2 ? p.green : p.border}" stroke-width="2"/>`).join('\n')}
    <circle class="signal-pulse" cx="${nodes[0]}" cy="178" r="5" fill="${p.green}"/>
    ${nodes.map((x, index) => `<text x="${x}" y="215" fill="${index === 2 ? p.green : p.ink}" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="0.8">${labels[index]}</text>`).join('\n')}

    <path class="policy-gate" d="M${nodes[2]} 187V271H1114" fill="none" stroke="${p.amber}" stroke-width="2" stroke-dasharray="6 5"/>
    <rect x="948" y="257" width="200" height="42" fill="${p.amberSoft}" stroke="${p.amber}"/>
    <text x="1048" y="283" fill="${p.amber}" font-size="13" font-weight="800" text-anchor="middle" letter-spacing="1.2">REGRESSION / BLOCKED</text>

    <text x="758" y="337" fill="${p.muted}" font-size="12" letter-spacing="1.4">POLICY GATE / EVIDENCE ATTACHED</text>
    <text x="758" y="371" fill="${p.green}" font-size="14" font-weight="700">[PASS]</text>
    <text x="824" y="371" fill="${p.ink}" font-size="14">schema contract</text>
    <text x="758" y="399" fill="${p.green}" font-size="14" font-weight="700">[PASS]</text>
    <text x="824" y="399" fill="${p.ink}" font-size="14">latency + cost budget</text>
    <text x="758" y="427" fill="${p.amber}" font-size="14" font-weight="700">[STOP]</text>
    <text x="824" y="427" fill="${p.ink}" font-size="14">baseline delta</text>
  </g>`;

  return svgShell({
    width: 1200,
    height: 480,
    title: 'Felmon Fekadu engineering flight recorder',
    description: 'I build software that leaves evidence. A trace flows from input through observation and verification to shipping, while a regression is blocked by a policy gate.',
    body,
    palette: p,
    axis: 'x',
    travel: nodes[3] - nodes[0]
  });
}

function heroMobile(theme) {
  const p = palettes[theme];
  const [lineOne, lineTwo] = data.hero.headline;
  const nodes = [34, 132, 230, 326];
  const labels = ['INPUT', 'OBSERVE', 'VERIFY', 'SHIP'];

  const body = `${grid(360, 620, p.grid, 45, 45)}
  <rect x="6" y="6" width="348" height="608" fill="none" stroke="${p.border}"/>
  ${ticks(360, 6, p.border)}
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
    <text x="24" y="33" fill="${p.muted}" font-size="10" font-weight="700" letter-spacing="0.7">FLIGHT RECORDER / FELMONON / 2026.08</text>
    <path d="M24 49H336" stroke="${p.border}"/>
    <text x="24" y="76" fill="${p.ink}" font-size="11" font-weight="700" letter-spacing="1.4">${xml(data.hero.name)}</text>
    <text x="24" y="112" fill="${p.ink}" font-size="24" font-weight="800" letter-spacing="-0.9">${xml(lineOne)}</text>
    <text x="24" y="142" fill="${p.green}" font-size="24" font-weight="800" letter-spacing="-0.9">${xml(lineTwo)}</text>
    <text x="24" y="181" fill="${p.ink}" font-size="13">Developer tools + AI reliability</text>
    <text x="24" y="203" fill="${p.muted}" font-size="13">systems that expose hidden behavior,</text>
    <text x="24" y="225" fill="${p.muted}" font-size="13">enforce deterministic gates, and make</text>
    <text x="24" y="247" fill="${p.muted}" font-size="13">regressions impossible to ignore.</text>
    <text x="24" y="281" fill="${p.green}" font-size="10" font-weight="700" letter-spacing="0.7">DEVTOOLS / AGENT RELIABILITY / PRODUCT ENGINEERING</text>

    <path d="M24 306H336" stroke="${p.border}" stroke-dasharray="3 5"/>
    <text x="24" y="333" fill="${p.green}" font-size="10" font-weight="700" letter-spacing="0.9">SIGNAL ACQUIRED</text>
    <text x="336" y="333" fill="${p.muted}" font-size="10" text-anchor="end">TRACE / ACTIVE</text>
    <path d="M${nodes[0]} 385H${nodes[3]}" stroke="${p.border}" stroke-width="2"/>
    ${nodes.map((x, index) => `<circle cx="${x}" cy="385" r="6" fill="${index === 2 ? p.greenSoft : p.panel}" stroke="${index === 2 ? p.green : p.border}" stroke-width="2"/>`).join('\n')}
    <circle class="signal-pulse" cx="${nodes[0]}" cy="385" r="3.5" fill="${p.green}"/>
    ${nodes.map((x, index) => `<text x="${x}" y="416" fill="${index === 2 ? p.green : p.ink}" font-size="10" font-weight="700" text-anchor="middle">${labels[index]}</text>`).join('\n')}

    <path class="policy-gate" d="M${nodes[2]} 392V466H336" fill="none" stroke="${p.amber}" stroke-width="2" stroke-dasharray="4 4"/>
    <rect x="205" y="451" width="131" height="32" fill="${p.amberSoft}" stroke="${p.amber}"/>
    <text x="270.5" y="471" fill="${p.amber}" font-size="10" font-weight="800" text-anchor="middle" letter-spacing="0.4">REGRESSION / BLOCKED</text>

    <text x="24" y="522" fill="${p.muted}" font-size="10" letter-spacing="0.7">POLICY GATE / EVIDENCE ATTACHED</text>
    <text x="24" y="555" fill="${p.green}" font-size="11" font-weight="700">[PASS]</text>
    <text x="73" y="555" fill="${p.ink}" font-size="11">schema · budget · grounding</text>
    <text x="24" y="585" fill="${p.amber}" font-size="11" font-weight="700">[STOP]</text>
    <text x="73" y="585" fill="${p.ink}" font-size="11">baseline delta</text>
  </g>`;

  return svgShell({
    width: 360,
    height: 620,
    title: 'Felmon Fekadu engineering flight recorder',
    description: 'I build software that leaves evidence. A mobile flight-recorder diagram shows a signal moving through input, observation, verification, and shipping while a policy gate blocks a regression.',
    body,
    palette: p,
    axis: 'x',
    travel: nodes[3] - nodes[0]
  });
}

function traceDesktop(theme) {
  const p = palettes[theme];
  const positions = [84, 290, 496, 702, 908, 1114];
  const railY = 143;
  const body = `${grid(1200, 320, p.grid)}
  <rect x="14" y="14" width="1172" height="292" fill="none" stroke="${p.border}"/>
  ${ticks(1200, 14, p.border)}
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
    <text x="52" y="58" fill="${p.ink}" font-size="16" font-weight="800" letter-spacing="1.5">ONE RECORDED TRACE</text>
    <text x="1148" y="58" fill="${p.muted}" font-size="12" text-anchor="end">00:00—00:05 / REPRODUCIBLE</text>
    <path d="M${positions[0]} ${railY}H${positions.at(-1)}" stroke="${p.border}" stroke-width="2"/>
    <circle class="signal-pulse" cx="${positions[0]}" cy="${railY}" r="5" fill="${p.green}"/>
    ${data.trace.map((step, index) => {
      const color = step.state === 'block' ? p.amber : step.state === 'pass' ? p.green : p.border;
      const fill = step.state === 'block' ? p.amberSoft : step.state === 'pass' ? p.greenSoft : p.panel;
      return `<g>
        <text x="${positions[index]}" y="101" fill="${p.muted}" font-size="12" text-anchor="middle">${xml(step.time)}</text>
        <circle cx="${positions[index]}" cy="${railY}" r="10" fill="${fill}" stroke="${color}" stroke-width="2"/>
        <text x="${positions[index]}" y="190" fill="${color}" font-size="13" font-weight="800" text-anchor="middle" letter-spacing="0.8">${xml(step.stage)}</text>
        <text x="${positions[index]}" y="222" fill="${p.ink}" font-size="12" text-anchor="middle">${xml(step.detail)}</text>
      </g>`;
    }).join('\n')}
    <path class="policy-gate" d="M${positions[4]} ${railY + 11}V254" stroke="${p.amber}" stroke-width="2" stroke-dasharray="5 5"/>
    <text x="${positions[4]}" y="280" fill="${p.amber}" font-size="12" font-weight="700" text-anchor="middle">POLICY GATE FIRED</text>
    <text x="52" y="280" fill="${p.muted}" font-size="12">A TRACE EXPLAINS WHY THE SYSTEM WILL KEEP WORKING.</text>
  </g>`;

  return svgShell({
    width: 1200,
    height: 320,
    title: 'One recorded AI agent trace',
    description: 'A six-step timeline imports ambiguous behavior, verifies it, compares it to a baseline, blocks a regression, and emits a reproducible report.',
    body,
    palette: p,
    axis: 'x',
    travel: positions.at(-1) - positions[0]
  });
}

function traceMobile(theme) {
  const p = palettes[theme];
  const startY = 120;
  const gap = 86;
  const endY = startY + gap * (data.trace.length - 1);
  const body = `${grid(360, 640, p.grid, 45, 45)}
  <rect x="6" y="6" width="348" height="628" fill="none" stroke="${p.border}"/>
  ${ticks(360, 6, p.border)}
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
    <text x="24" y="34" fill="${p.ink}" font-size="14" font-weight="800" letter-spacing="0.8">ONE RECORDED TRACE</text>
    <text x="24" y="58" fill="${p.muted}" font-size="10">00:00—00:05 / REPRODUCIBLE</text>
    <path d="M76 ${startY}V${endY}" stroke="${p.border}" stroke-width="2"/>
    <circle class="signal-pulse" cx="76" cy="${startY}" r="4" fill="${p.green}"/>
    ${data.trace.map((step, index) => {
      const y = startY + gap * index;
      const color = step.state === 'block' ? p.amber : step.state === 'pass' ? p.green : p.border;
      const fill = step.state === 'block' ? p.amberSoft : step.state === 'pass' ? p.greenSoft : p.panel;
      return `<g>
        <text x="24" y="${y + 4}" fill="${p.muted}" font-size="10">${xml(step.time)}</text>
        <circle cx="76" cy="${y}" r="7" fill="${fill}" stroke="${color}" stroke-width="2"/>
        <text x="105" y="${y - 3}" fill="${color}" font-size="14" font-weight="800" letter-spacing="0.5">${xml(step.stage)}</text>
        <text x="105" y="${y + 21}" fill="${p.ink}" font-size="12">${xml(step.detail)}</text>
      </g>`;
    }).join('\n')}
    <path class="policy-gate" d="M84 ${startY + gap * 4}H336" stroke="${p.amber}" stroke-width="2" stroke-dasharray="4 4"/>
    <text x="336" y="${startY + gap * 4 - 12}" fill="${p.amber}" font-size="10" font-weight="700" text-anchor="end">POLICY GATE FIRED</text>
    <path d="M24 586H336" stroke="${p.border}" stroke-dasharray="3 5"/>
    <text x="24" y="615" fill="${p.muted}" font-size="10">EVIDENCE ATTACHED / REPRODUCIBLE</text>
  </g>`;

  return svgShell({
    width: 360,
    height: 640,
    title: 'One recorded AI agent trace',
    description: 'A vertical six-step mobile timeline imports ambiguous behavior, verifies it, compares it to a baseline, blocks a regression, and emits a reproducible report.',
    body,
    palette: p,
    axis: 'y',
    travel: endY - startY
  });
}

const outputs = new Map();
for (const theme of ['light', 'dark']) {
  outputs.set(`hero-${theme}.svg`, heroDesktop(theme));
  outputs.set(`hero-${theme}-mobile.svg`, heroMobile(theme));
  outputs.set(`trace-${theme}.svg`, traceDesktop(theme));
  outputs.set(`trace-${theme}-mobile.svg`, traceMobile(theme));
}

if (!checkOnly) await mkdir(join(root, 'assets'), { recursive: true });
const drift = [];
for (const [name, content] of outputs) {
  const target = join(root, 'assets', name);
  if (checkOnly) {
    let existing = '';
    try {
      existing = await readFile(target, 'utf8');
    } catch {
      drift.push(name);
      continue;
    }
    if (existing !== content) drift.push(name);
  } else {
    await writeFile(target, content);
    console.log(`generated assets/${name}`);
  }
}

if (drift.length) {
  console.error(`Generated assets are stale or missing: ${drift.join(', ')}`);
  process.exit(1);
}

if (checkOnly) console.log('Generated assets match data/profile.json.');
