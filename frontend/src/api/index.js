import api from './axios';

export const authApi = {
  login: (data)           => api.post('/auth/login', data),
  logout: ()              => api.post('/auth/logout'),
  me: ()                  => api.get('/auth/me'),
  changePassword: (data)  => api.put('/auth/change-password', data),
};

export const vehiclesApi = {
  getAll: (params) => api.get('/vehicles', { params }),
  getOne: (id)     => api.get(`/vehicles/${id}`),
  getStats: ()     => api.get('/vehicles/stats'),
  create: (data)   => api.post('/vehicles', data),
  update: (id, d)  => api.put(`/vehicles/${id}`, d),
  remove: (id)     => api.delete(`/vehicles/${id}`),
};

export const driversApi = {
  getAll: (params) => api.get('/drivers', { params }),
  getOne: (id)     => api.get(`/drivers/${id}`),
  create: (data)   => api.post('/drivers', data),
  update: (id, d)  => api.put(`/drivers/${id}`, d),
  remove: (id)     => api.delete(`/drivers/${id}`),
};

export const tripsApi = {
  getAll: (params)        => api.get('/trips', { params }),
  getOne: (id)            => api.get(`/trips/${id}`),
  create: (data)          => api.post('/trips', data),
  update: (id, d)         => api.put(`/trips/${id}`, d),
  updateLocation: (id, d) => api.patch(`/trips/${id}/location`, d),
  remove: (id)            => api.delete(`/trips/${id}`),
};

export const maintenanceApi = {
  getAll: (params) => api.get('/maintenance', { params }),
  getOne: (id)     => api.get(`/maintenance/${id}`),
  create: (data)   => api.post('/maintenance', data),
  update: (id, d)  => api.put(`/maintenance/${id}`, d),
  remove: (id)     => api.delete(`/maintenance/${id}`),
};

export const fuelApi = {
  getAll: (params) => api.get('/fuel', { params }),
  getStats: ()     => api.get('/fuel/stats'),
  create: (data)   => api.post('/fuel', data),
  update: (id, d)  => api.put(`/fuel/${id}`, d),
  remove: (id)     => api.delete(`/fuel/${id}`),
};

export const expensesApi = {
  getAll: (params)  => api.get('/expenses', { params }),
  getSummary: ()    => api.get('/expenses/summary'),
  create: (data)    => api.post('/expenses', data),
  update: (id, d)   => api.put(`/expenses/${id}`, d),
  remove: (id)      => api.delete(`/expenses/${id}`),
};

export const reportsApi = {
  fleetSummary: ()    => api.get('/reports/fleet-summary'),
  expenseSummary: ()  => api.get('/reports/expense-summary'),
  tripAnalysis: (p)   => api.get('/reports/trip-analysis', { params: p }),
  downloadPDF: ()     => api.get('/reports/fleet-summary/pdf', { responseType: 'blob' }),
};

export const dashboardApi = {
  getStats: ()        => api.get('/dashboard/stats'),
  getRecentTrips: ()  => api.get('/dashboard/recent-trips'),
  getExpenseTrend: () => api.get('/dashboard/expense-trend'),
  getActiveTrips: ()  => api.get('/dashboard/active-trips-map'),
};

export const settingsApi = {
  getAll: ()           => api.get('/settings'),
  update: (data)       => api.put('/settings', data),
  getUsers: ()         => api.get('/settings/users'),
  createUser: (data)   => api.post('/settings/users', data),
  updateUser: (id, d)  => api.put(`/settings/users/${id}`, d),
};

export const aiApi = {
  ask: (message) => api.post('/ai/ask', { message }),
};
