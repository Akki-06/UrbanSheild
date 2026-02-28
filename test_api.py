import requests
import json

r = requests.get('http://127.0.0.1:8000/api/news/incidents/')
data = r.json()

print(f'Type: {type(data)}')
print(f'Is list: {isinstance(data, list)}')
print(f'Count: {len(data) if isinstance(data, list) else "N/A"}')
if data:
    print(f'First item keys: {list(data[0].keys())}')
    print(f'\nFirst item:')
    print(json.dumps(data[0], indent=2))
