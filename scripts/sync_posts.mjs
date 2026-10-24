/**
 * Learn with Ashmeet - Visual English Archive
 * Pure Node.js Zero-Dependency Auto-Sync Engine
 * Fetches latest YouTube community posts, downloads high-res WebP cards,
 * and updates data/posts.json + Service Worker cache.
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_DIR = process.cwd();
const DATA_DIR = path.join(BASE_DIR, 'data');
const JSON_FILE = path.join(DATA_DIR, 'posts.json');
const CARDS_DIR = path.join(BASE_DIR, 'cards');
const SW_FILE = path.join(BASE_DIR, 'sw.js');
const CHANNEL_URL = 'https://www.youtube.com/@learnwithashmeet/posts';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

function sanitizeSlug(text, maxLen = 35) {
  const clean = (text || '')
    .replace(/[\\/*?:"<>|#\n\r\t]+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^[._]+|[._]+$/g, '');
  return clean.slice(0, maxLen).replace(/^[._]+|[._]+$/g, '');
}

function parseRelativeTimeToIso(publishedStr, baseDate = new Date()) {
  const text = (publishedStr || '').toLowerCase().trim();
  const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!match) return baseDate.toISOString();

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const msMap = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
  };
  const diff = (msMap[unit] || 0) * amount;
  return new Date(baseDate.getTime() - diff).toISOString();
}

async function fetchLatestPostsFromChannel() {
  console.log(`[Sync] Fetching channel feed from ${CHANNEL_URL}...`);
  const res = await fetch(CHANNEL_URL, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube channel: HTTP ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  const m =
    html.match(/var ytInitialData = ({.*?});<\/script>/) ||
    html.match(/window\["ytInitialData"\]\s*=\s*({.*?});<\/script>/);

  if (!m) {
    throw new Error('Could not extract ytInitialData from YouTube page!');
  }

  const ytData = JSON.parse(m[1]);
  const tabs = ytData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const postsTab = tabs.find(
    (t) => t.tabRenderer?.title === 'Posts' || t.tabRenderer?.title === 'Community'
  );

  if (!postsTab) {
    throw new Error('Community / Posts tab not found on channel page!');
  }

  const contents =
    postsTab.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer
      ?.contents || [];

  const foundPosts = [];
  for (const item of contents) {
    const thread = item?.backstagePostThreadRenderer;
    if (!thread) continue;
    const r = thread?.post?.backstagePostRenderer;
    if (!r) continue;

    const postId = r.postId;
    const pubTime = (r.publishedTimeText?.runs || []).map((x) => x.text).join('');
    const textContent = (r.contentText?.runs || []).map((x) => x.text).join('');
    const likes = r.voteCount?.simpleText || '0';

    const attachment = r.backstageAttachment || {};
    const images = [];
    let postType = 'text_only';

    if (attachment.postMultiImageRenderer) {
      postType = 'multi_image';
      const rawImgs = attachment.postMultiImageRenderer.images || [];
      rawImgs.forEach((imgObj, idx) => {
        const thumbs = imgObj.backstageImageRenderer?.image?.thumbnails || [];
        if (thumbs.length > 0) {
          images.push({
            cardIndex: idx + 1,
            url: thumbs[thumbs.length - 1].url
          });
        }
      });
    } else if (attachment.backstageImageRenderer) {
      postType = 'single_image';
      const thumbs = attachment.backstageImageRenderer.image?.thumbnails || [];
      if (thumbs.length > 0) {
        images.push({
          cardIndex: 1,
          url: thumbs[thumbs.length - 1].url
        });
      }
    } else if (attachment.pollRenderer) {
      postType = 'poll';
    }

    foundPosts.push({
      postId,
      postUrl: `https://www.youtube.com/post/${postId}`,
      publishedTime: pubTime,
      text: textContent,
      likes,
      type: postType,
      images
    });
  }

  return foundPosts;
}

async function downloadWebpCard(imgUrl, destPath, maxRetries = 3) {
  destPath = path.resolve(destPath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  // Ensure high quality WebP request from Google CDN
  let cdnWebpUrl = imgUrl;
  if (cdnWebpUrl.includes('=')) {
    cdnWebpUrl = cdnWebpUrl.replace(/=.*$/, '=s1254-c-fcrop64=1,00000000ffffffff-rw-nd-v1');
  } else {
    cdnWebpUrl = `${cdnWebpUrl}=s1254-c-fcrop64=1,00000000ffffffff-rw-nd-v1`;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(cdnWebpUrl, {
        headers: {
          'User-Agent': HEADERS['User-Agent'],
          'Accept': 'image/webp,image/*;q=0.8'
        }
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        fs.writeFileSync(destPath, buf);
        return true;
      }
    } catch (err) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }

  // Fallback to raw imgUrl
  try {
    const res = await fetch(imgUrl, { headers: HEADERS });
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(arrayBuf));
      return true;
    }
  } catch (err) {}

  return false;
}

export async function sync() {
  if (!fs.existsSync(JSON_FILE)) {
    throw new Error(`Database ${JSON_FILE} not found.`);
  }

  const db = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  const existingPosts = db.posts || [];
  const existingIds = new Set(existingPosts.map((p) => p.postId));
  console.log(`[Sync] Current database has ${existingPosts.length} posts.`);

  const fetchedPosts = await fetchLatestPostsFromChannel();
  console.log(`[Sync] Scanned ${fetchedPosts.length} recent posts from YouTube channel.`);

  const newPosts = fetchedPosts.filter((p) => !existingIds.has(p.postId));

  if (newPosts.length === 0) {
    const nowIso = new Date().toISOString();
    db.lastUpdated = nowIso;
    fs.writeFileSync(JSON_FILE, JSON.stringify(db, null, 2), 'utf8');
    console.log('✓ Archive is already up to date! No new posts.');
    return 0;
  }

  console.log(`🔥 Found ${newPosts.length} NEW POST(S) on the channel! Syncing...`);
  const now = new Date();
  const newWebPosts = [];

  for (const post of newPosts) {
    const timeSlug = sanitizeSlug(post.publishedTime, 15);
    const textSlug = sanitizeSlug(post.text.split('\n')[0], 35);
    const folderSlug = `${timeSlug}_${textSlug}`.replace(/^_+|_+$/g, '') || 'New_Post';
    const folderName = `Post_New_${post.postId.slice(0, 8)}_${folderSlug}`;
    const targetFolder = path.join(CARDS_DIR, folderName);
    fs.mkdirSync(targetFolder, { recursive: true });

    const pubIso = parseRelativeTimeToIso(post.publishedTime, now);
    const cardList = [];

    for (const img of post.images || []) {
      const cardIdx = img.cardIndex;
      const fileName = `Card_${String(cardIdx).padStart(2, '0')}.webp`;
      const destFile = path.join(targetFolder, fileName);
      const relPath = `cards/${folderName}/${fileName}`;

      console.log(`- Downloading card ${cardIdx} for post [${post.postId.slice(0, 8)}]...`);
      const ok = await downloadWebpCard(img.url, destFile);
      if (ok) {
        cardList.push({
          cardIndex: cardIdx,
          webpUrl: relPath,
          fallbackUrl: img.url.replace(/=.*$/, '=s0')
        });
      }
    }

    newWebPosts.push({
      order: 1, // re-indexed below
      postId: post.postId,
      postUrl: post.postUrl,
      publishedTime: post.publishedTime,
      publishedDateISO: pubIso,
      type: post.type,
      text: post.text,
      likes: post.likes,
      totalCards: cardList.length,
      isNew: true,
      cards: cardList
    });
  }

  // Clear isNew flag on older posts if more than 5 new posts
  existingPosts.forEach((p, idx) => {
    if (idx >= 3) p.isNew = false;
  });

  // Prepend new posts to master database
  const combined = [...newWebPosts, ...existingPosts];
  combined.forEach((p, idx) => {
    p.order = idx + 1;
  });

  const totalCards = combined.reduce((acc, p) => acc + (p.cards?.length || 0), 0);
  const nowIso = new Date().toISOString();

  db.lastUpdated = nowIso;
  db.totalPosts = combined.length;
  db.totalCards = totalCards;
  db.newPostsCount = newWebPosts.length;
  db.posts = combined;

  fs.writeFileSync(JSON_FILE, JSON.stringify(db, null, 2), 'utf8');

  // Bump Service Worker cache so client PWAs auto-refresh with new data
  if (fs.existsSync(SW_FILE)) {
    const swContent = fs.readFileSync(SW_FILE, 'utf8');
    const versionMatch = swContent.match(/const CACHE_NAME = 'lwa-archive-v([\d.]+)';/);
    if (versionMatch) {
      const currentVer = parseFloat(versionMatch[1]);
      const nextVer = (currentVer + 0.1).toFixed(1);
      const updatedSw = swContent.replace(
        /const CACHE_NAME = 'lwa-archive-v[\d.]+';/,
        `const CACHE_NAME = 'lwa-archive-v${nextVer}';`
      );
      fs.writeFileSync(SW_FILE, updatedSw, 'utf8');
      console.log(`[Sync] Bumped Service Worker cache to v${nextVer}`);
    }
  }

  console.log('\n==================================================');
  console.log(`✓ AUTO-SYNC COMPLETED SUCCESSFULLY!`);
  console.log(`New Posts Added:   ${newWebPosts.length}`);
  console.log(`New Total Posts:   ${combined.length}`);
  console.log(`New Total Cards:   ${totalCards}`);
  console.log(`Last Updated ISO:  ${nowIso}`);
  console.log('==================================================\n');

  return newWebPosts.length;
}

// Allow direct CLI execution: node scripts/sync_posts.mjs
if (process.argv[1] && process.argv[1].endsWith('sync_posts.mjs')) {
  sync().catch((err) => {
    console.error('Auto-sync failed:', err);
    process.exit(1);
  });
}
