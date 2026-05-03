# EventFlow 🎪
### Plataforma de Gestión de Eventos & Reservas — Stack MEN

---

## 🏗️ Arquitectura del Proyecto

```
eventflow/
├── config/
│   └── db.js                    # Conexión Mongoose → MongoDB Atlas
├── models/
│   ├── User.js                  # Schema: nombre, correo, rol
│   ├── Event.js                 # Schema: titulo, fecha, lugar, categoria, precio, organizadorId
│   └── Reservation.js           # Schema: usuarioId, eventoId, cantidad, estado, fechaReserva
├── controllers/
│   ├── eventsController.js      # CRUD Eventos con populate()
│   ├── reservationsController.js# CRUD Reservas con populate() anidado
│   └── statsController.js       # ★ Aggregation Pipelines MongoDB (4 métricas)
├── routes/
│   ├── events.js                # /api/events
│   ├── reservations.js          # /api/reservations
│   └── dashboard.js             # /api/dashboard/* (endpoints estadísticos)
├── scripts/
│   └── seed.js                  # Poblar MongoDB con datos de prueba
├── public/
│   ├── index.html               # SPA: Explorador + Dashboard (Tailwind CDN)
│   └── app.js                   # Vanilla JS ES Modules + Chart.js
├── server.js                    # Entrada Express + middleware
├── .env.example                 # Plantilla de variables de entorno
└── package.json
```

---

## 🚀 Instalación y Arranque

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Edita .env y agrega tu MONGO_URI
```

**Para MongoDB Atlas:**
```
MONGO_URI=mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/eventflow?retryWrites=true&w=majority
```

**Para MongoDB local:**
```
MONGO_URI=mongodb://localhost:27017/eventflow
```

### 3. (Opcional) Poblar con datos de prueba
```bash
node scripts/seed.js
# Crea 3 organizadores + 20 clientes + 18 eventos + 200 reservas
```

### 4. Iniciar el servidor
```bash
# Producción
npm start

# Desarrollo (con nodemon)
npm run dev
```

🌐 **Acceso:** http://localhost:3000

---

## 📡 API Reference

### Eventos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/events` | Listar eventos (`?q=`, `?categoria=`, `?page=`, `?limit=`) |
| GET    | `/api/events/:id` | Obtener evento + organizador |
| POST   | `/api/events` | Crear evento |
| PUT    | `/api/events/:id` | Actualizar evento |
| DELETE | `/api/events/:id` | Desactivar evento (borrado lógico) |

### Reservas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/reservations` | Listar reservas con populate anidado |
| GET    | `/api/reservations/:id` | Detalle reserva |
| POST   | `/api/reservations` | Crear reserva (captura precio automáticamente) |
| PUT    | `/api/reservations/:id` | Actualizar reserva |
| DELETE | `/api/reservations/:id` | Cancelar reserva |

### Dashboard (Aggregation Pipelines)
| Método | Ruta | Pipeline |
|--------|------|---------|
| GET | `/api/dashboard/kpis` | KPIs globales |
| GET | `/api/dashboard/top-eventos` | `$match → $group → $sort → $limit:5 → $lookup` |
| GET | `/api/dashboard/ingresos-por-categoria` | `$match → $lookup(events) → $group(categoria) → $sort` |
| GET | `/api/dashboard/ranking-organizadores` | `$lookup(events) → $group(organizadorId) → $lookup(users)` |
| GET | `/api/dashboard/historico-mensual?year=2025` | `$match(año) → $group($year,$month) → $sort` |

---

## 📊 Aggregation Pipelines Implementados

### 1. Top 5 Eventos más reservados
```js
[
  { $match: { estado: 'confirmada' } },
  { $group: { _id: '$eventoId', totalEntradas: { $sum: '$cantidad' } } },
  { $sort: { totalEntradas: -1 } },
  { $limit: 5 },
  { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'evento' } },
]
```

### 2. Ingresos por categoría
```js
[
  { $match: { estado: 'confirmada' } },
  { $lookup: { from: 'events', localField: 'eventoId', ... } },
  { $group: { _id: '$evento.categoria', ingresoTotal: { $sum: { $multiply: ['$cantidad','$precioUnitario'] } } } },
]
```

### 3. Ranking organizadores (doble lookup)
```js
[
  // Reservation → Event → User (organizador)
  { $lookup: { from: 'events', ... } },
  { $group: { _id: '$evento.organizadorId', totalIngresos: { $sum: '$subtotal' } } },
  { $lookup: { from: 'users', ... } },
]
```

### 4. Histórico mensual
```js
[
  { $match: { fechaReserva: { $gte: inicio, $lt: fin }, estado: 'confirmada' } },
  { $group: { _id: { año: { $year: '$fechaReserva' }, mes: { $month: '$fechaReserva' } } } },
  { $sort: { '_id.año': 1, '_id.mes': 1 } },
  { $project: { periodo: { $dateToString: { format: '%Y-%m', ... } } } },
]
```

---

## 🎨 Frontend

- **Explorador de Eventos:** Grid responsive con filtros por categoría y búsqueda en tiempo real
- **Dashboard Analítico:**
  - 5 KPI Cards con métricas globales
  - Gráfica de línea dual (reservas + ingresos por mes) — Chart.js
  - Donut chart de ingresos por categoría — Chart.js  
  - Barras horizontales Top 5 eventos — Chart.js
  - Tabla ranking organizadores con barras de progreso
- **Modal crear evento** conectado al endpoint POST
- Modo demo automático si el backend no está disponible

---

## 🔧 Tecnologías

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js ≥18 (ESM) |
| Framework | Express.js 4.x |
| Base de Datos | MongoDB (NoSQL) |
| ODM | Mongoose 8.x |
| Frontend CSS | Tailwind CSS (CDN) |
| Frontend JS | Vanilla ES Modules |
| Charts | Chart.js 4.x (CDN) |
| Fuentes | Syne + JetBrains Mono + DM Sans |
