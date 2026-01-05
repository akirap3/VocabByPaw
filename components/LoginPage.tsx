import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SpaceBackground } from './SpaceBackground.tsx';
import { Rocket, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const handleStartJourney = () => {
    setShowLogin(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validUser = import.meta.env.VITE_USER;
    const validPass = import.meta.env.VITE_PASS;

    if (username === validUser && password === validPass) {
      setIsLaunching(true);
      localStorage.setItem('isAuthenticated', 'true');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } else {
      setIsShaking(true);
      setError('Invalid credentials. Please try again.');
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <SpaceBackground />

      {/* Hero Section */}
      <motion.div
        className="flex flex-col items-center z-10"
        animate={showLogin ? { y: -40, scale: 0.85 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        {/* Zero-Gravity Floating Hero Image */}
        <motion.div
          className="relative"
          animate={{
            y: [0, -15, 0, 10, 0],
            rotateZ: [-1, 1, -0.5, 1.5, -1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.img
            src="https://github.com/akirap3/OrangeCatEnglishDiary/blob/main/images/vocabByPaw/group/togethte_rmbg.png?raw=true"
            alt="Vocab By Paw Characters"
            className="w-[320px] md:w-[450px] lg:w-[550px] h-auto drop-shadow-2xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          {/* Glow effect */}
          <div className="absolute inset-0 bg-orange-300/20 blur-3xl rounded-full -z-10 scale-75" />
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 tracking-tight drop-shadow-sm">
            Vocab By Paw
          </h1>
          <p className="text-lg md:text-xl text-orange-800/70 font-semibold mt-2">
            Learn English with Your Fluffy Friends ✨
          </p>
        </motion.div>
      </motion.div>

      {/* Start Journey Button / Login Card */}
      <AnimatePresence mode="wait">
        {!showLogin ? (
          <motion.button
            key="start-btn"
            onClick={handleStartJourney}
            className="mt-8 px-10 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 z-10 border-4 border-white/50"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            whileHover={{ boxShadow: '0 20px 40px rgba(251, 146, 60, 0.4)' }}
          >
            <Rocket className="w-6 h-6" />
            Start Your Journey
          </motion.button>
        ) : (
          <motion.div
            key="login-card"
            className={`mt-6 z-20 w-[90%] max-w-md ${isShaking ? 'animate-shake' : ''}`}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {/* Glassmorphism Card */}
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/40 shadow-2xl">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-orange-500" />
                <h2 className="text-2xl font-black text-orange-800">Mission Control</h2>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-orange-900/80 mb-2">
                    Pilot Name
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border-2 border-orange-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-200/50 outline-none transition-all font-medium text-orange-900 placeholder-orange-300"
                    placeholder="Enter your username"
                    autoComplete="username"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-orange-900/80 mb-2">
                    Access Code
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/60 border-2 border-orange-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-200/50 outline-none transition-all font-medium text-orange-900 placeholder-orange-300"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[42px] text-orange-400 hover:text-orange-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-600 bg-red-100/80 px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLaunching}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLaunching ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Rocket className="w-6 h-6" />
                      </motion.div>
                      Launching...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-6 h-6" />
                      Launch Mission
                    </>
                  )}
                </motion.button>
              </form>

              <button
                onClick={() => setShowLogin(false)}
                className="w-full mt-4 text-sm font-medium text-orange-600 hover:text-orange-800 transition-colors"
              >
                ← Back to landing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launch Animation Overlay */}
      <AnimatePresence>
        {isLaunching && (
          <motion.div
            className="fixed inset-0 bg-gradient-to-t from-orange-500 via-amber-400 to-white z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Rocket className="w-20 h-20 text-white mx-auto mb-4" />
              </motion.div>
              <h2 className="text-3xl font-black text-white">Launching...</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
};
