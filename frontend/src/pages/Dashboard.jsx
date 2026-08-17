import { useEffect, useState } from "react";
import { getProjects, createProject } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { isDepartmentHead } from "../api/client";
import { deleteProject } from "../api/client";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const data = await getProjects();
    setProjects(data || []);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    await createProject(newName, newDesc);
    setNewName("");
    setNewDesc("");
    setShowModal(false);
    loadProjects();
  }

  return (
    <div className="min-h-screen">
      <Sidebar />

      <div className="lg:ml-[260px] px-6 lg:px-12 py-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-baloo text-3xl md:text-4xl text-[#4A3F35]">
            Your Projects
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#FF6B5E] text-white cartoon-border py-3 px-6 rounded-xl flex items-center gap-2 font-bold hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Create project
          </button>
        </div>

        {loading ? (
          <p className="text-[#A08D7A]">loading...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#A08D7A] text-lg mb-4">
              No projects yet
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#FFD34E] cartoon-border py-2 px-8 rounded-full font-bold hover:scale-105 transition-all"
            >
              Let's do it!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white cartoon-border rounded-2xl p-5 hover:-translate-y-1 hover:rotate-1 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#5EC8F2] text-white text-xs px-3 py-1 rounded-full cartoon-border">
                    {project.status || "Active"}
                  </span>
                  {isDepartmentHead() && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete the project "${project.name}"?`)) {
                          await deleteProject(project.id);
                          loadProjects();
                        }
                      }}
                      className="text-xs text-[#E85D5D] hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <h3 className="font-baloo text-lg text-[#4A3F35] mb-2">{project.name}</h3>
                <p className="text-[#A08D7A] text-sm">{project.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal create project */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-white cartoon-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-baloo text-2xl text-[#4A3F35] mb-4">
              Create new project
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Project name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl cartoon-border outline-none focus:ring-4 focus:ring-[#5EC8F2]/30"
              />
              <textarea
                placeholder="Details"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-xl cartoon-border outline-none focus:ring-4 focus:ring-[#5EC8F2]/30"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl cartoon-border font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl cartoon-border bg-[#FF6B5E] text-white font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}