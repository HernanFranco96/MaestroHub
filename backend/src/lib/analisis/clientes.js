// ./src/lib/analisis/clientes.js

const PERFIL_PMP450 = {
  instantaneo: {
    minimoClientes: 20,
    perdidaAbsoluta: 15,
    perdidaPorcentaje: 20,
  },

  progresivo: {
    minimoClientes: 25,
    perdidaAbsoluta: 15,
    perdidaPorcentaje: 10,
    ventana: 4,
  },

  recuperacion: {
    aumentoMinimo: 10,
    porcentajeMinimo: 5,
  },

  cero: {
    minimoClientes: 10,
  },

  cpu: {
    warning: 80,
    critical: 95,
    recovery: 70,
    muestras: 3,
  },
};

const PERFILES = {
  epmp: {
    instantaneo: {
      minimoClientes: 10,
      perdidaAbsoluta: 8,
      perdidaPorcentaje: 40,
    },

    progresivo: {
      minimoClientes: 15,
      perdidaAbsoluta: 8,
      perdidaPorcentaje: 20,
      ventana: 4,
    },

    recuperacion: {
      aumentoMinimo: 5,
      porcentajeMinimo: 10,
    },

    cero: {
      minimoClientes: 5,
    },

    cpu: {
      warning: 80,
      critical: 95,
      recovery: 70,
      muestras: 3,
    },
  },

  pmp450: PERFIL_PMP450,

  pmp450i: PERFIL_PMP450,

  pmp450m: {
    instantaneo: {
      minimoClientes: 25,
      perdidaAbsoluta: 20,
      perdidaPorcentaje: 15,
    },

    progresivo: {
      minimoClientes: 30,
      perdidaAbsoluta: 20,
      perdidaPorcentaje: 10,
      ventana: 4,
    },

    recuperacion: {
      aumentoMinimo: 10,
      porcentajeMinimo: 5,
    },

    cero: {
      minimoClientes: 10,
    },

    cpu: {
      warning: 85,
      critical: 98,
      recovery: 75,
      muestras: 3,
    },
  },

  ltu: {
    instantaneo: {
      minimoClientes: 15,
      perdidaAbsoluta: 10,
      perdidaPorcentaje: 25,
    },

    progresivo: {
      minimoClientes: 20,
      perdidaAbsoluta: 10,
      perdidaPorcentaje: 15,
      ventana: 4,
    },

    recuperacion: {
      aumentoMinimo: 6,
      porcentajeMinimo: 8,
    },

    cero: {
      minimoClientes: 5,
    },

    cpu: {
      warning: 75,
      critical: 90,
      recovery: 65,
      muestras: 3,
    },
  },
};

export function obtenerPerfil(ap) {
  return PERFILES[ap.tipo] ?? PERFILES.epmp;
}

export function analizarClientes(ap) {
  if (!ap.muestras || ap.muestras.length < 2) {
    return [];
  }

  // Regla 1: Si el AP está OFFLINE, no puede generar eventos de clientes
  const actual = ap.muestras.at(-1);
  if (!actual || actual.status !== "ONLINE") {
    return [];
  }

  const eventos = [];
  const timestampActual = Date.now();

  const instantaneos = analizarCaidaInstantanea(ap);
  for (const ev of instantaneos) {
    eventos.push({
      ...ev,
      estado: "INFO",
      activo: false,
      inicio: ev.inicio || ev.timestamp || timestampActual,
      fin: ev.fin || ev.timestamp || timestampActual,
      duracion: 0,
    });
  }

  if (eventos.length === 0) {
    const progresivos = analizarCaidaProgresiva(ap);
    for (const ev of progresivos) {
      eventos.push({
        ...ev,
        estado: "INFO",
        activo: false,
        inicio: ev.inicio || ev.timestamp || timestampActual,
        fin: ev.fin || ev.timestamp || timestampActual,
        duracion: 0,
      });
    }
  }

  const ceros = analizarClientesCero(ap);
  for (const ev of ceros) {
    eventos.push({
      ...ev,
      estado: "INFO",
      activo: false,
      inicio: ev.inicio || ev.timestamp || timestampActual,
      fin: ev.fin || ev.timestamp || timestampActual,
      duracion: 0,
    });
  }

  const crecimientos = analizarCrecimiento(ap);
  for (const ev of crecimientos) {
    eventos.push({
      ...ev,
      estado: "INFO",
      activo: false,
      inicio: ev.inicio || ev.timestamp || timestampActual,
      fin: ev.fin || ev.timestamp || timestampActual,
      duracion: 0,
    });
  }

  return eventos;
}

function analizarCaidaInstantanea(ap) {
  const eventos = [];
  const muestras = ap.muestras;

  if (muestras.length < 2) return eventos;

  const perfil = obtenerPerfil(ap);

  const actual = muestras.at(-1);
  const anterior = muestras.at(-2);

  if (actual.status !== "ONLINE" || anterior.status !== "ONLINE") {
    return eventos;
  }

  const clientesAntes = Number(anterior.clientsOnline ?? 0);
  const clientesAhora = Number(actual.clientsOnline ?? 0);

  if (clientesAntes < perfil.instantaneo.minimoClientes) {
    return eventos;
  }

  const perdidos = clientesAntes - clientesAhora;

  if (perdidos <= 0) {
    return eventos;
  }

  const porcentaje = (perdidos / clientesAntes) * 100;

  if (
    perdidos >= perfil.instantaneo.perdidaAbsoluta ||
    porcentaje >= perfil.instantaneo.perdidaPorcentaje
  ) {
    const evento = {
      tipo: "CLIENT_DROP_INSTANT",
      severidad:
        porcentaje >= perfil.instantaneo.perdidaPorcentaje * 2
          ? "CRITICAL"
          : "WARNING",
      ap: ap.name,
      ip: ap.ip,
      clientesAntes,
      clientesAhora,
      perdidos,
      porcentaje: porcentaje.toFixed(1),
      mensaje: `${ap.name} perdió ${perdidos} clientes (${clientesAntes} → ${clientesAhora}, ${porcentaje.toFixed(1)}%)`,
      timestamp: Date.now(),
    };

    eventos.push(evento);
  }

  return eventos;
}

function analizarCaidaProgresiva(ap) {
  const eventos = [];
  const muestras = ap.muestras;

  const perfil = obtenerPerfil(ap);

  if (muestras.length < perfil.progresivo.ventana) {
    return eventos;
  }

  const ventana = muestras.slice(-perfil.progresivo.ventana);

  if (ventana.some((m) => m.status !== "ONLINE")) {
    return eventos;
  }

  const inicio = Number(ventana[0].clientsOnline ?? 0);
  const fin = Number(ventana.at(-1).clientsOnline ?? 0);

  if (inicio < perfil.progresivo.minimoClientes) {
    return eventos;
  }

  const descendente = ventana.every(
    (m, i) =>
      i === 0 ||
      Number(ventana[i - 1].clientsOnline ?? 0) >= Number(m.clientsOnline ?? 0),
  );

  if (!descendente) {
    return eventos;
  }

  const perdidos = inicio - fin;

  if (perdidos <= 0) {
    return eventos;
  }

  const porcentaje = (perdidos / inicio) * 100;

  // Evitar duplicar un evento que ya clasifica como instantáneo
  // (debe replicar EXACTAMENTE la misma condición de disparo que usa
  // analizarCaidaInstantanea, incluyendo su filtro de minimoClientes;
  // de lo contrario esta función podía descartarse a sí misma creyendo
  // que la caída "ya fue cubierta" cuando en realidad la instantánea
  // nunca se hubiese disparado, dejando la caída sin ningún evento).
  const penultima = Number(ventana.at(-2).clientsOnline ?? 0);
  const ultima = Number(ventana.at(-1).clientsOnline ?? 0);

  const ultimaCaida = penultima - ultima;
  const porcentajeUltima = (ultimaCaida / Math.max(penultima, 1)) * 100;

  const habriaDisparadoInstantanea =
    penultima >= perfil.instantaneo.minimoClientes &&
    ultimaCaida > 0 &&
    (ultimaCaida >= perfil.instantaneo.perdidaAbsoluta ||
      porcentajeUltima >= perfil.instantaneo.perdidaPorcentaje);

  if (habriaDisparadoInstantanea) {
    return eventos;
  }

  if (
    perdidos >= perfil.progresivo.perdidaAbsoluta &&
    porcentaje >= perfil.progresivo.perdidaPorcentaje
  ) {
    eventos.push({
      tipo: "CLIENT_DROP_PROGRESSIVE",
      severidad: "WARNING",
      ap: ap.name,
      ip: ap.ip,
      clientesAntes: inicio,
      clientesAhora: fin,
      perdidos,
      porcentaje: porcentaje.toFixed(1),
      mensaje: `${ap.name} presenta caída progresiva (${inicio} → ${fin}, pérdida ${porcentaje.toFixed(1)}%)`,
      timestamp: Date.now(),
    });
  }

  return eventos;
}

function analizarClientesCero(ap) {
  const eventos = [];
  const muestras = ap.muestras;

  if (muestras.length < 2) {
    return eventos;
  }

  const perfil = obtenerPerfil(ap);

  const actual = muestras.at(-1);
  const anterior = muestras.at(-2);

  if (actual.status !== "ONLINE" || anterior.status !== "ONLINE") {
    return eventos;
  }

  const clientesAntes = Number(anterior.clientsOnline ?? 0);
  const clientesAhora = Number(actual.clientsOnline ?? 0);

  if (clientesAntes < perfil.cero.minimoClientes) {
    return eventos;
  }

  if (clientesAntes > 0 && clientesAhora === 0) {
    eventos.push({
      tipo: "CLIENTS_ZERO",
      severidad: "CRITICAL",
      ap: ap.name,
      ip: ap.ip,
      clientesAntes,
      clientesAhora: 0,
      mensaje: `${ap.name} quedó sin clientes asociados`,
      timestamp: Date.now(),
    });
  }

  return eventos;
}

export function analizarCrecimiento(ap) {
  const eventos = [];
  const muestras = ap.muestras;

  if (muestras.length < 2) {
    return eventos;
  }

  const perfil = obtenerPerfil(ap);

  const actual = muestras.at(-1);
  const anterior = muestras.at(-2);

  if (actual.status !== "ONLINE" || anterior.status !== "ONLINE") {
    return eventos;
  }

  const onlineActual = Number(actual.clientsOnline ?? 0);
  const offlineActual = Number(actual.clientsOffline ?? 0);

  const onlineAnterior = Number(anterior.clientsOnline ?? 0);
  const offlineAnterior = Number(anterior.clientsOffline ?? 0);

  const aumento = onlineActual - onlineAnterior;

  if (aumento <= 0) {
    return eventos;
  }

  const total = Math.max(
    onlineActual + offlineActual,
    onlineAnterior + offlineAnterior,
  );

  const porcentaje = (aumento / Math.max(total, 1)) * 100;

  if (
    aumento >= perfil.recuperacion.aumentoMinimo &&
    porcentaje >= perfil.recuperacion.porcentajeMinimo
  ) {
    eventos.push({
      tipo: "CLIENT_RECOVERED",
      severidad: "INFO",
      ap: ap.name,
      ip: ap.ip,
      clientesAntes: onlineAnterior,
      clientesAhora: onlineActual,
      aumento,
      porcentaje: porcentaje.toFixed(1),
      totalRegistrados: total,
      mensaje: `${ap.name} recuperó ${aumento} clientes (${onlineAnterior} → ${onlineActual}, ${porcentaje.toFixed(1)}% del total)`,
      timestamp: Date.now(),
    });
  }

  return eventos;
}
