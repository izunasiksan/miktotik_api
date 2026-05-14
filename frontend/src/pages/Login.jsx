import React, { useState } from 'react';
import useAuth from '../context/useAuth.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Lock, 
  User, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Network, 
  Server, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser } from '../services/api.js';
import Button from '../components/atoms/Button.jsx';
import Input from '../components/atoms/Input.jsx';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('teknisi');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login } = useAuth();

  const validateForm = () => {
    const newErrors = {};
    if (!username.trim()) newErrors.username = 'Username wajib diisi';
    if (!password) newErrors.password = 'Password wajib diisi';
    if (isRegistering && !fullName.trim()) newErrors.fullName = 'Nama Lengkap wajib diisi';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await login(username, password, navigate, from);
    } catch (error) {
      console.error("Login exception:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const res = await registerUser({
        username,
        password,
        fullName,
        role
      });
      toast.success(res?.message || 'Registrasi berhasil, menunggu persetujuan admin');
      setIsRegistering(false);
      setPassword('');
      setRole('teknisi');
      setErrors({});
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Registrasi gagal';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setErrors({});
      setPassword('');
      setUsername('');
      setFullName('');
  };

  return (
    <div className="min-h-screen flex font-sans bg-slate-50">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-900 text-white overflow-hidden flex-col justify-between p-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.5),_transparent_70%)]"></div>
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
                <path d="M0 100 C 50 0 80 0 100 0 Z" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
            </svg>
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                    <Network className="h-8 w-8 text-indigo-300" />
                </div>
                <h1 className="text-2xl font-bold tracking-wider text-white">MIKROTIK MGR</h1>
            </div>
            <div className="space-y-6 max-w-lg">
                <h2 className="text-4xl font-extrabold leading-tight text-white">
                    {isRegistering ? 'Bergabung dengan Tim.' : 'Kelola Jaringan Anda dengan Cerdas.'}
                </h2>
                <p className="text-indigo-100 text-lg leading-relaxed">
                    Platform manajemen terpusat untuk monitoring, konfigurasi, dan otomatisasi perangkat Mikrotik Anda dengan antarmuka modern.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                    <div className="flex items-center space-x-2 text-sm text-indigo-100 bg-indigo-800/50 px-4 py-2 rounded-full border border-indigo-700/50 backdrop-blur-sm">
                        <ShieldCheck size={16} />
                        <span>Secure Access</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-indigo-100 bg-indigo-800/50 px-4 py-2 rounded-full border border-indigo-700/50 backdrop-blur-sm">
                        <Server size={16} />
                        <span>Real-time Monitor</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="relative z-10 text-sm text-indigo-300/80">
            &copy; 2026 Mikrotik Management System. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-white relative">
        <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
            
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
                <div className="inline-flex p-3 bg-indigo-50 rounded-xl mb-4 shadow-sm">
                    <Network className="h-8 w-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Mikrotik Mgr</h2>
            </div>

            <div className="text-center lg:text-left">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {isRegistering ? 'Buat Akun Baru' : 'Selamat Datang'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                    {isRegistering 
                        ? 'Lengkapi data diri Anda untuk memulai akses sistem.' 
                        : 'Masuk untuk mengakses dashboard manajemen jaringan.'}
                </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={isRegistering ? handleRegister : handleSubmit} noValidate>
                <div className="space-y-5">
                    
                    {/* Full Name (Register Only) */}
                    {isRegistering && (
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 top-6">
                                <UserPlus className="h-5 w-5 text-slate-400" />
                            </div>
                            <Input
                                id="full_name"
                                label="Nama Lengkap"
                                type="text"
                                inputClassName="pl-8"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                error={errors.fullName}
                                required
                            />
                        </div>
                    )}

                    {/* Username */}
                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 top-8">
                            <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <Input
                            id="username"
                            label="Username"
                            inputClassName="pl-10"
                            placeholder="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            error={errors.username}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                             {!isRegistering && (
                                <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">Lupa password?</a>
                            )}
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className={`block w-full pl-10 pr-10 py-2 text-sm text-slate-900 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${errors.password ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'}`}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                                {errors.password}
                            </p>
                        )}
                    </div>

                    {/* Role (Register Only) */}
                    {isRegistering && (
                         <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">Role</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('teknisi')}
                                    className={`flex items-center justify-center px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                                        role === 'teknisi' 
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' 
                                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    Teknisi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('admin')}
                                    className={`flex items-center justify-center px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                                        role === 'admin' 
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' 
                                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    Admin
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        className="w-full justify-center py-2.5"
                    >
                        <span className="flex items-center">
                            {isRegistering ? 'Daftar Sekarang' : 'Masuk Dashboard'}
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </Button>
                </div>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">
                                {isRegistering ? 'Sudah punya akun?' : 'Belum punya akun?'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors hover:underline"
                        >
                            {isRegistering ? 'Masuk ke akun Anda' : 'Daftar akun baru'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
