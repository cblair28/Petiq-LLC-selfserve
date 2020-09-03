const pathlib = require("path");
const shell = require('shelljs');

const inputDir = pathlib.resolve(process.cwd(), 'modules');
const outputDir = pathlib.resolve(process.cwd(), '.tmp/soy2js');

/**
 * Runs a shell command to build all the Soy files into Soy2JS files
 */
const compileSoy2Js = () => {
  const command = `soy2js -templates=${inputDir} -destination=${outputDir} -es6 > /dev/null`;

  const { code } = shell.exec(command);

  if (code !== 0) {
    shell.echo('soy2js exec failed');
    return false;
  } else {
    shell.echo('soy2js compilation complete');
    return true;
  }
}

class Soy2JsPlugin {
  apply(compiler) {
    // Initial Soy2JS building on webpack initialization
    compiler.hooks.afterPlugins.tap("Soy2JS Plugin - Before Run Hook", () => {
      compileSoy2Js();
    });

    // Rebuilds Soy2JS on Soy file change
    compiler.hooks.watchRun.tap("Soy2JS Plugin - Watch Run Hook", compiler => {
      // Get a list of all the files that have changed
      const changedTimes = compiler.watchFileSystem.watcher.mtimes;
      const changedFiles = Object.keys(changedTimes);

      // Check if any soy files have changed
      const hasSoyChanges = changedFiles.filter(
        file => pathlib.extname(file) === '.soy'
      );

      // Compile the soy to soy2js
      if (hasSoyChanges.length) {
        compileSoy2Js();
      }
    })
  }
}

module.exports = Soy2JsPlugin;