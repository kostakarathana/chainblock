// Custom blocks: Control (try/catch), Events (price, tweet), Actions (buy/sell)
(function(){
  var COLOR_CONTROL = 270;   // purple
  var COLOR_EVENTS  = 180;   // teal
  var COLOR_ACTIONS = 210;   // blue

  var COINS = [
    ['ALGO','ALGO'], ['USDC','USDC'], ['BTC','BTC'], ['ETH','ETH']
  ];

  // ---------- CONTROL ----------
  Blockly.Blocks['try_catch'] = {
    init: function() {
      this.appendDummyInput().appendField('try/catch');
      this.appendStatementInput('TRY').setCheck(null).appendField('try');
      this.appendStatementInput('CATCH').setCheck(null).appendField('catch');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_CONTROL);
      this.setTooltip('Run actions in try; if fail, run catch');
    }
  };

  // ---------- EVENTS (boolean) ----------
  Blockly.Blocks['event_price_compare'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('price of')
        .appendField(new Blockly.FieldDropdown(COINS), 'COIN')
        .appendField(new Blockly.FieldDropdown([["<","<"],[">",">"] ,["=","="]]), 'OP')
        .appendField(new Blockly.FieldNumber(0.20, 0, 1000000000, 0.0001), 'PRICE');
      this.setOutput(true, 'Boolean');
      this.setColour(COLOR_EVENTS);
      this.setTooltip('Compare coin price to a constant');
    }
  };

  Blockly.Blocks['event_tweet_contains'] = {
    init: function(){
      this.appendDummyInput()
        .appendField('person')
        .appendField(new Blockly.FieldTextInput('@elonmusk'), 'HANDLE')
        .appendField('tweet contains')
        .appendField(new Blockly.FieldTextInput('ALGO'), 'QUERY');
      this.setOutput(true, 'Boolean');
      this.setColour(COLOR_EVENTS);
      this.setTooltip('Mock Twitter keyword event (boolean)');
    }
  };

  // ---------- ACTIONS (statements) ----------
  Blockly.Blocks['action_buy'] = {
    init: function(){
      this.appendDummyInput()
        .appendField('BUY')
        .appendField(new Blockly.FieldNumber(10, 1, 100, 1), 'PCT')
        .appendField('% of')
        .appendField(new Blockly.FieldDropdown(COINS), 'COIN');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_ACTIONS);
      this.setTooltip('Market buy % of portfolio in coin (demo)');
    }
  };

  Blockly.Blocks['action_sell'] = {
    init: function(){
      this.appendDummyInput()
        .appendField('SELL')
        .appendField(new Blockly.FieldNumber(10, 1, 100, 1), 'PCT')
        .appendField('% of')
        .appendField(new Blockly.FieldDropdown(COINS), 'COIN');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_ACTIONS);
      this.setTooltip('Market sell % of portfolio in coin (demo)');
    }
  };
})();