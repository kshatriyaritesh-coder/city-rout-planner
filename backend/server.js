const express = require('express');
const cors = require('cors');
const { buildGraph, buildRailwayPath, calculateShortestPath } = require('./graph');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const roadMap = {
  Delhi: [
    { city: 'Jaipur', distance: 281 },
    { city: 'Agra', distance: 243 },
    { city: 'Lucknow', distance: 555 }
  ],
  Jaipur: [
    { city: 'Delhi', distance: 281 },
    { city: 'Ahmedabad', distance: 657 },
    { city: 'Mumbai', distance: 1140 }
  ],
  Agra: [
    { city: 'Delhi', distance: 243 },
    { city: 'Lucknow', distance: 335 },
    { city: 'Varanasi', distance: 577 }
  ],
  Lucknow: [
    { city: 'Delhi', distance: 555 },
    { city: 'Agra', distance: 335 },
    { city: 'Varanasi', distance: 315 }
  ],
  Varanasi: [
    { city: 'Agra', distance: 577 },
    { city: 'Lucknow', distance: 315 },
    { city: 'Patna', distance: 252 }
  ],
  Ahmedabad: [
    { city: 'Jaipur', distance: 657 },
    { city: 'Mumbai', distance: 530 },
    { city: 'Bhopal', distance: 594 },
    { city: 'Pune', distance: 665 }
  ],
  Mumbai: [
    { city: 'Jaipur', distance: 1140 },
    { city: 'Ahmedabad', distance: 530 },
    { city: 'Bhopal', distance: 774 },
    { city: 'Pune', distance: 150 }
  ],
  Pune: [
    { city: 'Mumbai', distance: 150 },
    { city: 'Ahmedabad', distance: 665 },
    { city: 'Hyderabad', distance: 560 }
  ],
  Bhopal: [
    { city: 'Ahmedabad', distance: 594 },
    { city: 'Mumbai', distance: 774 },
    { city: 'Patna', distance: 950 },
    { city: 'Pune', distance: 650 }
  ],
  Patna: [
    { city: 'Varanasi', distance: 252 },
    { city: 'Bhopal', distance: 950 },
    { city: 'Kolkata', distance: 580 }
  ],
  Kolkata: [
    { city: 'Patna', distance: 580 },
    { city: 'Bengaluru', distance: 1870 }
  ],
  Bengaluru: [
    { city: 'Kolkata', distance: 1870 },
    { city: 'Chennai', distance: 346 }
  ],
  Chennai: [
    { city: 'Bengaluru', distance: 346 },
    { city: 'Hyderabad', distance: 626 }
  ],
  Hyderabad: [
    { city: 'Chennai', distance: 626 },
    { city: 'Bhopal', distance: 850 }
  ]
};

const graph = buildGraph(roadMap);

const cityCoordinates = {
  Delhi: [28.6139, 77.209],
  Jaipur: [26.9124, 75.7873],
  Agra: [27.1767, 78.0081],
  Lucknow: [26.8467, 80.9462],
  Varanasi: [25.3176, 82.9739],
  Ahmedabad: [23.0225, 72.5714],
  Mumbai: [19.076, 72.8777],
  Pune: [18.5204, 73.8567],
  Bhopal: [23.2599, 77.4126],
  Patna: [25.5941, 85.1376],
  Kolkata: [22.5726, 88.3639],
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Hyderabad: [17.385, 78.4867]
};

app.get('/api/cities', (req, res) => {
  res.json({ cities: Object.keys(graph) });
});

app.post('/api/shortest-path', (req, res) => {
  const { source, destination } = req.body;

  if (!source || !destination) {
    return res.status(400).json({ message: 'Source and destination are required.' });
  }

  const result = calculateShortestPath(graph, source, destination);

  if (result.distance === Infinity) {
    return res.status(404).json({
      message: `No route found from ${source} to ${destination}.`
    });
  }

  return res.json({
    path: result.path,
    distance: result.distance
  });
});

app.post('/api/routes', async (req, res) => {
  const { source, destination, mode = 'driving' } = req.body;
  const sourceCoordinates = cityCoordinates[source];
  const destinationCoordinates = cityCoordinates[destination];

  if (!sourceCoordinates || !destinationCoordinates) {
    return res.status(400).json({ message: 'Choose valid source and destination cities.' });
  }

  if (mode === 'train' || mode === 'flight') {
    if (mode === 'train') {
      const trainPath = calculateShortestPath(graph, source, destination);

      if (trainPath.distance === Infinity) {
        return res.status(404).json({ message: `No train corridor found from ${source} to ${destination}.` });
      }

      return res.json({
        mode,
        routes: [{
          id: 'train-graph',
          label: 'Exact train corridor',
          distance: trainPath.distance,
          duration: null,
          geometry: buildRailwayPath(trainPath.path, cityCoordinates)
        }],
        message: 'Train corridor generated from the city rail network. For timetable-level precision, connect to a live railway data provider.'
      });
    }

    return res.json({
      mode,
      routes: [],
      message: `${mode === 'train' ? 'Train' : 'Flight'} schedules and exact corridors need a timetable provider. Road routing is available for driving and walking.`
    });
  }

  try {
    let routes;

    if (mode === 'walking') {
      const locations = [sourceCoordinates, destinationCoordinates]
        .map(([lat, lon]) => ({ lat, lon }));
      const response = await fetch('https://valhalla1.openstreetmap.de/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations,
          costing: 'pedestrian',
          directions_options: { units: 'kilometers' }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(422).json({ message: data.error || 'Walking route is unavailable for this distance.' });
      }

      routes = [{
        id: 'walking',
        label: 'Walking route',
        distance: data.trip.summary.length,
        duration: data.trip.summary.time * 60,
        geometry: decodeValhallaShape(data.trip.legs[0].shape)
      }];
    } else {
      const [sourceLat, sourceLon] = sourceCoordinates;
      const [destinationLat, destinationLon] = destinationCoordinates;
      const url = `https://router.project-osrm.org/route/v1/driving/${sourceLon},${sourceLat};${destinationLon},${destinationLat}?overview=full&geometries=geojson&alternatives=true&steps=false`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.code !== 'Ok') {
        return res.status(502).json({ message: 'The road routing service is unavailable.' });
      }

      routes = data.routes.map((route, index) => ({
        id: `driving-${index}`,
        label: index === 0 ? 'Fastest driving route' : `Alternative driving route ${index}`,
        distance: route.distance / 1000,
        duration: route.duration,
        geometry: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude])
      }));
    }

    return res.json({ mode, routes });
  } catch (error) {
    return res.status(502).json({ message: 'Unable to reach the routing service right now.' });
  }
});

function decodeValhallaShape(encodedShape) {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encodedShape.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encodedShape.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encodedShape.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;
    coordinates.push([latitude / 1e6, longitude / 1e6]);
  }

  return coordinates;
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
