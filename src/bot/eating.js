class AutoEatManager {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.isEating = false;
    this.cooldownActive = false;
  }

  initialize() {
    this.bot.once('spawn', () => {
      this.bot.autoEat.options = this.config.autoEat;
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.bot.on('health', () => this.checkFood());
    this.bot.on('autoeat_started', () => {
      console.log('Started eating');
      this.isEating = true;
    });

    this.bot.on('autoeat_stopped', () => {
      console.log('Stopped eating');
      this.isEating = false;
      this.startCooldown();
    });
  }

  checkFood() {
    if (this.shouldEat()) {
      this.startEating();
    }
  }

  shouldEat() {
    return (
      this.bot.food < this.config.autoEat.startAt &&
      !this.cooldownActive &&
      !this.isEating
    );
  }

  startEating() {
    this.bot.chat('Getting hungry, time to eat!');
    this.bot.autoEat.enable();
  }

  startCooldown() {
    this.cooldownActive = true;
    setTimeout(() => {
      this.cooldownActive = false;
    }, this.config.autoEat.cooldown);
  }
}

function setupAutoEat(bot, config) {
  const autoEatManager = new AutoEatManager(bot, config);
  autoEatManager.initialize();
  return autoEatManager;
}

module.exports = { setupAutoEat };