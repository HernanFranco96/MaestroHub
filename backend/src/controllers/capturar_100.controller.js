// ./src/controllers/capturar_100.controller.js

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
import { procesarDatosAPs100 } from "../lib/procesador.100.aps.js";
import { getIO } from "../services/socket.service.js";
import { procesarMonitoreoDeAPs } from "../services/monitor.service.js";

const IP_SERVER = "181.225.12.100";
const CREDENCIALES = {
  username: process.env.CNMAESTRO_USER,
  password: process.env.CNMAESTRO_PASS,
};

if (!CREDENCIALES.username || !CREDENCIALES.password) {
  throw new Error(
    "[capturar_100] Faltan CNMAESTRO_USER / CNMAESTRO_PASS en las variables de entorno.",
  );
}
const CAMPOS_100 =
  "tid,nid,mac,pmac,eType,mode,loc,online,offline,totalDevices,sys.online,sys.nosta,sys.cpus,sys.prodName,mgmt,onboarding,cfg,net,model,name,sw_version,uptime,lstUpd,sn,radio.dlTPut,radio.ulTPut,radio.dlframeutil,radio.ulframeutil,radio.dlRetransPktsPer,radio.chWidth,radio.txPower,radio.rfFreq,gps.numTracked,radio.dlMCS,radio.ulMCS";

export async function extraerAPs() {
  try {
    console.log(
      `[*] [${new Date().toLocaleTimeString()}] Iniciando captura en ${IP_SERVER}...`,
    );

    // 1. Consultar API de cnMaestro
    const devicesRaw = await consultarCnMaestro(
      IP_SERVER,
      CREDENCIALES,
      CAMPOS_100,
    );

    // 2. Obtener estado histórico actual de dispositivos desde MongoDB
    let historico = await obtenerEstadoActualMongo(IP_SERVER);

    // 3. OBTENER LAS ALARMAS ACTIVAS ACTUALES (¡Aquí usas la primera función que no se usaba!)
    let alarmasActivasMap = await obtenerAlarmasActivasMongo(IP_SERVER);

    // 4. Procesar datos pasándole también el mapa de alarmas activas
    // (Tu procesador debería evaluar los APs y actualizar el alarmasActivasMap: creando o cerrando alarmas)
    const {
      historico: historicoActualizado,
      eventosNuevos,
      alarmasActualizadas,
    } = procesarDatosAPs100(
      devicesRaw,
      historico,
      alarmasActivasMap,
      IP_SERVER,
    );

    // 5. ¡AQUÍ INTEGRAS TU NUEVO SERVICIO DE MONITOREO DE CLIENTES!
    const eventosClientes = await procesarMonitoreoDeAPs(
      Object.values(historicoActualizado),
      alarmasActualizadas,
      IP_SERVER,
    );

    const todosLosEventos = [...eventosNuevos, ...(eventosClientes ?? [])];

    for (const evento of todosLosEventos) {
      await guardarHistorialMongo(evento, IP_SERVER);
    }

    // 6. Guardar dispositivos, métricas y alarmas como tenías planeado
    await guardarDatosProcesadosMongo(IP_SERVER, historicoActualizado);
    await guardarAlarmasActivasMongo(IP_SERVER, alarmasActualizadas);

    // 7. Si hubo eventos nuevos o cambios relevantes, los emitimos por WebSocket
    if (eventosNuevos.length > 0) {
      const io = getIO();

      io.emit("actualizacion-dispositivos", eventosNuevos);

      console.log(
        `[!] Se emitieron ${eventosNuevos.length} evento(s) para ${IP_SERVER}`,
      );
    }

    console.log(`[+] Proceso finalizado exitosamente para ${IP_SERVER}`);
  } catch (error) {
    console.error(`[-] Error crítico en ejecución para ${IP_SERVER}:`, error);
  }
}
