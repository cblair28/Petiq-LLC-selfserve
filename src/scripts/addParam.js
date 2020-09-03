const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const beautify = require("json-beautify");
const prompt = require('prompt-sync')();
const PromptCheckboxs = require('prompt-checkbox');
const PromptRadio = require('prompt-radio');
const camelCase = require('camelcase');
const HTMLParser = require('node-html-parser');
require('colors');


// =========================================== CLI Setup ===========================================

// Setup command line interface
let {mod, param, pretty, del, count, type, required, value, force, logs, copy, anchor, skipOptions, autoMode} = yargs
 .usage('Usage: -m <module> -p <param>')
 .option('m', { alias: 'mod', describe: 'Module', type: 'string' })
 .option('p', { alias: 'param', describe: 'Param name', type: 'string' })
 .option('n', { alias: 'pretty', describe: 'Pretty Name (what the client will see)', type: 'string' })
 .option('d', { alias: 'del', describe: 'Delete param (or params if list)', type: 'boolean'})
 .option('c', { alias: 'count', describe: 'Number of params to make (will append # to end)', type: 'number' })
 .option('t', { alias: 'type', describe: 'Param type: TEXT, IMAGE, INT, URL', type: 'string'})
 .option('r', { alias: 'required', describe: 'Make param required', type: 'boolean'})
 .option('v', { alias: 'value', describe: "Value to be populated as default value in params json, and in mock data" })
 .option('f', { alias: 'force', describe: 'Ingore missing file errors and just run with what is available', type: 'boolean' })
 .option('l', { alias: 'logs', describe: 'Print logs, used for debugging', type: 'boolean'})
 .option('y', { alias: 'copy', describe: 'Write contents to new file instead of overwriting', type: 'boolean'})
 .option('a', { alias: 'anchor', describe: 'Make anchor links (creates a text and href param)', type: 'boolean'})
 .option('x', { alias: 'autoMode', describe: 'Automatically do everything for you', type: 'boolean'})
 .option('k', { alias: 'skipOptions', describe: 'Skip options selection', type: 'boolean'})
 .argv;

let superReplace = false;
let requireDone = false;
let inputHtml = "";
const items = [];

 /**
  * The main function of the script
  */
async function main() {

  // =========================================== User prompts ===========================================

  // Prompt user for module name
  if (!mod) {
    mod = prompt('What is the name of the module? (e.g. Header) '.cyan);
  }

  // Prompt user for pretty name
  if (!pretty) {
    pretty = prompt('What is the pretty name of the param? This is the name the client will see in the self-serve editor. '.cyan);
  }

  // Prompt user for param name with default value from pretty
  if (!param) {
    param = prompt('What is the name of the param(s)?'.cyan + ` (${camelCase(pretty)}) `.white);
    if (!param) {
      param = camelCase(pretty);
    }
  }

  // Map params to optional boolean choices
  const choicesMap = {
    del: 'Delete Mode',
    required: 'Make Param Required',
    force: 'Force Mode (ignores warnings)',
    logs: 'Logs Mode (prints debug logs)',
    copy: 'Copy Mode (creates a new file instead of overwriting)',
    anchor: 'Anchor Mode'
  }

  // Automatically check options if user supplied them from cmd line args
  const defaults = [];
  del && defaults.push(choicesMap.del);
  required && defaults.push(choicesMap.required);
  force && defaults.push(choicesMap.force);
  logs && defaults.push(choicesMap.logs);
  copy && defaults.push(choicesMap.copy);
  anchor && defaults.push(choicesMap.anchor);

  const choices = new PromptCheckboxs({
    name: 'options',
    message: 'Additional options',
    choices: Object.values(choicesMap),
    default: defaults
  });

  // Prompt user for optional choices
  if (!skipOptions) {
    const answers = await choices.run();
    del = answers.includes(choicesMap.del);
    required = answers.includes(choicesMap.required);
    force = answers.includes(choicesMap.force);
    logs = answers.includes(choicesMap.logs);
    copy = answers.includes(choicesMap.copy);
    anchor = answers.includes(choicesMap.anchor);
  }

  // Prompt user for type
  if (anchor) {
    type = 'TEXT';
  } else if (!type) {
    const radio = new PromptRadio({
      name: 'type',
      message: 'Param Type',
      choices: [
        'TEXT',
        'URL',
        'INT',
        'IMAGE'
      ],
      default: 'TEXT'
    });

    type = await radio.run();
  }

  // Prompt user for anchor selector
  let anchorHtml;
  if (anchor) {
    anchorHtml = prompt('Do you want to provide HTML to grab link default values from? Paste a chunk of HTML here, no soy please!'.cyan);

    // If no anchor selector ask for a set number
    if (!anchorHtml) {
      count = prompt('How many links do you want to create?'.cyan);
    }
  }


  // Prompt user for default value
  if (!count && !value && !anchor) {
    value = prompt('Is there a default value you want to add for this param?'.cyan);
  }

  // =========================================== Process user input ===========================================

  // Use selector to get default values of existing anchor links
  // Original goal was to just parse the HTML file that was already clipped, but that file is a Soy file, and most HTML parsers wont support that
  // A possible future solution would be to make this step a part of the HTML clipping script, or find a way to parse HTML with soy template strings in it
  let linkDefaults = [];
  if (anchor && anchorHtml) {
    const parsed = HTMLParser.parse(anchorHtml);
    const links = parsed.querySelectorAll('a');
    links.forEach(link => {
      linkDefaults.push({
        text: link.innerHTML,
        href: link.attributes.href
      })
    })
  }

  // Check if module folder exists
  const folder = path.resolve(__dirname, '../modules', mod);
  if (!fs.existsSync(folder)) {
    console.error("Module not found, check your spelling!".underline.red);
    return;
  }

  // Get a list of all the params to create or remove
  const paramsToMake = createMap(param, pretty, count);

  if (logs) {
    console.log('DEBUG: paramsToMake'.rainbow, paramsToMake);
  }

  if (force) {
    console.log('WARNING! This script will overrwrite your existing files!'.yellow);
    console.log('You have opted to use --force, which means any issues that could result in unexpected behavior may be ignored'.yellow);
    console.log('It is *strongly* recommended you backup your working copy.'.yellow);

    if (!confirm('Are you sure you want to continue?')) {
      abort();
    }
  }

  // =========================================== Get file data ===========================================

  console.log("Grabbing files...");

  const file_json = path.resolve(folder, `${mod}.json`);
  const file_soy = path.resolve(folder, `${mod}.soy`);
  const file_mock = path.resolve(__dirname, '../local_testing/mockdata.json');

  if (logs) {
    console.log('DEBUG: file_json'.rainbow, file_json);
    console.log('DEBUG: file_soy'.rainbow, file_soy);
    console.log('DEBUG: file_mock'.rainbow, file_mock);
  }

  let data_json;
  let data_soy;
  let data_mock;

  // Check if JSON file existt
  if (!fs.existsSync(file_json)) {
    errorHandler("Module folder is missing JSON file, or it is not named properly.")
  } else {
    data_json = JSON.parse(fs.readFileSync(file_json));
  }

  // Check if Soy file existt
  if (!fs.existsSync(file_soy)) {
    errorHandler("Module folder is missing Soy file, or it is not named properly.")
  } else {
    data_soy = fs.readFileSync(file_soy).toString();
  }

  // Check if mockdata file exist
  if (!fs.existsSync(file_mock)) {
    errorHandler("Mock data file is missing. How did that happen??")
  } else {
    data_mock = JSON.parse(fs.readFileSync(file_mock));
  }

  // =========================================== Check for existing params ===========================================

  console.log("Checking for existing params of that name...")

  // Find params already in JSON that match
  const regex_json = new RegExp(`${param}(Href|Text|)( *|_[0-9]* *)$`);
  const found_json = [];
  data_json.parameters.forEach(item => (item.sink.match(regex_json) || item.sink === param) && found_json.push(item.sink));

  // Find params already in SOY that match
  const regex_soy = new RegExp(`( |)\\*( |)@param(\\?|) ${param}(Href|Text|)( *|_[0-9]* *)\n`, 'g');
  const found_soy = data_soy.match(regex_soy) || [];

  // Find params already in mock data that match
  const found_mock = [];
  if (data_mock[mod]) {
    paramsToMake.forEach(p => data_mock[mod][p.param] && found_mock.push(p));
  }

  if (logs) {
    console.log('DEBUG: found_json'.rainbow, found_json);
    console.log('DEBUG: found_soy'.rainbow, found_soy);
    console.log('DEBUG: found_mock'.rainbow, found_mock);
  }

  if (!del && found_json.length) {
    errorHandler("JSON file already contains matching params.");
  }

  if (!del && found_soy.length) {
    errorHandler("Soy file already contains matching params.");
  }

  if (!del && found_mock.length) {
    errorHandler("Soy file already contains matching params.");
  }

  if (del && !(found_json.length === found_soy.length && found_json.length === found_mock.length)) {
    errorHandler("Soy/JSON/mockdata params are not in sync. Probably fine to use force here, but double check the files.");
  }

  if (del && (found_json.length === 0 && found_soy.length === 0 && found_mock.length === 0)) {
    errorHandler("There are no params with that name to delete.", true);
  }

  // =========================================== Delete Stuff ===========================================

  if (del) {
    // Prompt user with confirmation
    if (!copy) {
      console.log('WARNING! THIS IS A DESTRUCTIVE ACTION!'.yellow);
    }
    console.log(`Found ${found_json.length} params: ${found_json}`.yellow);
    if (confirm('Are these ok to remove?')) {
      // Delete the params from the JSON
      data_json.parameters = data_json.parameters.filter(item => !found_json.includes(item.sink));

      // Write JSON to file
      writeFile(file_json, beautify(data_json, null, 2, 80));

      // Delete the params from the Soy
      data_soy = data_soy.replace(regex_soy, '');

      // Write Soy to file
      writeFile(file_soy, data_soy);

      // Delete the params from the mockdata
      if (data_mock[mod]) {
        paramsToMake.forEach(p => delete data_mock[mod][p.param]);
      }

      // Write mock JSON to file
      writeFile(file_mock, beautify(data_mock, null, 2, 80));
    }
  }

  // =========================================== Create Stuff ===========================================

  else {
    if (!copy) {
      console.log('WARNING! THIS IS A DESTRUCTIVE ACTION!'.yellow);
    }
    // Print a list of the params that will be created
    console.log(`Will add the following params: ${paramsToMake.map(item => item.param)}`.yellow);
    // Prompt user for confirmation
    if (confirm('Are these ok?')) {
      // Create the new soy params
      const new_soy_params = paramsToMake.map(item => makeSoyParamEntry(item.param));

      // Find the params section in the soy file with regex
      // GENERATOR TODO (sgresh): Find less hacky/brittle way of parsing soy file to insert these params
      const entryRegex = /[\n].*[*][\/].*[\n]*{template/;
      const entryString = data_soy.match(entryRegex);
      if (!entryString) {
        errorHandler("Could not find the params section in your Soy template.", true);
      }
      const entryIndex = entryString.index + 1

      // Insert the new params in the soy file
      data_soy = data_soy.substring(0, entryIndex) + new_soy_params.join('') + data_soy.substring(entryIndex);

      // If creating multiple links, add a let block with an array of the links
      if (anchor) {
        const entryRegexLetBlock = new RegExp(`({template \.${mod}})`);
        const entryStringLetBlock = data_soy.match(entryRegexLetBlock);
        const entryIndexLetBlock = entryStringLetBlock.index + entryStringLetBlock[0].length + 1;

        const linkCount = linkDefaults.length || count;

        // GENERATOR TODO (sgresh): Find less hacky/brittle way of parsing soy file to build/insert this let array
        // GENERATOR TODO (sgresh): Also pre-generate the for loop that loops over the generated link array, w/ nullchecks for text/href values
        let letBlock = "";
        letBlock += `  {let $${param}Links: [\n`;
        for (let i = 1; i <= linkCount; i++) {
          letBlock += "    [\n";
          letBlock += `      'text': $${param}Text_${i},\n`;
          letBlock += `      'href': $${param}Href_${i}\n`;
          letBlock += i == linkCount ? "    ]\n" : "    ],\n";
        }
        letBlock += "  ] /}\n";

        // Insert the array in the soy file
        data_soy = data_soy.substring(0, entryIndexLetBlock) + letBlock + data_soy.substring(entryIndexLetBlock);
      }

      // Finds the default value in the HTML and replace it with the variable
      // Very hacky, but its really cuts down on dev time
      if (value && superReplace) {
        if (!required && !requireDone) {
          // Creates an if statement with nullchecks if the param(s) aren't required
          let ifStatements = "";
          for (let i = 0; i < items.length; i++) {
            ifStatements += "$" + items[i].param;
            if (i !== items.length - 1) {
              ifStatements += " and ";
            }
          }
          requireDone = true;

          // Grab the entire chunk of HTML that was pasted in and wrap it in the if statement
          const escapsed = inputHtml.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const newline = escapsed.replace(new RegExp("(\r\n|\r|\n)", 'g'), '\\n');
          const match = new RegExp(newline, '').exec(data_soy);
          if (match && match.index) {
            data_soy = data_soy.substring(0, match.index) + `{if ${ifStatements}}\n${inputHtml}\n{/if}` + data_soy.substring(match.index + match[0].length);
          }
        }

        // Replace the default value with the param name
        if (type === 'TEXT') {
          data_soy = data_soy.replace(value, `{$${param}}`)
        } else if (type === 'URL') {
          data_soy = data_soy.replace(value, `{$${param} |noAutoescape}`)
        } else if (type === 'IMAGE') {
          data_soy = data_soy.replace(value, `{$${param}.images.default.url}`)
        }
      }

      // Write soy to file
      writeFile(file_soy, data_soy);

      let new_json_params;
      try {
        // Create all the JSON objects
        new_json_params = paramsToMake.map(item => makeJsonParamEntry(item));
      } catch (e) {
        console.error(e.toString().underline.red);
        abort();
      }

      // Add the new entries to the params list
      data_json.parameters.push(...new_json_params);

      // Write JSON to file
      writeFile(file_json, beautify(data_json, null, 2, 80));

      // Create the mock data
      if (data_mock[mod]) {
        paramsToMake.forEach(item => {
          data_mock[mod][item.param] = makeMockParamEntry(item);
        });
      }

      // Write mock JSON to file
      writeFile(file_mock, beautify(data_mock, null, 2, 80));
    }
  }


  // Print final success message
  console.log(`Param(s) ${del ? 'removed' : 'added'} successfully!`.green)

  // =========================================== Helper functions ===========================================

  /**
   * Creates Soy params for inserting into soy module files
   * @param {*} name
   */
  function makeSoyParamEntry(name) {
    return ` * @param${required ? '' : '?'} ${name}\n`
  }

  /**
   * Creates JSON objects for inserting into parameters JSON module files
   * @param {*} sink
   * @param {*} name
   */
  function makeJsonParamEntry(item) {
    const entry = {
      sink: item.param,
      name: item.pretty,
      type: item.type,
      required
    };

    switch(type) {
      case "TEXT":
      case "INT":
      case "URL":
        entry.default = [{
          valueStr: item.default ? item.default : ""
        }]
        return entry;
      case "IMAGE":
        entry.attributes = {
          "img.sizes": {
            default: {
              width: 1200
            }
          }
        }
        return entry;
      default:
        throw "Invalid type! Must be one of: TEXT, INT, URL, IMAGE";
    }
  }

  /**
   * Creates entries for params in the mockdata JSON
   */
  function makeMockParamEntry(item) {
    switch(item.type) {
      case "TEXT":
      case "INT":
      case "URL":
        return item.default;
      case "IMAGE":
        return {
          images: {
            default: {
              url: item.default
            }
          },
          alternateText: "Test Alt Text"
        }
      default:
        throw "Invalid type! Must be one of: TEXT, INT, URL, IMAGE";
    }
  }

  /**
   * Make a pair of params for a link
   * @param {*} i
   * @param {*} linkDefault
   */
  function makeLink(i, linkDefault) {
    return [
      {
        param: `${param}Text${i ? `_${i}` : ''}`,
        pretty: `${pretty} Text${i ? ` ${i}` : ''}`,
        type: 'TEXT',
        default: linkDefault && linkDefault.text
      },
      {
        param: `${param}Href${i ? `_${i}` : ''}`,
        pretty: `${pretty} Href${i ? ` ${i}` : ''}`,
        type: 'URL',
        default: linkDefault && linkDefault.href
      }
    ]
  }

  /**
   * Creates an array of param variable and pretty names to be mapped over
   */
  function createMap() {
    const arr = [];
    if (anchor) {
      if (anchorHtml && linkDefaults.length) {
        linkDefaults.forEach((linkDefault, i) => {
          arr.push(...makeLink(i + 1, linkDefault));
        })
      } else if (count) {
        for(let i = 1; i <= count; i++) {
          arr.push(...makeLink(i));
        }
      } else {
        errorHandler('Could not find any links to create.', true);
      }
    } else {
      if (!count || count == 1) {
        arr.push({
          param,
          pretty,
          type,
          default: value
        });
      } else {
        for(let i = 1; i <= count; i++) {
          arr.push({
            param: `${param}_${i}`,
            pretty: `${pretty} ${i}`,
            type
          });
        }
      }
    }
    return arr;
  }

  /**
   * Allows code to either abort script on error, or ignore them if user used force
   * @param {*} message
   * @param {*} exit
   */
  function errorHandler(message, exit) {
    if (exit) {
      console.error(message.toString().red);
      abort();
    } else if (force) {
      console.error(`${message} Ignoring b/c using -f.`.yellow)
    } else {
      console.error(`${message} Run with -f to force ${del ? 'deletion' : 'creation'}`.red)
      abort();
    }
  }

  /**
   * Prompts user with message that requires yes/no to continue or abort
   * @param {*} message
   */
  function confirm(message) {
    const response = prompt(`${message} (y/N)`.blue);
    if (response === 'Y' || response === 'y') {
      return true;
    } else {
      abort();
    }
  }

  /**
   * Prints a standard abort error message and exits the process
   */
  function abort() {
    console.error('Aborting process!'.underline.red);
    process.exit(1);
  }

  /**
   * Write content to a file, or a copy of the file
   */
  function writeFile(file, content) {
    if (copy) {
      const parsed = path.parse(file);
      const renamed = path.resolve(parsed.dir, `${parsed.name}_COPY${parsed.ext}`);
      fs.writeFileSync(renamed, content);
    } else {
      fs.writeFileSync(file, content);
    }
  }
}

// Allows users to copy entire chunks of HTML into the command line prompt
// Will attempt to find every text node, href, and image src and replace with a param
if (autoMode) {

  // Prompt user for module name
  if (!mod) {
    mod = prompt('What is the name of the module? (e.g. Header) '.cyan);
  }

  // Prompt user for a group name prefix
  if (!pretty) {
    pretty = prompt('Provide a common name for the items.'.cyan);
  }

  console.log('AUTO MODE: THIS FEATURE IS SUPER HACKY BUT FAST. USE AT OWN RISK.'.red);
  inputHtml = prompt('Copy in HTML (must start and end with valid tags, no Soy allowed)'.bgRed);

  // Creates pretty name values
  const parsed = HTMLParser.parse(inputHtml);
  const makePretty = (t, num, count) => {
    let text = pretty;
    if (count > 1) {
      text += ' ' + t + ' ' + num;
    } else {
      text += ' ' + t;
    }
    return text;
  }

  // Creates param name values
  const makeParam = (t, num, count) => {
    let text = camelCase(pretty);
    if (count > 1) {
      text += t + '_' + num;
    } else {
      text += t;
    }
    return text;
  }

  // Find all anchor links and create a task
  const anchors = parsed.querySelectorAll('a');
  let i = 1;
  for(const anchor of anchors) {
    const href = anchor.attributes.href;
    items.push(
      {
        pretty: makePretty('Link', i, anchors.length),
        param: makeParam('Link', i++, anchors.length),
        value: href,
        type: 'URL'
      }
    )
  }

  // Find all images and create a task
  const images = parsed.querySelectorAll('img');
  i = 1;
  for(const image of images) {
    const src = image.attributes.src;

    items.push(
      {
        pretty: makePretty('Image', i, images.length),
        param: makeParam('Image', i++, images.length),
        value: src,
        type: 'IMAGE'
      }
    )
  }

  // Find all text nodes
  const textNodes = [];
  const textItems = [];

  // Recursive loop through all elements in pasted in HTML
  const loop = nodelist => {
    if (nodelist.childNodes && nodelist.childNodes.length) {
      for(const child of nodelist.childNodes) {
        loop(child)
      }
    } else {
      textNodes.push(nodelist);
    }
  }
  loop(parsed);

  // Loop through all found text nodes
  for (const node of textNodes) {
    if (node.nodeType === 3) {
      const text = node.rawText.trim();
      if (text.length) {
        textItems.push(node.rawText);
      }
    }
  }

  i = 1;
  // Create a task for each text node
  for (const text of textItems) {
    items.push(
      {
        pretty: makePretty('Text', i, textItems.length),
        param: makeParam('Text', i++, textItems.length),
        value: text,
        type: 'TEXT'
      }
    )
  }

  // Run the script for every node found above
  for(const item of items) {
    pretty = item.pretty;
    param = item.param;
    value = item.value;
    type = item.type;
    superReplace = true;
    skipOptions = true;

    main();
  }
} else {
  main();
}