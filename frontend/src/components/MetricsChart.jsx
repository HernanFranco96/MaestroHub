import React, { useMemo, useState, useEffect } from "react";

function Sparkline({ values = [], color = "bg-indigo-500" }) {
  if (!values.length) return null;

  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {values.map((v, i) => (
        <div
          key={i}
          className={`${color} rounded-sm flex-1 transition-all`}
          style={{
            height: `${Math.max((v / max) * 100, 6)}%`,
          }}
        />
      ))}
    </div>
  );
}

const formatSpeed = (kbps = 0) => {
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(2)} Mbps`;
  }

  return `${Number(kbps).toFixed(2)} Kbps`;
};

const formatClients = (value = 0) => Math.round(Number(value));

const getStatusStyles = (status) => {
  switch ((status || "").toUpperCase()) {
    case "ONLINE":
      return {
        badge:
          "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
        dot: "bg-emerald-500",
      };

    case "OFFLINE":
      return {
        badge:
          "bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
        dot: "bg-rose-500",
      };

    default:
      return {
        badge:
          "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
        dot: "bg-slate-400",
      };
  }
};

export default function MetricsChart({ metrics = [], devices = [] }) {
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

  useEffect(() => {
    if (selectedDeviceIndex >= devices.length) {
      setSelectedDeviceIndex(0);
    }
  }, [devices.length, selectedDeviceIndex]);

  const activeDevice = devices[selectedDeviceIndex] || devices[0] || null;

  const summaryStatus = getStatusStyles(activeDevice?.status);

  const muestrasActivas = useMemo(() => {
    if (!activeDevice?.muestras) return [];

    return [...activeDevice.muestras].sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
    );
  }, [activeDevice]);

  const clientesSerie = muestrasActivas
    .slice()
    .reverse()
    .map((m) => m.clientsOnline || 0);

  const dlSerie = muestrasActivas
    .slice()
    .reverse()
    .map((m) => m.dlTPut || 0);

  const ulSerie = muestrasActivas
    .slice()
    .reverse()
    .map((m) => m.ulTPut || 0);

  const cpuSerie = muestrasActivas
    .slice()
    .reverse()
    .map((m) => {
      return Number(m.cpu ?? 0);
    });

  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen de Métricas */}
      {metrics.length > 0 && metrics[0]?.title && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between transition-colors"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {metric.value}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla Principal del Dispositivo y Muestras */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Historial de Muestras del Dispositivo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Telemetría detallada y rendimiento histórico por intervalo (Haz
              clic en una fila para ver su timeline)
            </p>
          </div>
          <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
            {devices.length} Dispositivo(s) analizado(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-400 dark:text-slate-400 text-xs uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3.5 px-5">AP / IP</th>
                <th className="py-3.5 px-5">Modelo</th>
                <th className="py-3.5 px-5">Estado</th>
                <th className="py-3.5 px-5">Clientes</th>
                <th className="py-3.5 px-5">DL Prom.</th>
                <th className="py-3.5 px-5">UL Prom.</th>
                <th className="py-3.5 px-5">Frecuencia</th>
                <th className="py-3.5 px-5">Capturas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {devices.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs font-medium"
                  >
                    No hay información de dispositivo disponible para este
                    evento.
                  </td>
                </tr>
              ) : (
                devices.map((item, index) => {
                  const muestras = item.muestras ?? [];
                  const ultima = item.ultimaMuestra || muestras[0];

                  const promedioDl = muestras.length
                    ? muestras.reduce((a, m) => a + (m.dlTPut || 0), 0) /
                      muestras.length
                    : item.promedioDl || 0;

                  const promedioUl = muestras.length
                    ? muestras.reduce((a, m) => a + (m.ulTPut || 0), 0) /
                      muestras.length
                    : item.promedioUl || 0;

                  const promedioClientes = muestras.length
                    ? muestras.reduce((a, m) => a + (m.clientsOnline || 0), 0) /
                      muestras.length
                    : item.promedioClientes || 0;

                  const status = ultima?.status || item.status || "SIN DATOS";

                  const online = status === "ONLINE";

                  const styles = getStatusStyles(status);

                  const isSelected = selectedDeviceIndex === index;

                  return (
                    <tr
                      key={item._id || item.ip}
                      onClick={() => setSelectedDeviceIndex(index)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-50/60 dark:bg-indigo-950/30"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.name || item.ap || "AP Principal"}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {item.ip}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-slate-600 dark:text-slate-300 text-xs font-medium">
                        {item.model || "PMP 450m"}
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${styles.badge}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${styles.dot} ${
                              online ? "animate-pulse" : ""
                            }`}
                          />
                          {status}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-slate-700 dark:text-slate-200 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4 text-slate-400 dark:text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          {promedioClientes.toFixed(1)}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-slate-600 dark:text-slate-300 text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {promedioDl.toFixed(2)}
                        </span>{" "}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Kbps
                        </span>
                      </td>

                      <td className="py-4 px-5 text-slate-600 dark:text-slate-300 text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {promedioUl.toFixed(2)}
                        </span>{" "}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Kbps
                        </span>
                      </td>

                      <td className="py-4 px-5 text-slate-600 dark:text-slate-300 text-xs font-mono">
                        {ultima?.rfFreq ? `${ultima.rfFreq} MHz` : "N/D"}
                      </td>

                      <td className="py-4 px-5 text-slate-600 dark:text-slate-300 text-xs">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md font-mono font-semibold border border-slate-200/60 dark:border-slate-600">
                          {muestras.length} / 5
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sub-sección con el desglose cronológico interactivo */}
        {activeDevice && (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
            <div className="p-6">
              <div className="grid lg:grid-cols-4 gap-5">
                {/* ================= RESUMEN ================= */}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-5">
                    {activeDevice.name}
                  </h3>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">IP</span>
                      <span className="font-mono">{activeDevice.ip}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Modelo</span>
                      <span>{activeDevice.model}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Capturas</span>
                      <span>{muestrasActivas.length}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Estado</span>

                      <span
                        className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${summaryStatus.badge}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${summaryStatus.dot}`}
                        />
                        {activeDevice.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ================= CLIENTES ================= */}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        Clientes conectados
                      </p>

                      <h2 className="text-4xl font-bold mt-1 text-slate-900 dark:text-white">
                        {clientesSerie.at(-1) ?? 0}
                      </h2>

                      <p className="text-xs mt-2 text-slate-500">
                        Promedio{" "}
                        <span className="font-semibold">
                          {(
                            clientesSerie.reduce((a, b) => a + b, 0) /
                            Math.max(clientesSerie.length, 1)
                          ).toFixed(1)}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-indigo-100 dark:bg-indigo-950/50 p-3">
                      <svg
                        className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 20h5V18a4 4 0 00-5.356-3.77M9 20H4V18a4 4 0 015.356-3.77M16 3.13a4 4 0 010 7.75M8 3.13a4 4 0 000 7.75m4.5-1.88a4 4 0 110-8 4 4 0 010 8z"
                        />
                      </svg>
                    </div>
                  </div>

                  <Sparkline values={clientesSerie} color="bg-indigo-500" />
                </div>

                {/* ================= CPU ================= */}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        Uso CPU
                      </p>

                      <h2 className="text-4xl font-bold mt-1 text-slate-900 dark:text-white">
                        {cpuSerie.at(-1) ?? 0}%
                      </h2>

                      <p className="text-xs mt-2 text-slate-500">
                        Promedio{" "}
                        <span className="font-semibold">
                          {(
                            cpuSerie.reduce((a, b) => a + b, 0) /
                            Math.max(cpuSerie.length, 1)
                          ).toFixed(1)}
                          %
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-orange-100 dark:bg-orange-950/50 p-3">
                      <svg
                        className="w-6 h-6 text-orange-600 dark:text-orange-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 3h6l2 4h3v10H4V7h3l2-4z"
                        />
                      </svg>
                    </div>
                  </div>

                  <Sparkline values={cpuSerie} color="bg-orange-500" />
                </div>

                {/* ================= THROUGHPUT ================= */}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Download
                    </p>

                    <h2 className="text-2xl font-bold mt-1">
                      {formatSpeed(dlSerie.at(-1) ?? 0)}
                    </h2>

                    <div className="mt-4">
                      <Sparkline values={dlSerie} color="bg-sky-500" />
                    </div>
                  </div>

                  <div className="mt-8">
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Upload
                    </p>

                    <h2 className="text-2xl font-bold mt-1">
                      {formatSpeed(ulSerie.at(-1) ?? 0)}
                    </h2>

                    <div className="mt-4">
                      <Sparkline values={ulSerie} color="bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= TIMELINE ================= */}

              <div className="mt-6">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">
                  Últimas muestras
                </h3>

                <div className="space-y-2">
                  {muestrasActivas.map((muestra, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">
                          {new Date(
                            Number(muestra.timestamp),
                          ).toLocaleTimeString()}
                        </div>

                        <div className="text-xs text-slate-500">
                          {muestra.status}
                        </div>
                      </div>

                      <div className="flex gap-8 text-sm">
                        <div>
                          <div className="text-slate-400">Clientes</div>

                          <div className="font-bold">
                            {formatClients(muestra.clientsOnline)}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-400">DL</div>

                          <div className="font-bold">
                            {formatSpeed(muestra.dlTPut)}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-400">UL</div>

                          <div className="font-bold">
                            {formatSpeed(muestra.ulTPut)}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-400">CPU</div>

                          <div className="font-bold text-orange-400">
                            {Number(
                              muestra.cpu ??
                                muestra.cpuUsage ??
                                muestra["sys.cpu"] ??
                                0,
                            )}
                            %
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
