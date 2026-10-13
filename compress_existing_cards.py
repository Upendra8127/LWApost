import json
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
JSON_FILE = BASE_DIR / "posts_data.json"
POSTS_SOURCE_DIR = BASE_DIR / "posts"
CARDS_TARGET_DIR = BASE_DIR / "cards"
DATA_DIR = BASE_DIR / "data"

def parse_relative_time_to_iso(published_str: str, base_time: datetime) -> str:
    """Estimates an ISO 8601 date string from YouTube relative time string like '8 hours ago', '3 days ago'."""
    text = published_str.lower().strip()
    match = re.search(r'(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago', text)
    if not match:
        return base_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    amount = int(match.group(1))
    unit = match.group(2)
    
    if unit == 'second':
        delta = timedelta(seconds=amount)
    elif unit == 'minute':
        delta = timedelta(minutes=amount)
    elif unit == 'hour':
        delta = timedelta(hours=amount)
    elif unit == 'day':
        delta = timedelta(days=amount)
    elif unit == 'week':
        delta = timedelta(weeks=amount)
    elif unit == 'month':
        delta = timedelta(days=amount * 30)
    elif unit == 'year':
        delta = timedelta(days=amount * 365)
    else:
        delta = timedelta(days=0)
        
    dt = base_time - delta
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def compress_single_card(src_path: Path, dest_path: Path, quality: int = 82) -> tuple[bool, int, int]:
    try:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        if dest_path.exists() and dest_path.stat().st_size > 0:
            return True, src_path.stat().st_size, dest_path.stat().st_size
            
        with Image.open(src_path) as img:
            # Convert RGBA / P to RGB if no alpha needed or keep RGBA for webp
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")
            img.save(dest_path, "WEBP", quality=quality, method=6)
            
        return True, src_path.stat().st_size, dest_path.stat().st_size
    except Exception as e:
        print(f"[Error compressing {src_path.name}]: {e}")
        return False, 0, 0

def main():
    if not JSON_FILE.exists():
        print(f"Error: {JSON_FILE} not found!")
        sys.exit(1)

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    posts = raw_data.get("posts", [])
    total_posts = len(posts)
    CARDS_TARGET_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loaded {total_posts} posts. Scanning images to compress to WebP...")

    # Reference time is the extraction timestamp or current time
    base_time = datetime.now(timezone.utc)

    # Locate source directories
    post_dirs = {p.name.split('_')[1]: p for p in POSTS_SOURCE_DIR.iterdir() if p.is_dir()}
    
    conversion_tasks = []
    web_posts = []
    total_cards = 0

    for post in posts:
        order = post.get("order", 0)
        order_str = f"{order:03d}"
        
        # Match source folder
        source_folder = None
        for p in POSTS_SOURCE_DIR.iterdir():
            if p.is_dir() and p.name.startswith(f"Post_{order_str}"):
                source_folder = p
                break

        if not source_folder:
            print(f"Warning: source folder for post {order_str} not found in posts/")
            continue

        folder_name = source_folder.name
        target_post_folder = CARDS_TARGET_DIR / folder_name
        
        pub_iso = parse_relative_time_to_iso(post.get("publishedTime", ""), base_time)
        
        web_card_list = []
        images = post.get("images", [])
        
        for img in images:
            card_idx = img.get("cardIndex", 1)
            # Find matching file in source folder
            matching_src = None
            for cand in source_folder.glob(f"Card_{card_idx:02d}.*"):
                matching_src = cand
                break
                
            if matching_src and matching_src.exists():
                dest_file = target_post_folder / f"Card_{card_idx:02d}.webp"
                rel_web_path = f"cards/{folder_name}/Card_{card_idx:02d}.webp"
                conversion_tasks.append((matching_src, dest_file))
                web_card_list.append({
                    "cardIndex": card_idx,
                    "webpUrl": rel_web_path,
                    "fallbackUrl": img.get("highResUrl", "")
                })
                total_cards += 1

        web_posts.append({
            "order": order,
            "postId": post.get("postId"),
            "postUrl": post.get("postUrl"),
            "publishedTime": post.get("publishedTime"),
            "publishedDateISO": pub_iso,
            "type": post.get("type"),
            "text": post.get("text", ""),
            "likes": post.get("likes", "0"),
            "totalCards": len(web_card_list),
            "isNew": False,
            "cards": web_card_list
        })

    print(f"Queued {len(conversion_tasks)} card images for WebP compression with multi-threading.")
    start_time = time.time()

    orig_total_bytes = 0
    webp_total_bytes = 0
    successful = 0

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(compress_single_card, src, dest) for src, dest in conversion_tasks]
        
        for future in as_completed(futures):
            ok, src_sz, dest_sz = future.result()
            if ok:
                successful += 1
                orig_total_bytes += src_sz
                webp_total_bytes += dest_sz
                
            if successful % 100 == 0 or successful == len(conversion_tasks):
                elapsed = time.time() - start_time
                orig_mb = orig_total_bytes / (1024 * 1024)
                webp_mb = webp_total_bytes / (1024 * 1024)
                ratio = (1 - (webp_total_bytes / max(orig_total_bytes, 1))) * 100
                print(f"Compressed: {successful}/{len(conversion_tasks)} cards | {orig_mb:.1f}MB -> {webp_mb:.1f}MB (-{ratio:.1f}%) | {elapsed:.1f}s")

    # Save web posts.json
    now_iso = datetime.now(timezone.utc).isoformat()
    web_db = {
        "channelName": "Learn with Ashmeet",
        "channelUrl": "https://www.youtube.com/@learnwithashmeet",
        "lastUpdated": now_iso,
        "totalPosts": len(web_posts),
        "totalCards": total_cards,
        "newPostsCount": 0,
        "posts": web_posts
    }

    output_json_path = DATA_DIR / "posts.json"
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(web_db, f, indent=2, ensure_ascii=False)

    total_time = time.time() - start_time
    print("\n" + "=" * 60)
    print("COMPRESSION & WEB DATASET GENERATION COMPLETE!")
    print(f"Total Cards Processed: {successful} / {len(conversion_tasks)}")
    print(f"Original Size: {orig_total_bytes / (1024 * 1024):.2f} MB")
    print(f"Compressed WebP Size: {webp_total_bytes / (1024 * 1024):.2f} MB")
    print(f"Storage Saved: {(1 - webp_total_bytes / max(orig_total_bytes, 1)) * 100:.2f}%")
    print(f"Dataset generated at: {output_json_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
