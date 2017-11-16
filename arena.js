const Challenge = require('./challenge.js');
const Command = require('./command.js');
const {logs} = require('./logs.js');
const hasPermLevel = require('./user.js').hasPermissionLevel;

const byChannel = new Map();

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
  async accept(code, msg, user) {
    const result = this.chal.attempt(code);
    if (result.result.result) {
      this.unregister();
      await msg.reply({embed: result.getEmbed()});
      msg.channel.createMessage(`:shield: **${user.nick || user.username} emerges victorious!**`);
    } else {
      msg.reply({embed: result.getEmbed()});
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
    return new SoloArena(chal, await user.getDMChannel(), user);
  }
  
  accept(code, msg, user) {
    const result = this.chal.attempt(code);
    if (result.result.result) {
      this.unregister();
      msg.reply({embed: result.getEmbed()});
      msg.channel.createMessage(':accept: **Completed the Dojo Challenge!**');
    } else {
      msg.reply({embed: result.getEmbed()});
    }
  }
  
  forfeit(msg, user) {
    this.unregister();
    return 'Conceded the challenge. `:(`';
  }
}

const messagePattern = /^```(?:[^\n]*\n)?(\n*(?:[^\n]+\n*)+)```$/;
function init(bot) {
  bot.on('messageCreate', msg => {
    const m = messagePattern.exec(msg.content);
    if (!!m) {
      const arena = byChannel.get(msg.channel.id);
      if (arena) arena.accept(m[1], msg, msg.member ? new Proxy(msg.author, {
        get(target, prop) {
          return msg.member[prop] || msg.author[prop];
        }
      }) : msg.author);
    }
  });
}

module.exports = {
  arenaInit: init,
  arenaCommands: {
    'arena': new Command('int?', '[diff]', 'Starts an open arena in the current channel.',
      async (msg, args) => {
        if (!msg.channel.guild) return 'Open arenas cannot be started in DMs!';
        if (byChannel.has(msg.channel.id)) return 'An arena is already in progress!';
        const arena = new OpenArena(await Challenge.get(args[0]), msg.channel);
        msg.channel.createMessage({
          content: ':crossed_swords: **An open arena is starting!** Submit your solution in a code block.',
          embed: arena.chal.getEmbed(),
        });
      }),
    'dojo': new Command('int?', '[diff]', 'Starts a solo arena to test yourself in.',
      async (msg, args) => {
        if (!!msg.channel.guild) return 'Dojos can only run in DMs!';
        if (byChannel.has(msg.channel.id)) return 'A dojo is already in progress! Use `./forfeit` to concede.';
        const arena = await SoloArena.instantiate(await Challenge.get(args[0]), msg.author);
        msg.reply({
          content: ':yin_yang: **Started a Dojo Challenge!** Submit your solution in a code block.',
          embed: arena.chal.getEmbed(),
        });
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
