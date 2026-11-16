// Turns what one slicing run showed into a result per row of
// slice-expectations.md. Pure: everything it needs is passed in.

const AGENT_COMMENT = '[Agent comment]';

// A real question about the spec: a planted topic, or a product or technical one.
const asksAboutSpec = (judged) =>
  Object.values(judged?.planted ?? {}).some(Boolean) || (judged?.others ?? []).some((other) => other.kind !== 'other');

export function sliceRowResults({ sliceCase, seen, faults, spec, viewer }) {
  const rows = [];
  const add = (row, expected, failures) => rows.push({ row, expected, failures });

  // Rows 1, 3, 4, 5, 6, 9: each planted item is asked, or not, as its row says.
  const byRow = Map.groupBy(sliceCase.planted, (item) => item.row);
  for (const [row, items] of byRow) {
    const failures = items
      .filter((item) => Boolean(seen.asked.planted?.[item.id]) !== item.ask)
      .map((item) => `${item.ask ? 'did not ask about' : 'asked about'} "${item.id}": ${item.what}`);
    if (row === 5) {
      const technical = (seen.asked.others ?? []).filter((other) => other.kind === 'technical');
      failures.push(...technical.map((other) => `asked a technical question: ${other.question}`));
    }
    add(row, items[0].ask ? 'asked' : 'not asked', failures);
  }

  if (sliceCase.expectQuestions) {
    // A follow-up question after the answers is not counted against the
    // slicer: an answer can open a new gap, and it is right to ask about it.
    add(8, 'asked in a batch, nothing cut first', [
      ...(asksAboutSpec(seen.asked) ? [] : ['asked nothing before cutting']),
      ...(seen.publishedBeforeAnswers ? [`published ${seen.publishedBeforeAnswers} issue(s) before the answers`] : []),
    ]);
    const comments = spec.comments.filter((comment) => comment.author === viewer && comment.body.trimStart().startsWith(AGENT_COMMENT));
    add(10, 'answers recorded on the spec', comments.length === 1 ? [] : [`${comments.length} comments on the spec start with ${AGENT_COMMENT}, expected one`]);
  } else {
    const made = (seen.asked.others ?? []).map((other) => `asked: ${other.question}`);
    add(7, 'no question', asksAboutSpec(seen.asked) ? ['asked a question when nothing was open', ...made] : []);
  }

  add(11, 'every section present', [...faults.nothingPublished, ...faults.sections]);
  add(13, 'one outcome each', [...faults.nothingPublished, ...faults.outcomes]);
  add(14, 'no criterion dropped', [...faults.nothingPublished, ...faults.coverage]);
  add(15, 'no cycle', [...faults.nothingPublished, ...faults.cycle]);
  if (sliceCase.consentCriterion) add(16, 'consent part is its own slice', [...faults.nothingPublished, ...faults.consent]);
  add(21, 'no file paths', [...faults.nothingPublished, ...faults.paths]);
  const shown = seen.askedAgain ?? seen.asked;
  add(22, 'cut shown, nothing published before go', [
    ...(shown.showsCut ? [] : ['the cut was not shown before publishing']),
    ...(seen.publishedBeforeGo ? [`published ${seen.publishedBeforeGo} issue(s) before the user said go`] : []),
  ]);
  add(23, 'published as labelled sub-issues', [...faults.nothingPublished, ...faults.publishing]);
  return rows.sort((a, b) => a.row - b.row);
}
