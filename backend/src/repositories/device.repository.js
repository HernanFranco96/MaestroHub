// ./src/repositories/device.repository.js
import Device from "../models/device.model.js";
import { Metric } from "../models/metric.model.js";

export async function obtenerEstadoActualMongo(ipServer) {
  const devices = await Device.find({ ipServer });
  const historicoAcumulado = {};

  for (const dev of devices) {
    const muestras = await Metric.find({ device: dev._id })
      .sort({ timestamp: -1 })
      .lean();

    // Asegurar que usamos una clave válida (si dev.ip es undefined, usar dev.mac como respaldo)
    const claveUnica = dev.ip || dev.mac;

    historicoAcumulado[claveUnica] = {
      id: dev._id,
      ip: dev.ip,
      serial: dev.serial,
      mac: dev.mac,
      name: dev.name,
      model: dev.model,
      tipo: dev.tipo,
      sitio: dev.sitio,
      nodo: dev.nodo,
      firmware: dev.firmware,
      lstUpd: dev.lstUpd,
      muestras: muestras.reverse(),
    };
  }
  return historicoAcumulado;
}

export async function guardarDatosProcesadosMongo(
  ipServer,
  historicoProcesado,
) {
  // Nota: Como el procesador usa IP como clave, iteramos por IP (o renombramos la variable por claridad)
  for (const ipKey in historicoProcesado) {
    const item = historicoProcesado[ipKey];

    // 1. Guardar o actualizar el dispositivo usando la MAC como identificador único
    const deviceDoc = await Device.findOneAndUpdate(
      { mac: item.mac },
      {
        ipServer,
        ip: item.ip,
        serial: item.serial,
        name: item.name,
        model: item.model,
        tipo: item.tipo,
        sitio: item.sitio,
        nodo: item.nodo,
        firmware: item.firmware,
        lstUpd: item.lstUpd,
      },
      { upsert: true, returnDocument: "after" },
    );

    // 2. Registrar la última muestra asegurando que no se duplique por timestamp exacto
    const ultimaMuestra = item.muestras[item.muestras.length - 1];
    if (ultimaMuestra && deviceDoc) {
      const existeMuestra = await Metric.findOne({
        device: deviceDoc._id,
        timestamp: ultimaMuestra.timestamp,
      });

      if (!existeMuestra) {
        await Metric.create({
          device: deviceDoc._id,
          ipServer,
          ...ultimaMuestra,
        });
      }
    }
  }
}
