(function () {
  // Development boundary guards for Revenue Management system
  // These guards warn when separation rules are violated but do not change behavior

  window.__RM_DEV_GUARDS = {
    assert(condition, msg) {
      if (!condition) {
        console.warn('[RM Guard]', msg);
      }
    },

    // Helper to check if a function exists on window
    hasFunction(name) {
      return typeof window[name] === 'function';
    },

    // Helper to check if an element exists
    hasElement(id) {
      return document.getElementById(id) !== null;
    },
  };
})();
