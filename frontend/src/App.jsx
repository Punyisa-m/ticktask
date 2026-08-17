import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import Kanban from "./pages/Kanban";
import Team from "./pages/Team";
import MyTasks from "./pages/MyTasks";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Overview />} />
        <Route path="/projects" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/kanban" element={<Kanban />} />
        <Route path="/team" element={<Team />} />
        <Route path="/" element={<Login />} />
        <Route path="/my-tasks" element={<MyTasks />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;