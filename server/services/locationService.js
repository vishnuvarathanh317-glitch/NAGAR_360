async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
      { headers: { 'User-Agent': 'nagar360-civic-platform/1.0' } }
    );
    const data = await res.json();
    return {
      address: data.display_name || '',
      city: data.address?.city || data.address?.town || data.address?.village || 'Chennai',
      district: data.address?.state_district || data.address?.county || 'Central District',
      ward: data.address?.suburb || data.address?.neighbourhood || '',
      pincode: data.address?.postcode || ''
    };
  } catch (err) {
    console.error('Geocode error:', err.message);
    return {
      address: `${lat}, ${lng}`,
      city: 'Chennai',
      district: 'Central District',
      ward: '',
      pincode: ''
    };
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { reverseGeocode, haversineDistance };
