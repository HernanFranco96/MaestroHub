import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    // UUID único para cada ocurrencia de la alarma
    idEvento: {
      type: String,
      required: true,
      index: true,
    },

    tipo: {
      type: String,
      required: true,
    },

    severidad: {
      type: String,
      required: true,
    },

    nivel: {
      type: String,
    },

    ap: {
      type: String,
    },

    ip: {
      type: String,
      required: true,
    },

    ipServer: {
      type: String,
      required: true,
    },

    estado: {
      type: String,
      enum: ["ACTIVO", "RECUPERADO", "INFO"],
      default: "ACTIVO",
    },

    inicio: {
      type: Number,
      required: true,
    },

    fin: Number,

    duracion: Number,

    mensaje: String,
  },
  {
    timestamps: true,
  },
);

eventSchema.index({
  ipServer: 1,
  estado: 1,
  tipo: 1,
});

eventSchema.index({
  ipServer: 1,
  ip: 1,
  inicio: -1,
});

export const Event = mongoose.model("Event", eventSchema);
