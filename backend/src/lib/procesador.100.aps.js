// ./src/lib/procesador.100.aps.js

import { apExcluido } from "./excluidos.js";
import { randomUUID } from "crypto";

export function procesarDatosAPs100(
  devicesRaw,
  historicoAcumulado,
  alarmasActivasMap = {},
  ipServer,
) {
  const accessPoints = devicesRaw.filter((device) => {
    if (device.mode !== "ap") return false;

    const modelo =
      device.model ||
      device.onboarding?.device?.class ||
      device.onboarding?.device?.model ||
      "ePMP";

    return !modelo.toLowerCase().includes("sms");
  });

  const eventosNuevos = [];

  for (const device of accessPoints) {
    const timestamp = Date.now();

    const fecha = new Date(timestamp);

    const hora = `${String(fecha.getHours()).padStart(2, "0")}:${String(
      fecha.getMinutes(),
    ).padStart(2, "0")}:${String(fecha.getSeconds()).padStart(2, "0")}`;

    const ip = device.net?.ip;

    if (!ip || apExcluido(ip)) continue;

    /*
    ==========================================================
    CREAR HISTORICO SI NO EXISTE
    ==========================================================
    */

    const modelo =
      device.model ||
      device.onboarding?.device?.class ||
      device.onboarding?.device?.model ||
      device.sys?.prodName ||
      "";

    const modeloLower = modelo.toLowerCase();

    let tipo = "epmp";
    if (modeloLower.includes("450m")) tipo = "pmp450m";
    else if (modeloLower.includes("450i")) tipo = "pmp450i";
    else if (modeloLower.includes("450")) tipo = "pmp450";
    else if (modeloLower.includes("ltu")) tipo = "ltu";

    if (!historicoAcumulado[ip]) {
      historicoAcumulado[ip] = {
        ip,
        serial: device.sn || device.onboarding?.device?.sn || null,
        mac: device.mac,
        name: device.cfg?.name || device.name || "Sin nombre",
        model: device.model || device.sys?.prodName || "ePMP",
        tipo,
        sitio: device.tid || device.onboarding?.device?.tid || null,
        nodo: device.nid || device.onboarding?.device?.nid || null,
        firmware: device.mgmt?.actSw || "N/A",
        lstUpd: device.lstUpd,
        muestras: [],
      };
    } else {
      // Recalcular el tipo también en capturas siguientes, por si el modelo
      // no estaba disponible en el primer ciclo o cambió el dispositivo en esa IP.
      historicoAcumulado[ip].tipo = tipo;
      historicoAcumulado[ip].model =
        device.model || device.sys?.prodName || historicoAcumulado[ip].model;
    }

    /*
    ==========================================================
    DATOS DE CLIENTES
    ==========================================================
    */

    const online =
      device.online != null
        ? Number(device.online)
        : Number(device.sys?.nosta ?? 0);

    const offline = Number(device.offline ?? 0);

    const total =
      device.totalDevices != null
        ? Number(device.totalDevices)
        : online + offline;

    /*
    ==========================================================
    ANCHO DE CANAL
    ==========================================================
    */

    const rawWidth = device.radio?.chWidth ?? device.cfg?.radio?.chWidth ?? 20;

    let width = Number(rawWidth);

    if (width === 1) width = 20;
    if (width === 2) width = 40;
    if (width === 3) width = 80;

    /*
    ==========================================================
    NUEVA MUESTRA
    ==========================================================
    */

    const estado = device.sys?.online ? "ONLINE" : "OFFLINE";

    let cpu = device.sys?.cpus ?? device.sys?.cpu ?? null;

    if (Array.isArray(cpu)) {
      cpu = cpu.reduce((a, b) => a + Number(b || 0), 0) / cpu.length;
    }

    cpu = Number(cpu);

    if (!Number.isFinite(cpu) || cpu < 0 || cpu > 100) {
      cpu = null;
    }

    const nuevaMuestra = {
      hora,
      timestamp,
      status: estado,
      dlTPut: device.radio?.dlTPut != null ? Number(device.radio.dlTPut) : null,
      ulTPut: device.radio?.ulTPut != null ? Number(device.radio.ulTPut) : null,
      dlFrmUtil:
        device.radio?.dlframeutil != null
          ? Number(device.radio.dlframeutil)
          : null,
      channelWidth: width,
      txPower:
        device.radio?.txPower != null ? Number(device.radio.txPower) : null,
      rfFreq: device.radio?.rfFreq != null ? Number(device.radio.rfFreq) : null,
      clientsOnline: online,
      clientsOffline: offline,
      clientsTotal: total,
      cpu,
    };

    historicoAcumulado[ip].muestras.push(nuevaMuestra);

    historicoAcumulado[ip].lstUpd =
      device.lstUpd || historicoAcumulado[ip].lstUpd;

    if (historicoAcumulado[ip].muestras.length > 100)
      historicoAcumulado[ip].muestras.shift();

    // NOTA: las alarmas de CPU (CPU_HIGH / CPU_CRITICAL) NO se generan acá.
    // Ese trabajo lo hace exclusivamente `analizarCPU` (lib/analisis/cpu.js),
    // que respeta el umbral por perfil de cada modelo de AP. Antes había un
    // segundo motor de alarmas de CPU acá mismo con umbrales fijos (90/75)
    // que no coincidían con los umbrales por perfil, generando alarmas que
    // se creaban y "recuperaban" en el mismo ciclo (falsos positivos).

    /*
    ==========================================================
    RECUPERACION DEL AP
    ==========================================================
    */

    if (estado === "ONLINE") {
      for (const id in alarmasActivasMap) {
        const alarma = alarmasActivasMap[id];

        if (
          alarma.ip === ip &&
          alarma.tipo === "AP_OFFLINE" &&
          alarma.estado === "ACTIVO"
        ) {
          alarma.estado = "RECUPERADO";
          alarma.fin = timestamp;
          alarma.duracion = timestamp - alarma.inicio;
          alarma.activo = false;
          alarma.mensaje = `Access Point ${historicoAcumulado[ip].name} volvió a estar ONLINE`;
          eventosNuevos.push({ ...alarma });
          delete alarmasActivasMap[id];
        }
      }
    } else {
      /*
      ==========================================================
      NUEVA CAIDA
      ==========================================================
      */

      const existe = Object.values(alarmasActivasMap).some(
        (alarma) =>
          alarma.ip === ip &&
          alarma.tipo === "AP_OFFLINE" &&
          alarma.estado === "ACTIVO",
      );

      if (!existe) {
        const alarma = {
          idEvento: randomUUID(),
          tipo: "AP_OFFLINE",
          severidad: "CRITICAL",
          ap: historicoAcumulado[ip].name,
          ip,
          ipServer,
          estado: "ACTIVO",
          nivel: null,
          inicio: timestamp,
          activo: true,
          mensaje: `${historicoAcumulado[ip].name} se encuentra OFFLINE`,
        };
        alarmasActivasMap[alarma.idEvento] = alarma;
        eventosNuevos.push(alarma);
      }
    }
  }

  return {
    historico: historicoAcumulado,
    eventosNuevos,
    alarmasActualizadas: alarmasActivasMap,
  };
}
