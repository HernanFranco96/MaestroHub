import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MetricsChart from "./MetricsChart";

export default function EventTable({
  title,
  notifications,
  devices,
  obtenerEstiloEstado,
  obtenerIconoEvento,
  formatearFecha,
}) {
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroTipo]);

  const itemsPerPage = 10;

  const toggleRow = (id) => {
    setExpandedEventId((prev) => (prev === id ? null : id));
  };

  const tiposDisponibles = [
    "TODOS",
    ...new Set(notifications.map((ev) => ev.tipo).filter(Boolean)),
  ];

  const eventosFiltrados = notifications.filter((ev) => {
    const matchedDevice = devices.find(
      (d) => d.ip === ev.ip || d.name === ev.ap,
    );

    const nombreMostrar =
      ev.ap && ev.ap !== "Desconocido" ? ev.ap : matchedDevice?.name || "";

    const ipMostrar = ev.ip || matchedDevice?.ip || "";

    const textoMatch =
      searchTerm === "" ||
      nombreMostrar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ipMostrar.toLowerCase().includes(searchTerm.toLowerCase());

    const tipoMatch = filtroTipo === "TODOS" || ev.tipo === filtroTipo;

    return textoMatch && tipoMatch;
  });

  const totalPages = Math.ceil(eventosFiltrados.length / itemsPerPage) || 1;

  const startIndex = (currentPage - 1) * itemsPerPage;

  const currentNotifications = eventosFiltrados.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-100">{title}</h3>

        <span className="text-xs text-slate-400">
          Mostrando {eventosFiltrados.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + itemsPerPage, eventosFiltrados.length)} de{" "}
          {eventosFiltrados.length}
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-800">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por nombre o IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-slate-100"
          />
        </div>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="border border-slate-700 rounded-lg px-3 py-2 bg-slate-950"
        >
          {tiposDisponibles.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo === "TODOS" ? "Todos los eventos" : tipo}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950/60">
            <th className="p-4">Estado</th>
            <th className="p-4">Tipo de Evento</th>
            <th className="p-4">Dispositivo / IP</th>
            <th className="p-4">Detalle del Mensaje</th>
            <th className="p-4">Inicio / Duración</th>
            <th className="p-4 text-right">Acción</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800 text-sm">
          {currentNotifications.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center text-slate-500 py-12">
                <p className="font-medium">
                  Sin eventos registrados actualmente.
                </p>
              </td>
            </tr>
          ) : (
            currentNotifications.map((ev, index) => {
              const rowId = ev._id || index;

              const isExpanded = expandedEventId === rowId;

              const estiloEstado = obtenerEstiloEstado(
                ev.estado,
                ev.mensaje,
                ev.tipo,
              );

              const matchedDevice = devices.find(
                (d) => d.ip === ev.ip || d.name === ev.ap,
              );

              const nombreMostrar =
                ev.ap && ev.ap !== "Desconocido"
                  ? ev.ap
                  : matchedDevice?.name || "Desconocido";

              const ipMostrar =
                ev.ip || matchedDevice?.ip || "IP no registrada";

              const esRecienLlegado =
                window._nuevosEventosIds &&
                window._nuevosEventosIds.has(ev._id);

              const ipLink =
                ipMostrar &&
                ipMostrar !== "Desconocido" &&
                ipMostrar !== "IP no registrada"
                  ? `<a href="http://${ipMostrar}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1 font-medium transition-colors">
                                    ${ipMostrar}
                                    <svg class="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14">
                                        </path>
                                    </svg>
                            </a>`
                  : `<span class="text-slate-500 italic">${ipMostrar}</span>`;

              const esAPOfflineActivo =
                ev.tipo === "AP_OFFLINE" && ev.estado === "ACTIVO";

              return (
                <React.Fragment key={rowId}>
                  <tr
                    onClick={() => toggleRow(rowId)}
                    className={`cursor-pointer transition-all duration-500 ${
                      esAPOfflineActivo
                        ? "bg-rose-950/40 border-l-4 border-rose-500"
                        : esRecienLlegado
                          ? "animate-highlight"
                          : isExpanded
                            ? "bg-indigo-950/40"
                            : "hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-2xs border ${estiloEstado.bg}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${estiloEstado.dot}`}
                        />

                        {estiloEstado.texto}
                      </span>
                    </td>

                    <td className="p-4 whitespace-nowrap text-xs font-semibold text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {obtenerIconoEvento?.(ev.tipo, ev.estado)}
                        </span>

                        <span>{ev.tipo || "N/A"}</span>
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {ipMostrar &&
                      ipMostrar !== "Desconocido" &&
                      ipMostrar !== "IP no registrada" ? (
                        <Link
                          to={`/ap/${ipMostrar}`}
                          className="font-bold text-slate-100 hover:text-indigo-400 hover:underline block transition-colors"
                        >
                          {nombreMostrar}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-100">
                          {nombreMostrar}
                        </span>
                      )}

                      <span
                        className="text-xs text-slate-400 font-mono tracking-tighter"
                        dangerouslySetInnerHTML={{
                          __html: ipLink,
                        }}
                      />
                    </td>

                    <td className="p-4 text-slate-300 max-w-sm text-xs leading-relaxed">
                      {ev.mensaje}
                    </td>

                    <td className="p-4 whitespace-nowrap text-xs text-slate-400 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-500">
                          Inicio:
                        </span>

                        <span className="font-semibold text-slate-200 font-mono">
                          {formatearFecha(ev.inicio) || "N/A"}
                        </span>
                      </div>

                      {ev.fin && (
                        <div>
                          <span className="font-semibold text-slate-500">
                            Fin:
                          </span>

                          <span className="font-semibold text-emerald-400 font-mono">
                            {formatearFecha(ev.fin)}
                          </span>
                        </div>
                      )}

                      {ev.duracion !== undefined && ev.duracion !== null && (
                        <div className="text-[11px] text-slate-500 font-medium">
                          Duración: {Math.round(Number(ev.duracion) / 1000)}s (
                          {ev.duracion}ms)
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-right text-xs font-semibold text-indigo-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/80 px-3 py-1.5 rounded-lg transition-colors">
                        {isExpanded ? "Ocultar ▲" : "Ver detalle ▼"}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td
                        colSpan="6"
                        className="bg-slate-950/80 p-6 border-b border-slate-800"
                      >
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-6">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-800 gap-3">
                            <div>
                              <h4 className="font-bold text-slate-100 text-base">
                                {nombreMostrar}
                              </h4>

                              <p className="text-xs text-slate-400 font-mono mt-0.5">
                                IP: {ipMostrar}
                                {matchedDevice?.mac
                                  ? ` • MAC: ${matchedDevice.mac}`
                                  : ""}
                              </p>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider border ${
                                matchedDevice?.status?.toUpperCase() ===
                                  "ONLINE" ||
                                estiloEstado.texto === "Recuperado"
                                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                                  : "bg-rose-950/60 text-rose-400 border-rose-800/80"
                              }`}
                            >
                              Estado:{" "}
                              {matchedDevice?.status || estiloEstado.texto}
                            </span>
                          </div>

                          <div className="w-full">
                            <MetricsChart
                              metrics={
                                matchedDevice?.muestras || ev.muestras || []
                              }
                              devices={
                                matchedDevice ? [matchedDevice] : devices
                              }
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 border-t border-slate-800">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-slate-800 disabled:opacity-40"
          >
            Anterior
          </button>

          <span className="text-sm text-slate-400">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-slate-800 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
