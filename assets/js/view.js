(function() {
  function getId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('id');
  }
  const id = getId();
  const itemsEl = document.getElementById('items');
  const metaEl = document.getElementById('meta');
  const editLink = document.getElementById('editLink');
  const exportBtn = document.getElementById('exportPdfBtn');
  const listHeader = document.querySelector('.list-header');
  const listTitleEl = document.getElementById('listTitle');
  const pageHeaderTitleEl = document.querySelector('.card-header .title');
  let currentData = null;

  if (!id) { window.location.replace('index.html'); }

  function renderItems(items) {
    itemsEl.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No items.';
      itemsEl.appendChild(empty);
      return;
    }
    items.forEach(text => {
      const li = document.createElement('li');
      li.className = 'item';
      const span = document.createElement('div');
      span.className = 'text';
      span.textContent = text;
      li.appendChild(span);
      itemsEl.appendChild(li);
    });
  }

  async function load() {
    const res = await fetch(`api/lists.php?id=${encodeURIComponent(id)}`);
    if (!res.ok) { alert('Not found'); window.location.replace('index.html'); return; }
    const data = await res.json();
    // Use stored incremental ID directly
    const seqName = String(data.id || '');
    if (pageHeaderTitleEl) {
      pageHeaderTitleEl.textContent = seqName ? `ID: ${seqName}` : 'ID';
    }
    if (listTitleEl) {
      listTitleEl.textContent = 'Items';
    }
    currentData = data;
    const count = Array.isArray(data.items) ? data.items.length : 0;
    const created = new Date(data.createdAt).toLocaleString();
    const driver = data.driverName || '';
    const spz = data.licensePlate || '';
    metaEl.innerHTML = `
  <div style="display:flex; gap:4rem; align-items:center; flex-wrap:wrap; color:#000; margin: 0 0 1.5rem 0;">
    <div style="display:flex; align-items:center; gap:.5rem; min-width:140px;">
      <span style="opacity:.9;">Driver:</span>
      <span style="font-weight:700;">${driver || '-'}</span>
    </div>

    <div style="display:flex; align-items:center; gap:.5rem; min-width:110px;">
      <span style="opacity:.9;">SPZ:</span>
      <span style="font-weight:700;">${spz || '-'}</span>
    </div>

    <div style="display:flex; align-items:center; gap:.5rem; min-width:180px;">
      <span style="opacity:.9;">Date:</span>
      <span style="font-weight:700;">${created}</span>
    </div>
  </div>
`;
    editLink.href = `edit.html?id=${encodeURIComponent(id)}`;
    // Add count badge on top right
    if (listHeader) {
      let badge = document.getElementById('countBadge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'countBadge';
        badge.className = 'hint';
        badge.style.marginLeft = 'auto';
        badge.style.fontWeight = '700';
        badge.style.fontSize = '1.1rem';
        listHeader.style.display = 'flex';
        listHeader.style.alignItems = 'center';
        listHeader.appendChild(badge);
      }
      badge.innerHTML = `<span style="font-size:1.4rem; font-weight:800;">${count}</span> <span style="font-size:.9rem; font-weight:400;">items</span>`;
    }
    renderItems(data.items || []);
    if (window.location.hash === '#export') {
      setTimeout(() => exportPdf(), 100);
    }
  }

  function exportPdf() {
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
      doc.text(`ID: ${currentData ? currentData.id : ''}`, margin, headerY);
      headerY += 7;
      
      // Driver name and SPZ on same line with 2/3 and 1/3 width distribution
      const contentWidth = pageWidth - 2 * margin;
      const driverWidth = contentWidth * (2/3);
      const spzWidth = contentWidth * (1/3);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Driver:', margin, headerY);
      doc.setFont('helvetica', 'bold');
      const driverName = String((currentData && currentData.driverName) ? currentData.driverName : '-');
      doc.text(driverName, margin + 20, headerY, { maxWidth: driverWidth - 20 });
      
      // SPZ positioned at 2/3 of the content width
      const spzStartX = margin + driverWidth;
      doc.setFont('helvetica', 'normal');
      doc.text('SPZ:', spzStartX, headerY);
      doc.setFont('helvetica', 'bold');
      const spzText = String((currentData && currentData.licensePlate) ? currentData.licensePlate : '-');
      doc.text(spzText, spzStartX + 15, headerY, { maxWidth: spzWidth - 15 });
      headerY += 8;
    }
    
    // Function to add footer to current page
    function addFooter() {
      const dateText = `Date: ${new Date(currentData && currentData.createdAt ? currentData.createdAt : Date.now()).toLocaleDateString()}`;
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
    const items = Array.from(document.querySelectorAll('#items li .text')).map(el => el.textContent || '');
    
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
        doc.text('Items', margin, y);
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

    doc.save(`List_${id}.pdf`);
  }

  exportBtn.addEventListener('click', exportPdf);
  load();
})();


