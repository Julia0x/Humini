import mineflayer from 'mineflayer';
import { pathfinder } from 'mineflayer-pathfinder';
import armorManager from 'mineflayer-armor-manager';
import { loadConfig } from '../utils/config.js';
import { setupCombat } from './combat.js';
import { setupAutoEat } from './eating.js';
import { setupCommands } from './commands.js';
import { setupAntiAFK } from './antiafk.js';
import { setupMovement } from './movement.js';
import { setupMining } from './mining.js';
import Logger from '../utils/logger.js';
import { usernameManager } from '../utils/username.js';

class MinecraftBot {
  constructor() {
    this.config = loadConfig();
    this.bot = null;
    Logger.showBanner();
    this.initialize();
  }

  initialize() {
    Logger.log('Initializing Humini bot...', 'info');
    
    const username = usernameManager.getRandomUsername();
    Logger.log(`Connecting with username: ${username}`, 'info');
    
    this.bot = mineflayer.createBot({
      host: this.config.bot.host,
      port: this.config.bot.port,
      username: username,
      version: this.config.bot.version,
      auth: 'offline'
    });

    this.bot.config = this.config;

    this.loadPlugins();
    this.setupEventHandlers();
    this.initializeModules();
  }

  loadPlugins() {
    Logger.log('Loading plugins...', 'info');
    this.bot.loadPlugin(pathfinder);
    this.bot.loadPlugin(armorManager);
    import('mineflayer-auto-eat').then(({ plugin }) => {
      this.bot.loadPlugin(plugin);
      Logger.log('Auto-eat plugin loaded', 'success');
    });
  }

  setupEventHandlers() {
    this.bot.on('spawn', () => {
      Logger.log('Bot spawned in the world', 'success');
      Logger.log('Type "help" for available commands', 'info');
    });

    this.bot.on('error', (err) => {
      Logger.log(`Error: ${err.message}`, 'error');
    });

    this.bot.on('end', () => {
      Logger.log('Disconnected. Attempting to reconnect...', 'warning');
      setTimeout(() => this.initialize(), 5000);
    });

    this.bot.on('death', () => {
      Logger.log('Bot died! Respawning...', 'error');
      if (this.bot.miningManager) {
        this.bot.miningManager.stopMining();
      }
    });

    this.bot.on('health', () => {
      if (this.bot.health < 5) {
        Logger.log(`Low health warning: ${this.bot.health}/20`, 'warning');
        // Stop mining if health is low
        if (this.bot.miningManager && this.bot.miningManager.isMining) {
          this.bot.miningManager.stopMining();
          Logger.log('Mining stopped due to low health', 'warning');
        }
      }
    });

    this.bot.on('playerLeft', (player) => {
      if (this.bot.movementManager.followingPlayer?.username === player.username) {
        this.bot.movementManager.stopFollowing();
        Logger.log(`Stopped following ${player.username} (player left)`, 'movement');
      }
    });
  }

  initializeModules() {
    Logger.log('Initializing modules...', 'info');
    this.bot.combatManager = setupCombat(this.bot, this.config);
    this.bot.autoEatManager = setupAutoEat(this.bot, this.config);
    this.bot.antiAFKManager = setupAntiAFK(this.bot, this.config);
    this.bot.movementManager = setupMovement(this.bot, this.config);
    this.bot.miningManager = setupMining(this.bot, this.config);
    this.bot.commandManager = setupCommands(this.bot);
    Logger.log('All modules initialized successfully', 'success');
  }
}

export default MinecraftBot;