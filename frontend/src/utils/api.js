import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Event Types
export const getEventTypes = () => api.get('/events/');
export const getAllEventTypes = () => api.get('/events/all');
export const getEventTypeBySlug = (slug) => api.get(`/events/${slug}`);
export const createEventType = (data) => api.post('/events/', data);
export const updateEventType = (id, data) => api.put(`/events/${id}`, data);
export const deleteEventType = (id) => api.delete(`/events/${id}`);
export const bulkAssignSchedule = (data) => api.put('/events/bulk-assign-schedule', data);

// Availability
export const getAvailability = () => api.get('/availability/');
export const getAllSchedules = () => api.get('/availability/all');
export const createSchedule = (data) => api.post('/availability/', data);
export const updateAvailability = (id, data) => api.put(`/availability/${id}`, data);
export const deleteSchedule = (id) => api.delete(`/availability/${id}`);
export const setDefaultSchedule = (id) => api.put(`/availability/${id}/default`, {});
export const addDateOverride = (data) => api.post('/availability/overrides', data);
export const deleteDateOverride = (id) => api.delete(`/availability/overrides/${id}`);

// Bookings
export const getAvailableSlots = (eventSlug, date, timezone) =>
  api.get('/bookings/slots', { params: { event_slug: eventSlug, date, timezone } });
export const createBooking = (data) => api.post('/bookings/', data);

// Meetings
export const getMeetings = (params) => api.get('/meetings/', { params });
export const getMeeting = (id) => api.get(`/meetings/${id}`);
export const getMeetingByToken = (token) => api.get(`/meetings/token/${token}`);
export const cancelMeeting = (id, reason) => api.put(`/meetings/${id}/cancel`, { reason });

export default api;
