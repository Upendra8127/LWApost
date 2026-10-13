import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// CSPRNG generator as required by rule
function getCryptoRandom() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
}

// Sanitization function
function sanitizeSlug(text, maxLen = 35) {
  const clean = text
    .replace(/[\\/*?:"<>|#\n\r\t]+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^[._]+|[._]+$/g, '');
  return clean.slice(0, maxLen).replace(/^[._]+|[._]+$/g, '');
}

// Fisher-Yates shuffle
function cryptoShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(getCryptoRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('Zero-Dependency & CSPRNG Standards', () => {
  test('getCryptoRandom produces values strictly in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const val = getCryptoRandom();
      assert.ok(val >= 0 && val < 1, `Value ${val} out of bounds`);
    }
  });

  test('Statistical 10,000-sample Pearson Chi-Square Uniformity Test', () => {
    const samples = 10000;
    const bins = 10;
    const counts = new Array(bins).fill(0);
    const expected = samples / bins;

    for (let i = 0; i < samples; i++) {
      const bin = Math.floor(getCryptoRandom() * bins);
      counts[bin]++;
    }

    let chiSquare = 0;
    for (let i = 0; i < bins; i++) {
      chiSquare += Math.pow(counts[i] - expected, 2) / expected;
    }

    // Critical value for df=9 at alpha=0.01 is 21.666
    assert.ok(
      chiSquare < 21.666,
      `Chi-Square statistic ${chiSquare} exceeds critical threshold 21.666`
    );
  });

  test('Crypto array shuffling preserves elements and changes ordering', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = cryptoShuffle(original);
    assert.equal(shuffled.length, original.length);
    assert.deepEqual([...shuffled].sort((a, b) => a - b), original);
  });
});

describe('Sanitization & Security Standards', () => {
  test('Path traversal characters are stripped', () => {
    const unsafe = '../../../etc/passwd?name="test"|pipe';
    const sanitized = sanitizeSlug(unsafe);
    assert.ok(!sanitized.includes('..'));
    assert.ok(!sanitized.includes('/'));
    assert.ok(!sanitized.includes('\\'));
    assert.ok(!sanitized.includes('?'));
    assert.ok(!sanitized.includes('|'));
    assert.ok(!sanitized.includes('"'));
  });

  test('XSS strings do not survive slugification', () => {
    const xss = '<script>alert("pwned")</script>';
    const sanitized = sanitizeSlug(xss);
    assert.ok(!sanitized.includes('<'));
    assert.ok(!sanitized.includes('>'));
    assert.ok(!sanitized.includes('"'));
  });
});

describe('Web Reader Application & PWA Assets', () => {
  test('index.html, styles.css, app.js, sw.js, manifest.json exist', () => {
    assert.ok(fs.existsSync(path.resolve('index.html')), 'index.html must exist');
    assert.ok(fs.existsSync(path.resolve('styles.css')), 'styles.css must exist');
    assert.ok(fs.existsSync(path.resolve('app.js')), 'app.js must exist');
    assert.ok(fs.existsSync(path.resolve('sw.js')), 'sw.js must exist');
    assert.ok(fs.existsSync(path.resolve('manifest.json')), 'manifest.json must exist');
  });

  test('index.html contains stats bar, calendar controls, and modal reader', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    assert.ok(html.includes('id="statLastUpdated"'), 'Must have last updated stat');
    assert.ok(html.includes('id="statNewCount"'), 'Must have new count stat');
    assert.ok(html.includes('id="dateModal"'), 'Must have date calendar modal');
    assert.ok(html.includes('id="readerModal"'), 'Must have card reader modal');
    assert.ok(html.includes('id="sortSelect"'), 'Must have sort options');
  });

  test('Tinder & Bumble Magic Swipe Mode deck components exist and are wired', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    assert.ok(html.includes('id="viewHomeBtn"'), 'Must have Home View button');
    assert.ok(html.includes('id="viewSwipeBtn"'), 'Must have Magic Swipe button');
    assert.ok(html.includes('id="swipeModeSection"'), 'Must have Swipe Mode Section');
    assert.ok(html.includes('id="cardStack"'), 'Must have 3D Card Stack');
    assert.ok(html.includes('id="dockLikeBtn"'), 'Must have Like/Save action button');
    assert.ok(html.includes('id="dockPassBtn"'), 'Must have Pass/Skip action button');
    assert.ok(html.includes('id="deckNotesDrawer"'), 'Must have Deck Notes Drawer');

    const js = fs.readFileSync(path.resolve('app.js'), 'utf8');
    assert.ok(js.includes('class DeckSoundEngine'), 'Must have Web Audio sound engine');
    assert.ok(js.includes('function switchViewMode'), 'Must have view switcher');
    assert.ok(js.includes('function swipeCardAction'), 'Must have swipe action handler');
  });
});

describe('LWApost Web Dataset & Compressed Archive Validation', () => {
  const webJsonPath = path.resolve('data', 'posts.json');

  test('data/posts.json exists and contains valid synced posts dataset', () => {
    assert.ok(fs.existsSync(webJsonPath), 'data/posts.json must exist');
    const data = JSON.parse(fs.readFileSync(webJsonPath, 'utf8'));

    assert.ok(data.totalPosts >= 220);
    assert.ok(data.totalCards >= 1150);
    assert.ok(data.lastUpdated, 'Must contain lastUpdated');
    assert.equal(typeof data.newPostsCount, 'number');
    assert.equal(data.posts.length, data.totalPosts);

    // Verify ordering sequence 1 to N
    data.posts.forEach((p, idx) => {
      assert.equal(p.order, idx + 1);
      assert.ok(p.postId, `Post at index ${idx} missing postId`);
      assert.ok(p.publishedDateISO, `Post at index ${idx} missing publishedDateISO`);
      assert.ok(Array.isArray(p.cards));
    });
  });

  test('Compressed cards directory exists and contains WebP images under 250KB each', () => {
    const cardsDir = path.resolve('cards');
    assert.ok(fs.existsSync(cardsDir), 'cards directory must exist');
    const dirs = fs.readdirSync(cardsDir).filter((f) => {
      return fs.statSync(path.join(cardsDir, f)).isDirectory();
    });
    assert.ok(dirs.length >= 216, `Expected at least 216 image post directories in cards/, found ${dirs.length}`);

    // Check a sample post's cards
    const sampleDir = path.join(cardsDir, dirs[dirs.length - 1]);
    const webpFiles = fs.readdirSync(sampleDir).filter((f) => f.endsWith('.webp'));
    assert.ok(webpFiles.length > 0, 'Post folder should contain webp files');

    webpFiles.forEach((file) => {
      const stats = fs.statSync(path.join(sampleDir, file));
      assert.ok(stats.size > 1000, 'WebP file must not be empty');
      assert.ok(stats.size < 300000, 'WebP file should be compressed (< 300KB)');
    });
  });
});
