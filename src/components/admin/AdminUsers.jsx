import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { ShieldCheck, Trash2, Search, Mail, Calendar } from 'lucide-react';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .ilike('name', `%${search}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [search]);

    const toggleRole = async (user) => {
        try {
            const newRole = user.role === 'admin' ? 'user' : 'admin';
            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', user.id);
            if (error) throw error;
            setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        } catch (err) {
            alert("Failed to update user role");
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm("Permanently delete this user from the system?")) return;
        try {
            const { error } = await supabase.from('users').delete().eq('id', id);
            if (error) throw error;
            setUsers(users.filter(u => u.id !== id));
        } catch (err) {
            alert("Failed to delete user. They might have related constraints (liked articles, etc).");
        }
    };

    return (
        <div className="w-full bg-paper rounded-[2.5rem] border border-border overflow-hidden shadow-sm animate-in fade-in duration-700">

            {/* 1. HEADER SECTION */}
            <div className="px-6 md:px-10 py-10 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface/30">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 flex-shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-ink uppercase italic tracking-tighter">
                            User <span className="text-blue-500">Directory</span>
                        </h2>
                    </div>
                    <p className="font-mono text-[10px] text-muted uppercase tracking-[0.2em] ml-1">
                        Access Management & Roles
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64 flex-shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search accounts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-ink outline-none focus:border-blue-500 transition-all uppercase placeholder:text-muted/40 shadow-sm"
                    />
                </div>
            </div>

            {/* 2. USERS TABLE */}
            {loading ? (
                <div className="p-20 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
                    Scanning User Profiles...
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface/50 border-b border-border">
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-[0.3em]">Identity</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-[0.3em] hidden md:table-cell">Contact</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-[0.3em]">Access Role</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-[0.3em] text-right">Sanctions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-accent/2 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-blue-500/10 text-blue-500 flex justify-center items-center font-black text-xs uppercase shadow-sm">
                                                {user.name ? user.name.slice(0, 2) : "US"}
                                            </div>
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <p className="font-bold text-ink text-sm tracking-tight truncate">{user.name || 'Anonymous User'}</p>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={10} className="text-muted flex-shrink-0" />
                                                    <p className="text-[9px] font-mono text-muted font-bold uppercase tracking-tighter truncate">
                                                        Since {new Date(user.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 hidden md:table-cell">
                                        <div className="flex items-center gap-2 text-muted h-full max-w-[200px]">
                                            <Mail size={12} className="flex-shrink-0" />
                                            <p className="text-[11px] font-mono font-medium truncate">{user.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <button
                                            onClick={() => toggleRole(user)}
                                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all active:scale-95 ${user.role === 'admin'
                                                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-600'
                                                    : 'border-border bg-surface text-muted hover:text-ink'
                                                }`}
                                        >
                                            {user.role || 'user'}
                                        </button>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => deleteUser(user.id)} className="p-3 rounded-xl bg-surface border border-border text-muted hover:text-red-500 hover:border-red-500 transition-all active:scale-90 shadow-sm shadow-black/5">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-20 text-muted font-black text-[10px] uppercase tracking-widest">
                                        No users matching criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
