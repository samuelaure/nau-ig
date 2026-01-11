export function initialRepetition() {
  const now = Date.now();
  return {
    interval: 1,
    nextDueAt: now + 24 * 60 * 60 * 1000
  };
}
