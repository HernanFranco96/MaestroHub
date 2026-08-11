import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
    ipServer: { type: String, required: true },
    ip: { type: String },
    mac: { type: String, required: true, unique: true },
    serial: { type: String },
    name: { type: String },
    model: { type: String },
    tipo: { type: String, default: "epmp" },
    sitio: { type: String },
    nodo: { type: String },
    firmware: { type: String },
    lstUpd: { type: Number },
}, { timestamps: true });

export default mongoose.model("Device", deviceSchema);