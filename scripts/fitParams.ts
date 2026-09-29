import { generateSyntheticCases, mulberry32, DEFAULT_SYNTHETIC } from '@/services/syntheticData';
import { runBacktest } from '@/services/backtest';
import { shuffled } from '@/services/conformal';
import { DEFAULT_PARAMS, type HawkesParams } from '@/services/hawkes';
const seed = DEFAULT_SYNTHETIC.seed;
const all = generateSyntheticCases({ seed });
const ord = shuffled(all.length, mulberry32(seed + 11));
const tr = ord.slice(0, 150).map(i => all[i]), te = ord.slice(150).map(i => all[i]);
const m = (r: any, id: string) => r.methods.find((x: any) => x.id === id);
let best: any = null;
for (const sigmaKm of [20,30,45,60,90]) for (const beta of [0.02,0.05,0.1,0.2]) for (const gamma of [0.8,0.9,1]) for (const lastHopBoost of [1,2,4,8,16]) for (const mu0 of [0.005,0.02,0.05]) {
  const p: HawkesParams = { ...DEFAULT_PARAMS, sigmaKm, beta, gamma, lastHopBoost, mu0 };
  const mrr = m(runBacktest(tr, p), 'hawkes').mrr.value;
  if (!best || mrr > best.mrr) best = { mrr, p };
}
let bt: any = null;
for (const dwellMultiplier of [0.5,1,2,3,4]) for (const logSigma of [0.6,0.8,1,1.2,1.5,1.8]) {
  const p = { ...best.p, dwellMultiplier, logSigma };
  const c = runBacktest(tr, p).windowCoverage.value;
  const d = Math.abs(c - 0.8);
  if (!bt || d < bt.d) bt = { d, c, dwellMultiplier, logSigma };
}
const fitted = { ...best.p, dwellMultiplier: bt.dwellMultiplier, logSigma: bt.logSigma };
console.log('FITTED', JSON.stringify(fitted), 'train cov', bt.c);
for (const [n, p] of [['default', DEFAULT_PARAMS], ['fitted', fitted]] as const) {
  const r = runBacktest(te, p);
  const h = m(r, 'hawkes'), nn = m(r, 'nearest');
  console.log(n, 'HELD-OUT n=' + te.length, 'hit1', h.hit1.value.toFixed(3), 'hit3', h.hit3.value.toFixed(3), 'hit5', h.hit5.value.toFixed(3), 'mrr', h.mrr.value.toFixed(3), '| nearest hit1', nn.hit1.value.toFixed(3), 'hit3', nn.hit3.value.toFixed(3), 'mrr', nn.mrr.value.toFixed(3), '| window cov', r.windowCoverage.value.toFixed(3), 'n', r.windowCoverage.n);
}
