import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/Layout/AppShell';

import HomeFeed from './pages/HomeFeed';
import ReportIssue from './pages/ReportIssue';
import TrackComplaint from './pages/TrackComplaint';
import ExplorePage from './pages/ExplorePage';
import Activity from './pages/Activity';
import Dashboard from './pages/Dashboard';
import PerformanceIndex from './pages/PerformanceIndex';
import OfficerDashboard from './pages/OfficerDashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/track" element={<TrackComplaint />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/performance" element={<PerformanceIndex />} />
            <Route path="/officer" element={<OfficerDashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AuthProvider>
  );
}
