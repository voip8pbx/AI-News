import { useState } from "react";
import { registerUser } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, UserPlus } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await registerUser(form);
      navigate("/login");
    } catch (err) {
      setError("Account creation failed. Please try again.");
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center bg-white px-6">
      {/* Navigation Link */}
      <Link to="/login" className="mb-12 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">
        <ChevronLeft size={14} /> Back to Login
      </Link>

      <div className="w-full max-w-sm">
        {/* Editorial Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 text-white mb-6">
            <UserPlus size={20} />
          </div>
          <h2 className="font-serif text-4xl font-black tracking-tighter text-slate-900 lowercase italic">
            Create <span className="text-blue-600">Account</span>
          </h2>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Join the Verbis AI reader network
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-600 text-[11px] font-bold uppercase tracking-wider">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              className="w-full p-4 border border-slate-200 focus:border-blue-600 outline-none transition-colors font-sans text-sm"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              className="w-full p-4 border border-slate-200 focus:border-blue-600 outline-none transition-colors font-sans text-sm"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full p-4 border border-slate-200 focus:border-blue-600 outline-none transition-colors font-sans text-sm"
              onChange={handleChange}
              required
            />
          </div>

          <button className="w-full bg-slate-900 text-white py-4 text-xs font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all duration-300 mt-2 shadow-lg shadow-slate-200">
            Get Started
          </button>
        </form>

        <div className="mt-8 text-center px-4">
          {/* <p className="text-[9px] text-slate-400 uppercase tracking-widest leading-relaxed">
            By creating an account, you agree to our 
            <span className="text-slate-900 font-bold mx-1">Terms of Intelligence</span> 
            and 
            <span className="text-slate-900 font-bold mx-1">Privacy Protocols</span>.
          </p> */}
        </div>
      </div>
    </div>
  );
}