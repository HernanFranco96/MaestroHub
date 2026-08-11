export function normalizeMetric(metric) {
  return {
    timestamp: Number(metric.timestamp),

    hora: metric.hora ?? null,

    status: metric.status ?? "UNKNOWN",

    dlTPut: Number(metric.dlTPut ?? 0),
    ulTPut: Number(metric.ulTPut ?? 0),

    dlFrmUtil: Number(metric.dlFrmUtil ?? 0),
    ulFrmUtil: Number(metric.ulFrmUtil ?? 0),

    rfFreq: Number(metric.rfFreq ?? 0),

    channelWidth: metric.channelWidth ?? metric.chWidth ?? null,

    txPower: metric.txPower ?? metric.txPowerDbm ?? metric.txPwr ?? null,

    clientsOnline: Number(metric.clientsOnline ?? 0),
    clientsOffline: Number(metric.clientsOffline ?? 0),
    clientsTotal:
      metric.clientsTotal ??
      (metric.clientsOnline ?? 0) + (metric.clientsOffline ?? 0),

    cpu: Number(metric.cpu ?? 0),
    temperature: Number(metric.temperature ?? 0),

    uptime: Number(metric.uptime ?? 0),

    dlPktLossPer: Number(metric.dlPktLossPer ?? 0),
    ulPktLossPer: Number(metric.ulPktLossPer ?? 0),

    dlRetransPktsPer: Number(metric.dlRetransPktsPer ?? 0),
    ulRetransPktsPer: Number(metric.ulRetransPktsPer ?? 0),

    dlCapDropPktsPer: Number(metric.dlCapDropPktsPer ?? 0),
    ulCapDropPktsPer: Number(metric.ulCapDropPktsPer ?? 0),

    dlSumimo: Number(metric.dlSumimo ?? 0),
    dlMumimo: Number(metric.dlMumimo ?? 0),
    ulSumimo: Number(metric.ulSumimo ?? 0),
    ulMumimo: Number(metric.ulMumimo ?? 0),

    dlMultiplexGain: Number(metric.dlMultiplexGain ?? 0),
    ulMultiplexGain: Number(metric.ulMultiplexGain ?? 0),
  };
}
