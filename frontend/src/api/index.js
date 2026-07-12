import api from './client';

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resetPasswordOTP: (data) => api.post('/auth/reset-password-otp', data),
};

export const vehiclesAPI = {
  getAll: (params) => api.get('/vehicles', { params }),
  getOne: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getAvailable: () => api.get('/vehicles/available/dispatch'),
};

export const driversAPI = {
  getAll: (params) => api.get('/drivers', { params }),
  getOne: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  delete: (id) => api.delete(`/drivers/${id}`),
  getAvailable: () => api.get('/drivers/available/dispatch'),
  sendExpiryReminders: () => api.post('/drivers/send-expiry-reminders'),
};

export const tripsAPI = {
  getAll: (params) => api.get('/trips', { params }),
  getOne: (id) => api.get(`/trips/${id}`),
  create: (data) => api.post('/trips', data),
  dispatch: (id) => api.put(`/trips/${id}/dispatch`),
  complete: (id, data) => api.put(`/trips/${id}/complete`, data),
  cancel: (id) => api.put(`/trips/${id}/cancel`),
};

export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  create: (data) => api.post('/maintenance', data),
  close: (id) => api.put(`/maintenance/${id}/close`),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
};

export const fuelAPI = {
  getAll: (params) => api.get('/fuel', { params }),
  create: (data) => api.post('/fuel', data),
};

export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
};

export const dashboardAPI = {
  getKPIs: (params) => api.get('/dashboard/kpis', { params }),
  getMaintenanceAlerts: () => api.get('/dashboard/maintenance-alerts'),
};

export const settingsAPI = {
  getUsers: () => api.get('/settings/users'),
  createUser: (data) => api.post('/settings/users', data),
  updateUser: (id, data) => api.put(`/settings/users/${id}/toggle`, data),
};

export const reportsAPI = {
  getAnalytics: (params) => api.get('/reports/analytics', { params }),
  exportCSV: (type, params) => api.get(`/reports/export/csv`, { params: { type, ...params }, responseType: 'blob' }),
  exportPDF: (params) => api.get('/reports/export/pdf', { params, responseType: 'blob' }),
};

export const aiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
};

export const healthAPI = {
  check: () => api.get('/health'),
};
