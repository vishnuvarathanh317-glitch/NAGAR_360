import React, { useState, useEffect } from 'react';
import { fetchDashboardStats, fetchTrends } from '../services/api';
import { Link } from 'react-router-dom';
import StatCard from '../components/Common/StatCard';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const COLORS = ['#0095f6', '#ed4956', '#ffab00', '#00c853', '#a855f7', '#ff6d00', '#00bcd4'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsData, trendsData] = await Promise.all([
        fetchDashboardStats(),
        fetchTrends().catch(() => ({ timeline: [] }))
      ]);
      setStats(statsData);
      setTrends(trendsData.timeline || []);
    } catch (err) {
      console.error('Dashboard error:', err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="page-container page-container--wide" style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  if (!stats) return null;

  const { summary, categories, departmentStats } = stats;

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <h1 className="page-header__title">📊 Transparency Dashboard</h1>
        <p className="page-header__subtitle">
          Real-time civic performance data — open to all citizens
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard title="Total Issues" value={summary.totalIssues} color="blue" />
        <StatCard title="Resolved" value={summary.resolved} subtitle={`${summary.resolutionRate}% rate`} color="green" />
        <StatCard title="Pending" value={summary.pending} color="amber" />
        <StatCard title="Overdue" value={summary.overdue} color="red" />
      </div>

      {/* Avg Resolution */}
      <div style={{ padding: '0 16px 16px', textAlign: 'center' }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            AVERAGE RESOLUTION TIME
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {summary.avgResolutionDays} days
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, padding: '0 16px 16px' }}>
        {/* Category Donut */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>Issue Categories</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categories || []}
                dataKey="count"
                nameKey="category"
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {(categories || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e1e1e', border: '1px solid #363636',
                  borderRadius: 8, color: '#fafafa'
                }}
                formatter={(value, name) => [value, name?.replace(/_/g, ' ')]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {(categories || []).map((c, i) => (
              <span key={i} style={{
                fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: COLORS[i % COLORS.length], display: 'inline-block'
                }} />
                {c.category?.replace(/_/g, ' ')} ({c.count})
              </span>
            ))}
          </div>
        </div>

        {/* Trend Line */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>30-Day Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends}>
              <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fill: '#737373', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: '#1e1e1e', border: '1px solid #363636',
                  borderRadius: 8, color: '#fafafa'
                }}
              />
              <Line type="monotone" dataKey="submitted" stroke="#0095f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="resolved" stroke="#00c853" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.72rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 3, background: '#0095f6', borderRadius: 2 }} /> Submitted
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 3, background: '#00c853', borderRadius: 2 }} /> Resolved
            </span>
          </div>
        </div>
      </div>

      {/* Department Table */}
      <div style={{ padding: '0 16px 24px' }}>
        <div className="card" style={{ overflow: 'auto' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, padding: 16, marginBottom: 0 }}>
            🏢 Department Accountability
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Total</th>
                <th>Resolved</th>
                <th>Overdue</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {(departmentStats || []).map((d, i) => {
                const eff = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.name}</td>
                    <td>{d.total}</td>
                    <td style={{ color: 'var(--accent-green)' }}>{d.resolved}</td>
                    <td style={{ color: d.overdue > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                      {d.overdue}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 60, height: 6, background: 'var(--bg-elevated)',
                          borderRadius: 3, overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${eff}%`, height: '100%',
                            background: eff > 70 ? 'var(--accent-green)' : eff > 40 ? 'var(--accent-amber)' : 'var(--accent-red)',
                            borderRadius: 3
                          }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{eff}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Links */}
      <div style={{ padding: '0 16px 24px', display: 'flex', gap: 12 }}>
        <Link to="/performance" className="btn btn-secondary btn--full">
          🏆 Performance Index
        </Link>
        <Link to="/explore" className="btn btn-secondary btn--full">
          🗺️ Civic Map
        </Link>
      </div>
    </div>
  );
}
