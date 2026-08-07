import React, { useState, useEffect } from 'react';
import { fetchComplaints, upvoteComplaint, fetchDashboardStats } from '../services/api';
import CategoryStories from '../components/Feed/CategoryStories';
import IssueCard from '../components/Feed/IssueCard';
import StatCard from '../components/Common/StatCard';

export default function HomeFeed() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
    loadStats();
  }, [activeCategory]);

  async function loadFeed() {
    setLoading(true);
    try {
      const filters = {};
      if (activeCategory) filters.category = activeCategory;
      const data = await fetchComplaints(filters);
      setIssues(data.complaints || []);
    } catch (err) {
      console.error('Feed load error:', err);
    }
    setLoading(false);
  }

  async function loadStats() {
    try {
      const data = await fetchDashboardStats();
      setStats(data.summary);
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  function handleUpvote(id) {
    upvoteComplaint(id).catch(console.error);
  }

  return (
    <div className="page-container">
      {/* Stats Strip */}
      {stats && (
        <div className="stats-grid">
          <StatCard title="Total Issues" value={stats.totalIssues} color="blue" />
          <StatCard title="Resolved" value={stats.resolved} subtitle={`${stats.resolutionRate}%`} color="green" />
          <StatCard title="Pending" value={stats.pending} color="amber" />
          <StatCard title="Overdue" value={stats.overdue} color="red" />
        </div>
      )}

      {/* Category Stories */}
      <CategoryStories
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* Feed */}
      <div>
        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div className="skeleton" style={{ width: '100%', height: 300, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: '100%', height: 300 }} />
          </div>
        ) : issues.length === 0 ? (
          <div style={{
            padding: '60px 16px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: '0.9rem'
          }}>
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>📷</p>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No issues found</p>
            <p>Be the first to report a civic issue!</p>
          </div>
        ) : (
          issues.map((issue, i) => (
            <div key={issue.id || i} style={{ animationDelay: `${i * 0.05}s` }}>
              <IssueCard issue={issue} onUpvote={handleUpvote} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
