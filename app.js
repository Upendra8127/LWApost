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

  // 2. High-precision Multi-token and Post Order Search
  if (state.searchQuery) {
    const raw = state.searchQuery.trim().toLowerCase();
    const orderNumber = raw.replace(/[^0-9]/g, '');
    const tokens = raw.split(/\s+/).filter((t) => t.length > 0);

    list = list.filter((p) => {
      // Direct post number match (e.g. "61", "#61", "post 61", "post #61")
      if (orderNumber && String(p.order) === orderNumber) return true;

      const text = (p.text || '').toLowerCase();
      const time = (p.publishedTime || '').toLowerCase();
      const type = (p.type || '').toLowerCase();
      const cardsPath = (p.cards || []).map((c) => c.webpUrl || '').join(' ').toLowerCase();
      const combined = `${text} ${time} ${type} post #${p.order} ${cardsPath}`;

      return tokens.every((token) => combined.includes(token));
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

function initSwipeDeck(startPostIndex = 0) {
  const source = state.filteredPosts && state.filteredPosts.length > 0 ? state.filteredPosts : state.allPosts;
  state.swipeDeck = [...source];
  state.swipeDeckIndex = Math.min(Math.max(0, startPostIndex), state.swipeDeck.length);
  state.swipeSubCardIndex = 0;
  state.swipeHistory = [];
  renderDeckStack();
}

function renderDeckStack() {
  if (!elements.cardStack) return;
  elements.cardStack.textContent = ''; // safe clear

  const total = state.swipeDeck.length;
  if (total === 0) {
    if (elements.deckCompleted) elements.deckCompleted.style.display = 'flex';
    if (elements.deckCounterText) elements.deckCounterText.textContent = '0 cards found';
    return;
  }

  if (elements.deckCompleted) elements.deckCompleted.style.display = 'none';

  // Continuous seamless loop so reading NEVER stops until user exits!
  if (state.swipeDeckIndex >= total) {
    state.swipeDeckIndex = state.swipeDeckIndex % total;
  }
  if (state.swipeDeckIndex < 0) {
    state.swipeDeckIndex = (state.swipeDeckIndex + total) % total;
  }

  const currentIdx = state.swipeDeckIndex;
  const currentPost = state.swipeDeck[currentIdx];

  if (elements.deckCounterText) {
    const numCards = (currentPost.cards || []).length;
    const cardPart = numCards > 1 ? ` • Slide ${state.swipeSubCardIndex + 1}/${numCards}` : '';
    elements.deckCounterText.textContent = `Post #${currentPost.order} (${currentIdx + 1}/${total})${cardPart}`;
  }

  // Render 3 cards in stack (Top = 0, Next = 1, Third = 2) with circular wrapping
  const stackCards = [
    state.swipeDeck[currentIdx],
    state.swipeDeck[(currentIdx + 1) % total],
    state.swipeDeck[(currentIdx + 2) % total],
  ];

  // Append in reverse order so top card is top DOM child
  for (let i = stackCards.length - 1; i >= 0; i--) {
    const post = stackCards[i];
    const isTop = i === 0;
    const cardEl = createSwipeCardElement(post, isTop, i);
    elements.cardStack.appendChild(cardEl);

    if (isTop) {
      bindCardDragPhysics(cardEl, post);
    }
  }
}

function createSwipeCardElement(post, isTop, depthIndex) {
  const cardEl = document.createElement('div');
  cardEl.className = `swipe-card ${isTop ? 'is-top' : depthIndex === 1 ? 'is-next' : 'is-third'}`;
  cardEl.dataset.postId = post.postId;

  const cards = post.cards || [];
  const numCards = cards.length;
  const activeSubIndex = isTop ? state.swipeSubCardIndex : 0;
  const currentCardData = cards[activeSubIndex] || cards[0];

  // Story Indicator Progress Bars (Instagram / Bumble style)
  if (numCards > 1) {
    const storyBars = document.createElement('div');
    storyBars.className = 'story-bars';
    for (let c = 0; c < numCards; c++) {
      const bar = document.createElement('div');
      bar.className = `story-bar ${c === activeSubIndex ? 'active' : ''}`;
      storyBars.appendChild(bar);
    }
    cardEl.appendChild(storyBars);
  }

  // Header Overlay Pills
  const headerOverlay = document.createElement('div');
  headerOverlay.className = 'card-header-overlay';

  const pillsGroup = document.createElement('div');
  pillsGroup.className = 'card-pills-group';

  const orderBadge = document.createElement('span');
  orderBadge.className = 'card-badge-order';
  orderBadge.textContent = `Post #${post.order}`;
  pillsGroup.appendChild(orderBadge);

  if (numCards > 1) {
    const countBadge = document.createElement('span');
    countBadge.className = 'card-badge-count';
    countBadge.textContent = `🃏 ${activeSubIndex + 1}/${numCards}`;
    pillsGroup.appendChild(countBadge);
  }

  headerOverlay.appendChild(pillsGroup);

  // Star / Bookmark Button
  const starBtn = document.createElement('button');
  starBtn.className = `card-star-btn ${state.bookmarks.has(post.postId) ? 'active' : ''}`;
  starBtn.textContent = '⭐';
  starBtn.title = 'Bookmark this post';
  starBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleBookmark(post.postId);
    starBtn.classList.toggle('active', state.bookmarks.has(post.postId));
    sounds.playChime();
  });
  headerOverlay.appendChild(starBtn);
  cardEl.appendChild(headerOverlay);

  // Card Image Container
  const imageBox = document.createElement('div');
  imageBox.className = 'card-image-box';

  const img = document.createElement('img');
  img.src = currentCardData ? currentCardData.webpUrl : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%23334155"><rect width="100%" height="100%"/></svg>';
  img.alt = `Card for Post #${post.order}`;
  img.loading = isTop ? 'eager' : 'lazy';
  if (currentCardData && currentCardData.fallbackUrl) {
    img.onerror = () => { img.src = currentCardData.fallbackUrl; };
  }
  imageBox.appendChild(img);

  // Tap Zones for Carousel navigation
  if (isTop && numCards > 1) {
    const tapLeft = document.createElement('div');
    tapLeft.className = 'tap-zone tap-zone-left';
    tapLeft.title = 'Previous card';
    tapLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      prevSlideInDeckPost();
    });

    const tapRight = document.createElement('div');
    tapRight.className = 'tap-zone tap-zone-right';
    tapRight.title = 'Next card';
    tapRight.addEventListener('click', (e) => {
      e.stopPropagation();
      nextSlideInDeckPost();
    });

    imageBox.appendChild(tapLeft);
    imageBox.appendChild(tapRight);
  }

  cardEl.appendChild(imageBox);

  // Bottom Action Bar - Clean, uncluttered, no text obscuring the visual card!
  const infoOverlay = document.createElement('div');
  infoOverlay.className = 'card-info-overlay';

  const actionBar = document.createElement('div');
  actionBar.className = 'card-action-bar';

  const metaPill = document.createElement('span');
  metaPill.className = 'card-meta-pill';
  metaPill.textContent = `❤️ ${post.likes || '0'} • ${post.publishedTime || formatDate(post.publishedDateISO)}`;
  actionBar.appendChild(metaPill);

  const moreInfoBtn = document.createElement('button');
  moreInfoBtn.className = 'deck-more-info-btn';
  moreInfoBtn.textContent = 'ℹ️ More Info';
  moreInfoBtn.title = 'View lesson notes & explanation';
  moreInfoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDeckNotes(post);
  });
  actionBar.appendChild(moreInfoBtn);

  infoOverlay.appendChild(actionBar);
  cardEl.appendChild(infoOverlay);

  return cardEl;
}

function bindCardDragPhysics(cardEl, post) {
  let isPointerDown = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  const onPointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.tap-zone')) return;

    isPointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = startX;
    currentY = startY;

    cardEl.classList.add('is-dragging');
    try {
      cardEl.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onPointerMove = (e) => {
    if (!isPointerDown) return;

    currentX = e.clientX;
    currentY = e.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // Dynamic rotation: 0.08 deg per px
    const rotation = deltaX * 0.08;
    cardEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg)`;

    // Update floating stamps
    if (elements.stampLike && elements.stampPass && elements.stampNotes) {
      if (deltaX > 20) {
        elements.stampLike.style.opacity = Math.min(1, (deltaX - 20) / 70);
        elements.stampPass.style.opacity = 0;
        elements.stampNotes.style.opacity = 0;
      } else if (deltaX < -20) {
        elements.stampPass.style.opacity = Math.min(1, (-deltaX - 20) / 70);
        elements.stampLike.style.opacity = 0;
        elements.stampNotes.style.opacity = 0;
      } else if (deltaY < -30 && Math.abs(deltaX) < 50) {
        elements.stampNotes.style.opacity = Math.min(1, (-deltaY - 30) / 70);
        elements.stampLike.style.opacity = 0;
        elements.stampPass.style.opacity = 0;
      } else {
        elements.stampLike.style.opacity = 0;
        elements.stampPass.style.opacity = 0;
        elements.stampNotes.style.opacity = 0;
      }
    }
  };

  const onPointerUp = (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    cardEl.classList.remove('is-dragging');

    try {
      cardEl.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // Reset stamps
    if (elements.stampLike) elements.stampLike.style.opacity = 0;
    if (elements.stampPass) elements.stampPass.style.opacity = 0;
    if (elements.stampNotes) elements.stampNotes.style.opacity = 0;

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // Swipe Threshold: 90px horizontal or drag up
    if (deltaX > 90) {
      swipeCardAction('like', cardEl, post, deltaX, deltaY);
    } else if (deltaX < -90) {
      swipeCardAction('pass', cardEl, post, deltaX, deltaY);
    } else if (deltaY < -100 && Math.abs(deltaX) < 60) {
      cardEl.style.transform = '';
      openDeckNotes(post);
    } else {
      cardEl.style.transform = '';
    }
  };

  cardEl.addEventListener('pointerdown', onPointerDown);
  cardEl.addEventListener('pointermove', onPointerMove);
  cardEl.addEventListener('pointerup', onPointerUp);
  cardEl.addEventListener('pointercancel', onPointerUp);
}

function swipeCardAction(action, cardEl = null, post = null, deltaX = 0, deltaY = 0) {
  const total = state.swipeDeck.length;
  if (total === 0) return;

  const currentPost = post || state.swipeDeck[state.swipeDeckIndex];
  const activeEl = cardEl || elements.cardStack?.querySelector('.swipe-card.is-top');

  // Push to history for undo
  state.swipeHistory.push({
    post: currentPost,
    action: action,
    index: state.swipeDeckIndex,
    subCardIndex: state.swipeSubCardIndex,
  });

  if (action === 'like') {
    state.bookmarks.add(currentPost.postId);
    saveBookmarks();
    sounds.playChime();
    if (elements.stampLike) {
      elements.stampLike.style.opacity = 1;
      setTimeout(() => { if (elements.stampLike) elements.stampLike.style.opacity = 0; }, 200);
    }
    if (activeEl) {
      activeEl.style.transform = `translate3d(1200px, ${deltaY || 30}px, 0) rotate(35deg)`;
      activeEl.style.opacity = '0';
    }
  } else if (action === 'pass') {
    sounds.playSwoosh();
    if (elements.stampPass) {
      elements.stampPass.style.opacity = 1;
      setTimeout(() => { if (elements.stampPass) elements.stampPass.style.opacity = 0; }, 200);
    }
    if (activeEl) {
      activeEl.style.transform = `translate3d(-1200px, ${deltaY || 30}px, 0) rotate(-35deg)`;
      activeEl.style.opacity = '0';
    }
  }

  // Seamless continuous loop so cards never stop displaying!
  state.swipeDeckIndex = (state.swipeDeckIndex + 1) % total;
  state.swipeSubCardIndex = 0;

  setTimeout(() => {
    renderDeckStack();
  }, 220);
}

function undoSwipe() {
  const total = state.swipeDeck.length;
  if (total === 0) return;
  if (state.swipeHistory.length > 0) {
    const last = state.swipeHistory.pop();
    state.swipeDeckIndex = last.index;
    state.swipeSubCardIndex = last.subCardIndex || 0;
  } else {
    state.swipeDeckIndex = (state.swipeDeckIndex - 1 + total) % total;
    state.swipeSubCardIndex = 0;
  }
  sounds.playPop();
  renderDeckStack();
}

function shuffleDeck() {
  if (state.swipeDeckIndex >= state.swipeDeck.length) {
    state.swipeDeck = cryptoShuffle(state.allPosts);
    state.swipeDeckIndex = 0;
  } else {
    const completed = state.swipeDeck.slice(0, state.swipeDeckIndex);
    const remaining = cryptoShuffle(state.swipeDeck.slice(state.swipeDeckIndex));
    state.swipeDeck = [...completed, ...remaining];
  }
  state.swipeSubCardIndex = 0;
  sounds.playPop();
  renderDeckStack();
}

function nextSlideInDeckPost() {
  const post = state.swipeDeck[state.swipeDeckIndex];
  if (!post || !post.cards || post.cards.length <= 1) return;
  state.swipeSubCardIndex = (state.swipeSubCardIndex + 1) % post.cards.length;
  sounds.playPop();
  updateTopCardSubSlide(post);
}

function prevSlideInDeckPost() {
  const post = state.swipeDeck[state.swipeDeckIndex];
  if (!post || !post.cards || post.cards.length <= 1) return;
  state.swipeSubCardIndex = (state.swipeSubCardIndex - 1 + post.cards.length) % post.cards.length;
  sounds.playPop();
  updateTopCardSubSlide(post);
}

function updateTopCardSubSlide(post) {
  const topCard = elements.cardStack?.querySelector('.swipe-card.is-top');
  if (!topCard) return;

  const cards = post.cards || [];
  const currentCard = cards[state.swipeSubCardIndex];
  const img = topCard.querySelector('img');
  if (img && currentCard) {
    img.src = currentCard.webpUrl;
  }

  // Update story bars
  const bars = topCard.querySelectorAll('.story-bar');
  bars.forEach((bar, idx) => {
    bar.classList.toggle('active', idx === state.swipeSubCardIndex);
  });

  // Update badge count
  const countBadge = topCard.querySelector('.card-badge-count');
  if (countBadge) {
    countBadge.textContent = `🃏 ${state.swipeSubCardIndex + 1}/${cards.length}`;
  }
}

// Notes Drawer & Modals
function openDeckNotes(post = null) {
  const targetPost = post || state.swipeDeck[state.swipeDeckIndex];
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
    elements.dockUndoBtn.addEventListener('click', undoSwipe);
  }
  if (elements.dockPassBtn) {
    elements.dockPassBtn.addEventListener('click', () => swipeCardAction('pass'));
  }
  if (elements.dockShuffleBtn) {
    elements.dockShuffleBtn.addEventListener('click', shuffleDeck);
  }
  if (elements.dockLikeBtn) {
    elements.dockLikeBtn.addEventListener('click', () => swipeCardAction('like'));
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
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        swipeCardAction('pass');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        swipeCardAction('like');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        openDeckNotes();
      } else if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextSlideInDeckPost();
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        undoSwipe();
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

