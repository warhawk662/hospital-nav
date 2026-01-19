import createGraph from 'ngraph.graph';
import path from 'ngraph.path';
import navData from '../data/nav_data.json';

const graph = createGraph();

// 1. Add Nodes
navData.nodes.forEach(node => {
  graph.addNode(node.id, { x: node.x, y: node.y, floor: node.floor, name: node.name });
});

// 2. Add Links
navData.edges.forEach(edge => {
  graph.addLink(edge.start, edge.end, { type: edge.type });
  graph.addLink(edge.end, edge.start, { type: edge.type });
});

// 3. Path Calculator
const pathFinder = path.aStar(graph, {
  distance(fromNode, toNode, link) {
    if (link.data.type === 'stairs' || link.data.type === 'elevator') {
      return 500; // Heavy penalty for floor switching
    }
    const dx = fromNode.data.x - toNode.data.x;
    const dy = fromNode.data.y - toNode.data.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
});

// --- NEW: Calculate "Turn Left" vs "Turn Right" ---
const getTurnDirection = (p1, p2, p3) => {
  // Calculate angle of incoming line (p1 -> p2)
  const angle1 = Math.atan2(p2.data.y - p1.data.y, p2.data.x - p1.data.x);
  // Calculate angle of outgoing line (p2 -> p3)
  const angle2 = Math.atan2(p3.data.y - p2.data.y, p3.data.x - p2.data.x);
  
  let diff = angle2 - angle1;

  // Normalize angle to -PI to +PI
  while (diff <= -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;

  // Convert to degrees
  const degrees = diff * (180 / Math.PI);

  if (degrees > 30 && degrees < 150) return { text: "Turn Left", icon: "⬅️" };
  if (degrees < -30 && degrees > -150) return { text: "Turn Right", icon: "➡️" };
  
  return null; // Go Straight
};

// --- NEW: Generate Turn-by-Turn Instructions ---
const generateInstructions = (pathNodes) => {
  const steps = [];
  let currentSegmentDist = 0;
  
  // Start Step
  steps.push({ text: `Start at ${pathNodes[0].data.name}`, icon: "📍", distance: 0 });

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const current = pathNodes[i];
    const next = pathNodes[i + 1];
    const nextNext = pathNodes[i + 2];

    // Calc distance between Current and Next
    const dx = next.data.x - current.data.x;
    const dy = next.data.y - current.data.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    currentSegmentDist += dist;

    // 1. Check for Floor Change (High Priority)
    if (current.data.floor !== next.data.floor) {
      steps.push({
        text: `Take ${next.data.name} to Floor ${next.data.floor}`,
        icon: "↕️",
        distance: Math.round(currentSegmentDist / 10)
      });
      currentSegmentDist = 0; // Reset counter after instruction
    }
    
    // 2. Check for Turns (Only if we have a 3rd point)
    else if (nextNext) {
      // Check if we turn at the "Next" node
      const turn = getTurnDirection(current, next, nextNext);
      
      if (turn) {
        // We found a turn! Push the instruction.
        steps.push({
          text: `Go straight, then ${turn.text} at ${next.data.name.includes("Corner") ? "the corner" : next.data.name}`,
          icon: turn.icon,
          distance: Math.round(currentSegmentDist / 10)
        });
        currentSegmentDist = 0; // Reset counter
      }
    }

    // 3. Arrival Check (If next is destination)
    if (i === pathNodes.length - 2) {
      steps.push({
        text: `Arrive at ${next.data.name}`,
        icon: "🏁",
        distance: Math.round(currentSegmentDist / 10)
      });
    }
  }

  // Filter out 0-meter steps (instant turns)
  return { path: pathNodes, steps: steps.filter(s => s.distance !== 0 || s.icon === "📍" || s.icon === "🏁") };
};

export const findPath = (startNodeId, endNodeId) => {
  const rawPath = pathFinder.find(startNodeId, endNodeId);
  if (!rawPath || rawPath.length === 0) return null;

  const reversedPath = rawPath.reverse(); 
  const { steps } = generateInstructions(reversedPath);
  
  // Total Distance
  const totalMeters = steps.reduce((sum, step) => sum + (step.distance || 0), 0);

  return {
    coordinates: reversedPath.map(n => ({ x: n.data.x, y: n.data.y, floor: n.data.floor })),
    steps: steps,
    distance: totalMeters
  };
};