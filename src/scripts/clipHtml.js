const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const pretty = require('pretty');
const purify = require('purify-css')
const yargs = require('yargs');
const CleanCSS = require('clean-css');
const prompt = require('prompt-sync')();
require('colors');

// =========================================== User input setup ===========================================

let {url, moduleName, selector, omitSelector} = yargs
  .usage('Usage: -u <url> -s header.header -m Header')
  .option('u', { alias: 'url', describe: 'URL', type: 'string' })
  .option('s', { alias: 'selector', describe: 'CSS Selector', type: 'string' })
  .option('o', { alias: 'omitSelector', describe: 'CSS Selector', type: 'string' })
  .option('m', { alias: 'moduleName', describe: 'Module Name', type: 'string' })
  .argv;

if (!url) {
  url = prompt('What is the URL of the site you want to clip?'.cyan);
}
if (!selector) {
  selector = prompt('What is the CSS selector of the element you want to clip? (Use commas for multiple selectors)'.cyan);
}
if (!omitSelector) {
  omitSelector = prompt('Are there any selectors you want to omit? (Use commas for multiple selectors)'.cyan);
}
if (!moduleName) {
  moduleName = prompt('What is the module name to copy the HTML/CSS into?'.cyan);
}

// =========================================== Process input data ===========================================

// Remove trailing slashes in urls
if (url.charAt(url.length - 1) === '/') {
  url = url.substring(0, url.length - 1);
}

// Setup file paths
const soyTemplatePath = path.resolve(__dirname, 'util', '_module.soy');
const scssTemplatePath = path.resolve(__dirname, 'util', '_module.scss');
const outputPath = path.resolve(__dirname, '..', 'modules', moduleName);

if (!fs.existsSync(outputPath)) {
  console.error("Module not found, check your spelling!".underline.red);
  return;
}

// =========================================== Helper functions ===========================================

/**
 * Minimal templating function to replace double bracket template strings with content
 * @param {*} moduleName
 * @param {*} content
 * @param {*} template
 */
function template(moduleName, content, template) {
  let file = fs.readFileSync(template).toString();
  file = file.replace(/{{name}}/g, moduleName);
  file = file.replace('{{content}}', content);

  return file;
}

/**
 * Indent all lines in a file
 * @param {*} text
 * @param {*} numSpaces
 */
function indent(text, numSpaces) {
  const spaces = ' '.repeat(numSpaces);
  return text.replace(/\n/g, '\n' + spaces);
}

async function main() {

  // =========================================== Setup puppeteer ===========================================

  // Create a new browser instance and launch a page
  const browser  = await puppeteer.launch({
    args: [
      '--disable-web-security' // Disable all CORS to scrape CSS from external stylesheets
    ]
  });
  const page = await browser.newPage();

  // Navigate to the domain you want to capture html
  const response = await page.goto(url);

  // Pass log events from puppeteer page to node console
  page.on('console', consoleObj => console.log(consoleObj.text()));

  // Create the outputs
  const soyOutput = path.resolve(outputPath, `${moduleName}.soy`);
  const scssOutput = path.resolve(outputPath, `${moduleName}.scss`);


  // Run JS on the page, note the way references are passed from outside the evaluate scope into the evaluate function
  const {html, css} = await page.evaluate((selector, url, omitSelector) => {
    // =========================================== Grab CSS ===========================================

    // Grab all stylesheets on the page
    const sheets = document.styleSheets;
    const allRules = [];
    for (const s in sheets) {
      const sheet = sheets[s];

      /** @type {CSSRuleList} */
      const rules = sheet.cssRules || sheet.rules;
      // Grab all rules in all the stylesheets
      for (const r in rules) {
        const rule = rules[r];
        allRules.push(rule)
      }
    }

    // Filter out valid lines of css
    const lines = allRules.map(rule => rule.cssText).filter(line => line !== undefined);

    // Convert all urls in the CSS to absolute urls
    const css = lines.map(line => {
      const relativeToAbsoluteCSS = function(line) {
        const url1 = 'url("/';
        const url2 = "url('/";
        const index = line.indexOf(url1) !== -1 ? line.indexOf(url1) : line.indexOf(url2);

        if (index !== -1) {
          const newline = `${line.substring(0, index + 5)}${url}${line.substring(index + 5)}`;
          return relativeToAbsoluteCSS(newline);
        } else {
          return line;
        }
      }

      return relativeToAbsoluteCSS(line);
    }).join('\n');

    // =========================================== Grab HTML ===========================================

    /**
     * Converts all href and src urls to absolute urls
     * @param {*} el
     */
    function relativeToAbsolute(el) {
      const links = el.querySelectorAll("a");
      for (const link of links) {
        link.setAttribute("href", link.href);
      }

      const images = el.querySelectorAll("img");
      for (const image of images) {
        image.setAttribute("src", image.src);
      }
    };

    // Clip the HTML elements from the site
    let html = "";
    const selectors = selector.split(',');
    for(const s of selectors) {
      const el = document.querySelector(s);

      const omitSelectors = omitSelector ? omitSelector.split(',') : [];

      for(const o of omitSelectors) {
        const omitEl = el.querySelectorAll(o);
        for(const e of omitEl) {
          e.remove();
        }
      }
      relativeToAbsolute(el);
      html += el.outerHTML;
    }

    return {html, css};
  }, selector, url, omitSelector);

  // =========================================== Clean up and write files ===========================================

  // Beautify the HTML
  const prettyHtml = pretty(html, {ocd: true});
  // Indent everything by 4 characters
  const indented = indent(prettyHtml, 4);
  // Place HMTL inside template
  const soyFile = template(moduleName, indented, soyTemplatePath);
  // Write the HMTL to a file
  fs.writeFileSync(soyOutput, soyFile);
  console.log('Soy file generated sucessfully!'.green)

  // Remove unused CSS
  purify(html, css, function(onlyUsedCss) {
    // Format the css
    const formattedCss = new CleanCSS({ format: 'beautify' }).minify(onlyUsedCss).styles;
    // Indent everything by 2 characters
    const intented = indent(formattedCss, 2);
    // Place CSS inside template
    const scssFile = template(moduleName, intented, scssTemplatePath);
    // Write CSS to a file
    fs.writeFileSync(scssOutput, scssFile);

    console.log('Sass file generated sucessfully!'.green)
  });

  await browser.close();
}

main();

// GENERATOR TODO (sgresh): Add support for switching screen sizes to grab any CSS from responsive design controlled by JS rather than CSS
// GERERATOR TODO (sgresh): Add support for simulating user action (e.g. toggle mobile menu) to grab CSS from those actions
// GENERATOR TODO (sgresh): Add support to move body/html/tag selector styles to theme.scss automatically