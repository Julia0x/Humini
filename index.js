const MinecraftBot = require('./src/bot');

try {
  const bot = new MinecraftBot();
  console.log('Minecraft bot initialized successfully!');
} catch (error) {
  console.error('Failed to initialize bot:', error);
  process.exit(1);
}