// ./src/config/db.js
import mongoose from "mongoose";

export async function conectarDB() {
    try {
        const uri = process.env.MONGO_URI;
        
        if (!uri) {
            throw new Error("La variable de entorno MONGO_URI no está definida.");
        }

        await mongoose.connect(uri);
        console.log("📦 Base de datos conectada con éxito");
    } catch (error) {
        console.error("[-] Error al conectar a la Base de Datos:", error.message);
        process.exit(1);
    }
}