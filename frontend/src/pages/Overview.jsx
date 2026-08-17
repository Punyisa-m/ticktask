import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getProjects, getAllTasks } from "../api/client";
import { apiFetch } from "../api/client";

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myTasks, setMyTasks] = useState([]);
  const myId = parseInt(localStorage.getItem("user_id"));
  const [memberWorkload, setMemberWorkload] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const projects = await getProjects();
    const tasks = await getAllTasks();
    
    setMyTasks(tasks.filter((t) => t.assigned_to === myId && t.status !== "done"));

    const completed = projects.filter((p) => p.status === "completed").length;
    const active = projects.length - completed;

    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const pendingTasks = tasks.filter((t) => t.status !== "done").length;

    const workloadMap = {};
    tasks.forEach((t) => {
      if (t.assigned_to && t.status !== "done") {
        workloadMap[t.assigned_to] = (workloadMap[t.assigned_to] || 0) + 1;
      }
    });
    const topWorker = Object.entries(workloadMap).sort((a, b) => b[1] - a[1])[0];

    let topWorkerName = null;
    if (topWorker) {
      try {
        const members = await apiFetch("/department/members");
        const found = (members || []).find((m) => m.id === parseInt(topWorker[0]));
        topWorkerName = found?.name || `User ${topWorker[0]}`;
      } catch {
        topWorkerName = `User ${topWorker[0]}`;
      }
    }
    try {
      const members = await apiFetch("/department/members");
      const workload = (members || [])
        .map((m) => ({
          name: m.name,
          count: workloadMap[m.id] || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setMemberWorkload(workload);
    } catch {
      setMemberWorkload([]);
    }

    setStats({
      totalProjects: projects.length,
      activeProjects: active,
      completedProjects: completed,
      doneTasks,
      pendingTasks,
      topWorkerName,
      topWorkerCount: topWorker?.[1],
    });
    setLoading(false);
  }

  if (loading || !stats) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <div className="lg:ml-[260px] p-8"><p className="text-[#A08D7A]">Loading...</p></div>
      </div>
    );
  }

  const cards = [
    { label: "All Projects", value: stats.totalProjects, color: "bg-[#5EC8F2]" },
    { label: "Active Projects", value: stats.activeProjects, color: "bg-[#FFD34E]" },
    { label: "Completed Projects", value: stats.completedProjects, color: "bg-[#8FD98A]" },
    { label: "Completed Tasks", value: stats.doneTasks, color: "bg-[#8FD98A]" },
    { label: "Pending Tasks", value: stats.pendingTasks, color: "bg-[#FF6B5E]" },
  ];

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-[260px] px-6 lg:px-12 py-8 max-w-7xl mx-auto">
        <h1 className="font-baloo text-3xl text-[#4A3F35] mb-8">Department Overview</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className={`${c.color} cartoon-border rounded-2xl p-4 text-center`}>
              <p className="font-baloo text-3xl text-white">{c.value}</p>
              <p className="text-xs text-white/90 mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {myTasks.length > 0 && (
          <div className="mb-8">
            <h3 className="font-baloo text-xl text-[#4A3F35] mb-3">Tasks for Today</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myTasks.slice(0, 6).map((t) => (
                <div key={t.id} className="bg-white cartoon-border rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-[#4A3F35] text-sm">{t.title}</h4>
                    <span className="text-xs text-[#A08D7A]">
                      {t.status === "todo" ? "Not Started" : "In Progress"}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      t.priority === "high" ? "bg-[#E85D5D] text-white" :
                      t.priority === "low" ? "bg-[#8FD98A] text-[#4A3F35]" :
                      "bg-[#FFD34E] text-[#4A3F35]"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Ring + Workload Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Completion Ring */}
          <div className="bg-white cartoon-border rounded-2xl p-6 flex items-center gap-6">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: `conic-gradient(#8FD98A ${
                  stats.doneTasks + stats.pendingTasks > 0
                    ? (stats.doneTasks / (stats.doneTasks + stats.pendingTasks)) * 360
                    : 0
                }deg, #FFF1E7 0deg)`,
              }}
            >
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
                <span className="font-baloo text-xl text-[#4A3F35]">
                  {stats.doneTasks + stats.pendingTasks > 0
                    ? Math.round((stats.doneTasks / (stats.doneTasks + stats.pendingTasks)) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-baloo text-lg text-[#4A3F35]">Success Rate</h3>
              <p className="text-sm text-[#A08D7A]">
                Done {stats.doneTasks} From {stats.doneTasks + stats.pendingTasks} Task
              </p>
            </div>
          </div>

          {/* Workload Bars */}
          <div className="bg-white cartoon-border rounded-2xl p-6">
            <h3 className="font-baloo text-lg text-[#4A3F35] mb-4">Team Workload (Top 5)</h3>
            {memberWorkload.length === 0 ? (
              <p className="text-sm text-[#A08D7A]">No data</p>
            ) : (
              <div className="space-y-3">
                {memberWorkload.map((m) => {
                  const maxCount = Math.max(...memberWorkload.map((x) => x.count), 1);
                  return (
                    <div key={m.name}>
                      <div className="flex justify-between text-xs text-[#4A3F35] mb-1">
                        <span>{m.name}</span>
                        <span>{m.count} Task</span>
                      </div>
                      <div className="h-3 bg-[#FFF1E7] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#5EC8F2] rounded-full transition-all"
                          style={{ width: `${(m.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}