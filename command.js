const {logs} = require('./logs.js');

class ArgParser {
  constructor(args) {
    this.args = args;
    this.pos = 0;
  }
  next() {
    return this.args[this.pos++];
  }
  hasNext() {
    return this.pos < this.args.length;
  }
  back() {
    this.pos--;
    return null;
  }
}
const flakePattern = /\d+/;
const userPattern = /<@(\d+)>/;
const channelPattern = /<#(\d+)>/;
const tokenTypes = {
  str: {name: 'string', func: async (ap, bot) => ap.hasNext() ? ap.next() : null},
  int: {
    name: 'integer', func: async (ap, bot) => {
      let parsed = parseInt(ap.next(), 10);
      return isNaN(parsed) ? ap.back() : parsed;
    }
  },
  float: {
    name: 'float', func: async (ap, bot) => {
      let parsed = parseFloat(ap.next());
      return isNaN(parsed) ? ap.back() : parsed;
    }
  },
  bool: {
    name: 'boolean', func: async (ap, bot) => {
      switch (ap.next().toLowerCase()) {
        case 'true':
        case 'yes':
        case 'on':
        case 'enable':
        case 'enabled':
          return true;
        case 'false':
        case 'no':
        case 'off':
        case 'disable':
        case 'disabled':
          return false;
        default:
          return ap.back();
      }
    }
  },
  id: {
    name: 'snowflake', func: async (ap, bot) => {
      let matches = flakePattern.exec(ap.next());
      return !matches ? ap.back() : matches[0];
    }
  },
  user: {
    name: 'user', func: async (ap, bot) => {
      let matches = userPattern.exec(ap.next());
      if (!matches)
        matches = [null, ap.args[ap.pos - 1]];
      try {
        return await bot.fetchUser(matches[1]);
      } catch (e) {
        return ap.back();
      }
    }
  },
};
class Command {
  constructor(argTypes, usage, desc, executor) {
    this.argTypes = [];
    this.usage = usage;
    this.desc = desc;
    if (!!argTypes) {
      argTypes.split(/,/g).map(t => t.trim()).forEach(t => {
        if (t.endsWith('?')) {
          this.argTypes.push(true);
          this.argTypes.push(tokenTypes[t.substring(0, t.length - 1)]);
          if (!this.argTypes[this.argTypes.length - 1])
            logs.error(`Unknown token type ${t}`)
        } else if (t.endsWith('*')) {
          this.argTypes.push(false);
          this.argTypes.push(tokenTypes[t.substring(0, t.length - 1)]);
          if (!this.argTypes[this.argTypes.length - 1])
            logs.error(`Unknown token type ${t}`);
        } else {
          this.argTypes.push(tokenTypes[t]);
          if (!this.argTypes[this.argTypes.length - 1])
            logs.error(`Unknown token type ${t}`)
        }
      });
    }
    this.executor = executor;
  }
  async execute(msg, args, bot) {
    logs.info(`${msg.author.id}: ${msg.content}`);
    let parser = new ArgParser(args);
    let parsed = [];
    let optional = false;
    for (let i = 0; i < this.argTypes.length; i++) {
      if (this.argTypes[i] === true) {
        optional = true;
      } else if (this.argTypes[i] === false) {
        let subParsed = [], arg = null;
        while (parser.hasNext() && (arg = await this.argTypes[i + 1].func(parser, bot)) !== null)
          subParsed.push(arg);
        parsed.push(subParsed);
        i++;
      } else {
        let arg = await this.argTypes[i].func(parser, bot);
        if (arg === null && !optional) {
          logs.info(`${msg.author.id} evoked invalid syntax error`);
          msg.reply(`Invalid syntax: expected ${this.argTypes[i].name} at position ${parsed.length + 1}`);
          return;
        }
        parsed.push(arg);
        optional = false;
      }
    }
    if (parser.hasNext()) {
      logs.info(`${msg.author.id} evoked invalid syntax error`);
      msg.reply('Invalid syntax: too many arguments');
    } else {
      let reply = null;
      try {
        reply = await this.executor(msg, parsed);
      } catch (e) {
        reply = `Command raised error: \`${e.message}\``;
        logs.warn(e.stack);
      }
      if (!!reply) {
        if (typeof reply === 'string') {
          msg.reply(reply);
        } else {
          msg.reply({embed: reply});
        }
      }
    }
  }
}

module.exports = Command;