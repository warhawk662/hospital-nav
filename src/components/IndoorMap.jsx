import React, { useState, useEffect } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import navData from '../data/nav_data.json';
import { findPath } from '../utils/pathFinder';

// Fix icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- COMPONENT: Custom Zoom Controls ---
const ZoomControls = () => {
  const map = useMap();
  return (
    <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <button onClick={() => map.zoomIn()} style={btnStyle}>+</button>
      <button onClick={() => map.zoomOut()} style={btnStyle}>-</button>
    </div>
  );
};

const btnStyle = {
  width: '40px', height: '40px', fontSize: '20px', fontWeight: 'bold',
  background: 'white', border: 'none', borderRadius: '8px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer'
};

const IndoorMap = () => {
  const bounds = [[0, 0], [1000, 1000]];
  
  // STATE
  const [currentFloor, setCurrentFloor] = useState(1);
  const [isWheelchair, setIsWheelchair] = useState(false);
  const [activeRoute, setActiveRoute] = useState([]); // Full route (all floors)
  const [startNode, setStartNode] = useState('reception');

  // Load start param from QR
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('start');
    if (startParam) {
      setStartNode(startParam);
      // Auto-switch floor to where the user is
      const startNodeData = navData.nodes.find(n => n.id === startParam);
      if (startNodeData) setCurrentFloor(startNodeData.floor);
    }
  }, []);

  const handleNavigate = (destinationId) => {
    const fullPath = findPath(startNode, destinationId, isWheelchair);
    setActiveRoute(fullPath);
    
    // Auto-switch floor to START location initially
    const startNodeObj = navData.nodes.find(n => n.id === startNode);
    if(startNodeObj) setCurrentFloor(startNodeObj.floor);
  };

  // FILTER: Get only the path segments for the CURRENT FLOOR
  const currentFloorPath = activeRoute
    .filter(node => node.floor === currentFloor)
    .map(node => [node.y, node.x]); // Format for Leaflet

  // IMAGE: In a real app, you would swap this URL based on currentFloor
  // const floorImage = currentFloor === 1 ? '/floor1.jpg' : '/floor2.jpg';
  const floorImage = '/floor_plan.jpg'; // Using same image for demo

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      
      {/* --- UI OVERLAYS --- */}
      
      {/* Top Left: Wheelchair Toggle */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold'}}>
          <input 
            type="checkbox" 
            checked={isWheelchair} 
            onChange={(e) => setIsWheelchair(e.target.checked)} 
          />
          ♿ Wheelchair Mode
        </label>
      </div>

      {/* Top Right: Floor Switcher */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '5px' }}>
        {[1, 2].map(floor => (
          <button
            key={floor}
            onClick={() => setCurrentFloor(floor)}
            style={{
              padding: '10px 15px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              background: currentFloor === floor ? '#007bff' : 'white',
              color: currentFloor === floor ? 'white' : '#333',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
          >
            Floor {floor}
          </button>
        ))}
      </div>

      {/* --- MAP ENGINE --- */}
      <MapContainer crs={L.CRS.Simple} bounds={bounds} center={[500, 500]} zoom={0} zoomControl={false} style={{ height: "100%", width: "100%" }}>
        
        <ImageOverlay url={floorImage} bounds={bounds} />
        <ZoomControls />

        {/* Render Markers (Only for Current Floor) */}
        {navData.nodes
          .filter(n => n.floor === currentFloor && (n.type === 'poi' || n.type === 'connector'))
          .map(poi => (
            <Marker key={poi.id} position={[poi.y, poi.x]}>
              <Popup>
                <b>{poi.name}</b> <br/>
                <button 
                  onClick={() => handleNavigate(poi.id)}
                  style={{marginTop: '5px', padding: '5px 10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}}
                >
                  Navigate Here
                </button>
              </Popup>
            </Marker>
        ))}

        {/* Render Route Line (Only for Current Floor) */}
        {currentFloorPath.length > 0 && (
          <Polyline 
            positions={currentFloorPath} 
            pathOptions={{ color: isWheelchair ? '#9b59b6' : 'blue', weight: 6 }} 
          />
        )}

      </MapContainer>
    </div>
  );
};

export default IndoorMap;