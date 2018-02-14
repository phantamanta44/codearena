const {fork} = require('child_process');

function runTests(code, fixtures) {
  return new Promise((res, rej) => {
    const child = fork('./test_impl.js', [], {
      silent: true,
    });
    const timeout = setTimeout(function() {
      res({
        result: false,
        passed: -1,
        failed: -1,
        tests: [{
          passed: false,
          msg: 'Error: Script execution timed out.',
        }],
      });
      child.kill();
    }, 7500);
    child.on('message', function(data) {
      clearTimeout(timeout);
      res(data);
      child.kill();
    });
    child.send({code, fixtures});
  });
}

module.exports = runTests;