const {arenaCommands, arenaInit} = require('./arena.js');
const Discord = require('discord.js');
const {logs} = require('./logs.js');
const Command = require('./command.js');
const {hasPermissionLevel} = require('./user.js')
const request = require('request-promise-native');

/*
 * Commands
 */
const commands = {
  ...arenaCommands,
  
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

  'halt': new Command('str', '<mode>', 'Kills the bot.',
    async (msg, args) => {
      if (hasPermissionLevel(msg.author.id, 4)) {
        let code, reply;
        switch (args[0]) {
          case 'restart':
            code = 15;
            reply = ':repeat: Restarting...!';
            break;
          case 'update':
            code = 16;
            reply = ':up: Updating...!';
            break;
          case 'kill':
            code = 0;
            reply = ':octagonal_sign: Halting...!';
            break;
          default:
            return 'Invalid halting mode!'
        }
        const destroy = () => bot.destroy().then(() => process.exit(code));
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
      msg.author.createDM().then(dm => dm.send(`**__Available Commands__**\n\`\`\`1c\n${list.join('\n')}\n\`\`\``));
      return !!msg.guild ? 'Sent documentation in DMs.' : null;
    }),
};

/*
 * Bot init
 */
const bot = new Discord.Client();
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
bot.on('ready', () => {
  logs.info('Logged in');
  postGuildCount();
  arenaInit(bot);
});
bot.on('guildCreate', postGuildCount);
bot.on('guildDelete', postGuildCount);
bot.on('message', msg => {
  if (!msg.channel.permissionsFor
      || msg.channel.permissionsFor(bot.user).has('SEND_MESSAGES')) {
    if (!!msg.content && msg.content.startsWith('./')) {
      let parts = msg.content.split(/\s+/g);
      let command = commands[parts[0].substring(2).toLowerCase()];
      if (!!command) command.execute(msg, parts.slice(1), bot);
    }
  }
});
bot.on('reconnecting', () => {
  logs.warn('Attempting reconnection...');
});
bot.on('disconnect', async () => {
  logs.error('Disconnected unrecoverably!');
  await bot.destroy();
  process.exit(1);
});
bot.on('error', e => {
  logs.error(e);
});

bot.login(process.env.CA_TOKEN).catch(logs.error);
module.exports = bot;
