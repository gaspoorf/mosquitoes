export const getPayload = (message) => {
    const payload = JSON.parse(message.toString());

    const receivedAt = new Date(payload.received_at).toLocaleString();

    const frmPayload = payload.uplink_message.frm_payload;

    const decodedPayload = atob(frmPayload);
    const bytes = [];

    for (let i = 0; i < decodedPayload.length; i++) {
        bytes.push(decodedPayload.charCodeAt(i));
    }

    const co2Value = (bytes[0] << 8) | bytes[1];
    const mosquitoesNb = (bytes[2] << 8) | bytes[3];

    return {
        receivedAt,
        co2Value, 
        mosquitoesNb,
    };
}

// Fonction pour récupérer les routes définies
export const listRoutes = (app) => {
    const routes = [];

    app._router.stack.forEach((middleware) => {
        if (middleware.route) { // Routes définies directement (e.g., app.get, app.post)
            const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
            routes.push({ method: methods, path: middleware.route.path });
        } else if (middleware.name === 'router') { // Sous-route via express.Router
            middleware.handle.stack.forEach((handler) => {
                const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
                routes.push({ method: methods, path: handler.route.path });
            });
        }
    });

    return routes;
}