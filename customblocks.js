// Define custom blocks and a simple JSON "code generator" for the stack.

(function(){
  const COLOR_STRATEGY = 270;   // purple-ish
  const COLOR_VALUE = 140;      // green

  // Price condition: IF price [< or >] [number]
  Blockly.Blocks['if_price'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("If price")
          .appendField(new Blockly.FieldDropdown([["<","<"],[">",">"]]), "OP")
          .appendField("$")
          .appendField(new Blockly.FieldNumber(0.20, 0, 100000, 0.0001), "PRICE");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_STRATEGY);
      this.setTooltip("Trigger based on ALGO price vs USD threshold");
      this.setHelpUrl("");
    }
  };

  // Swap action: swap [percent]% ALGO -> USDC
  Blockly.Blocks['swap_percent'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Swap")
          .appendField(new Blockly.FieldNumber(10, 1, 100, 1), "PCT")
          .appendField("% ALGO → USDC");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_STRATEGY);
      this.setTooltip("Swap % of ALGO to USDC");
      this.setHelpUrl("");
    }
  };

  // Stop after N trades
  Blockly.Blocks['stop_after'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Stop after")
          .appendField(new Blockly.FieldNumber(3, 1, 999, 1), "COUNT")
          .appendField("trades");
      this.setPreviousStatement(true, null);
      this.setNextStatement(false, null);
      this.setColour(COLOR_STRATEGY);
      this.setTooltip("Limit total number of executions");
      this.setHelpUrl("");
    }
  };

  // Simple numeric value (not strictly needed, kept for future)
  Blockly.Blocks['number_input'] = {
    init: function() {
      this.appendDummyInput()
          .appendField(new Blockly.FieldNumber(0, -1e12, 1e12, 0.0001), "NUM");
      this.setOutput(true, "Number");
      this.setColour(COLOR_VALUE);
      this.setTooltip("Number");
      this.setHelpUrl("");
    }
  };

  // A tiny serializer that walks top-level stack and turns blocks into an array of steps.
  window.BlocklyStrategy = {
    serializeWorkspaceToJSON(workspace){
      const blocks = workspace.getTopBlocks(true);
      if (!blocks.length) return { steps: [] };

      // In this MVP we assume a single top-level linear stack.
      const top = blocks[0];
      const steps = [];
      let cursor = top;
      const seen = new Set();

      while (cursor && !seen.has(cursor.id)) {
        seen.add(cursor.id);
        const type = cursor.type;
        if (type === 'if_price') {
          steps.push({
            type: 'if_price',
            op: cursor.getFieldValue('OP'),
            price: Number(cursor.getFieldValue('PRICE'))
          });
        } else if (type === 'swap_percent') {
          steps.push({
            type: 'swap_percent',
            pct: Number(cursor.getFieldValue('PCT'))
          });
        } else if (type === 'stop_after') {
          steps.push({
            type: 'stop_after',
            count: Number(cursor.getFieldValue('COUNT'))
          });
        } else {
          steps.push({ type });
        }
        cursor = cursor.getNextBlock();
      }

      return { steps };
    },

    // Naive template to show how strategy becomes a PyTeal-ish config.
    toPyTealTemplate(strategy){
      const lines = [];
      lines.push("# Pseudo-PyTeal template for demo (not executable)");
      lines.push("price_oracle = App.globalGet(Bytes(\"ALGO_USDC\")))  # mocked");
      let limit = 999;
      let trigger = "price < 0";
      let pct = 0;
      strategy.steps.forEach(s => {
        if (s.type === 'if_price') {
          trigger = `price ${s.op} ${s.price}`;
        }
        if (s.type === 'swap_percent') {
          pct = s.pct;
        }
        if (s.type === 'stop_after') {
          limit = s.count;
        }
      });
      lines.push(`trigger = (${trigger})`);
      lines.push(`max_trades = ${limit}`);
      lines.push(`swap_percent = ${pct}`);
      lines.push("# Grouped transactions would:");
      lines.push("# 1) read price, 2) if trigger, 3) swap via DEX (Tinyman/Algodex), 4) update trade count");
      return lines.join("\n");
    }
  };
})();