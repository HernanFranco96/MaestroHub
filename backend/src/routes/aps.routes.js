// ./src/routes/aps.routes.js s
import { Router } from "express";
import { obtenerDetalleApPorIp } from "../controllers/aps.controller.js";

const router = Router();

router.get("/ap/:ip", obtenerDetalleApPorIp);

export default router;