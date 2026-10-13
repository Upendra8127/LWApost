import json
import os
import re
import sys
import time
import asyncio
import aiohttp
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
JSON_FILE = BASE_DIR / "posts_data.json"
OUTPUT_DIR = BASE_DIR / "posts"

def sanitize_slug(text: str, max_len: int = 35) -> str:
    # Remove emojis and non-ascii / special chars
    clean = re.sub(r'[\\/*?:"<>|#\n\r\t]+', ' ', text)
    clean = re.sub(r'[^\w\s-]', '', clean)
    clean = re.sub(r'\s+', '_', clean).strip('._ ')
    return clean[:max_len].strip('._ ')

def get_post_folder_name(post: dict) -> str:
    order = post.get("order", 0)
    time_str = post.get("publishedTime", "")
    time_slug = sanitize_slug(time_str, 15)
    
    first_line = (post.get("text") or "").split('\n')[0]
    text_slug = sanitize_slug(first_line, 35)
    
    parts = [f"Post_{order:03d}"]
    if time_slug:
        parts.append(time_slug)
    if text_slug:
        parts.append(text_slug)
        
    return "_".join(parts)

async def download_card(session: aiohttp.ClientSession, url: str, target_path_base: Path, semaphore: asyncio.Semaphore, max_retries: int = 3):
    async with semaphore:
        for attempt in range(1, max_retries + 1):
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        content_type = response.headers.get("Content-Type", "")
                        ext = ".png"
                        if "jpeg" in content_type or "jpg" in content_type:
                            ext = ".jpg"
                        elif "webp" in content_type:
                            ext = ".webp"
                        elif "png" in content_type:
                            ext = ".png"
                            
                        target_file = target_path_base.with_suffix(ext)
                        data = await response.read()
                        with open(target_file, "wb") as f:
                            f.write(data)
                        return True, len(data), target_file
                    else:
                        if attempt == max_retries:
                            return False, 0, f"HTTP {response.status}"
            except Exception as e:
                if attempt == max_retries:
                    return False, 0, str(e)
            await asyncio.sleep(0.5 * attempt)
        return False, 0, "Max retries exceeded"

async def main():
    if not JSON_FILE.exists():
        print(f"Error: {JSON_FILE} not found!")
        sys.exit(1)

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    posts = data.get("posts", [])
    total_posts = len(posts)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Found {total_posts} posts in {JSON_FILE.name}")
    print(f"Target download folder: {OUTPUT_DIR}")

    # Prepare download tasks
    tasks = []
    semaphore = asyncio.Semaphore(16) # 16 concurrent downloads
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    total_images_to_download = 0

    connector = aiohttp.TCPConnector(limit=32)
    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        for post in posts:
            folder_name = get_post_folder_name(post)
            post_folder = OUTPUT_DIR / folder_name
            post_folder.mkdir(parents=True, exist_ok=True)

            # Write info.txt for metadata
            info_path = post_folder / "info.txt"
            with open(info_path, "w", encoding="utf-8") as f:
                f.write(f"Post Order: {post.get('order')} / {total_posts}\n")
                f.write(f"Post ID: {post.get('postId')}\n")
                f.write(f"Post URL: {post.get('postUrl')}\n")
                f.write(f"Published Time: {post.get('publishedTime')}\n")
                f.write(f"Type: {post.get('type')}\n")
                f.write(f"Likes: {post.get('likes')}\n")
                f.write(f"Total Cards: {post.get('totalCards')}\n")
                f.write(f"{'='*50}\n")
                f.write(f"Caption / Text:\n{post.get('text')}\n")

            images = post.get("images", [])
            for img in images:
                card_index = img.get("cardIndex", 1)
                high_res_url = img.get("highResUrl")
                if high_res_url:
                    target_path_base = post_folder / f"Card_{card_index:02d}"
                    tasks.append((post.get("order"), card_index, high_res_url, target_path_base))
                    total_images_to_download += 1

        print(f"Total cards/images scheduled for download: {total_images_to_download}")
        start_time = time.time()

        download_coros = [
            download_card(session, url, target_path_base, semaphore)
            for _, _, url, target_path_base in tasks
        ]

        completed = 0
        total_bytes = 0
        failed = 0

        # Run downloads and monitor progress
        for coro in asyncio.as_completed(download_coros):
            success, size_bytes, info = await coro
            completed += 1
            if success:
                total_bytes += size_bytes
            else:
                failed += 1
                print(f"[FAILED] {info}")

            if completed % 100 == 0 or completed == total_images_to_download:
                elapsed = time.time() - start_time
                mb_downloaded = total_bytes / (1024 * 1024)
                print(f"Progress: {completed}/{total_images_to_download} images ({completed/total_images_to_download*100:.1f}%) | {mb_downloaded:.1f} MB downloaded | Elapsed: {elapsed:.1f}s")

        elapsed = time.time() - start_time
        mb_total = total_bytes / (1024 * 1024)
        print("\n" + "="*50)
        print(f"DOWNLOAD COMPLETE!")
        print(f"Total Images Downloaded: {completed - failed}/{total_images_to_download}")
        print(f"Total Failed: {failed}")
        print(f"Total Size: {mb_total:.2f} MB")
        print(f"Total Time: {elapsed:.2f} seconds ({total_images_to_download / max(elapsed, 0.1):.1f} images/sec)")
        print(f"Destination: {OUTPUT_DIR}")
        print("="*50)

if __name__ == "__main__":
    asyncio.run(main())
