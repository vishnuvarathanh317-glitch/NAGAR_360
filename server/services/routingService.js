const { get } = require('../config/database');

const CATEGORY_TO_DEPT = {
  pothole: 'ROAD',
  damaged_footpath: 'ROAD',
  road_obstruction: 'ROAD',
  garbage_accumulation: 'WASTE',
  overflowing_bin: 'WASTE',
  broken_streetlight: 'ELECTRICAL',
  damaged_traffic_sign: 'ELECTRICAL',
  water_leakage: 'WATER',
  open_drainage: 'WATER',
  fallen_tree: 'PARKS',
};

function routeToDepartment(category) {
  const deptCode = CATEGORY_TO_DEPT[category] || 'ROAD';
  const dept = get('SELECT * FROM departments WHERE code = ?', [deptCode]);
  return dept || { id: 1, name: 'Road Maintenance Department', code: 'ROAD' };
}

function assignOfficer(departmentId) {
  // Simple assignment: find an officer in this department
  const officer = get(
    `SELECT * FROM users WHERE role = 'officer' AND department_id = ? LIMIT 1`,
    [departmentId]
  );
  return officer || { id: 2, name: 'Default Officer' };
}

module.exports = { routeToDepartment, assignOfficer, CATEGORY_TO_DEPT };
