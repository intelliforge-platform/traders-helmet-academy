/**
 * TRADERS HELMET ACADEMY - FORM VALIDATION FRAMEWORK
 * Advanced form validation with real-time feedback and custom rules
 */

class FormValidator {
  constructor(options = {}) {
    this.options = {
      validateOnInput: true,
      validateOnBlur: true,
      showErrorsImmediately: false,
      errorClass: 'is-invalid',
      successClass: 'is-valid',
      errorMessageClass: 'invalid-feedback',
      successMessageClass: 'valid-feedback',
      ...options
    };
    
    this.forms = new Map();
    this.rules = new Map();
    this.customValidators = new Map();
    
    this.setupDefaultRules();
    this.setupCustomValidators();
    
    console.log('📝 Form Validator initialized');
  }

  /**
   * Setup default validation rules
   */
  setupDefaultRules() {
    // Required field
    this.addRule('required', (value, params) => {
      const isValid = value !== null && value !== undefined && value.toString().trim() !== '';
      return {
        isValid,
        message: params.message || 'This field is required'
      };
    });

    // Minimum length
    this.addRule('minLength', (value, params) => {
      const minLength = params.value || params;
      const isValid = !value || value.length >= minLength;
      return {
        isValid,
        message: params.message || `Must be at least ${minLength} characters`
      };
    });

    // Maximum length
    this.addRule('maxLength', (value, params) => {
      const maxLength = params.value || params;
      const isValid = !value || value.length <= maxLength;
      return {
        isValid,
        message: params.message || `Must be no more than ${maxLength} characters`
      };
    });

    // Email validation
    this.addRule('email', (value, params) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = !value || emailRegex.test(value);
      return {
        isValid,
        message: params.message || 'Please enter a valid email address'
      };
    });

    // Password strength
    this.addRule('password', (value, params) => {
      if (!value) return { isValid: true, message: '' };
      
      const minLength = params.minLength || 8;
      const requireUppercase = params.requireUppercase !== false;
      const requireLowercase = params.requireLowercase !== false;
      const requireNumbers = params.requireNumbers !== false;
      const requireSpecial = params.requireSpecial !== false;
      
      const checks = {
        length: value.length >= minLength,
        uppercase: !requireUppercase || /[A-Z]/.test(value),
        lowercase: !requireLowercase || /[a-z]/.test(value),
        numbers: !requireNumbers || /\d/.test(value),
        special: !requireSpecial || /[!@#$%^&*(),.?":{}|<>]/.test(value)
      };
      
      const isValid = Object.values(checks).every(Boolean);
      
      let message = params.message;
      if (!message) {
        const requirements = [];
        if (!checks.length) requirements.push(`at least ${minLength} characters`);
        if (!checks.uppercase) requirements.push('uppercase letter');
        if (!checks.lowercase) requirements.push('lowercase letter');  
        if (!checks.numbers) requirements.push('number');
        if (!checks.special) requirements.push('special character');
        
        message = requirements.length > 0 
          ? `Password must contain ${requirements.join(', ')}`
          : '';
      }
      
      return { isValid, message, checks };
    });

    // Phone number
    this.addRule('phone', (value, params) => {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanValue = value ? value.replace(/[\s\-\(\)]/g, '') : '';
      const isValid = !value || phoneRegex.test(cleanValue);
      return {
        isValid,
        message: params.message || 'Please enter a valid phone number'
      };
    });

    // Number validation
    this.addRule('number', (value, params) => {
      const isValid = !value || !isNaN(value);
      return {
        isValid,
        message: params.message || 'Please enter a valid number'
      };
    });

    // Minimum value
    this.addRule('min', (value, params) => {
      const minValue = params.value || params;
      const numValue = parseFloat(value);
      const isValid = !value || (isNaN(numValue) || numValue >= minValue);
      return {
        isValid,
        message: params.message || `Value must be at least ${minValue}`
      };
    });

    // Maximum value
    this.addRule('max', (value, params) => {
      const maxValue = params.value || params;
      const numValue = parseFloat(value);
      const isValid = !value || (isNaN(numValue) || numValue <= maxValue);
      return {
        isValid,
        message: params.message || `Value must be no more than ${maxValue}`
      };
    });

    // URL validation
    this.addRule('url', (value, params) => {
      try {
        if (!value) return { isValid: true, message: '' };
        new URL(value);
        return { isValid: true, message: '' };
      } catch {
        return {
          isValid: false,
          message: params.message || 'Please enter a valid URL'
        };
      }
    });

    // Date validation
    this.addRule('date', (value, params) => {
      if (!value) return { isValid: true, message: '' };
      
      const date = new Date(value);
      const isValid = !isNaN(date.getTime());
      return {
        isValid,
        message: params.message || 'Please enter a valid date'
      };
    });

    // Match another field
    this.addRule('match', (value, params, formData) => {
      const fieldToMatch = params.field || params;
      const matchValue = formData[fieldToMatch];
      const isValid = !value || value === matchValue;
      return {
        isValid,
        message: params.message || `Must match ${fieldToMatch}`
      };
    });

    // Credit card validation
    this.addRule('creditCard', (value, params) => {
      if (!value) return { isValid: true, message: '' };
      
      const cleanValue = value.replace(/\s+/g, '');
      const isValid = this.luhnCheck(cleanValue);
      return {
        isValid,
        message: params.message || 'Please enter a valid credit card number'
      };
    });

    // Trading symbol validation
    this.addRule('tradingSymbol', (value, params) => {
      const symbolRegex = /^[A-Z]{3,6}(\/[A-Z]{3})?$/;
      const isValid = !value || symbolRegex.test(value.toUpperCase());
      return {
        isValid,
        message: params.message || 'Please enter a valid trading symbol (e.g., EURUSD or EUR/USD)'
      };
    });
  }

  /**
   * Setup custom validators for trading-specific fields
   */
  setupCustomValidators() {
    // Account balance validator
    this.addCustomValidator('accountBalance', async (value, params) => {
      if (!value || isNaN(value)) return { isValid: false, message: 'Invalid account balance' };
      
      const balance = parseFloat(value);
      const minBalance = params.minBalance || 100;
      
      if (balance < minBalance) {
        return { isValid: false, message: `Minimum account balance is $${minBalance}` };
      }
      
      return { isValid: true, message: '' };
    });

    // Risk percentage validator
    this.addCustomValidator('riskPercentage', async (value, params) => {
      if (!value || isNaN(value)) return { isValid: false, message: 'Invalid risk percentage' };
      
      const risk = parseFloat(value);
      const maxRisk = params.maxRisk || 5;
      
      if (risk > maxRisk) {
        return { isValid: false, message: `Risk percentage should not exceed ${maxRisk}%` };
      }
      
      return { isValid: true, message: '' };
    });

    // Username availability validator
    this.addCustomValidator('usernameAvailable', async (value, params) => {
      if (!value || value.length < 3) return { isValid: true, message: '' };
      
      try {
        // Simulate API call to check username availability
        const response = await apiService.get(`/auth/check-username?username=${value}`);
        return {
          isValid: response.data.available,
          message: response.data.available ? '' : 'Username is already taken'
        };
      } catch (error) {
        return { isValid: true, message: '' }; // Don't block on API errors
      }
    });

    // Email verification validator
    this.addCustomValidator('emailVerified', async (value, params) => {
      if (!value) return { isValid: true, message: '' };
      
      try {
        const response = await apiService.get(`/auth/check-email?email=${value}`);
        return {
          isValid: !response.data.exists || response.data.verified,
          message: response.data.exists && !response.data.verified 
            ? 'Please verify your email before proceeding' 
            : ''
        };
      } catch (error) {
        return { isValid: true, message: '' };
      }
    });
  }

  /**
   * Initialize form validation
   */
  initForm(formSelector, validationRules, options = {}) {
    const form = document.querySelector(formSelector);
    if (!form) {
      console.error('Form not found:', formSelector);
      return null;
    }

    const formConfig = {
      element: form,
      rules: validationRules,
      options: { ...this.options, ...options },
      fields: new Map(),
      isValid: false,
      errors: {},
      hasBeenSubmitted: false
    };

    // Setup form fields
    Object.keys(validationRules).forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        this.setupField(formConfig, fieldName, field);
      }
    });

    // Setup form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit(formConfig);
    });

    this.forms.set(formSelector, formConfig);
    return formConfig;
  }

  /**
   * Setup individual field validation
   */
  setupField(formConfig, fieldName, field) {
    const fieldConfig = {
      element: field,
      name: fieldName,
      rules: formConfig.rules[fieldName],
      isValid: true,
      errors: [],
      hasBeenValidated: false
    };

    formConfig.fields.set(fieldName, fieldConfig);

    // Add event listeners
    if (formConfig.options.validateOnInput) {
      field.addEventListener('input', 
        THA_Utils.performance.debounce(() => {
          this.validateField(formConfig, fieldName);
        }, 300)
      );
    }

    if (formConfig.options.validateOnBlur) {
      field.addEventListener('blur', () => {
        this.validateField(formConfig, fieldName);
      });
    }

    // Add focus event to clear errors
    field.addEventListener('focus', () => {
      this.clearFieldErrors(formConfig, fieldName);
    });
  }

  /**
   * Validate individual field
   */
  async validateField(formConfig, fieldName) {
    const fieldConfig = formConfig.fields.get(fieldName);
    if (!fieldConfig) return true;

    const field = fieldConfig.element;
    const value = this.getFieldValue(field);
    const formData = this.getFormData(formConfig.element);
    
    fieldConfig.hasBeenValidated = true;
    fieldConfig.errors = [];

    // Validate each rule for this field
    for (const [ruleName, ruleParams] of Object.entries(fieldConfig.rules)) {
      try {
        let result;
        
        if (this.customValidators.has(ruleName)) {
          // Custom async validator
          result = await this.customValidators.get(ruleName)(value, ruleParams, formData);
        } else if (this.rules.has(ruleName)) {
          // Built-in validator
          result = this.rules.get(ruleName)(value, ruleParams, formData);
        } else {
          console.warn(`Unknown validation rule: ${ruleName}`);
          continue;
        }

        if (!result.isValid) {
          fieldConfig.errors.push(result.message);
        }
      } catch (error) {
        console.error(`Validation error for ${ruleName}:`, error);
      }
    }

    fieldConfig.isValid = fieldConfig.errors.length === 0;
    formConfig.errors[fieldName] = fieldConfig.errors;

    // Update UI
    this.updateFieldUI(formConfig, fieldName);

    return fieldConfig.isValid;
  }

  /**
   * Validate entire form
   */
  async validateForm(formSelector) {
    const formConfig = this.forms.get(formSelector);
    if (!formConfig) return false;

    formConfig.hasBeenSubmitted = true;
    const validationPromises = [];

    // Validate all fields
    for (const fieldName of formConfig.fields.keys()) {
      validationPromises.push(this.validateField(formConfig, fieldName));
    }

    const results = await Promise.all(validationPromises);
    formConfig.isValid = results.every(Boolean);

    return formConfig.isValid;
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(formConfig) {
    const isValid = await this.validateForm(formConfig.element.getAttribute('id') || 'form');
    
    if (isValid) {
      const formData = this.getFormData(formConfig.element);
      
      // Emit form submit event
      const submitEvent = new CustomEvent('formValidSubmit', {
        detail: { formData, formConfig }
      });
      formConfig.element.dispatchEvent(submitEvent);
      
      // Call submit handler if provided
      if (formConfig.options.onValidSubmit) {
        formConfig.options.onValidSubmit(formData, formConfig);
      }
    } else {
      // Emit form invalid event
      const invalidEvent = new CustomEvent('formInvalid', {
        detail: { errors: formConfig.errors, formConfig }
      });
      formConfig.element.dispatchEvent(invalidEvent);
      
      // Focus first invalid field
      this.focusFirstInvalidField(formConfig);
      
      // Call error handler if provided
      if (formConfig.options.onInvalidSubmit) {
        formConfig.options.onInvalidSubmit(formConfig.errors, formConfig);
      }
    }
  }

  /**
   * Update field UI based on validation state
   */
  updateFieldUI(formConfig, fieldName) {
    const fieldConfig = formConfig.fields.get(fieldName);
    const field = fieldConfig.element;
    
    // Remove existing classes
    field.classList.remove(formConfig.options.errorClass, formConfig.options.successClass);
    
    // Show validation state only after field has been validated or form submitted
    if (fieldConfig.hasBeenValidated || formConfig.hasBeenSubmitted) {
      if (fieldConfig.isValid) {
        field.classList.add(formConfig.options.successClass);
      } else {
        field.classList.add(formConfig.options.errorClass);
      }
      
      // Update error messages
      this.updateErrorMessages(formConfig, fieldName);
    }
  }

  /**
   * Update error messages for a field
   */
  updateErrorMessages(formConfig, fieldName) {
    const fieldConfig = formConfig.fields.get(fieldName);
    const field = fieldConfig.element;
    
    // Remove existing error messages
    const existingErrors = field.parentElement.querySelectorAll(`.${formConfig.options.errorMessageClass}`);
    existingErrors.forEach(error => error.remove());
    
    // Add new error messages
    if (!fieldConfig.isValid && fieldConfig.errors.length > 0) {
      fieldConfig.errors.forEach(errorMessage => {
        const errorElement = document.createElement('div');
        errorElement.className = formConfig.options.errorMessageClass;
        errorElement.textContent = errorMessage;
        field.parentElement.appendChild(errorElement);
      });
    }
  }

  /**
   * Clear field errors
   */
  clearFieldErrors(formConfig, fieldName) {
    const fieldConfig = formConfig.fields.get(fieldName);
    const field = fieldConfig.element;
    
    field.classList.remove(formConfig.options.errorClass);
    
    const errorMessages = field.parentElement.querySelectorAll(`.${formConfig.options.errorMessageClass}`);
    errorMessages.forEach(error => error.remove());
  }

  /**
   * Focus first invalid field
   */
  focusFirstInvalidField(formConfig) {
    for (const [fieldName, fieldConfig] of formConfig.fields) {
      if (!fieldConfig.isValid) {
        fieldConfig.element.focus();
        break;
      }
    }
  }

  /**
   * Get form data as object
   */
  getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      if (data[key]) {
        // Handle multiple values (checkboxes, etc.)
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }
    
    return data;
  }

  /**
   * Get field value based on field type
   */
  getFieldValue(field) {
    switch (field.type) {
      case 'checkbox':
        return field.checked;
      case 'radio':
        const radioGroup = document.querySelectorAll(`[name="${field.name}"]`);
        const checkedRadio = Array.from(radioGroup).find(radio => radio.checked);
        return checkedRadio ? checkedRadio.value : null;
      case 'select-multiple':
        return Array.from(field.selectedOptions).map(option => option.value);
      default:
        return field.value;
    }
  }

  /**
   * Add validation rule
   */
  addRule(name, validator) {
    this.rules.set(name, validator);
  }

  /**
   * Add custom async validator
   */
  addCustomValidator(name, validator) {
    this.customValidators.set(name, validator);
  }

  /**
   * Luhn algorithm for credit card validation
   */
  luhnCheck(cardNumber) {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Utility methods
   */
  getFormConfig(formSelector) {
    return this.forms.get(formSelector);
  }

  isFormValid(formSelector) {
    const formConfig = this.forms.get(formSelector);
    return formConfig ? formConfig.isValid : false;
  }

  getFormErrors(formSelector) {
    const formConfig = this.forms.get(formSelector);
    return formConfig ? formConfig.errors : {};
  }

  resetForm(formSelector) {
    const formConfig = this.forms.get(formSelector);
    if (!formConfig) return;

    formConfig.element.reset();
    formConfig.hasBeenSubmitted = false;
    formConfig.isValid = false;
    formConfig.errors = {};

    formConfig.fields.forEach((fieldConfig, fieldName) => {
      fieldConfig.isValid = true;
      fieldConfig.errors = [];
      fieldConfig.hasBeenValidated = false;
      this.clearFieldErrors(formConfig, fieldName);
    });
  }

  destroyForm(formSelector) {
    const formConfig = this.forms.get(formSelector);
    if (!formConfig) return;

    // Remove event listeners and clean up
    formConfig.fields.forEach((fieldConfig) => {
      const field = fieldConfig.element;
      field.removeEventListener('input', this.validateField);
      field.removeEventListener('blur', this.validateField);
      field.removeEventListener('focus', this.clearFieldErrors);
    });

    this.forms.delete(formSelector);
  }
}

// Create global form validator instance
const formValidator = new FormValidator();

// Make available globally
if (typeof window !== 'undefined') {
  window.formValidator = formValidator;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormValidator;
}

// Auto-initialize forms with data-validate attribute
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('[data-validate]');
  forms.forEach(form => {
    const rulesAttribute = form.getAttribute('data-validate');
    if (rulesAttribute) {
      try {
        const rules = JSON.parse(rulesAttribute);
        formValidator.initForm(`#${form.id}`, rules);
      } catch (error) {
        console.error('Invalid validation rules in data-validate:', error);
      }
    }
  });
});