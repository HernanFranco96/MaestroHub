import dotenv from "dotenv";

import express from "express";
import http from "http";
import cors from "cors";

dotenv.config();

import { conectarDB } from "./src/config/db.js";
import indexRoutes from "./src/routes/index.routes.js";
import apRoutes from "./src/routes/aps.routes.js";
import { iniciarCronCapturas } from "./src/jobs/capturas.job.js";
import { initSocket } from "./src/services/socket.service.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

await conectarDB();

const app = express();
const server = http.createServer(app);

// Inicializamos el servicio de WebSockets
const io = initSocket(server);

app.use(cors());
app.use(express.json());

app.use("/api", indexRoutes);
app.use("/api", apRoutes);

app.set("io", io);

iniciarCronCapturas(io);

server.listen(PORT, HOST, () => {
  console.log(`🚀 API y WebSockets escuchando en puerto ${PORT}`);
});
