// ./src/lib/analisis/cpu.js

import { obtenerPerfil } from "./clientes.js";
import { randomUUID } from "crypto";

export function analizarCPU(ap, alarmasActivasMap) {
  const eventos = [];
  const muestras = ap.muestras ?? [];

  if (muestras.length < 2) {
    return eventos;
  }

  const perfil = obtenerPerfil(ap);

  if (!perfil.cpu) {
    return eventos;
  }

  const actual = muestras.at(-1);

  if (actual.status !== "ONLINE") {
    return eventos;
  }

  const cpu = Number(actual.cpu);

  if (isNaN(cpu)) {
    return eventos;
  }

  const alarmaActiva = Object.values(alarmasActivasMap).find(
    (a) =>
      a.ip === ap.ip &&
      a.estado === "ACTIVO" &&
      (a.tipo === "CPU_HIGH" || a.tipo === "CPU_CRITICAL"),
  );

  let tipoActual = null;
  let severidad = null;

  if (cpu >= perfil.cpu.critical) {
    tipoActual = "CPU_CRITICAL";
    severidad = "CRITICAL";
  } else if (cpu >= perfil.cpu.warning) {
    tipoActual = "CPU_HIGH";
    severidad = "WARNING";
  }

  /*
    ================================================================
    RECUPERACIÓN
    ================================================================
    */
  if (!tipoActual && alarmaActiva) {
    alarmaActiva.estado = "RECUPERADO";
    alarmaActiva.fin = Date.now();
    alarmaActiva.duracion = alarmaActiva.fin - alarmaActiva.inicio;

    alarmaActiva.activo = false;

    alarmaActiva.mensaje = `${ap.name} CPU recuperada: ${cpu}%`;

    eventos.push({
      ...alarmaActiva,
      estado: "RECUPERADO",
      tipo: "CPU_RECOVERED",
    });

    return eventos;
  }
  /*
  ================================================================
  SIN ALARMA Y SIN PROBLEMA
  ================================================================
  */

  if (!tipoActual) {
    return eventos;
  }

  /*
  ================================================================
  CREAR NUEVA ALARMA
  ================================================================
  */

  if (!alarmaActiva) {
    const alarma = {
      idEvento: randomUUID(),
      tipo: tipoActual,
      severidad,
      ap: ap.name,
      ip: ap.ip,
      estado: "ACTIVO",
      activo: true,
      inicio: Date.now(),
      cpu,
      mensaje: `${ap.name} presenta utilización de CPU del ${cpu}%`,
    };

    alarmasActivasMap[alarma.idEvento] = alarma;

    eventos.push({ ...alarma });

    return eventos;
  }

  /*
  ================================================================
  CAMBIO DE NIVEL (HIGH ↔ CRITICAL)
  ================================================================
  */

  if (alarmaActiva.tipo !== tipoActual) {
    alarmaActiva.tipo = tipoActual;
    alarmaActiva.severidad = severidad;
    alarmaActiva.cpu = cpu;
    alarmaActiva.mensaje = `${ap.name} presenta utilización de CPU del ${cpu}%`;

    eventos.push({ ...alarmaActiva });

    return eventos;
  }

  /*
  ================================================================
  MISMO ESTADO → ACTUALIZAR VALOR CPU
  ================================================================
  */

  alarmaActiva.cpu = cpu;
  alarmaActiva.mensaje = `${ap.name} presenta utilización de CPU del ${cpu}%`;

  return eventos;
}
