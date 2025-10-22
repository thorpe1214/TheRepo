(function () {
  // History snapshot and export functions
  window.__RM_LOADED = window.__RM_LOADED || [];
  window.__RM_LOADED.push('history.js');
  const listEl = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearHistoryBtn');

  function formatKind(k) {
    return k === 'new' ? 'New' : k === 'renew' ? 'Renew' : String(k || '');
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem('rm:history');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem('rm:history', JSON.stringify(list || []));
    } catch (e) {}
  }

  function addHistoryItem(kind, timestamp, summary) {
    const list = loadHistory();
    const item = { kind, timestamp, summary };
    list.unshift(item);
    if (list.length > 50) list.splice(50);
    saveHistory(list);
    renderHistory();
  }

  function renderHistory() {
    if (!listEl) return;
    const list = loadHistory();
    if (!list.length) {
      listEl.innerHTML = '<div class="note">No history yet.</div>';
      return;
    }
    listEl.innerHTML = list
      .map(
        item => `
      <div class="card" style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${formatKind(item.kind)}</strong>
            <div class="note">${item.summary || 'Run completed'}</div>
          </div>
          <div style="font-size:12px; color:#94a3b8;">
            ${new Date(item.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    `
      )
      .join('');
  }

  function clearHistory() {
    if (!confirm('Clear all history?')) return;
    saveHistory([]);
    renderHistory();
  }

  function exportHistory() {
    const list = loadHistory();
    if (!list.length) {
      alert('No history to export.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      list.map(item => ({
        Kind: formatKind(item.kind),
        Timestamp: new Date(item.timestamp).toLocaleString(),
        Summary: item.summary || 'Run completed',
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, 'History');
    XLSX.writeFile(wb, 'revenue_management_history.xlsx');
  }

  function initHistory() {
    if (clearBtn) clearBtn.addEventListener('click', clearHistory);
    renderHistory();
  }

  // Expose functions to global scope
  window.formatKind = formatKind;
  window.loadHistory = loadHistory;
  window.saveHistory = saveHistory;
  window.addHistoryItem = addHistoryItem;
  window.renderHistory = renderHistory;
  window.clearHistory = clearHistory;
  window.exportHistory = exportHistory;
  window.initHistory = initHistory;

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', initHistory);
})();
