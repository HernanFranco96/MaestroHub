import { guardarHistorialMongo } from "../repositories/event.repository.js";
import { analizarClientes } from "../lib/analisis/clientes.js";
import { analizarCPU } from "../lib/analisis/cpu.js";
import { broadcastActualizacion } from "./socket.service.js";

export async function procesarMonitoreoDeAPs(
  listaAPs,
  alarmasActivasMap,
  ipServer,
) {
  for (const ap of listaAPs) {
    /*
    ================================================================
    CPU
    ================================================================
    */

    const eventosCPU = analizarCPU(ap, alarmasActivasMap);

    for (const evento of eventosCPU) {
      await guardarHistorialMongo(evento, ipServer);
    }

    /*
    ================================================================
    CLIENTES
    ================================================================
    */

    const eventosClientes = analizarClientes(ap);

    for (const evento of eventosClientes) {
      await guardarHistorialMongo(evento, ipServer);
    }
  }

  await broadcastActualizacion();
}
