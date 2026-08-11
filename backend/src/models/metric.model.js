// ./src/models/metric.model.js
import mongoose from "mongoose";

const metricSchema = new mongoose.Schema({
    device: { type: mongoose.Schema.Types.ObjectId, ref: "Device", required: true },
    ipServer: { type: String, required: true },
    timestamp: { type: Number, required: true },
    hora: { type: String },
    status: { type: String },
    dlTPut: { type: Number },
    ulTPut: { type: Number },
    dlFrmUtil: { type: Number },
    ulFrmUtil: { type: Number },
    channelWidth: { type: Number },
    txPower: { type: Number },
    rfFreq: { type: Number },
    clientsOnline: { type: Number },
    clientsOffline: { type: Number },
    clientsTotal: { type: Number },
    nosta: { type: Number },
    cpu: { type: Number },
    temperature: { type: Number },
    dlPktLossPer: { type: Number },
    ulPktLossPer: { type: Number },
    dlRetransPktsPer: { type: Number },
    ulRetransPktsPer: { type: Number },
    dlCapDropPktsPer: { type: Number },
    ulCapDropPktsPer: { type: Number },
    chWidth: { type: mongoose.Schema.Types.Mixed },
    dlSumimo: { type: Number },
    dlMumimo: { type: Number },
    ulSumimo: { type: Number },
    ulMumimo: { type: Number },
    dlMultiplexGain: { type: Number },
    ulMultiplexGain: { type: Number },
    uptime: { type: Number }
}, { 
    timestamps: true,
    strict: false // Permite guardar campos adicionales si el procesador envía alguno nuevo sin definir
});

metricSchema.index({
    device: 1,
    timestamp: -1
});

export const Metric = mongoose.model("Metric", metricSchema);