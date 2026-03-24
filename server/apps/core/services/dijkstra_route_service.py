import math
import heapq
import requests

from apps.disasters.models import Disaster
from apps.traffic.models import TrafficIncident
from apps.shelters.models import Shelter
from apps.core.utils import haversine as _haversine_km

# Maximum distance in km between two nodes for them to be connected in the
# routing graph.  Uttarakhand spans ~330km E-W and ~340km N-S, so 80km gives
# reasonable granularity while keeping the graph sparse.
_GRAPH_CONNECTION_THRESHOLD_KM = 80


# ---------------------------------------------------------------------------
# helper for calculating routes between arbitrary points using Dijkstra's
# algorithm and factoring in traffic/disaster nodes. This is a more general
# version of the existing `find_best_route` which only supported starting from
# a disaster and heading to the nearest shelter.
# ---------------------------------------------------------------------------
def compute_smart_route(start_coord, end_coord):
    """Return a dictionary containing route metadata and geometry.

    * ``start_coord``/``end_coord`` are (lat, lon) tuples supplied by the
      client.
    * traffic incidents and active disasters are injected as intermediate
      nodes so that the path will attempt to avoid congested/blocked areas.
    """

    traffic_points = TrafficIncident.objects.all()
    disasters = Disaster.objects.filter(status__in=["active", "critical"])

    nodes = []

    # start and end nodes are always present
    nodes.append({"type": "start", "coord": start_coord})

    # traffic nodes carry congestion & blocked flags
    for t in traffic_points:
        nodes.append({
            "type": "traffic",
            "coord": (t.latitude, t.longitude),
            "congestion": t.congestion_level,
            "blocked": t.is_blocked,
        })

    # disasters should be avoided if possible, treat them as blocked nodes and
    # give them additional congestion penalty based on severity
    for d in disasters:
        nodes.append({
            "type": "disaster",
            "coord": (d.latitude, d.longitude),
            "congestion": getattr(d, "severity", 0),
            "blocked": True,
        })

    nodes.append({"type": "end", "coord": end_coord})

    graph = build_graph(nodes)
    distances, previous = dijkstra_with_path(graph, 0)

    end_index = len(nodes) - 1
    if distances.get(end_index, float("inf")) == float("inf"):
        return {"message": "No route found"}

    path_indices = reconstruct_path(previous, 0, end_index)
    path_coords = [nodes[i]["coord"] for i in path_indices]
    osrm_geometry = get_osrm_route(path_coords)

    return {
        "route_cost": round(distances[end_index], 2),
        "route_nodes": path_coords,
        "geojson_route": osrm_geometry,
    }



def _coord_distance_km(a, b):
    """Return the great-circle distance in kilometres between two (lat, lon) tuples."""
    return _haversine_km(a[0], a[1], b[0], b[1])


def build_graph(nodes):
    """Build a weighted adjacency list.

    Two nodes are connected only when they are within
    ``_GRAPH_CONNECTION_THRESHOLD_KM`` kilometres of each other.  Weights are
    in kilometres plus congestion / blockage penalties so that Dijkstra can
    produce a meaningful cost value.
    """
    graph = {}

    for i, node_a in enumerate(nodes):
        graph[i] = []

        for j, node_b in enumerate(nodes):
            if i == j:
                continue

            d_km = _coord_distance_km(node_a["coord"], node_b["coord"])

            if d_km <= _GRAPH_CONNECTION_THRESHOLD_KM:
                # Base weight is the real-world distance in km.
                # Congestion adds up to ~50 km equivalent of penalty.
                # A fully blocked road adds 500 km equivalent so it's
                # only chosen when there is truly no other path.
                congestion = node_b.get("congestion", 0)
                weight = d_km + congestion * 5

                if node_b.get("blocked", False):
                    weight += 500

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
    """Wrapper used by the disaster viewset.

    The original logic manually built a graph with the disaster as the start
    and all active shelters as possible destinations; it duplicated a lot of
    the generic routing code.  For maintainability we now simply identify the
    nearest shelter in straight-line distance and hand the computation off to
    :func:`compute_smart_route` which already understands traffic and
    disaster penalties.
    """

    disaster = Disaster.objects.get(id=disaster_id)
    shelters = Shelter.objects.filter(is_active=True)

    if not shelters.exists():
        return {"message": "No route found"}

    start = (disaster.latitude, disaster.longitude)
    closest = min(
        shelters,
        key=lambda s: _coord_distance_km(start, (s.latitude, s.longitude))
    )
    end = (closest.latitude, closest.longitude)

    return compute_smart_route(start, end)
