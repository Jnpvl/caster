const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { randomUUID } = require('crypto');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 4200;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/caster', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'caster.html'));
});

app.get('/health', (_, res) => {
  res.json({ ok: true, clients: wss.clients.size });
});

app.get('/viewer-urls', (_, res) => {
  const nets = os.networkInterfaces();
  const urls = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${PORT}`);
      }
    }
  }
  res.json({ urls: [...new Set(urls)] });
});

const clients = new Map(); // id -> ws
let casterId = null;

function sendTo(id, msg) {
  const ws = clients.get(id);
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

wss.on('connection', (ws) => {
  const id = randomUUID();
  clients.set(id, ws);
  ws.send(JSON.stringify({ type: 'welcome', id }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'caster-join') {
      casterId = id;
      ws.role = 'caster';
      for (const [peerId, peerWs] of clients.entries()) {
        if (peerId !== casterId && peerWs.role === 'viewer') {
          sendTo(casterId, { type: 'viewer-join', viewerId: peerId });
        }
      }
      return;
    }

    if (msg.type === 'viewer-join') {
      ws.role = 'viewer';
      if (casterId) sendTo(casterId, { type: 'viewer-join', viewerId: id });
      return;
    }

    if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice') {
      if (!msg.to) return;
      sendTo(msg.to, { ...msg, from: id });
      return;
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    if (id === casterId) {
      casterId = null;
      for (const [peerId, peerWs] of clients.entries()) {
        if (peerWs.role === 'viewer') sendTo(peerId, { type: 'caster-left' });
      }
      return;
    }
    if (ws.role === 'viewer' && casterId) {
      sendTo(casterId, { type: 'viewer-left', viewerId: id });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
  console.log(`Emisor (PC): http://localhost:${PORT}/caster.html`);
  console.log(`Viewer (cel): http://IP_DE_TU_PC:${PORT}`);
});
