const fs = require('fs');
const path = require('path');

function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading config:', error);
    process.exit(1);
  }
}

module.exports = { loadConfig };