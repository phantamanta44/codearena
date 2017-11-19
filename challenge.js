const runTests = require('./test.js');
const request = require('request-promise-native');
const {logs} = require('./logs.js');

const repoRoot = 'https://raw.githubusercontent.com/phantamanta44/codearena-challenges/master/';
class Challenge {
  constructor(name, desc, diff, author, tests) {
    this.name = name;
    this.desc = desc;
    this.diff = diff;
    this.author = author;
    this.tests = tests;
  }
  
  getEmbed() {
    return {
      color: 2201331,
      author: {
        name: this.name,
      },
      title: `By ${this.author}`,
      description: this.desc,
      footer: {
        text: `Difficulty: ${this.diff}`,
      },
    };
  }

  attempt(code) {
    const result = runTests(code, this.tests);
    return new ChallengeAttempt(result);
  }
  
  static async getDesc(ns, key) {
    return JSON.parse(await request(`${repoRoot}${ns}/${key}.json`));
  }
  
  static async retrieve(ns, key) {
    try {
      const chal = await Challenge.getDesc(ns, key);
      const tests = await request(`${repoRoot}${ns}/${key}.js`);
    } catch (e) {
      logs.warn(`Failed retrieval of ${ns}/${key}`);
      logs.warn(e);
      throw new Error('Could not retrieve challenge.');
    }
    return new Challenge(chal.name, chal.desc, diff, ns, tests);
  }
  
  static async get(diff) {
    if (diff === null) diff = Math.floor(Math.random() * 5);
    const index = await Challenge.getIndex(diff);
    const keys = Object.keys(index);
    const meta = index[keys[Math.floor(Math.random() * keys.length)]];
    return await Challenge.retrieve(meta.ns, meta.key);
  }
  
  static async getIndex(diff) {
    if (diff < 0 || diff > 4) throw new Error('Difficulty must be in range 0-4!');
    try {
      return JSON.parse(await request(`${repoRoot}${diff}.json`));
    } catch (e) {
      logs.warn(`Failed index retrieval ${diff}`);
      logs.warn(e);
      throw new Error('Could not retrieve index.');
    }
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
      return {
        author: {
          name: 'Success!',
          icon_url: 'https://github.com/phantamanta44/codearena/raw/master/resources/pass.png',
        },
        color: 5025616,
        description: `Passed: ${this.result.passed} | Failed: 0`,
      };
    } else {
      const embed = {
        author: {
          name: 'Failed!',
          icon_url: 'https://github.com/phantamanta44/codearena/raw/master/resources/fail.png',
        },
        color: 16007990,
        description: `Passed: ${fmt(this.result.passed)} | Failed: ${fmt(this.result.failed)}`,
        fields: [],
      };
      let i = ~this.result.failed ? Math.min(this.result.failed, 3) : 1, j = 0;
      while (i > 0) {
        if (!this.result.tests[j].passed) {
          embed.fields.push({
            name: 'Failed Test',
            value: this.result.tests[j].msg,
            inline: false,
          });
          i--;
        }
        j++;
      }
      return embed;
    }
  }
}

module.exports = Challenge;