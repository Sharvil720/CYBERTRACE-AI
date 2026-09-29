# Parameter fit & held-out results (synthetic data, seed split 150 train / 150 test)

| Held-out (n=150) | Hit@1 | Hit@3 | Hit@5 | MRR | P10-P90 window coverage (nominal 80%) |
|---|---|---|---|---|---|
| Hawkes, old priors | 21.3% | 49.3% | 64.0% | 0.405 | 63.5% |
| Hawkes, fitted | 39.3% | 62.0% | 68.7% | 0.537 | 75.7% |
| Nearest-ATM baseline | 42.0% | 63.3% | - | 0.565 | - |

Fitted Hawkes closes most of the gap to nearest-ATM but does NOT beat it on this simulator
(which is built around last-hop distance). Several fitted values hit the grid edge. Synthetic only.
Run: `npx tsx --tsconfig tsconfig.app.json scripts/fitParams.ts`
