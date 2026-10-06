const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateShortestPath, buildGraph, buildRailwayPath } = require('./graph');

test('buildGraph creates adjacency list from city roads', () => {
  const graph = buildGraph({
    A: [{ city: 'B', distance: 2 }, { city: 'C', distance: 5 }],
    B: [{ city: 'C', distance: 1 }],
    C: []
  });

  assert.deepEqual(graph.A, [{ city: 'B', distance: 2 }, { city: 'C', distance: 5 }]);
  assert.deepEqual(graph.B, [{ city: 'C', distance: 1 }]);
});

test('calculateShortestPath finds a valid shortest route and distance', () => {
  const graph = buildGraph({
    A: [{ city: 'B', distance: 2 }, { city: 'C', distance: 8 }],
    B: [{ city: 'C', distance: 3 }, { city: 'D', distance: 4 }],
    C: [{ city: 'D', distance: 1 }],
    D: []
  });

  const result = calculateShortestPath(graph, 'A', 'D');

  assert.equal(result.distance, 6);
  assert.deepEqual(result.path[0], 'A');
  assert.deepEqual(result.path[result.path.length - 1], 'D');
  assert.ok(result.path.length >= 2);
  assert.equal(result.distance, result.path.slice(1).reduce((sum, city, index, arr) => {
    const prev = result.path[index];
    const edge = graph[prev].find((neighbor) => neighbor.city === city);
    return sum + (edge ? edge.distance : 0);
  }, 0));
});

test('calculateShortestPath returns no path when disconnected', () => {
  const graph = buildGraph({
    A: [{ city: 'B', distance: 2 }],
    B: [],
    C: [{ city: 'D', distance: 3 }],
    D: []
  });

  const result = calculateShortestPath(graph, 'A', 'C');

  assert.equal(result.distance, Infinity);
  assert.deepEqual(result.path, []);
});

test('buildRailwayPath generates a smooth corridor between connected cities', () => {
  const path = ['Jaipur', 'Delhi', 'Agra'];
  const cityCoordinates = {
    Jaipur: [26.9124, 75.7873],
    Delhi: [28.6139, 77.209],
    Agra: [27.1767, 78.0081]
  };

  const geometry = buildRailwayPath(path, cityCoordinates);

  assert.ok(Array.isArray(geometry));
  assert.ok(geometry.length > 2);
  assert.deepEqual(geometry[0], [26.9124, 75.7873]);
  assert.deepEqual(geometry[geometry.length - 1], [27.1767, 78.0081]);
});
