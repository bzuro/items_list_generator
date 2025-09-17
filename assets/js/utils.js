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
  
  if (isInternal && (ref.includes('view.html') || ref.includes('index.html'))) {
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
    headerElement.classList.add('flex-header'); // Add class instead of replacing
    headerElement.appendChild(badge);
  }
  badge.innerHTML = `<span class="badge-number">${count}</span> <span class="badge-text">položek</span>`;
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
export function renderItemsList(listElement, items, onDelete, emptyMessage = 'Žádné položky.') {
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
 * Generate and download a PDF for a list using pdfmake (supports UTF-8/diacritics)
 * @param {Object} listData - List data containing id, items, driverName, licensePlate, createdAt
 * @param {string} filename - Optional filename (defaults to List_{id}.pdf)
 */
export function generateListPDF(listData, filename = null) {
  if (!window.pdfMake) { 
    alert('PDF library not loaded'); 
    return; 
  }
  
  // Configure pdfMake fonts for Czech/Slovak diacritics support
  window.pdfMake.fonts = {
    Roboto: {
      normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
      bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
      italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
      bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
    }
  };

  const items = Array.isArray(listData.items) ? listData.items : [];
  
  // Format creation date with time for header (24-hour format with / separator)
  const headerDateText = formatDate(new Date(listData.createdAt || Date.now()));
  
  // Format current date with time for footer (24-hour format with / separator)
  const footerDateText = formatDate(new Date());
  
  // Create the document definition with proper UTF-8 support
  const docDefinition = {
    // Header - contains all content except signature
    header: function(currentPage, pageCount) {
      return {
        stack: [
          // Document title with creation date/time
          {
            columns: [
              {
                width: '*',
                text: `Přepravní Doklad č.: ${listData.id || 'N/A'}`,
                style: 'header'
              },
              {
                width: 'auto',
                text: headerDateText,
                style: 'headerDate'
              }
            ],
            margin: [0, 0, 0, 10]
          },
          
          // Driver and License plate section
          {
            columns: [
              {
                width: '65%',
                text: [
                  { text: 'Řidič: ', style: 'label' },
                  { text: listData.driverName || '-', style: 'value' }
                ]
              },
              {
                width: '35%',
                text: [
                  { text: 'SPZ: ', style: 'label' },
                  { text: listData.licensePlate || '-', style: 'value' }
                ],
                alignment: 'right'
              }
            ],
            margin: [0, 0, 0, 15]
          },
          
          // Items section with count
          {
            columns: [
              {
                width: '*',
                text: 'Seznam položek',
                style: 'sectionHeader'
              },
              {
                width: 'auto',
                text: `${items.length}`,
                style: 'itemCount'
              }
            ],
            margin: [0, 20, 0, 0]
          },
          
          // Horizontal line
          {
            canvas: [
              {
                type: 'line',
                x1: 0, y1: 0,
                x2: 515, y2: 0,
                lineWidth: 1,
                lineColor: '#CCCCCC'
              }
            ],
            margin: [0, 0, 0, 10]
          }
        ],
        margin: [40, 40, 40, 20]
      };
    },
    
    content: [
      // Items list (without bullet points)
      {
        stack: items.map(item => ({
          text: String(item),
          style: 'listItem'
        })),
        margin: [0, 10, 0, 20]
      }
    ],
    
    // Footer - contains date and signature separated and aligned
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          {
            width: '*',
            text: footerDateText,
            style: 'footerDate'
          },
          {
            width: 'auto',
            text: 'Převzal (podpis): ____________________',
            style: 'footerSignature'
          }
        ],
        margin: [40, 40, 40, 0]
      };
    },
    
    // Styles
    styles: {
      header: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      headerDate: {
        fontSize: 12,
        bold: true,
        alignment: 'right'
      },
      label: {
        fontSize: 11,
        color: '#666666'
      },
      value: {
        fontSize: 11,
        bold: true
      },
      sectionHeader: {
        fontSize: 14,
        bold: true
      },
      itemCount: {
        fontSize: 16,
        bold: true,
        alignment: 'right'
      },
      listItem: {
        fontSize: 12,
        margin: [0, 2, 0, 2]
      },
      footerDate: {
        fontSize: 11,
        alignment: 'left'
      },
      footerSignature: {
        fontSize: 11,
        alignment: 'right'
      }
    },
    
    // Default style
    defaultStyle: {
      font: 'Roboto',
      fontSize: 12,
      lineHeight: 1.3
    },
    
    // Page settings - increased top margin for header, bottom margin for footer
    pageSize: 'A4',
    pageMargins: [40, 150, 40, 100],
    
    // Document info
    info: {
      title: `Prepravní Doklad ${listData.id || ''}`,
      author: 'Items List Generator',
      subject: 'Transport Document',
      creator: 'Items List Generator'
    }
  };

  // Generate and download the PDF
  const pdfFilename = filename || `List_${listData.id}.pdf`;
  window.pdfMake.createPdf(docDefinition).download(pdfFilename);
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
  const d = new Date(date || Date.now());
  const dateStr = d.toLocaleDateString('cs-CZ');
  const timeStr = d.toLocaleTimeString('cs-CZ', { hour12: false, hour: '2-digit', minute: '2-digit' });
  return dateStr + '\u00A0\u00A0' + timeStr; // Using non-breaking spaces
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

/**
 * Get the next auto-increment ID for new lists
 * @returns {Promise<number>} Next list ID
 */
export async function getNextListId() {
  const response = await apiCall('api/lists.php?nextId=1');
  return response.nextId;
}