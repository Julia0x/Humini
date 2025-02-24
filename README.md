# Advanced Minecraft Bot

An intelligent Minecraft bot built with Mineflayer that features combat capabilities, auto-eating, and armor management.

## Features

- **Combat System**
  - Automatic target acquisition
  - Smart weapon selection
  - Configurable attack intervals
  - Pathfinding to targets

- **Auto-Eat System**
  - Intelligent food management
  - Configurable hunger thresholds
  - Food priority system
  - Cooldown management

- **Armor Management**
  - Automatic armor equipping
  - Best armor selection
  - Armor durability tracking

- **Command System**
  - Console-based commands
  - Player stats monitoring
  - Inventory management
  - Chat integration

## Prerequisites

- Node.js (v14 or higher)
- A running Minecraft server (version 1.20.1)
- Server must be in offline mode (`online-mode=false` in server.properties)

## Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd minecraft-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure the bot:
   - Edit `config.json` to match your server settings
   - Adjust combat and auto-eat parameters as needed

## Configuration

The bot can be configured through `config.json`:

```json
{
  "bot": {
    "host": "localhost",      // Minecraft server host
    "port": 25565,           // Minecraft server port
    "username": "BotPlayer",  // Bot's username
    "version": "1.20.1"      // Minecraft version
  },
  "combat": {
    "attackInterval": 1200,   // Attack cooldown in ms
    "attackRange": 3,        // Maximum attack distance
    "targetMobs": [          // Mobs to target
      "zombified_piglin",
      "wither_skeleton"
    ]
  },
  "autoEat": {
    "startAt": 15,          // Food level to start eating
    "priority": "foodPoints", // Food selection priority
    "bannedFood": [],       // Foods to avoid
    "cooldown": 5000        // Eating cooldown in ms
  },
  "movement": {
    "followDistance": 1,    // Distance to maintain from target
    "lookInterval": 800     // Look update interval in ms
  }
}
```

## Usage

1. Start the bot:
```bash
npm start
```

2. For development with auto-reload:
```bash
npm run dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `chat <message>` | Send a chat message |
| `stats` | Display bot's current stats |
| `armor` | Show armor status |
| `autoEquipArmor` | Automatically equip best armor |

## Combat System

The bot's combat system automatically:
- Identifies hostile mobs within range
- Equips the best available weapon
- Pathfinds to targets
- Maintains optimal attack distance
- Manages attack timing

## Auto-Eat System

The auto-eat system:
- Monitors hunger level
- Selects the best available food
- Manages eating cooldowns
- Prevents food waste
- Handles eating interruptions

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Troubleshooting

Common issues and solutions:

1. **Bot can't connect**
   - Verify server is running
   - Check server IP and port
   - Ensure server is in offline mode

2. **Combat not working**
   - Check attack range configuration
   - Verify target mob names
   - Ensure bot has weapons

3. **Auto-eat not functioning**
   - Verify food items in inventory
   - Check hunger threshold settings
   - Ensure no banned foods are being used

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- Uses [mineflayer-pathfinder](https://github.com/PrismarineJS/mineflayer-pathfinder)
- Uses [mineflayer-auto-eat](https://github.com/LINKdiscordd/mineflayer-auto-eat)
- Uses [mineflayer-armor-manager](https://github.com/PrismarineJS/mineflayer-armor-manager)