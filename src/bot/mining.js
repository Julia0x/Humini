import pkg from 'mineflayer-pathfinder';
import Logger from '../utils/logger.js';
import Vec3 from 'vec3';

const { Movements, goals } = pkg;
const { GoalBlock } = goals;

class MiningManager {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.isMining = false;
    this.targetBlocks = new Set(this.config.mining.targetBlocks);
    this.foundBlocks = new Map(); // block position -> block type
    this.scanning = false;
  }

  async startMining() {
    if (this.isMining) {
      Logger.log('Mining is already in progress', 'warning');
      return;
    }

    this.isMining = true;
    Logger.log('Starting mining operation...', 'info');

    try {
      await this.equipBestTool();
      this.scanForBlocks();
      this.processMiningQueue();
    } catch (error) {
      Logger.log(`Mining error: ${error.message}`, 'error');
      this.stopMining();
    }
  }

  stopMining() {
    this.isMining = false;
    this.scanning = false;
    this.foundBlocks.clear();
    Logger.log('Mining operation stopped', 'info');
  }

  async equipBestTool() {
    const tools = this.bot.inventory.items().filter(item => 
      item.name.includes('pickaxe')
    );

    if (tools.length === 0) {
      throw new Error('No pickaxe found in inventory');
    }

    const bestTool = tools.reduce((best, current) => {
      if (current.name.includes('netherite')) return current;
      if (current.name.includes('diamond') && !best.name.includes('netherite')) return current;
      if (current.name.includes('iron') && !best.name.includes('diamond') && !best.name.includes('netherite')) return current;
      return best;
    });

    await this.bot.equip(bestTool, 'hand');
    Logger.log(`Equipped ${bestTool.name}`, 'info');
  }

  scanForBlocks() {
    if (this.scanning) return;
    this.scanning = true;

    const scanRadius = this.config.mining.maxDistance;
    const playerPos = this.bot.entity.position;

    // Clear previous results
    this.foundBlocks.clear();

    // Scan in a cube around the player
    for (let x = -scanRadius; x <= scanRadius; x++) {
      for (let y = -scanRadius; y <= scanRadius; y++) {
        for (let z = -scanRadius; z <= scanRadius; z++) {
          const pos = playerPos.offset(x, y, z);
          const block = this.bot.blockAt(pos);

          if (block && this.targetBlocks.has(block.name)) {
            this.foundBlocks.set(pos.toString(), block);
            Logger.log(`Found ${block.name} at ${pos.x}, ${pos.y}, ${pos.z}`, 'info');
          }
        }
      }
    }

    this.scanning = false;
    Logger.log(`Scan complete. Found ${this.foundBlocks.size} target blocks`, 'success');
  }

  async processMiningQueue() {
    if (!this.isMining || this.foundBlocks.size === 0) return;

    for (const [posStr, block] of this.foundBlocks) {
      if (!this.isMining) break;

      try {
        const pos = Vec3.from(JSON.parse(posStr));
        await this.mineBlock(pos);
        this.foundBlocks.delete(posStr);

        // Pick up items if enabled
        if (this.config.mining.pickupItems) {
          await this.collectNearbyItems();
        }

        // Scan for new blocks periodically
        if (this.foundBlocks.size < 5) {
          this.scanForBlocks();
        }
      } catch (error) {
        Logger.log(`Failed to mine block at ${posStr}: ${error.message}`, 'error');
      }
    }

    if (this.isMining) {
      this.scanForBlocks();
      if (this.foundBlocks.size > 0) {
        this.processMiningQueue();
      } else {
        Logger.log('No more target blocks found in range', 'info');
        this.stopMining();
      }
    }
  }

  async mineBlock(pos) {
    const block = this.bot.blockAt(pos);
    if (!block || !this.targetBlocks.has(block.name)) return;

    // Check if we can reach the block
    if (pos.distanceTo(this.bot.entity.position) > 4) {
      const movements = new Movements(this.bot);
      movements.canDig = false; // Don't dig while pathfinding
      this.bot.pathfinder.setMovements(movements);

      // Move close to block
      try {
        await this.bot.pathfinder.goto(new GoalBlock(pos.x, pos.y, pos.z));
      } catch (error) {
        Logger.log(`Cannot reach block at ${pos.x}, ${pos.y}, ${pos.z}`, 'error');
        return;
      }
    }

    // Mine the block
    try {
      await this.bot.dig(block);
      Logger.log(`Mined ${block.name} at ${pos.x}, ${pos.y}, ${pos.z}`, 'success');
    } catch (error) {
      throw new Error(`Failed to mine block: ${error.message}`);
    }
  }

  async collectNearbyItems() {
    const items = this.bot.entities;
    const playerPos = this.bot.entity.position;

    for (const item of Object.values(items)) {
      if (item.type !== 'object' || !item.position) continue;
      if (item.position.distanceTo(playerPos) > 4) continue;

      try {
        await this.bot.collect(item);
      } catch (error) {
        // Ignore collection errors
      }
    }
  }
}

export function setupMining(bot, config) {
  const miningManager = new MiningManager(bot, config);
  return miningManager;
}