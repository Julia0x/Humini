import pkg from 'mineflayer-pathfinder';
import Logger from '../utils/logger.js';

const { Movements, goals } = pkg;
const { GoalFollow } = goals;

class MovementManager {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.followingPlayer = null;
    this.followInterval = null;
  }

  followPlayer(player) {
    // Stop any existing follow
    this.stopFollowing();

    this.followingPlayer = player;
    const defaultMove = new Movements(this.bot);
    
    // Configure movement settings
    defaultMove.canDig = false;
    defaultMove.maxDropDown = 4;
    defaultMove.allowParkour = true;
    
    this.bot.pathfinder.setMovements(defaultMove);

    // Start following loop
    this.followInterval = setInterval(() => {
      if (!this.followingPlayer || !this.bot.players[this.followingPlayer.username]) {
        this.stopFollowing();
        return;
      }

      const goal = new GoalFollow(this.followingPlayer, this.config.movement.followDistance);
      this.bot.pathfinder.setGoal(goal, true);
    }, this.config.movement.lookInterval);

    // Chat message
    Logger.log(`Following ${player.username}`, 'movement');
  }

  stopFollowing() {
    if (this.followInterval) {
      clearInterval(this.followInterval);
      this.followInterval = null;
    }

    if (this.followingPlayer) {
      Logger.log(`Stopped following ${this.followingPlayer.username}`, 'movement');
      this.followingPlayer = null;
    }

    this.bot.pathfinder.stop();
  }
}

export function setupMovement(bot, config) {
  const movementManager = new MovementManager(bot, config);
  return movementManager;
}