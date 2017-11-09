const Challenge = require('./challenge.js');
const Command = require('./command.js');
const {logs} = require('./logs.js');

const byChannel = new Map();
let hasPermLevel = null;

class Arena {
  constructor(chal, channel) {
    this.chal = chal;
    this.channel = channel;
    byChannel.set(channel.id, this);
  }
  
  unregister() {
    byChannel.delete(this.channel.id);
  }
  
  accept(code, user) {
    throw new Error('How did you reach this code?');
  }
  
  forfeit(user) {
    throw new Error('How did you reach this code?');
  }
}

class OpenArena extends Arena {
  accept(code, msg, user) {
    const result = this.chal.attempt(code);
    if (result.result.result) {
      this.unregister();
      msg.reply('', {embed: result.getEmbed()});
      msg.channel.send(`:shield: **${user.nickname || user.username} emerges victorious!**`);
    } else {
      msg.reply('', {embed: result.getEmbed()});
    }
  }
  
  forfeit(msg, user) {
    return 'You can\'t forfeit an open arena!';
  }
}

class SoloArena extends Arena {
  constructor(chal, channel, user) {
    super(chal, channel);
    this.user = user;
  }
  
  static async instantiate(chal, user) {
    return new SoloArena(chal, await user.createDM(), user);
  }
  
  accept(code, msg, user) {
    const result = this.chal.attempt(code);
    if (result.result.result) {
      this.unregister();
      msg.reply('', {embed: result.getEmbed()});
      msg.channel.send(':accept: **Completed the Dojo Challenge!**');
    } else {
      msg.reply('', {embed: result.getEmbed()});
    }
  }
  
  forfeit(msg, user) {
    this.unregister();
    return 'Conceded the challenge. `:(`';
  }
}

function init(bot, hasPermissionLevel) {
  bot.on('message', msg => {
    const m = /^```(?:[^\n]*\n)?(\n*(?:[^\n]+\n*)+)```$/gs.exec(msg.content);
    if (!!m) {
      logs.info(`Code submission from ${msg.author.id}:\n${m[1]}`);
      const arena = byChannel.get(msg.channel.id);
      if (arena) arena.accept(m[1], msg, msg.author);
    }
  });
  hasPermLevel = hasPermissionLevel;
}

module.exports = {
  arenaInit: init,
  arenaCommands: {
    'arena': new Command('int?', '[diff (0-4)]', 'Starts an open arena in the current channel.',
      async (msg, args) => {
        if (!msg.channel.guild) return 'Open arenas cannot be started in DMs!';
        if (byChannel.has(msg.channel.id)) return 'An arena is already in progress!';
        const arena = new OpenArena(await Challenge.get(args[0]), msg.channel);
        msg.channel.send(':crossed_swords: **An open arena is starting!** Submit your solution in a code block.', {embed: arena.chal.getEmbed()});
      }),
    'dojo': new Command('int?', '[diff (0-4)]', 'Starts a solo arena to test yourself.',
      async (msg, args) => {
        if (!!msg.channel.guild) return 'Dojos can only run in DMs!';
        if (byChannel.has(msg.channel.id)) return 'A dojo is already in progress! Use `./forfeit` to concede.';
        const arena = await SoloArena.instantiate(await Challenge.get(args[0]), msg.author);
        msg.reply(':yin_yang: **Started a Dojo Challenge!** Submit your solution in a code block.', {embed: arena.chal.getEmbed()});
      }),
    'forfeit': new Command(null, null, 'Concedes the current challenge.',
      async (msg, args) => {
        const arena = byChannel.get(msg.channel.id);
        if (arena) {
          return arena.forfeit(msg, msg.author);
        } else {
          return 'There is no arena in progress!';
        }
      }),
    'stop': new Command(null, null, 'Forcefully ends the arena in progress.',
      async (msg, args) => {
        if (!msg.channel.guild) return 'You can end a dojo challenge with `/forfeit`.';
        if (hasPermLevel(msg.author.id, 3)
            || msg.channel.permissionsFor(msg.author).has('MANAGE_MESSAGES')) {
          const arena = byChannel.get(msg.channel.id);
          if (arena) {
            arena.unregister();
            return 'Force-stopped the arena.';
          } else {
            return 'There is no arena in progress!';
          }
        } else {
          return 'No permission!';
        }
      }),
  },
};