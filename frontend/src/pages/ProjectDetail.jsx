import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatWidget from "../components/ChatWidget";
import { addProjectMember, isDepartmentHead } from "../api/client";
import { apiFetch } from "../api/client";


import {
  getProject,
  getRequirements,
  createRequirement,
  analyzeRequirement,
  confirmTasks,
  suggestAssignments,
  getProjectMembers,
} from "../api/client";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [rawText, setRawText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [currentRequirementId, setCurrentRequirementId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [departmentMembers, setDepartmentMembers] = useState([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);

  useEffect(() => {
    loadData();
    loadDepartmentMembers();
    loadProjectMembers();
  }, [id]);

  async function loadProjectMembers() {
    const data = await getProjectMembers(id);
    setProjectMembers(data || []);
  }

  async function loadDepartmentMembers() {
    const data = await apiFetch("/department/members");
    setDepartmentMembers(data || []);
  }

  async function handleAddMemberToProject(userId) {
    try {
      await addProjectMember(id, userId);
      await loadProjectMembers();
    } catch (err) {
      alert("Failed to add member: " + err.message);
    }
  }

  async function loadData() {
    const proj = await getProject(id);
    setProject(proj);
    const reqs = await getRequirements(id);
    setRequirements(reqs || []);
  }

  async function handleUpload(e) {
    e.preventDefault();
    const newReq = await createRequirement(id, rawText);
    setRawText("");
    await loadData();
    handleAnalyze(newReq.id);
  }

  async function handleAnalyze(requirementId) {
  setAnalyzing(true);
  setCurrentRequirementId(requirementId);
  try {
    const result = await analyzeRequirement(id, requirementId);
    const tasks = result.suggested_tasks || [];

    const assignResult = await suggestAssignments(id, requirementId, tasks);
    const tasksWithAssignment = (assignResult.tasks_with_recommendations || []).map((t) => ({
      ...t,
      assigned_to: t.recommended_user_id,
    }));

    setSuggestedTasks(tasksWithAssignment);
    setCandidates(assignResult.candidates || []);

    const initialSelected = {};
    tasksWithAssignment.forEach((_, idx) => (initialSelected[idx] = true));
    setSelectedTasks(initialSelected);
  } catch (err) {
    console.error("Analyze error:", err);
    alert("An error occurred during analysis: " + (err.message || "The cause is unknown"));
  } finally {
    setAnalyzing(false);
  }
}

  function toggleTask(idx) {
    setSelectedTasks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function updateTaskField(idx, field, value) {
    setSuggestedTasks((prev) =>
      prev.map((task, i) => (i === idx ? { ...task, [field]: value } : task))
    );
  }

  async function handleConfirm() {
    setConfirming(true);
    const tasksToConfirm = suggestedTasks.filter((_, idx) => selectedTasks[idx]);
    await confirmTasks(id, currentRequirementId, tasksToConfirm);
    setSuggestedTasks([]);
    setSelectedTasks({});
    setConfirming(false);
    alert("Task created successfully! Check the Kanban Board to view it.");
  }

  const selectedCount = Object.values(selectedTasks).filter(Boolean).length;

  const priorityColor = {
    high: "bg-[#E85D5D] text-white",
    medium: "bg-[#FFD34E] text-[#4A3F35]",
    low: "bg-[#8FD98A] text-[#4A3F35]",
  };

  return (
    <div className="min-h-screen">
      <Sidebar />

      <div className="lg:ml-[260px] px-6 lg:px-12 py-8 max-w-7xl mx-auto pb-32">
        <div className="mb-6">
          <p className="text-[#A08D7A] text-sm mb-1">
            Project: {project?.name || "..."}
          </p>
          <h2 className="font-baloo text-3xl text-[#4A3F35]">
            {project?.description || "Project Details"}
          </h2>
        </div>

        <nav className="flex border-b-2 border-[#A08D7A]/20 mb-8 gap-6">
  <span className="px-2 py-3 border-b-4 border-[#FF6B5E] text-[#FF6B5E] font-semibold">
    Requirements
  </span>
  <Link
    to={`/projects/${id}/kanban`}
    className="px-2 py-3 text-[#A08D7A] hover:text-[#FF6B5E] font-semibold"
  >
    Tasks
  </Link>
</nav>

{isDepartmentHead() && (
  <div className="mb-6">
    <button
      onClick={() => setShowAddMemberModal(true)}
      className="text-sm bg-[#5EC8F2] text-white px-4 py-2 rounded-lg font-semibold cartoon-border"
    >
      + Add Members to This Project
    </button>
  </div>
)}

{showAddMemberModal && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
    <div className="bg-white cartoon-border rounded-2xl p-6 w-full max-w-2xl grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-baloo text-lg text-[#4A3F35] mb-2">Project Members</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {projectMembers.length === 0 ? (
            <p className="text-sm text-[#A08D7A]">No members yet.</p>
          ) : (
            projectMembers.map((m) => (
              <div key={m.id} className="px-3 py-2 rounded-lg bg-[#FFF1E7] text-sm flex justify-between">
                <span>{m.name}</span>
                <span className="text-xs text-[#A08D7A]">{m.role}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div>
        <h3 className="font-baloo text-lg text-[#4A3F35] mb-2">Add members</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {departmentMembers
            .filter((dm) => !projectMembers.some((pm) => pm.id === dm.id))
            .map((m) => (
              <button
                key={m.id}
                onClick={() => handleAddMemberToProject(m.id)}
                className="w-full text-left px-3 py-2 rounded-lg cartoon-border hover:bg-[#5EC8F2]/10 text-sm"
              >
                {m.name}
              </button>
            ))}
        </div>
      </div>
      <button
        onClick={() => setShowAddMemberModal(false)}
        className="col-span-2 mt-2 py-2 rounded-lg cartoon-border font-semibold"
      >
        Close
      </button>
    </div>
  </div>
)}

        {/* Upload Section */}
        <div className="mb-10">
          <h3 className="font-baloo text-xl text-[#4A3F35] mb-3">
            Upload Requirement
          </h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Type or paste your requirements here...'"
              required
              rows={5}
              className="w-full px-4 py-3 rounded-2xl border-2 border-dashed border-[#5EC8F2] bg-[#5EC8F2]/5 outline-none focus:ring-4 focus:ring-[#5EC8F2]/20 text-[#4A3F35]"
            />
            <button
              type="submit"
              className="bg-[#FF6B5E] text-white cartoon-border py-3 px-8 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all"
            >
              Send to AI for Analysis
            </button>
          </form>
        </div>

        {/* Loading */}
        {analyzing && (
          <div className="flex flex-col items-center py-10 space-y-3">
            <div className="flex space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-[#FF6B5E] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="font-baloo text-[#FF6B5E]">AI is analyzing...</p>
          </div>
        )}

        {/* AI Suggested Tasks */}
        {suggestedTasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-baloo text-xl text-[#4A3F35]">
                AI-recommended tasks
              </h3>
              <span className="text-sm bg-[#FFD34E] px-3 py-1 rounded-full cartoon-border font-semibold">
                {suggestedTasks.length} New tasks
              </span>
            </div>

            <div className="space-y-3">
              {suggestedTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="bg-white cartoon-border rounded-xl p-4 flex gap-4 items-start"
                >
                  <input
                    type="checkbox"
                    checked={!!selectedTasks[idx]}
                    onChange={() => toggleTask(idx)}
                    className="w-6 h-6 mt-1 accent-[#FF6B5E]"
                  />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => updateTaskField(idx, "title", e.target.value)}
                          className="w-full font-semibold text-[#4A3F35] bg-transparent outline-none border-b border-transparent focus:border-[#5EC8F2]"
                        />
                        <p className="text-[#A08D7A] text-sm mt-1">{task.description}</p>

                        <div className="flex flex-wrap gap-2 mt-3 items-center">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-semibold ${
                              priorityColor[task.priority] || priorityColor.medium
                            }`}
                          >
                            {task.priority}
                          </span>
                          <div className="flex items-center gap-1 text-[#A08D7A] text-xs">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            <span>{task.estimated_hours} Hr.</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#A08D7A]/10">
                          <label className="text-xs text-[#A08D7A] block mb-1">Assign</label>
                          <select
                            value={task.assigned_to || ""}
                            onChange={(e) => updateTaskField(idx, "assigned_to", parseInt(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg cartoon-border text-sm outline-none"
                          >
                            <option value="">-- Unassigned --</option>
                            {candidates.map((c) => (
                              <option key={c.user_id} value={c.user_id}>
                                {c.name} ({c.current_task_count} tasks assigned )
                              </option>
                            ))}
                          </select>
                          {task.reason && (
                            <p className="text-xs text-[#A08D7A] mt-1 italic">AI recommended: {task.reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  
                
              ))}
            </div>
          </div>
        )}

        {/* Past Requirements */}
        {requirements.length > 0 && suggestedTasks.length === 0 && !analyzing && (
          <div>
            <h3 className="font-baloo text-xl text-[#4A3F35] mb-3">
              Uploaded Requirements
            </h3>
            <div className="space-y-2">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="bg-white cartoon-border rounded-xl p-4 flex justify-between items-center"
                >
                  <p className="text-[#4A3F35] text-sm line-clamp-1">{req.raw_text}</p>
                  <button
                    onClick={() => handleAnalyze(req.id)}
                    className="text-[#5EC8F2] text-sm font-semibold hover:underline whitespace-nowrap ml-3"
                  >
                    Analyze Again
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Confirm Bar */}
      {suggestedTasks.length > 0 && (
        <div className="fixed bottom-0 left-0 lg:left-[260px] right-0 p-4 z-40">
          <button
            onClick={handleConfirm}
            disabled={confirming || selectedCount === 0}
            className="w-full max-w-3xl mx-auto bg-[#FF6B5E] text-white h-16 rounded-xl cartoon-border flex items-center justify-center gap-3 font-bold text-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
          >
            <span>{confirming ? "Saving..." : `Confirm Creation ${selectedCount} task`}</span>
            <div className="bg-[#FFD34E] text-[#4A3F35] w-8 h-8 rounded-full flex items-center justify-center font-bold">
              {selectedCount}
            </div>
          </button>
        </div>
      )}
      <ChatWidget projectId={id} />
    </div>
  );
}