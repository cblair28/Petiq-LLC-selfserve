import './Header.scss';

import { OnReady } from 'js/components/Util/Browser.js';
import { AccessibilityHelpers } from 'js/components/Util/Accessibility.js';
const ah = new AccessibilityHelpers();

OnReady(() => {
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  mobileToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('is-active');
    ah.toggleAriaState(mobileToggle, 'expanded');
    ah.toggleAriaState(mobileMenu, 'hidden');

    if (document.body.style.overflow) {
      document.body.style.overflow = '';
    } else {
      document.body.style.overflow = 'hidden';
    }
  })
});