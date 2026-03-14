import { useState } from "react";
import { loginUser } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";
import { useHomeState } from "../context/HomeStateContext";
import { useTheme } from "../context/ThemeContext";
import { ChevronLeft, Lock } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { setUser } = useHomeState();
  const { theme } = useTheme();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await loginUser(form);
      const { token, user } = res.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("userId", user._id);
      localStorage.setItem("user", JSON.stringify(user)); // Store full user for persistence

      setUser(user);

      if (user.role === "admin") {
        navigate("/analytics");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError("Invalid credentials. Please try again.");
      console.error("Login failed", err);
    }
  };

  return (
    <div className={`min-h-[90vh] flex flex-col items-center justify-center px-6 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-white'
    }`}>
      {/* Back Button */}
      <Link to="/" className={`mb-12 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
        theme === 'dark' 
          ? 'text-slate-400 hover:text-blue-400' 
          : 'text-slate-400 hover:text-blue-600'
      }`}>
        <ChevronLeft size={14} /> Back to Home
      </Link>

      <div className="w-full max-w-sm">
        {/* Branding Header */}
        <div className="text-center mb-10">
          <div className={`inline-flex items-center justify-center w-12 h-12 mb-6 transition-colors ${
            theme === 'dark' 
              ? 'bg-slate-800 text-white' 
              : 'bg-slate-900 text-white'
          }`}>
            <Lock size={20} />
          </div>
          <h2 className={`font-serif text-4xl font-black tracking-tighter lowercase italic transition-colors ${
            theme === 'dark' 
              ? 'text-slate-100' 
              : 'text-slate-900'
          }`}>
            Member <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>Access</span>
          </h2>
          <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
            theme === 'dark' 
              ? 'text-slate-500' 
              : 'text-slate-400'
          }`}>
            Verbis AI Intelligence Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`p-3 border-l-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              theme === 'dark'
                ? 'bg-red-900/20 border-red-500 text-red-400'
                : 'bg-red-50 border-red-500 text-red-600'
            }`}>
              {error}
            </div>
          )}

          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ml-1 transition-colors ${
              theme === 'dark' 
                ? 'text-slate-400' 
                : 'text-slate-500'
            }`}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              className={`w-full p-4 border outline-none transition-all duration-300 font-sans text-sm ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
              }`}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ml-1 transition-colors ${
              theme === 'dark' 
                ? 'text-slate-400' 
                : 'text-slate-500'
            }`}>
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className={`w-full p-4 border outline-none transition-all duration-300 font-sans text-sm ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
              }`}
              onChange={handleChange}
              required
            />
          </div>

          <button className={`w-full py-4 text-xs font-black uppercase tracking-[0.3em] transition-all duration-300 mt-2 shadow-lg ${
            theme === 'dark'
              ? 'bg-slate-800 text-white hover:bg-blue-600 shadow-slate-800/50'
              : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200'
          }`}>
            Sign In
          </button>
        </form>

        <div className={`mt-10 pt-10 border-t text-center transition-colors ${
          theme === 'dark'
            ? 'border-slate-800'
            : 'border-slate-100'
        }`}>
          <p className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${
            theme === 'dark'
              ? 'text-slate-400'
              : 'text-slate-400'
          }`}>
            Don't have an account?{" "}
            <Link 
              to="/register" 
              className={`ml-1 hover:underline underline-offset-4 transition-colors ${
                theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-blue-600'
              }`}
            >
              Join the network
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}