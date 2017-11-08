const RichEmbed = require('discord.js').RichEmbed;
const runTests = require('./test.js');

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
      .setTimestamp();
  }

  attempt(code) {
    const result = runTests(code, this.tests);
    return new ChallengeAttempt(result);
  }
  
  static get(diff) {
    return new Challenge('Multiply',
      'Write a function `mult(num, num) -> num` that multiplies two numbers.',
      0,
      `for (let i = 0; i < 50; i++) {
let a = Math.floor(Math.random() * 50);
let b = Math.floor(Math.random() * 50);
Test.assertEquals(a * b, mult(a, b));
}`);
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
        .setDescription(`Passed: ${this.result.passed} | Failed: 0`)
        .setTimestamp();
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