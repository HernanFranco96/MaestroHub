// ./src/services/socket.service.js

import { Server } from "socket.io";
import Device from "../models/device.model.js"; 
import { Event } from "../models/event.model.js";

let ioInstance = null;

export function initSocket(server) {
    ioInstance = new Server(server, {
        cors: {
            origin: "*", 
            methods: ["GET", "POST"]
        }
    });

    ioInstance.on("connection", async (socket) => {
        console.log(`⚡ Cliente conectado vía WebSockets: ${socket.id}`);

        try {
            const devices = await Device.aggregate([
                {
                    $addFields: {
                        stringId: { $toString: "$_id" }
                    }
                },
                {
                    $lookup: {
                        from: "metrics",
                        let: { devIdStr: "$stringId", devIdObj: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $or: [
                                            { $eq: ["$device", "$$devIdStr"] },
                                            { $eq: ["$device", "$$devIdObj"] }
                                        ]
                                    }
                                }
                            },
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
                        promedioClientes: { $avg: "$muestras.clientsOnline" }
                    }
                }
            ]);

            const totalDevices = devices.length;
            const onlineDevices = devices.filter(d => d.ultimaMuestra?.status?.toUpperCase() === "ONLINE").length;
            const offlineDevices = devices.filter(d => d.ultimaMuestra?.status?.toUpperCase() === "OFFLINE").length;

            const metrics = [
                { title: "Total Devices", value: totalDevices },
                { title: "Online", value: onlineDevices },
                { title: "Offline", value: offlineDevices }
            ];

            // const events = await Event.find().sort({ inicio: -1 }).limit(20);
            const events = await Event.find().sort({ inicio: -1 });

            socket.emit("actualizacion-dispositivos", {
                mensaje: "Sincronización inicial",
                devices,
                metrics,
                events,
                timestamp: new Date()
            });
        } catch (e) {
            console.error("Error enviando estado inicial al cliente:", e);
        }

        socket.on("disconnect", () => {
            console.log(`🔌 Cliente desconectado: ${socket.id}`);
        });
    });

    return ioInstance;
}

export function getIO() {
    if (!ioInstance) {
        throw new Error("Socket.io no ha sido inicializado.");
    }
    return ioInstance;
}

export async function broadcastActualizacion() {
    if (!ioInstance) return;

    try {
        const devices = await Device.aggregate([
            { $addFields: { stringId: { $toString: "$_id" } } },
            {
                $lookup: {
                    from: "metrics",
                    let: { devIdStr: "$stringId", devIdObj: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ["$device", "$$devIdStr"] },
                                        { $eq: ["$device", "$$devIdObj"] }
                                    ]
                                }
                            }
                        },
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
                    promedioClientes: { $avg: "$muestras.clientsOnline" }
                }
            }
        ]);

        const totalDevices = devices.length;
        const onlineDevices = devices.filter(d => d.ultimaMuestra?.status?.toUpperCase() === "ONLINE").length;
        const offlineDevices = devices.filter(d => d.ultimaMuestra?.status?.toUpperCase() === "OFFLINE").length;

        const metrics = [
            { title: "Total Devices", value: totalDevices },
            { title: "Online", value: onlineDevices },
            { title: "Offline", value: offlineDevices }
        ];

        // const events = await Event.find().sort({ inicio: -1 }).limit(20);
        const events = await Event.find().sort({ inicio: -1 });

        // Envía la actualización a TODOS los clientes conectados
        ioInstance.emit("actualizacion-dispositivos", {
            mensaje: "Actualización en tiempo real",
            devices,
            metrics,
            events,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Error haciendo broadcast por socket:", e);
    }
}