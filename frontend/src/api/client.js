const API_BASE = "http://127.0.0.1:8000";

export function saveToken(token) {
  localStorage.setItem("access_token", token);
}

export function getToken() {
  return localStorage.getItem("access_token");
}

export function clearToken() {
  localStorage.removeItem("access_token");
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    return;
  }

  return response.json();
}

export async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("เข้าสู่ระบบไม่สำเร็จ");
  const data = await response.json();
  saveToken(data.access_token);
  return data;
}

export async function register(name, email, password, role) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  if (!response.ok) throw new Error("สมัครสมาชิกไม่สำเร็จ");
  return response.json();
}

export async function getProjects() {
  return apiFetch("/projects/");
}

export async function createProject(name, description) {
  return apiFetch("/projects/", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}