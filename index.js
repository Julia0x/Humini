import MinecraftBot from './src/bot/index.js';

try {
  const bot = new MinecraftBot();
  console.log('Minecraft bot initialized successfully!');
} catch (error) {
  console.error('Failed to initialize bot:', error);
  process.exit(1);
}