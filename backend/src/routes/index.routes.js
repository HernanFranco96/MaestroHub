// index.routes.js corregido
import { Router } from "express";
import Device from "../models/device.model.js";
import { Event } from "../models/event.model.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({
        status: "OK",
        service: "Monitor API",
        timestamp: new Date()
    });
});

router.get("/status", (req, res) => {
    res.json({
        cron: "activo",
        hora: new Date()
    });
});

router.get("/devices", async (req, res) => {
    try {
        const devices = await Device.aggregate([
            {
                $lookup: {
                    from: "metrics",
                    let: { deviceId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$device", "$$deviceId"] } } },
                        { $sort: { timestamp: -1 } },
                        { $limit: 5 }
                    ],
                    as: "muestras"
                }
            },
            {
                $addFields: {
                    ultimaMuestra: { $first: "$muestras" },
                    promedioDl: { $avg: "$muestras.dlTPut" },
                    promedioUl: { $avg: "$muestras.ulTPut" },
                    promedioClientes: { $avg: "$muestras.clientsOnline" },
                    promedioFrameDL: { $avg: "$muestras.dlFrmUtil" },
                    promedioFrameUL: { $avg: "$muestras.ulFrmUtil" }
                }
            }
        ]);
        
        res.json(devices);
    } catch (error) {
        console.error("Error al obtener dispositivos con métricas:", error.message);
        res.status(500).json({ error: "Error al obtener los dispositivos" });
    }
});

router.get("/metrics", async (req, res) => {
    try {
        // Opcional: si quieres que /metrics use el mismo criterio de estado online basado en la última muestra
        const devices = await Device.aggregate([
            {
                $lookup: {
                    from: "metrics",
                    let: { deviceId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$device", "$$deviceId"] } } },
                        { $sort: { timestamp: -1 } },
                        { $limit: 1 }
                    ],
                    as: "ultima"
                }
            },
            {
                $addFields: {
                    statusUltima: { $toUpper: { $ifNull: [{ $getField: { field: "status", input: { $first: "$ultima" } } }, "SIN DATOS"] } }
                }
            }
        ]);

        const totalDevices = devices.length;
        const onlineDevices = devices.filter(d => d.statusUltima === "ONLINE").length;
        const offlineDevices = devices.filter(d => d.statusUltima === "OFFLINE").length;

        res.json([
            { title: "Total Devices", value: totalDevices },
            { title: "Online", value: onlineDevices },
            { title: "Offline", value: offlineDevices }
        ]);
    } catch (error) {
        console.error("Error al obtener métricas:", error.message);
        res.status(500).json({ error: "Error al obtener las métricas" });
    }
});

router.get("/events", async (req, res) => {
    try {
        const eventosActivos = await Event.aggregate([
            { $sort: { inicio: -1 } },
            // { $limit: 200 },
            {
                $lookup: {
                    from: "devices",
                    let: { deviceIp: "$ip" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$ip", "$$deviceIp"] } } }
                    ],
                    as: "deviceInfo"
                }
            },
            {
                $addFields: {
                    device: { $first: "$deviceInfo" }
                }
            },
            {
                $lookup: {
                    from: "metrics",
                    let: { devId: "$device._id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$device", "$$devId"] } } },
                        { $sort: { timestamp: -1 } },
                        { $limit: 5 }
                    ],
                    as: "muestras"
                }
            },
            { $project: { deviceInfo: 0 } }
        ]);

        // console.log(eventosActivos)
        res.json(eventosActivos);
    } catch (error) {
        console.error("Error al obtener eventos:", error.message);
        res.status(500).json({ error: "Error al obtener los eventos" });
    }
});

export default router;