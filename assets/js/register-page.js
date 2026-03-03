/**
 * register-page.js
 * Traders Helmet Academy - Registration Form Logic (CSP-Safe)
 * ------------------------------------------------------------
 * Uses self-hosted Firebase setup from firebase-auth.js
 */

import { initFirebase, FirebaseAuthService } from './firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Registration Page Script Loaded');
  const auth = initFirebase();

  if (!auth) {
    console.error('❌ Firebase initialization failed – auth not available');
    return;
  }

  class RegistrationForm {
    constructor() {
      this.form = document.getElementById('registrationForm');
      this.submitBtn = document.getElementById('submitBtn');
      this.successMsg = document.getElementById('successMessage');
      this.errorMsg = document.getElementById('globalError');
      this.setupEventListeners();
      this.setupPasswordToggles();
      this.setupPasswordStrength();
    }

    setupEventListeners() {
      this.form.addEventListener('submit', this.handleSubmit.bind(this));
      document
        .getElementById('googleSignup')
        .addEventListener('click', this.handleGoogleSignup.bind(this));

      // Real-time validation
      const inputs = this.form.querySelectorAll('.form-input');
      inputs.forEach(input => {
        input.addEventListener('blur', () => this.validateField(input));
        input.addEventListener('input', () => this.clearFieldError(input));
      });
    }

    setupPasswordToggles() {
      const toggles = document.querySelectorAll('.password-toggle');
      toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
          const input = toggle.previousElementSibling;
          const icon = toggle.querySelector('i');

          if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
          } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
          }
        });
      });
    }

    setupPasswordStrength() {
      const passwordInput = document.getElementById('password');
      const strengthIndicator = document.getElementById('passwordStrength');

      passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = this.calculatePasswordStrength(password);
        strengthIndicator.className = 'password-strength';
        if (password.length > 0) strengthIndicator.classList.add(strength);
      });
    }

    calculatePasswordStrength(password) {
      let score = 0;
      if (password.length >= 8) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
      if (score < 3) return 'weak';
      if (score < 5) return 'medium';
      return 'strong';
    }

    validateField(input) {
      const value = input.value.trim();
      const name = input.name;
      let message = '';

      switch (name) {
        case 'firstName':
        case 'lastName':
          if (!value) message = 'This field is required';
          else if (value.length < 2) message = 'Must be at least 2 characters';
          break;
        case 'email':
          if (!value) message = 'Email is required';
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            message = 'Enter a valid email';
          break;
        case 'password':
          if (!value) message = 'Password is required';
          else if (value.length < 6)
            message = 'Password must be at least 6 characters';
          break;
        case 'confirmPassword':
          const password = document.getElementById('password').value;
          if (value !== password) message = 'Passwords do not match';
          break;
      }

      this.showFieldError(input, message);
      return message === '';
    }

    showFieldError(input, message) {
      const errorElement = document.getElementById(input.name + 'Error');
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.toggle('show', !!message);
      }
      input.style.borderColor = message ? 'var(--error)' : '';
    }

    clearFieldError(input) {
      const errorElement = document.getElementById(input.name + 'Error');
      if (errorElement) errorElement.classList.remove('show');
      input.style.borderColor = '';
    }

    showSuccess(message) {
      this.successMsg.classList.add('show');
      document.getElementById('successText').textContent = message;
      this.form.style.display = 'none';
    }

    showGlobalError(message) {
      this.errorMsg.classList.add('show');
      document.getElementById('globalErrorText').textContent = message;
    }

    hideGlobalError() {
      this.errorMsg.classList.remove('show');
    }

    async handleSubmit(e) {
      e.preventDefault();
      this.hideGlobalError();

      // Validate required inputs
      const requiredInputs = this.form.querySelectorAll(
        '.form-input[required]'
      );
      let isValid = true;
      requiredInputs.forEach(input => {
        if (!this.validateField(input)) isValid = false;
      });

      const agreeTerms = document.getElementById('agreeTerms');
      if (!agreeTerms.checked) {
        this.showGlobalError(
          'Please agree to the Terms of Service and Privacy Policy'
        );
        return;
      }

      if (!isValid) {
        this.showGlobalError('Please fix the highlighted errors');
        return;
      }

      this.setLoading(true);

      try {
        const data = Object.fromEntries(new FormData(this.form).entries());
        const displayName = `${data.firstName} ${data.lastName}`.trim();

        const userCredential = await FirebaseAuthService.register(
          auth,
          data.email,
          data.password,
          displayName
        );

        this.showSuccess(
          `Registration successful! A verification email has been sent to ${data.email}.`
        );
        console.log('✅ Registered user:', userCredential.user.uid);

        setTimeout(() => {
          window.location.href = `/pages/auth/verify-email.html?email=${encodeURIComponent(
            data.email
          )}`;
        }, 3000);
      } catch (error) {
        console.error('❌ Registration Error:', error);
        this.showGlobalError(error.message || 'Registration failed.');
      } finally {
        this.setLoading(false);
      }
    }

    async handleGoogleSignup() {
      try {
        this.hideGlobalError();
        const result = await FirebaseAuthService.signInWithGoogle(auth);
        const user = result.user;
        console.log('✅ Google signup successful:', user.uid);
        this.showSuccess(
          `Welcome ${user.displayName}! Your account has been created successfully.`
        );
        setTimeout(() => {
          window.location.href = '/pages/dashboard/';
        }, 2000);
      } catch (error) {
        console.error('❌ Google signup error:', error);
        this.showGlobalError(error.message || 'Google signup failed.');
      }
    }

    setLoading(isLoading) {
      this.submitBtn.disabled = isLoading;
      this.submitBtn.classList.toggle('loading', isLoading);
      const text = this.submitBtn.querySelector('span');
      text.textContent = isLoading ? 'Creating Account...' : 'Create Account';
    }
  }

  new RegistrationForm();
});
