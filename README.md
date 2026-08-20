# Ventia — plantilla de CRM modular (React + TanStack Start)

Plantilla lista para "remixar": un CRM multi‑organización completo, en español, que
funciona **íntegramente en el navegador con `localStorage`**. No hay backend, ni base
de datos, ni servicios externos. Sirve como base para aprender la arquitectura y para
llevarla después a un backend real.

## Qué incluye

- **Web pública**: landing comercial (`/`), precios (`/precios`), páginas legales
  (`/legal/*`), formulario de contacto que crea leads reales y banner de cookies.
- **Aplicación** (protegida): panel (`/inicio`), contactos y ficha de lead,
  pipeline Kanban, tareas (lista y calendario), notas en timeline, ajustes y perfil.
- **Multi‑organización** con roles: super admin (`/admin`), administrador y usuario.
- **Motor de campos personalizados** para contactos y oportunidades.
- **Historial de actividad**, notificaciones y flujos de cuenta (recuperación de
  contraseña, verificación de email, invitaciones) mediante tokens.

## Cómo está organizado el código

```
src/
  routes/            Rutas (TanStack Router, ficheros = URLs)
  components/crm/    Layout, campos, diálogos de la aplicación
  components/site/   Landing, precios, cookies, formulario público
  lib/crm/           Núcleo: estado, tipos, roles de campo, actividad, atribución
  lib/site/          Planes, consentimiento de cookies, alta de leads públicos
```

### Estado y persistencia — `lib/crm/store.tsx`
Un único objeto raíz (`RootState`) con `tenants`, `users`, sesión actual y tokens.
Se guarda en `localStorage` y se recarga al arrancar. `schemaVersion` controla las
migraciones, que se aplican **una sola vez** para no pisar la configuración del usuario.
Las escrituras sobre configuración de la organización (marca, módulos, campos,
etapas) se rechazan en la capa de datos si quien las hace no es administrador.

### Motor de campos — `lib/crm/types.ts`, `components/crm/fields.tsx`
Cada organización define sus propios campos (`FieldDef`: texto, número, moneda,
fecha, selector, etc.), su orden, su visibilidad en vista rápida y su color. Los
formularios y las tablas se generan a partir de esa definición: no hay campos
escritos a mano en el código.

### Roles de campo — `lib/crm/roles.ts`
Como los campos son libres, el producto necesita saber cuál es el nombre, el importe
o el estado. Cada campo puede llevar un `role` (`title`, `amount`, `status`, `owner`,
`company`, `email`, `phone`). El pipeline, el panel y la ficha usan el rol, nunca el
identificador del campo. Los campos con rol están protegidos frente a borrado.

### Multi‑organización y roles de usuario
`tenants[id].state` aísla los datos de cada organización. Un usuario pertenece a
varias mediante membresías con rol. El guard de `routes/__root.tsx` decide qué es
público, qué requiere sesión y qué requiere ser administrador.

### Tokens y autenticación simulada
El login, el registro, la recuperación de contraseña, la verificación de email y las
invitaciones funcionan con tokens guardados en `localStorage`. **Las contraseñas se
guardan en claro**: es intencionado para que se vea el flujo, y es lo primero que hay
que sustituir al pasar a producción.

### Historial y notificaciones — `lib/crm/activity.ts`
Cada cambio relevante (alta, cambio de valor, movimiento de etapa, borrado) genera un
evento firmado por el usuario. El historial se limita a los últimos 500 eventos por
organización; las notificaciones, a 200.

### Atribución y cookies
`lib/crm/attribution.ts` captura utm_*, referrer, página de entrada y dispositivo,
**solo si el visitante ha aceptado las cookies de marketing**. Si las rechaza, se
borra lo ya guardado; si acepta más tarde, se captura desde ese momento.

## Ponerle tu marca

Hay dos marcas distintas y no conviene mezclarlas:

1. **La del producto (Ventia)**: `src/components/site/VentiaLogo.tsx`, los tokens
   `--ventia-*` de `src/styles.css`, los textos de la landing (`src/routes/index.tsx`),
   los planes de `src/lib/site/plans.ts` y los títulos `head()` de cada ruta.
   Sustituye también los marcadores entre corchetes de las páginas legales por tus
   datos fiscales reales.
2. **La de cada organización dentro de la app**: se configura desde Ajustes (nombre,
   logo, color de acento, tema) y vive en `branding` de cada tenant. No la toques
   desde el código.

## Migración a un backend real (Supabase)

### Tablas mínimas

| Tabla | Campos clave |
| --- | --- |
| `tenants` | `id`, `name`, `suspended`, `branding jsonb`, `modules jsonb` |
| `memberships` | `user_id`, `tenant_id`, `role` (`admin` \| `user`) |
| `user_roles` | `user_id`, `role` — roles de plataforma, **nunca** en el perfil |
| `field_defs` | `tenant_id`, `entity` (`contact` \| `deal`), `key`, `label`, `type`, `role`, `position`, `options jsonb` |
| `contacts` | `tenant_id`, `values jsonb`, `attribution jsonb`, `created_at`, `deleted_at` |
| `stages` | `tenant_id`, `name`, `color`, `position` |
| `deals` | `tenant_id`, `contact_id`, `stage_id`, `values jsonb` |
| `tasks` | `tenant_id`, `title`, `due_date`, `done`, `owner_id`, `contact_id` |
| `notes` | `tenant_id`, `text`, `link_type`, `link_id`, `author_id` |
| `events` | `tenant_id`, `type`, `actor_id`, `payload jsonb`, `at` |
| `notifications` | `tenant_id`, `user_id`, `type`, `read_at`, `payload jsonb` |

Los valores de campos personalizados se guardan en `jsonb` (`values`) indexado por el
identificador del campo: es el mapeo directo de lo que ya hace `localStorage` y evita
migrar el esquema cada vez que alguien añade un campo.

### Cómo mapear el estado actual

- `root.tenants[id]` → una fila en `tenants` + sus filas hijas con `tenant_id`.
- `tenant.state.contacts[]` → filas de `contacts` (`values` tal cual en `jsonb`).
- `tenant.state.contactFields[]` / `dealFields[]` → `field_defs` con `entity`.
- `tenant.state.events[]` → `events` (deja de podar a 500: eso era un límite del
  navegador).
- Sustituye `setRoot(...)` por mutaciones de TanStack Query contra la base de datos y
  `loadRoot()` por consultas filtradas por `tenant_id`.

### Autenticación

Elimina las contraseñas en claro, los tokens de `localStorage` y `usePublicLead`
escribiendo directamente en el estado. En su lugar:

- registro/login con el proveedor de autenticación (email + contraseña, OAuth);
- recuperación de contraseña y verificación de email con sus correos reales;
- invitaciones como filas en una tabla `invites` con caducidad, aceptadas tras iniciar
  sesión;
- el formulario público pasa a ser un endpoint de servidor que valida la entrada.

### Permisos: en el servidor, siempre

En la plantilla los permisos se comprueban en el cliente (guard de rutas y capa de
datos). Eso evita errores de la interfaz, pero **no es seguridad**: cualquiera puede
editar el JavaScript o llamar a la API a mano. En producción cada tabla necesita RLS
que compruebe la pertenencia a la organización y el rol, y las operaciones sensibles
(invitar, suspender, cambiar roles) deben ejecutarse en el servidor. La comprobación
en cliente se queda solo como comodidad visual.

## Desarrollo

```sh
npm i
npm run dev
```
