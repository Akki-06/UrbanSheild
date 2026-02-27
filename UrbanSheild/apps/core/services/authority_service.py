import requests
from apps.authorities.models import Authority
from apps.core.utils import UTTARAKHAND_BOUNDS

OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter"


def _get_bbox():
    return f"{UTTARAKHAND_BOUNDS['min_lat']},{UTTARAKHAND_BOUNDS['min_lon']},{UTTARAKHAND_BOUNDS['max_lat']},{UTTARAKHAND_BOUNDS['max_lon']}"


def _make_request(query):
    try:
        response = requests.post(
            OVERPASS_URL,
            data={"data": query},
            timeout=30,
        )

        if response.status_code != 200:
            return None, f"Overpass error {response.status_code}"

        try:
            return response.json(), None
        except Exception:
            return None, "Invalid JSON returned from Overpass"

    except requests.exceptions.RequestException as e:
        return None, str(e)


def fetch_police_stations():

    bbox = _get_bbox()

    query = f"""
    [out:json][timeout:25];
    node["amenity"="police"]({bbox});
    out;
    """

    data, error = _make_request(query)

    if error:
        return {"error": error}

    created = 0

    for element in data.get("elements", []):
        lat = element.get("lat")
        lon = element.get("lon")

        if not lat or not lon:
            continue

        tags = element.get("tags", {})

        name = tags.get("name", "Police Station")
        phone = tags.get("phone", "100")
        email = tags.get("email", "police@uttarakhand.gov.in")

        Authority.objects.get_or_create(
            name=name,
            authority_type="police",
            latitude=lat,
            longitude=lon,
            defaults={
                "phone": phone,
                "email": email,
                "state": "Uttarakhand",
            }
        )

        created += 1

    return {"police_added": created}


def fetch_fire_stations():

    bbox = _get_bbox()

    query = f"""
    [out:json][timeout:25];
    node["amenity"="fire_station"]({bbox});
    out;
    """

    data, error = _make_request(query)

    if error:
        return {"error": error}

    created = 0

    for element in data.get("elements", []):
        lat = element.get("lat")
        lon = element.get("lon")

        if not lat or not lon:
            continue

        tags = element.get("tags", {})

        name = tags.get("name", "Fire Station")
        phone = tags.get("phone", "101")
        email = tags.get("email", "fire@uttarakhand.gov.in")

        Authority.objects.get_or_create(
            name=name,
            authority_type="fire",
            latitude=lat,
            longitude=lon,
            defaults={
                "phone": phone,
                "email": email,
                "state": "Uttarakhand",
            }
        )

        created += 1

    return {"fire_added": created}