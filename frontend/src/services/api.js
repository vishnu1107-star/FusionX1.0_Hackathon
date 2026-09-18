const BASE_URL = '/api';

export const api = {
  // Authentication
  studentLogin: async (regNumber) => {
    const res = await fetch(`${BASE_URL}/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reg_number: regNumber })
    });
    return res.json();
  },

  facultyLogin: async (facultyId = 'FAC001') => {
    const res = await fetch(`${BASE_URL}/auth/faculty-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faculty_id: facultyId })
    });
    return res.json();
  },

  getDemoStudents: async () => {
    const res = await fetch(`${BASE_URL}/auth/demo-students`);
    return res.json();
  },

  // Student Endpoints
  getStudentDashboard: async (regNumber) => {
    const res = await fetch(`${BASE_URL}/student/${regNumber}/dashboard`);
    return res.json();
  },

  getStudentApplications: async (regNumber) => {
    const res = await fetch(`${BASE_URL}/student/${regNumber}/history`);
    return res.json();
  },

  getStudentActivities: async (regNumber) => {
    const res = await fetch(`${BASE_URL}/extracurricular/student/${regNumber}/activities`);
    return res.json();
  },

  getBonafideHistory: async (regNumber) => {
    const res = await fetch(`${BASE_URL}/bonafide/student/${regNumber}/history`);
    return res.json();
  },

  // Applications (OD & Leave)
  applyOD: async (formData) => {
    const res = await fetch(`${BASE_URL}/od/apply`, {
      method: 'POST',
      body: formData // multipart/form-data
    });
    return res.json();
  },

  applyLeave: async (formData) => {
    const res = await fetch(`${BASE_URL}/leave/apply`, {
      method: 'POST',
      body: formData // multipart/form-data
    });
    return res.json();
  },

  // Faculty Endpoints
  getFacultyStats: async () => {
    const res = await fetch(`${BASE_URL}/faculty/dashboard-stats`);
    return res.json();
  },

  getRiskWatchlist: async () => {
    const res = await fetch(`${BASE_URL}/faculty/watchlist`);
    return res.json();
  },

  getAllApplications: async () => {
    const res = await fetch(`${BASE_URL}/faculty/all`);
    return res.json();
  },

  takeFacultyAction: async (type, id, action, remarks = '') => {
    const res = await fetch(`${BASE_URL}/faculty/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, action, remarks })
    });
    return res.json();
  },

  // General Class Updates
  getClassUpdates: async () => {
    const res = await fetch(`${BASE_URL}/class-updates/all`);
    return res.json();
  },

  publishClassUpdate: async (formData) => {
    const res = await fetch(`${BASE_URL}/class-updates/publish`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  // Extracurricular Activities
  addExtracurricular: async (formData) => {
    const res = await fetch(`${BASE_URL}/extracurricular/add`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  getFacultyExtracurricularList: async () => {
    const res = await fetch(`${BASE_URL}/extracurricular/faculty/all`);
    return res.json();
  },

  verifyExtracurricular: async (actId, status, remarks = '') => {
    const res = await fetch(`${BASE_URL}/extracurricular/${actId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, remarks })
    });
    return res.json();
  },

  // Bonafide Certificate
  generateBonafide: async (regNumber, purpose) => {
    const res = await fetch(`${BASE_URL}/bonafide/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reg_number: regNumber, purpose })
    });
    return res.json();
  }
};
