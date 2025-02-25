import chalk from 'chalk';
import figlet from 'figlet';

class Logger {
  static theme = {
    primary: chalk.hex('#8B5CF6'),    // Purple
    secondary: chalk.hex('#10B981'),   // Green
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.cyan,
    success: chalk.green
  };

  static prefix = '[HUMINI]';

  static showBanner() {
    console.log('\n' + this.theme.primary(figlet.textSync('HUMINI', {
      font: 'Big',
      horizontalLayout: 'full'
    })));
    console.log(this.theme.secondary('Advanced Minecraft Bot\n'));
  }

  static log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = this.theme.primary(this.prefix);
    
    switch(type) {
      case 'error':
        console.log(`${prefix} ${this.theme.error(`[ERROR] ${message}`)} (${timestamp})`);
        break;
      case 'warning':
        console.log(`${prefix} ${this.theme.warning(`[WARN] ${message}`)} (${timestamp})`);
        break;
      case 'success':
        console.log(`${prefix} ${this.theme.success(`[SUCCESS] ${message}`)} (${timestamp})`);
        break;
      case 'combat':
        console.log(`${prefix} ${this.theme.primary(`[COMBAT] ${message}`)} (${timestamp})`);
        break;
      case 'movement':
        console.log(`${prefix} ${this.theme.secondary(`[MOVEMENT] ${message}`)} (${timestamp})`);
        break;
      default:
        console.log(`${prefix} ${this.theme.info(`[INFO] ${message}`)} (${timestamp})`);
    }
  }

  static table(data, title = '') {
    if (title) {
      console.log(this.theme.primary(`\n${this.prefix} ${title}`));
    }
    console.table(data);
  }

  static divider() {
    console.log(this.theme.secondary('\n' + '='.repeat(50) + '\n'));
  }
}

export default Logger;