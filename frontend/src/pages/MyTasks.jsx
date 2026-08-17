import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getAllTasks, getProjects, updateTask } from "../api/client";

const columns = [
  { key: "todo", label: "Todo", bg: "bg-[#FFF1E7]" },
  { key: "in_progress", label: "In progress", bg: "bg-[#5EC8F2]/20" },
  { key: "done", label: "Done", bg: "bg-[#8FD98A]/20" },
];

const priorityColor = {
  high: "bg-[#E85D5D] text-white",
  medium: "bg-[#FFD34E] text-[#4A3F35]",
  low: "bg-[#8FD98A] text-[#4A3F35]",
};

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [projectNameMap, setProjectNameMap] = useState({});
  const [draggedTask, setDraggedTask] = useState(null);
  const myId = parseInt(localStorage.getItem("user_id"));

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const projects = await getProjects();
    const nameMap = {};
    projects.forEach((p) => (nameMap[p.id] = p.name));
    setProjectNameMap(nameMap);

    const allTasks = await getAllTasks();
    setTasks(allTasks.filter((t) => t.assigned_to === myId));
  }

  async function handleDrop(newStatus) {
    if (!draggedTask) return;
    await updateTask(draggedTask.id, { status: newStatus });
    setDraggedTask(null);
    loadData();
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-[260px] px-6 lg:px-12 py-8 max-w-7xl mx-auto">
        <h1 className="font-baloo text-3xl text-[#4A3F35] mb-8">My Tasks</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.key)}
                className={`rounded-2xl p-4 ${col.bg} min-h-[400px]`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-baloo text-lg text-[#4A3F35]">{col.label}</h3>
                  <span className="bg-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cartoon-border">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTask(task)}
                      className="bg-white cartoon-border rounded-xl p-4 cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:rotate-1 transition-all"
                    >
                      <span className="text-xs text-[#5EC8F2] font-semibold block mb-1">
                        {projectNameMap[task.project_id] || "Project"}
                      </span>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${priorityColor[task.priority] || priorityColor.medium}`}>
                          {task.priority}
                        </span>
                      </div>
                      <h4 className="font-semibold text-[#4A3F35] text-sm mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-[#A08D7A] mt-1 line-clamp-2">{task.description}</p>
                      )}
                      {task.estimated_hours && (
                        <div className="flex items-center gap-1 text-[#A08D7A] text-xs mt-2">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>{task.estimated_hours} Hr.</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-[#A08D7A]/50 text-sm text-center py-8">No tasks yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}