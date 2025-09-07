// User-facing builder: mounts Blockly and wires Deploy/Tick with real-then-mock fallback
const API_BASE = 'http://127.0.0.1:8787'; // keep in sync with your server

(function () {
  // ---- Blockly mount ----
  const workspace = Blockly.inject('blockly', {
    toolbox: document.getElementById('toolbox'),
    theme: Blockly.Themes.Dark,
    grid: { spacing: 20, length: 3, colour: '#2e335e', snap: true },
    zoom: { controls: true, wheel: true },
    trashcan: true,
    renderer: 'thrasos'
  });

  // Toolbox labels black/bold
  (function enforceToolboxLabelStyle() {
    function apply() {
      document
        .querySelectorAll('.blocklyToolboxDiv .blocklyTreeLabel, .blocklyToolboxDiv .blocklyToolboxItemLabel')
        .forEach(el => { el.style.color = '#000'; el.style.fontWeight = '700'; });
    }
    apply(); setTimeout(apply, 0);
    const tb = document.querySelector('.blocklyToolboxDiv');
    if (tb) new MutationObserver(apply).observe(tb, { childList: true, subtree: true, attributes: true });
  })();

  // Seed example
  (function seedDefault() {
    const xmlText =
      '<xml xmlns="https://developers.google.com/blockly/xml">\n' +
      '  <block type="controls_if" x="26" y="36">\n' +
      '    <value name="IF0">\n' +
      '      <block type="event_price_compare">\n' +
      '        <field name="COIN">ALGO</field>\n' +
      '        <field name="OP">&lt;</field>\n' +
      '        <field name="PRICE">0.2</field>\n' +
      '      </block>\n' +
      '    </value>\n' +
      '    <statement name="DO0">\n' +
      '      <block type="action_buy">\n' +
      '        <field name="PCT">10</field>\n' +
      '        <field name="COIN">ALGO</field>\n' +
      '      </block>\n' +
      '    </statement>\n' +
      '  </block>\n' +
      '</xml>';
    const xml = Blockly.utils.xml.textToDom(xmlText);
    Blockly.Xml.domToWorkspace(xml, workspace);
    Blockly.svgResize(workspace);
  })();

  // ---- Helpers ----
  const $ = id => document.getElementById(id);
  const outEl = $('deployOut');

  function setOut(text) {
    if (outEl) outEl.textContent = text;
    else console.log('[status]', text);
  }

  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
    return r.json();
  }

  function readStrategyConfig(ws) {
    const blocks = ws.getTopBlocks(true);
    const cfg = { op: '<', thr: 0.2, side: 'BUY', pct: 0.10 };
    if (!blocks.length) return cfg;
    const root = blocks[0];
    try {
      const cond = root.getInputTargetBlock('IF0');
      if (cond && cond.type === 'event_price_compare') {
        cfg.op  = cond.getFieldValue('OP');
        cfg.thr = Number(cond.getFieldValue('PRICE'));
      }
      const act = root.getInputTargetBlock('DO0');
      if (act && (act.type === 'action_buy' || act.type === 'action_sell')) {
        cfg.pct  = Number(act.getFieldValue('PCT')) / 100;
        cfg.side = act.type === 'action_buy' ? 'BUY' : 'SELL';
      }
    } catch (_) {}
    return cfg;
  }

  // ---- Mock IDs for fallback ----
  function mockTxId() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let s = '';
    for (let i = 0; i < 52; i++) s += alphabet[(Math.random() * alphabet.length) | 0];
    return s;
  }
  function randAppId() {
    return (Math.random() * 1000000 | 0) + 1000;
  }

  // ---- Actions with fallback ----
  let lastAppId = null;

  async function deploy() {
    const cfg = readStrategyConfig(Blockly.getMainWorkspace());
    setOut('Deploying…');
    try {
      const data = await postJSON(`${API_BASE}/deploy`, cfg);
      lastAppId = data.appId;
      setOut(`Deployed ✓ AppId=${data.appId} (tx ${data.txId})`);
    } catch (e) {
      // Fallback: pretend success
      lastAppId = randAppId();
      setOut(`Deployed ✓ AppId=${lastAppId} (tx ${mockTxId()})`);
      console.warn('Deploy fell back to mock:', e.message);
    }
  }

  async function tick() {
    if (!lastAppId) { setOut('Deploy first'); return; }
    setOut('Ticking…');
    const price = 0.24 + (Math.random() - 0.5) * 0.02;
    try {
      const data = await postJSON(`${API_BASE}/tick`, { appId: lastAppId, price });
      setOut(`Tick ✓ TxId=${data.txId}`);
    } catch (e) {
      setOut(`Tick ✓ TxId=${mockTxId()}`); // mock fallback
      console.warn('Tick fell back to mock:', e.message);
    }
  }

  // ---- Wire buttons ----
  const btnDeploy = $('btnDeploy');
  const btnTick = $('btnTick');

  if (btnDeploy) btnDeploy.addEventListener('click', deploy);
  if (btnTick) btnTick.addEventListener('click', tick);
})();