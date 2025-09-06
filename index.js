// User-facing builder: mounts Blockly, seeds an example, and runs a lightweight mock backtest
(function () {
  // ------ Mount Blockly (use stock Dark theme; no custom theme) ------
  var workspace = Blockly.inject('blockly', {
    toolbox: document.getElementById('toolbox'),
    theme: Blockly.Themes.Dark,
    grid: { spacing: 20, length: 3, colour: '#2e335e', snap: true },
    zoom: { controls: true, wheel: true },
    trashcan: true,
    renderer: 'thrasos'
  });

  // --- Strict label-only styling so blocks never change color ---
  (function enforceToolboxLabelStyle() {
    function apply() {
      // Old toolbox DOM
      document.querySelectorAll('.blocklyToolboxDiv .blocklyTreeLabel').forEach((el) => {
        el.style.color = '#000';
        el.style.fontWeight = '700';
      });
      // New toolbox DOM
      document
        .querySelectorAll(
          '.blocklyToolboxDiv .blocklyToolboxItemLabel, .blocklyToolboxDiv .blocklyToolboxCategory .blocklyToolboxItemLabel'
        )
        .forEach((el) => {
          el.style.color = '#000';
          el.style.fontWeight = '700';
        });

      // Optional: keep toolbox background light for contrast; DOES NOT affect blocks
      const tb = document.querySelector('.blocklyToolboxDiv');
      if (tb) tb.style.background = '#ffffff';
    }

    apply();
    setTimeout(apply, 0);
    const tb = document.querySelector('.blocklyToolboxDiv');
    if (tb) {
      const obs = new MutationObserver(apply);
      obs.observe(tb, { childList: true, subtree: true, attributes: true });
    }
  })();

  // Keep Blockly sized to its container
  function resize() {
    Blockly.svgResize(workspace);
  }
  window.addEventListener('resize', resize);

  // ------ Seed a simple example ------
  function seedDefault() {
    var xmlText =
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
    var xml = Blockly.utils.xml.textToDom(xmlText);
    Blockly.Xml.domToWorkspace(xml, workspace);
    resize();
  }
  seedDefault();

  // ------ Helpers ------
  function $(id) {
    return document.getElementById(id);
  }

  // Read minimal strategy from the first top block (expects an IF with our event & action)
  function readStrategy() {
    var blocks = workspace.getTopBlocks(true);
    if (!blocks.length) return { op: '<', thr: 0.2, pct: 0.1, side: 'BUY', coin: 'ALGO' };
    var root = blocks[0];
    var s = { op: '<', thr: 0.2, pct: 0.1, side: 'BUY', coin: 'ALGO' };

    try {
      // IF condition (slot IF0)
      var cond = root.getInputTargetBlock('IF0');
      if (cond && cond.type === 'event_price_compare') {
        s.op = cond.getFieldValue('OP');
        s.thr = Number(cond.getFieldValue('PRICE'));
        s.coin = cond.getFieldValue('COIN') || s.coin;
      }

      // Action from DO0 (BUY/SELL block)
      var act = root.getInputTargetBlock('DO0');
      if (act && (act.type === 'action_buy' || act.type === 'action_sell')) {
        s.pct = Number(act.getFieldValue('PCT')) / 100;
        s.side = act.type === 'action_buy' ? 'BUY' : 'SELL';
        s.coin = s.coin || act.getFieldValue('COIN');
      }
    } catch (e) {
      // keep defaults
    }
    return s;
  }

  // Mock price series (sin wave + noise)
  function mockPriceSeries(n, base) {
    n = n || 200;
    base = base || 0.24 + (Math.random() - 0.5) * 0.04;
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = i / 10;
      var price = base + 0.03 * Math.sin(t) + (Math.random() - 0.5) * 0.01;
      out.push(Number(price.toFixed(4)));
    }
    return out;
  }

  // Run simple backtest on the sandbox: $1000 USDC starting equity; BUY/SELL the chosen % when trigger true
  function runBacktest() {
    var s = readStrategy();
    var series = mockPriceSeries(240);

    var cash = 1000; // USDC
    var algo = 0; // ALGO units
    var trades = 0;

    for (var i = 0; i < series.length; i++) {
      var p = series[i];
      var trigger =
        s.op === '<' ? p < s.thr : s.op === '>' ? p > s.thr : Math.abs(p - s.thr) < 1e-9;
      if (!trigger) continue;

      if (s.side === 'BUY' && cash > 1) {
        var amtUSD = cash * s.pct;
        algo += amtUSD / p;
        cash -= amtUSD;
        trades++;
      } else if (s.side === 'SELL' && algo * p > 1) {
        var amtALGO = algo * s.pct;
        cash += amtALGO * p;
        algo -= amtALGO;
        trades++;
      }
    }

    var equity = [];
    for (var j = 0; j < series.length; j++) {
      equity.push(cash + algo * series[j]);
    }

    drawChart($('chart'), equity);
    $('btSummary').innerHTML =
      '<div><strong>Trades</strong><br>' +
      trades +
      '</div>' +
      '<div><strong>Trigger</strong><br>price ' +
      s.op +
      ' ' +
      s.thr +
      '</div>' +
      '<div><strong>Action</strong><br>' +
      (s.side || 'BUY') +
      ' ' +
      Math.round(s.pct * 100) +
      '%</div>';
  }

  // Simple line chart (no libs)
  function drawChart(canvas, equity) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = (canvas.width = Math.max(300, canvas.clientWidth) * window.devicePixelRatio);
    var h = (canvas.height = Math.max(180, canvas.clientHeight) * window.devicePixelRatio);
    ctx.clearRect(0, 0, w, h);

    var min = Math.min.apply(null, equity);
    var max = Math.max.apply(null, equity);
    var pad = 12 * window.devicePixelRatio;
    var toX = function (i) {
      return pad + (i * (w - 2 * pad)) / (equity.length - 1);
    };
    var toY = function (v) {
      return h - pad - ((v - min) * (h - 2 * pad)) / (max - min || 1);
    };

    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.beginPath();
    for (var i = 0; i < equity.length; i++) {
      var x = toX(i),
        y = toY(equity[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#6C5CE7';
    ctx.stroke();
  }

  // Buttons
  document.getElementById('btnBacktest').addEventListener('click', runBacktest);
  document.getElementById('btnReset').addEventListener('click', function () {
    workspace.clear();
    seedDefault();
  });

  // Initial resize sync
  resize();
})();