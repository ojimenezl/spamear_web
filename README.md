# SPAMEAR

Muro temporal de anuncios (spam) con Vue 3 + Node (Vercel) + MongoDB Atlas + Stripe + Google Auth.

## Desarrollo local

```bash
npm install
npm run dev
```

- Front: http://localhost:5173  
- API: http://localhost:3001  

Sin `MONGODB_URI` usa **memoria** (solo UI). Con Atlas, pega la URI en `.env`.

### Variables
Copia `.env.example` → `.env` y rellena Google / Stripe / Mongo.

### Stripe (test + live)

- **Live** (`STRIPE_SECRET_KEY_LIVE` + `VITE_STRIPE_PUBLISHABLE_KEY`): usuarios normales.
- **Test** (`STRIPE_SECRET_KEY_TEST`): solo emails en `STRIPE_TEST_EMAILS` (por defecto `spamear.cia@gmail.com`).

Así puedes tener el sitio en producción y seguir probando pagos con tarjeta `4242…` solo con tu cuenta.

1. Entra con Google (cuenta de prueba o normal)
2. Monedero → escribe monto → Checkout Stripe
3. Test: `4242 4242 4242 4242` · fecha futura · CVC cualquiera
4. Al volver, `/api/stripe/confirm` acredita el monedero

Webhooks (Vercel / local):
- Live → `STRIPE_WEBHOOK_SECRET`
- Test → `STRIPE_WEBHOOK_SECRET_TEST`  
Endpoint: `https://tu-dominio/api/stripe/webhook`

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Deploy (Vercel + GitHub)

1. Push a GitHub  
2. Import en Vercel  
3. Env vars de producción (incl. `STRIPE_SECRET_KEY_LIVE` y `STRIPE_SECRET_KEY_TEST`)  
4. MongoDB Atlas M0 + webhooks Stripe → `/api/stripe/webhook`  
5. Crons en `vercel.json`: cleanup cada 10 min, Twitter cada 2 h  
6. `PUBLIC_APP_URL=https://tudominio.com`  
7. Google OAuth: añade el origen/dominio en Google Cloud Console  

## Producto (resumen)

- Top 10 subasta · Muro · Banners  
- Monedero (Stripe) para pujas y boosts  
- VIP y verificado  
