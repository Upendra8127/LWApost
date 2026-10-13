import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// 1. Validate raw archive posts_data.json
const rawJsonPath = path.resolve('posts_data.json');
if (fs.existsSync(rawJsonPath)) {
  const rawData = JSON.parse(fs.readFileSync(rawJsonPath, 'utf8'));
  assert.equal(typeof rawData, 'object');
  assert.ok(rawData.totalPosts >= 220, 'Raw archive should have at least 220 posts');
  assert.ok(rawData.totalCards >= 1150, 'Raw archive should have at least 1,150 cards');
  console.log(`✓ Raw dataset verified: ${rawData.totalPosts} posts.`);
}

// 2. Validate web database data/posts.json
const webJsonPath = path.resolve('data', 'posts.json');
if (!fs.existsSync(webJsonPath)) {
  console.error('data/posts.json not found!');
  process.exit(1);
}

const webData = JSON.parse(fs.readFileSync(webJsonPath, 'utf8'));
assert.equal(typeof webData, 'object');
assert.ok(webData.totalPosts >= 220, 'Web dataset should have at least 220 posts');
assert.ok(webData.totalCards >= 1150, 'Web dataset should have at least 1,150 cards');
assert.ok(Array.isArray(webData.posts));
assert.equal(webData.posts.length, webData.totalPosts);
assert.ok(webData.lastUpdated, 'Must contain lastUpdated timestamp');

console.log(`✓ Web dataset verified: ${webData.totalPosts} posts, ${webData.totalCards} cards.`);
console.log(`✓ Last updated: ${webData.lastUpdated}`);
