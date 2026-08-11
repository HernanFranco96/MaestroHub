// ./src/lib/procesador.aps.js
import { apExcluido } from "./excluidos.js";
import { randomUUID } from "crypto";

export function procesarDatosAPs(
  devicesRaw,
  historicoAcumulado,
  alarmasActivasMap = {},
  ipServer,
) {
  const nuevosAPs = devicesRaw.filter((d) => {
    if (d.mode !== "ap") return false;
    const modelo = (d.model || "").toLowerCase();
    if (modelo.includes("sms")) return false;
    return modelo.includes("450") || modelo.includes("epmp");
  });

  const mapaAPs = new Map();
  for (const ap of nuevosAPs) {
    const ip = ap.net?.ip;
    if (ip) mapaAPs.set(ip, ap);
  }
  const aps = [...mapaAPs.values()];

  const timestampCaptura = Date.now();
  const horaString = new Date().toLocaleTimeString();
  const eventosNuevos = [];

  aps.forEach((d) => {
    const ip = d.net?.ip;
    if (!ip || apExcluido(ip)) return;

    const modeloLower = (d.model || "").toLowerCase();
    let tipo = "epmp";
    if (modeloLower.includes("450m")) tipo = "pmp450m";
    else if (modeloLower.includes("450i")) tipo = "pmp450i";
    else if (modeloLower === "450") tipo = "pmp450";

    let beamWidth =
      tipo === "pmp450"
        ? 60
        : tipo === "pmp450i" || tipo === "pmp450m"
          ? 90
          : null;

    if (!historicoAcumulado[ip]) {
      historicoAcumulado[ip] = {
        ip: ip,
        serial: d.sn,
        mac: d.mac,
        name: d.cfg?.name || d.name || "Sin nombre",
        model: d.model || "N/A",
        tipo: tipo,
        sitio: d.tid,
        nodo: d.nid,
        firmware: d.mgmt?.actSw || "N/A",
        beamWidth: beamWidth,
        azimuth: d.cfg?.azimuth != null ? Number(d.cfg.azimuth) : null,
        maxRangeKm: d.cfg?.maxrange != null ? Number(d.cfg.maxrange) : null,
        maxRangeMiles:
          d.cfg?.maxrange != null ? Number(d.cfg.maxrange) * 0.621371 : null,
        lstUpd: d.lstUpd || null,
        muestras: [],
      };
    }

    historicoAcumulado[ip].lstUpd = d.lstUpd || historicoAcumulado[ip].lstUpd;

    const statusActual = d.sys?.online ? "ONLINE" : "OFFLINE";

    const muestra = {
      hora: horaString,
      timestamp: timestampCaptura,
      status: statusActual,
    };

    if (d.radio?.dlTPut != null) muestra.dlTPut = Number(d.radio.dlTPut);
    if (d.radio?.ulTPut != null) muestra.ulTPut = Number(d.radio.ulTPut);

    if (beamWidth !== null) historicoAcumulado[ip].beamWidth = beamWidth;
    if (d.cfg?.azimuth != null)
      historicoAcumulado[ip].azimuth = Number(d.cfg.azimuth);
    if (d.cfg?.maxrange != null) {
      historicoAcumulado[ip].maxRangeKm = Number(d.cfg.maxrange);
      historicoAcumulado[ip].maxRangeMiles = Number(d.cfg.maxrange) * 0.621371;
    }

    if (d.online != null) {
      muestra.clientsOnline = Number(d.online);
    } else if (d.sys?.nosta != null) {
      // Compatibilidad con firmware antiguos
      muestra.clientsOnline = Number(d.sys.nosta);
    }

    if (d.offline != null) {
      muestra.clientsOffline = Number(d.offline);
    }

    if (d.totalDevices != null) {
      muestra.clientsTotal = Number(d.totalDevices);
    }

    let cpu = d.sys?.cpus ?? d.sys?.cpu ?? null;

    if (Array.isArray(cpu)) {
      cpu = cpu.reduce((a, b) => a + Number(b || 0), 0) / cpu.length;
    }

    cpu = Number(cpu);

    if (Number.isFinite(cpu) && cpu >= 0 && cpu <= 100) {
      muestra.cpu = cpu;
    } else {
      muestra.cpu = null;
    }

    /*
==========================================================
NOTA: las alarmas de CPU (CPU_HIGH / CPU_CRITICAL) NO se generan acá.
Ese trabajo lo hace exclusivamente `analizarCPU` (lib/analisis/cpu.js),
que respeta el umbral por perfil de cada modelo de AP. Antes había un
segundo motor de alarmas de CPU acá mismo con umbrales fijos (90/75)
que no coincidían con los umbrales por perfil, generando alarmas que
se creaban y "recuperaban" en el mismo ciclo (falsos positivos).
==========================================================
*/

    if (d.sys?.temperature != null)
      muestra.temperature = Number(d.sys.temperature);

    const dlFrmUtil = d.radio?.dlFrmUtil ?? d.radio?.dlframeutil;
    if (dlFrmUtil != null) muestra.dlFrmUtil = Number(dlFrmUtil);
    const ulFrmUtil = d.radio?.ulFrmUtil ?? d.radio?.ulframeutil;
    if (ulFrmUtil != null) muestra.ulFrmUtil = Number(ulFrmUtil);

    if (d.radio?.dlPktLossPer != null)
      muestra.dlPktLossPer = Number(d.radio.dlPktLossPer);
    if (d.radio?.ulPktLossPer != null)
      muestra.ulPktLossPer = Number(d.radio.ulPktLossPer);
    if (d.radio?.dlRetransPktsPer != null)
      muestra.dlRetransPktsPer = Number(d.radio.dlRetransPktsPer);
    if (d.radio?.ulRetransPktsPer != null)
      muestra.ulRetransPktsPer = Number(d.radio.ulRetransPktsPer);
    if (d.radio?.dlCapDropPktsPer != null)
      muestra.dlCapDropPktsPer = Number(d.radio.dlCapDropPktsPer);
    if (d.radio?.ulCapDropPktsPer != null)
      muestra.ulCapDropPktsPer = Number(d.radio.ulCapDropPktsPer);
    if (d.radio?.rfFreq != null) muestra.rfFreq = Number(d.radio.rfFreq);
    if (d.radio?.chWidth != null) muestra.chWidth = d.radio.chWidth;
    if (d.radio?.txPower != null) muestra.txPower = Number(d.radio.txPower);

    if (d.radio?.dlSumimo != null) muestra.dlSumimo = Number(d.radio.dlSumimo);
    if (d.radio?.dlMumimo != null) muestra.dlMumimo = Number(d.radio.dlMumimo);
    if (d.radio?.ulSumimo != null) muestra.ulSumimo = Number(d.radio.ulSumimo);
    if (d.radio?.ulMumimo != null) muestra.ulMumimo = Number(d.radio.ulMumimo);
    if (d.radio?.dlMultiplexGain != null)
      muestra.dlMultiplexGain = Number(d.radio.dlMultiplexGain);
    if (d.radio?.ulMultiplexGain != null)
      muestra.ulMultiplexGain = Number(d.radio.ulMultiplexGain);

    const uptimeRaw = d.uptime ?? d.sys?.uptime ?? d.sys?.upTime;
    if (uptimeRaw != null) {
      let uptimeSegundos = null;
      if (typeof uptimeRaw === "number") {
        uptimeSegundos = uptimeRaw;
      } else {
        const inicio = new Date(uptimeRaw);
        if (!isNaN(inicio)) {
          uptimeSegundos = Math.floor((Date.now() - inicio.getTime()) / 1000);
        }
      }
      if (uptimeSegundos != null) muestra.uptime = uptimeSegundos;
    }

    const muestras = historicoAcumulado[ip].muestras;
    const ultimaMuestra = muestras.at(-1);

    // --- GESTIÓN DE RECUPERACIÓN Y ESTADOS DEL AP ---

    if (statusActual === "ONLINE") {
      const alarmaOffline = Object.values(alarmasActivasMap).find(
        (alarma) =>
          alarma.ip === ip &&
          alarma.tipo === "AP_OFFLINE" &&
          alarma.estado === "ACTIVO",
      );

      if (alarmaOffline) {
        alarmaOffline.estado = "RECUPERADO";
        alarmaOffline.fin = timestampCaptura;
        alarmaOffline.duracion = timestampCaptura - alarmaOffline.inicio;
        alarmaOffline.activo = false;
        alarmaOffline.mensaje = `Dispositivo ${historicoAcumulado[ip].name} recuperado de OFFLINE tras ${alarmaOffline.duracion}ms`;

        eventosNuevos.push({ ...alarmaOffline });

        delete alarmasActivasMap[alarmaOffline.idEvento];
      }
    } else if (statusActual === "OFFLINE") {
      const yaExisteOfflineActivo = Object.values(alarmasActivasMap).some(
        (alarma) =>
          alarma.ip === ip &&
          alarma.tipo === "AP_OFFLINE" &&
          alarma.estado === "ACTIVO",
      );

      if (!yaExisteOfflineActivo) {
        const nuevaAlarmaOffline = {
          idEvento: randomUUID(),
          tipo: "AP_OFFLINE",
          severidad: "CRITICAL",
          ap: historicoAcumulado[ip].name,
          ip,
          ipServer,
          estado: "ACTIVO",
          nivel: null,
          inicio: timestampCaptura,
          activo: true,
          mensaje: `${historicoAcumulado[ip].name} se encuentra OFFLINE`,
        };

        alarmasActivasMap[nuevaAlarmaOffline.idEvento] = nuevaAlarmaOffline;
        eventosNuevos.push(nuevaAlarmaOffline);
      }
    }
    const existeMuestra =
      ultimaMuestra && ultimaMuestra.timestamp === muestra.timestamp;
    if (!existeMuestra) {
      muestras.push(muestra);
    }
  });

  return {
    historico: historicoAcumulado,
    eventosNuevos,
    alarmasActualizadas: alarmasActivasMap,
  };
}
