const {VM} = require('vm2');

function runTests(code, fixtures) {
  const framework = new Framework();
  const stdout = [];
  const vm = new VM({
    timeout: 5000,
    sandbox: {
      console: {
        log(s) {
          stdout.push(s === undefined ? 'undefined'
            : s === null ? 'null' : s.toString());
        },
      },
      Test: framework,
    }
  });
  try {
    vm.run(code);
    vm.run(fixtures);
  } catch (e) {
    console.log(e.name);
    return {
      result: false,
      passed: -1,
      failed: -1,
      tests: [{
        passed: false,
        msg: `${e.name}: ${e.message}`
      }],
    }
  }
  return {
    result: framework.failed === 0,
    passed: framework.passed,
    failed: framework.failed,
    tests: framework.tests,
  };
}

function deepEquals(e, a) {
  if (Array.isArray(e)) {
    if (!Array.isArray(a) || a.length !== e.length) {
      return false;
    }
    for (let i = 0; i < e.length; i++) {
      if (!deepEquals(e[i], a[i])) return false;
    }
    return true;
  } else if (typeof e === 'object') {
    let keys;
    if (typeof a !== 'object' || Array.isArray(a)
        || (keys = Object.keys(e)).length !== Object.keys(a).length) {
      return false;
    }
    for (const key of keys) {
      if (!deepEquals(e[key], a[key])) return false;
    }
    return true;
  } else {
    return a === e;
  }
}
const FP_ERROR = 1e-9;
class Framework {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }
  assertEquals(e, a, m) {
    this.expect(e === a, m || `Expected ${e} but got ${a}`);
  }
  assertNotEquals(ne, a, m) {
    this.expect(ne !== a, m || `Expected not ${e}`);
  }
  assertDeepEquals(e, a, m) {
    this.expect(deepEquals(e, a), m || `Expected ${e} but got ${a}`);
  }
  assertNotDeepEquals(ne, a, m) {
    this.expect(!deepEquals(ne, a), m || `Expected not ${e}`);
  }
  assertApproxEquals(e, a, m) {
    this.expect(Math.abs(e - a) <= FP_ERROR, m || `Expected ${e} but got ${a}`);
  }
  assertNotApproxEquals(ne, a, m) {
    this.expect(Math.abs(ne - a) > FP_ERROR, m || `Expected not ${e}`);
  }
  assertContains(e, c, m) {
    this.expect(ne.indexOf(c) >= 0, m || `Expected collection to contain ${ne}`);
  }
  assertNotContains(ne, c, m) {
    this.expect(ne.indexOf(c) < 0, m || `Expected collection to not contain ${ne}`);
  }
  expectError(f, m) {
    let noError = true;
    try {
      f();
    } catch (e) {
      noError = false;
    }
    if (noError) {
      this.fail(m || 'Expected an error');
    } else {
      this.pass();
    }
  }
  expectNoError(f, m) {
    let noError = true;
    try {
      f();
    } catch (e) {
      noError = false;
    }
    if (noError) {
      this.pass();
    } else {
      this.fail(m || `Expected no error, but got "${e.name}"`);
    }
  }
  expect(v, m) {
    if (!v) {
      this.fail(m || `Expected truthy, but got ${v}`);
    } else {
      this.pass();
    }
  }
  pass() {
    this.tests.push({
      passed: true,
    });
    this.passed++;
  }
  fail(m = 'Test failed') {
    this.tests.push({
      passed: false,
      msg: m,
    });
    this.failed++;
  }
}

module.exports = runTests;