from datetime import timedelta, timezone as dt_timezone

import requests
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime


LOCATION_TERMS = [
    "uttarakhand",
    "dehradun",
    "haridwar",
    "nainital",
    "rudraprayag",
    "tehri",
    "chamoli",
    "pauri",
    "almora",
    "pithoragarh",
    "bageshwar",
    "champawat",
    "uttarkashi",
    "udhamsingh nagar",
    "udham singh nagar",
    "kashipur",
    "roorkee",
    "haldwani",
    "rishikesh",
]

TOPIC_KEYWORDS = [
    "traffic",
    "congestion",
    "jam",
    "roadblock",
    "road block",
    "accident",
    "collision",
    "crash",
    "pile-up",
    "disaster",
    "emergency",
    "flood",
    "cloudburst",
    "landslide",
    "earthquake",
    "fire",
]

NOISE_KEYWORDS = [
    "cricket",
    "ipl",
    "movie",
    "bollywood",
    "celebrity",
    "stock market",
    "share market",
    "election rally",
]


def _contains_any(text, keywords):
    lower = (text or "").lower()
    return any(keyword in lower for keyword in keywords)


def _classify_incident_type(text):
    lower = (text or "").lower()
    if any(k in lower for k in ["traffic", "congestion", "jam", "roadblock", "road block"]):
        return "traffic"
    if any(k in lower for k in ["accident", "collision", "crash", "pile-up"]):
        return "accident"
    return "disaster"


def fetch_incident_news(limit=12):
    api_key = getattr(settings, "NEWS_API_KEY", None)
    if not api_key:
        return []

    now = timezone.now()
    since = now - timedelta(hours=24)

    location_query = " OR ".join(f'"{term}"' for term in LOCATION_TERMS[:10])
    topic_query = " OR ".join(f'"{term}"' for term in TOPIC_KEYWORDS)
    query = f"({location_query}) AND ({topic_query})"

    params = {
        "q": query,
        "searchIn": "title,description",
        "language": "en",
        "sortBy": "publishedAt",
        "from": since.isoformat(timespec="seconds"),
        "pageSize": 50,
        "apiKey": api_key,
    }

    try:
        response = requests.get(
            "https://newsapi.org/v2/everything",
            params=params,
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()
    except Exception:
        return []

    articles = []
    seen_urls = set()

    for article in data.get("articles", []):
        title = article.get("title") or ""
        description = article.get("description") or ""
        published_at_raw = article.get("publishedAt")
        url = article.get("url")
        image = article.get("urlToImage")

        if not title or not description or not url:
            continue

        if url in seen_urls:
            continue

        combined_text = f"{title} {description}"

        if not _contains_any(combined_text, LOCATION_TERMS):
            continue

        if not _contains_any(combined_text, TOPIC_KEYWORDS):
            continue

        if _contains_any(combined_text, NOISE_KEYWORDS):
            continue

        published_at = parse_datetime(published_at_raw) if published_at_raw else None
        if not published_at:
            continue
        if timezone.is_naive(published_at):
            published_at = timezone.make_aware(published_at, dt_timezone.utc)
        if published_at < since:
            continue

        seen_urls.add(url)
        articles.append({
            "title": title,
            "description": description,
            "url": url,
            "image": image,
            "source": (article.get("source") or {}).get("name") or "News Source",
            "published_at": published_at_raw,
            "incident_type": _classify_incident_type(combined_text),
        })

        if len(articles) >= limit:
            break

    return articles
