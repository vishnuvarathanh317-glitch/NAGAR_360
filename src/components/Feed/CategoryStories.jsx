import React from 'react';

const CATEGORIES = [
  { key: '', icon: '🔥', label: 'All' },
  { key: 'pothole', icon: '🕳️', label: 'Pothole' },
  { key: 'garbage_accumulation', icon: '🗑️', label: 'Garbage' },
  { key: 'overflowing_bin', icon: '♻️', label: 'Bins' },
  { key: 'broken_streetlight', icon: '💡', label: 'Lights' },
  { key: 'water_leakage', icon: '💧', label: 'Water' },
  { key: 'open_drainage', icon: '🚰', label: 'Drain' },
  { key: 'damaged_footpath', icon: '🚶', label: 'Footpath' },
  { key: 'fallen_tree', icon: '🌳', label: 'Trees' },
  { key: 'road_obstruction', icon: '🚧', label: 'Road' },
  { key: 'damaged_traffic_sign', icon: '🚦', label: 'Signs' },
];

export default function CategoryStories({ activeCategory, onSelect }) {
  return (
    <div className="stories-bar">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.key;
        return (
          <div
            key={cat.key}
            className={`story-item ${isActive ? 'story-item--active' : ''}`}
            onClick={() => onSelect(cat.key)}
          >
            <div className={`story-ring ${isActive ? 'story-ring--active' : 'story-ring--inactive'}`}>
              <div className="story-avatar">
                {cat.icon}
              </div>
            </div>
            <span className="story-label">{cat.label}</span>
          </div>
        );
      })}
    </div>
  );
}
