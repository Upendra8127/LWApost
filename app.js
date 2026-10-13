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
  // Tinder / Bumble Magic Swipe Deck State
  viewMode: 'grid', // 'grid' | 'swipe'
  swipeDeck: [],
  swipeDeckIndex: 0,
  swipeSubCardIndex: 0,
  swipeHistory: [],
  soundEnabled: true,
};

// Cryptographic Randomness Generator (Tier-1 Standard)
function getCryptoRandom() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
}

function cryptoShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(getCryptoRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pure Web Audio API Synthesizer (Zero runtime audio files / npm dependencies)
class DeckSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playSwoosh() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }

  playChime() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.05;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch (e) {}
  }

  playPop() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }
}

const sounds = new DeckSoundEngine();

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
  searchBtn: document.getElementById('searchBtn'),
  emptyResetBtn: document.getElementById('emptyResetBtn'),
  controlsWrapper: document.querySelector('.controls-wrapper'),
  gridMainContainer: document.getElementById('gridMainContainer'),
  // Navigation & Mode Switching
  viewHomeBtn: document.getElementById('viewHomeBtn'),
  viewSwipeBtn: document.getElementById('viewSwipeBtn'),
  gridLaunchSwipeBtn: document.getElementById('gridLaunchSwipeBtn'),
  // Magic Swipe Deck Elements
  swipeModeSection: document.getElementById('swipeModeSection'),
  magicExitBtn: document.getElementById('magicExitBtn'),
  deckHomeBtn: document.getElementById('deckHomeBtn'),
  deckCounterText: document.getElementById('deckCounterText'),
  soundToggleBtn: document.getElementById('soundToggleBtn'),
  soundIcon: document.getElementById('soundIcon'),
  deckHelpBtn: document.getElementById('deckHelpBtn'),
  deckSearchToggleBtn: document.getElementById('deckSearchToggleBtn'),
  deckSearchBar: document.getElementById('deckSearchBar'),
  deckSearchInput: document.getElementById('deckSearchInput'),
  deckSearchSubmitBtn: document.getElementById('deckSearchSubmitBtn'),
  deckSearchCloseBtn: document.getElementById('deckSearchCloseBtn'),
  cardStack: document.getElementById('cardStack'),
  stampLike: document.getElementById('stampLike'),
  stampPass: document.getElementById('stampPass'),
  stampNotes: document.getElementById('stampNotes'),
  deckCompleted: document.getElementById('deckCompleted'),
  deckRestartBtn: document.getElementById('deckRestartBtn'),
  deckViewSavedBtn: document.getElementById('deckViewSavedBtn'),
  deckBackHomeBtn: document.getElementById('deckBackHomeBtn'),
  // Dock Action Buttons
  dockUndoBtn: document.getElementById('dockUndoBtn'),
  dockPassBtn: document.getElementById('dockPassBtn'),
  dockShuffleBtn: document.getElementById('dockShuffleBtn'),
  dockLikeBtn: document.getElementById('dockLikeBtn'),
  dockNotesBtn: document.getElementById('dockNotesBtn'),
  // Lesson Notes Drawer
  deckNotesDrawer: document.getElementById('deckNotesDrawer'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  drawerPostOrder: document.getElementById('drawerPostOrder'),
  drawerPostHeading: document.getElementById('drawerPostHeading'),
  drawerPostText: document.getElementById('drawerPostText'),
  drawerPostLikes: document.getElementById('drawerPostLikes'),
  drawerPostDate: document.getElementById('drawerPostDate'),
  drawerYtLink: document.getElementById('drawerYtLink'),
  drawerCopyBtn: document.getElementById('drawerCopyBtn'),
  drawerCloseBtn: document.getElementById('drawerCloseBtn'),
  // Help Modal
  deckHelpModal: document.getElementById('deckHelpModal'),
  deckHelpBackdrop: document.getElementById('deckHelpBackdrop'),
  closeDeckHelpBtn: document.getElementById('closeDeckHelpBtn'),
  gotItHelpBtn: document.getElementById('gotItHelpBtn'),
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

// Service Worker Registration for PWA with Instant Auto-Update
function initServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then((registration) => {
      // Check for updates on startup
      registration.update().catch(() => {});

      // When a new service worker is waiting, activate immediately
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    }).catch((err) => {
      console.warn('Service Worker registration skipped:', err);
    });

    // Seamlessly reload when new service worker activates
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Also check for updates whenever user returns to the app tab/PWA
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) reg.update().catch(() => {});
        });
      }
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

  // 2. High-precision Multi-token and Post Order Search
  if (state.searchQuery) {
    const raw = state.searchQuery.trim().toLowerCase();
    const explicitOrderMatch = raw.match(/^(?:post\s*#?|#)\s*(\d+)$/i) || (/^\d+$/.test(raw) ? [null, raw] : null);
    const explicitOrder = explicitOrderMatch ? parseInt(explicitOrderMatch[1], 10) : null;

    if (explicitOrder !== null) {
      list = list.filter((p) => p.order === explicitOrder);
    } else {
      // Multi-keyword tokenized search across text, hashtags, dates, and card file topics
      const tokens = raw.split(/\s+/).filter((t) => t.length > 0);

      list = list.filter((p) => {
        const text = (p.text || '').toLowerCase();
        const time = (p.publishedTime || '').toLowerCase();
        const type = (p.type || '').toLowerCase();
        const cardKeywords = (p.cards || [])
          .map((c) => (c.webpUrl || '').replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase())
          .join(' ');
        const searchableCorpus = `${text} ${time} ${type} post #${p.order} ${cardKeywords}`;

        return tokens.every((token) => searchableCorpus.includes(token));
      });
    }
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
  const totalCardsCount = state.filteredPosts.reduce((acc, p) => acc + (p.totalCards || (p.cards ? p.cards.length : 1)), 0);
  elements.resultsCount.textContent = `Showing ${total} of ${state.allPosts.length} posts (${totalCardsCount.toLocaleString()} cards)`;

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

    const swipeBtn = document.createElement('button');
    swipeBtn.className = 'grid-card-swipe-btn';
    swipeBtn.textContent = '✨ Swipe';
    swipeBtn.title = 'Open this post in Magic Swipe Mode';
    swipeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postIdx = state.filteredPosts.indexOf(post);
      switchViewMode('swipe');
      initSwipeDeck(postIdx >= 0 ? postIdx : 0);
    });
    footerEl.appendChild(swipeBtn);

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

// ==========================================================================
// Tinder / Bumble Magic Swipe Deck Engine
// ==========================================================================

function switchViewMode(mode) {
  state.viewMode = mode;
  if (mode === 'swipe') {
    if (elements.gridMainContainer) elements.gridMainContainer.style.display = 'none';
    if (elements.controlsWrapper) elements.controlsWrapper.style.display = 'none';
    if (elements.swipeModeSection) elements.swipeModeSection.style.display = 'flex';
    if (elements.viewHomeBtn) elements.viewHomeBtn.classList.remove('active');
    if (elements.viewSwipeBtn) elements.viewSwipeBtn.classList.add('active');
    initSwipeDeck();
  } else {
    if (elements.swipeModeSection) elements.swipeModeSection.style.display = 'none';
    if (elements.gridMainContainer) elements.gridMainContainer.style.display = 'block';
    if (elements.controlsWrapper) elements.controlsWrapper.style.display = 'block';
    if (elements.viewHomeBtn) elements.viewHomeBtn.classList.add('active');
    if (elements.viewSwipeBtn) elements.viewSwipeBtn.classList.remove('active');
  }
}

// Helper to flatten posts into a continuous sequence of learning cards
function buildDeckCards(posts) {
  const list = [];
  posts.forEach((post) => {
    const postCards = post.cards && post.cards.length > 0
      ? post.cards
      : [{ cardIndex: 1, webpUrl: '', fallbackUrl: '' }];
    postCards.forEach((c, idx) => {
      list.push({
        post,
        cardIndex: idx,
        card: c,
        totalCards: postCards.length,
      });
    });
  });
  return list;
}

function initSwipeDeck(startPostIndex = 0) {
  const source = state.searchQuery || state.activeTab !== 'all' || state.dateFilter.presetDays > 0 || state.dateFilter.startDate
    ? state.filteredPosts
    : (state.filteredPosts.length > 0 ? state.filteredPosts : state.allPosts);

  state.deckCards = buildDeckCards(source);
  state.swipeHistory = [];

  if (startPostIndex > 0 && source[startPostIndex]) {
    const targetOrderId = source[startPostIndex].order;
    const matchIdx = state.deckCards.findIndex((item) => item.post.order === targetOrderId);
    state.currentCardIndex = matchIdx >= 0 ? matchIdx : 0;
  } else {
    state.currentCardIndex = 0;
  }

  renderDeckStack();
}

function renderDeckStack() {
  if (!elements.cardStack) return;
  elements.cardStack.textContent = ''; // safe clear

  const total = (state.deckCards || []).length;
  if (total === 0) {
    if (elements.deckCompleted) {
      elements.deckCompleted.style.display = 'flex';
      const heading = elements.deckCompleted.querySelector('h2');
      if (heading) heading.textContent = state.searchQuery ? 'No matching cards' : 'All Caught Up!';
      const p = elements.deckCompleted.querySelector('p');
      if (p) p.textContent = state.searchQuery ? `No cards found matching "${state.searchQuery}".` : 'You have reviewed all the cards in this deck.';
    }
    return;
  }

  if (elements.deckCompleted) elements.deckCompleted.style.display = 'none';

  // Continuous modulo wrap
  state.currentCardIndex = ((state.currentCardIndex % total) + total) % total;

  const currentIdx = state.currentCardIndex;

  // Stack 3 cards in DOM (Top = 0, Next = 1, Third = 2)
  const stackItems = [
    state.deckCards[currentIdx],
    state.deckCards[(currentIdx + 1) % total],
    state.deckCards[(currentIdx + 2) % total],
  ];

  // Append reverse so top card is on top
  for (let i = stackItems.length - 1; i >= 0; i--) {
    const item = stackItems[i];
    const isTop = i === 0;
    const cardEl = createSwipeCardElement(item, isTop, i);
    elements.cardStack.appendChild(cardEl);

    if (isTop) {
      bindCardDragPhysics(cardEl, item);
    }
  }
}

function createStarSvgIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'currentColor');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z');
  svg.appendChild(path);
  return svg;
}

function createInfoSvgIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10');
  const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l1.setAttribute('x1', '12'); l1.setAttribute('y1', '16'); l1.setAttribute('x2', '12'); l1.setAttribute('y2', '12');
  const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l2.setAttribute('x1', '12'); l2.setAttribute('y1', '8'); l2.setAttribute('x2', '12.01'); l2.setAttribute('y2', '8');
  svg.appendChild(circle); svg.appendChild(l1); svg.appendChild(l2);
  return svg;
}

function createSwipeCardElement(item, isTop, depthIndex) {
  const cardEl = document.createElement('div');
  cardEl.className = `swipe-card ${isTop ? 'is-top' : depthIndex === 1 ? 'is-next' : 'is-third'}`;
  cardEl.dataset.postId = item.post.postId;
  cardEl.dataset.cardIndex = item.cardIndex;

  // Story Indicator Progress Bars (Instagram / Tinder style)
  if (item.totalCards > 1) {
    const storyBars = document.createElement('div');
    storyBars.className = 'story-bars';
    for (let c = 0; c < item.totalCards; c++) {
      const bar = document.createElement('div');
      bar.className = `story-bar ${c === item.cardIndex ? 'active' : ''}`;
      storyBars.appendChild(bar);
    }
    cardEl.appendChild(storyBars);
  }

  // Minimal Header Overlay with sleek indicative icons (ZERO text words)
  const headerOverlay = document.createElement('div');
  headerOverlay.className = 'card-header-overlay';

  // Notes drawer trigger icon
  const noteBtn = document.createElement('button');
  noteBtn.className = 'card-note-btn';
  noteBtn.appendChild(createInfoSvgIcon());
  noteBtn.title = 'View lesson notes';
  noteBtn.setAttribute('aria-label', 'Lesson Notes');
  noteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDeckNotes(item.post);
  });
  headerOverlay.appendChild(noteBtn);

  // Bookmark Star icon
  const starBtn = document.createElement('button');
  starBtn.className = `card-star-btn ${state.bookmarks.has(item.post.postId) ? 'active' : ''}`;
  starBtn.appendChild(createStarSvgIcon());
  starBtn.title = 'Bookmark post';
  starBtn.setAttribute('aria-label', 'Bookmark');
  starBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleBookmark(item.post.postId);
    starBtn.classList.toggle('active', state.bookmarks.has(item.post.postId));
    sounds.playChime();
  });
  headerOverlay.appendChild(starBtn);
  cardEl.appendChild(headerOverlay);

  // Pure Visual Card Image (100% visible, zero obscuring text)
  const imageBox = document.createElement('div');
  imageBox.className = 'card-image-box';

  const img = document.createElement('img');
  img.src = item.card.webpUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%23334155"><rect width="100%" height="100%"/></svg>';
  img.alt = `Card visual`;
  img.loading = isTop ? 'eager' : 'lazy';
  if (item.card.fallbackUrl) {
    img.onerror = () => { img.src = item.card.fallbackUrl; };
  }
  imageBox.appendChild(img);
  cardEl.appendChild(imageBox);

  return cardEl;
}

// True Tinder / Bumble Gesture Physics with Pointer & Touch Detection for PWA
function bindCardDragPhysics(cardEl, item) {
  let isDragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  // 1. Pointer Events (Desktop mouse & supported touch)
  const onPointerDown = (e) => {
    if (e.target.closest('button')) return;
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    currentX = startX;
    currentY = startY;

    try { cardEl.setPointerCapture(e.pointerId); } catch (err) {}
    cardEl.style.transition = 'none';
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    currentX = e.clientX;
    currentY = e.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (!hasMoved && Math.hypot(deltaX, deltaY) > 6) {
      hasMoved = true;
      cardEl.classList.add('is-dragging');
    }

    if (hasMoved) {
      const rotation = deltaX * 0.08;
      cardEl.style.transform = `translate3d(${deltaX}px, ${deltaY * 0.45}px, 0) rotate(${rotation}deg)`;

      if (elements.stampLike && elements.stampPass) {
        if (deltaX > 20) {
          const progress = Math.min(1, (deltaX - 20) / 60);
          elements.stampLike.style.opacity = progress;
          elements.stampLike.style.transform = `scale(${0.85 + progress * 0.22}) rotate(-10deg)`;
          elements.stampPass.style.opacity = 0;
          elements.stampPass.style.transform = 'scale(0.85) rotate(10deg)';
        } else if (deltaX < -20) {
          const progress = Math.min(1, (-deltaX - 20) / 60);
          elements.stampPass.style.opacity = progress;
          elements.stampPass.style.transform = `scale(${0.85 + progress * 0.22}) rotate(10deg)`;
          elements.stampLike.style.opacity = 0;
          elements.stampLike.style.transform = 'scale(0.85) rotate(-10deg)';
        } else {
          elements.stampLike.style.opacity = 0;
          elements.stampLike.style.transform = 'scale(0.85) rotate(-10deg)';
          elements.stampPass.style.opacity = 0;
          elements.stampPass.style.transform = 'scale(0.85) rotate(10deg)';
        }
      }
    }
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    cardEl.classList.remove('is-dragging');

    try { cardEl.releasePointerCapture(e.pointerId); } catch (err) {}
    if (elements.stampLike) {
      elements.stampLike.style.opacity = 0;
      elements.stampLike.style.transform = 'scale(0.85) rotate(-10deg)';
    }
    if (elements.stampPass) {
      elements.stampPass.style.opacity = 0;
      elements.stampPass.style.transform = 'scale(0.85) rotate(10deg)';
    }

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (!hasMoved || Math.hypot(deltaX, deltaY) < 8) {
      // Tap detection (clean, zero blue highlight)
      const rect = cardEl.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      if (tapX > rect.width * 0.5) {
        goToNextCardInDeck('next');
      } else {
        goToPrevCardInDeck();
      }
      return;
    }

    if (deltaX > 70) {
      swipeFlyAndAdvance('like', cardEl, deltaX, deltaY);
    } else if (deltaX < -70) {
      swipeFlyAndAdvance('pass', cardEl, deltaX, deltaY);
    } else if (deltaY < -90 && Math.abs(deltaX) < 55) {
      openDeckNotes(item.post);
      cardEl.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    } else {
      cardEl.style.transition = 'transform 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    }
  };

  cardEl.addEventListener('pointerdown', onPointerDown);
  cardEl.addEventListener('pointermove', onPointerMove);
  cardEl.addEventListener('pointerup', onPointerUp);
  cardEl.addEventListener('pointercancel', onPointerUp);

  // 2. Direct Touch Events with preventDefault for mobile PWA standalone mode
  const onTouchStart = (e) => {
    if (e.target.closest('button')) return;
    if (e.touches.length !== 1) return;
    isDragging = true;
    hasMoved = false;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    currentY = startY;
    cardEl.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    if (e.touches.length !== 1) return;
    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (!hasMoved && Math.hypot(deltaX, deltaY) > 6) {
      hasMoved = true;
      cardEl.classList.add('is-dragging');
    }

    if (hasMoved) {
      // PREVENT SCROLL IN MOBILE PWA!
      if (e.cancelable) e.preventDefault();
      const rotation = deltaX * 0.08;
      cardEl.style.transform = `translate3d(${deltaX}px, ${deltaY * 0.45}px, 0) rotate(${rotation}deg)`;

      if (elements.stampLike && elements.stampPass) {
        if (deltaX > 20) {
          const progress = Math.min(1, (deltaX - 20) / 60);
          elements.stampLike.style.opacity = progress;
          elements.stampLike.style.transform = `scale(${0.85 + progress * 0.22}) rotate(-10deg)`;
          elements.stampPass.style.opacity = 0;
          elements.stampPass.style.transform = 'scale(0.85) rotate(10deg)';
        } else if (deltaX < -20) {
          const progress = Math.min(1, (-deltaX - 20) / 60);
          elements.stampPass.style.opacity = progress;
          elements.stampPass.style.transform = `scale(${0.85 + progress * 0.22}) rotate(10deg)`;
          elements.stampLike.style.opacity = 0;
          elements.stampLike.style.transform = 'scale(0.85) rotate(-10deg)';
        } else {
          elements.stampLike.style.opacity = 0;
          elements.stampLike.style.transform = 'scale(0.85) rotate(-10deg)';
          elements.stampPass.style.opacity = 0;
          elements.stampPass.style.transform = 'scale(0.85) rotate(10deg)';
        }
      }
    }
  };

  const onTouchEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    cardEl.classList.remove('is-dragging');
    if (elements.stampLike) {
      elements.stampLike.style.opacity = 0;
      elements.stampLike.style.transform = 'scale(0.85) rotate(-10deg)';
    }
    if (elements.stampPass) {
      elements.stampPass.style.opacity = 0;
      elements.stampPass.style.transform = 'scale(0.85) rotate(10deg)';
    }

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (!hasMoved || Math.hypot(deltaX, deltaY) < 8) {
      const rect = cardEl.getBoundingClientRect();
      const tapX = (e.changedTouches?.[0]?.clientX || currentX) - rect.left;
      if (tapX > rect.width * 0.5) {
        goToNextCardInDeck('next');
      } else {
        goToPrevCardInDeck();
      }
      return;
    }

    if (deltaX > 70) {
      swipeFlyAndAdvance('like', cardEl, deltaX, deltaY);
    } else if (deltaX < -70) {
      swipeFlyAndAdvance('pass', cardEl, deltaX, deltaY);
    } else if (deltaY < -90 && Math.abs(deltaX) < 55) {
      openDeckNotes(item.post);
      cardEl.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    } else {
      cardEl.style.transition = 'transform 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    }
  };

  cardEl.addEventListener('touchstart', onTouchStart, { passive: true });
  cardEl.addEventListener('touchmove', onTouchMove, { passive: false });
  cardEl.addEventListener('touchend', onTouchEnd, { passive: true });
  cardEl.addEventListener('touchcancel', onTouchEnd, { passive: true });
}

// Advances strictly to the NEXT CARD of the current post (and only moves to next post when cards finish)
function goToNextCardInDeck(action = 'next') {
  const total = (state.deckCards || []).length;
  if (total === 0) return;

  const currentItem = state.deckCards[state.currentCardIndex];

  // Record history for Undo
  state.swipeHistory.push(state.currentCardIndex);

  if (action === 'like') {
    state.bookmarks.add(currentItem.post.postId);
    saveBookmarks();
    sounds.playChime();
  } else if (action === 'pass') {
    sounds.playSwoosh();
  } else {
    sounds.playPop();
  }

  // Advance to next card in sequence!
  state.currentCardIndex = (state.currentCardIndex + 1) % total;
  renderDeckStack();
}

// Go to previous card cleanly
function goToPrevCardInDeck() {
  const total = (state.deckCards || []).length;
  if (total === 0) return;

  sounds.playPop();

  if (state.swipeHistory.length > 0) {
    state.currentCardIndex = state.swipeHistory.pop();
  } else {
    state.currentCardIndex = (state.currentCardIndex - 1 + total) % total;
  }
  renderDeckStack();
}

// Smooth Fly-away Animation for Like/Pass
function swipeFlyAndAdvance(action, cardEl, deltaX = 0, deltaY = 0) {
  if (action === 'like') {
    if (elements.stampLike) {
      elements.stampLike.style.opacity = 1;
      elements.stampLike.style.transform = 'scale(1.08) rotate(-10deg)';
      setTimeout(() => {
        if (elements.stampLike) {
          elements.stampLike.style.opacity = 0;
          elements.stampLike.style.transform = 'scale(0.85) rotate(-10deg)';
        }
      }, 180);
    }
  } else if (action === 'pass') {
    if (elements.stampPass) {
      elements.stampPass.style.opacity = 1;
      elements.stampPass.style.transform = 'scale(1.08) rotate(10deg)';
      setTimeout(() => {
        if (elements.stampPass) {
          elements.stampPass.style.opacity = 0;
          elements.stampPass.style.transform = 'scale(0.85) rotate(10deg)';
        }
      }, 180);
    }
  }

  if (cardEl) {
    cardEl.style.transition = 'transform 0.24s ease-out, opacity 0.24s ease-out';
    const targetX = deltaX >= 0 ? 1100 : -1100;
    cardEl.style.transform = `translate3d(${targetX}px, ${deltaY || 0}px, 0) rotate(${deltaX >= 0 ? 32 : -32}deg)`;
    cardEl.style.opacity = '0';
  }

  setTimeout(() => {
    goToNextCardInDeck(action);
  }, 150);
}

function swipeCardAction(action, cardEl = null, deltaX = 0, deltaY = 0) {
  if (cardEl) {
    swipeFlyAndAdvance(action, cardEl, deltaX, deltaY);
  } else {
    const topCard = elements.cardStack?.querySelector('.swipe-card.is-top');
    if (topCard) {
      swipeFlyAndAdvance(action, topCard, action === 'like' ? 200 : -200, 0);
    } else {
      goToNextCardInDeck(action);
    }
  }
}

function undoSwipe() {
  goToPrevCardInDeck();
}

function shuffleDeck() {
  state.deckCards = cryptoShuffle(state.deckCards);
  state.currentCardIndex = 0;
  sounds.playPop();
  renderDeckStack();
}

function updateTopCardSubSlide(post) {
  const topCard = elements.cardStack?.querySelector('.swipe-card.is-top');
  if (!topCard) return;

  const cards = post.cards || [];
  const currentCard = cards[state.swipeSubCardIndex];
  const img = topCard.querySelector('.card-image-box img');
  if (img && currentCard) {
    img.src = currentCard.webpUrl;
  }

  const bars = topCard.querySelectorAll('.story-bar');
  bars.forEach((bar, idx) => {
    bar.classList.toggle('active', idx === state.swipeSubCardIndex);
  });
}

// Notes Drawer & Modals
function openDeckNotes(post = null) {
  const currentItem = state.deckCards ? state.deckCards[state.currentCardIndex] : null;
  const targetPost = post || (currentItem ? currentItem.post : null) || (state.swipeDeck ? state.swipeDeck[state.swipeDeckIndex] : null);
  if (!targetPost) return;

  if (elements.drawerPostOrder) elements.drawerPostOrder.textContent = `Post #${targetPost.order}`;
  if (elements.drawerPostText) elements.drawerPostText.textContent = targetPost.text || 'No lesson context or caption for this post.';
  if (elements.drawerPostLikes) elements.drawerPostLikes.textContent = `❤️ ${targetPost.likes || '0'} likes`;
  if (elements.drawerPostDate) elements.drawerPostDate.textContent = targetPost.publishedTime || formatDate(targetPost.publishedDateISO);
  if (elements.drawerYtLink) elements.drawerYtLink.href = targetPost.postUrl || '#';

  if (elements.deckNotesDrawer) {
    elements.deckNotesDrawer.classList.add('active');
    elements.deckNotesDrawer.setAttribute('aria-hidden', 'false');
  }
}

function closeDeckNotes() {
  if (elements.deckNotesDrawer) {
    elements.deckNotesDrawer.classList.remove('active');
    elements.deckNotesDrawer.setAttribute('aria-hidden', 'true');
  }
}

function openDeckHelp() {
  if (elements.deckHelpModal) {
    elements.deckHelpModal.classList.add('active');
    elements.deckHelpModal.setAttribute('aria-hidden', 'false');
  }
}

function closeDeckHelp() {
  if (elements.deckHelpModal) {
    elements.deckHelpModal.classList.remove('active');
    elements.deckHelpModal.setAttribute('aria-hidden', 'true');
  }
}

function toggleSound() {
  sounds.enabled = !sounds.enabled;
  state.soundEnabled = sounds.enabled;
  if (elements.soundIcon) {
    elements.soundIcon.textContent = sounds.enabled ? '🔊' : '🔇';
  }
  if (sounds.enabled) sounds.playPop();
}

// ==========================================================================
// Event Listeners
// ==========================================================================
function attachEventListeners() {
  // View Mode Switcher
  if (elements.viewHomeBtn) {
    elements.viewHomeBtn.addEventListener('click', () => switchViewMode('grid'));
  }
  if (elements.viewSwipeBtn) {
    elements.viewSwipeBtn.addEventListener('click', () => switchViewMode('swipe'));
  }
  if (elements.gridLaunchSwipeBtn) {
    elements.gridLaunchSwipeBtn.addEventListener('click', () => switchViewMode('swipe'));
  }

  // Deck Top Bar Controls
  if (elements.magicExitBtn) {
    elements.magicExitBtn.addEventListener('click', () => switchViewMode('grid'));
  }
  if (elements.deckHomeBtn) {
    elements.deckHomeBtn.addEventListener('click', () => switchViewMode('grid'));
  }
  if (elements.soundToggleBtn) {
    elements.soundToggleBtn.addEventListener('click', toggleSound);
  }
  if (elements.deckHelpBtn) {
    elements.deckHelpBtn.addEventListener('click', openDeckHelp);
  }
  if (elements.closeDeckHelpBtn) {
    elements.closeDeckHelpBtn.addEventListener('click', closeDeckHelp);
  }
  if (elements.deckHelpBackdrop) {
    elements.deckHelpBackdrop.addEventListener('click', closeDeckHelp);
  }
  if (elements.gotItHelpBtn) {
    elements.gotItHelpBtn.addEventListener('click', closeDeckHelp);
  }

  // Search Engine Helper
  const executeSearch = (overrideQuery) => {
    if (overrideQuery !== undefined) {
      state.searchQuery = overrideQuery.trim();
    } else {
      state.searchQuery = (elements.searchInput ? elements.searchInput.value : '').trim();
    }
    if (elements.searchInput) elements.searchInput.value = state.searchQuery;
    if (elements.deckSearchInput) elements.deckSearchInput.value = state.searchQuery;
    if (elements.clearSearchBtn) {
      elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    }
    applyFilters();
    if (state.viewMode === 'swipe') {
      initSwipeDeck(0);
    }
  };

  // Deck Search Controls
  if (elements.deckSearchToggleBtn) {
    elements.deckSearchToggleBtn.addEventListener('click', () => {
      if (elements.deckSearchBar) {
        const isHidden = elements.deckSearchBar.style.display === 'none';
        elements.deckSearchBar.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && elements.deckSearchInput) {
          elements.deckSearchInput.focus();
        }
      }
    });
  }

  if (elements.deckSearchSubmitBtn) {
    elements.deckSearchSubmitBtn.addEventListener('click', () => {
      executeSearch(elements.deckSearchInput?.value || '');
    });
  }

  if (elements.deckSearchInput) {
    elements.deckSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSearch(elements.deckSearchInput.value);
      }
    });
  }

  if (elements.deckSearchCloseBtn) {
    elements.deckSearchCloseBtn.addEventListener('click', () => {
      if (elements.deckSearchBar) elements.deckSearchBar.style.display = 'none';
    });
  }

  // Completed Deck Actions
  if (elements.deckRestartBtn) {
    elements.deckRestartBtn.addEventListener('click', shuffleDeck);
  }
  if (elements.deckViewSavedBtn) {
    elements.deckViewSavedBtn.addEventListener('click', () => {
      state.activeTab = 'bookmarked';
      elements.filterTabs.forEach((t) => t.classList.toggle('active', t.dataset.filter === 'bookmarked'));
      applyFilters();
      switchViewMode('grid');
    });
  }
  if (elements.deckBackHomeBtn) {
    elements.deckBackHomeBtn.addEventListener('click', () => switchViewMode('grid'));
  }

  // Bumble / Tinder Dock Action Buttons
  if (elements.dockUndoBtn) {
    elements.dockUndoBtn.addEventListener('click', () => goToPrevCardInDeck());
  }
  if (elements.dockPassBtn) {
    elements.dockPassBtn.addEventListener('click', () => {
      const topCard = elements.cardStack?.querySelector('.swipe-card.is-top');
      if (topCard) swipeFlyAndAdvance('pass', topCard, -200, 0);
      else goToNextCardInDeck('pass');
    });
  }
  if (elements.dockShuffleBtn) {
    elements.dockShuffleBtn.addEventListener('click', shuffleDeck);
  }
  if (elements.dockLikeBtn) {
    elements.dockLikeBtn.addEventListener('click', () => {
      const topCard = elements.cardStack?.querySelector('.swipe-card.is-top');
      if (topCard) swipeFlyAndAdvance('like', topCard, 200, 0);
      else goToNextCardInDeck('like');
    });
  }
  if (elements.dockNotesBtn) {
    elements.dockNotesBtn.addEventListener('click', () => openDeckNotes());
  }

  // Lesson Notes Drawer Controls
  if (elements.drawerCloseBtn) {
    elements.drawerCloseBtn.addEventListener('click', closeDeckNotes);
  }
  if (elements.drawerBackdrop) {
    elements.drawerBackdrop.addEventListener('click', closeDeckNotes);
  }
  if (elements.drawerCopyBtn) {
    elements.drawerCopyBtn.addEventListener('click', async () => {
      const text = elements.drawerPostText?.textContent;
      if (text) {
        try {
          await navigator.clipboard.writeText(text);
          elements.drawerCopyBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            elements.drawerCopyBtn.textContent = '📋 Copy Notes';
          }, 1800);
        } catch (err) {
          console.error('Failed to copy drawer notes:', err);
        }
      }
    });
  }

  // Theme toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Search input & button
  if (elements.searchBtn) {
    elements.searchBtn.addEventListener('click', () => executeSearch());
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      if (elements.clearSearchBtn) {
        elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      }
      applyFilters();
      if (state.viewMode === 'swipe') {
        initSwipeDeck(0);
      }
    });

    elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSearch();
      }
    });
  }

  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.addEventListener('click', () => {
      executeSearch('');
    });
  }

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

  // Global Keyboard navigation
  window.addEventListener('keydown', (e) => {
    // If typing in search box, do not trigger deck shortcuts
    if (e.target === elements.searchInput) return;

    // 1. Reader Modal shortcuts
    if (elements.readerModal.classList.contains('active')) {
      if (e.key === 'Escape') closeReaderModal();
      if (e.key === 'ArrowRight') nextCard();
      if (e.key === 'ArrowLeft') prevCard();
      return;
    }

    // 2. Date Modal shortcuts
    if (elements.dateModal.classList.contains('active')) {
      if (e.key === 'Escape') closeDateModal();
      return;
    }

    // 3. Deck Notes Drawer / Help Modal shortcuts
    if (elements.deckNotesDrawer?.classList.contains('active')) {
      if (e.key === 'Escape') closeDeckNotes();
      return;
    }
    if (elements.deckHelpModal?.classList.contains('active')) {
      if (e.key === 'Escape') closeDeckHelp();
      return;
    }

    // 4. Magic Swipe Mode shortcuts
    if (state.viewMode === 'swipe') {
      const topCard = elements.cardStack?.querySelector('.swipe-card.is-top');
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (topCard) swipeFlyAndAdvance('pass', topCard, -200, 0);
        else goToNextCardInDeck('pass');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (topCard) swipeFlyAndAdvance('like', topCard, 200, 0);
        else goToNextCardInDeck('like');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        openDeckNotes();
      } else if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToNextCardInDeck('next');
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        goToPrevCardInDeck();
      } else if (e.key === 'h' || e.key === 'H' || e.key === 'Escape') {
        e.preventDefault();
        switchViewMode('grid');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        toggleSound();
      }
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

