const readline = require('readline');

class CommandManager {
  constructor(bot) {
    this.bot = bot;
    this.commands = new Map();
    this.setupCommands();
    this.setupConsoleInput();
  }

  setupCommands() {
    this.commands.set('chat', (args) => {
      const message = args.join(' ');
      this.bot.chat(message);
    });

    this.commands.set('stats', () => this.printStats());
    this.commands.set('armor', () => this.printArmorStats());
    this.commands.set('autoEquipArmor', () => this.bot.armorManager.equipAll());
    
    // New commands for Kill Aura and Anti-AFK
    this.commands.set('killaura', (args) => {
      const subCommand = args[0];
      if (subCommand === 'toggle') {
        this.bot.combatManager.toggleKillAura();
        console.log(`Kill Aura ${this.bot.config.combat.killAura.enabled ? 'enabled' : 'disabled'}`);
      } else {
        console.log('Usage: killaura toggle');
      }
    });

    this.commands.set('antiafk', (args) => {
      const subCommand = args[0];
      if (subCommand === 'toggle') {
        this.bot.antiAFKManager.toggle();
        console.log(`Anti-AFK ${this.bot.config.antiAfk.enabled ? 'enabled' : 'disabled'}`);
      } else {
        console.log('Usage: antiafk toggle');
      }
    });
  }

  setupConsoleInput() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', (input) => this.handleCommand(input));
  }

  handleCommand(input) {
    const [command, ...args] = input.split(' ');
    const handler = this.commands.get(command);

    if (handler) {
      handler(args);
    } else {
      console.log(`Unknown command: ${command}`);
    }
  }

  printStats() {
    const stats = {
      health: this.bot.health,
      food: this.bot.food,
      position: this.bot.entity.position,
      inventory: this.bot.inventory.items().map(item => `${item.name} x${item.count}`),
      'Kill Aura': this.bot.config.combat.killAura.enabled ? 'Enabled' : 'Disabled',
      'Anti-AFK': this.bot.config.antiAfk.enabled ? 'Enabled' : 'Disabled'
    };

    console.log('Player Stats:');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`);
    });
  }

  printArmorStats() {
    const armorSlots = {
      helmet: 5,
      chestplate: 6,
      leggings: 7,
      boots: 8
    };

    console.log('Armor Stats:');
    Object.entries(armorSlots).forEach(([piece, slot]) => {
      const item = this.bot.inventory.slots[slot];
      console.log(`${piece.charAt(0).toUpperCase() + piece.slice(1)}: ${item ? item.name : 'None'}`);
    });
  }
}

function setupCommands(bot) {
  const commandManager = new CommandManager(bot);
  return commandManager;
}

module.exports = { setupCommands };