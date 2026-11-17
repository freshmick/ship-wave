import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

// The state file holds the fake repository: one PR, one issue, labels, checks.
// The log file gets one JSON line per gh call.
export function openStore(statePath, logPath) {
  if (!statePath || !logPath) {
    throw new Error('fake gh needs FAKE_GH_STATE and FAKE_GH_LOG');
  }
  const read = () => JSON.parse(readFileSync(statePath, 'utf8'));

  return {
    read,
    // Applies `change` to the state and saves it. Returns what `change` returns.
    update(change) {
      const state = read();
      const result = change(state);
      writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
      return result;
    },
    log(entry) {
      appendFileSync(logPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
    },
  };
}

export function nextId(state) {
  state.lastId = (state.lastId ?? 1000) + 1;
  return state.lastId;
}
