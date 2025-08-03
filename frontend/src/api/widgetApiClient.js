import axios from 'axios';

const widgetApiClient = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default widgetApiClient;