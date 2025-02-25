import Logger from '../utils/logger.js';
import Vec3 from 'vec3';

class AntiAFKManager {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.interval = null;
    this.actionIndex = 0;
    this.lastChatTime = 0;
    this.lastAction = Date.now();
    this.isPerformingAction = false;
    this.currentSequence = [];
    this.originalPosition = null;
  }

  toggle() {
    if (this.interval) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    if (this.interval) return;

    this.config.antiAfk.enabled = true;
    this.originalPosition = this.bot.entity.position.clone();
    this.generateActionSequence();
    this.interval = setInterval(() => this.executeNextAction(), this.config.antiAfk.interval);
    Logger.log('Anti-AFK mode activated with natural player behavior!', 'movement');
  }

  stop() {
    if (!this.interval) return;

    this.config.antiAfk.enabled = false;
    clearInterval(this.interval);
    this.interval = null;
    this.currentSequence = [];
    this.isPerformingAction = false;

    // Return to original position if possible
    if (this.originalPosition) {
      this.walkToPosition(this.originalPosition);
    }

    Logger.log('Anti-AFK mode deactivated!', 'movement');
  }

  generateActionSequence() {
    const actions = [];
    const { antiAfk } = this.config;

    // Add basic movements
    if (antiAfk.actions.walk) actions.push('walk');
    if (antiAfk.actions.jump) actions.push('jump');
    if (antiAfk.actions.rotate) actions.push('rotate');
    if (antiAfk.actions.swing) actions.push('swing');
    if (antiAfk.actions.sneak) actions.push('sneak');
    if (antiAfk.actions.inventory) actions.push('inventory');

    // Shuffle array for randomness
    this.currentSequence = this.shuffleArray([...actions]);

    // Add chat messages with lower frequency
    if (antiAfk.actions.chat && Date.now() - this.lastChatTime > antiAfk.chatInterval) {
      this.currentSequence.push('chat');
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async executeNextAction() {
    if (this.isPerformingAction) return;

    if (this.currentSequence.length === 0) {
      this.generateActionSequence();
    }

    const action = this.currentSequence.shift();
    if (!action) return;

    this.isPerformingAction = true;
    await this.performNaturalDelay();

    try {
      switch (action) {
        case 'walk':
          await this.performRandomWalk();
          break;
        case 'jump':
          await this.performJump();
          break;
        case 'rotate':
          await this.performRotation();
          break;
        case 'swing':
          await this.performArmSwing();
          break;
        case 'sneak':
          await this.performSneak();
          break;
        case 'inventory':
          await this.performInventoryAction();
          break;
        case 'chat':
          await this.performChat();
          break;
      }
    } catch (error) {
      Logger.log(`Failed to perform anti-AFK action: ${error.message}`, 'error');
    }

    this.isPerformingAction = false;
    this.lastAction = Date.now();
  }

  async performNaturalDelay() {
    const { min, max } = this.config.antiAfk.naturalDelay;
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async performRandomWalk() {
    const distance = this.config.antiAfk.walkDistance;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    try {
      // First look in the direction we're going to walk
      await this.bot.look(angle, 0);
      await this.performNaturalDelay();

      // Start walking
      this.bot.setControlState('forward', true);
      await new Promise(resolve => setTimeout(resolve, 1000 * (distance / 4.3))); // 4.3 blocks/s is default walking speed
      this.bot.setControlState('forward', false);

      // Sometimes add a small jump while walking
      if (Math.random() < 0.3) {
        await this.performJump();
      }
    } catch (error) {
      this.bot.setControlState('forward', false);
      Logger.log('Failed to complete walking sequence', 'warning');
    }
  }

  async performJump() {
    this.bot.setControlState('jump', true);
    await new Promise(resolve => setTimeout(resolve, 250));
    this.bot.setControlState('jump', false);
  }

  async performRotation() {
    const startYaw = this.bot.entity.yaw;
    const startPitch = this.bot.entity.pitch;

    // Random smooth rotation
    const targetYaw = startYaw + (Math.random() * 2 - 1) * Math.PI;
    const targetPitch = (Math.random() - 0.5) * Math.PI / 2;

    await this.bot.look(targetYaw, targetPitch, true);
  }

  async performArmSwing() {
    // Swing both arms alternately
    await this.bot.swingArm('right');
    await this.performNaturalDelay();
    await this.bot.swingArm('left');
  }

  async performSneak() {
    this.bot.setControlState('sneak', true);
    await new Promise(resolve => setTimeout(resolve, this.config.antiAfk.sneakDuration));
    this.bot.setControlState('sneak', false);
  }

  async performInventoryAction() {
    // Randomly open and close inventory
    await this.bot.openInventory();
    await new Promise(resolve => setTimeout(resolve, this.config.antiAfk.inventoryDuration));
    await this.bot.closeWindow(this.bot.inventory.window);
  }

  async performChat() {
    if (Date.now() - this.lastChatTime < this.config.antiAfk.chatInterval) return;

    const messages = this.config.antiAfk.chatMessages;
    const message = messages[Math.floor(Math.random() * messages.length)];

    try {
      await this.bot.chat(message);
      this.lastChatTime = Date.now();
    } catch (error) {
      Logger.log('Failed to send chat message', 'warning');
    }
  }

  async walkToPosition(position) {
    try {
      const dx = position.x - this.bot.entity.position.x;
      const dz = position.z - this.bot.entity.position.z;
      const angle = Math.atan2(dz, dx);

      await this.bot.look(angle, 0);
      this.bot.setControlState('forward', true);

      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          const dist = this.bot.entity.position.distanceTo(position);
          if (dist < 0.5) {
            clearInterval(checkInterval);
            this.bot.setControlState('forward', false);
            resolve();
          }
        }, 100);
      });
    } catch (error) {
      this.bot.setControlState('forward', false);
      Logger.log('Failed to return to original position', 'warning');
    }
  }
}

export function setupAntiAFK(bot, config) {
  const antiAFKManager = new AntiAFKManager(bot, config);
  return antiAFKManager;
}