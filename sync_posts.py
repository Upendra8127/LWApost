import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from PIL import Image

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent


DATA_DIR = BASE_DIR / "data"
JSON_FILE = DATA_DIR / "posts.json"
CARDS_DIR = BASE_DIR / "cards"
CHANNEL_URL = "https://www.youtube.com/@learnwithashmeet/posts"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

def sanitize_slug(text: str, max_len: int = 35) -> str:
    clean = re.sub(r'[\\/*?:"<>|#\n\r\t]+', ' ', text)
    clean = re.sub(r'[^\w\s-]', '', clean)
    clean = re.sub(r'\s+', '_', clean).strip('._ ')
    return clean[:max_len].strip('._ ')

def parse_relative_time_to_iso(published_str: str, base_time: datetime) -> str:
    text = published_str.lower().strip()
    match = re.search(r'(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago', text)
    if not match:
        return base_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    amount = int(match.group(1))
    unit = match.group(2)
    
    deltas = {
        'second': timedelta(seconds=amount),
        'minute': timedelta(minutes=amount),
        'hour': timedelta(hours=amount),
        'day': timedelta(days=amount),
        'week': timedelta(weeks=amount),
        'month': timedelta(days=amount * 30),
        'year': timedelta(days=amount * 365)
    }
    dt = base_time - deltas.get(unit, timedelta(0))
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def download_and_compress_image(img_url: str, dest_path: Path, quality: int = 82) -> bool:
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    high_res_url = re.sub(r'=.*$', '=s0', img_url) if '=' in img_url else img_url
    
    # Try downloading
    req = urllib.request.Request(high_res_url, headers=HEADERS)
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
                
            from io import BytesIO
            with Image.open(BytesIO(data)) as img:
                if img.mode not in ("RGB", "RGBA"):
                    img = img.convert("RGBA")
                img.save(dest_path, "WEBP", quality=quality, method=6)
            return True
        except Exception as e:
            time.sleep(1 * attempt)
    return False

def fetch_latest_posts_from_channel():
    print(f"Fetching community feed from {CHANNEL_URL}...")
    req = urllib.request.Request(CHANNEL_URL, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as resp:
        html = resp.read().decode("utf-8")

    m = re.search(r'var ytInitialData = ({.*?});</script>', html)
    if not m:
        m = re.search(r'window\["ytInitialData"\]\s*=\s*({.*?});</script>', html)
    if not m:
        raise ValueError("Could not extract ytInitialData from YouTube page!")

    yt_data = json.loads(m.group(1))
    tabs = yt_data.get("contents", {}).get("twoColumnBrowseResultsRenderer", {}).get("tabs", [])
    posts_tab = None
    for t in tabs:
        title = t.get("tabRenderer", {}).get("title")
        if title in ("Posts", "Community"):
            posts_tab = t
            break

    if not posts_tab:
        raise ValueError("Community / Posts tab not found on channel page!")

    contents = (
        posts_tab.get("tabRenderer", {})
        .get("content", {})
        .get("sectionListRenderer", {})
        .get("contents", [{}])[0]
        .get("itemSectionRenderer", {})
        .get("contents", [])
    )

    found_posts = []
    for item in contents:
        thread = item.get("backstagePostThreadRenderer")
        if not thread:
            continue
        r = thread.get("post", {}).get("backstagePostRenderer")
        if not r:
            continue

        post_id = r.get("postId")
        pub_time = "".join([x.get("text", "") for x in r.get("publishedTimeText", {}).get("runs", [])])
        text_content = "".join([x.get("text", "") for x in r.get("contentText", {}).get("runs", [])])
        likes = r.get("voteCount", {}).get("simpleText") or "0"

        attachment = r.get("backstageAttachment", {})
        images = []
        post_type = "text_only"

        if attachment.get("postMultiImageRenderer"):
            post_type = "multi_image"
            for idx, img_obj in enumerate(attachment["postMultiImageRenderer"].get("images", [])):
                thumbs = img_obj.get("backstageImageRenderer", {}).get("image", {}).get("thumbnails", [])
                if thumbs:
                    url = thumbs[-1].get("url", "")
                    images.append({"cardIndex": idx + 1, "url": url})
        elif attachment.get("backstageImageRenderer"):
            post_type = "single_image"
            thumbs = attachment["backstageImageRenderer"].get("image", {}).get("thumbnails", [])
            if thumbs:
                url = thumbs[-1].get("url", "")
                images.append({"cardIndex": 1, "url": url})
        elif attachment.get("pollRenderer"):
            post_type = "poll"

        found_posts.append({
            "postId": post_id,
            "postUrl": f"https://www.youtube.com/post/{post_id}",
            "publishedTime": pub_time,
            "text": text_content,
            "likes": likes,
            "type": post_type,
            "images": images
        })

    return found_posts

def sync():
    if not JSON_FILE.exists():
        print(f"Database {JSON_FILE} not found. Please run compress_existing_cards.py first.")
        sys.exit(1)

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        db = json.load(f)

    existing_posts = db.get("posts", [])
    existing_ids = {p.get("postId") for p in existing_posts}
    print(f"Current database contains {len(existing_posts)} posts.")

    fetched_posts = fetch_latest_posts_from_channel()
    print(f"Scanned {len(fetched_posts)} recent posts from YouTube channel.")

    new_posts = [p for p in fetched_posts if p.get("postId") not in existing_ids]
    
    if not new_posts:
        now_iso = datetime.now(timezone.utc).isoformat()
        db["lastUpdated"] = now_iso
        with open(JSON_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
        print("✓ All posts are up-to-date! No new posts to append.")
        return 0

    print(f"🔥 Found {len(new_posts)} NEW POST(S) to append!")
    base_time = datetime.now(timezone.utc)
    new_web_posts = []

    for post in new_posts:
        time_slug = sanitize_slug(post["publishedTime"], 15)
        text_slug = sanitize_slug(post["text"].split('\n')[0], 35)
        folder_slug = f"{time_slug}_{text_slug}".strip('_') or "New_Post"
        # Temporary unique folder name
        folder_name = f"Post_New_{post['postId'][:8]}_{folder_slug}"
        target_folder = CARDS_DIR / folder_name
        target_folder.mkdir(parents=True, exist_ok=True)

        pub_iso = parse_relative_time_to_iso(post["publishedTime"], base_time)
        card_list = []

        for img in post.get("images", []):
            card_idx = img["cardIndex"]
            dest_file = target_folder / f"Card_{card_idx:02d}.webp"
            rel_path = f"cards/{folder_name}/Card_{card_idx:02d}.webp"
            print(f"Downloading & compressing new card {card_idx} for post {post['postId']}...")
            ok = download_and_compress_image(img["url"], dest_file)
            if ok:
                card_list.append({
                    "cardIndex": card_idx,
                    "webpUrl": rel_path,
                    "fallbackUrl": re.sub(r'=.*$', '=s0', img["url"])
                })

        new_web_posts.append({
            "order": 1, # will be reindexed below
            "postId": post["postId"],
            "postUrl": post["postUrl"],
            "publishedTime": post["publishedTime"],
            "publishedDateISO": pub_iso,
            "type": post["type"],
            "text": post["text"],
            "likes": post["likes"],
            "totalCards": len(card_list),
            "isNew": True,
            "cards": card_list
        })

    # Prepend new posts to the master database
    combined = new_web_posts + existing_posts
    # Re-index orders from 1 to N
    for idx, p in enumerate(combined):
        p["order"] = idx + 1

    total_cards = sum(len(p.get("cards", [])) for p in combined)
    now_iso = datetime.now(timezone.utc).isoformat()

    db["lastUpdated"] = now_iso
    db["totalPosts"] = len(combined)
    db["totalCards"] = total_cards
    db["newPostsCount"] = len(new_web_posts)
    db["posts"] = combined

    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

    print("\n" + "="*50)
    print(f"✓ SYNC COMPLETED SUCCESSFULLY!")
    print(f"New Posts Added: {len(new_web_posts)}")
    print(f"New Total Posts: {len(combined)}")
    print(f"New Total Cards: {total_cards}")
    print(f"Last Updated: {now_iso}")
    print("="*50)
    return len(new_web_posts)

if __name__ == "__main__":
    count = sync()
    sys.exit(0)
