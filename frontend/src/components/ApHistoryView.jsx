import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Brush,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  Wifi,
  Server,
  MapPin,
  RadioTower,
  Cpu,
  Activity,
  Clock,
  HardDrive,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock3,
} from "lucide-react";

export default function ApHistoryView() {
  const { ip } = useParams();
  const [apData, setApData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paginaEventos, setPaginaEventos] = useState(1);
  const [periodo, setPeriodo] = useState("24h");

  const EVENTOS_POR_PAGINA = 5;

  useEffect(() => {
    async function fetchApDetail() {
      try {
        setLoading(true);
        const response = await fetch(
          `http://192.168.131.141:3000/api/ap/${ip}`,
        );
        const result = await response.json();

        if (result.success) {
          setApData(result.data);
        }
      } catch (error) {
        console.error("Error al cargar el historial del AP:", error);
      } finally {
        setLoading(false);
      }
    }

    if (ip) {
      fetchApDetail();
    }
  }, [ip]);

  const formatThroughput = (kbps = 0) => {
    if (kbps >= 1_000_000) {
      return `${(kbps / 1_000_000).toFixed(2)} Gbps`;
    }

    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(2)} Mbps`;
    }

    return `${kbps.toFixed(0)} Kbps`;
  };

  // Calcular algunos estadísticos rápidos para las KPI Cards superiores
  const device = apData?.device ?? {};

  const ultimasMuestras = apData?.muestras ?? [];

  const ultimaMuestra = ultimasMuestras[ultimasMuestras.length - 1] ?? {};

  const muestrasFiltradas = useMemo(() => {
    const ahora = Date.now();

    const limites = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    const limite = limites[periodo];

    return ultimasMuestras.filter((m) => ahora - m.timestamp <= limite);
  }, [ultimasMuestras, periodo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium tracking-wide">
            Cargando telemetría del AP...
          </p>
        </div>
      </div>
    );
  }

  if (!apData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl shadow-2xl text-center max-w-md space-y-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            Dispositivo no encontrado
          </h2>
          <p className="text-slate-400 text-sm">
            No se pudo localizar información ni métricas históricas para la IP:{" "}
            <span className="text-slate-200 font-mono">{ip}</span>
          </p>
        </div>
      </div>
    );
  }

  const maxClientsOnline = ultimasMuestras.length
    ? Math.max(...ultimasMuestras.map((m) => m.clientsOnline || 0))
    : 0;

  const maxDlTPut = ultimasMuestras.length
    ? Math.max(...ultimasMuestras.map((m) => m.dlTPut || 0))
    : 0;

  const maxUlTPut = ultimasMuestras.length
    ? Math.max(...ultimasMuestras.map((m) => m.ulTPut || 0))
    : 0;

  const isOnline = (device.status || ultimaMuestra.status) === "ONLINE";

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl">
        <p className="text-slate-400 text-xs mb-2">
          {new Date(label).toLocaleString()}
        </p>

        {payload.map((item) => (
          <div
            key={item.dataKey}
            className="flex justify-between gap-8 text-sm"
          >
            <span style={{ color: item.color }}>{item.name}</span>
            <span className="font-bold text-white">
              {formatThroughput(item.value)}
            </span>{" "}
          </div>
        ))}
      </div>
    );
  };

  const ClientsTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl">
        <p className="text-slate-400 text-xs mb-2">
          {new Date(label).toLocaleString()}
        </p>

        {payload.map((item) => (
          <div
            key={item.dataKey}
            className="flex justify-between gap-8 text-sm"
          >
            <span style={{ color: item.color }}>{item.name}</span>

            <span className="font-bold text-white">{item.value} clientes</span>
          </div>
        ))}
      </div>
    );
  };

  console.table(ultimaMuestra);
  const ultima = ultimaMuestra;

  const rfFreq = ultima.rfFreq ?? 0;
  const txPower = ultima.txPower ?? 0;
  const dlUtil = ultima.dlFrmUtil ?? 0;
  const eventos = Array.isArray(apData.eventos) ? apData.eventos : [];

  const totalPaginas = Math.ceil(eventos.length / EVENTOS_POR_PAGINA);

  const eventosPagina = eventos.slice(
    (paginaEventos - 1) * EVENTOS_POR_PAGINA,
    paginaEventos * EVENTOS_POR_PAGINA,
  );

  const severityStyles = {
    CRITICAL: {
      color: "border-red-500/40 bg-red-500/10",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
    },
    WARNING: {
      color: "border-yellow-500/40 bg-yellow-500/10",
      badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    },
    INFO: {
      color: "border-blue-500/40 bg-blue-500/10",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      icon: <Info className="w-5 h-5 text-blue-400" />,
    },
    OK: {
      color: "border-emerald-500/40 bg-emerald-500/10",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
  };

  const formatDuration = (seconds = 0) => {
    if (!seconds) return "Instantáneo";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${s}s`;

    return `${s}s`;
  };

  const Gauge = ({
    value = 0,
    max = 100,
    color = "#3B82F6",
    title,
    unit = "",
    icon,
    reverse = false,
    showStatus = true,
    showPercent = true,
  }) => {
    const percent = Math.min((value / max) * 100, 100);

    // Score utilizado para determinar la salud
    const score = reverse ? 100 - percent : percent;

    const gaugeData = [
      {
        name: title,
        value: percent,
        fill: color,
      },
    ];

    const getStatus = () => {
      if (score >= 80)
        return {
          text: "Excelente",
          color: "text-emerald-400",
        };

      if (score >= 60)
        return {
          text: "Bueno",
          color: "text-cyan-400",
        };

      if (score >= 40)
        return {
          text: "Advertencia",
          color: "text-yellow-400",
        };

      return {
        text: "Crítico",
        color: "text-red-400",
      };
    };

    const status = showStatus ? getStatus() : null;

    return (
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <span className="text-sm font-semibold text-slate-300">{title}</span>
        </div>

        <div className="relative w-44 h-44 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              data={gaugeData}
              barSize={16}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />

              <RadialBar
                dataKey="value"
                cornerRadius={12}
                background={{ fill: "#1E293B" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold" style={{ color }}>
              {value}
            </span>

            <span className="text-xs text-slate-500">{unit}</span>

            {showPercent && (
              <span className="mt-2 text-sm font-semibold text-slate-300">
                {percent.toFixed(0)}%
              </span>
            )}

            {showStatus && (
              <span className={`mt-1 text-xs font-bold ${status.color}`}>
                {status.text}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 space-y-8">
      {/* ================= HEADER ================= */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-2xl">
        {/* Glow decorativo */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/10 blur-3xl rounded-full"></div>

        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8">
            {/* Información principal */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-widest">
                  Access Point
                </span>

                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                    isOnline
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                    }`}
                  ></span>

                  {device.status || ultimaMuestra.status || "UNKNOWN"}
                </span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-white">
                {device.name}
              </h1>

              <p className="mt-2 text-slate-400 font-mono">{device.ip}</p>

              <div className="mt-6 flex flex-wrap gap-6">
                <div>
                  <p className="text-xs uppercase text-slate-500">Modelo</p>
                  <p className="text-white font-semibold">
                    {device.model || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-slate-500">Firmware</p>
                  <p className="text-white font-semibold">
                    {device.firmware || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-slate-500">Nodo</p>
                  <p className="text-white font-semibold">
                    {device.nodo || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-slate-500">Sitio</p>
                  <p className="text-white font-semibold">
                    {device.sitio || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Panel derecho */}
            <div className="min-w-[280px]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Última actualización
                  </p>

                  <p className="text-slate-200 font-mono mt-1">
                    {device.updatedAt
                      ? new Date(device.updatedAt).toLocaleString()
                      : "-"}
                  </p>
                </div>

                <div className="border-t border-slate-800"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Serial</p>

                    <p className="font-mono text-slate-200">{device.serial}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">MAC</p>

                    <p className="font-mono text-slate-200">{device.mac}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Tipo</p>

                    <p className="text-slate-200">{device.tipo}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">IP Pública</p>

                    <p className="font-mono text-slate-200">{device.ip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Clientes Online */}
        <div className="group bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-cyan-500/40 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Clientes Online
              </p>

              <h3 className="text-4xl font-bold mt-2 text-white">
                {ultimaMuestra.clientsOnline ?? 0}
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                de {ultimaMuestra.clientsTotal ?? 0} asociados
              </p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Wifi className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          <div className="mt-5 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-400"
              style={{
                width: `${
                  ultimaMuestra.clientsTotal
                    ? (ultimaMuestra.clientsOnline /
                        ultimaMuestra.clientsTotal) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Pico Clientes */}
        <div className="group bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-blue-500/40 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Pico Histórico
              </p>

              <h3 className="text-4xl font-bold mt-2 text-blue-400">
                {maxClientsOnline}
              </h3>

              <p className="text-sm text-slate-400 mt-1">máximo de clientes</p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
          </div>

          <div className="mt-5 text-xs text-slate-500">
            Últimas {ultimasMuestras.length} muestras
          </div>
        </div>

        {/* Download */}
        <div className="group bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-violet-500/40 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Download
              </p>

              <h3 className="text-4xl font-bold mt-2 text-violet-400">
                {formatThroughput(ultimaMuestra.dlTPut)}
              </h3>

              <p className="text-sm text-slate-400 mt-1">Downgrade actual</p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Server className="w-6 h-6 text-violet-400" />
            </div>
          </div>

          <div className="mt-5 text-xs text-slate-500">
            Máximo: {formatThroughput(maxDlTPut).toLocaleString()}
          </div>
        </div>

        {/* Upload */}
        <div className="group bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-amber-500/40 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Upload
              </p>

              <h3 className="text-4xl font-bold mt-2 text-amber-400">
                {formatThroughput(ultimaMuestra.ulTPut ?? 0).toLocaleString()}
              </h3>

              <p className="text-sm text-slate-400 mt-1">Upload actual</p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <RadioTower className="w-6 h-6 text-amber-400" />
            </div>
          </div>

          <div className="mt-5 text-xs text-slate-500">
            Máximo: {formatThroughput(maxUlTPut).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Selector de período */}
      <div className="flex justify-end mb-6">
        <div className="flex rounded-xl overflow-hidden border border-slate-700">
          {[
            ["24h", "24 horas"],
            ["7d", "7 días"],
            ["30d", "30 días"],
            ["all", "Todo"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriodo(value)}
              className={`px-4 py-2 text-sm transition ${
                periodo === value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sección de Gráfica: Clientes Online / Totales */}
      <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-xl backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Evolución de Clientes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comportamiento temporal de clientes online vs. capacidad total del
              AP
            </p>
          </div>
        </div>

        {ultimasMuestras.length > 0 ? (
          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={muestrasFiltradas}
                margin={{
                  top: 20,
                  right: 20,
                  left: -20,
                  bottom: 20,
                }}
              >
                <defs>
                  <linearGradient
                    id="clientsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="totalGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#1E293B"
                  strokeDasharray="2 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={(time) =>
                    new Date(time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  domain={[0, "dataMax + 5"]}
                />
                <Tooltip content={<ClientsTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="clientsOnline"
                  name="Clientes conectados"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 7,
                    fill: "#3B82F6",
                    stroke: "#FFF",
                    strokeWidth: 2,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="clientsTotal"
                  name="Mayor cantidad de clientes conectados"
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                />
                <ReferenceLine
                  y={maxClientsOnline}
                  stroke="#F59E0B"
                  strokeDasharray="5 5"
                  label={{
                    value: `Máx ${maxClientsOnline}`,
                    fill: "#F59E0B",
                    fontSize: 11,
                  }}
                />
                <Brush
                  dataKey="timestamp"
                  height={28}
                  stroke="#3B82F6"
                  travellerWidth={8}
                  fill="#0f172a"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No hay muestras históricas registradas para este AP.
          </div>
        )}
      </div>

      {/* Throughput */}
      <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-xl backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Throughput de Red</h2>

            <p className="text-xs text-slate-400 mt-1">
              Evolución del tráfico de descarga y subida del Access Point.
            </p>
          </div>
        </div>

        {ultimasMuestras.length > 0 ? (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={muestrasFiltradas}
                margin={{
                  top: 20,
                  right: 20,
                  left: -20,
                  bottom: 20,
                }}
              >
                <defs>
                  <linearGradient
                    id="downloadGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient
                    id="uploadGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#1E293B"
                  strokeDasharray="2 6"
                  vertical={false}
                />

                <XAxis
                  dataKey="timestamp"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={(time) =>
                    new Date(time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                />

                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]}
                  tickFormatter={(v) => formatThroughput(v)}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend wrapperStyle={{ paddingTop: 20 }} />

                <Line
                  type="monotone"
                  dataKey="dlTPut"
                  name="Download"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{
                    r: 7,
                    fill: "#8B5CF6",
                    stroke: "#FFF",
                    strokeWidth: 2,
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="ulTPut"
                  name="Upload"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{
                    r: 7,
                    fill: "#F59E0B",
                    stroke: "#FFF",
                    strokeWidth: 2,
                  }}
                />

                <Brush
                  dataKey="timestamp"
                  height={28}
                  stroke="#8B5CF6"
                  travellerWidth={8}
                  fill="#0F172A"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No hay muestras históricas de tráfico registradas.
          </div>
        )}
      </div>

      {/* Historial de Eventos */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Historial de Eventos</h2>

          <p className="text-sm text-slate-400">
            Registro cronológico de alertas y eventos detectados.
          </p>
        </div>

        {apData.eventos?.length ? (
          <div className="space-y-5">
            {eventosPagina.map((ev) => {
              const style = severityStyles[ev.severidad] ?? severityStyles.INFO;

              return (
                <div
                  key={ev._id}
                  className={`relative rounded-xl border p-5 ${style.color}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{style.icon}</div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`px-3 py-1 rounded-full border text-xs font-semibold ${style.badge}`}
                        >
                          {ev.severidad}
                        </span>

                        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs">
                          {ev.tipo}
                        </span>
                      </div>

                      <p className="text-slate-100 font-medium">
                        {ev.mensaje || ev.descripcion}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <Clock3 className="w-4 h-4" />
                          {new Date(ev.inicio).toLocaleString()}
                        </div>

                        <div>
                          Duración:
                          <span className="ml-2 text-slate-200">
                            {formatDuration(ev.duracion)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
            <CheckCircle2 className="mx-auto w-10 h-10 text-emerald-400 mb-4" />

            <h3 className="text-lg font-semibold text-white">
              Sin eventos registrados
            </h3>

            <p className="text-slate-400 mt-2">
              Durante el período consultado no se detectaron alertas ni
              incidencias.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPaginas > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-slate-400">
            Página {paginaEventos} de {totalPaginas}
          </span>

          <div className="flex gap-2">
            <button
              disabled={paginaEventos === 1}
              onClick={() => setPaginaEventos((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              ← Anterior
            </button>

            <button
              disabled={paginaEventos === totalPaginas}
              onClick={() =>
                setPaginaEventos((p) => Math.min(totalPaginas, p + 1))
              }
              className="px-4 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
