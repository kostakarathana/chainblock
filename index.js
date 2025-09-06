// Mount Blockly, wire buttons, and implement a tiny mocked backtest + deploy log.
(function(){
  const workspace = Blockly.inject('blockly', {
    toolbox: document.getElementById('toolbox'),
    theme: Blockly.Themes.Dark,
    grid: { spacing: 20, length: 3, colour: '#2e335e', snap: true },
    zoom: { controls: true, wheel: true },
    trashcan: true,
    renderer: 'thrasos'
  });

  // Seed with a default stack
  function seedDefault(){
    const xmlText = `
      <xml xmlns="https://developers.google.com/blockly/xml">
        <block type="if_price" x="26" y="36">
          <field name="OP"><</field>
          <field name="PRICE">0.2</field>
          <next>
            <block type="swap_percent">
              <field name="PCT">10</field>
              <next>
                <block type="stop_after">
                  <field name="COUNT">3</field>
                </block>
              </next>
            </block>
          </next>
        </block>
      </xml>`;
    const xml = Blockly.utils.xml.textToDom(xmlText);
    Blockly.Xml.domToWorkspace(xml, workspace);
  }
  seedDefault();

  // Helpers
  const $ = (id) => document.getElementById(id);

  function exportJSON(){
    const data = window.BlocklyStrategy.serializeWorkspaceToJSON(workspace);
    $('jsonOut').value = JS