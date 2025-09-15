(function() {
  const STORAGE_KEY = 'currentNewListItems';
  const input = document.getElementById('itemInput');
  const list = document.getElementById('items');
  const finishBtn = document.getElementById('finishBtn');
  const modal = document.getElementById('metaModal');
  const modalDriverName = document.getElementById('modalDriverName');
  const modalLicensePlate = document.getElementById('modalLicensePlate');
  const modalSubmit = document.getElementById('modalSubmit');
  const modalCancel = document.getElementById('modalCancel');

  function loadTemp() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []; } catch { return []; }
  }
  function saveTemp(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

  function render(items) {
    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No items yet.';
      list.appendChild(empty);
    } else {
      items.forEach(text => {
        const li = document.createElement('li');
        li.className = 'item';
        const span = document.createElement('div');
        span.className = 'text';
        span.textContent = text;
        li.appendChild(span);
        list.appendChild(li);
      });
    }
    // show count in header
    const printAreaHeader = document.querySelector('#printArea .list-header');
    const count = items.length;
    if (printAreaHeader) {
      let badge = document.getElementById('newCountBadge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'newCountBadge';
        badge.className = 'hint';
        badge.style.marginLeft = 'auto';
        badge.style.fontWeight = '700';
        badge.style.fontSize = '1.1rem';
        printAreaHeader.style.display = 'flex';
        printAreaHeader.style.alignItems = 'center';
        printAreaHeader.appendChild(badge);
      }
      badge.innerHTML = `<span style=\"font-size:1.4rem; font-weight:800;\">${count}</span> <span style=\"font-size:.9rem; font-weight:400;\">items</span>`;
    }
  }

  function addItem() {
    const value = input.value.trim();
    if (!value) return;
    const items = loadTemp();
    if (items.includes(value)) { return; }
    items.push(value);
    saveTemp(items);
    input.value = '';
    render(items);
  }

  function openModal() {
    modal.style.display = 'flex';
    setTimeout(() => { modalDriverName.focus(); }, 0);
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  async function submitMeta() {
    const driverName = modalDriverName.value.trim();
    const licensePlate = modalLicensePlate.value.trim();
    let items = loadTemp();
    // dedupe case-sensitive
    items = Array.from(new Set(items));
    if (!items.length) { alert('No items to save.'); return; }
    const res = await fetch('api/lists.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, driverName, licensePlate })
    });
    if (!res.ok) { alert('Failed to save'); return; }
    const saved = await res.json();
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = `index.html`;
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  });
  finishBtn.addEventListener('click', openModal);
  modalSubmit.addEventListener('click', submitMeta);
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modalDriverName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitMeta(); } });
  modalLicensePlate.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitMeta(); } });

  render(loadTemp());
})();


