import { execFile } from 'node:child_process';

// Asks a model one question and returns its JSON answer. Used only where code
// can't decide: what a piece of prose asks, or whether it states one outcome.
// The judge gets no tools and none of the fixture's settings.
export function askJudge({ config, instructions, material }) {
  const prompt = `${instructions}\n\nAnswer with one JSON object and nothing else.\n\n<material>\n${material}\n</material>`;
  const args = ['--print', prompt, '--model', config.judgeModel, '--output-format', 'json', '--setting-sources', 'project', '--tools', '', '--no-session-persistence'];
  return new Promise((resolve, reject) => {
    execFile(config.claudeBin, args, { cwd: config.workDir, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(new Error(`the judge failed: ${error.message}`));
      try {
        resolve(parseJson(JSON.parse(stdout).result));
      } catch (parseError) {
        reject(new Error(`the judge did not answer with JSON: ${parseError.message}`));
      }
    });
  });
}

// The first {...} block in the text, so a fenced answer still parses.
export function parseJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no JSON object found');
  return JSON.parse(text.slice(start, end + 1));
}
