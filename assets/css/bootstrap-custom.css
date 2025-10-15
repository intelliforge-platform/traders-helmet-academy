
/* ========================================
   TRADERS HELMET ACADEMY - CUSTOM BOOTSTRAP INTEGRATION
   Custom Bootstrap overrides and extensions
   ======================================== */

/* Import Bootstrap (add this link to your HTML head) */
/* <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" rel="stylesheet"> */

/* Bootstrap Variable Overrides */
:root {
  /* Override Bootstrap primary colors with our brand colors */
  --bs-primary: var(--primary-blue);
  --bs-primary-rgb: 42, 82, 152;
  --bs-secondary: var(--primary-cream);
  --bs-secondary-rgb: 247, 243, 233;
  
  /* Override success, warning, danger, info to match our design */
  --bs-success: var(--success);
  --bs-warning: var(--warning);
  --bs-danger: var(--danger);
  --bs-info: var(--info);
  
  /* Override border radius */
  --bs-border-radius: var(--radius-lg);
  --bs-border-radius-sm: var(--radius-sm);
  --bs-border-radius-lg: var(--radius-xl);
  --bs-border-radius-xl: var(--radius-2xl);
  
  /* Override shadows */
  --bs-box-shadow: var(--shadow-md);
  --bs-box-shadow-sm: var(--shadow-sm);
  --bs-box-shadow-lg: var(--shadow-lg);
  
  /* Override fonts */
  --bs-font-sans-serif: var(--font-family-primary);
  --bs-body-font-family: var(--font-family-primary);
  
  /* Override spacing (Bootstrap uses rem, we use our variables) */
  --bs-gutter-x: var(--spacing-xl);
  --bs-gutter-y: var(--spacing-md);
}

/* Custom Bootstrap Button Overrides */
.btn {
  position: relative;
  overflow: hidden;
  transition: all var(--transition-normal);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-lg);
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left var(--transition-slow);
}

.btn:hover::before {
  left: 100%;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Tier-specific button styles */
.btn-gold {
  background: var(--gradient-gold);
  border: none;
  color: var(--dark-gray);
}

.btn-gold:hover, .btn-gold:focus {
  background: linear-gradient(135deg, #e6c200 0%, #f0d74a 100%);
  color: var(--dark-gray);
  box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
}

.btn-platinum {
  background: var(--gradient-platinum);
  border: none;
  color: var(--dark-gray);
}

.btn-platinum:hover, .btn-platinum:focus {
  background: linear-gradient(135deg, #d3d3d3 0%, #b8b8b8 100%);
  color: var(--dark-gray);
  box-shadow: 0 8px 25px rgba(229, 228, 226, 0.3);
}

.btn-diamond {
  background: var(--gradient-diamond);
  border: none;
  color: var(--dark-gray);
}

.btn-diamond:hover, .btn-diamond:focus {
  background: linear-gradient(135deg, #a7edff 0%, #42a1fc 100%);
  color: var(--dark-gray);
  box-shadow: 0 8px 25px rgba(185, 242, 255, 0.3);
}

.btn-admin {
  background: var(--gradient-admin);
  border: none;
  color: var(--white);
}

.btn-admin:hover, .btn-admin:focus {
  background: linear-gradient(135deg, #ff5555 0%, #ff4444 100%);
  color: var(--white);
  box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);
}

/* Custom Bootstrap Card Overrides */
.card {
  border: none;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
  overflow: hidden;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.card-header {
  background: var(--light-gray);
  border-bottom: 1px solid rgba(0,0,0,0.1);
  font-weight: var(--font-weight-semibold);
}

.card-footer {
  background: var(--light-gray);
  border-top: 1px solid rgba(0,0,0,0.1);
}

/* Tier-specific card styles */
.card-gold {
  border-left: 4px solid var(--gold-primary);
}

.card-gold .card-header {
  background: linear-gradient(90deg, var(--gold-primary), var(--gold-secondary));
  color: var(--dark-gray);
}

.card-platinum {
  border-left: 4px solid var(--platinum-primary);
}

.card-platinum .card-header {
  background: linear-gradient(90deg, var(--platinum-primary), var(--platinum-secondary));
  color: var(--dark-gray);
}

.card-diamond {
  border-left: 4px solid var(--diamond-primary);
}

.card-diamond .card-header {
  background: linear-gradient(90deg, var(--diamond-primary), var(--diamond-secondary));
  color: var(--dark-gray);
}

.card-admin {
  border-left: 4px solid var(--admin-primary);
}

.card-admin .card-header {
  background: linear-gradient(90deg, var(--admin-primary), var(--admin-secondary));
  color: var(--white);
}

/* Custom Bootstrap Form Overrides */
.form-control {
  border-radius: var(--radius-lg);
  border: 2px solid #e0e0e0;
  transition: all var(--transition-normal);
  padding: var(--spacing-md) var(--spacing-lg);
}

.form-control:focus {
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 0.2rem rgba(42, 82, 152, 0.25);
  transform: translateY(-2px);
}

.form-select {
  border-radius: var(--radius-lg);
  border: 2px solid #e0e0e0;
  transition: all var(--transition-normal);
}

.form-select:focus {
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 0.2rem rgba(42, 82, 152, 0.25);
}

/* Custom form validation styles */
.was-validated .form-control:valid,
.form-control.is-valid {
  border-color: var(--success);
  background-image: none;
}

.was-validated .form-control:invalid,
.form-control.is-invalid {
  border-color: var(--danger);
  background-image: none;
}

/* Custom Bootstrap Modal Overrides */
.modal-content {
  border: none;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  backdrop-filter: blur(10px);
}

.modal-header {
  border-bottom: 1px solid rgba(0,0,0,0.1);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

.modal-footer {
  border-top: 1px solid rgba(0,0,0,0.1);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}

.modal-backdrop {
  backdrop-filter: blur(5px);
}

/* Custom Bootstrap Alert Overrides */
.alert {
  border: none;
  border-radius: var(--radius-lg);
  border-left: 4px solid;
}

.alert-primary {
  background: rgba(42, 82, 152, 0.1);
  border-left-color: var(--primary-blue);
  color: var(--primary-blue);
}

.alert-success {
  background: rgba(40, 167, 69, 0.1);
  border-left-color: var(--success);
  color: var(--success);
}

.alert-warning {
  background: rgba(255, 193, 7, 0.1);
  border-left-color: var(--warning);
  color: #856404;
}

.alert-danger {
  background: rgba(220, 53, 69, 0.1);
  border-left-color: var(--danger);
  color: var(--danger);
}

.alert-info {
  background: rgba(23, 162, 184, 0.1);
  border-left-color: var(--info);
  color: var(--info);
}

/* Custom Bootstrap Badge Overrides */
.badge {
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  padding: 0.35em 0.65em;
}

.badge.bg-gold {
  background: var(--gradient-gold) !important;
  color: var(--dark-gray);
}

.badge.bg-platinum {
  background: var(--gradient-platinum) !important;
  color: var(--dark-gray);
}

.badge.bg-diamond {
  background: var(--gradient-diamond) !important;
  color: var(--dark-gray);
}

.badge.bg-admin {
  background: var(--gradient-admin) !important;
  color: var(--white);
}

/* Custom Bootstrap Navbar Overrides */
.navbar {
  backdrop-filter: blur(10px);
  transition: all var(--transition-normal);
}

.navbar-brand {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xl);
}

.nav-link {
  transition: all var(--transition-normal);
  border-radius: var(--radius-md);
  margin: 0 0.25rem;
}

.nav-link:hover {
  background: rgba(42, 82, 152, 0.1);
  transform: translateY(-1px);
}

/* Custom Bootstrap Dropdown Overrides */
.dropdown-menu {
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.dropdown-item {
  transition: all var(--transition-fast);
  border-radius: var(--radius-sm);
  margin: 0.25rem;
  padding: 0.5rem 1rem;
}

.dropdown-item:hover {
  background: var(--primary-blue);
  color: var(--white);
  transform: translateX(4px);
}

/* Custom Bootstrap Progress Overrides */
.progress {
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  transition: width 0.6s ease;
}

.progress-bar.bg-gold {
  background: var(--gradient-gold) !important;
}

.progress-bar.bg-platinum {
  background: var(--gradient-platinum) !important;
}

.progress-bar.bg-diamond {
  background: var(--gradient-diamond) !important;
}

/* Custom Bootstrap Table Overrides */
.table {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table thead th {
  background: var(--light-gray);
  border: none;
  font-weight: var(--font-weight-semibold);
  color: var(--dark-gray);
}

.table tbody tr {
  transition: background-color var(--transition-fast);
}

.table tbody tr:hover {
  background: rgba(42, 82, 152, 0.05);
}

/* Custom Bootstrap Pagination Overrides */
.pagination .page-link {
  border: none;
  border-radius: var(--radius-md);
  margin: 0 0.25rem;
  transition: all var(--transition-normal);
}

.pagination .page-link:hover {
  background: var(--primary-blue);
  color: var(--white);
  transform: translateY(-1px);
}

.pagination .page-item.active .page-link {
  background: var(--gradient-primary);
  border: none;
}

/* Custom Bootstrap Accordion Overrides */
.accordion-button {
  border-radius: var(--radius-lg);
  transition: all var(--transition-normal);
}

.accordion-button:not(.collapsed) {
  background: var(--primary-blue);
  color: var(--white);
}

.accordion-button:focus {
  box-shadow: 0 0 0 0.2rem rgba(42, 82, 152, 0.25);
}

.accordion-item {
  border: none;
  margin-bottom: var(--spacing-sm);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

/* Custom Bootstrap Carousel Overrides */
.carousel-control-prev,
.carousel-control-next {
  width: 3rem;
  background: rgba(42, 82, 152, 0.8);
  border-radius: var(--radius-full);
  margin: auto 1rem;
  height: 3rem;
  top: 0;
  bottom: 0;
}

.carousel-indicators [data-bs-target] {
  border-radius: var(--radius-full);
  width: 12px;
  height: 12px;
  background: var(--primary-blue);
}

/* Custom responsive utilities */
@media (max-width: 576px) {
  .btn-responsive {
    width: 100%;
    margin-bottom: var(--spacing-sm);
  }
  
  .card-responsive {
    margin-bottom: var(--spacing-md);
  }
  
  .table-responsive-custom {
    font-size: var(--font-size-sm);
  }
}

/* Custom Bootstrap Offcanvas Overrides */
.offcanvas {
  border: none;
  backdrop-filter: blur(10px);
}

.offcanvas-header {
  border-bottom: 1px solid rgba(0,0,0,0.1);
}

.offcanvas-body {
  padding: var(--spacing-lg);
}

/* Loading spinners with brand colors */
.spinner-border.text-gold {
  color: var(--gold-primary) !important;
}

.spinner-border.text-platinum {
  color: var(--platinum-primary) !important;
}

.spinner-border.text-diamond {
  color: var(--diamond-primary) !important;
}

.spinner-border.text-admin {
  color: var(--admin-primary) !important;
}

/* Custom toast notifications */
.toast {
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(10px);
}

.toast-header {
  background: var(--light-gray);
  border-bottom: 1px solid rgba(0,0,0,0.1);
}

/* Utility classes for tier colors */
.text-gold { color: var(--gold-primary) !important; }
.text-platinum { color: var(--platinum-primary) !important; }
.text-diamond { color: var(--diamond-primary) !important; }
.text-admin { color: var(--admin-primary) !important; }

.bg-gold { background: var(--gradient-gold) !important; }
.bg-platinum { background: var(--gradient-platinum) !important; }
.bg-diamond { background: var(--gradient-diamond) !important; }
.bg-admin { background: var(--gradient-admin) !important; }

.border-gold { border-color: var(--gold-primary) !important; }
.border-platinum { border-color: var(--platinum-primary) !important; }
.border-diamond { border-color: var(--diamond-primary) !important; }
.border-admin { border-color: var(--admin-primary) !important; }

/* Custom layout utilities */
.vh-90 { height: 90vh !important; }
.vh-80 { height: 80vh !important; }
.vh-70 { height: 70vh !important; }

.max-vh-100 { max-height: 100vh !important; }
.max-vh-90 { max-height: 90vh !important; }
.max-vh-80 { max-height: 80vh !important; }

/* Custom shadow utilities */
.shadow-custom { box-shadow: var(--shadow-md) !important; }
.shadow-custom-lg { box-shadow: var(--shadow-lg) !important; }
.shadow-custom-xl { box-shadow: var(--shadow-xl) !important; }

/* Custom animation utilities */
.hover-lift {
  transition: transform var(--transition-normal);
}

.hover-lift:hover {
  transform: translateY(-2px);
}

.hover-scale {
  transition: transform var(--transition-normal);
}

.hover-scale:hover {
  transform: scale(1.05);
}

/* Dark mode support (if implemented later) */
@media (prefers-color-scheme: dark) {
  .card {
    background: var(--dark-gray);
    color: var(--white);
  }
  
  .form-control {
    background: var(--dark-gray);
    border-color: #555;
    color: var(--white);
  }
  
  .table {
    --bs-table-bg: var(--dark-gray);
    --bs-table-color: var(--white);
  }
}