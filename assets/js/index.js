(function() {
  const tableBody = document.getElementById('listsTableBody');
  const emptyEl = document.getElementById('listsEmpty');
  const thId = document.getElementById('th-id');
  const thDriver = document.getElementById('th-driver');
  const thSpz = document.getElementById('th-spz');
  const thCount = document.getElementById('th-count');
  const thDatetime = document.getElementById('th-datetime');

  function qs(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function createRow(list, seqId) {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.style.borderBottom = '1px solid rgba(0,0,0,0.08)';
    tr.addEventListener('click', () => { window.location.href = `list.html?id=${encodeURIComponent(list.id)}`; });
    const tdId = document.createElement('td');
    const tdDriver = document.createElement('td');
    const tdSpz = document.createElement('td');
    const tdCount = document.createElement('td');
    const tdDatetime = document.createElement('td');

    tdId.style.padding = '.5rem';
    tdDriver.style.padding = '.5rem';
    tdSpz.style.padding = '.5rem';
    tdCount.style.padding = '.5rem';
    tdDatetime.style.padding = '.5rem';

    tdId.textContent = String(seqId);

    tdDriver.textContent = list.driverName || '';
    tdSpz.textContent = list.licensePlate || '';
    tdCount.textContent = String((Array.isArray(list.items) ? list.items.length : 0));
    tdDatetime.textContent = new Date(list.createdAt || list.updatedAt || Date.now()).toLocaleString();

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn';
    exportBtn.type = 'button';
    exportBtn.textContent = 'Export';
    exportBtn.style.marginLeft = '.5rem';
    exportBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const res = await fetch(`api/lists.php?id=${encodeURIComponent(list.id)}`);
        if (!res.ok) throw new Error('Failed to load list');
        const data = await res.json();
        
        // Use jsPDF for consistent multi-page headers/footers
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) { alert('PDF library not loaded'); return; }
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const headerHeight = 25; // Space reserved for header
        const footerHeight = 20; // Space reserved for footer
        const contentStartY = margin + headerHeight;
        
        // Function to add header to current page
        function addHeader() {
          let headerY = margin;
          
          // ID
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text(`ID: ${data.id || ''}`, margin, headerY);
          headerY += 7;
          
          // Driver name and SPZ on same line with 2/3 and 1/3 width distribution
          const contentWidth = pageWidth - 2 * margin;
          const driverWidth = contentWidth * (2/3);
          const spzWidth = contentWidth * (1/3);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.text('Driver:', margin, headerY);
          doc.setFont('helvetica', 'bold');
          const driverName = String(data.driverName || '-');
          doc.text(driverName, margin + 20, headerY, { maxWidth: driverWidth - 20 });
          
          // SPZ positioned at 2/3 of the content width
          const spzStartX = margin + driverWidth;
          doc.setFont('helvetica', 'normal');
          doc.text('SPZ:', spzStartX, headerY);
          doc.setFont('helvetica', 'bold');
          const spzText = String(data.licensePlate || '-');
          doc.text(spzText, spzStartX + 15, headerY, { maxWidth: spzWidth - 15 });
          headerY += 8;
          
          // Separator line
          doc.setDrawColor(200);
          doc.line(margin, headerY, pageWidth - margin, headerY);
        }
        
        // Function to add footer to current page
        function addFooter() {
          const dateText = `Date: ${new Date(data.createdAt || Date.now()).toLocaleDateString()}`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.text(dateText, margin, pageHeight - margin);
          doc.text('Signature: ____________________', pageWidth - margin - 60, pageHeight - margin);
        }

        // Add header to first page
        addHeader();
        let y = contentStartY;

        // Items title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Items', margin, y);
        y += 6;
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        // Items list
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        const items = Array.isArray(data.items) ? data.items : [];
        
        items.forEach(text => {
          if (y > pageHeight - margin - footerHeight) {
            // Add footer to current page before creating new page
            addFooter();
            // Create new page
            doc.addPage();
            // Add header to new page
            addHeader();
            y = contentStartY;
            
            // Add "Items (continued)" title on new pages
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Items (continued)', margin, y);
            y += 6;
            doc.setDrawColor(200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
          }
          doc.text(String(text), margin, y);
          y += 7;
        });

        // Add footer to last page
        addFooter();

        doc.save(`List_${list.id}.pdf`);
      } catch (err) {
        alert('Export failed');
        console.error(err);
      }
    });

    const editLink = document.createElement('a');
    editLink.className = 'btn';
    editLink.href = `edit.html?id=${encodeURIComponent(list.id)}`;
    editLink.textContent = 'Edit';
    editLink.addEventListener('click', (e) => { e.stopPropagation(); });

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.appendChild(exportBtn);
    actions.appendChild(editLink);

    const tdActions = document.createElement('td');
    tdActions.style.padding = '.5rem';
    tdActions.appendChild(actions);

    tr.appendChild(tdId);
    tr.appendChild(tdDriver);
    tr.appendChild(tdSpz);
    tr.appendChild(tdCount);
    tr.appendChild(tdDatetime);
    tr.appendChild(tdActions);
    return tr;
  }

  let currentSort = { key: 'seqId', dir: 'desc' };

  function sortLists(lists) {
    const k = currentSort.key;
    const dir = currentSort.dir === 'asc' ? 1 : -1;
    return lists.slice().sort((a, b) => {
      let av, bv;
      if (k === 'seqId') { av = a._seqId; bv = b._seqId; }
      else if (k === 'driver') { av = (a.driverName || '').toLowerCase(); bv = (b.driverName || '').toLowerCase(); }
      else if (k === 'spz') { av = (a.licensePlate || '').toLowerCase(); bv = (b.licensePlate || '').toLowerCase(); }
      else if (k === 'count') { av = (Array.isArray(a.items)?a.items.length:0); bv = (Array.isArray(b.items)?b.items.length:0); }
      else if (k === 'datetime') { av = new Date(a.createdAt || a.updatedAt || 0).getTime(); bv = new Date(b.createdAt || b.updatedAt || 0).getTime(); }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  function renderTable(lists) {
    tableBody.innerHTML = '';
    if (!lists.length) { emptyEl.style.display = ''; return; }
    emptyEl.style.display = 'none';
    const sorted = sortLists(lists);
    sorted.forEach((list, i) => {
      const tr = createRow(list, list._seqId);
      tableBody.appendChild(tr);
    });
  }

  async function loadLists() {
    const res = await fetch('api/lists.php');
    const lists = await res.json();
    // use stored incremental IDs directly
    const withSeq = lists.map((x) => Object.assign({}, x, { _seqId: x.id }));
    renderTable(withSeq);
    // wire sorting
    thId.onclick = () => { currentSort = { key: 'seqId', dir: currentSort.key==='seqId' && currentSort.dir==='desc' ? 'asc':'desc' }; renderTable(withSeq); };
    thDriver.onclick = () => { currentSort = { key: 'driver', dir: currentSort.key==='driver' && currentSort.dir==='asc' ? 'desc':'asc' }; renderTable(withSeq); };
    thSpz.onclick = () => { currentSort = { key: 'spz', dir: currentSort.key==='spz' && currentSort.dir==='asc' ? 'desc':'asc' }; renderTable(withSeq); };
    thCount.onclick = () => { currentSort = { key: 'count', dir: currentSort.key==='count' && currentSort.dir==='asc' ? 'desc':'asc' }; renderTable(withSeq); };
    thDatetime.onclick = () => { currentSort = { key: 'datetime', dir: currentSort.key==='datetime' && currentSort.dir==='asc' ? 'desc':'asc' }; renderTable(withSeq); };
  }

  // Refresh data when page becomes visible (handles back button navigation)
  function handleVisibilityChange() {
    if (!document.hidden) {
      loadLists(); // Reload data when page becomes visible
    }
  }

  // Refresh data when page is shown from cache (handles back/forward navigation)
  function handlePageShow(event) {
    if (event.persisted) {
      loadLists(); // Reload data if page was restored from cache
    }
  }

  // Add event listeners for page visibility and cache restoration
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handlePageShow);

  loadLists();
})();


