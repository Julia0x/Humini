import readline from 'readline';
import Logger from '../utils/logger.js';

class CommandManager {
  constructor(bot) {
    this.bot = bot;
    this.commands = new Map();
    this.setupCommands();
    this.setupConsoleInput();
  }

  setupCommands() {
    this.commands.set('chat', (args) => {
      if (!this.bot.entity) {
        Logger.log('Cannot send chat message - bot not spawned yet', 'error');
        return;
      }
      try {
        const message = args.join(' ');
        this.bot.chat(message);
        Logger.log(`Chat message sent: ${message}`, 'info');
      } catch (error) {
        Logger.log(`Failed to send chat message: ${error.message}`, 'error');
      }
    });

    this.commands.set('stats', () => this.printStats());
    this.commands.set('armor', () => this.printArmorStats());
    this.commands.set('autoEquipArmor', () => {
      if (!this.bot.entity) {
        Logger.log('Cannot equip armor - bot not spawned yet', 'error');
        return;
      }
      try {
        this.bot.armorManager.equipAll();
        Logger.log('Auto-equipped best armor', 'success');
      } catch (error) {
        Logger.log(`Failed to equip armor: ${error.message}`, 'error');
      }
    });
    
    this.commands.set('killaura', (args) => {
      if (!this.bot.entity) {
        Logger.log('Cannot toggle Kill Aura - bot not spawned yet', 'error');
        return;
      }
      const subCommand = args[0];
      if (subCommand === 'toggle') {
        this.bot.combatManager.toggleKillAura();
        Logger.log(
          `Kill Aura ${this.bot.config.combat.killAura.enabled ? 'enabled' : 'disabled'}`,
          'combat'
        );
      } else {
        Logger.log('Usage: killaura toggle', 'warning');
      }
    });

    this.commands.set('antiafk', (args) => {
      if (!this.bot.entity) {
        Logger.log('Cannot toggle Anti-AFK - bot not spawned yet', 'error');
        return;
      }
      const subCommand = args[0];
      if (subCommand === 'toggle') {
        this.bot.antiAFKManager.toggle();
        Logger.log(
          `Anti-AFK ${this.bot.config.antiAfk.enabled ? 'enabled' : 'disabled'}`,
          'movement'
        );
      } else {
        Logger.log('Usage: antiafk toggle', 'warning');
      }
    });

    this.commands.set('follow', (args) => {
      if (!this.bot.entity) {
        Logger.log('Cannot follow player - bot not spawned yet', 'error');
        return;
      }
      if (args.length === 0) {
        Logger.log('Usage: follow <player_name> OR follow stop', 'warning');
        return;
      }

      const subCommand = args[0].toLowerCase();
      
      if (subCommand === 'stop') {
        this.bot.movementManager.stopFollowing();
        Logger.log('Stopped following player', 'movement');
        return;
      }

      const playerName = args[0];
      const player = this.bot.players[playerName]?.entity;
      
      if (!player) {
        Logger.log(`Player ${playerName} not found`, 'error');
        return;
      }

      this.bot.movementManager.followPlayer(player);
      Logger.log(`Now following player: ${playerName}`, 'movement');
    });

    this.commands.set('inventory', (args) => {
      if (!this.bot.entity) {
        Logger.log('Cannot manage inventory - bot not spawned yet', 'error');
        return;
      }
      const subCommand = args[0]?.toLowerCase();
      if (subCommand === 'sort') {
        this.bot.inventoryManager.sortInventory();
      } else if (subCommand === 'clean') {
        this.bot.inventoryManager.cleanInventory(this.bot.inventory.items());
      } else if (subCommand === 'dropall') {
        this.dropAllItems();
      } else {
        Logger.log('Usage: inventory sort|clean|dropall', 'warning');
      }
    });

    this.commands.set('mine', (args) => {
      if (!this.bot.entity) {
        Logger.log('Cannot start mining - bot not spawned yet', 'error');
        return;
      }

      const subCommand = args[0]?.toLowerCase();
      if (subCommand === 'start') {
        this.bot.miningManager.startMining();
      } else if (subCommand === 'stop') {
        this.bot.miningManager.stopMining();
      } else {
        Logger.log('Usage: mine start|stop', 'warning');
      }
    });

    // Add custom commands from config
    if (this.bot.config.customCommands) {
      Object.entries(this.bot.config.customCommands).forEach(([cmd, message]) => {
        this.commands.set(cmd, () => {
          if (!this.bot.entity) {
            Logger.log('Cannot send custom message - bot not spawned yet', 'error');
            return;
          }
          try {
            this.bot.chat(message);
            Logger.log(`Custom command executed: ${cmd} -> ${message}`, 'info');
          } catch (error) {
            Logger.log(`Failed to execute custom command: ${error.message}`, 'error');
          }
        });
      });
    }

    this.commands.set('help', () => {
      Logger.divider();
      Logger.log('Available Commands:', 'info');
      const standardCommands = {
        'chat <message>': 'Send a chat message',
        'stats': 'Show bot statistics',
        'armor': 'Show armor status',
        'autoEquipArmor': 'Automatically equip best armor',
        'killaura toggle': 'Toggle Kill Aura mode',
        'antiafk toggle': 'Toggle Anti-AFK mode',
        'follow <player>': 'Follow a specific player',
        'follow stop': 'Stop following player',
        'inventory sort': 'Sort inventory items',
        'inventory clean': 'Clean junk from inventory',
        'inventory dropall': 'Drop all items from inventory',
        'mine start': 'Start mining operation',
        'mine stop': 'Stop mining operation'
      };

      // Add custom commands to help
      const customCommands = {};
      if (this.bot.config.customCommands) {
        Object.keys(this.bot.config.customCommands).forEach(cmd => {
          customCommands[cmd] = `Custom chat command: "${this.bot.config.customCommands[cmd]}"`;
        });
      }

      Logger.table(standardCommands, 'Standard Commands');
      if (Object.keys(customCommands).length > 0) {
        Logger.table(customCommands, 'Custom Commands');
      }
      Logger.divider();
    });
  }

  async dropAllItems() {
    if (!this.bot.entity) {
      Logger.log('Cannot drop items - bot not spawned yet', 'error');
      return;
    }
    const items = this.bot.inventory.items();
    if (items.length === 0) {
      Logger.log('Inventory is already empty', 'info');
      return;
    }

    Logger.log(`Dropping ${items.length} items...`, 'info');
    
    for (const item of items) {
      try {
        await this.bot.tossStack(item);
        Logger.log(`Dropped ${item.name} x${item.count}`, 'info');
      } catch (error) {
        Logger.log(`Failed to drop ${item.name}: ${error.message}`, 'error');
      }
    }

    Logger.log('Finished dropping all items', 'success');
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
      try {
        handler(args);
      } catch (error) {
        Logger.log(`Error executing command: ${error.message}`, 'error');
      }
    } else {
      Logger.log(`Unknown command: ${command}. Type 'help' for available commands.`, 'error');
    }
  }

  printStats() {
    if (!this.bot.entity) {
      Logger.log('Cannot show stats - bot not spawned yet', 'error');
      return;
    }
    const stats = {
      Health: `${this.bot.health}/20`,
      Food: `${this.bot.food}/20`,
      Position: `X: ${Math.round(this.bot.entity.position.x)} Y: ${Math.round(this.bot.entity.position.y)} Z: ${Math.round(this.bot.entity.position.z)}`,
      'Kill Aura': this.bot.config.combat.killAura.enabled ? 'Enabled' : 'Disabled',
      'Anti-AFK': this.bot.config.antiAfk.enabled ? 'Enabled' : 'Disabled',
      'Following': this.bot.movementManager.followingPlayer ? this.bot.movementManager.followingPlayer.username : 'No one'
    };

    Logger.divider();
    Logger.table(stats, 'Bot Statistics');
    
    const inventory = this.bot.inventory.items().map(item => ({
      Name: item.name,
      Count: item.count
    }));
    
    if (inventory.length > 0) {
      Logger.table(inventory, 'Inventory');
    } else {
      Logger.log('Inventory is empty', 'info');
    }
    Logger.divider();
  }

  printArmorStats() {
    if (!this.bot.entity) {
      Logger.log('Cannot show armor stats - bot not spawned yet', 'error');
      return;
    }
    const armorSlots = {
      Helmet: this.bot.inventory.slots[5]?.name || 'None',
      Chestplate: this.bot.inventory.slots[6]?.name || 'None',
      Leggings: this.bot.inventory.slots[7]?.name || 'None',
      Boots: this.bot.inventory.slots[8]?.name || 'None'
    };

    Logger.divider();
    Logger.table(armorSlots, 'Armor Status');
    Logger.divider();
  }
}

export function setupCommands(bot) {
  const commandManager = new CommandManager(bot);
  return commandManager;
}