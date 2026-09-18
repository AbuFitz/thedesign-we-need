(function () {
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var menuToggle = document.getElementById('menuToggle');
  var mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    var closeMenu = function () {
      mainNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    };
    var openMenu = function () {
      mainNav.classList.add('open');
      menuToggle.setAttribute('aria-expanded', 'true');
    };

    menuToggle.addEventListener('click', function () {
      if (mainNav.classList.contains('open')) closeMenu();
      else openMenu();
    });

    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mainNav.classList.contains('open')) {
        closeMenu();
        menuToggle.focus();
      }
    });
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealTargets = document.querySelectorAll('[data-reveal]');

  if (!prefersReducedMotion && revealTargets.length && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal-ready');
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -5% 0px' }
    );
    revealTargets.forEach(function (el) { observer.observe(el); });
  }
})();
