import math
import heapq
import requests

from apps.disasters.models import Disaster
from apps.traffic.models import TrafficIncident
from apps.shelters.models import Shelter


def distance(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)


def build_graph(nodes):
    graph = {}

    for i, node_a in enumerate(nodes):
        graph[i] = []

        for j, node_b in enumerate(nodes):
            if i == j:
                continue

            d = distance(node_a["coord"], node_b["coord"])

            if d < 2:
                weight = d * 10 + node_b.get("congestion", 0) * 5

                if node_b.get("blocked", False):
                    weight += 100

                graph[i].append((j, weight))

    return graph


def dijkstra_with_path(graph, start):
    distances = {node: float("inf") for node in graph}
    previous = {}

    distances[start] = 0
    pq = [(0, start)]

    while pq:
        current_distance, current_node = heapq.heappop(pq)

        for neighbor, weight in graph[current_node]:
            new_distance = current_distance + weight

            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                previous[neighbor] = current_node
                heapq.heappush(pq, (new_distance, neighbor))

    return distances, previous


def reconstruct_path(previous, start, target):
    path = []
    node = target

    while node != start:
        path.append(node)
        node = previous.get(node)
        if node is None:
            return []

    path.append(start)
    path.reverse()
    return path


def get_osrm_route(coords):
    """
    coords = [(lat, lon), (lat, lon), ...]
    """
    coord_string = ";".join(
        [f"{lon},{lat}" for lat, lon in coords]
    )

    url = f"http://router.project-osrm.org/route/v1/driving/{coord_string}"

    params = {
        "overview": "full",
        "geometries": "geojson"
    }

    response = requests.get(url, params=params, timeout=10)

    if response.status_code != 200:
        return None

    data = response.json()

    try:
        return data["routes"][0]["geometry"]
    except (KeyError, IndexError):
        return None


def find_best_route(disaster_id):
    disaster = Disaster.objects.get(id=disaster_id)

    traffic_points = TrafficIncident.objects.all()
    shelters = Shelter.objects.filter(is_active=True)

    nodes = []

    # Disaster node (start)
    nodes.append({
        "type": "disaster",
        "coord": (disaster.latitude, disaster.longitude)
    })

    # Traffic nodes
    for t in traffic_points:
        nodes.append({
            "type": "traffic",
            "coord": (t.latitude, t.longitude),
            "congestion": t.congestion_level,
            "blocked": t.is_blocked
        })

    # Shelter nodes
    for s in shelters:
        nodes.append({
            "type": "shelter",
            "coord": (s.latitude, s.longitude)
        })

    graph = build_graph(nodes)
    distances, previous = dijkstra_with_path(graph, 0)

    best_shelter_index = None
    best_score = float("inf")

    for i, node in enumerate(nodes):
        if node["type"] == "shelter":
            if distances[i] < best_score:
                best_score = distances[i]
                best_shelter_index = i

    if best_shelter_index is None:
        return {"message": "No route found"}

    path_indices = reconstruct_path(previous, 0, best_shelter_index)

    path_coords = [nodes[i]["coord"] for i in path_indices]

    osrm_geometry = get_osrm_route(path_coords)

    return {
        "route_cost": round(best_score, 2),
        "route_nodes": path_coords,
        "geojson_route": osrm_geometry
    }