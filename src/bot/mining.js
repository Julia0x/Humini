import pkg from 'mineflayer-pathfinder';
import Vec3 from 'vec3';
import Logger from '../utils/logger.js';

const { Movements, goals } = pkg;
const { GoalNear } = goals;

class MiningManager {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.isMining = false;
    this.stopRequested = false;
    this.foundOres = new Map();
    this.exploredAreas = new Set();
    this.chestLocations = new Set();
    this.searchRadius = 5;
    this.maxSearchRadius = this.config.mining.maxDistance || 32;
    this.retryAttempts = 0;
    this.targetBlocks = new Set(Object.keys(this.config.mining.orePriority));
    this.miningTimeout = null;
    this.stats = {
      startTime: Date.now(),
      totalBlocksMined: 0,
      oresMined: {},
      blocksPerMinute: 0,
      toolDurability: {},
      lastUpdate: Date.now()
    };

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Handle bot death
    this.bot.on('death', () => {
      this.handleEmergencyStop('Bot died');
    });

    // Handle disconnection
    this.bot.on('end', () => {
      this.handleEmergencyStop('Bot disconnected');
    });

    // Handle kicked
    this.bot.on('kicked', () => {
      this.handleEmergencyStop('Bot was kicked');
    });

    // Handle error
    this.bot.on('error', (error) => {
      this.handleEmergencyStop(`Bot error: ${error.message}`);
    });
  }

  handleEmergencyStop(reason) {
    Logger.log(`Emergency stop: ${reason}`, 'error');
    this.cleanupMining();
  }

  cleanupMining() {
    this.isMining = false;
    this.stopRequested = true;
    if (this.miningTimeout) {
      clearTimeout(this.miningTimeout);
      this.miningTimeout = null;
    }
    this.foundOres.clear();
    this.bot.pathfinder.stop();
    this.bot.clearControlStates();
  }

  startMining() {
    if (this.isMining) {
      Logger.log('Mining is already in progress', 'warning');
      return;
    }

    try {
      // Check if bot is alive and connected
      if (!this.bot.entity) {
        throw new Error('Bot is not spawned');
      }

      // Check for required tools
      const hasPickaxe = this.bot.inventory.items().some(item => item.name.includes('pickaxe'));
      if (!hasPickaxe) {
        throw new Error('No pickaxe found in inventory');
      }

      this.isMining = true;
      this.stopRequested = false;
      Logger.log('Starting mining operation...', 'info');
      this.miningLoop();

    } catch (error) {
      Logger.log(`Failed to start mining: ${error.message}`, 'error');
      this.cleanupMining();
    }
  }

  stopMining() {
    if (!this.isMining) {
      Logger.log('Mining is not in progress', 'warning');
      return;
    }

    Logger.log('Stopping mining operation...', 'info');
    this.cleanupMining();

    // Ensure the bot returns to a safe state
    try {
      this.bot.pathfinder.stop();
      this.bot.clearControlStates();
    } catch (error) {
      Logger.log(`Error during stop cleanup: ${error.message}`, 'warning');
    }
  }

  async miningLoop() {
    while (this.isMining && !this.stopRequested) {
      try {
        // Check if bot is still alive and connected
        if (!this.bot.entity) {
          throw new Error('Bot is not spawned');
        }

        // Check inventory space
        if (this.shouldDepositItems()) {
          await this.depositItems();
        }

        // Scan for ores
        await this.scanForOres();
        const target = await this.findNearestOre();

        if (this.stopRequested) {
          break;
        }

        if (target) {
          await this.mineOreVein(target);
          if (this.config.mining.pickupItems) {
            await this.collectNearbyItems();
          }
        } else {
          await this.expandSearchArea();
        }

        // Add a small delay to prevent excessive CPU usage
        await new Promise(resolve => {
          this.miningTimeout = setTimeout(resolve, 100);
        });

      } catch (error) {
        Logger.log(`Mining error: ${error.message}`, 'error');

        if (error.message.includes('Bot is not spawned') ||
            error.message.includes('disconnected')) {
          this.handleEmergencyStop('Bot disconnected or died');
          break;
        }

        // Wait before retrying
        await new Promise(resolve => {
          this.miningTimeout = setTimeout(resolve, 1000);
        });
      }
    }

    // Ensure cleanup happens if we break the loop
    if (this.isMining) {
      this.cleanupMining();
    }
  }

  getBlockKey(pos) {
    return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
  }

  getVec3FromKey(key) {
    const [x, y, z] = key.split(',').map(Number);
    return new Vec3(x, y, z);
  }

  async scanForOres() {
    if (this.stopRequested) return;

    const botPos = this.bot.entity.position;
    const { horizontal, vertical } = this.config.mining.scanRadius;

    for (let y = -vertical; y <= vertical; y++) {
      for (let x = -horizontal; x <= horizontal; x++) {
        for (let z = -horizontal; z <= horizontal; z++) {
          if (this.stopRequested) return;

          const pos = botPos.offset(x, y, z);
          const block = this.bot.blockAt(pos);

          if (!block) continue;

          const key = this.getBlockKey(pos);
          if (this.targetBlocks.has(block.name) && !this.exploredAreas.has(key)) {
            this.foundOres.set(key, {
              block,
              priority: this.config.mining.orePriority[block.name] || 1
            });
          }
        }
      }
    }
  }

  async expandSearchArea() {
    if (this.stopRequested) return;

    const botPos = this.bot.entity.position;
    const directions = [
      [1, 0], [-1, 0],
      [0, 1], [0, -1],
      [1, 1], [-1, 1],
      [1, -1], [-1, -1]
    ];

    let succeeded = false;

    for (const [dx, dz] of directions) {
      if (this.stopRequested) return;

      const targetX = botPos.x + dx * this.searchRadius;
      const targetZ = botPos.z + dz * this.searchRadius;

      for (const yOffset of [-1, 0, 1]) {
        if (this.stopRequested) return;

        const targetY = botPos.y + yOffset;
        const goal = new GoalNear(targetX, targetY, targetZ, 2);

        try {
          const movements = new Movements(this.bot);
          movements.canDig = true;
          movements.allowParkour = true;
          this.bot.pathfinder.setMovements(movements);

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Pathfinding timeout')), 10000);
          });

          await Promise.race([
            this.bot.pathfinder.goto(goal),
            timeoutPromise
          ]);

          succeeded = true;
          break;
        } catch (error) {
          if (this.stopRequested) return;

          if (error.message === 'Pathfinding timeout') {
            Logger.log('Pathfinding took too long, trying different direction', 'warning');
          } else {
            Logger.log(`Failed to explore at Y=${yOffset}: ${error.message}`, 'warning');
          }
        }
      }

      if (succeeded || this.stopRequested) break;
    }

    if (!succeeded && !this.stopRequested) {
      Logger.log('Failed to expand search area, will try different direction next time', 'warning');
      this.retryAttempts++;

      if (this.retryAttempts % directions.length === 0) {
        this.searchRadius = Math.min(this.searchRadius + 5, this.maxSearchRadius);
      }
    } else {
      this.retryAttempts = 0;
    }

    if (!this.stopRequested) {
      await this.scanForOres();
    }
  }

  async findNearestOre() {
    if (this.stopRequested) return null;

    let bestScore = Infinity;
    let bestOre = null;
    const botPos = this.bot.entity.position;

    for (const [key, data] of this.foundOres) {
      if (this.stopRequested) return null;

      const pos = this.getVec3FromKey(key);
      const dist = botPos.distanceTo(pos);

      const priority = this.config.mining.orePriority[data.block.name] || 1;
      const score = dist / (priority * priority);

      if (score < bestScore) {
        bestScore = score;
        bestOre = { pos, block: data.block };
      }
    }

    return bestOre;
  }

  async mineOreVein(target) {
    if (!target || !target.pos || !target.block || this.stopRequested) {
      return;
    }

    const key = this.getBlockKey(target.pos);
    const block = this.bot.blockAt(target.pos);

    if (!block || !this.targetBlocks.has(block.name)) {
      this.foundOres.delete(key);
      return;
    }

    try {
      await this.navigateToBlock(target.pos);

      if (this.stopRequested) return;

      if (this.config.mining.liquidHandling.enabled) {
        await this.handleLiquids(target.pos);
      }

      if (this.stopRequested) return;

      await this.equipBestTool();

      if (this.stopRequested) return;

      await this.bot.dig(block);
      Logger.log(`Mined ${block.name} at ${Math.floor(target.pos.x)}, ${Math.floor(target.pos.y)}, ${Math.floor(target.pos.z)}`, 'success');

      this.exploredAreas.add(key);
      this.updateBlockStats(block.name);
      this.foundOres.delete(key);

      if (!this.stopRequested) {
        await this.checkSurroundingBlocks(target.pos, block.name);
      }

    } catch (error) {
      Logger.log(`Failed to mine block: ${error.message}`, 'error');
      this.foundOres.delete(key);
    }
  }

  async navigateToBlock(pos) {
    if (this.stopRequested) return;

    const movements = new Movements(this.bot);
    movements.canDig = true;
    movements.allowParkour = true;
    movements.allowSprinting = true;
    movements.blocksCantBreak = new Set([...this.targetBlocks]);

    this.bot.pathfinder.setMovements(movements);

    const goal = new GoalNear(pos.x, pos.y, pos.z, 2);

    try {
      await this.bot.pathfinder.goto(goal);
    } catch (error) {
      if (!this.stopRequested && this.needsBridge(pos)) {
        await this.buildBridgeToBlock(pos);
      }
    }
  }

  async handleLiquids(pos) {
    if (this.stopRequested) return;

    const surroundingBlocks = [
      pos.offset(1, 0, 0),
      pos.offset(-1, 0, 0),
      pos.offset(0, 0, 1),
      pos.offset(0, 0, -1),
      pos.offset(0, 1, 0),
      pos.offset(0, -1, 0)
    ];

    for (const blockPos of surroundingBlocks) {
      if (this.stopRequested) return;

      const block = this.bot.blockAt(blockPos);
      if (!block) continue;

      if (block.name === 'lava' && this.config.mining.liquidHandling.avoidLava) {
        await this.placeSafetyBlock(blockPos);
      } else if (block.name === 'water' && this.config.mining.liquidHandling.placeWaterBuckets) {
        await this.handleWater(blockPos);
      }
    }
  }

  async placeSafetyBlock(pos) {
    if (this.stopRequested) return;

    const safetyBlock = this.bot.inventory.items().find(item =>
        this.config.mining.liquidHandling.safetyBlocks.includes(item.name)
    );

    if (!safetyBlock) {
      Logger.log('No safety blocks available', 'warning');
      return;
    }

    try {
      await this.bot.equip(safetyBlock, 'hand');
      const referenceBlock = this.bot.blockAt(pos.offset(0, -1, 0));
      await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
    } catch (error) {
      Logger.log(`Failed to place safety block: ${error.message}`, 'warning');
    }
  }

  async handleWater(pos) {
    if (this.stopRequested) return;

    const waterBucket = this.bot.inventory.items().find(item =>
        item.name === 'water_bucket'
    );

    if (!waterBucket) {
      Logger.log('No water bucket available', 'warning');
      return;
    }

    try {
      await this.bot.equip(waterBucket, 'hand');
      await this.bot.placeBlock(this.bot.blockAt(pos), new Vec3(0, 1, 0));
    } catch (error) {
      Logger.log(`Failed to place water: ${error.message}`, 'warning');
    }
  }

  needsBridge(targetPos) {
    const botPos = this.bot.entity.position;
    const block = this.bot.blockAt(botPos.offset(0, -1, 0));
    return block && this.config.mining.liquidHandling.safetyBlocks.includes(block.name);
  }

  async buildBridgeToBlock(targetPos) {
    if (this.stopRequested) return;

    const buildingBlock = this.bot.inventory.items().find(item =>
        this.config.mining.liquidHandling.safetyBlocks.includes(item.name)
    );

    if (!buildingBlock) {
      Logger.log('No building blocks available', 'warning');
      return;
    }

    try {
      await this.bot.equip(buildingBlock, 'hand');
      const referenceBlock = this.bot.blockAt(this.bot.entity.position.offset(0, -1, 0));
      await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
    } catch (error) {
      Logger.log(`Failed to build bridge: ${error.message}`, 'warning');
    }
  }

  async checkSurroundingBlocks(centerPos, oreName) {
    if (this.stopRequested) return;

    const offsets = [
      [0, 1, 0], [0, -1, 0],
      [1, 0, 0], [-1, 0, 0],
      [0, 0, 1], [0, 0, -1],
      [1, 1, 0], [-1, 1, 0],
      [0, 1, 1], [0, 1, -1],
      [1, -1, 0], [-1, -1, 0],
      [0, -1, 1], [0, -1, -1]
    ];

    for (const [dx, dy, dz] of offsets) {
      if (this.stopRequested) return;

      const pos = centerPos.offset(dx, dy, dz);
      const block = this.bot.blockAt(pos);

      if (block && block.name === oreName) {
        const key = this.getBlockKey(pos);
        this.foundOres.set(key, {
          block,
          priority: this.config.mining.orePriority[block.name] || 1
        });
      }
    }
  }

  async equipBestTool() {
    if (this.stopRequested) return;

    const tools = this.bot.inventory.items().filter(item =>
        item.name.includes('pickaxe')
    );

    if (tools.length === 0) {
      throw new Error('No pickaxe found in inventory');
    }

    const toolTiers = {
      'netherite': 5,
      'diamond': 4,
      'iron': 3,
      'stone': 2,
      'wooden': 1,
      'golden': 0
    };

    const bestTool = tools.reduce((best, current) => {
      const currentTier = Object.entries(toolTiers)
          .find(([material]) => current.name.includes(material));
      const bestTier = Object.entries(toolTiers)
          .find(([material]) => best.name.includes(material));

      return (currentTier && bestTier && toolTiers[currentTier[0]] > toolTiers[bestTier[0]])
          ? current : best;
    });

    await this.bot.equip(bestTool, 'hand');
    Logger.log(`Equipped ${bestTool.name}`, 'info');
  }

  shouldDepositItems() {
    const inventory = this.bot.inventory.items();
    const freeSlots = 36 - inventory.length;
    return freeSlots <= this.config.mining.chestManagement.minFreeSlots;
  }

  async depositItems() {
    if (this.stopRequested) return;

    if (this.chestLocations.size === 0) {
      Logger.log('No chest locations set for depositing items', 'warning');
      return;
    }

    const nearestChest = this.findNearestChest();
    if (!nearestChest) {
      Logger.log('No accessible chests found', 'warning');
      return;
    }

    try {
      await this.navigateToBlock(nearestChest);

      if (this.stopRequested) return;

      const chest = this.bot.blockAt(nearestChest);
      await this.bot.openChest(chest);

      if (this.stopRequested) {
        await this.bot.closeWindow(chest);
        return;
      }

      const inventory = this.bot.inventory.items();
      for (const item of inventory) {
        if (this.stopRequested) {
          await this.bot.closeWindow(chest);
          return;
        }

        if (!this.config.mining.inventory.keepItems.includes(item.name)) {
          await this.bot.deposit(chest.type, null, item.count);
        }
      }

      await this.bot.closeWindow(chest);
      Logger.log('Items deposited successfully', 'success');
    } catch (error) {
      Logger.log(`Failed to deposit items: ${error.message}`, 'error');
    }
  }

  findNearestChest() {
    if (this.stopRequested) return null;

    let nearestDist = Infinity;
    let nearestChest = null;
    const botPos = this.bot.entity.position;

    for (const [_, chestPos] of this.chestLocations) {
      if (this.stopRequested) return null;

      const dist = botPos.distanceTo(chestPos);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestChest = chestPos;
      }
    }

    return nearestChest;
  }

  async collectNearbyItems() {
    if (this.stopRequested) return;

    const items = Object.values(this.bot.entities).filter(entity =>
        entity.type === 'object' &&
        entity.position &&
        entity.position.distanceTo(this.bot.entity.position) <= 4
    );

    for (const item of items) {
      if (this.stopRequested) return;

      try {
        await this.bot.collect(item);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        // Silently handle collection errors
      }
    }
  }

  updateBlockStats(blockName) {
    this.stats.totalBlocksMined++;
    this.stats.oresMined[blockName] = (this.stats.oresMined[blockName] || 0) + 1;

    const now = Date.now();
    const timeDiff = (now - this.stats.startTime) / 1000 / 60;
    this.stats.blocksPerMinute = this.stats.totalBlocksMined / timeDiff;

    const tool = this.bot.inventory.items().find(item => item.name.includes('pickaxe'));
    if (tool) {
      this.stats.toolDurability[tool.name] = tool.durability;
    }

    this.stats.lastUpdate = now;
  }
}

function setupMining(bot, config) {
  const miningManager = new MiningManager(bot, config);
  return miningManager;
}

export { setupMining };