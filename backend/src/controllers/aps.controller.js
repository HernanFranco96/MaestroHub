import { obtenerHistorialPorIpMongo } from "../repositories/event.repository.js";
import { Metric } from "../models/metric.model.js";
import Device from "../models/device.model.js";
import { normalizeMetric } from "../utils/normalizeMetric.js";

export async function obtenerDetalleApPorIp(req, res) {
  try {
    const { ip } = req.params;

    // Buscar el dispositivo
    const dispositivo = await Device.findOne({ ip }).lean();

    if (!dispositivo) {
      return res.status(404).json({
        success: false,
        message: `No existe un AP con IP ${ip}`,
      });
    }

    const muestrasHistoricas = await Metric.find({
      device: dispositivo._id,
    })
      .sort({ timestamp: 1 })
      .lean();

    const normalizadas = muestrasHistoricas.map(normalizeMetric);

    // Obtener eventos
    const eventosHistoricos = await obtenerHistorialPorIpMongo(
      ip,
      dispositivo.ipServer,
    );

    return res.status(200).json({
      success: true,
      data: {
        device: dispositivo,
        muestras: muestrasHistoricas,
        eventos: eventosHistoricos,
      },
    });
  } catch (error) {
    console.error("Error al obtener detalle del AP:", error);

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
}
