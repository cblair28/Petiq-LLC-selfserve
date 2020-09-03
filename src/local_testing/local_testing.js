// jQuery + bootstrap are included in SSP by default
import 'script-loader!node_modules/jquery/dist/jquery.min.js';
import 'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js';

import "../themes/theme.scss";
import "./local_testing.scss";

const mockdata = require('./mockdata');

// Import modules here
const { modules__Header } = require('.tmp/soy2js/Header/Header');
const { modules__Footer } = require('.tmp/soy2js/Footer/Footer');

// Add new modules to this object
const components = {
  Header: modules__Header(mockdata.Header),
  Footer: modules__Footer(mockdata.Footer)
};

// Search for wrapper divs and inject rendered Soy2JS modules
for (const key in components) {
  for (const wrapper of document.querySelectorAll(`[data-component*="${key}"`)) {
    wrapper.innerHTML = components[key];

    // Script tags won't run when set with innerHTML, so re-create them to run
    for (const script of wrapper.getElementsByTagName('script')) {
      const newScript = document.createElement('script');
      newScript.innerHTML = script.innerHTML;

      ['async', 'defer', 'src', 'type'].forEach(attr => {
        const attrValue = script.getAttribute(attr);

        if (attrValue !== null) {
          newScript.setAttribute(attr, attrValue);
        }
      });

      script.parentNode.insertBefore(newScript, script);
      script.parentNode.removeChild(script);
    }
  }
}
