import { useState } from "react";
import { updateTask, deleteTask, isDepartmentHead } from "../api/client";

const priorityOptions = ["low", "medium", "high"];

export default function TaskModal({ task, onClose, onUpdated }) {
  const canEdit = isDepartmentHead();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const payload = canEdit
      ? { title, description, priority, status }
      : { status };
    await updateTask(task.id, payload);
    setSaving(false);
    onUpdated();
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this task?")) return;
    await deleteTask(task.id);
    onUpdated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
      <div className="bg-white cartoon-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-baloo text-2xl text-[#4A3F35]">Task Details</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full cartoon-border flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-[#A08D7A] block mb-1">Task name</label>
            <input
              type="text" value={title} disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl cartoon-border outline-none disabled:bg-[#FFF1E7] disabled:text-[#A08D7A]"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[#A08D7A] block mb-1">Details</label>
            <textarea
              value={description} disabled={!canEdit} rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-xl cartoon-border outline-none disabled:bg-[#FFF1E7] disabled:text-[#A08D7A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-[#A08D7A] block mb-1">Priority</label>
              <select
                value={priority} disabled={!canEdit}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 rounded-xl cartoon-border outline-none disabled:bg-[#FFF1E7]"
              >
                {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#A08D7A] block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-xl cartoon-border outline-none"
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {!canEdit && (
            <p className="text-xs text-[#A08D7A] italic">
              You can only update the task status. Other details can only be edited by the Department Head.
            </p>
          )}

          {canEdit && (
            <button
              onClick={handleDelete}
              className="w-full py-2 rounded-xl bg-[#E85D5D]/10 text-[#E85D5D] font-semibold text-sm"
            >
              Delete this task
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl cartoon-border font-semibold">
              Cancel
            </button>
            <button
              onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl cartoon-border bg-[#FF6B5E] text-white font-bold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}