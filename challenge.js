const RichEmbed = require('discord.js').RichEmbed;
const runTests = require('./test.js');

class Challenge {
  constructor(name, desc, tests) {
    this.name = name;
    this.desc = desc;
    this.tests = tests;
  }
  
  getEmbed() {
    return new RichEmbed()
      .setColor('#2196F3')
      .setTitle(this.name)
      .setDescription(this.desc);
  }

  attempt(code) {
    const result = runTests(code, this.tests);
    return new ChallengeAttempt(result);
  }
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
        .setDescription(`Passed: ${this.result.passed} / Failed: 0`)
    } else {
      const embed = new RichEmbed()
        .setAuthor('Failed!', 'https://github.com/phantamanta44/codearena/raw/master/resources/fail.png')
        .setColor('#F44336')
        .setDescription(`Passed: ${this.result.passed} / Failed: ${this.result.failed}`)
      for (const test of this.result.tests) {
        if (!test.passed) {
          embed.addField('Failed Test', test.msg, false);
        }
      }
      return embed;
    }
  }
}

module.exports = Challenge;