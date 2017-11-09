const RichEmbed = require('discord.js').RichEmbed;
const runTests = require('./test.js');
const request = require('request-promise-native');

const repoRoot = 'https://raw.githubusercontent.com/phantamanta44/codearena-challenges/master/';
class Challenge {
  constructor(name, desc, diff, tests) {
    this.name = name;
    this.desc = desc;
    this.diff = diff;
    this.tests = tests;
  }
  
  getEmbed() {
    return new RichEmbed()
      .setColor('#2196F3')
      .setTitle(this.name)
      .setDescription(this.desc)
      .setFooter(`Difficulty: ${this.diff}`);
  }

  attempt(code) {
    const result = runTests(code, this.tests);
    return new ChallengeAttempt(result);
  }
  
  static async get(diff) {
    if (!diff) diff = Math.floor(Math.random() * 5);
    const index = JSON.parse(await request(`${repoRoot}${diff}.json`));
    const keys = Object.keys(index);
    const meta = index[keys[Math.floor(Math.random() * keys.length)]];
    const chal = JSON.parse(await request(`${repoRoot}${meta.ns}/${meta.key}.json`));
    const tests = await request(`${repoRoot}${meta.ns}/${meta.key}.js`);
    return new Challenge(chal.name, chal.desc, diff, tests);
  }
}

function fmt(n) {
  return ~n ? n : 'N/A'
}
class ChallengeAttempt {
  constructor(result) {
    this.result = result;
  }
  
  getEmbed() {
    if (this.result.result) {
      return new RichEmbed()
        .setAuthor('Success!', 'https://github.com/phantamanta44/codearena/raw/master/resources/pass.png')
        .setColor('#4CAF50')
        .setDescription(`Passed: ${this.result.passed} | Failed: 0`);
    } else {
      const embed = new RichEmbed()
        .setAuthor('Failed!', 'https://github.com/phantamanta44/codearena/raw/master/resources/fail.png')
        .setColor('#F44336')
        .setDescription(`Passed: ${fmt(this.result.passed)} | Failed: ${fmt(this.result.failed)}`);
      let i = ~this.result.failed ? Math.min(this.result.failed, 3) : 1, j = 0;
      while (i > 0) {
        if (!this.result.tests[j].passed) {
          embed.addField('Failed Test', this.result.tests[j].msg, false);
          i--;
        }
        j++;
      }
      return embed;
    }
  }
}

module.exports = Challenge;