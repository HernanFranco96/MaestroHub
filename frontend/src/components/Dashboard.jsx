import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";
import { getDevices, getMetrics, getEvents } from "../services/api";
import EventTable from "../components/EventTable";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const itemsPerPage = 10;

  const obtenerCategoria = (tipo = "") => {
    if (tipo.startsWith("CLIENT_")) return "CLIENTES";

    if (tipo.startsWith("CPU_")) return "CPU";

    if (tipo === "AP_OFFLINE") return "AP";

    return "OTROS";
  };

  const obtenerIconoEvento = (tipo = "", estado = "") => {
    const eventType = (tipo || "").toUpperCase();
    const eventState = (estado || "").toUpperCase();

    // Recuperaciones siempre tienen prioridad
    if (eventState === "RECUPERADO") {
      return "🟢";
    }

    switch (eventType) {
      case "AP_OFFLINE":
        return "📡";

      case "CLIENT_DROP_INSTANT":
        return "📉";

      case "CLIENT_DROP_PROGRESSIVE":
        return "📊";

      case "CLIENTS_ZERO":
        return "🚫";

      case "CLIENT_RECOVERED":
        return "✅";

      case "CPU_HIGH":
        return "🟠";

      case "CPU_CRITICAL":
        return "🔥";

      default:
        return "ℹ️";
    }
  };

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    async function cargarDatosIniciales() {
      try {
        const [devicesRes, metricsRes, eventsRes] = await Promise.all([
          getDevices(),
          getMetrics(),
          getEvents(),
        ]);

        const eventosOrdenados = (eventsRes || []).sort((a, b) => {
          const inicioA =
            a.inicio &&
            typeof a.inicio === "object" &&
            a.inicio.low !== undefined
              ? Number(a.inicio.low)
              : Number(a.inicio || 0);
          const inicioB =
            b.inicio &&
            typeof b.inicio === "object" &&
            b.inicio.low !== undefined
              ? Number(b.inicio.low)
              : Number(b.inicio || 0);
          return inicioB - inicioA;
        });

        setDevices(devicesRes || []);
        setMetrics(metricsRes || []);
        setNotifications(eventosOrdenados);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    cargarDatosIniciales();

    socket.on("connect", () => {
      console.log("🟢 Conectado al servidor de WebSockets con ID:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("🔴 Error de conexión en socket:", err);
    });

    socket.on("actualizacion-dispositivos", (data) => {
      console.log("📥 Datos en tiempo real recibidos del backend via socket");

      if (data.devices) {
        setDevices(data.devices);
      }
      if (data.metrics) {
        setMetrics(data.metrics);
      }
      if (data.events) {
        const eventosOrdenados = data.events.sort((a, b) => {
          const inicioA =
            a.inicio &&
            typeof a.inicio === "object" &&
            a.inicio.low !== undefined
              ? Number(a.inicio.low)
              : Number(a.inicio || 0);
          const inicioB =
            b.inicio &&
            typeof b.inicio === "object" &&
            b.inicio.low !== undefined
              ? Number(b.inicio.low)
              : Number(b.inicio || 0);
          return inicioB - inicioA;
        });

        setNotifications((prevNotifications) => {
          const idsAnteriores = new Set(prevNotifications.map((n) => n._id));
          const nuevosIds = new Set(
            eventosOrdenados
              .filter((ev) => ev._id && !idsAnteriores.has(ev._id))
              .map((ev) => ev._id),
          );

          window._nuevosEventosIds = nuevosIds;
          return eventosOrdenados;
        });
      }
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("actualizacion-dispositivos");
      socket.disconnect();
    };
  }, []);

  // Extraer tipos de eventos únicos de forma dinámica para el selector
  const tiposDisponibles = [
    "TODOS",
    ...new Set(notifications.map((ev) => ev.tipo).filter(Boolean)),
  ];

  // 1. APLICAR FILTROS
  const eventosFiltrados = notifications.filter((ev) => {
    const matchedDevice = devices.find(
      (d) => d.ip === ev.ip || d.name === ev.ap,
    );
    const nombreMostrar =
      ev.ap && ev.ap !== "Desconocido" ? ev.ap : matchedDevice?.name || "";
    const ipMostrar = ev.ip || matchedDevice?.ip || "";

    const search = searchTerm.toLowerCase();
    const textoMatch =
      search === "" ||
      nombreMostrar.toLowerCase().includes(search) ||
      ipMostrar.toLowerCase().includes(search);

    const tipoMatch = filtroTipo === "TODOS" || ev.tipo === filtroTipo;

    const categoriaMatch =
      filtroCategoria === "TODAS" ||
      obtenerCategoria(ev.tipo) === filtroCategoria;

    return textoMatch && tipoMatch && categoriaMatch;
  });

  const formatearFecha = (timestampInput) => {
    if (!timestampInput) return null;

    let timestampValue = timestampInput;
    if (typeof timestampInput === "object" && timestampInput !== null) {
      timestampValue =
        timestampInput.low !== undefined
          ? timestampInput.low
          : Number(timestampInput);
    }

    const date = new Date(Number(timestampValue));
    if (isNaN(date.getTime())) return null;

    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const anio = date.getFullYear();

    const horas = String(date.getHours()).padStart(2, "0");
    const minutos = String(date.getMinutes()).padStart(2, "0");
    const segundos = String(date.getSeconds()).padStart(2, "0");

    return `${dia}/${mes}/${anio} - ${horas}:${minutos}:${segundos}`;
  };

  const obtenerEstiloEstado = (estadoRaw, mensaje = "", tipo = "") => {
    const estado = (estadoRaw || "").toUpperCase();
    const msg = (mensaje || "").toLowerCase();
    const eventType = (tipo || "").toUpperCase();

    // ================================================================
    // RECUPERADOS (prioridad máxima)
    // ================================================================

    if (estado === "RECUPERADO" || msg.includes("recuperad")) {
      return {
        bg: "bg-emerald-950/60 text-emerald-400 border-emerald-800/80",
        dot: "bg-emerald-400",
        texto: eventType.startsWith("CPU_") ? "CPU Recuperada" : "Recuperado",
      };
    }

    // ================================================================
    // CPU ACTIVAS
    // ================================================================

    if (eventType === "CPU_HIGH") {
      return {
        bg: "bg-orange-950/60 text-orange-400 border-orange-800/80",
        dot: "bg-orange-400",
        texto: "CPU Alta",
      };
    }

    if (eventType === "CPU_CRITICAL") {
      return {
        bg: "bg-red-950/60 text-red-400 border-red-800/80 animate-pulse",
        dot: "bg-red-400",
        texto: "CPU Crítica",
      };
    }

    // ================================================================
    // CLIENTES RECUPERADOS
    // ================================================================

    if (eventType === "CLIENT_RECOVERED") {
      return {
        bg: "bg-emerald-950/60 text-emerald-400 border-emerald-800/80",
        dot: "bg-emerald-400",
        texto: "Clientes Recuperados",
      };
    }

    // ================================================================
    // INFO
    // ================================================================

    if (estado === "INFO") {
      return {
        bg: "bg-amber-950/60 text-amber-400 border-amber-800/80",
        dot: "bg-amber-400",
        texto: "INFO",
      };
    }

    // ================================================================
    // WARNING
    // ================================================================

    if (estado === "WARNING" || estado === "ADVERTENCIA") {
      return {
        bg: "bg-amber-950/60 text-amber-400 border-amber-800/80",
        dot: "bg-amber-400",
        texto: "Advertencia",
      };
    }

    // ================================================================
    // ACTIVO DEFAULT
    // ================================================================

    return {
      bg: "bg-rose-950/60 text-rose-400 border-rose-800/80 animate-pulse",
      dot: "bg-rose-400",
      texto: estadoRaw || "Activo",
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-900 text-slate-300 font-medium space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="tracking-wide text-sm">Cargando Centro de Monitoreo...</p>
      </div>
    );
  }

  /*
    ==========================================================
    KPIs
    ==========================================================
    */

  const eventosActivos = notifications.filter(
    (ev) => (ev.estado || "").toUpperCase() === "ACTIVO",
  ).length;

  const eventosRecuperados = notifications.filter(
    (ev) => (ev.estado || "").toUpperCase() === "RECUPERADO",
  ).length;

  const eventosInfo = notifications.filter(
    (ev) => (ev.estado || "").toUpperCase() === "INFO",
  ).length;

  const eventosInfoLista = eventosFiltrados.filter(
    (ev) => (ev.estado || "").toUpperCase() === "INFO",
  );

  const eventosAlarmas = eventosFiltrados
    .filter((ev) => (ev.estado || "").toUpperCase() !== "INFO")
    .sort((a, b) => {
      const tipoA = (a.tipo || "").toUpperCase();
      const tipoB = (b.tipo || "").toUpperCase();

      const estadoA = (a.estado || "").toUpperCase();
      const estadoB = (b.estado || "").toUpperCase();

      // Prioridad 1: AP_OFFLINE ACTIVO
      const prioridadA = tipoA === "AP_OFFLINE" && estadoA === "ACTIVO" ? 1 : 0;

      const prioridadB = tipoB === "AP_OFFLINE" && estadoB === "ACTIVO" ? 1 : 0;

      if (prioridadA !== prioridadB) {
        return prioridadB - prioridadA;
      }

      // Prioridad 2: resto de ACTIVO antes que RECUPERADO
      if (estadoA === "ACTIVO" && estadoB !== "ACTIVO") {
        return -1;
      }

      if (estadoB === "ACTIVO" && estadoA !== "ACTIVO") {
        return 1;
      }

      // Prioridad 3: más recientes primero
      const inicioA =
        a.inicio?.low !== undefined
          ? Number(a.inicio.low)
          : Number(a.inicio || 0);

      const inicioB =
        b.inicio?.low !== undefined
          ? Number(b.inicio.low)
          : Number(b.inicio || 0);

      return inicioB - inicioA;
    });

  return (
    <div className="p-6 md:p-10 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="flex items-center gap-3 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            <span className="flex items-center">
              <img
                src="/maestrohub.png"
                alt="MaestroHub"
                className="w-35 h-35 object-contain select-none"
              />
            </span>
            Centro de Monitoreo MaestroHub
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 rounded-full text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sistema en Línea
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Eventos
            </p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              {notifications.length}
            </p>
          </div>
          <div className="p-3 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-900/50">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Eventos Activos
            </p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {eventosActivos}
            </p>
          </div>
          <div className="p-3 bg-rose-950/60 text-rose-400 rounded-xl border border-rose-900/50">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recuperados
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {eventosRecuperados}
            </p>
          </div>
          <div className="p-3 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-900/50">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Eventos INFO
            </p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {eventosInfo}
            </p>
          </div>

          <div className="p-3 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-900/50">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="TODAS">Todas las categorías</option>
          <option value="CLIENTES">Clientes</option>
          <option value="CPU">CPU</option>
          <option value="AP">AP Offline</option>
          <option value="OTROS">Otros</option>
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          {tiposDisponibles.map((tipo) => (
            <option key={tipo}>{tipo}</option>
          ))}
        </select>
      </div>
      <EventTable
        title="Eventos Informativos"
        notifications={eventosInfoLista}
        devices={devices}
        obtenerEstiloEstado={obtenerEstiloEstado}
        obtenerIconoEvento={obtenerIconoEvento}
        formatearFecha={formatearFecha}
      />
      <EventTable
        title="Alarmas y Recuperaciones"
        notifications={eventosAlarmas}
        devices={devices}
        obtenerEstiloEstado={obtenerEstiloEstado}
        obtenerIconoEvento={obtenerIconoEvento}
        formatearFecha={formatearFecha}
      />
    </div>
  );
}
