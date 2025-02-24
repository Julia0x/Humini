const { Movements, goals } = require('mineflayer-pathfinder');
const { GoalFollow } = goals;

class CombatManager {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.isAttacking = false;
    this.killAuraInterval = null;
    this.lastAttackTime = 0;
    this.rotationAngle = 0;
  }

  startAttack() {
    if (this.killAuraInterval) return;
    
    this.isAttacking = true;
    this.killAuraInterval = setInterval(() => this.performAttack(), this.config.combat.attackInterval);
    this.bot.chat('Combat mode activated!');
  }

  stopAttack() {
    if (!this.killAuraInterval) return;
    
    clearInterval(this.killAuraInterval);
    this.killAuraInterval = null;
    this.isAttacking = false;
    this.bot.chat('Combat mode deactivated!');
  }

  toggleKillAura() {
    this.config.combat.killAura.enabled = !this.config.combat.killAura.enabled;
    if (this.config.combat.killAura.enabled) {
      this.startKillAura();
    } else {
      this.stopKillAura();
    }
  }

  startKillAura() {
    if (this.killAuraInterval) return;
    
    this.isAttacking = true;
    this.killAuraInterval = setInterval(() => {
      this.rotateAndAttack();
    }, this.config.combat.killAura.rotationSpeed);
    
    this.bot.chat('Kill Aura activated!');
  }

  stopKillAura() {
    if (!this.killAuraInterval) return;
    
    clearInterval(this.killAuraInterval);
    this.killAuraInterval = null;
    this.isAttacking = false;
    this.bot.chat('Kill Aura deactivated!');
  }

  rotateAndAttack() {
    // Rotate 360 degrees continuously
    this.rotationAngle = (this.rotationAngle + 45) % 360;
    this.bot.look(this.rotationAngle * Math.PI / 180, 0);

    // Find and attack multiple targets
    const targets = this.findMultipleTargets();
    targets.forEach(target => this.attackTarget(target));
  }

  async performAttack() {
    const target = this.findTarget();
    if (!target) return;

    const now = Date.now();
    if (now - this.lastAttackTime < this.config.combat.attackInterval) return;

    if (this.bot.entity.position.distanceTo(target.position) <= this.config.combat.attackRange) {
      await this.equipBestWeapon();
      this.bot.attack(target);
      this.lastAttackTime = now;
    } else {
      this.followTarget(target);
    }
  }

  findMultipleTargets() {
    const entities = Object.values(this.bot.entities);
    return entities
      .filter(entity => {
        const isValidTarget = this.config.combat.targetMobs.includes(entity.name);
        const isPlayer = this.config.combat.killAura.targetPlayers && entity.type === 'player';
        return (isValidTarget || isPlayer) && 
               this.bot.entity.position.distanceTo(entity.position) <= this.config.combat.attackRange;
      })
      .slice(0, this.config.combat.killAura.maxTargets);
  }

  async attackTarget(target) {
    if (!target) return;

    const now = Date.now();
    if (now - this.lastAttackTime < this.config.combat.attackInterval) return;

    await this.equipBestWeapon();
    this.bot.attack(target);
    this.lastAttackTime = now;
  }

  findTarget() {
    return this.bot.nearestEntity(entity => 
      this.config.combat.targetMobs.includes(entity.name)
    );
  }

  async equipBestWeapon() {
    const weapons = this.bot.inventory.items().filter(item => 
      item.name.includes('sword') || item.name.includes('axe')
    );

    if (weapons.length === 0) return;

    const bestWeapon = weapons.reduce((best, current) => 
      (current.name.includes('netherite') || current.name.includes('diamond')) ? current : best
    );

    await this.bot.equip(bestWeapon, 'hand');
  }

  followTarget(target) {
    const defaultMove = new Movements(this.bot);
    this.bot.pathfinder.setMovements(defaultMove);
    this.bot.pathfinder.setGoal(new GoalFollow(target, this.config.movement.followDistance));
  }
}

function setupCombat(bot, config) {
  const combatManager = new CombatManager(bot, config);
  return combatManager;
}

module.exports = { setupCombat };