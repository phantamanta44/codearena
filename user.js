const fs = require('fs');

const userDb = new Map();
(function() {
  const users = JSON.parse(
    fs.readFileSync('users.json', {encoding: 'utf-8'}));
  for (const id of Object.keys(users)) {
    userDb.set(id, users[id]);
  }
})();
function hasPermissionLevel(id, level) {
  let user = userDb.get(id);
  return !!user && user.perms >= level;
}

module.exports = {hasPermissionLevel};