const runTests = require('test.js');

class Challenge {
  constructor(name, desc, tests) {
    this.name = name;
    this.desc = desc;
    this.tests = tests;
  }
  
  get embed {
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
  
  get embed {
    if (this.result.result) {
      return new RichEmbed()
        .setAuthor('Success!')
        .setColor('#4CAF50')
        .setDescription(`Passed: ${this.result.passed} / Failed: ${this.result.failed}`)
        .setTimestamp();
    } else {
      const embed = new RichEmbed()
        .setAuthor('Failed!')
        .setColor('#F44336')
        .setDescription(`Passed: ${this.result.passed} / Failed: 0`)
        .setTimestamp();
      for (const test of result.tests) {
        if (!test.passed) {
          embed.addField('Failed Test', test.msg, false);
        }
      }
      return embed;
    }
  }
}

export default Challenge;