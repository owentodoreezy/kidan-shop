/* ============================================
   SCROLL POSITION RESTORE (Back button)
   Each page keeps its own slot, so leaving the
   coming-soon page can't overwrite the saved
   position of the home page.
   ============================================ */

(function () {
    const SCROLL_KEY = 'kidan-scroll:' + location.pathname;

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
    }

    // Save this page's position when leaving it (click on a card, profile, etc.)
    window.addEventListener('pagehide', () => {
        try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch (e) {}
    });

    // Restore when coming back (works for bfcache and full reload via Back)
    window.addEventListener('pageshow', () => {
        let saved = null;
        try { saved = sessionStorage.getItem(SCROLL_KEY); } catch (e) {}
        if (saved === null) return;

        const y = parseInt(saved, 10);
        try { sessionStorage.removeItem(SCROLL_KEY); } catch (e) {}
        if (!y) return;

        // Jump instantly — smooth scroll here would crawl from the top
        const html = document.documentElement;
        const prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, y);

        // Re-apply after layout settles (images/fonts shift the page height)
        requestAnimationFrame(() => {
            window.scrollTo(0, y);
            html.style.scrollBehavior = prev;
        });
    });
})();

/* ============================================
   LENIS SMOOTH SCROLL
   ============================================ */

function initializeLenisSmoothScroll() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const LenisConstructor = window.Lenis;

    window.kidanLenisStatus = {
        loaded: false,
        reducedMotion: reduceMotion.matches,
        reason: null
    };

    if (typeof LenisConstructor !== 'function') {
        window.kidanLenisStatus.reason = 'Lenis script was not loaded before script.js';
        console.warn('Lenis was not loaded. Check src/lenis.min.js and the script tag before script.js.');
        return;
    }

    window.kidanLenis?.destroy?.();
    window.kidanLenis = new LenisConstructor({
        autoRaf: true,
        anchors: { offset: -90 },
        lerp: 0.085,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.05,
        stopInertiaOnNavigate: true,
        prevent: (node) => Boolean(node.closest?.('.listing-dialog, .support-panel'))
    });

    document.documentElement.classList.add('kidan-lenis-ready');
    window.kidanLenisStatus.loaded = true;
    window.kidanLenisStatus.reason = 'initialized';

    reduceMotion.addEventListener('change', () => {
        if (reduceMotion.matches) {
            window.kidanLenis?.destroy();
            window.kidanLenis = null;
            document.documentElement.classList.remove('kidan-lenis-ready');
        }
    });
}

function kidanScrollTo(target, options = {}) {
    if (window.kidanLenis) {
        window.kidanLenis.scrollTo(target, {
            offset: options.offset ?? 0,
            duration: options.duration ?? 1.15
        });
        return;
    }

    if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: 'smooth' });
        return;
    }

    if (target instanceof Element) {
        target.scrollIntoView({ behavior: 'smooth', block: options.block || 'start' });
    }
}

window.kidanScrollTo = kidanScrollTo;

/* ============================================
   INTERSECTION OBSERVER FOR SCROLL ANIMATIONS
   ============================================ */

// Initialize Intersection Observer for fade-in animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observerCallback = (entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            // Stop observing once animated
            observer.unobserve(entry.target);
        }
    });
};

const observer = new IntersectionObserver(observerCallback, observerOptions);

// Observe all category cards on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeLenisSmoothScroll();

    const cards = document.querySelectorAll('.category-card');
    cards.forEach((card) => {
        observer.observe(card);
    });

    // Initialize filter functionality
    initializeFilters();
    initializeListingModal();
    initializeSupportChat();
    initializeMarketplaceStats();
    initializeThemeToggle();
    initializeWishlist();
    initializeCategoryChips();
    initializeItemSort();
    initializeBackToTop();
    initializeNewsletter();
    initializeSearchTypewriter();

    // Add smooth scroll behavior for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.style.scrollBehavior = 'auto';
    }
});

/* ============================================
   DARK THEME TOGGLE (shared across all pages)
   ============================================ */

function initializeThemeToggle() {
    const root = document.documentElement;

    function store(value) {
        try { localStorage.setItem('kidan-theme', value); } catch (e) {}
    }

    // Works for any element marked as a theme toggle on any page
    document.querySelectorAll('#theme-toggle, [data-theme-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const isDark = root.getAttribute('data-theme') === 'dark';
            if (isDark) {
                root.removeAttribute('data-theme');
                store('light');
            } else {
                root.setAttribute('data-theme', 'dark');
                store('dark');
            }
        });
    });
}

/* ============================================
   FILTER FUNCTIONALITY
   ============================================ */

function initializeFilters() {
    // Old filter button system (if exists)
    const filterBtns = document.querySelectorAll('.filter-btn');
    const allCards = document.querySelectorAll('.category-card');

    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            // Update active button state
            filterBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');

            // Get filter value
            const filterValue = btn.getAttribute('data-filter');

            // Animate filter transition
            allCards.forEach((card) => {
                const cardFilters = card.getAttribute('data-filter').split(' ');

                if (filterValue === 'all' || cardFilters.includes(filterValue)) {
                    card.style.opacity = '1';
                    card.style.pointerEvents = 'auto';
                    card.style.visibility = 'visible';
                } else {
                    card.style.opacity = '0.3';
                    card.style.pointerEvents = 'none';
                    card.style.visibility = 'hidden';
                }
            });
        });
    });

    // Set initial filter (show all)
    const allFilter = document.querySelector('[data-filter="all"]');
    if (allFilter) {
        allFilter.classList.add('active');
    }

    // Condition filter (All / New / Used / Sale) — filters brands AND items
    const qbtns = document.querySelectorAll('.qbtn');
    qbtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            qbtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            kidanFilterState.cond = btn.getAttribute('data-q') || 'all';
            applyKidanFilters();
        });
    });
}

/* ============================================
   COMBINED FILTER STATE (condition + category)
   ============================================ */

const kidanFilterState = { cond: 'all', cat: 'all' };

function applyKidanFilters() {
    const { cond, cat } = kidanFilterState;

    // Brand cards filter by condition only
    document.querySelectorAll('.brand-card-link').forEach((link) => {
        const card = link.querySelector('.category-card');
        const filters = (card?.getAttribute('data-filter') || 'all').split(' ');
        link.style.display = (cond === 'all' || filters.includes(cond)) ? '' : 'none';
    });

    // Item cards filter by condition AND category
    let visible = 0;
    document.querySelectorAll('.item-card').forEach((card) => {
        const okCond = cond === 'all'
            || (cond === 'sale' ? card.dataset.sale === 'true' : card.dataset.cond === cond);
        const okCat = cat === 'all' || card.dataset.cat === cat;
        const show = okCond && okCat;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });

    const empty = document.getElementById('featuredEmpty');
    if (empty) empty.hidden = visible > 0;
}

function initializeCategoryChips() {
    const chips = document.querySelectorAll('.chip[data-cat]');
    if (!chips.length) return;
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            chips.forEach((c) => c.classList.remove('active'));
            chip.classList.add('active');
            kidanFilterState.cat = chip.dataset.cat;
            applyKidanFilters();
            const featuredSection = document.querySelector('.featured-section');
            if (featuredSection) kidanScrollTo(featuredSection, { offset: -90 });
        });
    });
}

/* ============================================
   PERSISTENT WISHLIST (localStorage)
   ============================================ */

function getWishlist() {
    try { return JSON.parse(localStorage.getItem('kidan-wishlist') || '[]'); }
    catch (e) { return []; }
}

function updateWishlistUI(list) {
    document.querySelectorAll('.nav-badge').forEach((b) => {
        b.textContent = list.length;
        b.classList.toggle('has-items', list.length > 0);
    });
    document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
        el.textContent = list.length;
    });
}

function initializeWishlist() {
    updateWishlistUI(getWishlist());

    document.querySelectorAll('.item-like').forEach((btn) => {
        const key = btn.closest('.item-card')?.querySelector('.item-name')?.textContent.trim();
        if (!key) return;

        const liked = getWishlist().includes(key);
        btn.textContent = liked ? '♥' : '♡';
        btn.classList.toggle('liked', liked);

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            let list = getWishlist();
            const wasLiked = list.includes(key);
            list = wasLiked ? list.filter((n) => n !== key) : [...list, key];
            try { localStorage.setItem('kidan-wishlist', JSON.stringify(list)); } catch (err) {}

            btn.textContent = wasLiked ? '♡' : '♥';
            btn.classList.toggle('liked', !wasLiked);
            btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');

            updateWishlistUI(list);
            showGlobalToast(wasLiked ? 'Removed from wishlist' : 'Added to wishlist ♥');
        });
    });
}

/* ============================================
   PRICE SORT (featured items)
   ============================================ */

function initializeItemSort() {
    const grid = document.querySelector('.featured-grid');
    const btns = document.querySelectorAll('[data-sort]');
    if (!grid || !btns.length) return;

    btns.forEach((btn) => {
        btn.addEventListener('click', () => {
            btns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const dir = btn.dataset.sort === 'asc' ? 1 : -1;
            Array.from(grid.querySelectorAll('.item-card'))
                .sort((a, b) => dir * (Number(a.dataset.price) - Number(b.dataset.price)))
                .forEach((card) => grid.appendChild(card));
        });
    });
}

/* ============================================
   BACK TO TOP
   ============================================ */

function initializeBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener('click', () => {
        kidanScrollTo(0);
    });
}

/* ============================================
   NEWSLETTER
   ============================================ */

function initializeNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        form.reset();
        showGlobalToast('You are subscribed! First digest this Friday.');
    });
}

/* ============================================
   CARD INTERACTION FEEDBACK
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.category-card');

    cards.forEach((card) => {
        // Touch feedback for mobile
        card.addEventListener('touchstart', () => {
            card.style.opacity = '0.8';
        });

        card.addEventListener('touchend', () => {
            card.style.opacity = '1';
        });

        // Optional: Add click feedback
        card.addEventListener('click', (e) => {
            // Placeholder - no routing needed as per requirements
            console.log('Category clicked:', card.querySelector('.brand-name').textContent);
        });
    });
});

/* ============================================
   FILTER BUTTON KEYBOARD NAVIGATION
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach((btn, index) => {
        btn.addEventListener('keydown', (e) => {
            let targetBtn = null;

            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                targetBtn = filterBtns[index - 1] || filterBtns[filterBtns.length - 1];
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                targetBtn = filterBtns[index + 1] || filterBtns[0];
            }

            if (targetBtn) {
                targetBtn.focus();
                targetBtn.click();
            }
        });
    });
});

/* ============================================
   SMOOTH SCROLL BEHAVIOR
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        document.documentElement.style.scrollBehavior = 'smooth';
    }

    // Respect changes to motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        if (e.matches) {
            document.documentElement.style.scrollBehavior = 'auto';
        } else {
            document.documentElement.style.scrollBehavior = 'smooth';
        }
    });
});

/* ============================================
   CATEGORY CARD LOADING ANIMATION
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.category-card');

    // Stagger card animations on initial load
    cards.forEach((card, index) => {
        const delay = index * 50;
        card.style.animationDelay = delay + 'ms';
    });
});

/* ============================================
   CTA LINK INTERACTIONS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const ctaLink = document.querySelector('.cta-link');

    if (ctaLink) {
        ctaLink.addEventListener('mouseenter', () => {
            const arrow = ctaLink.querySelector('.arrow');
            if (arrow) {
                arrow.style.transform = 'translateX(6px)';
            }
        });

        ctaLink.addEventListener('mouseleave', () => {
            const arrow = ctaLink.querySelector('.arrow');
            if (arrow) {
                arrow.style.transform = 'translateX(0)';
            }
        });

        // Touch support
        ctaLink.addEventListener('touchstart', () => {
            ctaLink.style.opacity = '0.9';
        });

        ctaLink.addEventListener('touchend', () => {
            ctaLink.style.opacity = '1';
        });
    }
});

/* ============================================
   STICKY NAVIGATION SHADOW ON SCROLL
   ============================================ */

window.addEventListener('scroll', () => {
    const nav = document.querySelector('.filter-bar');
    if (nav) {
        if (window.scrollY > 10) {
            nav.style.boxShadow = '0 4px 24px rgba(139, 92, 246, 0.1)';
        } else {
            nav.style.boxShadow = 'none';
        }
    }
});

/* ============================================
   PRICE RANGE SLIDER FUNCTIONALITY
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const minSlider = document.getElementById('price-min');
    const maxSlider = document.getElementById('price-max');
    const minLabel = document.getElementById('price-min-label');
    const maxLabel = document.getElementById('price-max-label');
    const rangeFill = document.getElementById('range-fill');

    function updateRange() {
        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);

        // Constraint: max must be at least 500 more than min
        if (minVal > maxVal - 500) {
            minSlider.value = maxVal - 500;
            minVal = maxVal - 500;
        }

        if (maxVal < minVal + 500) {
            maxSlider.value = minVal + 500;
            maxVal = minVal + 500;
        }

        // Update labels with USD formatting
        minLabel.textContent = '$' + minVal.toLocaleString('en-US');
        maxLabel.textContent = '$' + maxVal.toLocaleString('en-US');

        // Update range fill visual
        const minPercent = (minVal / 15000) * 100;
        const maxPercent = (maxVal / 15000) * 100;
        rangeFill.style.left = minPercent + '%';
        rangeFill.style.right = (100 - maxPercent) + '%';
    }

    if (minSlider && maxSlider) {
        minSlider.addEventListener('input', updateRange);
        maxSlider.addEventListener('input', updateRange);

        // Set initial range fill
        updateRange();
    }
});

/* ============================================
   SORT BUTTON FUNCTIONALITY
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const sortBtns = document.querySelectorAll('.sort-btn');

    sortBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            sortBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const sortType = btn.id;
            console.log('Sort type:', sortType);
        });
    });
});

/* ============================================
   PERFORMANCE OPTIMIZATIONS
   ============================================ */

// Debounce function for resize events
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

// Handle window resize with debounce
window.addEventListener('resize', debounce(() => {
    // Add resize handling if needed
}, 250));

/* ============================================
   ACCESSIBILITY ENHANCEMENTS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Ensure all interactive elements are accessible
    const interactiveElements = document.querySelectorAll('.filter-btn, .category-card, .cta-link');

    interactiveElements.forEach((el) => {
        // Add tabindex if not already present
        if (!el.hasAttribute('tabindex')) {
            el.setAttribute('tabindex', '0');
        }

        // Handle Enter key for elements that aren't native buttons
        if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        }
    });
});

/* ============================================
   PAGE ANALYTICS (Optional)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Track category interactions (no external analytics)
    const cards = document.querySelectorAll('.category-card');

    cards.forEach((card) => {
        card.addEventListener('click', () => {
            const brandName = card.querySelector('.brand-name')?.textContent;
            const itemCount = card.querySelector('.item-badge')?.textContent;

            // Log interaction for debugging
            if (window.location.hostname === 'localhost') {
                console.log({
                    event: 'category_clicked',
                    brand: brandName,
                    items: itemCount,
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
});

/* ============================================
   FILTER BAR STICKY BEHAVIOR
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const filterBar = document.querySelector('.filter-bar');

    if (filterBar) {
        // Add shadow when scrolled
        window.addEventListener('scroll', debounce(() => {
            if (window.scrollY > 0) {
                filterBar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            } else {
                filterBar.style.boxShadow = 'none';
            }
        }, 50));
    }
});

/* ============================================
   LISTING MODAL
   ============================================ */

function initializeListingModal() {
    const modal = document.getElementById('listingModal');
    if (!modal) return;

    const form = document.getElementById('listingForm');
    const photoInput = form?.querySelector('input[name="photos"]');
    const photoPreview = modal.querySelector('[data-photo-preview]');
    const photoCount = modal.querySelector('[data-photo-count]');
    const openers = document.querySelectorAll('[data-open-listing]');
    const closers = document.querySelectorAll('[data-close-listing]');

    function openModal(event) {
        if (event) event.preventDefault();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        // Autofocus only with a mouse — on touch devices it pops the keyboard
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            modal.querySelector('input, select, textarea')?.focus();
        }
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }

    openers.forEach((opener) => opener.addEventListener('click', openModal));
    closers.forEach((closer) => closer.addEventListener('click', closeModal));

    photoInput?.addEventListener('change', () => {
        renderPhotoPreviews(photoInput.files, photoPreview);
        updatePhotoCount(photoInput.files, photoCount);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const title = formData.get('title') || 'Your item';
        saveListingToStats({
            title: String(title),
            brand: String(formData.get('brand') || '').trim()
        });
        form.reset();
        renderPhotoPreviews([], photoPreview);
        updatePhotoCount([], photoCount);
        closeModal();
        showGlobalToast(`Listing "${title}" was created.`);
    });
}

function updatePhotoCount(files, countRoot) {
    if (!countRoot) return;

    const count = Array.from(files || []).length;
    countRoot.textContent = count === 1 ? '1 photo selected' : `${count} photos selected`;
    if (count === 0) countRoot.textContent = 'No photos selected';
}

function renderPhotoPreviews(files, previewRoot) {
    if (!previewRoot) return;

    previewRoot.innerHTML = '';
    const selectedFiles = Array.from(files || []);

    if (!selectedFiles.length) {
        const empty = document.createElement('div');
        empty.className = 'photo-preview-empty';
        empty.textContent = 'Selected photos will appear here';
        previewRoot.appendChild(empty);
        return;
    }

    selectedFiles.forEach((file) => {
        const card = document.createElement('div');
        card.className = 'photo-preview-card';

        const image = document.createElement('img');
        image.alt = file.name || 'Listing photo preview';
        image.src = URL.createObjectURL(file);
        image.addEventListener('load', () => URL.revokeObjectURL(image.src), { once: true });

        card.appendChild(image);
        previewRoot.appendChild(card);
    });
}

function getMarketplaceStats() {
    const fallback = { items: 0, sales: 0, brands: 0, brandNames: [] };

    try {
        return { ...fallback, ...JSON.parse(localStorage.getItem('kidanMarketplaceStats') || '{}') };
    } catch (error) {
        return fallback;
    }
}

function setMarketplaceStats(stats) {
    localStorage.setItem('kidanMarketplaceStats', JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent('kidan:stats-updated', { detail: stats }));
}

function initializeMarketplaceStats() {
    updateMarketplaceStatsUI(getMarketplaceStats());

    window.addEventListener('kidan:stats-updated', (event) => {
        updateMarketplaceStatsUI(event.detail || getMarketplaceStats());
    });

    window.addEventListener('storage', (event) => {
        if (event.key === 'kidanMarketplaceStats') {
            updateMarketplaceStatsUI(getMarketplaceStats());
        }
    });
}

function updateMarketplaceStatsUI(stats) {
    document.querySelectorAll('[data-stat="items"]').forEach((el) => {
        el.textContent = String(stats.items || 0);
    });
    document.querySelectorAll('[data-stat="sales"]').forEach((el) => {
        el.textContent = String(stats.sales || 0);
    });
    document.querySelectorAll('[data-stat="brands"]').forEach((el) => {
        el.textContent = String(stats.brands || 0);
    });
}

function saveListingToStats(listing) {
    const stats = getMarketplaceStats();
    const brandNames = Array.isArray(stats.brandNames) ? stats.brandNames : [];
    const normalizedBrand = listing.brand.toLowerCase();

    if (normalizedBrand && !brandNames.includes(normalizedBrand)) {
        brandNames.push(normalizedBrand);
    }

    setMarketplaceStats({
        items: (Number(stats.items) || 0) + 1,
        sales: Number(stats.sales) || 0,
        brands: brandNames.length,
        brandNames
    });
}

function showGlobalToast(message) {
    const profileToast = document.getElementById('toast');
    const profileMsg = document.getElementById('toast-msg');

    if (profileToast && profileMsg) {
        profileMsg.textContent = message;
        profileToast.classList.add('show');
        setTimeout(() => profileToast.classList.remove('show'), 2800);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'global-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

/* ============================================
   SUPPORT CHAT
   ============================================ */

function initializeSupportChat() {
    const widget = document.getElementById('supportWidget');
    if (!widget) return;

    const panel = widget.querySelector('.support-panel');
    const openers = document.querySelectorAll('[data-open-support]');
    const closeBtn = widget.querySelector('[data-close-support]');
    const form = document.getElementById('supportForm');
    const input = document.getElementById('supportInput');
    const messages = document.getElementById('supportMessages');

    function openChat(event) {
        if (event) event.preventDefault();
        widget.classList.add('is-open');
        panel?.setAttribute('aria-hidden', 'false');
        // Autofocus only with a mouse — on touch devices it pops the keyboard
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            input?.focus();
        }
    }

    function closeChat() {
        widget.classList.remove('is-open');
        panel?.setAttribute('aria-hidden', 'true');
    }

    function toggleChat(event) {
        if (event) event.preventDefault();
        if (widget.classList.contains('is-open')) {
            closeChat();
        } else {
            openChat(event);
        }
    }

    openers.forEach((opener) => opener.addEventListener('click', toggleChat));
    closeBtn?.addEventListener('click', closeChat);

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        const userMessage = document.createElement('p');
        userMessage.className = 'support-message support-user';
        userMessage.textContent = text;
        messages.appendChild(userMessage);
        input.value = '';

        setTimeout(() => {
            const reply = document.createElement('p');
            reply.className = 'support-message support-agent';
            reply.textContent = 'Thanks! Our support team will get back to you shortly.';
            messages.appendChild(reply);
            messages.scrollTop = messages.scrollHeight;
        }, 500);

        messages.scrollTop = messages.scrollHeight;
    });
}

/* ============================================
   SEARCH PLACEHOLDER TYPEWRITER
   ============================================ */

function initializeSearchTypewriter() {
    const inputs = [
        document.querySelector('.search-input'),
        document.getElementById('brand-search')
    ].filter(Boolean);
    if (!inputs.length) return;

    const phrases = [
        'Nike Air Max 90',
        'Supreme Box Logo hoodie',
        'Carhartt Detroit jacket',
        'Adidas Ultraboost',
        'Vans Old Skool',
        'Stone Island sweatshirt',
        'Levi\'s 501 vintage'
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function applyText(text) {
        inputs.forEach((input) => { input.placeholder = text; });
    }

    function tick() {
        const phrase = phrases[phraseIndex];
        let delay;

        if (!deleting) {
            charIndex++;
            applyText(phrase.slice(0, charIndex));
            if (charIndex === phrase.length) {
                deleting = true;
                delay = 900; // hold the finished phrase
            } else {
                delay = 38; // typing speed
            }
        } else {
            charIndex--;
            applyText(phrase.slice(0, charIndex));
            if (charIndex === 0) {
                deleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                delay = 200; // small pause before the next phrase
            } else {
                delay = 18; // erasing speed
            }
        }

        setTimeout(tick, delay);
    }

    tick();
}
