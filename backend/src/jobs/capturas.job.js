// ./src/jobs/capturas.job.js
import cron from "node-cron";
import { extraerAPs as extraer100 } from "../controllers/capturar_100.controller.js";
import {
  extraerAPs106,
  extraerAPs107,
} from "../controllers/capturar_450.controller.js";
import { broadcastActualizacion } from "../services/socket.service.js"; // <-- Importa esto

const tareasDeCaptura = [
  { nombre: "cnMaestro 181.225.12.100", ejecutar: extraer100 },
  { nombre: "cnMaestro 10.10.128.106", ejecutar: extraerAPs106 },
  { nombre: "cnMaestro 10.10.128.107", ejecutar: extraerAPs107 },
];

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let estaEjecutandose = false;

async function lanzarTodo() {
  if (estaEjecutandose) {
    console.warn(
      `[${new Date().toLocaleTimeString()}] ⚠️ Una ronda de captura anterior sigue en curso. Saltando este ciclo del cron.`,
    );
    return;
  }

  estaEjecutandose = true;
  console.log(
    `[${new Date().toLocaleTimeString()}] 🚀 Iniciando ronda de captura secuencial`,
  );

  try {
    for (const [index, tarea] of tareasDeCaptura.entries()) {
      try {
        console.log(
          `[${new Date().toLocaleTimeString()}] 🔄 Ejecutando: ${tarea.nombre}`,
        );
        await tarea.ejecutar();

        if (index < tareasDeCaptura.length - 1) {
          await esperar(4000);
        }
      } catch (error) {
        console.error(
          `[-] Error crítico ejecutando tarea de ${tarea.nombre}:`,
          error.message,
        );
      }
    }

    console.log(
      `[${new Date().toLocaleTimeString()}] FIN de ronda de captura. Emitiendo por WebSockets...`,
    );

    // Dispara el broadcast que se encarga de consultar la BD y enviar los datos por socket
    await broadcastActualizacion();
  } catch (dbError) {
    console.error("Error al procesar datos en el cron:", dbError);
  } finally {
    estaEjecutandose = false;
  }
}

export function iniciarCronCapturas() {
  lanzarTodo();
  cron.schedule("*/5 * * * *", () => lanzarTodo(), {
    timezone: "America/Argentina/Buenos_Aires",
  });
  console.log(
    "⏱ Cron de capturas activo (cada 5 minuto con intervalo de 4s entre fuentes y protección de concurrencia)",
  );
}
