const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('nagar360_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function submitComplaint(formData) {
  const res = await fetch(`${API_BASE}/complaints/submit`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit complaint');
  }
  return res.json();
}

export async function trackComplaint(complaintId) {
  const res = await fetch(`${API_BASE}/complaints/track/${complaintId}`);
  if (!res.ok) throw new Error('Complaint not found');
  return res.json();
}

export async function fetchComplaints(filters = {}) {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${API_BASE}/complaints/list?${params}`);
  if (!res.ok) throw new Error('Failed to fetch complaints');
  return res.json();
}

export async function upvoteComplaint(id) {
  const res = await fetch(`${API_BASE}/complaints/${id}/upvote`, { method: 'POST' });
  return res.json();
}

export async function verifyComplaint(id, verification, comments) {
  const res = await fetch(`${API_BASE}/complaints/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ verification, comments })
  });
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchHeatmapData(filters = {}) {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${API_BASE}/dashboard/heatmap?${params}`);
  if (!res.ok) throw new Error('Failed to fetch heatmap data');
  return res.json();
}

export async function fetchTrends() {
  const res = await fetch(`${API_BASE}/dashboard/trends`);
  if (!res.ok) throw new Error('Failed to fetch trends');
  return res.json();
}

export async function fetchPerformanceRankings(type = 'department') {
  const res = await fetch(`${API_BASE}/performance/rankings?type=${type}`);
  if (!res.ok) throw new Error('Failed to fetch performance rankings');
  return res.json();
}

export async function fetchOfficerQueue(filters = {}) {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${API_BASE}/officers/queue?${params}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch officer queue');
  return res.json();
}

export async function updateOfficerStatus(id, status, notes) {
  const res = await fetch(`${API_BASE}/officers/complaints/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ status, notes })
  });
  return res.json();
}

export async function resolveComplaintWithProof(id, formData) {
  const res = await fetch(`${API_BASE}/officers/complaints/${id}/resolve`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData
  });
  return res.json();
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}
