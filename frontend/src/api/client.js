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

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail || `An error occurred. (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("Login failed.");
  const data = await response.json();
  saveToken(data.access_token);

  const me = await getMe();
  saveUserInfo(me);

  return data;
}

export async function register(name, email, password, role) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  if (!response.ok) throw new Error("Registration failed.");
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

export async function getProject(projectId) {
  const projects = await getProjects();
  return projects.find((p) => p.id === parseInt(projectId));
}

export async function getRequirements(projectId) {
  return apiFetch(`/projects/${projectId}/requirements`);
}

export async function createRequirement(projectId, rawText) {
  return apiFetch(`/projects/${projectId}/requirements`, {
    method: "POST",
    body: JSON.stringify({ raw_text: rawText }),
  });
}

export async function analyzeRequirement(projectId, requirementId) {
  return apiFetch(`/projects/${projectId}/requirements/${requirementId}/analyze`, {
    method: "POST",
  });
}

export async function confirmTasks(projectId, requirementId, tasks) {
  return apiFetch(`/projects/${projectId}/requirements/${requirementId}/tasks/confirm`, {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });
}

export async function getTasks(projectId) {
  return apiFetch(`/projects/${projectId}/tasks`);
}

export async function updateTask(taskId, data) {
  return apiFetch(`/projects/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function chatWithProject(projectId, question) {
  return apiFetch(`/projects/${projectId}/chat`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function assignTaskAI(taskId) {
  return apiFetch(`/tasks/${taskId}/assign`, {
    method: "POST",
  });
}

export async function getUsers() {
  return apiFetch("/users");
}

export async function getUserSkills(userId) {
  return apiFetch(`/users/${userId}/skills`);
}

export async function getSkills() {
  return apiFetch("/skills");
}

export async function createSkill(name) {
  return apiFetch("/skills", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function addUserSkill(userId, skillId, level = 1) {
  return apiFetch(`/users/${userId}/skills`, {
    method: "POST",
    body: JSON.stringify({ skill_id: skillId, level }),
  });
}

export async function addProjectMember(projectId, userId, role = "member") {
  return apiFetch(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export async function getAllTasks() {
  const projects = await getProjects();
  const allTasks = await Promise.all(projects.map((p) => getTasks(p.id)));
  return allTasks.flat();
}

export async function getMe() {
  return apiFetch("/auth/me");
}

export function saveUserInfo(user) {
  localStorage.setItem("user_role", user.role);
  localStorage.setItem("user_department_id", user.department_id || "");
  localStorage.setItem("user_id", user.id);
}

export function getUserRole() {
  return localStorage.getItem("user_role");
}

export function isDepartmentHead() {
  const role = getUserRole();
  return role === "department_head" || role === "superadmin";
}

export async function suggestAssignments(projectId, requirementId, tasks) {
  return apiFetch(`/projects/${projectId}/requirements/${requirementId}/tasks/suggest-assignments`, {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });
}

export async function getProjectMembers(projectId) {
  return apiFetch(`/projects/${projectId}/members`);
}

export async function deleteTask(taskId) {
  return apiFetch(`/projects/tasks/${taskId}`, { method: "DELETE" });
}

export async function deleteProject(projectId) {
  return apiFetch(`/projects/${projectId}`, { method: "DELETE" });
}