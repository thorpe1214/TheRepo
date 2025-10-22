(function(){
  // App boot wiring - DOMContentLoaded initialization and UI wiring
  
  function initAppBoot(){
    // Compute tab mapping
    function cardFromHeading(h2){
      // walk up to the enclosing .card
      let el = h2;
      while(el && !el.classList.contains('card')) el = el.parentElement;
      return el;
    }
    function computeCards(){
      const map = { home:[], settings:[], newPricing:[], renewals:[], charts:[], history:[] };
      document.querySelectorAll('h2[data-tab-scope]').forEach(h2=>{
        const scopes = (h2.getAttribute('data-tab-scope')||'').split(/\s+/).filter(Boolean);
        const card = cardFromHeading(h2);
        if(!card) return;
        scopes.forEach(sc=>{ if(map[sc]) map[sc].push(card); });
      });
      return map;
    }
    const tabMap = computeCards();

    // Main tab bar wiring
    function setTab(tab){
      // buttons
      document.querySelectorAll('#tabBar [data-tab]').forEach(b=> b.classList.toggle('active', b.getAttribute('data-tab')===tab));
      // hide all cards first
      document.querySelectorAll('.card').forEach(c=> c.classList.add('tab-hidden'));
      // show those mapped to tab
      const list = tabMap[tab] || [];
      list.forEach(c=> c.classList.remove('tab-hidden'));
      window._activeTab = tab;
      // If History tab, trigger a gentle refresh on history UI (chart + list) if present
      if(tab==='history'){
        try{
          const sel = document.getElementById('fpHistorySelect');
          if(sel){
            // ensure at least one option is selected, then fire change
            if(!sel.value && sel.options && sel.options.length){ sel.value = sel.options[0].value; }
            sel.dispatchEvent(new Event('change', {bubbles:true}));
          }
          if(window.renderHistoryList) window.renderHistoryList();
        }catch(e){}
      }
    }

    // Wire tab clicks
    document.querySelectorAll('#tabBar [data-tab]').forEach(btn=>{
      btn.addEventListener('click', ()=> setTab(btn.getAttribute('data-tab')));
    });
    // Default tab
    setTab('settings');
    // Expose for console
    window.setTab = setTab;

    // Tab disabled state management
    function setTabDisabled(tab, disabled){
      const b = document.querySelector('#tabBar [data-tab="'+tab+'"]');
      if (!b) return;
      b.classList.toggle('disabled', !!disabled);
    }
    function enableNew(){ setTabDisabled('newPricing', false); }
    function enableRenew(){ setTabDisabled('renewals', false); }
    
    function wireLocks(){
      // Disable on load
      setTabDisabled('newPricing', true);
      setTabDisabled('renewals', true);
      // Intercept clicks on disabled tabs (allow hover for tooltip)
      const bar = document.getElementById('tabBar');
      if (bar){
        bar.addEventListener('click', function(e){
          const t = e.target.closest('[data-tab]');
          if (t && t.classList.contains('disabled')){
            e.preventDefault();
            e.stopPropagation();
            t.classList.add('wiggle');
            setTimeout(()=>t.classList.remove('wiggle'), 200);
          }
        }, true);
      }
      // If user clicks underlying (hidden) buttons anywhere, unlock
      const rn = document.getElementById('runNew');
      const rr = document.getElementById('runRenew');
      if (rn) rn.addEventListener('click', enableNew);
      if (rr) rr.addEventListener('click', enableRenew);
      // Also unlock when Home buttons are used
      const hrn = document.getElementById('homeRunNew');
      const hrr = document.getElementById('homeRunRenew');
      if (hrn) hrn.addEventListener('click', enableNew);
      if (hrr) hrr.addEventListener('click', enableRenew);
    }
    wireLocks();

    // Home button wiring
    function gotoTab(name){
      const btn = document.querySelector('#tabBar [data-tab="'+name+'"]');
      if (btn) btn.click();
    }
    function clickIf(id){ const el=document.getElementById(id); if(el) el.click(); }
    
    function wire(){
      // Set active tab on body
      document.addEventListener('click', function(e){
        const t = e.target.closest('#tabBar [data-tab]');
        if (t) document.body.dataset.activeTab = t.getAttribute('data-tab');
      });
      const active = document.querySelector('#tabBar .active[data-tab]');
      if (active) document.body.dataset.activeTab = active.getAttribute('data-tab');

      // Home buttons that call existing controls
      const map = {
        homeRunNew:    'runNew',
        homeExportNew: 'exportNew',
        homeRunRenew:  'runRenew',
        homeExportRenew: 'exportRenew'
      };
      Object.keys(map).forEach(hid=>{
        const targetId = map[hid];
        const hb = document.getElementById(hid);
        if (hb){
          hb.addEventListener('click', ()=> clickIf(targetId));
        }
      });

      // View links
      document.querySelectorAll('[data-goto]').forEach(el=>{
        el.addEventListener('click', ()=> gotoTab(el.getAttribute('data-goto')));
      });
    }
    wire();

    // Settings card marking
    // Mark all Settings cards
    document.querySelectorAll('h2[data-tab-scope*="settings"]').forEach(h2 => {
      const card = cardFromHeading(h2);
      if (card) card.classList.add('settings-card');
    });
    
    // Reflow Strategy top row: move New Lease Terms dropdown to a third column
    try{
      const h2s = Array.from(document.querySelectorAll('h2[data-tab-scope="settings"]'));
      const strategyH2 = h2s.find(h => h.textContent.trim() === 'Strategy');
      if (strategyH2) {
        const card = cardFromHeading(strategyH2);
        const row = card ? card.querySelector('.row') : null;
        if (row) {
          row.classList.add('strategy-row');
          // Find the inline-compact NL terms block currently under High input
          const nlBlock = card.querySelector('.inline-compact');
          if (nlBlock && nlBlock.parentElement && nlBlock.parentElement !== row) {
            // Move it to be the third grid column
            row.appendChild(nlBlock);
            // Tidy its spacing
            nlBlock.style.marginTop = '0';
            nlBlock.style.justifyContent = 'flex-end';
          }
        }
      }
    }catch(e){}

    // Make Home the landing tab
    const homeBtn = document.querySelector('#tabBar [data-tab="home"]');
    if (homeBtn) { homeBtn.click(); }
  }

  // Expose initAppBoot to window
  window.initAppBoot = initAppBoot;
  
  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', initAppBoot);
})();