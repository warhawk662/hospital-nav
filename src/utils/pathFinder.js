import createGraph from 'ngraph.graph';
import path from 'ngraph.path';
import navData from '../data/nav_data.json';

const graph = createGraph();

// 1. Add Nodes with their Floor data
navData.nodes.forEach(node => {
  graph.addNode(node.id, { x: node.x, y: node.y, floor: node.floor });
});

// 2. Add Links with Accessibility data
navData.edges.forEach(edge => {
  graph.addLink(edge.start, edge.end, { type: edge.type });
  graph.addLink(edge.end, edge.start, { type: edge.type });
});

// 3. Create the PathFinder
// We create a wrapper function that generates a new finder based on settings
const createPathFinder = (isWheelchair) => {
  return path.aStar(graph, {
    distance(fromNode, toNode, link) {
      // LOGIC: If wheelchair mode is ON and link is STAIRS -> Block it (Infinite distance)
      if (isWheelchair && link.data.type === 'stairs') {
        return Infinity; 
      }
      
      // Standard distance calc
      const dx = fromNode.data.x - toNode.data.x;
      const dy = fromNode.data.y - toNode.data.y;
      const dz = (fromNode.data.floor - toNode.data.floor) * 1000; // Penalize floor switching slightly
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  });
};

export const findPath = (startNodeId, endNodeId, isWheelchair = false) => {
  const pathFinder = createPathFinder(isWheelchair);
  const foundPath = pathFinder.find(startNodeId, endNodeId);

  if (!foundPath || foundPath.length === 0) return [];

  // Return full node objects so we know which floor each point is on
  return foundPath.reverse().map(node => ({
    x: node.data.x,
    y: node.data.y,
    floor: node.data.floor
  }));
};