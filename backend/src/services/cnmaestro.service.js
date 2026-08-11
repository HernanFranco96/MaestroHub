// ./src/services/cnmaestro.service.js

export async function consultarCnMaestro(ipServer, credentials, camposCustom = null) {
    const camposDefault = [
        "tid", "nid", "mac", "pmac", "eType", "mode", "loc", "sys.online", 
        "sys.nosta", "sys.cpu", "sys.cpus", "sys.temperature", "mgmt", 
        "onboarding", "cfg", "net", "model", "name", "sw_version", "uptime", 
        "lstUpd", "azimuth", "maxrange", "radio.dlTPut", "radio.ulTPut", 
        "radio.dlframeutil", "radio.ulframeutil", "radio.dlPktLossPer", 
        "radio.ulPktLossPer", "radio.dlRetransPktsPer", "radio.ulRetransPktsPer", 
        "radio.dlCapDropPktsPer", "radio.ulCapDropPktsPer", "radio.rfFreq", 
        "radio.chWidth", "radio.txPower", "radio.dlFrmUtil", "radio.ulFrmUtil", 
        "radio.suMimoFrmUtil", "radio.muMimoFrmUtil", "radio.dlSumimo", 
        "radio.dlMumimo", "radio.ulSumimo", "radio.ulMumimo", 
        "radio.dlMultiplexGain", "radio.ulMultiplexGain"
    ].join(",");

    const camposAUsar = camposCustom || camposDefault;
    const LOGIN_URL = `https://${ipServer}/cn-srv/login`;
    const DATA_URL = `https://${ipServer}/0/cn-srv/stats/devices?mode=ap&all=true&limit=0&fields=${encodeURIComponent(camposAUsar)}`;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const loginResponse = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (loginResponse.status !== 200) {
            throw new Error(`Fallo en Login. Status: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        const cookies = loginResponse.headers.get('set-cookie');
        const headers = { "Authorization": `Bearer ${loginData.token}`, "Content-Type": "application/json" };
        if (cookies) headers["Cookie"] = cookies;

        const response = await fetch(DATA_URL, { method: 'GET', headers });

        if (response.status !== 200) {
            throw new Error(`Error en API de datos. Status: ${response.status}`);
        }

        const jsonRes = await response.json();
        return jsonRes.data?.devices || [];

    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}