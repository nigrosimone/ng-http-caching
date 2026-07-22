/**
 * Release helper: picks the next version bump and renders the changelog out of the
 * conventional-commit history since the previous `v*` tag.
 *
 * Usage:
 *   node .github/scripts/release.mjs bump [--type auto|patch|minor|major]
 *   node .github/scripts/release.mjs notes --version <x.y.z> [--notes-out <file>] [--changelog <file>]
 *
 * Every command prints its result and, when running inside GitHub Actions, also
 * exposes it through $GITHUB_OUTPUT.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

// unit separators keep the parsing safe even when a subject contains a pipe
const RECORD = '\x1e';
const FIELD = '\x1f';

const GROUPS = [
  ['feat', '🚀 Features'],
  ['fix', '🐛 Bug Fixes'],
  ['perf', '⚡ Performance'],
  ['revert', '⏪ Reverts'],
  ['refactor', '♻️ Refactoring'],
  ['docs', '📝 Documentation'],
  ['test', '✅ Tests'],
  ['build', '📦 Build'],
  ['ci', '🤖 CI'],
  ['style', '💄 Style'],
  ['chore', '🧹 Chores'],
];

const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<breaking>!)?:\s*(?<subject>.+)$/i;
const BREAKING_BODY = /^BREAKING[ -]CHANGE:/m;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const next = argv[i + 1];
    args[token.slice(2)] = next && !next.startsWith('--') ? argv[++i] : 'true';
  }
  return args;
}

function repoUrl() {
  const server = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
  if (process.env.GITHUB_REPOSITORY) {
    return `${server}/${process.env.GITHUB_REPOSITORY}`;
  }
  const { repository } = JSON.parse(readFileSync('package.json', 'utf8'));
  const url = typeof repository === 'string' ? repository : (repository?.url ?? '');
  return url.replace(/^git\+/, '').replace(/\.git$/, '');
}

const BASE_URL = repoUrl();

/** Nearest `v*` tag reachable from HEAD, or an empty string on the first release. */
function previousTag() {
  try {
    return git('describe', '--tags', '--abbrev=0', '--match', 'v*');
  } catch {
    return '';
  }
}

function commitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const log = execFileSync(
    'git',
    ['log', '--no-merges', `--pretty=format:%H${FIELD}%s${FIELD}%b${RECORD}`, range],
    { encoding: 'utf8' },
  );
  return log
    .split(RECORD)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, body = ''] = record.split(FIELD);
      const match = CONVENTIONAL.exec(subject);
      return {
        hash,
        subject: match?.groups.subject ?? subject,
        type: match?.groups.type.toLowerCase() ?? '',
        scope: match?.groups.scope ?? '',
        breaking: Boolean(match?.groups.breaking) || BREAKING_BODY.test(body),
      };
    });
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

function renderNotes(version, tag, commits) {
  const link = (commit) => `([${commit.hash.slice(0, 7)}](${BASE_URL}/commit/${commit.hash}))`;
  const entry = (commit) =>
    `- ${commit.scope ? `**${commit.scope}:** ` : ''}${commit.subject} ${link(commit)}`;
  const lines = [];

  const breaking = commits.filter((commit) => commit.breaking);
  if (breaking.length) {
    lines.push('### ⚠ BREAKING CHANGES', '', ...breaking.map(entry), '');
  }
  for (const [type, title] of GROUPS) {
    const group = commits.filter((commit) => commit.type === type);
    if (group.length) {
      lines.push(`### ${title}`, '', ...group.map(entry), '');
    }
  }
  const known = new Set(GROUPS.map(([type]) => type));
  const other = commits.filter((commit) => !known.has(commit.type));
  if (other.length) {
    lines.push('### 📌 Other changes', '', ...other.map(entry), '');
  }
  if (!commits.length) {
    lines.push('_No commit since the previous release._', '');
  }

  lines.push(
    tag
      ? `**Full Changelog**: ${BASE_URL}/compare/${tag}...v${version}`
      : `**Full Changelog**: ${BASE_URL}/commits/v${version}`,
  );
  return `${lines.join('\n')}\n`;
}

function updateChangelog(file, version, tag, notes) {
  const header = '# Changelog\n';
  const date = new Date().toISOString().slice(0, 10);
  const heading = tag
    ? `## [${version}](${BASE_URL}/compare/${tag}...v${version}) (${date})`
    : `## ${version} (${date})`;
  const previous = existsSync(file)
    ? readFileSync(file, 'utf8').replace(header, '').trimStart()
    : '';
  writeFileSync(
    file,
    `${header}\n${heading}\n\n${notes}${previous ? `\n${previous.trimEnd()}\n` : ''}`,
  );
}

function runBump(args) {
  const requested = args.type && args.type !== 'auto' ? args.type : '';
  if (requested && !['patch', 'minor', 'major'].includes(requested)) {
    throw new Error(`unknown release type "${requested}"`);
  }
  const tag = previousTag();
  const commits = commitsSince(tag);
  const breaking = commits.filter((commit) => commit.breaking);
  // `auto` never picks `major`: the major of the library tracks the Angular major,
  // so a breaking change is only flagged here and released by hand
  const bump = requested || (commits.some((commit) => commit.type === 'feat') ? 'minor' : 'patch');

  if (!commits.length) {
    throw new Error(`no commit since ${tag || 'the beginning of the history'}: nothing to release`);
  }
  if (breaking.length && bump !== 'major') {
    console.warn(
      `::warning::${breaking.length} breaking change(s) since ${tag} but the bump is "${bump}"`,
    );
  }

  console.log(`previous tag : ${tag || '(none)'}`);
  console.log(`commits      : ${commits.length}`);
  console.log(`bump         : ${bump}${requested ? ' (requested)' : ' (auto)'}`);
  setOutput('bump', bump);
  setOutput('previous_tag', tag);
  setOutput('commit_count', commits.length);
  setOutput('has_breaking', breaking.length > 0);
}

function runNotes(args) {
  const version = args.version;
  if (!version || version === 'true') {
    throw new Error('--version <x.y.z> is required');
  }
  const tag = previousTag();
  const notes = renderNotes(version, tag, commitsSince(tag));

  if (args['notes-out']) {
    writeFileSync(args['notes-out'], notes);
  }
  if (args.changelog) {
    updateChangelog(args.changelog, version, tag, notes);
  }
  setOutput('previous_tag', tag);
  console.log(notes);
}

const args = parseArgs(process.argv.slice(2));
try {
  switch (args._[0]) {
    case 'bump':
      runBump(args);
      break;
    case 'notes':
      runNotes(args);
      break;
    default:
      throw new Error('usage: release.mjs bump|notes [options]');
  }
} catch (error) {
  console.error(`::error::${error.message}`);
  process.exit(1);
}
