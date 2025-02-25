import Logger from '../utils/logger.js';

class AntiAFKManager {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.interval = null;
    this.actionIndex = 0;
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
    this.interval = setInterval(() => this.performAction(), this.config.antiAfk.interval);
    Logger.log('Anti-AFK mode activated!', 'movement');
  }

  stop() {
    if (!this.interval) return;

    this.config.antiAfk.enabled = false;
    clearInterval(this.interval);
    this.interval = null;
    Logger.log('Anti-AFK mode deactivated!', 'movement');
  }

  async performAction() {
    const actions = this.config.antiAfk.actions;
    
    // Rotate through different actions
    switch (this.actionIndex) {
      case 0:
        if (actions.jump) {
          this.bot.setControlState('jump', true);
          setTimeout(() => this.bot.setControlState('jump', false), 200);
        }
        break;
      
      case 1:
        if (actions.rotate) {
          const currentYaw = this.bot.entity.yaw;
          const newYaw = currentYaw + (this.config.antiAfk.rotationAngle * Math.PI / 180);
          this.bot.look(newYaw, 0);
        }
        break;
      
      case 2:
        if (actions.walk) {
          await this.randomWalk();
        }
        break;
      
      case 3:
        if (actions.swing) {
          this.bot.swingArm();
        }
        break;
    }

    // Cycle through actions
    this.actionIndex = (this.actionIndex + 1) % 4;
  }

  async randomWalk() {
    const distance = this.config.antiAfk.walkDistance;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    try {
      await this.bot.walk(x, z);
    } catch (error) {
      // If walking fails, try jumping
      this.bot.setControlState('jump', true);
      setTimeout(() => this.bot.setControlState('jump', false), 200);
    }
  }
}

export function setupAntiAFK(bot, config) {
  const antiAFKManager = new AntiAFKManager(bot, config);
  return antiAFKManager;
}