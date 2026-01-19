import React, { useState, useEffect } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import navData from '../data/nav_data.json';
import { findPath } from '../utils/pathFinder';

// Fix icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- SUB-COMPONENT: Controls the map camera ---
// We need this because we can't call 'map.flyTo' from outside the MapContainer
const MapController = ({ selectPosition }) => {
  const map = useMap();

  useEffect(() => {
    if (selectPosition) {
      map.flyTo([selectPosition.y, selectPosition.x], 1, {
        animate: true,
      });
    }
  }, [selectPosition, map]);

  return null;
};

const IndoorMap = () => {
  const bounds = [[0, 0], [1000, 1000]]; 
  const [activeRoute, setActiveRoute] = useState([]);
  const [startNode, setStartNode] = useState('reception');
  
  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Handle URL params for QR codes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('start');
    if (startParam) setStartNode(startParam);
  }, []);

  // Handle Search Input
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

  // Handle Clicking a Search Result
  const handleSelectResult = (node) => {
    setSelectedLocation(node); // Triggers the flyTo animation
    setSearchTerm(""); // Clear search
    setSearchResults([]); // Clear list
    
    // Optional: Auto-start navigation immediately
    // handleNavigate(node.id); 
  };

  const handleNavigate = (destinationId) => {
    const route = findPath(startNode, destinationId);
    setActiveRoute(route);
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      
      {/* --- SEARCH BAR UI --- */}
      <div className="search-container">
        <input 
          type="text" 
          placeholder="Search for a room..." 
          className="search-input"
          value={searchTerm}
          onChange={handleSearch}
        />
        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map(node => (
              <li key={node.id} className="search-item" onClick={() => handleSelectResult(node)}>
                {node.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- MAP --- */}
      <MapContainer crs={L.CRS.Simple} bounds={bounds} center={[500, 500]} zoom={0} zoomControl={false} style={{ height: "100%", width: "100%" }}>
        
        <ImageOverlay url="/floor_plan.jpg" bounds={bounds} />
        
        {/* The Controller handles zooming to the search result */}
        <MapController selectPosition={selectedLocation} />

        {navData.nodes.filter(n => n.type === 'poi').map(poi => (
          <Marker 
            key={poi.id} 
            position={[poi.y, poi.x]}
            // Auto-open popup if this is the searched location
            ref={(ref) => {
              if (ref && selectedLocation && selectedLocation.id === poi.id) {
                ref.openPopup();
              }
            }}
          >
            <Popup>
              <div style={{textAlign: 'center'}}>
                <b style={{fontSize: '16px'}}>{poi.name}</b>
                <br/>
                <span style={{color: '#666'}}>Floor 1</span>
                <br/>
                <button onClick={() => handleNavigate(poi.id)}>
                  Navigate Here
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {activeRoute.length > 0 && <Polyline positions={activeRoute} pathOptions={{ color: '#007bff', weight: 6, opacity: 0.8 }} />}

      </MapContainer>
    </div>
  );
};

export default IndoorMap;