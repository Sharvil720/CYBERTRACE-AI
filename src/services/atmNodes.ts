import { atms, atmClusters } from '@/data/mockData';
import { DEFAULT_PARAMS, type AtmNode, type HawkesParams } from '@/services/hawkes';

/** ATM list with the Hawkes baseline mu_j = mu0 * clusterHitRate. Shared by the app and the backtest. */
export function buildAtmNodes(params: HawkesParams = DEFAULT_PARAMS): AtmNode[] {
  return atms.map((a) => {
    const cluster = atmClusters.find((c) => c.id === a.clusterId);
    return {
      id: a.id,
      lat: a.lat,
      lng: a.lng,
      baselineRate: params.mu0 * (cluster?.historicalHitRate ?? 0),
    };
  });
}
