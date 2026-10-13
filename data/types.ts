// "2023-03", or "2023" when only the year matters. Components format dates per locale.
export type YearMonth = `${number}-${number}` | `${number}`;

// `expected` marks an end date that is still in the future (graduation).
export type Period = { start: YearMonth; end: YearMonth; expected?: boolean };
