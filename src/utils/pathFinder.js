import createGraph from 'ngraph.graph';
import path from 'ngraph.path';
import navData from '../data/nav_data.json';

const graph = createGraph();

// Add Nodes
navData.nodes.forEach(node => {
  graph.addNode(node.id, { x: node.x, y: node.y });
});

// Add Edges
navData.edges.forEach(edge => {
  graph.addLink(edge.start, edge.end);
  graph.addLink(edge.end, edge.start);
});

const pathFinder = path.aStar(graph, {
  distance(fromNode, toNode) {
    const dx = fromNode.data.x - toNode.data.x;
    const dy = fromNode.data.y - toNode.data.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
});

export const findPath = (startNodeId, endNodeId) => {
  const foundPath = pathFinder.find(startNodeId, endNodeId);
  if (!foundPath || foundPath.length === 0) return [];
  return foundPath.reverse().map(node => [node.data.y, node.data.x]);
};