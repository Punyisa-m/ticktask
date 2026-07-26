import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
  }

  return (
    <div className="flex min-h-screen relative overflow-x-hidden">
      <main className="w-full flex flex-col items-center justify-center p-8 md:p-16 z-10">
        <div className="max-w-[480px] w-full flex flex-col items-center animate-form-entry">
          {/* Logo */}
          <div className="mb-6 sticker-tilt cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-[#FFD34E] cartoon-border flex items-center justify-center">
              <span className="material-symbols-outlined text-[48px]">bolt</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-baloo text-[36px] md:text-[48px] leading-tight font-extrabold text-[#4A3F35]">
              ยินดีต้อนรับกลับมา 👋
            </h1>
            <p className="text-[#A08D7A] mt-2">มาสะสางงานที่ค้างไว้กันเถอะ!</p>
          </div>

          {/* Login Card */}
          <div className="bg-white cartoon-border p-6 md:p-8 rounded-2xl w-full cartoon-shadow-surface">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="space-y-2">
                <label className="text-[#A08D7A] flex items-center gap-1 ml-2 text-sm font-semibold">
                  <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                  อีเมล
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-6 py-3 rounded-full cartoon-border bg-white text-[#4A3F35] placeholder:text-[#A08D7A]/50 outline-none focus:ring-4 focus:ring-[#5EC8F2]/30 focus:border-[#5EC8F2] transition-all"
                  placeholder="yourname@gmail.com"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[#A08D7A] flex items-center gap-1 text-sm font-semibold">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                    รหัสผ่าน
                  </label>
                  <a className="text-sm text-[#5EC8F2] hover:underline" href="#">ลืมรหัส?</a>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-6 py-3 rounded-full cartoon-border bg-white text-[#4A3F35] placeholder:text-[#A08D7A]/50 outline-none focus:ring-4 focus:ring-[#5EC8F2]/30 focus:border-[#5EC8F2] transition-all"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-center text-sm text-[#E85D5D] font-semibold">{error}</p>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#FF6B5E] text-white py-4 rounded-full cartoon-border cartoon-shadow-primary font-bold flex items-center justify-center gap-2 transition-all active:scale-95 hover:scale-[1.02] hover:-translate-y-1"
                >
                  <span>เข้าสู่ระบบ</span>
                  <span className="material-symbols-outlined">rocket_launch</span>
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-[#A08D7A]">
              ยังไม่มีบัญชี?{" "}
              <Link to="/register" className="text-[#5EC8F2] font-bold hover:underline">
                สมัครเลย
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}