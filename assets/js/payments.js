/**
 * TRADERS HELMET ACADEMY - PAYMENT INTEGRATION SYSTEM
 * Stripe integration for subscriptions, upgrades, and payment processing
 */

class PaymentManager {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.card = null;
    this.isInitialized = false;
    this.paymentIntents = new Map();
    
    // Payment configuration
    this.config = {
      stripePublicKey: THA_CONFIG?.payment?.stripe?.publicKey || '',
      currency: 'USD',
      locale: 'en',
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#1e3c72',
          colorBackground: '#ffffff',
          colorText: '#30313d',
          colorDanger: '#df1b41',
          fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
          spacingUnit: '6px',
          borderRadius: '10px'
        }
      }
    };

    this.init();
  }

  /**
   * Initialize payment system
   */
  async init() {
    try {
      if (!this.config.stripePublicKey) {
        console.warn('⚠️ Stripe public key not configured');
        return;
      }

      // Load Stripe.js if not already loaded
      if (typeof Stripe === 'undefined') {
        await this.loadStripeJS();
      }

      // Initialize Stripe
      this.stripe = Stripe(this.config.stripePublicKey);
      this.isInitialized = true;

      console.log('💳 Payment Manager initialized');
    } catch (error) {
      console.error('❌ Payment Manager initialization failed:', error);
    }
  }

  /**
   * Load Stripe.js dynamically
   */
  loadStripeJS() {
    return new Promise((resolve, reject) => {
      if (typeof Stripe !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Create payment form for subscription
   */
  async createSubscriptionForm(containerId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Payment manager not initialized');
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error('Payment container not found');
    }

    const formConfig = {
      tier: options.tier || 'gold',
      billingCycle: options.billingCycle || 'monthly',
      discountCode: options.discountCode || null,
      customerId: options.customerId || null,
      ...options
    };

    // Create form HTML
    container.innerHTML = this.getSubscriptionFormHTML(formConfig);

    // Initialize Stripe Elements
    this.elements = this.stripe.elements({
      appearance: this.config.appearance,
      locale: this.config.locale
    });

    // Create payment element
    const paymentElement = this.elements.create('payment', {
      layout: 'tabs'
    });

    paymentElement.mount('#payment-element');

    // Setup form handlers
    this.setupSubscriptionFormHandlers(containerId, formConfig);

    return {
      containerId,
      formConfig,
      paymentElement
    };
  }

  /**
   * Get subscription form HTML
   */
  getSubscriptionFormHTML(config) {
    const tierPrices = {
      gold: { monthly: 49.99, quarterly: 134.99, annually: 479.99 },
      platinum: { monthly: 99.99, quarterly: 269.99, annually: 959.99 },
      diamond: { monthly: 199.99, quarterly: 539.99, annually: 1919.99 }
    };

    const price = tierPrices[config.tier][config.billingCycle];
    const savings = config.billingCycle === 'annually' 
      ? Math.round((tierPrices[config.tier].monthly * 12 - price) * 100) / 100
      : config.billingCycle === 'quarterly'
      ? Math.round((tierPrices[config.tier].monthly * 3 - price) * 100) / 100
      : 0;

    return `
      <div class="payment-form">
        <div class="payment-header">
          <h3 class="payment-title">
            <i class="fas fa-crown text-${config.tier}"></i>
            ${config.tier.charAt(0).toUpperCase() + config.tier.slice(1)} Membership
          </h3>
          <div class="payment-summary">
            <div class="price-display">
              <span class="price">$${price}</span>
              <span class="billing-cycle">/${config.billingCycle}</span>
            </div>
            ${savings > 0 ? `<div class="savings">Save $${savings}</div>` : ''}
          </div>
        </div>

        <form id="subscription-form" class="subscription-form">
          <!-- Customer Information -->
          <div class="form-section">
            <h4>Billing Information</h4>
            
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label">First Name</label>
                  <input type="text" name="firstName" class="form-control" required>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label">Last Name</label>
                  <input type="text" name="lastName" class="form-control" required>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" name="email" class="form-control" required>
            </div>

            <div class="row">
              <div class="col-md-8">
                <div class="form-group">
                  <label class="form-label">Address</label>
                  <input type="text" name="address" class="form-control" required>
                </div>
              </div>
              <div class="col-md-4">
                <div class="form-group">
                  <label class="form-label">ZIP Code</label>
                  <input type="text" name="zipCode" class="form-control" required>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label">City</label>
                  <input type="text" name="city" class="form-control" required>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label">Country</label>
                  <select name="country" class="form-control" required>
                    <option value="">Select Country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="IT">Italy</option>
                    <option value="ES">Spain</option>
                    <option value="NL">Netherlands</option>
                    <option value="JP">Japan</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Discount Code -->
          <div class="form-section">
            <div class="discount-section">
              <div class="form-group">
                <label class="form-label">Discount Code (Optional)</label>
                <div class="input-group">
                  <input type="text" id="discount-code" class="form-control" placeholder="Enter discount code">
                  <button type="button" id="apply-discount" class="btn btn-outline-primary">Apply</button>
                </div>
                <div id="discount-message" class="form-text"></div>
              </div>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="form-section">
            <h4>Payment Method</h4>
            <div id="payment-element" class="payment-element">
              <!-- Stripe Elements will create form elements here -->
            </div>
            <div id="payment-errors" class="alert alert-danger" style="display: none;"></div>
          </div>

          <!-- Terms and Submit -->
          <div class="form-section">
            <div class="form-check">
              <input type="checkbox" id="terms-checkbox" class="form-check-input" required>
              <label for="terms-checkbox" class="form-check-label">
                I agree to the <a href="/terms" target="_blank">Terms of Service</a> and 
                <a href="/privacy" target="_blank">Privacy Policy</a>
              </label>
            </div>

            <div class="form-check">
              <input type="checkbox" id="auto-renew-checkbox" class="form-check-input" checked>
              <label for="auto-renew-checkbox" class="form-check-label">
                Automatically renew my subscription
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" id="submit-payment" class="btn btn-primary btn-lg w-100">
              <span class="button-text">Subscribe Now - $${price}</span>
              <span class="spinner-border spinner-border-sm d-none" role="status"></span>
            </button>
          </div>
        </form>

        <div class="payment-security">
          <div class="security-badges">
            <i class="fas fa-lock"></i>
            <span>Secure 256-bit SSL encryption</span>
          </div>
          <div class="powered-by">
            Powered by <strong>Stripe</strong>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup subscription form event handlers
   */
  setupSubscriptionFormHandlers(containerId, config) {
    const form = document.getElementById('subscription-form');
    const submitButton = document.getElementById('submit-payment');
    const discountButton = document.getElementById('apply-discount');
    const discountInput = document.getElementById('discount-code');

    // Discount code handler
    if (discountButton && discountInput) {
      discountButton.addEventListener('click', () => {
        this.applyDiscountCode(discountInput.value.trim());
      });

      discountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.applyDiscountCode(discountInput.value.trim());
        }
      });
    }

    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubscriptionSubmit(form, config);
    });

    // Real-time validation for email
    const emailInput = form.querySelector('[name="email"]');
    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        this.validateEmail(emailInput.value);
      });
    }
  }

  /**
   * Apply discount code
   */
  async applyDiscountCode(code) {
    if (!code) return;

    const messageElement = document.getElementById('discount-message');
    const applyButton = document.getElementById('apply-discount');

    try {
      // Show loading state
      applyButton.disabled = true;
      applyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      // Validate discount code
      const response = await apiService.post('/payments/validate-discount', { code });

      if (response.data.valid) {
        messageElement.className = 'form-text text-success';
        messageElement.innerHTML = `
          <i class="fas fa-check"></i>
          ${response.data.description} - ${response.data.discount}% off applied!
        `;
        
        // Update price display
        this.updatePriceWithDiscount(response.data);
        
        tradersHelmet.showNotification('Discount code applied successfully!', 'success');
      } else {
        messageElement.className = 'form-text text-danger';
        messageElement.innerHTML = `
          <i class="fas fa-times"></i>
          ${response.data.message || 'Invalid discount code'}
        `;
      }
    } catch (error) {
      messageElement.className = 'form-text text-danger';
      messageElement.innerHTML = `
        <i class="fas fa-times"></i>
        Failed to validate discount code
      `;
      console.error('Discount validation error:', error);
    } finally {
      applyButton.disabled = false;
      applyButton.innerHTML = 'Apply';
    }
  }

  /**
   * Update price display with discount
   */
  updatePriceWithDiscount(discountData) {
    const priceDisplay = document.querySelector('.price-display');
    const originalPrice = parseFloat(priceDisplay.querySelector('.price').textContent.replace('$', ''));
    const discountAmount = originalPrice * (discountData.discount / 100);
    const newPrice = originalPrice - discountAmount;

    priceDisplay.innerHTML = `
      <div class="price-breakdown">
        <span class="original-price">$${originalPrice.toFixed(2)}</span>
        <span class="discount-amount">-$${discountAmount.toFixed(2)}</span>
        <span class="final-price">$${newPrice.toFixed(2)}</span>
        <span class="billing-cycle">/${document.querySelector('.billing-cycle').textContent.replace('/', '')}</span>
      </div>
    `;

    // Update submit button
    const submitButton = document.getElementById('submit-payment');
    submitButton.querySelector('.button-text').textContent = `Subscribe Now - $${newPrice.toFixed(2)}`;
  }

  /**
   * Handle subscription form submission
   */
  async handleSubscriptionSubmit(form, config) {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = submitButton.querySelector('.button-text');
    const spinner = submitButton.querySelector('.spinner-border');

    try {
      // Show loading state
      submitButton.disabled = true;
      buttonText.style.display = 'none';
      spinner.classList.remove('d-none');

      // Get form data
      const formData = new FormData(form);
      const customerData = Object.fromEntries(formData.entries());

      // Create payment intent
      const paymentIntent = await this.createSubscriptionPaymentIntent({
        ...config,
        customer: customerData
      });

      // Confirm payment
      const { error, paymentIntent: confirmedPaymentIntent } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
          payment_method_data: {
            billing_details: {
              name: `${customerData.firstName} ${customerData.lastName}`,
              email: customerData.email,
              address: {
                line1: customerData.address,
                city: customerData.city,
                postal_code: customerData.zipCode,
                country: customerData.country
              }
            }
          }
        },
        redirect: 'if_required'
      });

      if (error) {
        throw error;
      }

      // Handle successful payment
      if (confirmedPaymentIntent.status === 'succeeded') {
        await this.handlePaymentSuccess(confirmedPaymentIntent, config);
      }

    } catch (error) {
      this.handlePaymentError(error);
    } finally {
      // Reset button state
      submitButton.disabled = false;
      buttonText.style.display = 'inline';
      spinner.classList.add('d-none');
    }
  }

  /**
   * Create payment intent for subscription
   */
  async createSubscriptionPaymentIntent(data) {
    try {
      const response = await apiService.post('/payments/create-subscription-intent', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw new Error('Unable to process payment. Please try again.');
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentIntent, config) {
    try {
      // Update user state
      if (window.stateManager) {
        window.stateManager.dispatch({
          type: 'UPDATE_PROFILE',
          payload: {
            tier: config.tier,
            subscription: {
              status: 'active',
              tier: config.tier,
              billingCycle: config.billingCycle
            }
          }
        });
      }

      // Show success message
      tradersHelmet.showNotification('Subscription activated successfully!', 'success');

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = `/dashboard/${config.tier}`;
      }, 2000);

    } catch (error) {
      console.error('Post-payment processing error:', error);
      tradersHelmet.showNotification('Payment successful, but there was an issue activating your account. Please contact support.', 'warning');
    }
  }

  /**
   * Handle payment errors
   */
  handlePaymentError(error) {
    const errorElement = document.getElementById('payment-errors');
    
    let message = 'An unexpected error occurred.';
    
    if (error.type === 'card_error' || error.type === 'validation_error') {
      message = error.message;
    } else if (error.message) {
      message = error.message;
    }

    errorElement.style.display = 'block';
    errorElement.textContent = message;
    
    // Scroll to error
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    tradersHelmet.showNotification('Payment failed: ' + message, 'error');
  }

  /**
   * Validate email address
   */
  async validateEmail(email) {
    if (!THA_Utils.validation.isValidEmail(email)) return;

    try {
      const response = await apiService.get(`/auth/check-email?email=${email}`);
      
      if (response.data.exists && !response.data.verified) {
        const emailInput = document.querySelector('[name="email"]');
        emailInput.classList.add('is-invalid');
        
        let feedback = emailInput.parentElement.querySelector('.invalid-feedback');
        if (!feedback) {
          feedback = document.createElement('div');
          feedback.className = 'invalid-feedback';
          emailInput.parentElement.appendChild(feedback);
        }
        feedback.textContent = 'This email address is already registered but not verified.';
      }
    } catch (error) {
      console.error('Email validation error:', error);
    }
  }

  /**
   * Create one-time payment
   */
  async createOneTimePayment(containerId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Payment manager not initialized');
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error('Payment container not found');
    }

    // Create simple payment form
    container.innerHTML = `
      <div class="payment-form">
        <div class="payment-header">
          <h3>${options.title || 'Complete Payment'}</h3>
          <div class="amount">$${options.amount || '0.00'}</div>
        </div>

        <form id="payment-form">
          <div id="payment-element"></div>
          <div id="payment-errors" class="alert alert-danger" style="display: none;"></div>
          
          <button type="submit" id="submit-payment" class="btn btn-primary btn-lg w-100 mt-3">
            Pay $${options.amount || '0.00'}
          </button>
        </form>
      </div>
    `;

    // Initialize Stripe Elements
    this.elements = this.stripe.elements({
      appearance: this.config.appearance
    });

    const paymentElement = this.elements.create('payment');
    paymentElement.mount('#payment-element');

    // Setup form handler
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleOneTimePayment(options);
    });

    return { paymentElement };
  }

  /**
   * Handle one-time payment
   */
  async handleOneTimePayment(options) {
    const submitButton = document.getElementById('submit-payment');
    
    try {
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      // Create payment intent
      const response = await apiService.post('/payments/create-intent', {
        amount: Math.round(options.amount * 100), // Convert to cents
        currency: options.currency || 'USD',
        metadata: options.metadata || {}
      });

      const { client_secret } = response.data;

      // Confirm payment
      const { error } = await this.stripe.confirmPayment({
        elements: this.elements,
        clientSecret: client_secret,
        confirmParams: {
          return_url: options.returnUrl || `${window.location.origin}/payment/success`
        }
      });

      if (error) {
        throw error;
      }

    } catch (error) {
      this.handlePaymentError(error);
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = `Pay $${options.amount || '0.00'}`;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(newTier, billingCycle = 'monthly') {
    try {
      const response = await apiService.post('/subscriptions/upgrade', {
        tier: newTier,
        billingCycle
      });

      if (response.data.success) {
        // Update local state
        if (window.stateManager) {
          window.stateManager.dispatch({
            type: 'UPDATE_PROFILE',
            payload: {
              tier: newTier,
              subscription: response.data.subscription
            }
          });
        }

        tradersHelmet.showNotification('Subscription updated successfully!', 'success');
        return response.data;
      }
    } catch (error) {
      console.error('Subscription update failed:', error);
      tradersHelmet.showNotification('Failed to update subscription. Please try again.', 'error');
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(cancelAtPeriodEnd = true) {
    try {
      const response = await apiService.post('/subscriptions/cancel', {
        cancelAtPeriodEnd
      });

      if (response.data.success) {
        tradersHelmet.showNotification(
          cancelAtPeriodEnd 
            ? 'Subscription will be cancelled at the end of the current period.'
            : 'Subscription cancelled successfully.',
          'info'
        );
        return response.data;
      }
    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      tradersHelmet.showNotification('Failed to cancel subscription. Please contact support.', 'error');
      throw error;
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus() {
    try {
      const response = await apiService.get('/subscriptions/current');
      return response.data;
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return null;
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods() {
    try {
      const response = await apiService.get('/payments/methods');
      return response.data;
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      return [];
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(paymentMethod) {
    try {
      const response = await apiService.post('/payments/methods', paymentMethod);
      return response.data;
    } catch (error) {
      console.error('Failed to add payment method:', error);
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(methodId) {
    try {
      const response = await apiService.delete(`/payments/methods/${methodId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to remove payment method:', error);
      throw error;
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.elements) {
      this.elements.destroy();
    }
    this.paymentIntents.clear();
  }
}

// Create global payment manager instance
const paymentManager = new PaymentManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.paymentManager = paymentManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentManager;
}