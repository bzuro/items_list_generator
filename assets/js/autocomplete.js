/**
 * Autocomplete Module
 * Provides reusable autocomplete functionality for input fields
 * Updated: Removed hover functionality - should only work on click now
 */
class Autocomplete {
  constructor() {
    this.cache = {
      drivers: [],
      licensePlates: []
    };
    this.instances = new Map();
  }

  /**
   * Load autocomplete data from API endpoints
   */
  async loadData() {
    try {
      const [driversRes, licensePlatesRes] = await Promise.all([
        fetch('api/drivers.php'),
        fetch('api/license_plates.php')
      ]);
      
      if (driversRes.ok) {
        this.cache.drivers = await driversRes.json();
      }
      
      if (licensePlatesRes.ok) {
        this.cache.licensePlates = await licensePlatesRes.json();
      }
    } catch (error) {
      console.warn('Failed to load autocomplete data:', error);
    }
  }

  /**
   * Setup autocomplete for an input field
   * @param {HTMLInputElement} input - The input element
   * @param {string} dataType - 'drivers' or 'licensePlates'
   * @param {Object} options - Configuration options
   */
  setup(input, dataType, options = {}) {
    if (!input || !this.cache[dataType]) {
      console.warn('Invalid input or data type for autocomplete setup');
      return;
    }

    // Prevent duplicate setup
    if (this.instances.has(input)) {
      console.warn('Autocomplete already set up for this input');
      return;
    }

    const suggestions = this.cache[dataType];
    const config = {
      maxResults: 8,
      minChars: 1,
      showOnFocus: true,
      ...options
    };

    const instance = new AutocompleteInstance(input, suggestions, config);
    this.instances.set(input, instance);

    // Cleanup when input is removed from DOM
    const observer = new MutationObserver(() => {
      if (!document.contains(input)) {
        this.destroy(input);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return instance;
  }

  /**
   * Destroy autocomplete instance for an input
   * @param {HTMLInputElement} input - The input element
   */
  destroy(input) {
    const instance = this.instances.get(input);
    if (instance) {
      instance.destroy();
      this.instances.delete(input);
    }
  }

  /**
   * Get cached data
   * @param {string} dataType - 'drivers' or 'licensePlates'
   */
  getData(dataType) {
    return this.cache[dataType] || [];
  }
}

/**
 * Individual autocomplete instance for a single input
 */
class AutocompleteInstance {
  constructor(input, suggestions, config) {
    this.input = input;
    this.suggestions = suggestions;
    this.config = config;
    this.dropdownElement = null;
    this.selectedIndex = -1;
    this.originalValue = '';
    this.isVisible = false;

    this.init();
  }

  init() {
    this.setupInputWrapper();
    this.bindEvents();
  }

  setupInputWrapper() {
    let wrapper = this.input.parentElement;
    if (!wrapper.classList.contains('autocomplete-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.className = 'autocomplete-wrapper';
      
      this.input.parentElement.insertBefore(wrapper, this.input);
      wrapper.appendChild(this.input);
    }
    this.wrapper = wrapper;
  }

  bindEvents() {
    this.input.addEventListener('input', this.onInput.bind(this));
    this.input.addEventListener('focus', this.onFocus.bind(this));
    this.input.addEventListener('keydown', this.onKeydown.bind(this));
    
    // Close dropdown when clicking outside
    this.outsideClickHandler = (e) => {
      if (!this.input.contains(e.target) && 
          (!this.dropdownElement || !this.dropdownElement.contains(e.target))) {
        this.close();
      }
    };
    document.addEventListener('click', this.outsideClickHandler);
  }

  onInput(e) {
    const value = e.target.value;
    if (value.length >= this.config.minChars) {
      this.show(value);
    } else {
      this.close();
    }
  }

  onFocus(e) {
    if (this.config.showOnFocus && e.target.value) {
      this.show(e.target.value);
    }
  }

  onKeydown(e) {
    if (!this.isVisible) {
      if (e.key === 'Escape') {
        this.close();
      }
      return;
    }

    const itemCount = this.dropdownElement ? this.dropdownElement.children.length : 0;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, itemCount - 1);
        this.updateSelection();
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
      
      case 'Tab':
        e.preventDefault();
        if (this.selectedIndex === itemCount - 1) {
          this.selectedIndex = -1;
        } else {
          this.selectedIndex++;
        }
        this.updateSelection();
        break;
      
      case 'Enter':
        if (this.selectedIndex >= 0) {
          e.preventDefault();
          this.selectCurrentItem();
        }
        break;
      
      case 'Escape':
        this.close();
        break;
    }
  }

  show(value) {
    this.close();
    this.originalValue = value;

    if (!value || value.length < this.config.minChars) {
      return;
    }

    const filtered = this.suggestions
      .filter(item => item.toLowerCase().includes(value.toLowerCase()))
      .slice(0, this.config.maxResults);

    if (filtered.length === 0) {
      return;
    }

    this.createDropdown(filtered);
    this.isVisible = true;
  }

  createDropdown(items) {
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'autocomplete-dropdown';
    
    // Higher z-index for modals
    if (this.input.closest('.modal')) {
      this.dropdownElement.classList.add('modal-dropdown');
    }

    // Ensure input has proper positioning
    this.input.className += ' autocomplete-input';

    items.forEach((item, index) => {
      const itemElement = this.createDropdownItem(item, index);
      this.dropdownElement.appendChild(itemElement);
    });

    this.wrapper.appendChild(this.dropdownElement);
    this.selectedIndex = -1;
  }

  createDropdownItem(item, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'autocomplete-item';
    itemElement.textContent = item;

    itemElement.addEventListener('click', () => {
      this.input.value = item;
      this.close();
      this.input.focus();
    });

    return itemElement;
  }

  updateSelection() {
    if (!this.dropdownElement) return;

    const items = this.dropdownElement.children;
    
    for (let i = 0; i < items.length; i++) {
      if (i === this.selectedIndex) {
        items[i].classList.add('selected');
      } else {
        items[i].classList.remove('selected');
      }
    }
  }

  selectCurrentItem() {
    if (!this.dropdownElement || this.selectedIndex < 0) {
      return false;
    }

    const items = this.dropdownElement.children;
    if (items[this.selectedIndex]) {
      this.input.value = items[this.selectedIndex].textContent;
      this.close();
      return true;
    }
    return false;
  }

  close() {
    if (this.dropdownElement) {
      this.dropdownElement.remove();
      this.dropdownElement = null;
    }
    this.selectedIndex = -1;
    this.originalValue = '';
    this.isVisible = false;
  }

  destroy() {
    this.close();
    document.removeEventListener('click', this.outsideClickHandler);
  }
}

// Create and export global instance
window.AutocompleteManager = new Autocomplete();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.AutocompleteManager.loadData();
  });
} else {
  window.AutocompleteManager.loadData();
}