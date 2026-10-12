# Subir SPAMEAR a Vercel + variables de entorno

Guía rápida para conectar el repo de GitHub y pegar las credenciales en Vercel.

Repo: `https://github.com/ojimenezl/spamear_web`

---

## 1. Crear el proyecto en Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (conviene la misma cuenta / GitHub `ojimenezl`).
2. **Add New… → Project**
3. Importa **`ojimenezl/spamear_web`**
4. Framework: Vite (lo detecta solo)
5. **Root Directory:** `.` (raíz)
6. **Build Command:** `npm run build` (ya está en `vercel.json`)
7. **Output Directory:** `dist`
8. **No hagas Deploy todavía** → primero pon las Environment Variables (paso 2), o haz deploy y luego re-deploy.

---

## 2. Environment Variables (lo importante)

En el proyecto de Vercel:

**Settings → Environment Variables**

Añade cada una para **Production** (y Preview si quieres probar ramas).

| Variable | Valor / dónde sacarla | Obligatoria |
|---|---|---|
| `MONGODB_URI` | Atlas → Connect → Drivers → URI (`mongodb+srv://…`) | Sí |
| `JWT_SECRET` | Cadena larga aleatoria (ej. 32+ caracteres) | Sí |
| `GOOGLE_CLIENT_ID` | Google Cloud → Credenciales OAuth (Web client) | Sí |
| `VITE_GOOGLE_CLIENT_ID` | **El mismo** Client ID que arriba | Sí |
| `PUBLIC_APP_URL` | `https://tudominio.com` (sin `/` final) | Sí |
| `CRON_SECRET` | Cadena secreta para proteger crons | Sí |
| `STRIPE_SECRET_KEY_LIVE` | Stripe Dashboard → **Live** → API keys → `sk_live_…` | Sí (pagos reales) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe **Live** → `pk_live_…` | Sí |
| `STRIPE_WEBHOOK_SECRET` | Webhook **Live** → Signing secret `whsec_…` | Sí |
| `STRIPE_SECRET_KEY_TEST` | Stripe **Test** → `sk_test_…` | Sí (tu cuenta de prueba) |
| `STRIPE_WEBHOOK_SECRET_TEST` | Webhook **Test** → `whsec_…` | Recomendado |
| `STRIPE_TEST_EMAILS` | `spamear.cia@gmail.com` | Sí |
| `TWITTER_BEARER_TOKEN` | Solo si usas el cron de X | No |
| `TWITTER_API_KEY` | Idem | No |
| `TWITTER_API_SECRET` | Idem | No |
| `TWITTER_ACCESS_TOKEN` | Idem | No |
| `TWITTER_ACCESS_SECRET` | Idem | No |

### Notas Stripe

- Con `STRIPE_TEST_EMAILS=spamear.cia@gmail.com`, **solo esa cuenta** usa Stripe **test**.
- El resto de usuarios usa **live** (`STRIPE_SECRET_KEY_LIVE`).
- Puedes copiar valores de tu `.env` local, pero **nunca** subas el `.env` a GitHub (ya está en `.gitignore`).

### Variables `VITE_*`

Las que empiezan por `VITE_` se inyectan en el **build** del front. Si las cambias, hay que **Redeploy**.

---

## 3. Dominio

1. Vercel → proyecto → **Settings → Domains**
2. Añade tu dominio (ej. `spamear.com` / `www.spamear.com`)
3. En tu registrar DNS, crea los registros que Vercel indique (A / CNAME)
4. Actualiza `PUBLIC_APP_URL` al dominio definitivo y **Redeploy**

---

## 4. Google OAuth (imprescindible)

En [Google Cloud Console](https://console.cloud.google.com/) → tu cliente OAuth:

**Orígenes JavaScript autorizados**
- `https://tudominio.com`
- `https://www.tudominio.com` (si lo usas)
- `https://tu-proyecto.vercel.app` (dominio Vercel)

**URI de redirección autorizados** (si Google los pide)
- Los mismos orígenes / según el tipo de cliente Web

Sin esto verás `origin_mismatch` al entrar con Google.

---

## 5. Stripe Webhooks

En Stripe Dashboard (modo **Live** y modo **Test** por separado):

1. Developers → Webhooks → **Add endpoint**
2. URL: `https://tudominio.com/api/stripe/webhook`
3. Evento: `checkout.session.completed`
4. Copia el **Signing secret** (`whsec_…`)
   - Live → `STRIPE_WEBHOOK_SECRET`
   - Test → `STRIPE_WEBHOOK_SECRET_TEST`

---

## 6. MongoDB Atlas

1. Network Access → permite acceso desde Vercel  
   - Opción fácil: `0.0.0.0/0` (cualquier IP), o IPs de Vercel si las restringes
2. Database User con contraseña en la URI
3. Pegar `MONGODB_URI` completa en Vercel

---

## 7. Deploy

1. Guarda todas las variables
2. **Deployments → … → Redeploy** (o push a `main`)
3. Abre la URL → prueba:
   - Login Google
   - Monedero con `spamear.cia@gmail.com` + tarjeta `4242…` (test)
   - Otro usuario → Stripe live (cuando tengas `sk_live`)

---

## 8. Checklist rápido

- [ ] Repo importado desde GitHub
- [ ] Todas las env vars de la tabla (Production)
- [ ] `PUBLIC_APP_URL` = tu dominio final
- [ ] Google OAuth con orígenes del dominio
- [ ] Webhooks Stripe live + test
- [ ] Atlas abierto a Vercel
- [ ] Redeploy tras cambiar `VITE_*`

---

## Alternativa: CLI de Vercel

Si tienes `vercel` instalado:

```bash
npm i -g vercel
cd spamear_web
vercel login
vercel link
vercel env add MONGODB_URI production
# … repetir por cada variable
vercel --prod
```

O pega el bloque desde el dashboard (más visual y menos errores).
