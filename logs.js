const LogLevel = {
  debug: {index: 0, prefix: 'DBG'},
  info: {index: 1, prefix: 'INF'},
  warn: {index: 2, prefix: 'WRN'},
  error: {index: 3, prefix: 'ERR'}
};
const logs = {
  level: 1,
  print: (level, msg) => {
    if (logs.level <= level.index)
      console.log(`${new Date().toISOString()} ${level.prefix} -- ${msg}`);
  },
  debug: msg => logs.print(LogLevel.debug, msg),
  info: msg => logs.print(LogLevel.info, msg),
  warn: msg => logs.print(LogLevel.warn, msg),
  error: msg => logs.print(LogLevel.error, msg)
};

module.exports = {logs, LogLevel};