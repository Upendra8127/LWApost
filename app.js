/**
 * Learn with Ashmeet - Visual English Archive Reader
 * Zero-dependency pure vanilla JavaScript (ES6+)
 */

'use strict';

// State Management
const state = {
  allPosts: [],
  filteredPosts: [],
  metadata: {},
  activeTab: 'all',
  searchQuery: '',
  sortBy: 'newest',
  dateFilter: {
    presetDays: 0,
    startDate: null,
    endDate: null,
  },
  bookmarks: new Set(),
  activePost: null,
  activeCardIndex: 0,
  theme: 'dark',
};

// DOM Elements
const elements = {
  statLastUpdated: document.getElementById('statLastUpdated'),
  statTotalPosts: document.getElementById('statTotalPosts'),
  statTotalCards: document.getElementById('statTotalCards'),
  statNewCount: document.getElementById('statNewCount'),
  statNewPill: document.getElementById('statNewPill'),
  tabNewBtn: document.getElementById('tabNewBtn'),
  tabNewCount: document.getElementById('tabNewCount'),
  tabSavedCount: document.getElementById('tabSavedCount'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  sortSelect: document.getElementById('sortSelect'),
  openDateModalBtn: document.getElementById('openDateModalBtn'),
  dateFilterBtnText: document.getElementById('dateFilterBtnText'),
  filterTabs: document.querySelectorAll('.tab-btn'),
  activeFilterBar: document.getElementById('activeFilterBar'),
  filterDescriptionText: document.getElementById('filterDescriptionText'),
  resetAllFiltersBtn: document.getElementById('resetAllFiltersBtn'),
  resultsHeading: document.getElementById('resultsHeading'),
  resultsCount: document.getElementById('resultsCount'),
  cardsGrid: document.getElementById('cardsGrid'),
  emptyState: document.getElementById('emptyState'),
  emptyResetBtn: document.getElementById('emptyResetBtn'),
  // Reader Modal
  readerModal: document.getElementById('readerModal'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  modalPostOrder: document.getElementById('modalPostOrder'),
  modalPostDate: document.getElementById('modalPostDate'),
  modalPostLikes: document.getElementById('modalPostLikes'),
  modalBookmarkBtn: document.getElementById('modalBookmarkBtn'),
  modalYtLink: document.getElementById('modalYtLink'),
  modalCardImg: document.getElementById('modalCardImg'),
  imageLoader: document.getElementById('imageLoader'),
  prevCardBtn: document.getElementById('prevCardBtn'),
  nextCardBtn: document.getElementById('nextCardBtn'),
  cardDots: document.getElementById('cardDots'),
  cardCounter: document.getElementById('cardCounter'),
  modalCaptionText: document.getElementById('modalCaptionText'),
  copyCaptionBtn: document.getElementById('copyCaptionBtn'),
  // Calendar Modal
  dateModal: document.getElementById('dateModal'),
  dateModalBackdrop: document.getElementById('dateModalBackdrop'),
  closeDateModalBtn: document.getElementById('closeDateModalBtn'),
  presetChips: document.querySelectorAll('.preset-chip'),
  startDateInput: document.getElementById('startDateInput'),
  endDateInput: document.getElementById('endDateInput'),
  clearDateFilterBtn: document.getElementById('clearDateFilterBtn'),
  applyDateFilterBtn: document.getElementById('applyDateFilterBtn'),
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadBookmarks();
  initServiceWorker();
  attachEventListeners();
  loadData();
});

// Load Bookmarks from LocalStorage
function loadBookmarks() {
  try {
    const saved = localStorage.getItem('lwa_bookmarks');
    if (saved) {
      const arr = JSON.parse(saved);
      state.bookmarks = new Set(arr);
    }
  } catch (e) {
    state.bookmarks = new Set();
  }
  updateBookmarkCount();
}

function saveBookmarks() {
  try {
    localStorage.setItem('lwa_bookmarks', JSON.stringify([...state.bookmarks]));
  } catch (e) {
    console.error('Failed to save bookmarks:', e);
  }
  updateBookmarkCount();
}

function updateBookmarkCount() {
  if (elements.tabSavedCount) {
    elements.tabSavedCount.textContent = state.bookmarks.size;
  }
}

// Theme handling
function initTheme() {
  const savedTheme = localStorage.getItem('lwa_theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    setTheme('light');
  } else {
    setTheme('dark');
  }
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lwa_theme', theme);
  elements.themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
}

function toggleTheme() {
  setTheme(state.theme === 'light' ? 'dark' : 'light');
}

// Service Worker Registration for PWA
function initServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service Worker registration skipped:', err);
    });
  }
}

// Format Utilities
function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return isoString;
  }
}

function formatDateTime(isoString) {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return isoString;
  }
}

function parseLikes(likesStr) {
  if (!likesStr) return 0;
  const s = String(likesStr).trim().toLowerCase();
  if (s.endsWith('k')) {
    return parseFloat(s.slice(0, -1)) * 1000;
  }
  if (s.endsWith('m')) {
    return parseFloat(s.slice(0, -1)) * 1000000;
  }
  return parseInt(s, 10) || 0;
}

// Fetch Master Posts JSON
async function loadData() {
  try {
    const res = await fetch('data/posts.json');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    state.metadata = data;
    state.allPosts = data.posts || [];

    // Header stats update
    elements.statLastUpdated.textContent = formatDateTime(data.lastUpdated);
    elements.statTotalPosts.textContent = data.totalPosts || state.allPosts.length;
    elements.statTotalCards.textContent = (data.totalCards || 0).toLocaleString();

    const newPostsList = state.allPosts.filter((p) => p.isNew);
    const newCount = newPostsList.length;
    elements.statNewCount.textContent = newCount;
    elements.tabNewCount.textContent = newCount;

    applyFilters();
  } catch (err) {
    console.error('Error loading posts dataset:', err);
    elements.resultsCount.textContent = 'Failed to load posts data.';
  }
}

// Filter and Sort Engine
function applyFilters() {
  let list = [...state.allPosts];

  // 1. Tab filter
  if (state.activeTab === 'new') {
    list = list.filter((p) => p.isNew);
  } else if (state.activeTab === 'bookmarked') {
    list = list.filter((p) => state.bookmarks.has(p.postId));
  } else if (state.activeTab === 'multi') {
    list = list.filter((p) => p.type === 'multi_image' && p.totalCards > 1);
  }

  // 2. Search query filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter((p) => {
      const textMatch = (p.text || '').toLowerCase().includes(q);
      const postOrderMatch = String(p.order) === q;
      return textMatch || postOrderMatch;
    });
  }

  // 3. Calendar / Date Range filter
  if (state.dateFilter.presetDays > 0) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - state.dateFilter.presetDays * 24 * 60 * 60 * 1000);
    list = list.filter((p) => {
      if (!p.publishedDateISO) return true;
      const pDate = new Date(p.publishedDateISO);
      return pDate >= cutoff;
    });
  } else if (state.dateFilter.startDate || state.dateFilter.endDate) {
    const start = state.dateFilter.startDate ? new Date(state.dateFilter.startDate) : new Date(0);
    const end = state.dateFilter.endDate
      ? new Date(state.dateFilter.endDate + 'T23:59:59')
      : new Date('2099-01-01');
    list = list.filter((p) => {
      if (!p.publishedDateISO) return true;
      const pDate = new Date(p.publishedDateISO);
      return pDate >= start && pDate <= end;
    });
  }

  // 4. Sorting
  if (state.sortBy === 'newest') {
    list.sort((a, b) => a.order - b.order);
  } else if (state.sortBy === 'oldest') {
    list.sort((a, b) => b.order - a.order);
  } else if (state.sortBy === 'likes') {
    list.sort((a, b) => parseLikes(b.likes) - parseLikes(a.likes));
  } else if (state.sortBy === 'cards') {
    list.sort((a, b) => (b.totalCards || 0) - (a.totalCards || 0));
  }

  state.filteredPosts = list;
  renderGrid();
  updateActiveFilterBar();
}

// Render Posts Grid safely (Zero innerHTML with user strings)
function renderGrid() {
  elements.cardsGrid.textContent = ''; // clear

  const total = state.filteredPosts.length;
  elements.resultsCount.textContent = `Showing ${total} of ${state.allPosts.length} posts`;

  if (total === 0) {
    elements.emptyState.style.display = 'block';
    return;
  }
  elements.emptyState.style.display = 'none';

  const fragment = document.createDocumentFragment();

  state.filteredPosts.forEach((post) => {
    const cardEl = document.createElement('article');
    cardEl.className = 'post-card';
    cardEl.setAttribute('role', 'button');
    cardEl.setAttribute('tabindex', '0');

    // Media Thumbnail Wrapper
    const mediaEl = document.createElement('div');
    mediaEl.className = 'card-media';

    const firstCard = post.cards && post.cards[0];
    const imgEl = document.createElement('img');
    imgEl.loading = 'lazy';
    imgEl.alt = `Post ${post.order} preview`;
    imgEl.src = firstCard ? firstCard.webpUrl : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%23334155"><rect width="100%" height="100%"/></svg>';

    // Image fallback handling
    if (firstCard && firstCard.fallbackUrl) {
      imgEl.addEventListener('error', () => {
        imgEl.src = firstCard.fallbackUrl;
      });
    }

    mediaEl.appendChild(imgEl);

    // Card count badge
    if (post.totalCards > 0) {
      const countBadge = document.createElement('div');
      countBadge.className = 'badge-card-count';
      countBadge.textContent = `🃏 ${post.totalCards} Cards`;
      mediaEl.appendChild(countBadge);
    }

    // New post badge
    if (post.isNew) {
      const newBadge = document.createElement('div');
      newBadge.className = 'badge-new-post';
      newBadge.textContent = '🔥 NEW';
      mediaEl.appendChild(newBadge);
    }

    // Bookmark button
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = `bookmark-icon-btn ${state.bookmarks.has(post.postId) ? 'active' : ''}`;
    bookmarkBtn.setAttribute('title', 'Bookmark this post');
    bookmarkBtn.textContent = '⭐';
    bookmarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(post.postId, bookmarkBtn);
    });
    mediaEl.appendChild(bookmarkBtn);

    cardEl.appendChild(mediaEl);

    // Card Body
    const bodyEl = document.createElement('div');
    bodyEl.className = 'card-body';

    // Meta row (Order & Date)
    const metaEl = document.createElement('div');
    metaEl.className = 'card-meta';

    const orderSpan = document.createElement('span');
    orderSpan.textContent = `Post #${post.order}`;
    metaEl.appendChild(orderSpan);

    const dateSpan = document.createElement('span');
    dateSpan.textContent = post.publishedTime || formatDate(post.publishedDateISO);
    metaEl.appendChild(dateSpan);

    bodyEl.appendChild(metaEl);

    // Title / Excerpt
    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    titleEl.textContent = post.text ? post.text.slice(0, 160) : 'Visual Study Card';
    bodyEl.appendChild(titleEl);

    // Footer (Likes & Channel link)
    const footerEl = document.createElement('div');
    footerEl.className = 'card-footer';

    const likesSpan = document.createElement('span');
    likesSpan.textContent = `❤️ ${post.likes || '0'}`;
    footerEl.appendChild(likesSpan);

    const typeSpan = document.createElement('span');
    typeSpan.textContent = post.type === 'multi_image' ? 'Carousel' : 'Graphic';
    footerEl.appendChild(typeSpan);

    bodyEl.appendChild(footerEl);
    cardEl.appendChild(bodyEl);

    // Click handler to open Reader Modal
    cardEl.addEventListener('click', () => {
      openReaderModal(post);
    });

    cardEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openReaderModal(post);
      }
    });

    fragment.appendChild(cardEl);
  });

  elements.cardsGrid.appendChild(fragment);
}

// Bookmark toggler
function toggleBookmark(postId, btnElement) {
  if (state.bookmarks.has(postId)) {
    state.bookmarks.delete(postId);
    if (btnElement) btnElement.classList.remove('active');
  } else {
    state.bookmarks.add(postId);
    if (btnElement) btnElement.classList.add('active');
  }
  saveBookmarks();

  // If viewing bookmarked tab, re-filter
  if (state.activeTab === 'bookmarked') {
    applyFilters();
  }
}

// Active Filter status bar
function updateActiveFilterBar() {
  const parts = [];

  if (state.searchQuery) {
    parts.push(`Search: "${state.searchQuery}"`);
  }
  if (state.activeTab !== 'all') {
    const tabLabels = {
      new: '🔥 New Posts',
      bookmarked: '⭐ Saved Bookmarks',
      multi: 'Carousels',
    };
    parts.push(`Filter: ${tabLabels[state.activeTab] || state.activeTab}`);
  }
  if (state.dateFilter.presetDays > 0) {
    const label = state.dateFilter.presetDays === 1 ? 'Today' : `Past ${state.dateFilter.presetDays} Days`;
    parts.push(`Date: ${label}`);
  } else if (state.dateFilter.startDate || state.dateFilter.endDate) {
    parts.push(`Date: ${state.dateFilter.startDate || 'Start'} to ${state.dateFilter.endDate || 'Now'}`);
  }

  if (parts.length > 0) {
    elements.activeFilterBar.style.display = 'flex';
    elements.filterDescriptionText.textContent = parts.join(' • ');
  } else {
    elements.activeFilterBar.style.display = 'none';
  }
}

// Reset all filters
function resetFilters() {
  state.searchQuery = '';
  elements.searchInput.value = '';
  elements.clearSearchBtn.style.display = 'none';
  state.activeTab = 'all';
  elements.filterTabs.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });
  state.dateFilter = { presetDays: 0, startDate: null, endDate: null };
  elements.dateFilterBtnText.textContent = 'Filter by Date';
  elements.presetChips.forEach((c) => c.classList.toggle('active', c.dataset.days === '0'));
  elements.startDateInput.value = '';
  elements.endDateInput.value = '';
  state.sortBy = 'newest';
  elements.sortSelect.value = 'newest';
  applyFilters();
}

// Card Reader Modal
function openReaderModal(post) {
  state.activePost = post;
  state.activeCardIndex = 0;

  elements.modalPostOrder.textContent = `Post #${post.order} (${post.type || 'post'})`;
  elements.modalPostDate.textContent = post.publishedTime || formatDate(post.publishedDateISO);
  elements.modalPostLikes.textContent = `❤️ ${post.likes || '0'}`;

  elements.modalYtLink.href = post.postUrl || '#';
  elements.modalBookmarkBtn.textContent = state.bookmarks.has(post.postId) ? '★' : '☆';
  elements.modalBookmarkBtn.style.color = state.bookmarks.has(post.postId) ? '#facc15' : 'inherit';

  elements.modalCaptionText.textContent = post.text || 'No caption available.';

  updateModalSlide();

  elements.readerModal.classList.add('active');
  elements.readerModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeReaderModal() {
  elements.readerModal.classList.remove('active');
  elements.readerModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function updateModalSlide() {
  const post = state.activePost;
  if (!post) return;

  const cards = post.cards || [];
  const total = cards.length;

  if (total === 0) {
    elements.modalCardImg.style.display = 'none';
    elements.cardCounter.textContent = 'Text Post (No cards)';
    elements.prevCardBtn.style.display = 'none';
    elements.nextCardBtn.style.display = 'none';
    elements.cardDots.textContent = '';
    return;
  }

  elements.modalCardImg.style.display = 'block';
  const currentCard = cards[state.activeCardIndex];

  elements.modalCardImg.src = currentCard.webpUrl;
  elements.modalCardImg.onerror = () => {
    if (currentCard.fallbackUrl) {
      elements.modalCardImg.src = currentCard.fallbackUrl;
    }
  };

  elements.cardCounter.textContent = `Card ${state.activeCardIndex + 1} of ${total}`;

  // Hide arrows if single card
  elements.prevCardBtn.style.display = total > 1 ? 'flex' : 'none';
  elements.nextCardBtn.style.display = total > 1 ? 'flex' : 'none';

  // Render dots
  elements.cardDots.textContent = '';
  if (total > 1) {
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className = `card-dot ${i === state.activeCardIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => {
        state.activeCardIndex = i;
        updateModalSlide();
      });
      elements.cardDots.appendChild(dot);
    }
  }
}

function nextCard() {
  if (!state.activePost || !state.activePost.cards) return;
  const total = state.activePost.cards.length;
  if (total <= 1) return;
  state.activeCardIndex = (state.activeCardIndex + 1) % total;
  updateModalSlide();
}

function prevCard() {
  if (!state.activePost || !state.activePost.cards) return;
  const total = state.activePost.cards.length;
  if (total <= 1) return;
  state.activeCardIndex = (state.activeCardIndex - 1 + total) % total;
  updateModalSlide();
}

// Calendar Date Modal
function openDateModal() {
  elements.dateModal.classList.add('active');
  elements.dateModal.setAttribute('aria-hidden', 'false');
}

function closeDateModal() {
  elements.dateModal.classList.remove('active');
  elements.dateModal.setAttribute('aria-hidden', 'true');
}

// Event Listeners
function attachEventListeners() {
  // Theme toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Search input
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    applyFilters();
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    state.searchQuery = '';
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    applyFilters();
  });

  // Sort dropdown
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    applyFilters();
  });

  // Filter tabs
  elements.filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      elements.filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeTab = tab.dataset.filter;
      applyFilters();
    });
  });

  // Click on "New Posts" pill in header triggers "New" filter tab
  if (elements.statNewPill) {
    elements.statNewPill.addEventListener('click', () => {
      elements.filterTabs.forEach((t) => {
        t.classList.toggle('active', t.dataset.filter === 'new');
      });
      state.activeTab = 'new';
      applyFilters();
    });
  }

  // Reset filter buttons
  elements.resetAllFiltersBtn.addEventListener('click', resetFilters);
  elements.emptyResetBtn.addEventListener('click', resetFilters);

  // Reader Modal controls
  elements.closeModalBtn.addEventListener('click', closeReaderModal);
  elements.modalBackdrop.addEventListener('click', closeReaderModal);
  elements.nextCardBtn.addEventListener('click', nextCard);
  elements.prevCardBtn.addEventListener('click', prevCard);

  // Copy caption button
  elements.copyCaptionBtn.addEventListener('click', async () => {
    if (state.activePost && state.activePost.text) {
      try {
        await navigator.clipboard.writeText(state.activePost.text);
        elements.copyCaptionBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          elements.copyCaptionBtn.textContent = '📋 Copy';
        }, 1800);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  });

  // Modal bookmark toggle
  elements.modalBookmarkBtn.addEventListener('click', () => {
    if (state.activePost) {
      toggleBookmark(state.activePost.postId);
      const isSaved = state.bookmarks.has(state.activePost.postId);
      elements.modalBookmarkBtn.textContent = isSaved ? '★' : '☆';
      elements.modalBookmarkBtn.style.color = isSaved ? '#facc15' : 'inherit';
    }
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (elements.readerModal.classList.contains('active')) {
      if (e.key === 'Escape') closeReaderModal();
      if (e.key === 'ArrowRight') nextCard();
      if (e.key === 'ArrowLeft') prevCard();
    } else if (elements.dateModal.classList.contains('active')) {
      if (e.key === 'Escape') closeDateModal();
    }
  });

  // Touch Swipe for mobile reader
  let touchStartX = 0;
  let touchEndX = 0;
  const imageWrapper = document.getElementById('cardImageWrapper');

  imageWrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  imageWrapper.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 50) {
      nextCard(); // swiped left
    } else if (touchEndX - touchStartX > 50) {
      prevCard(); // swiped right
    }
  }, { passive: true });

  // Date Modal
  elements.openDateModalBtn.addEventListener('click', openDateModal);
  elements.closeDateModalBtn.addEventListener('click', closeDateModal);
  elements.dateModalBackdrop.addEventListener('click', closeDateModal);

  // Preset chips
  elements.presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      elements.presetChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const days = parseInt(chip.dataset.days, 10);
      state.dateFilter.presetDays = days;
      state.dateFilter.startDate = null;
      state.dateFilter.endDate = null;
      elements.startDateInput.value = '';
      elements.endDateInput.value = '';
    });
  });

  // Apply Date Filter
  elements.applyDateFilterBtn.addEventListener('click', () => {
    const sDate = elements.startDateInput.value;
    const eDate = elements.endDateInput.value;

    if (sDate || eDate) {
      state.dateFilter.presetDays = 0;
      state.dateFilter.startDate = sDate;
      state.dateFilter.endDate = eDate;
      elements.dateFilterBtnText.textContent = `📅 ${sDate || '...'} to ${eDate || '...'}`;
    } else if (state.dateFilter.presetDays > 0) {
      elements.dateFilterBtnText.textContent = `📅 Past ${state.dateFilter.presetDays} Days`;
    } else {
      elements.dateFilterBtnText.textContent = 'Filter by Date';
    }

    closeDateModal();
    applyFilters();
  });

  // Clear Date Filter
  elements.clearDateFilterBtn.addEventListener('click', () => {
    state.dateFilter = { presetDays: 0, startDate: null, endDate: null };
    elements.presetChips.forEach((c) => c.classList.toggle('active', c.dataset.days === '0'));
    elements.startDateInput.value = '';
    elements.endDateInput.value = '';
    elements.dateFilterBtnText.textContent = 'Filter by Date';
    closeDateModal();
    applyFilters();
  });
}
