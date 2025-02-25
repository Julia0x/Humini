import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prefixes = [
  'Ancient', 'Mystic', 'Cosmic', 'Silent', 'Crystal',
  'Eternal', 'Shadow', 'Storm', 'Frost', 'Ember',
  'Void', 'Astral', 'Lunar', 'Solar', 'Divine',
  'Chaos', 'Dream', 'Spirit', 'Star', 'Night',
  'Dawn', 'Dusk', 'Wild', 'Iron', 'Dark',
  'Light', 'Thunder', 'Flame', 'Ice', 'Wind'
];

const nouns = [
  'Phoenix', 'Dragon', 'Raven', 'Wolf', 'Serpent',
  'Guardian', 'Warrior', 'Knight', 'Hunter', 'Mage',
  'Titan', 'Oracle', 'Prophet', 'Sage', 'Nomad',
  'Wanderer', 'Seeker', 'Warden', 'Sentinel', 'Scout',
  'Champion', 'Herald', 'Keeper', 'Walker', 'Slayer',
  'Blade', 'Shield', 'Crown', 'Heart', 'Soul'
];

const suffixes = [
  'Weaver', 'Bringer', 'Caller', 'Seeker', 'Walker',
  'Master', 'Keeper', 'Singer', 'Dancer', 'Wielder',
  'Slayer', 'Hunter', 'Watcher', 'Guardian', 'Sage',
  'Knight', 'Lord', 'Smith', 'Born', 'Sworn',
  'Blessed', 'Cursed', 'Bound', 'Touched', 'Chosen'
];

// Additional unique standalone names
const uniqueNames = [
  'Zephyr', 'Quixotic', 'Ethereal', 'Serendipity', 'Nebula',
  'Halcyon', 'Ephemeral', 'Labyrinth', 'Cascade', 'Zenith',
  'Odyssey', 'Enigma', 'Velvet', 'Quantum', 'Cipher',
  'Aurora', 'Vertex', 'Nexus', 'Prism', 'Celestial',
  'Avalon', 'Tempest', 'Solstice', 'Echo', 'Paradox',
  'Infinity', 'Axiom', 'Nova', 'Meridian', 'Horizon',
  'Atlas', 'Cosmos', 'Vector', 'Azure', 'Crimson',
  'Obsidian', 'Onyx', 'Phantom', 'Quasar', 'Radiant'
];

class UsernameManager {
  constructor() {
    this.usedNamesFile = path.join(__dirname, '../../used_usernames.json');
    this.usedNames = this.loadUsedNames();
  }

  loadUsedNames() {
    try {
      if (fs.existsSync(this.usedNamesFile)) {
        return JSON.parse(fs.readFileSync(this.usedNamesFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading used names:', error);
    }
    return [];
  }

  saveUsedNames() {
    try {
      fs.writeFileSync(this.usedNamesFile, JSON.stringify(this.usedNames, null, 2));
    } catch (error) {
      console.error('Error saving used names:', error);
    }
  }

  generateCombinedName() {
    const patterns = [
      // Pattern 1: Prefix + Noun
      () => this.getRandomElement(prefixes) + this.getRandomElement(nouns),
      // Pattern 2: Prefix + Noun + Suffix
      () => this.getRandomElement(prefixes) + this.getRandomElement(nouns) + this.getRandomElement(suffixes),
      // Pattern 3: Noun + Suffix
      () => this.getRandomElement(nouns) + this.getRandomElement(suffixes),
      // Pattern 4: Unique standalone name
      () => this.getRandomElement(uniqueNames)
    ];

    return this.getRandomElement(patterns)();
  }

  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getRandomUsername() {
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      const name = this.generateCombinedName();
      
      if (!this.usedNames.includes(name)) {
        this.usedNames.push(name);
        this.saveUsedNames();
        return name;
      }
      
      attempts++;
    }

    // If we've used too many names, reset the list
    this.usedNames = [];
    return this.generateCombinedName();
  }
}

export const usernameManager = new UsernameManager();