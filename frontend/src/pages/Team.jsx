import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { isDepartmentHead, apiFetch } from "../api/client";
import MemberDetailModal from "../components/MemberDetailModal";

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const canManage = isDepartmentHead();

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await apiFetch("/department/members");
      setMembers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId, e) {
    e.stopPropagation();
    if (!confirm("Confirm Member Removal?")) return;
    await apiFetch(`/department/members/${userId}`, { method: "DELETE" });
    loadMembers();
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-[260px] px-6 lg:px-12 py-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-baloo text-3xl text-[#4A3F35]">Your Team</h1>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#FF6B5E] text-white cartoon-border py-3 px-6 rounded-xl flex items-center gap-2 font-bold hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              Add members
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-[#A08D7A]">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className="bg-white cartoon-border rounded-2xl p-5 cursor-pointer hover:-translate-y-1 transition-all"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-20 h-20 rounded-full bg-[#5EC8F2] cartoon-border flex items-center justify-center">
                    <span className="font-baloo text-2xl text-white">
                      {m.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-baloo text-lg text-[#4A3F35]">{m.name}</h3>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      m.role === "department_head"
                        ? "bg-[#FFD34E] text-[#4A3F35]"
                        : "bg-[#5EC8F2] text-white"
                    }`}
                  >
                    {m.role === "department_head" ? "Head" : "Member"}
                  </span>
                  <p className="text-xs text-[#A08D7A]">{m.email}</p>
                </div>

                {canManage && m.role !== "department_head" && (
                  <div className="flex gap-2 mt-4 pt-3 border-t-2 border-[#A08D7A]/10">
                    <button
                      onClick={(e) => handleDelete(m.id, e)}
                      className="flex-1 text-xs py-2 rounded-lg bg-[#E85D5D]/10 text-[#E85D5D] font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMemberModal onClose={() => setShowAddModal(false)} onAdded={loadMembers} />
      )}

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdated={loadMembers}
        />
      )}
    </div>
  );
}

function AddMemberModal({ onClose, onAdded }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/department/members", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      onAdded();
      onClose();
    } catch (err) {
      setError("Failed to create member (email may already be in use)");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div className="bg-white cartoon-border rounded-2xl p-6 w-full max-w-md">
        <h2 className="font-baloo text-2xl text-[#4A3F35] mb-4">Add new member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 rounded-xl cartoon-border outline-none" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl cartoon-border outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl cartoon-border outline-none" />
          {error && <p className="text-sm text-[#E85D5D]">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl cartoon-border font-semibold">Cencel</button>
            <button type="submit" className="flex-1 py-3 rounded-xl cartoon-border bg-[#FF6B5E] text-white font-bold">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}