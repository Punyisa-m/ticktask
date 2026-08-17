import { useEffect, useState } from "react";
import { apiFetch, isDepartmentHead } from "../api/client";

export default function MemberDetailModal({ member, onClose, onUpdated }) {
  const canManage = isDepartmentHead();
  const [skills, setSkills] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState(1);
  const levelOptions = [
    { value: 1, label: "Beginner" },
    { value: 3, label: "Intermediate" },
    { value: 5, label: "Advanced" },
  ];
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);

  useEffect(() => {
    loadData();
  }, [member.id]);

  async function loadData() {
    try {
      const userSkills = await apiFetch(`/users/${member.id}/skills`);
      const allSkills = await apiFetch("/skills");
      const skillMap = {};
      (allSkills || []).forEach((s) => (skillMap[s.id] = s.name));
      setSkills((userSkills || []).map((us) => ({ ...us, name: skillMap[us.skill_id] || `Skill #${us.skill_id}` })));
    } catch (err) {
      console.error(err);
      setSkills([]);
    }

    try {
      const allTasks = await apiFetch(`/projects/`).then(async (projects) => {
        const results = await Promise.all(
          (projects || []).map((p) => apiFetch(`/projects/${p.id}/tasks`))
        );
        return results.flat();
      });
      setTasks(allTasks.filter((t) => t.assigned_to === member.id));
    } catch (err) {
      console.error(err);
      setTasks([]);
    }
  }

  async function handleAddSkill(e) {
    e.preventDefault();
    if (!newSkill.trim()) return;
    let allSkills = await apiFetch("/skills");
    let skill = (allSkills || []).find((s) => s.name === newSkill.trim());
    if (!skill) {
      skill = await apiFetch("/skills", { method: "POST", body: JSON.stringify({ name: newSkill.trim() }) });
    }
    await apiFetch(`/users/${member.id}/skills`, {
      method: "POST",
      body: JSON.stringify({ skill_id: skill.id, level: newSkillLevel }),
    });
    setNewSkill("");
    setNewSkillLevel(1);
    loadData();
    onUpdated?.();
  }

  async function handleSaveInfo() {
    await apiFetch(`/department/members/${member.id}`, {
      method: "PUT",
      body: JSON.stringify({ name, email }),
    });
    setEditMode(false);
    onUpdated?.();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
      <div className="bg-white cartoon-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          {editMode ? (
            <div className="space-y-2 flex-1 mr-3">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg cartoon-border text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg cartoon-border text-sm" />
            </div>
          ) : (
            <div>
              <h2 className="font-baloo text-2xl text-[#4A3F35]">{member.name}</h2>
              <p className="text-sm text-[#A08D7A]">{member.email}</p>
            </div>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-full cartoon-border flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {canManage && member.role !== "department_head" && (
          <div className="mb-4">
            {editMode ? (
              <div className="flex gap-2">
                <button onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-lg cartoon-border text-sm font-semibold">Cancel</button>
                <button onClick={handleSaveInfo} className="flex-1 py-2 rounded-lg cartoon-border bg-[#FF6B5E] text-white text-sm font-bold">Save</button>
              </div>
            ) : (
              <button onClick={() => setEditMode(true)} className="text-sm text-[#5EC8F2] font-semibold hover:underline">
                Edit name/email
              </button>
            )}
          </div>
        )}

        {/* Skills */}
        <div className="mb-6">
          <h3 className="font-baloo text-lg text-[#4A3F35] mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.length === 0 ? (
              <span className="text-sm text-[#A08D7A]">No skills yet</span>
            ) : (
              skills.map((s) => {
                const levelLabel =
                  s.level >= 5 ? "Advanced" :
                  s.level >= 3 ? "Intermediate" :
                  "Beginner";

                return (
                  <span
                    key={s.id}
                    className="text-xs bg-[#FFB4C6]/30 text-[#4A3F35] px-3 py-1 rounded-full"
                  >
                    {s.name} ({levelLabel})
                  </span>
                );
              })
            )}
          </div>
          {canManage && (
            <form onSubmit={handleAddSkill} className="space-y-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add skill..."
                className="w-full px-3 py-2 rounded-lg cartoon-border text-sm outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-lg cartoon-border text-sm outline-none"
                >
                  {levelOptions.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#5EC8F2] text-white text-sm font-semibold">
                  Add
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Tasks */}
        <div>
          <h3 className="font-baloo text-lg text-[#4A3F35] mb-2">Assigned Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-[#A08D7A]">No assigned tasks yet</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="bg-[#FFF8ED] rounded-lg p-3 text-sm">
                  <p className="font-semibold text-[#4A3F35]">{t.title}</p>
                  <p className="text-xs text-[#A08D7A]">Status: {t.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}