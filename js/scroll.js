// Enhanced Scroll Utilities - Performance Optimized

/**
 * Lightweight scroll utilities for the modern portfolio
 * This file contains performance-optimized scroll functions
 * that complement the main.js functionality
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        throttleDelay: 16, // ~60fps
        intersectionThreshold: 0.15,
        animationDuration: 600
    };

    // Throttle utility function
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // Debounce utility function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Enhanced scroll to element with better performance
    function scrollToElement(element, offset = 0, duration = 800) {
        if (!element) return;

        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        const startTime = performance.now();
        const startPosition = window.pageYOffset;

        function animation(currentTime) {
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            // Easing function: easeInOutQuad
            const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            
            window.scrollTo({
                top: startPosition + (offsetPosition - startPosition) * easeInOutQuad(progress),
                behavior: 'smooth'
            });

            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            }
        }

        requestAnimationFrame(animation);
    }

    // Intersection Observer for performance-optimized animations
    function initIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers
            document.querySelectorAll('.fade-in, .project-card').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // Stop observing once animated
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: config.intersectionThreshold,
            rootMargin: '0px 0px -100px 0px'
        });

        document.querySelectorAll('.fade-in, .project-card').forEach(el => {
            observer.observe(el);
        });
    }

    // Performance-optimized scroll progress
    function initScrollProgress() {
        const scrollProgress = document.querySelector('.scroll-progress');
        if (!scrollProgress) return;

        const updateProgress = throttle(() => {
            const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            scrollProgress.style.width = `${Math.min(scrolled, 100)}%`;
        }, config.throttleDelay);

        window.addEventListener('scroll', updateProgress);
    }

    // Lazy loading for images and videos
    function initLazyLoading() {
        if (!('IntersectionObserver' in window)) return;

        const lazyMedia = document.querySelectorAll('img[loading="lazy"], video[loading="lazy"]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const media = entry.target;
                    if (media.tagName === 'IMG') {
                        media.src = media.dataset.src;
                    } else if (media.tagName === 'VIDEO') {
                        media.src = media.dataset.src;
                        media.load();
                    }
                    media.removeAttribute('loading');
                    observer.unobserve(media);
                }
            });
        });

        lazyMedia.forEach(media => observer.observe(media));
    }

    // Sticky navigation enhancement
    function initStickyNav() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        let lastScrollTop = 0;
        let navbarVisible = true;

        const handleScroll = throttle(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down
                if (navbarVisible) {
                    navbar.style.transform = 'translateY(-100%)';
                    navbarVisible = false;
                }
            } else {
                // Scrolling up
                if (!navbarVisible) {
                    navbar.style.transform = 'translateY(0)';
                    navbarVisible = true;
                }
            }
            lastScrollTop = scrollTop;
        }, config.throttleDelay);

        window.addEventListener('scroll', handleScroll);
    }

    // Initialize all scroll utilities
    function init() {
        // Initialize intersection observer for animations
        initIntersectionObserver();
        
        // Initialize scroll progress
        initScrollProgress();
        
        // Initialize lazy loading
        initLazyLoading();
        
        // Initialize sticky navigation
        initStickyNav();
    }

    // Expose public methods
    window.scrollUtils = {
        scrollToElement,
        throttle,
        debounce,
        initIntersectionObserver,
        initScrollProgress,
        initLazyLoading,
        initStickyNav
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();