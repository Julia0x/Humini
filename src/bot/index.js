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

    const username = usernameManager.getUsername(this.config);
    Logger.log(`Connecting with username: ${username}${this.config.bot.useRandomUsername ? ' (random)' : ' (fixed)'}`, 'info');

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

    this.bot.on('kicked', (reason, loggedIn) => {
      const reasonJson = JSON.parse(reason);
      const readableReason = reasonJson.text || reasonJson.translate || reason;
      Logger.log(`Bot was kicked! Reason: ${readableReason}`, 'error');
      Logger.log(`Login status: ${loggedIn ? 'Logged in' : 'Not logged in'}`, 'info');
      setTimeout(() => this.initialize(), 5000);
    });

    this.bot.on('end', (reason) => {
      let disconnectReason = 'Unknown reason';

      // Parse common disconnect reasons
      if (typeof reason === 'string') {
        disconnectReason = reason;
      } else if (reason && typeof reason === 'object') {
        if (reason.message) {
          disconnectReason = reason.message;
        } else if (reason.code) {
          // Handle error codes
          switch (reason.code) {
            case 'ECONNREFUSED':
              disconnectReason = 'Connection refused by server';
              break;
            case 'ETIMEDOUT':
              disconnectReason = 'Connection timed out';
              break;
            case 'ECONNRESET':
              disconnectReason = 'Connection reset by server';
              break;
            case 'EPIPE':
              disconnectReason = 'Broken pipe - server closed connection';
              break;
            default:
              disconnectReason = `Error code: ${reason.code}`;
          }
        }
      }

      Logger.log(`Disconnected: ${disconnectReason}`, 'error');
      Logger.log('Attempting to reconnect in 5 seconds...', 'warning');
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

    // Initialize command manager first
    this.bot.commandManager = setupCommands(this.bot);

    // Then initialize other modules that depend on commands
    this.bot.combatManager = setupCombat(this.bot, this.config);
    this.bot.autoEatManager = setupAutoEat(this.bot, this.config);
    this.bot.antiAFKManager = setupAntiAFK(this.bot, this.config);
    this.bot.movementManager = setupMovement(this.bot, this.config);
    this.bot.miningManager = setupMining(this.bot, this.config);

    Logger.log('All modules initialized successfully', 'success');
  }
}

export default MinecraftBot;