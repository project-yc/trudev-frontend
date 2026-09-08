import userApi from '../../users/services/api';
import { unwrapData } from '../../users/services/unwrap';

// `userApi` is `authAxios`, whose response interceptor already returns the
// HTTP body. The B2C report views return the payload bare (no ApiResponse
// envelope), so `unwrapData` is a no-op here — it is only kept for the case
// where the endpoint is ever moved behind the envelope.
export const getSessionAnalyticsReport = async (sessionId) => {
  const response = await userApi.get(`/api/v1/analytics/reports/${sessionId}`);

  return unwrapData(response);
};

export const queueSessionAnalyticsReport = async (sessionId) => {
  const response = await userApi.post(`/api/v1/analytics/reports/${sessionId}/queue`);

  return unwrapData(response);
};