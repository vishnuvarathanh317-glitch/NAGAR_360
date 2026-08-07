import React, { useState, useEffect } from 'react';
import { fetchHeatmapData } from '../services/api';
import CivicMap from '../components/Map/CivicMap';
import IssueCard from '../components/Feed/IssueCard';

export default function ExplorePage() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadMap();
  }, [filter]);

  async function loadMap() {
    setLoading(true);
    try {
      const filters = {};
      if (filter) filters.category = filter;
      const data = await fetchHeatmapData(filters);
      setMarkers(data.markers || []);
    } catch (err) {
      console.error('Map load error:', err);
    }
    setLoading(false);
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">🗺️ Explore Issues</h1>
        <p className="section-subtitle">Civic issues mapped across the city</p>
      </div>

      {/* Filter */}
      <div style={{ padding: '0 16px 12px' }}>
        <select
          className="input-field"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="pothole">🕳️ Pothole</option>
          <option value="garbage_accumulation">🗑️ Garbage</option>
          <option value="overflowing_bin">♻️ Overflowing Bin</option>
          <option value="broken_streetlight">💡 Broken Light</option>
          <option value="water_leakage">💧 Water Leakage</option>
          <option value="open_drainage">🚰 Open Drainage</option>
          <option value="fallen_tree">🌳 Fallen Tree</option>
          <option value="road_obstruction">🚧 Road Block</option>
        </select>
      </div>

      {/* Map */}
      <div style={{ padding: '0 16px 16px' }}>
        {loading ? (
          <div className="skeleton" style={{ width: '100%', height: 350, borderRadius: 16 }} />
        ) : (
          <CivicMap markers={markers} height="350px" zoom={12} />
        )}
      </div>

      {/* Issues Grid */}
      <div className="section-header">
        <h2 className="section-title" style={{ fontSize: '0.95rem' }}>
          {markers.length} issues found
        </h2>
      </div>

      {markers.map((m, i) => (
        <IssueCard key={m.id || i} issue={m} />
      ))}
    </div>
  );
}
