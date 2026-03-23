# Openclaw Widget

An Electron-based desktop widget for OpenClaw — always-on-top, always-visible.

## Features
- Live status display (current task with typewriter animation)
- Task list with subtasks, drag-to-reorder, arm-to-delete, undo
- Inline weather (Culver City) with °F/°C toggle
- Rooney's scheduled tasks (OpenClaw cron jobs)
- Telegram event notifications via OpenClaw gateway
- USC color theme 🎓

## Setup
```bash
npm install
npm start
```

Requires OpenClaw gateway running locally on port 18789.

## File structure
- `main.cjs` — Electron main process
- `preload.js` — IPC bridge
- `index.html` — Widget UI
- `server.mjs` — Optional HTTP server (dev mode)
