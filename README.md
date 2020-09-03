# Self-Serve Custom Modules

Welcome to the wild-west of custom self-serve module development. If you are used to normal pages development, get ready to be confused. It is *very* recommended that you read this document if you are unfamiliar with self-serve, especially if you are going to be deploying anything.

## Self-Serve Overview

The self-serve pages product allows clients to build custom pages using data from our knowledge manager, without relying on support from our consulting engineering team. They can drag and drop pre-made components _or modules_, style them with CSS, and map component fields to fields in our platform. Sometimes clients want a few custom modules to go alongside the pre-made ones that come with the product. That's where we come in.

As of now, there is very little tooling or support from the product team for this custom module development. We don't have Pager, we don't have a deployment system (more on this below), and we don't have a lot of pre-generated code. You will find some basic JS and SASS helpers were added to this repo from our normal generator, but don't expect everything to work the same in here as it would in a normal pages project.

## Getting started

Everything in this generated repo will work with zero configuration.
Simply `cd` into the `src` folder, and run `yarn` to get started. Your node version should switch automatically.

## What's in the box

Inside the `src` folder you'll find the following:

* `js` - Contains Soy2js and utility files, identical to the versions found in the normal generator
* `local_testing` - Files for testing these custom modules locally. There is no pager, so a JSON file is included for adding mock data.
* `modules` - Where you'll be doing most of the work. A Header & Footer module are included by default
* `sass` - Contains utility sass files identical to the versions found in the normal generator
* `scripts` - Helper scripts to make your life easier
* `theme` - Contains a theme file for styling built in modules
* `webpack` - Contains build config and custom soy plugins

## Modules

A module is what you're probably tasked with building or modifying. A common project type is the "Full Pages Setup", which involves creating a custom header module and a custom footer module. Both of these are bootstrapped for you already in the modules folder.

**Note:** Module names and files are ALWAYS captialized. (e.g. Header, Footer, MyModule, SomeLongNamedModule). This includes any SCSS classes, webpack entries, keys in the local testing folder, etc. That way, anywhere a component is written in code, its spelled identically, including casing.

A module folder will look like this:

```
modules/
└── MyModule/
    ├── MyModule.js
    ├── MyModule.json
    ├── MyModule.scss
    └── MyModule.soy
```

### The Javascript file

Place any client side code that needs to run inside this file. The JS file also serves as the entry point for webpack to build the module and include the SCSS, so always have a JS file even if you don't need any JS to run.

### The JSON file

This JSON controls the fields the clients can edit when using the module. The file should contain a single JSON object, with a single `parameters` array. Each item in the array should have a `sink` field  that matches one of the `@param` items on the soy template.

### The SCSS file

This file should include all the module specific styling. Keep in mind clients can add their own CSS to a module. They won't be editing your CSS, but make sure you don't use tag selectors that can be mistakenly overriden.

### The Soy file

These use the same Soy logic you are used to in a normal pages repo, with one catch. You can't declare or call any other templates. A self-serve module is just one template, and can't call other templates.

### The Webpack Entry

Each module needs to have an entry in `webpack.config.babel.js`. Entries should look like this:

```javascript
  entry: {
    'MyModule/MyModule': path.join(__dirname, '../modules/MyModule/MyModule.js')
  }
```

The `MyModule/MyModule` key is so Webpack bundles each module's files into separete build folders.

## Local Testing

Inside the `local_testing` folder you'll find 3 files. `local_testing.html`, `local_testing.js` and `mockdata.json`. They already are set up to host the default header and footer modules OOTB.

To test locally, simply run `yarn start`.

This will spin up a webpack-dev-server, and open a new browser window at `localhost:9028`. Any changes to soy/scss/js files should automatically retrigger a build and refresh your browser window.

### Updating mock data

The `mockdata.json` file includes data that is already is mapped to the default Header & Footer modules. You can edit the object in this file to live-update your dev server.

### What's actually happening behind the scenes

As mentioned above, there is no Pager here. We are not actually hosting _soy_ files on your machine, but instead the _Soy2Js_ versions of the soy files. Webpack will automatically create Soy2JS files from any `.soy` file inside the modules folder, and as long as you're not using any of the soy functions we don't yet support in Soy2JS, you can test your modules locally.

### Local testing a new module

To local test a new custom module (other than Header or Footer), follow these steps:

1. Add mock data to the object in `mockdata.json`
    ```json
    {
      ...,
      "MyModule": {
        "field1": "value1",
        "field2": "value2"
      },
      ...
    }
    ```
2. Add an import statement for your module in `local_testing.js`
    ```javascript
    const { MyModule } = require('.tmp/soy2js/MyModule/MyModule');
    ```
3. Add the module to the `components` object in `local_testing.js`
    ```javascript
      const components = {
        ...,
        MyModule: MyModule(mockdata.MyModule),
        ...
      }
    ```
4. Add a div to the HTML wherever you want your module to be inserted in `local_testing.html`
    ```html
      <body>
        ...
        <div data-component="MyModule"></div>
        ...
      </body>
    ```

## Building & Deploying

Building is the easy part, deploying is the dangerous part. Please read the deployment steps carefully.

### Building

To build all your modules, run `yarn build`. Webpack will create a `dist` folder and place a subfolder for each module inside. Each module folder will contain the four necessary files for deployment. It will also add the theme file for creating custom themes. It should look something like this:

```
dist/
├── themes/
│   └── theme.scss
└── MyModule/
    ├── MyModule.js
    ├── MyModule.json
    ├── MyModule.css
    └── MyModule.soy
```

These four build files map to the four text area inputs in the module interface of Admin2. You'll be _literally_ copy and pasting the contents of these files into the four input areas.

* MyModule.js -> "Module JS"
* MyModule.json -> "Parameter Definition"
* MyModule.css -> "Module SCSS"
* MyModule.soy -> "Template Soy"

**Note on the JS**: It's mentioned above that you need to have a JS file for each module, even if you don't need do run any JS code for your module. That is b/c webpack uses the JS file to run and build. You DONT have to always deploy the JS file that gets built, if its not doing anything.

**Note on the CSS**: Yes the interface supports Sass, but it only supports one blob of text. Our Sass tends to reference things in other files which wouldn't be present. So we compile the Sass to CSS.

**Note on the Soy**: You may notice the Soy file in `dist` doesn't actually include any of the `@param` declarations or even the `{template}` tag. So why include it in the version in `src`? Because we use Soy2JS to test locally, and our Soy2JS compiler requires that stuff. So if you really don't feel like adding that to your Soy file, you don't have to, but you'll screw over anyone that wants to test locally.

**Note on the theme SCSS**: You might be wondering why the modules are in CSS but the Theme is in SCSS. That's because clients are allowed to modify the theme SCSS. What's the differece between `dist/theme` and `src/theme`? One single line, a bootstrap import that gets added after build. Bootstrap is built into self serve pages, so we need to import it somewhere, but we don't want it getting bundled into our individual module files and having 5 copies of bootstrap on a page. So we add it to the theme file _after_ build time.

### Creating/Modifying Modules

Open the [Admin2 Modules Section](https://www.yext.com/pagesadmin/landingpages/modules) and either create a new module or open the existing module. Make sure to scope custom modules to ONLY the account ID of the client. That way the custom modules don't show up on other clients editors. Be sure to always create a PROD and a TEST version of all custom modules.

Steps to create a new set of modules:

1. Go to https://www.yext.com/pagesadmin/landingpages/modules in Admin2
2. Click "Add New Module"
3. Give it a name like "Acme Header - TEST", following a "[Client] [Module] - [Env]" format
4. Select the proper entity groups, for most modules you should check "Locations" and "Single Page"
5. Create the module
6. After creating, choose "Specific Account" and enter the clients's account ID
7. You can now find this module in self-serve pages under "Content" -> "Add Module"
8. Repeat the above steps replacing `TEST` in the name with `PROD`

### Creating a test page

Generally, a client will have existing self-serve page templates they are working on. It's best to copy one of these and begin using your TEST module on this new copied page.

1. Go to the Storm page list and find a page you want to copy
2. Click the dropdown on the right and select "Copy"
3. Give the test page a name like "Store Pages - TEST"
4. Go into the test page and REMOVE the PROD version of the custom module you're working on (if it's there)
5. Go to "Add Module" and add the TEST version of the module
6. Copy any configuration from the PROD page's module to this TEST page/module so it looks the same
7. Position the module in the correct place by dragging it up/down in the "Content" tab
8. You can now deploy changes to the TEST module and preview them on this TEST page
9. NEVER deploy these TEST pages, AKA don't click "Activate"
10. You can share links to this TEST page with the "Share" button in the upper left of Storm

### Tagging and versions

There is no fancy version control integration like we have with normal Pages. We have implemented a loose versioning and tagging system to gaurantee there is working production code to rollback to if needed.

The general process for this is as follows:

1. Create branches using our normal trunk/doit system
2. Make changes to the files in `/src`
3. Get your changes approved in a PR
4. Build your changes
5. Create a commit with 'build' as the message
6. Copy/paste build files into the TEST version of the module (see section below)
7. Deploy your changes and test
8. After sucessful deployment, and PM/client approval, merge your build commit w/ master
9. Tag the master commit with a version, incrementing the previous version

If these steps are followed, a developer should be able to take any module in `/dist/` under a tagged commit, and deploy it live with no issues.

## Helper Scripts

Now that you've read all this and said "man this is confusing", here are some helper scripts to make things a lot easier.

### Add module generator

You can use the generator you used to make this repo to also generate additional modules. Note this process is destructive and non-reversable, so if you add a module you don't want, you'll have to go in and manually delete it.

Simply run `yo @yext/ysp:selfserve` and choose the option to create a new module. Give it a name, and the script will add a module folder with the four necessary files, update your local testing files and add an entry to your webpack config.

### Clip HTML script

Use this script to copy HTML/CSS from a site into a module folder. Script will copy as many selectors as you give it, and attempt to only grab the CSS used by the selectors.

Run the following

```
node ./scripts/clipHtml.js
```

### Add Params script

Use this script to add/remove a param or a list of params for a module. The script will modify the Soy file, the mock data JSON file and the Mock data JSON file. This script will allow you to quickly add and remove params across the 3 different files that need to be updated. This is especially useful for headers and footers that have lists of links, as self serve does not support a list of text + URL fields. The standard approach thus far has been creating 2 params for each link, one for the text and one for the URL.

Run the following to get a list of options for this script:

```
node ./scripts/addParam.js
```

An example use might look like:

```
node ./scripts/addParam.js -m header -p secondaryLink -n "Secondary Link" -c 3 -t URL
```

Output in Soy:
```
 * ... other params ...
 * @param secondaryLink_1
 * @param secondaryLink_2
 * @param secondaryLink_3
 */
{template .header}
```

Output in Params JSON:
```json
  [
    {
      ... other params ...
    },
    {
      "sink": "secondaryLink_1",
      "name": "Secondary Link 1",
      "required": false,
      "type": "URL",
      "default": { "valueStr": "" }
    },
    {
      "sink": "secondaryLink_2",
      "name": "Secondary Link 2",
      "required": false,
      "type": "URL",
      "default": { "valueStr": "" }
    },
    {
      "sink": "secondaryLink_3",
      "name": "Secondary Link 3",
      "required": false,
      "type": "URL",
      "default": { "valueStr": "" }
    }
  ]
```

Output in Mockdata JSON:
```json
  {
    "header": {
      ... other params ...,
      "secondaryLink_1": "https://yext.com",
      "secondaryLink_2": "https://yext.com",
      "secondaryLink_3": "https://yext.com"
    }
  }
```

#### Anchor mode

Adding `-a` or `--anchor` when invoking the script, or choosing the option when prompted will activate 'Anchor' mode. This mode allows you to rapidly create lists of links with ease.

When using anchor mode, the variable name you provide will be suffixed with `Text_#` and `Href_#`, and the pretty name suffixed with ' Text #' and 'Href #'.

For example, `node scripts/addParam.js -m Header -p primary -n Primary -a` will create a set of link params like this:

```
@param primaryText_1 // Primary Text 1
@param primaryHref_1 // Primary Href 1
...
@param primaryText_# // Primary Text #
@param primaryHref_# // Primary Href #
```

When you use anchor mode, you will also be prompted to supply a snippet of HTML. If you copy the links or the div containing the links into this prompt, the script will grab the default href and text values from each anchor tag in the pasted HTML, and include those default in the JSON. This saves a ton of time, do this. The script cannot parse invalid HTML however, so make sure no Soy is included in the pasted HTML.

If you do not provide any HTML, you will instead have to provide a set number of links to create. These links will not have any default values included.

#### Auto Mode

Adding `-x` when invoking the script will activate 'Auto' mode. This mode is super janky but very fast. In 'Auto' mode, you simply copy an entire block of HTML into the command line prompt, and the script will attempt to process everything for you.

For example, your clipHtml script copied a bunch of social links. Each social `<li>` element has an image, a link and text. Maybe something like this:

```html
  <li>
    <a href="facebook.com/clientname">
      <img src="clientsite.com/facebook.png">
      <span>Client name facebook</span>
    </a>
  </li>
  <li>
    <a href="twitter.com/clientname">
      <img src="clientsite.com/twitter.png">
      <span>Client name twitter</span>
    </a>
  </li>
```

In the case above, you have 6 things that need to be params, all with default values. This would take a while to use the basic addParam features to add these 1 by 1. You also can't use the 'Anchor Mode' outlined above since these items include images. This is a great case for 'Auto Mode'.

Run `node scripts/addParam.js -m Header -x`. You will then be asked for a name, and a chunk of HTML. Provide 'Facebook' for the name, and paste in the first `<li>` item. The script will find the href, the src, and the text in the pasted in HTML, create those 3 params as `facebookUrl`, `facebookImage` and `facebookText`, and even find/replace those params in Soy file.

Repeat for 'Twitter' and you're done! Please note, if you do not provide `-r` in the command, the script will add a nullcheck to the soy file for all of the created params around the element. The output of running the two commands for facebook and twitter will be (no promises on the formatting though):

```html
  {if $facebookUrl and $facebookText and $facebookImage}
    <li>
      <a href="{$facebookUrl |noAutoescape}">
        <img src="{$facebookImage.images.default.url}">
        <span>{$facebookText}</span>
      </a>
    </li>
  {/if}
  {if $twitterUrl and $twitterText and $twitterImage}
    <li>
      <a href="{$twitterUrl |noAutoescape}">
        <img src="{$twitterImage.images.default.url}">
        <span>{$twitterText}</span>
      </a>
    </li>
  {/if}
```

#### Adding images

Images in SSP have to be added manually every time. You cannot provide default values to the self serve modules. However, you still can provide a default src URL when using the script for local testing purposes.

Also, the syntax for access an image in a SSP variable is `<img src="{$imageVariable.images?.default?.url}" alt="{$imageVariable.alternateText ?: ''}">`