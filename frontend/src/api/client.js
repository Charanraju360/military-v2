/** Shared API client supporting all backend REST endpoints without authentication. */

const API_BASE = "/api";

async function request(url, options = {}) {
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch (_) {}
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export const apiClient = {
  // Events
  fetchEvents: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.append("category", params.category);
    if (params.date_from) query.append("date_from", params.date_from);
    if (params.date_to) query.append("date_to", params.date_to);
    if (params.min_credibility !== undefined && params.min_credibility !== null && params.min_credibility !== "") {
      query.append("min_credibility", params.min_credibility);
    }
    if (params.page) query.append("page", params.page);
    if (params.page_size) query.append("page_size", params.page_size);

    const queryString = query.toString();
    return request(`${API_BASE}/events${queryString ? `?${queryString}` : ""}`);
  },

  fetchEventDetail: (eventId) => request(`${API_BASE}/events/${eventId}`),

  // Search
  searchEvents: (query, mode = "semantic", page = 1, pageSize = 20) => {
    const q = new URLSearchParams({
      query: query || "",
      mode,
      page,
      page_size: pageSize,
    });
    return request(`${API_BASE}/search?${q.toString()}`);
  },

  // Assistant
  sendChatMessage: (message, sessionId = null) =>
    request(`${API_BASE}/assistant/chat`, {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),

  fetchSessionMessages: (sessionId) =>
    request(`${API_BASE}/assistant/sessions/${sessionId}/messages`),

  // Sources
  fetchSources: () => request(`${API_BASE}/sources`),

  createSource: (sourceData) =>
    request(`${API_BASE}/sources`, {
      method: "POST",
      body: JSON.stringify(sourceData),
    }),

  updateSource: (sourceId, sourceData) =>
    request(`${API_BASE}/sources/${sourceId}`, {
      method: "PATCH",
      body: JSON.stringify(sourceData),
    }),

  disableSource: (sourceId) =>
    request(`${API_BASE}/sources/${sourceId}`, {
      method: "DELETE",
    }),

  // Pipeline
  runPipeline: () =>
    request(`${API_BASE}/pipeline/run`, {
      method: "POST",
    }),

  fetchPipelineStatus: () => request(`${API_BASE}/pipeline/status`),

  cleanDatabase: () =>
    request(`${API_BASE}/pipeline/clean-db`, {
      method: "POST",
    }),

  fetchPipelineLogs: (page = 1, pageSize = 20) =>
    request(`${API_BASE}/pipeline/logs?page=${page}&page_size=${pageSize}`),
};
