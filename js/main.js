// Modern Portfolio JavaScript - Enhanced Functionality

// DOM Elements
const scrollProgress = document.getElementById('scrollProgress');
const scrollTopBtn = document.getElementById('scrollTopBtn');
const navbar = document.querySelector('.navbar');
const navLinks = document.querySelectorAll('.nav-link');
const currentYearElement = document.getElementById('currentYear');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    updateFooterYear();
    
    // Initialize scroll progress
    initScrollProgress();
    
    // Initialize scroll top button
    initScrollTopButton();
    
    // Initialize navigation
    initNavigation();
    
    // Initialize animations
    initAnimations();
    
    // Initialize smooth scrolling
    initSmoothScrolling();
    
    // Initialize accessibility features
    initAccessibility();
});

// Update footer year
function updateFooterYear() {
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
}

// Scroll progress functionality
function initScrollProgress() {
    if (!scrollProgress) return;
    
    window.addEventListener('scroll', () => {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        scrollProgress.style.width = `${scrolled}%`;
    });
}

// Scroll top button functionality
function initScrollTopButton() {
    if (!scrollTopBtn) return;
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });
    
    // Scroll to top functionality
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Enhanced navigation with scroll spy
function initNavigation() {
    // Add active class to navigation based on scroll position
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + 100; // Offset for navbar height
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active class from all links
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
    
    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for navbar height
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Animation on scroll
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all fade-in elements
    document.querySelectorAll('.fade-in, .project-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Enhanced smooth scrolling
function initSmoothScrolling() {
    // Smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for navbar height
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Accessibility enhancements
function initAccessibility() {
    // Keyboard navigation for scroll top button
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollTopBtn.click();
            }
        });
    }
    
    // Skip link for screen readers
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only sr-only-focusable';
    skipLink.style.position = 'absolute';
    skipLink.style.left = '-9999px';
    skipLink.style.top = 'auto';
    skipLink.style.width = '1px';
    skipLink.style.height = '1px';
    skipLink.style.overflow = 'hidden';
    skipLink.style.zIndex = '9999';
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content id to first section
    const firstSection = document.querySelector('section');
    if (firstSection) {
        firstSection.id = 'main-content';
    }
}

// Utility function for smooth scrolling (for external use)
function smoothScrollTo(target, offset = 80) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
        const offsetTop = element.offsetTop - offset;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

// Clipboard copy functionality
function copyToClipboard(text, element) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'clipboard-notification';
    notification.textContent = 'Email copied to clipboard, reach out anytime! ';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        font-family: var(--font-heading);
        font-weight: 600;
        pointer-events: none;
    `;
    
    document.body.appendChild(notification);
    
    // Animate notification in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Try to use the modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(element, notification);
        }).catch(() => {
            fallbackCopyToClipboard(text, element, notification);
        });
    } else {
        // Fallback for older browsers or insecure contexts
        fallbackCopyToClipboard(text, element, notification);
    }
}

// Popup functionality
function openPopup(projectId, tabType) {
    var popupId = projectId + '-' + tabType + '-popup';
    var popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Hide navbar content, keep scroll tracker visible
        var navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.add('navbar-hidden');
        }
    }
}

function closePopup(popupId) {
    var popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.remove('active');
        document.body.style.overflow = ''; // Re-enable background scrolling
        
        // Show navbar content again
        var navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.remove('navbar-hidden');
        }
    }
}

// Close popup when clicking outside content
document.addEventListener('click', function(e) {
    var popups = document.querySelectorAll('.popup-overlay.active');
    popups.forEach(function(popup) {
        if (e.target === popup) {
            var popupId = popup.id;
            closePopup(popupId);
        }
    });
});

// Close popup on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var activePopup = document.querySelector('.popup-overlay.active');
        if (activePopup) {
            var popupId = activePopup.id;
            closePopup(popupId);
        }
    }
});

function fallbackCopyToClipboard(text, element, notification) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess(element, notification);
        } else {
            showCopyError(notification);
        }
    } catch (err) {
        showCopyError(notification);
    } finally {
        document.body.removeChild(textArea);
    }
}

function showCopySuccess(element, notification) {
    // Add success animation to the clicked element
    if (element) {
        element.style.transform = 'scale(0.95)';
        element.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        setTimeout(() => {
            if (element) {
                element.style.transform = '';
                element.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';
            }
        }, 200);
    }
    
    // Keep notification visible for a moment, then fade out
    setTimeout(() => {
        if (notification) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 1500);
}

function showCopyError(notification) {
    if (notification) {
        notification.textContent = 'Failed to copy. Please try again.';
        notification.style.background = '#dc3545';
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 1500);
    }
}

// Debounce utility function
function debounce(func, wait = 20, immediate = false) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Performance optimized scroll handler
const handleScroll = debounce(() => {
    // Update scroll progress
    if (scrollProgress) {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        scrollProgress.style.width = `${scrolled}%`;
    }
    
    // Update navigation active states
    if (navLinks.length > 0) {
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
}, 100);

// Attach optimized scroll handler
window.addEventListener('scroll', handleScroll);

// Export functions for external use
window.portfolio = {
    smoothScrollTo,
    updateFooterYear
};