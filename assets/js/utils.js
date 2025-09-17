/**
 * Shared utilities for the Items List Generator application
 * Contains common functions used across multiple modules
 */

// ============================================================================
// URL and Navigation Utilities
// ============================================================================

/**
 * Get URL parameter value by name
 * @param {string} name - Parameter name to retrieve
 * @returns {string|null} Parameter value or null if not found
 */
export function getUrlParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

/**
 * Get the current list ID from URL parameters
 * @returns {string|null} List ID or null if not found
 */
export function getCurrentListId() {
  return getUrlParam('id');
}

/**
 * Navigate to a page with proper refresh handling
 * @param {string} url - URL to navigate to
 */
export function navigateTo(url) {
  window.location.href = url;
}

/**
 * Redirect back to referrer with fallback
 * @param {string} fallbackUrl - URL to use if no valid referrer
 */
export function navigateBack(fallbackUrl = 'index.html') {
  const ref = document.referrer || '';
  const isInternal = ref && ref.indexOf(window.location.origin) === 0;
  
  if (isInternal && (ref.includes('list.html') || ref.includes('index.html'))) {
    navigateTo(ref);
  } else {
    navigateTo(fallbackUrl);
  }
}

// ============================================================================
// Modal and UI Utilities
// ============================================================================

/**
 * Show delete confirmation modal for an item
 * @param {string} itemText - Text of the item to delete
 * @param {Function} onConfirm - Callback function to execute on confirmation
 */
export function showDeleteModal(itemText, onConfirm) {
  const deleteModal = document.getElementById('deleteModal');
  const deleteConfirm = document.getElementById('deleteConfirm');
  const deleteCancel = document.getElementById('deleteCancel');
  const deleteMessage = document.getElementById('deleteMessage');
  
  if (!deleteModal) {
    // Fallback to simple confirm
    if (confirm(`Are you sure you want to delete "${itemText}"?`)) {
      onConfirm();
    }
    return;
  }
  
  if (deleteMessage) {
    deleteMessage.innerHTML = `Are you sure you want to delete <strong>${itemText}</strong>?`;
  }
  
  // Show modal
  deleteModal.className = 'modal show';
  
  // Set up event handlers for this specific deletion
  const handleConfirm = () => {
    onConfirm();
    deleteModal.className = 'modal hidden';
    cleanup();
  };
  
  const handleCancel = () => {
    deleteModal.className = 'modal hidden';
    cleanup();
  };
  
  const handleClickOutside = (ev) => {
    if (ev.target === deleteModal) {
      deleteModal.className = 'modal hidden';
      cleanup();
    }
  };
  
  const cleanup = () => {
    deleteConfirm.removeEventListener('click', handleConfirm);
    deleteCancel.removeEventListener('click', handleCancel);
    deleteModal.removeEventListener('click', handleClickOutside);
  };
  
  // Add event listeners
  deleteConfirm.addEventListener('click', handleConfirm);
  deleteCancel.addEventListener('click', handleCancel);
  deleteModal.addEventListener('click', handleClickOutside);
}

/**
 * Create and update an item count badge in a header
 * @param {string} badgeId - Unique ID for the badge element
 * @param {HTMLElement} headerElement - Header element to append badge to
 * @param {number} count - Number of items to display
 * @returns {HTMLElement} The badge element
 */
export function createItemCountBadge(badgeId, headerElement, count) {
  let badge = document.getElementById(badgeId);
  if (!badge) {
    badge = document.createElement('div');
    badge.id = badgeId;
    badge.className = 'hint count-badge';
    headerElement.className = 'flex-header';
    headerElement.appendChild(badge);
  }
  badge.innerHTML = `<span class="badge-number">${count}</span> <span class="badge-text">items</span>`;
  return badge;
}

// ============================================================================
// Page Lifecycle and Refresh Utilities
// ============================================================================

/**
 * Set up page refresh handlers for back/forward navigation and visibility changes
 * @param {Function} refreshCallback - Function to call when page needs refresh
 */
export function setupPageRefreshHandlers(refreshCallback) {
  // Refresh data when page becomes visible (handles back button navigation)
  function handleVisibilityChange() {
    if (!document.hidden) {
      refreshCallback();
    }
  }

  // Refresh data when page is shown from cache (handles back/forward navigation)
  function handlePageShow(event) {
    if (event.persisted) {
      refreshCallback();
    }
  }

  // Add event listeners for page visibility and cache restoration
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handlePageShow);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handlePageShow);
  };
}

// ============================================================================
// Item List Rendering Utilities  
// ============================================================================

/**
 * Render items list with delete functionality
 * @param {HTMLElement} listElement - The list container element
 * @param {Array} items - Array of item strings
 * @param {Function} onDelete - Callback function when item is deleted (receives item text and index)
 * @param {string} emptyMessage - Message to show when list is empty
 */
export function renderItemsList(listElement, items, onDelete, emptyMessage = 'No items yet.') {
  listElement.innerHTML = '';
  
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = emptyMessage;
    listElement.appendChild(empty);
  } else {
    items.forEach((text, index) => {
      const li = document.createElement('li');
      li.className = 'item item-row';

      const span = document.createElement('div');
      span.className = 'text';
      span.textContent = text;

      const delBtn = document.createElement('span');
      delBtn.innerHTML = '🗑️';
      delBtn.title = 'Delete item';
      delBtn.className = 'delete-btn';

      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showDeleteModal(text, () => onDelete(text, index));
      });

      li.appendChild(span);
      li.appendChild(delBtn);
      listElement.appendChild(li);
    });
  }
}

/**
 * Render read-only items list (without delete functionality)
 * @param {HTMLElement} listElement - The list container element
 * @param {Array} items - Array of item strings
 * @param {string} emptyMessage - Message to show when list is empty
 */
export function renderReadOnlyList(listElement, items, emptyMessage = 'No items.') {
  listElement.innerHTML = '';
  
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = emptyMessage;
    listElement.appendChild(empty);
    return;
  }
  
  items.forEach(text => {
    const li = document.createElement('li');
    li.className = 'item';
    const span = document.createElement('div');
    span.className = 'text';
    span.textContent = text;
    li.appendChild(span);
    listElement.appendChild(li);
  });
}

// ============================================================================
// PDF Generation Utilities
// ============================================================================

/**
 * Generate and download a PDF for a list
 * @param {Object} listData - List data containing id, items, driverName, licensePlate, createdAt
 * @param {string} filename - Optional filename (defaults to List_{id}.pdf)
 */
export function generateListPDF(listData, filename = null) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { 
    alert('PDF library not loaded'); 
    return; 
  }
  
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const headerHeight = 25;
  const footerHeight = 20;
  const contentStartY = margin + headerHeight;
  
  // Function to add header to current page
  function addHeader() {
    let headerY = margin;
    
    // ID
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`ID: ${listData.id || ''}`, margin, headerY);
    headerY += 7;
    
    // Driver name and SPZ on same line with 2/3 and 1/3 width distribution
    const contentWidth = pageWidth - 2 * margin;
    const driverWidth = contentWidth * (2/3);
    const spzWidth = contentWidth * (1/3);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Driver:', margin, headerY);
    doc.setFont('helvetica', 'bold');
    const driverName = String(listData.driverName || '-');
    doc.text(driverName, margin + 20, headerY, { maxWidth: driverWidth - 20 });
    
    // SPZ positioned at 2/3 of the content width
    const spzStartX = margin + driverWidth;
    doc.setFont('helvetica', 'normal');
    doc.text('SPZ:', spzStartX, headerY);
    doc.setFont('helvetica', 'bold');
    const spzText = String(listData.licensePlate || '-');
    doc.text(spzText, spzStartX + 15, headerY, { maxWidth: spzWidth - 15 });
    headerY += 8;
    
  }
  
  // Function to add footer to current page
  function addFooter() {
    const dateText = `Date: ${new Date(listData.createdAt || Date.now()).toLocaleDateString()}`;
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
  const items = Array.isArray(listData.items) ? listData.items : [];
  
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

  const pdfFilename = filename || `List_${listData.id}.pdf`;
  doc.save(pdfFilename);
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate driver name and license plate inputs
 * @param {string} driverName - Driver name to validate
 * @param {string} licensePlate - License plate to validate
 * @param {HTMLElement} driverInput - Driver name input element for focus
 * @param {HTMLElement} licensePlateInput - License plate input element for focus
 * @returns {boolean} True if valid, false otherwise
 */
export function validateDriverAndLicense(driverName, licensePlate, driverInput, licensePlateInput) {
  if (!driverName) {
    alert('Driver name is required.');
    if (driverInput) driverInput.focus();
    return false;
  }
  
  if (!licensePlate) {
    alert('SPZ (license plate) is required.');
    if (licensePlateInput) licensePlateInput.focus();
    return false;
  }
  
  return true;
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Safe localStorage operations with error handling
 */
export const storage = {
  /**
   * Get item from localStorage with JSON parsing
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key not found or parsing fails
   * @returns {*} Parsed value or default
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Set item in localStorage with JSON stringification
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
};

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return new Date(date || Date.now()).toLocaleString();
}

/**
 * Format date for PDF footer
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateForPDF(date) {
  return new Date(date || Date.now()).toLocaleDateString();
}

// ============================================================================
// API Utilities
// ============================================================================

/**
 * Simplified API call with error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
export async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Update a list via API with fallback for PUT method restrictions
 * @param {string} id - List ID
 * @param {Object} data - List data to update
 * @returns {Promise<Object>} Response data
 */
export async function updateList(id, data) {
  const url = `api/lists.php?id=${encodeURIComponent(id)}`;
  
  try {
    // Try standard PUT first
    return await apiCall(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  } catch (error) {
    // Fallback for servers that don't support PUT
    try {
      return await apiCall(`${url}&_method=PUT`, {
        method: 'POST',
        headers: { 'X-HTTP-Method-Override': 'PUT' },
        body: JSON.stringify(data)
      });
    } catch (fallbackError) {
      throw new Error('Failed to save list');
    }
  }
}

/**
 * Create a new list via API
 * @param {Object} data - List data to create
 * @returns {Promise<Object>} Response data
 */
export async function createList(data) {
  return apiCall('api/lists.php', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Get a list by ID
 * @param {string} id - List ID
 * @returns {Promise<Object>} List data
 */
export async function getList(id) {
  return apiCall(`api/lists.php?id=${encodeURIComponent(id)}`);
}

/**
 * Get all lists
 * @returns {Promise<Array>} Array of lists
 */
export async function getAllLists() {
  return apiCall('api/lists.php');
}