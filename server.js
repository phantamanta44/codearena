const {arenaCommands, arenaInit} = require('./arena.js');
const Discord = require('discord.js');
const {logs} = require('./logs.js');
const Command = require('./command.js');
const {hasPermissionLevel} = require('./user.js')

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
    }),
};

/*
 * Bot init
 */
const bot = new Discord.Client();
bot.on('ready', () => {
  logs.info('Logged in');
  arenaInit(bot, hasPermissionLevel, Command);
});
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

bot.login(process.env.CA_TOKEN).catch(logs.error);
