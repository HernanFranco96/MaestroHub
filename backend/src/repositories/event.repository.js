import { Event } from "../models/event.model.js";

/**
 * ============================================================================
 * OBTENER ALARMAS ACTIVAS
 * ============================================================================
 * Solamente se consideran alarmas persistentes.
 *
 * Los eventos de clientes (CLIENT_DROP_*, CLIENTS_ZERO, CLIENT_RECOVERED)
 * jamás forman parte de este mapa.
 *
 * El único evento persistente actualmente es AP_OFFLINE.
 * ============================================================================
 */
export async function obtenerAlarmasActivasMongo(ipServer) {
  const eventosActivos = await Event.find({
    ipServer,
    estado: "ACTIVO",
    tipo: {
      $in: ["AP_OFFLINE", "CPU_HIGH", "CPU_CRITICAL"],
    },
  }).lean();

  const alarmasMap = {};

  for (const ev of eventosActivos) {
    alarmasMap[ev.idEvento] = {
      idEvento: ev.idEvento,
      tipo: ev.tipo,
      ip: ev.ip,

      ap: ev.ap,
      severidad: ev.severidad,

      estado: ev.estado,
      activo: true,

      inicio: ev.inicio,

      ultimoNivel: ev.nivel || null,

      ultimoEvento: ev.updatedAt ? new Date(ev.updatedAt).getTime() : ev.inicio,

      duracionActual: ev.inicio ? Date.now() - ev.inicio : 0,
    };
  }

  return alarmasMap;
}

/**
 * ============================================================================
 * GUARDAR ALARMAS ACTIVAS
 * ============================================================================
 *
 * Este método SOLO guarda AP_OFFLINE.
 *
 * Nunca debe recibir eventos INFO.
 * ============================================================================
 */
export async function guardarAlarmasActivasMongo(ipServer, alarmasMap) {
  for (const alarma of Object.values(alarmasMap)) {
    const TIPOS_PERSISTENTES = ["AP_OFFLINE", "CPU_HIGH", "CPU_CRITICAL"];

    if (
      !TIPOS_PERSISTENTES.includes(alarma.tipo) ||
      alarma.estado !== "ACTIVO"
    ) {
      continue;
    }

    await Event.findOneAndUpdate(
      {
        idEvento: alarma.idEvento,
        ipServer,
      },

      {
        idEvento: alarma.idEvento,

        tipo: alarma.tipo,

        severidad: alarma.severidad || "CRITICAL",

        ap: alarma.ap,

        ip: alarma.ip,

        ipServer,

        estado: alarma.estado,

        nivel: alarma.nivel || alarma.ultimoNivel || null,

        inicio: alarma.inicio,

        fin: alarma.fin || null,

        duracion: alarma.duracion || null,

        mensaje: alarma.mensaje,
      },

      {
        upsert: true,
        returnDocument: "after",
      },
    );
  }
}

/**
 * ============================================================================
 * GUARDAR HISTORIAL
 * ============================================================================
 *
 * Aquí llegan TODOS los eventos.
 *
 * Se dividen en dos categorías:
 *
 * 1)
 * CLIENT_DROP_INSTANT
 * CLIENT_DROP_PROGRESSIVE
 * CLIENTS_ZERO
 * CLIENT_RECOVERED
 *
 * Siempre INFO.
 *
 * 2)
 * AP_OFFLINE
 *
 * ACTIVO / RECUPERADO
 * ============================================================================
 */

export async function guardarHistorialMongo(evento, ipServer) {
  try {
    const EVENTOS_INFO = [
      "CLIENT_DROP_INSTANT",
      "CLIENT_DROP_PROGRESSIVE",
      "CLIENTS_ZERO",
      "CLIENT_RECOVERED",
    ];

    const esEventoInfo = EVENTOS_INFO.includes(evento.tipo);

    /*
    =======================================================================
    EVENTOS INFO
    =======================================================================
    */

    if (esEventoInfo) {
      const timestamp = evento.inicio || evento.timestamp || Date.now();

      const margen = 30000;

      const duplicado = await Event.findOne({
        ip: evento.ip,

        tipo: evento.tipo,

        ipServer,

        inicio: {
          $gte: timestamp - margen,
          $lte: timestamp + margen,
        },
      });

      if (duplicado) {
        return;
      }

      const severidad =
        evento.severidad ||
        (evento.tipo === "CLIENT_RECOVERED" ? "INFO" : "WARNING");

      await Event.create({
        idEvento:
          evento.idEvento ||
          `${evento.ip}_${evento.tipo}_${Math.floor(timestamp / 10000)}`,

        tipo: evento.tipo,
        severidad,
        nivel: evento.nivel || null,
        ap: evento.ap,
        ip: evento.ip,
        ipServer,
        estado: "INFO",
        inicio: timestamp,
        fin: evento.fin || timestamp,
        duracion: evento.duracion || 0,
        mensaje: evento.mensaje,
      });

      return;
    }

    /*
    =======================================================================
    AP_OFFLINE
    =======================================================================
    */

    const EVENTOS_PERSISTENTES = ["AP_OFFLINE", "CPU_HIGH", "CPU_CRITICAL"];

    if (!EVENTOS_PERSISTENTES.includes(evento.tipo)) {
      return;
    }

    if (evento.estado === "RECUPERADO" || evento.tipo === "CPU_RECOVERED") {
      await Event.findOneAndUpdate(
        {
          idEvento: evento.idEvento,
          ipServer,
        },
        {
          estado: "RECUPERADO",
          fin: evento.fin,
          duracion: evento.duracion,
          mensaje: evento.mensaje,
          activo: false,
          tipo: evento.tipo,
        },
        {
          returnDocument: "after",
        },
      );

      return;
    }

    /*
    =======================================================================
    ACTUALIZAR (CPU_HIGH ↔ CPU_CRITICAL)
    =======================================================================
    */

    if (evento.estado === "ACTUALIZAR") {
      await Event.findOneAndUpdate(
        {
          idEvento: evento.idEvento,
          ipServer,
        },
        {
          tipo: evento.tipo,
          severidad: evento.severidad,
          estado: "ACTIVO",
          mensaje: evento.mensaje,
          cpu: evento.cpu,
        },
        {
          returnDocument: "after",
        },
      );

      return;
    }

    if (evento.estado === "ACTIVO" && evento.idEvento) {
      await Event.findOneAndUpdate(
        {
          idEvento: evento.idEvento,
          ipServer,
        },
        {
          tipo: evento.tipo,
          severidad: evento.severidad,
          mensaje: evento.mensaje,
          cpu: evento.cpu,
        },
        {
          returnDocument: "after",
        },
      );

      return;
    }

    await Event.create({
      idEvento: evento.idEvento,
      tipo: evento.tipo,
      severidad: evento.severidad || "CRITICAL",
      nivel: evento.nivel || null,
      ap: evento.ap,
      ip: evento.ip,
      ipServer,
      estado: "ACTIVO",
      inicio: evento.inicio || Date.now(),
      mensaje: evento.mensaje,
    });
  } catch (error) {
    console.error("Error al guardar historial:", error.message);
  }
}

/**
 * ============================================================================
 * HISTORIAL DE UN AP
 * ============================================================================
 */
export async function obtenerHistorialPorIpMongo(ip, ipServer) {
  try {
    return await Event.find({
      ip,
      ipServer,
    })
      .sort({ inicio: -1 })
      .lean();
  } catch (error) {
    console.error("Error consultando historial:", error);

    return [];
  }
}
