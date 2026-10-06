import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const cityIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const defaultForm = {
  source: '',
  destination: '',
  mode: 'driving'
};

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

function RouteViewport({ route }) {
  const map = useMap();

  useEffect(() => {
    const points = route || [];

    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, route]);

  return null;
}

function App() {
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [routeNotice, setRouteNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/cities');
      const data = await response.json();
      setCities(data.cities || []);
      if (data.cities?.length) {
        setForm({
          source: data.cities[0],
          destination: data.cities[1] || data.cities[0],
          mode: 'driving'
        });
      }
    } catch (err) {
      setError('Unable to load cities. Please start the backend server.');
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setRouteOptions([]);
    setSelectedRoute(0);
    setRouteNotice('');

    try {
      const shortestPathResponse = await fetch('/api/shortest-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      const routeResponse = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await shortestPathResponse.json();
      const routeData = await routeResponse.json();

      if (!shortestPathResponse.ok) {
        throw new Error(data.message || 'Unable to calculate route.');
      }

      setResult(data);
      if (!routeResponse.ok) {
        throw new Error(routeData.message || 'Unable to calculate map route.');
      }
      setRouteOptions(routeData.routes || []);
      setRouteNotice(routeData.message || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeRoute = routeOptions[selectedRoute];
  const activeRouteCoordinates = activeRoute?.geometry || [];

  return (
    <div className="page-shell">
      <aside className="sidebar">
        <header className="header-block">
          <p className="eyebrow"></p>
          <h1>City Route Planner</h1>
          <p className="subtitle"></p>
        </header>

        <form onSubmit={handleSubmit} className="route-form">
          <label>
            Source City
            <select name="source" value={form.source} onChange={handleChange}>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label>
            Destination City
            <select name="destination" value={form.destination} onChange={handleChange}>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <fieldset className="mode-fieldset">
            <legend>Travel mode</legend>
            <div className="mode-grid">
              {[
                ['driving', 'Driving'],
                ['walking', 'Walking'],
                ['train', 'Train'],
                ['flight', 'Flight']
              ].map(([value, label]) => (
                <label key={value} className="mode-option">
                  <input type="radio" name="mode" value={value} checked={form.mode === value} onChange={handleChange} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" disabled={loading || cities.length === 0}>
            {loading ? 'Calculating...' : 'Find Shortest Path'}
          </button>
        </form>

        {error && <div className="message error">{error}</div>}
        {routeNotice && <div className="message notice">{routeNotice}</div>}

        {routeOptions.length > 0 && (
          <div className="route-options">
            <p className="section-label">Choose a route</p>
            {routeOptions.map((route, index) => (
              <button
                key={route.id}
                type="button"
                className={`route-option ${selectedRoute === index ? 'selected' : ''}`}
                onClick={() => setSelectedRoute(index)}
              >
                <span>
                  <strong>{route.label}</strong>
                  <small>{route.duration ? `${Math.round(route.duration / 60)} min` : 'Schedule unavailable'}</small>
                </span>
                <strong>{route.distance.toFixed(1)} km</strong>
              </button>
            ))}
          </div>
        )}

        {result && (
          <div className="result-panel">
            <div className="stat-row">
              <span>Route</span>
              <strong>{result.path.join(' → ')}</strong>
            </div>
            <div className="stat-row">
              <span>Graph distance</span>
              <strong>{result.distance} km</strong>
            </div>
            {activeRoute && <div className="stat-row"><span>Selected map route</span><strong>{activeRoute.distance.toFixed(1)} km</strong></div>}
          </div>
        )}
      </aside>

      <main className="map-workspace">
        <div className="map-header">
          <div>
            <p className="eyebrow">Live route view</p>
            <h2>City Route Map</h2>
          </div>
          <span className="map-status">{activeRoute ? 'Road route selected' : result ? 'Route calculated' : 'Select two cities'}</span>
        </div>

        <div className="map-canvas">
          <MapContainer
            center={[22.5, 79.5]}
            zoom={5}
            minZoom={4}
            className="route-map"
            aria-label="OpenStreetMap city route map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <RouteViewport route={activeRouteCoordinates} />

            {Object.entries(cityCoordinates).map(([city, coordinates]) => {
              const isOnRoute = result?.path.includes(city);

              return (
                <Marker key={city} position={coordinates} icon={cityIcon}>
                  <Popup>
                    <strong>{city}</strong>
                    {isOnRoute && <div>Included in current route</div>}
                  </Popup>
                </Marker>
              );
            })}

            {activeRouteCoordinates.length > 1 && (
              <Polyline
                positions={activeRouteCoordinates}
                pathOptions={{
                  color: form.mode === 'train' ? '#c2410c' : '#ef4444',
                  weight: form.mode === 'train' ? 7 : 6,
                  opacity: 1
                }}
              />
            )}
          </MapContainer>
        </div>
      </main>
    </div>
  );
}

export default App;
