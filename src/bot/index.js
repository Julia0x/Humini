const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const { loadConfig } = require('../utils/config');
const { setupCombat } = require('./combat');
const { setupAutoEat } = require('./eating');
const { setupCommands } = require('./commands');
const { setupAntiAFK } = require('./antiafk');

class MinecraftBot {
  constructor() {
    this.config = loadConfig();
    this.bot = null;
    this.initialize();
  }

  initialize() {
    this.bot = mineflayer.createBot({
      host: this.config.bot.host,
      port: this.config.bot.port,
      username: this.config.bot.username,
      version: this.config.bot.version,
      auth: 'offline'
    });

    // Attach config to bot instance for easy access
    this.bot.config = this.config;

    this.loadPlugins();
    this.setupEventHandlers();
    this.initializeModules();
  }

  loadPlugins() {
    this.bot.loadPlugin(pathfinder);
    this.bot.loadPlugin(armorManager);
    import('mineflayer-auto-eat').then(({ plugin }) => {
      this.bot.loadPlugin(plugin);
    });
  }

  setupEventHandlers() {
    this.bot.on('spawn', () => {
      console.log('Bot spawned in the world');
    });

    this.bot.on('error', (err) => {
      console.error('Bot error:', err);
    });

    this.bot.on('end', () => {
      console.log('Bot disconnected. Attempting to reconnect...');
      setTimeout(() => this.initialize(), 5000);
    });
  }

  initializeModules() {
    this.bot.combatManager = setupCombat(this.bot, this.config);
    this.bot.autoEatManager = setupAutoEat(this.bot, this.config);
    this.bot.antiAFKManager = setupAntiAFK(this.bot, this.config);
    this.bot.commandManager = setupCommands(this.bot);
  }
}

module.exports = MinecraftBot;