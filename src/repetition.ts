const DAY = 24 * 60 * 60 * 1000;

export function initialRepetition() {
  const now = Date.now();
  return {
    interval: 1,
    nextDueAt: now + DAY,
    lastInteractionAt: now
  };
}

export function adjustRepetition(
  interval: number,
  action: "more" | "same" | "less"
) {
  let newInterval = interval;

  if (action === "more") newInterval = Math.min(interval * 2, 60);
  if (action === "less") newInterval = Math.max(Math.floor(interval / 2), 1);

  const now = Date.now();

  return {
    interval: newInterval,
    nextDueAt: now + newInterval * DAY,
    lastInteractionAt: now
  };
}
