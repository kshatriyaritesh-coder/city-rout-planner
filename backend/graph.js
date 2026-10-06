function buildGraph(roads) {
  const graph = {};

  for (const city in roads) {
    graph[city] = roads[city].map((road) => ({
      city: road.city,
      distance: Number(road.distance)
    }));
  }

  return graph;
}

function buildRailwaySegment(from, to, segmentCount = 8) {
  const [fromLat, fromLon] = from;
  const [toLat, toLon] = to;
  const corridorOffset = Math.max(0.1, Math.abs(toLon - fromLon) * 0.18 + 0.08);
  const geometry = [];

  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = index / segmentCount;
    const latitude = fromLat + (toLat - fromLat) * progress;
    const longitude = fromLon + (toLon - fromLon) * progress;
    const curvedLongitude = longitude + Math.sin(progress * Math.PI) * corridorOffset;
    geometry.push([latitude, curvedLongitude]);
  }

  return geometry;
}

function buildRailwayPath(path, cityCoordinates) {
  if (!Array.isArray(path) || path.length < 2) {
    return path.map((city) => cityCoordinates[city]).filter(Boolean);
  }

  const geometry = [];

  for (let index = 0; index < path.length - 1; index += 1) {
    const fromCity = path[index];
    const toCity = path[index + 1];
    const fromCoordinates = cityCoordinates[fromCity];
    const toCoordinates = cityCoordinates[toCity];

    if (!fromCoordinates || !toCoordinates) {
      geometry.push(fromCoordinates || toCoordinates);
      continue;
    }

    const segment = buildRailwaySegment(fromCoordinates, toCoordinates);
    if (index > 0) {
      segment.shift();
    }
    geometry.push(...segment);
  }

  return geometry;
}

function calculateShortestPath(graph, source, destination) {
  if (!graph[source] || !graph[destination]) {
    return { path: [], distance: Infinity };
  }

  const shortestDistance = {};
  const previousCity = {};
  const unvisitedCities = [];

  for (const city in graph) {
    shortestDistance[city] = Infinity;
  }

  shortestDistance[source] = 0;
  unvisitedCities.push({ city: source, distance: 0 });

  while (unvisitedCities.length > 0) {
    unvisitedCities.sort((a, b) => a.distance - b.distance);
    const current = unvisitedCities.shift();

    if (current.distance > shortestDistance[current.city]) {
      continue;
    }

    for (const road of graph[current.city]) {
      const newDistance = current.distance + road.distance;

      if (newDistance < (shortestDistance[road.city] ?? Infinity)) {
        shortestDistance[road.city] = newDistance;
        previousCity[road.city] = current.city;
        unvisitedCities.push({ city: road.city, distance: newDistance });
      }
    }
  }

  if (shortestDistance[destination] === Infinity) {
    return { path: [], distance: Infinity };
  }

  const path = [];
  let currentCity = destination;

  while (currentCity) {
    path.unshift(currentCity);
    currentCity = previousCity[currentCity];
  }

  return {
    path,
    distance: shortestDistance[destination]
  };
}

module.exports = {
  buildGraph,
  buildRailwayPath,
  calculateShortestPath
};
