// Simplified, illustrative payout math for the demo/portfolio clone.
// Not real pricing — a real backend would price contracts from live feeds.
const EDGE = 0.953

function fromProbability(p: number) {
  return Math.max(0, (1 / p - 1) * 100 * EDGE)
}

export function evenOddPayout() {
  return { even: fromProbability(0.5), odd: fromProbability(0.5) }
}

export function matchesDiffersPayout(_digit: number) {
  return { match: fromProbability(0.1), differs: fromProbability(0.9) }
}

export function overUnderPayout(barrier: number) {
  const overCount = 9 - barrier
  const underCount = barrier
  const pOver = Math.max(overCount, 1) / 10
  const pUnder = Math.max(underCount, 1) / 10
  return { over: fromProbability(pOver), under: fromProbability(pUnder) }
}
