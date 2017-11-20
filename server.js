const {arenaCommands, arenaInit} = require('./arena.js');
const Eris = require('eris');
const {logs} = require('./logs.js');
const Command = require('./command.js');
const {hasPermissionLevel} = require('./user.js')
const request = require('request-promise-native');

Eris.Client.prototype.fetchUser = async function(id) {
  const user = this.users.get(id);
  return user || await this.getRESTUser(id);
};
Eris.Message.prototype.reply = function(body) {
  const replyPrefix = !this.channel.guild ? '' : `${this.author.mention}: `;
  if (typeof body === 'string') {
    return this.channel.createMessage(`${replyPrefix}${body}`);
  } else {
    return this.channel.createMessage({
      ...body,
      content: body.content ? `${replyPrefix}${body.content}` : this.author.mention,
    });
  }
};

/*
 * Commands
 */
const commands = {
  ...arenaCommands,
  
  // Bot administration

  'invite': new Command(null, null, 'Generates a bot invite link.',
    async (msg, args) => `https://discordapp.com/oauth2/authorize?client_id=${bot.user.id}&scope=bot`),

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

  'halt': new Command('str', '<mode>', 'Kills the bot.',
    async (msg, args) => {
      if (hasPermissionLevel(msg.author.id, 4)) {
        let code, reply;
        switch (args[0]) {
          case 'restart':
            process.exitCode = 15;
            reply = ':repeat: Restarting...!';
            break;
          case 'update':
            process.exitCode = 16;
            reply = ':up: Updating...!';
            break;
          case 'kill':
            process.exitCode = 0;
            reply = ':octagonal_sign: Halting...!';
            break;
          default:
            return 'Invalid halting mode!'
        }
        const destroy = () => bot.disconnect({
          reconnect: false,
        });
        msg.reply(reply).then(destroy, destroy);
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
      let list = [], maxlen = 0;
      for (let name in commands) {
        if (commands.hasOwnProperty(name)) {
          let usage = name;
          if (!!commands[name].usage)
            usage += ' ' + commands[name].usage;
          maxlen = Math.max(maxlen, usage.length);
          list.push([`./${usage}`, usage.length, `| ${commands[name].desc}`]);
        }
      }
      list.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
      maxlen++;
      list = list.map(s => s[0] + ' '.repeat(maxlen - s[1]) + s[2]);
      msg.author.getDMChannel().then(dm => dm.createMessage(`**__Available Commands__**
\`\`\`1c
${list.join('\n')}
\`\`\`
Want to contribute your own challenges? Check out https://github.com/phantamanta44/codearena-challenges and submit a pull request!`));
      return !!msg.channel.guild ? 'Sent documentation in DMs.' : null;
    }),
};

/*
 * Bot init
 */
const bot = new Eris(process.env.CA_TOKEN);
let dblReqProps;
async function postGuildCount() {
  if (!dblReqProps) {
    dblReqProps = {
      uri: `https://discordbots.org/api/bots/${bot.user.id}/stats`,
      headers: {
        Authorization: process.env.CA_DBL_TOKEN,
      },
    };
  }
  const count = bot.guilds.size;
  logs.info(`Posting guild count ${count} to DBL`);
  return await request.post({
    ...dblReqProps,
    json: true,
    body: {
      server_count: count,
    },
  });
}
let initialized = false;
bot.on('ready', () => {
  if (!initialized) {
    logs.info('Logged in');
    initialized = true;
    postGuildCount();
    arenaInit(bot);
  } else {
    logs.warn('Reconnected');
  }
});
bot.on('guildCreate', () => {
  if (initialized) postGuildCount();
});
bot.on('guildDelete', postGuildCount);
bot.on('messageCreate', msg => {
  if (!msg.channel.permissionsOf
      || msg.channel.permissionsOf(bot.user.id).has('sendMessages')) {
    if (!!msg.content && msg.content.startsWith('./')) {
      let parts = msg.content.split(/\s+/g);
      let command = commands[parts[0].substring(2).toLowerCase()];
      if (!!command) command.execute(msg, parts.slice(1), bot);
    }
  }
});
bot.on('warn', e => {
  logs.warn(e);
});
bot.on('error', e => {
  logs.error(e);
});

bot.connect();
module.exports = bot;
