# 🪙 Crypto Paper Trading Dashboard

> Dashboard en tiempo real de trading simulado con análisis técnico automático, gestión de riesgo mediante el **Criterio de Kelly** y datos en vivo de 50 criptomonedas.

---

## ✨ Características principales

### 📊 Mercado en tiempo real
- Precios actualizados cada **30 segundos** desde la API de CoinGecko (sin API key)
- Seguimiento de **50 criptomonedas** principales (BTC, ETH, SOL, XRP, DOGE…)
- Tabla de mercado con precio, variación 24h, volumen y capitalización

### 🤖 Bot de trading automático
- Motor algorítmico con **3 estrategias de análisis técnico** en paralelo:
  | Estrategia | Descripción |
  |---|---|
  | **RSI** | Detecta condiciones de sobrecompra/sobreventa por momentum |
  | **EMA** | Sigue tendencias mediante cruce de medias móviles exponenciales |
  | **MACD** | Combina tendencia y momentum para señales de entrada/salida |
- Opera en modo **paper trading** (capital simulado de 250 EUR) — sin riesgo real
- Historial de las últimas **100 operaciones** y **50 señales**

### 🎯 Sizing con el Criterio de Kelly
- Calcula automáticamente el **tamaño óptimo de cada posición** según el historial de la estrategia:
  ```
  kelly = (p × b − q) / b
  ```
  - `p` = tasa de acierto histórica
  - `q` = tasa de fallo (1 − p)
  - `b` = ratio ganancia media / pérdida media
- Capped al **25% del portfolio máximo** por operación para controlar el riesgo
- Fallback del **5%** si no hay historial previo

### 💼 Gestión de portfolio
- Capital disponible, valor total y P&L en tiempo real
- Una sola posición activa por par `{crypto}-{estrategia}` (sin duplicados)
- Estadísticas por estrategia: wins, losses, P&L total, ganancia/pérdida media

### ⚡ Actualizaciones en tiempo real
- Conexión **WebSocket** persistente con reconexión automática (3s)
- Eventos en vivo: señales, operaciones, actualizaciones de portfolio y precios

---

## 🏗️ Arquitectura

```
┌──────────────────────────────────┐
│   CoinGecko Poller (cada 30s)   │
│   Precios de 50 cryptos en EUR   │
└─────────────┬────────────────────┘
              │
              ▼
       ┌─────────────┐
       │  BotEngine  │  ← RSI + EMA + MACD
       └──────┬──────┘
              │ Señal → Operación
              ▼
       ┌──────────────────┐
       │  PaperPortfolio  │  ← Kelly Criterion sizing
       └──────────────────┘

  Backend · Puerto 3000 (Hono + Bun)
  ├── REST  GET /api/portfolio
  ├── REST  GET /api/prices
  ├── REST  GET /api/market
  ├── REST  GET /api/health
  └── WS    /ws  → broadcast en tiempo real

  Frontend · Puerto 5173 (React + Vite)
  ├── Portfolio Header   (capital, P&L, posiciones)
  ├── Market Table       (top 20 por market cap)
  ├── Price Chart        (historial de precios)
  ├── Signals Table      (últimas 50 señales)
  └── Strategy Stats     (RSI vs EMA vs MACD)
```

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Backend framework | [Hono](https://hono.dev) |
| Frontend | React 18 + TypeScript |
| Gráficas | Recharts |
| Build tool | Vite |
| Datos de mercado | CoinGecko API (gratuita) |
| Comunicación | WebSocket nativo |

---

## 🚀 Cómo ejecutarlo

### Requisitos
- [Bun](https://bun.sh) instalado (`curl -fsSL https://bun.sh/install | bash`)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/jesparbem/crypto-dashboard.git
cd crypto-dashboard

# Instalar dependencias del backend
bun install

# Instalar dependencias del frontend
cd frontend && bun install && cd ..
```

### Arrancar la aplicación

```bash
# Terminal 1 — Backend (API + WebSocket + Bot)
bun run dev

# Terminal 2 — Frontend
bun run frontend:dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API REST | http://localhost:3000 |
| WebSocket | ws://localhost:3000/ws |

---

## 📡 API REST

| Endpoint | Descripción |
|---|---|
| `GET /api/health` | Estado del servidor |
| `GET /api/portfolio` | Portfolio completo (capital, posiciones, trades, stats) |
| `GET /api/prices` | Historial de precios de las 50 cryptos |
| `GET /api/market` | Datos de mercado actuales (precio, volumen, market cap) |

---

## 📂 Estructura del proyecto

```
crypto-dashboard/
├── src/
│   ├── index.ts        # Punto de entrada — inicia todo
│   ├── server.ts       # Servidor HTTP + WebSocket (Hono)
│   ├── poller.ts       # Conexión con CoinGecko API
│   ├── engine.ts       # Motor de estrategias (RSI, EMA, MACD)
│   ├── portfolio.ts    # Gestión de posiciones y P&L
│   ├── kelly.ts        # Cálculo del Criterio de Kelly
│   ├── cryptos.ts      # Lista de 50 criptomonedas
│   └── types.ts        # Tipos TypeScript compartidos
└── frontend/
    └── src/
        ├── App.tsx                      # Componente raíz
        ├── hooks/useWebSocket.ts        # Hook de conexión WebSocket
        └── components/MarketTable.tsx   # Tabla de mercado
```

---

## ⚠️ Aviso

Este proyecto es exclusivamente con fines **educativos y de investigación**. No constituye asesoramiento financiero. Las estrategias implementadas son simplificaciones académicas y no están optimizadas para trading real.

---

<div align="center">
  Hecho con TypeScript, Bun y datos de <a href="https://coingecko.com">CoinGecko</a>
</div>
