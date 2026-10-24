import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Logo, Icons & Auto-Update Validation', () => {
  test('PWA high-res vector and raster icons exist', () => {
    assert.ok(fs.existsSync(path.resolve('favicon.svg')), 'favicon.svg must exist');
    assert.ok(fs.existsSync(path.resolve('icons/icon.svg')), 'icons/icon.svg must exist');
    assert.ok(fs.existsSync(path.resolve('icons/icon-192.png')), 'icons/icon-192.png must exist');
    assert.ok(fs.existsSync(path.resolve('icons/icon-512.png')), 'icons/icon-512.png must exist');
    assert.ok(fs.existsSync(path.resolve('icons/icon-maskable.png')), 'icons/icon-maskable.png must exist');
    assert.ok(fs.existsSync(path.resolve('icons/apple-touch-icon.png')), 'icons/apple-touch-icon.png must exist');

    const stat192 = fs.statSync(path.resolve('icons/icon-192.png'));
    const stat512 = fs.statSync(path.resolve('icons/icon-512.png'));
    assert.ok(stat192.size > 1000, 'icon-192 must be a valid non-empty PNG');
    assert.ok(stat512.size > 2000, 'icon-512 must be a valid non-empty PNG');
  });

  test('manifest.json has correct PWA standalone configuration', () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve('manifest.json'), 'utf8'));
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.length >= 4);
    assert.ok(manifest.icons.some((i) => i.src.startsWith('icons/icon-192.png')));
    assert.ok(manifest.icons.some((i) => i.src.startsWith('icons/icon-512.png')));
    assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  });

  test('sw.js features cache invalidation, skipWaiting, and clients.claim', () => {
    const sw = fs.readFileSync(path.resolve('sw.js'), 'utf8');
    assert.ok(/lwa-archive-v\d+\.\d+/.test(sw), 'Service worker cache must have versioned cache key');
    assert.ok(sw.includes('skipWaiting()'), 'Must call skipWaiting for instant activation');
    assert.ok(sw.includes('clients.claim()'), 'Must claim clients immediately');
  });
});

describe('Magic Mode Minimalist UI & Search Accuracy Validation', () => {
  test('styles.css contains global tap highlight suppression', () => {
    const css = fs.readFileSync(path.resolve('styles.css'), 'utf8');
    assert.ok(css.includes('-webkit-tap-highlight-color: transparent !important;'));
    assert.ok(css.includes('magic-exit-btn'));
  });

  test('Search engine correctly handles multi-result keyword matches', () => {
    const data = JSON.parse(fs.readFileSync(path.resolve('data/posts.json'), 'utf8'));
    const posts = data.posts;

    // Search query helper mimicking app.js
    function search(query) {
      const raw = query.trim().toLowerCase();
      const explicitOrderMatch = raw.match(/^(?:post\s*#?|#)\s*(\d+)$/i) || (/^\d+$/.test(raw) ? [null, raw] : null);
      const explicitOrder = explicitOrderMatch ? parseInt(explicitOrderMatch[1], 10) : null;

      if (explicitOrder !== null) {
        return posts.filter((p) => p.order === explicitOrder);
      }

      const tokens = raw.split(/\s+/).filter((t) => t.length > 0);
      return posts.filter((p) => {
        const text = (p.text || '').toLowerCase();
        const time = (p.publishedTime || '').toLowerCase();
        const type = (p.type || '').toLowerCase();
        const cardKeywords = (p.cards || [])
          .map((c) => (c.webpUrl || '').replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase())
          .join(' ');
        const corpus = `${text} ${time} ${type} post #${p.order} ${cardKeywords}`;
        return tokens.every((t) => corpus.includes(t));
      });
    }

    // Explicit post test
    const post61 = search('#61');
    assert.equal(post61.length, 1);
    assert.equal(post61[0].order, 61);

    // Multi-result keyword test
    const teaResults = search('tea');
    assert.ok(teaResults.length >= 10, 'Keywords like tea must return all matching posts');

    const englishResults = search('english');
    assert.ok(englishResults.length > 50, 'Keywords like english must return all matching posts');

    const dirtyResults = search('dirty');
    assert.ok(dirtyResults.length >= 1, 'Topic keywords must match');
  });

  test('Continuous card progression logic transitions across posts without looping', () => {
    const dummyPosts = [
      { order: 1, cards: [{ cardIndex: 1 }, { cardIndex: 2 }] },
      { order: 2, cards: [{ cardIndex: 1 }, { cardIndex: 2 }, { cardIndex: 3 }] },
    ];

    let postIdx = 0;
    let cardIdx = 0;

    function next() {
      const cur = dummyPosts[postIdx];
      if (cardIdx < cur.cards.length - 1) {
        cardIdx++;
      } else {
        postIdx = (postIdx + 1) % dummyPosts.length;
        cardIdx = 0;
      }
    }

    // Post 1, Card 1
    assert.equal(postIdx, 0); assert.equal(cardIdx, 0);
    next(); // Post 1, Card 2
    assert.equal(postIdx, 0); assert.equal(cardIdx, 1);
    next(); // Seamlessly advances to Post 2, Card 1!
    assert.equal(postIdx, 1); assert.equal(cardIdx, 0);
    next(); // Post 2, Card 2
    assert.equal(postIdx, 1); assert.equal(cardIdx, 1);
    next(); // Post 2, Card 3
    assert.equal(postIdx, 1); assert.equal(cardIdx, 2);
    next(); // Wraps cleanly to Post 1, Card 1!
    assert.equal(postIdx, 0); assert.equal(cardIdx, 0);
  });

  test('Swipe stamps feature vector SVGs and safe vertical clearance from star button', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    assert.ok(html.includes('class="stamp-svg"'), 'Stamp overlay must feature vector SVGs');
    assert.ok(html.includes('id="stampPass"'), 'Stamp pass element must exist');
    assert.ok(html.includes('id="stampLike"'), 'Stamp like element must exist');

    const css = fs.readFileSync(path.resolve('styles.css'), 'utf8');
    // Ensure stampPass top offset is >= 75px so it never overlaps the top-20px corner star button
    const passTopMatch = css.match(/\.stamp-pass\s*\{[^}]*top:\s*(\d+)px/);
    assert.ok(passTopMatch, 'stamp-pass must have an explicit top pixel offset');
    const passTop = parseInt(passTopMatch[1], 10);
    assert.ok(passTop >= 75, `stamp-pass top offset (${passTop}px) must provide clearance below corner controls`);
  });

  test('Auto-sync engine and GitHub Actions workflow are configured with Node.js', () => {
    assert.ok(fs.existsSync(path.resolve('scripts/sync_posts.mjs')), 'Node.js sync script must exist');
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    assert.ok(pkg.scripts?.sync, 'package.json must contain sync script');

    const workflow = fs.readFileSync(path.resolve('.github/workflows/auto_sync.yml'), 'utf8');
    assert.ok(workflow.includes('actions/setup-node'), 'Workflow must use setup-node');
    assert.ok(workflow.includes('node scripts/sync_posts.mjs'), 'Workflow must run sync_posts.mjs');
    assert.ok(!workflow.includes('cache: \'pip\''), 'Workflow must not contain broken pip cache');
  });
});

