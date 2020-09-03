module.exports = {
  /**
   * Helper function to be called by CopyWebpackPlugin
   * Soy2JS requires params and template declarations to compile, but self serve pages do not
   * This strips out the parts of soy only needed for local testing to make a cleaned up file for deployment
   * @param {*} file
   */
  transformSoy: function (file) {
    const content = file.toString();
    const openTagIndexStart = content.indexOf('{template');
    const openTagIndexEnd = content.indexOf('\n', openTagIndexStart) + 1;
    const closeTagIndex = content.indexOf('{/template}');

    const trimmed = content.substring(openTagIndexEnd, closeTagIndex);

    const lines = trimmed.split('\n');

    // This just un-indents the entire file by one standard indentation since the template declaration is being removed
    // This isn't really necessary but it makes for a cleaner build file
    const unindented = lines.map(line => {
      if (line.startsWith('  ')) {
        line = line.substring(2);
      } else if (line.startsWith('    ')) {
        line = line.substring(4);
      } else if (line.startsWith('\t')) {
        line = line.substring(1);
      }
      return line;
    })

    const transformed = unindented.join('\n');
    return transformed;
  },

  /**
   * Helper function to be called by CopyWebpackPlugin
   * All this does is add a bootstrap import to the top of the theme file
   * Bootstrap is automatically loaded on SSP, so we don't want bootstrap being bundled with our build files
   * We do however need the import statement present, so we add it to theme.scss after we build our module CSS
   * @param {*} file
   */
  addBootstrapImport: function (file) {
    const content = file.toString();
    const transformed = '@import "bootstrap";\n' + content;
    return transformed;
  },

  stripJsonComments: function (file) {
    const content = file.toString();
    const transformed = content.replace(/\/\/.*/g, ''); // removes single line comments
    const stripCommas = transformed.replace(/\,(?!\s*?[\{\[\"\'\w])/g, ''); // strips trailing commas in JSON objects
    return JSON.stringify(JSON.parse(stripCommas)); // Minify/removes whitespace
  }
}