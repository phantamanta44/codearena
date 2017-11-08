const Discord = require('discord.js');
const fs = require('fs');

/*
 * Logging
 */
const LogLevel = {
  debug: {index: 0, prefix: 'DBG'},
  info: {index: 1, prefix: 'INF'},
  warn: {index: 2, prefix: 'WRN'},
  error: {index: 3, prefix: 'ERR'}
};
const logs = {
  level: 1,
  print: (level, msg) => {
    if (logs.level <= level.index)
      console.log(`${new Date().toISOString()} ${level.prefix} -- ${msg}`);
  },
  debug: msg => logs.print(LogLevel.debug, msg),
  info: msg => logs.print(LogLevel.info, msg),
  warn: msg => logs.print(LogLevel.warn, msg),
  error: msg => logs.print(LogLevel.error, msg)
};

/*
 * Configuration
 */
const userDb = new Map();
(function() {
  const users = JSON.parse(
    fs.readFileSync('users.json', {encoding: 'utf-8'}));
  for (const id of Object.keys(users)) {
    userDb.set(id, users[id]);
  }
})();
function hasPermissionLevel(id, level) {
  let user = userDb.get(id);
  return !!user && user.perms >= level;
}

/*
 * Command handling
 */
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
  channel: {
    name: 'channel', func: async (ap, bot) => {
      let matches = channelPattern.exec(ap.next());
      if (!matches)
        matches = [null, ap.args[ap.pos - 1]];
      let channel = bot.channels[matches[1]];
      if (!channel)
        return ap.back();
    }
  }
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
      if (!!reply) msg.reply(reply);
    }
  }
}
const commands = {
  // Bot administration

  'invite': new Command(null, null, 'Generates a bot invite link.',
    async (msg, args) => await bot.generateInvite()),

  'eval': new Command('str*', '<script>', 'Evaluates some JS.',
    async (msg, args) => {
      if (hasPermissionLevel(msg.author.id, 4)) {
        let result = null;
        try {
          result = eval(args[0].join(' '));
        } catch (e) {
          return `\`${e.message}\``;
        }
        if (result !== undefined && result !== null) {
          return `\`${result.toString()}\``;
        } else {
          return 'No result.';
        }
      } else {
        return 'No permission!';
      }
    }),

  'halt': new Command(null, null, 'Kills the bot.',
    async (msg, args) => {
      if (hasPermissionLevel(msg.author.id, 4)) {
        function destroy() {
          bot.destroy().then(() => process.exit(0));
        }
        msg.reply('Halting!').then(destroy, destroy);
      } else {
        return 'No permission!';
      }
    }),

  // Utility

  'user': new Command('id?', '[user]', 'Looks up a user by their ID.',
    async (msg, args) => {
      if (!!args[0]) {
        bot.fetchUser(args[0]).then(
          u => msg.reply(`**${u.username}**#${u.discriminator}`),
          e => {
            if (e.message === 'Unknown User') {
              msg.reply('Could not find user by that ID!');
            } else {
              throw e;
            }
          });
      } else {
        return `**${msg.author.username}**#${msg.author.discriminator}`;
      }
    }),

  'help': new Command(null, null, 'Lists available commands.',
    async (msg, args) => {
      let list = [];
      for (let name in commands) {
        if (commands.hasOwnProperty(name)) {
          let usage = name;
          if (!!commands[name].usage)
            usage += ' ' + commands[name].usage;
          list.push(`./${usage} | ${commands[name].desc}`);
        }
      }
      list.sort();
      msg.author.createDM().then(dm => dm.send(`**__Available Commands__**\n\`\`\`1c\n${list.join('\n')}\n\`\`\``));
      return !!msg.guild ? 'Sent documentation in DMs.' : null;
    })
};

/*
 * Bot init
 */
const bot = new Discord.Client();
bot.on('ready', () => {
  logs.info('Logged in');
});
bot.on('message', async msg => {
  if (!!msg.content && msg.content.startsWith('./')) {
    let parts = msg.content.split(/\s+/g);
    let command = commands[parts[0].substring(2).toLowerCase()];
    if (!!command) command.execute(msg, parts.slice(1), bot);
  }
});

bot.login(process.env.CA_TOKEN).catch(logs.error);
