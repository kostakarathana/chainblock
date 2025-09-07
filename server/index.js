// server/index.js
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- helpers for fake IDs ---
function randAppId() {
  return (Math.random() * 1000000 | 0) + 1000;
}
function mockTxId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  for (let i = 0; i < 52; i++) s += alphabet[(Math.random() * alphabet.length) | 0];
  return s;
}

// health check
app.get('/health', (_, res) => res.json({ ok: true }));

// /deploy: try Python, fallback to mock
app.post('/deploy', (req, res) => {
  const py = spawn('python3', ['scripts/deploy.py'], {
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  py.stdin.write(JSON.stringify(req.body || {}));
  py.stdin.end();

  let out = '', err = '';
  py.stdout.on('data', d => out += d.toString());
  py.stderr.on('data', d => err += d.toString());

  py.on('close', code => {
    if (code === 0) {
      try {
        res.json(JSON.parse(out));
      } catch {
        console.error('Deploy parse error, stdout:', out, 'stderr:', err);
        res.json({ appId: randAppId(), txId: mockTxId(), mock: true });
      }
    } else {
      console.error('Deploy failed', code, err);
      res.json({ appId: randAppId(), txId: mockTxId(), mock: true });
    }
  });
});

// /tick: try Python, fallback to mock
app.post('/tick', (req, res) => {
  const py = spawn('python3', ['scripts/tick.py'], {
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  py.stdin.write(JSON.stringify(req.body || {}));
  py.stdin.end();

  let out = '', err = '';
  py.stdout.on('data', d => out += d.toString());
  py.stderr.on('data', d => err += d.toString());

  py.on('close', code => {
    if (code === 0) {
      try {
        res.json(JSON.parse(out));
      } catch {
        console.error('Tick parse error, stdout:', out, 'stderr:', err);
        res.json({ txId: mockTxId(), mock: true });
      }
    } else {
      console.error('Tick failed', code, err);
      res.json({ txId: mockTxId(), mock: true });
    }
  });
});

// start server
app.listen(8787, () => {
  console.log('Backend up on http://127.0.0.1:8787');
});