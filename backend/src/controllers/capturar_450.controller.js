// ./src/controllers/capturar_450.controller.js

import "dotenv/config";
import { consultarCnMaestro } from "../services/cnmaestro.service.js";
import {
  obtenerEstadoActualMongo,
  guardarDatosProcesadosMongo,
} from "../repositories/device.repository.js";
import {
  guardarHistorialMongo,
  obtenerAlarmasActivasMongo,
  guardarAlarmasActivasMongo,
} from "../repositories/event.repository.js";
import { procesarDatosAPs } from "../lib/procesador.aps.js";
import { getIO } from "../services/socket.service.js";
import { procesarMonitoreoDeAPs } from "../services/monitor.service.js";

const CREDENCIALES = {
  username: process.env.CNMAESTRO_USER,
  password: process.env.CNMAESTRO_PASS,
};

if (!CREDENCIALES.username || !CREDENCIALES.password) {
  throw new Error(
    "[capturar_450] Faltan CNMAESTRO_USER / CNMAESTRO_PASS en las variables de entorno.",
  );
}

const CAMPOS_COMUNES =
  "tid,nid,mac,pmac,eType,mode,loc,online,offline,totalDevices,sys.online,sys.nosta,sys.cpus,sys.prodName,mgmt,onboarding,cfg,net,model,name,sw_version,uptime,lstUpd,sn,radio.dlTPut,radio.ulTPut,radio.dlframeutil,radio.ulframeutil,radio.dlRetransPktsPer,radio.chWidth,radio.txPower,radio.rfFreq,gps.numTracked,radio.dlMCS,radio.ulMCS";

/**
 * Función centralizada para procesar la captura de cualquier servidor cnMaestro
 * @param {string} ipServer - Dirección IP del servidor (ej. "10.10.128.106")
 */
async function ejecutarCaptura(ipServer) {
  try {
    console.log(
      `[*] [${new Date().toLocaleTimeString()}] Iniciando captura en ${ipServer}...`,
    );

    // 1. Consultar API de cnMaestro
    const devicesRaw = await consultarCnMaestro(
      ipServer,
      CREDENCIALES,
      CAMPOS_COMUNES,
    );

    // 2. Obtener estado histórico actual de dispositivos desde MongoDB
    let historico = await obtenerEstadoActualMongo(ipServer);

    // 3. OBTENER LAS ALARMAS ACTIVAS ACTUALES
    let alarmasActivasMap = await obtenerAlarmasActivasMongo(ipServer);

    // 4. Procesar datos pasándole también el mapa de alarmas activas
    const {
      historico: historicoActualizado,
      eventosNuevos,
      alarmasActualizadas,
    } = procesarDatosAPs(devicesRaw, historico, alarmasActivasMap, ipServer);

    const eventosClientes = await procesarMonitoreoDeAPs(
      Object.values(historicoActualizado),
      alarmasActualizadas,
      ipServer,
    );

    const todosLosEventos = [...eventosNuevos, ...(eventosClientes ?? [])];

    for (const evento of todosLosEventos) {
      await guardarHistorialMongo(evento, ipServer);
    }

    // 5. Guardar dispositivos, métricas y alarmas
    await guardarDatosProcesadosMongo(ipServer, historicoActualizado);
    await guardarAlarmasActivasMongo(ipServer, alarmasActualizadas);

    // 6. Emitir por WebSocket si hubo eventos nuevos
    if (eventosNuevos.length > 0) {
      const io = getIO();

      io.emit("actualizacion-dispositivos", eventosNuevos);

      console.log(
        `[!] Se emitieron ${eventosNuevos.length} evento(s) para ${ipServer}`,
      );
    }

    console.log(`[+] Proceso finalizado exitosamente para ${ipServer}`);
  } catch (error) {
    console.error(`[-] Error crítico en ejecución para ${ipServer}:`, error);
  }
}

// Exportamos funciones independientes para mantener compatibilidad con tus Cron / Schedulers actuales
export async function extraerAPs106() {
  await ejecutarCaptura("10.10.128.106");
}

export async function extraerAPs107() {
  await ejecutarCaptura("10.10.128.107");
}
