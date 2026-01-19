import React, { useState, useEffect } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
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

// CONFIGURATION (Matches your latest images)
const imageHeight = 1000; 
const imageWidth = 1000; 

// --- SUB-COMPONENTS ---
const FitMapToScreen = ({ bounds }) => {
  const map = useMap();
  useEffect(() => { map.fitBounds(bounds, { padding: [0,0] }); }, [map, bounds]);
  return null;
};

const ZoomControls = () => {
  const map = useMap();
  return (
    <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <button onClick={() => map.zoomIn()} style={btnStyle}>+</button>
      <button onClick={() => map.zoomOut()} style={btnStyle}>-</button>
    </div>
  );
};
const btnStyle = { width: '40px', height: '40px', fontSize: '20px', fontWeight: 'bold', background: 'white', border: 'none', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer' };

const LocationFinder = () => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      console.log(`"x": ${Math.round(lng)}, "y": ${Math.round(lat)}`);
    },
  });
  return null;
};

// --- MAIN COMPONENT ---
const IndoorMap = () => {
  const bounds = [[0, 0], [imageHeight, imageWidth]];
  
  // STATE
  const [currentFloor, setCurrentFloor] = useState(1);
  const [activeRoute, setActiveRoute] = useState(null); 
  const [startNode, setStartNode] = useState('f1_reception'); 
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('start');
    if (startParam) {
      setStartNode(startParam);
      const startNodeData = navData.nodes.find(n => n.id === startParam);
      if (startNodeData) setCurrentFloor(startNodeData.floor);
    }
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 0) {
      const results = navData.nodes.filter(node => 
        node.name.toLowerCase().includes(term.toLowerCase()) && node.type === 'poi'
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleNavigate = (destinationId) => {
    const result = findPath(startNode, destinationId);
    if (result) {
      setActiveRoute(result);
      const startObj = navData.nodes.find(n => n.id === startNode);
      if(startObj) setCurrentFloor(startObj.floor);
      setSearchResults([]);
      setSearchTerm("");
    }
  };

  const currentFloorPath = activeRoute 
    ? activeRoute.coordinates
        .filter(node => node.floor === currentFloor)
        .map(node => [node.y, node.x])
    : [];

  const floorImage = currentFloor === 1 ? '/floor1.jpg' : '/floor2.jpg';

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      
      {/* SEARCH BAR */}
      <div className="search-container">
        <input 
          type="text" placeholder="Search for a room..." className="search-input"
          value={searchTerm} onChange={handleSearch}
        />
        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map(node => (
              <li key={node.id} className="search-item" onClick={() => handleNavigate(node.id)}>
                {node.name} (Floor {node.floor})
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FLOOR SWITCHER */}
      <div style={{ position: 'absolute', top: '80px', right: '20px', zIndex: 1000, display: 'flex', gap: '5px' }}>
        {[1, 2].map(floor => (
          <button
            key={floor} onClick={() => setCurrentFloor(floor)}
            style={{ padding: '10px 15px', border: 'none', borderRadius: '8px', fontWeight: 'bold', background: currentFloor === floor ? '#007bff' : 'white', color: currentFloor === floor ? 'white' : '#333', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer' }}
          >
            Floor {floor}
          </button>
        ))}
      </div>

      {/* --- TURN BY TURN NAVIGATION PANEL --- */}
      {activeRoute && (
        <div className="nav-panel">
          <div className="nav-header">
            <span>🏁 {activeRoute.distance} Meters</span>
            <button onClick={() => setActiveRoute(null)} style={{background:'transparent', border:'none', color:'white', fontSize:'20px', cursor:'pointer'}}>×</button>
          </div>
          <ul className="nav-steps">
            {activeRoute.steps.map((step, idx) => (
              <li key={idx} className="nav-step">
                <span style={{fontSize: '24px'}}>{step.icon}</span>
                <div style={{display:'flex', flexDirection:'column'}}>
                  <span style={{fontWeight: '500'}}>{step.text}</span>
                  {step.distance > 0 && <span style={{fontSize:'12px', color:'#666'}}>For {step.distance} meters</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MAP */}
      <MapContainer key={currentFloor} crs={L.CRS.Simple} bounds={bounds} minZoom={-3} maxZoom={3} zoomControl={false} style={{ height: "100%", width: "100%" }}>
        <FitMapToScreen bounds={bounds} />
        <ImageOverlay url={floorImage} bounds={bounds} />
        <ZoomControls />
        <LocationFinder />

        {/* Markers */}
        {navData.nodes
          .filter(n => n.floor === currentFloor && (n.type === 'poi' || n.type === 'connector'))
          .map(poi => (
            <Marker key={poi.id} position={[poi.y, poi.x]}>
              <Popup>
                <b>{poi.name}</b> <br/>
                <button onClick={() => handleNavigate(poi.id)} style={{marginTop: '5px', padding: '5px 10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}}>
                  Navigate Here
                </button>
              </Popup>
            </Marker>
        ))}

        {/* Path */}
        {currentFloorPath.length > 0 && (
          <Polyline 
            positions={currentFloorPath} 
            pathOptions={{ color: '#007bff', weight: 8, opacity: 0.8, dashArray: '10, 10', className: 'walking-path' }} 
          />
        )}
      </MapContainer>
    </div>
  );
};

export default IndoorMap;