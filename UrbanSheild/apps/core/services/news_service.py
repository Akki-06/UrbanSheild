import requests
from django.conf import settings

NEWS_API_KEY = "aa2cf9fdaa1948fd968fb1348a3e8119"

def fetch_incident_news():

    url = "https://newsapi.org/v2/everything"

    params = {
        "q": "(Uttarakhand OR Dehradun OR Haridwar) AND (accident OR disaster OR traffic OR flood OR earthquake OR fire)",
        "language": "en",
        "sortBy": "publishedAt",
        "apiKey": NEWS_API_KEY
    }

    response = requests.get(url, params=params)
    data = response.json()

    articles = []

    for article in data.get("articles", [])[:10]:
        articles.append({
            "title": article["title"],
            "description": article["description"],
            "url": article["url"],
            "image": article["urlToImage"],
            "source": article["source"]["name"],
            "published_at": article["publishedAt"]
        })

    return articles