// Runs classic browser scripts from js/ in one vm context and returns W.
const vm = require('vm');
const fs = require('fs');
const path = require('path');

module.exports = function load(...files) {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) {
    const file = path.join(__dirname, '..', 'js', f);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  return ctx.W;
};
