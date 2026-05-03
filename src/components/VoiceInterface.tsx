
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Power, Loader2, Globe, Heart, Settings, Activity } from 'lucide-react';
import { AudioRecorder } from '../lib/AudioRecorder';
import { AudioPlayer } from '../lib/AudioPlayer';
import { LiveSessionManager } from '../services/gemini-live';
import { cn } from '../lib/utils';

type SessionState = 'idle' | 'connecting' | 'connected' | 'error';

export const VoiceInterface: React.FC = () => {
  const [state, setState] = useState<SessionState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const managerRef = useRef<LiveSessionManager | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const startSession = async () => {
    const apiKey = (process.env as any).GEMINI_API_KEY;
    if (!apiKey) {
      setError("Gemini API Key is missing. Check your environment settings.");
      return;
    }

    try {
      setState('connecting');
      setError(null);

      playerRef.current = new AudioPlayer();
      managerRef.current = new LiveSessionManager(apiKey);
      recorderRef.current = new AudioRecorder((base64) => {
        managerRef.current?.sendAudio(base64);
      });

      await managerRef.current.connect({
        onOpen: () => {
          setState('connected');
          recorderRef.current?.start();
        },
        onClose: () => {
          stopSession();
        },
        onError: (err) => {
          console.error("Gemini Live Error:", err);
          setError("Connection error. Zoya is taking a break.");
          stopSession();
        },
        onMessage: (msg) => {
          // Handle audio response
          const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            setIsSpeaking(true);
            playerRef.current?.playChunk(base64Audio);
          }

          // Handle turn completion to reset speaking state
          if (msg.serverContent?.modelTurn?.complete) {
            // We use a small timeout to let the last chunk finish playing
            setTimeout(() => setIsSpeaking(false), 500);
          }

          // Handle interruption
          if (msg.serverContent?.interrupted) {
            playerRef.current?.interrupt();
            setIsSpeaking(false);
          }
        }
      });

    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Oops! Something went wrong.");
      setState('idle');
    }
  };

  const stopSession = () => {
    recorderRef.current?.stop();
    playerRef.current?.stop();
    managerRef.current?.close();
    
    recorderRef.current = null;
    playerRef.current = null;
    managerRef.current = null;
    
    setState('idle');
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="w-full h-screen bg-[#050505] text-white flex flex-col font-sans overflow-hidden relative">
      {/* Header Section */}
      <header className="flex justify-between items-center p-8 w-full z-20">
        <div className="flex items-center space-x-3">
          <div className={cn("w-3 h-3 rounded-full transition-colors duration-500", state === 'connected' ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-red-500")} />
          <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-500 uppercase">
            {state === 'connected' ? "Live Session • Gemini 3.1" : "Zoya • Offline"}
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none mb-1">Stream Status</p>
            <p className={cn("text-xs font-semibold uppercase", state === 'connected' ? "text-emerald-400" : "text-zinc-600")}>
              {state === 'connected' ? "Synchronized" : "Disconnected"}
            </p>
          </div>
          <div className="w-10 h-10 border border-zinc-800 rounded-full flex items-center justify-center bg-zinc-900/50 hover:bg-zinc-800 transition-colors cursor-pointer">
            <Settings className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </header>

      {/* Main Interaction Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative px-6">
        {/* Abstract Background Pulse */}
        <div className="absolute w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[80px] pointer-events-none" />

        {/* The Zoya Core Orb */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-64 h-64 md:w-80 md:h-80 relative flex items-center justify-center">
            {/* Outer ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              className="absolute inset-0 border-[1px] border-zinc-800 rounded-full scale-125 opacity-30" 
            />
            {/* Middle ring */}
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              className="absolute inset-0 border-[2px] border-zinc-700/50 rounded-full scale-110" 
            />
            
            {/* Waveform Layers */}
            <AnimatePresence>
              {(state === 'connected' || state === 'connecting') && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: isSpeaking ? 0.4 : 0.2, 
                    scale: isSpeaking ? 1.1 : 1.0,
                    rotate: 360
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    rotate: { repeat: Infinity, duration: 10, ease: "linear" },
                    opacity: { duration: 0.5 },
                    scale: { duration: 0.3 }
                  }}
                  className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 blur-2xl" 
                />
              )}
            </AnimatePresence>

            {/* Central Control Hub */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={state === 'idle' ? startSession : stopSession}
              disabled={state === 'connecting'}
              className={cn(
                "w-48 h-48 md:w-56 md:h-56 rounded-full bg-zinc-900 border transition-all duration-500 flex items-center justify-center overflow-hidden z-20",
                state === 'idle' ? "border-zinc-700 shadow-xl" : "border-zinc-500 shadow-[0_0_50px_rgba(99,102,241,0.2)]"
              )}
            >
              {state === 'idle' ? (
                <Power className="w-12 h-12 text-zinc-600" />
              ) : state === 'connecting' ? (
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              ) : isSpeaking ? (
                <div className="flex items-end space-x-1.5 h-12">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, Math.random() * 40 + 10, 8] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                      className={cn("w-1 rounded-full", i % 2 === 0 ? "bg-pink-400" : "bg-indigo-400")}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Mic className="w-12 h-12 text-indigo-400 animate-pulse" />
                  <motion.div 
                    animate={{ width: [100, 140, 100] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="h-[1px] bg-indigo-500/50 mt-4" 
                  />
                </div>
              )}
            </motion.button>
          </div>
          
          {/* Identity & Status */}
          <div className="mt-12 text-center">
            <h1 className="text-5xl md:text-6xl font-light tracking-tighter mb-4">
              ZO<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">YA</span>
            </h1>
            <p className="text-zinc-400 text-lg sm:text-xl italic font-serif leading-relaxed max-w-sm">
              "Don't just stand there, say something smart, sweetheart."
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Controls & Tools */}
      <footer className="p-10 flex flex-col items-center z-20">
        <div className="flex items-center space-x-12 mb-10">
          <div className="flex flex-col items-center transition-opacity duration-300">
            <div className={cn(
              "w-12 h-12 rounded-2xl border flex items-center justify-center mb-2 shadow-inner transition-all duration-500",
              state === 'connected' && !isSpeaking ? "bg-indigo-950/20 border-indigo-500/50" : "bg-zinc-900 border-zinc-800"
            )}>
              <Mic className={cn("w-5 h-5 transition-colors", state === 'connected' && !isSpeaking ? "text-indigo-400" : "text-zinc-600")} />
            </div>
            <span className={cn("text-[9px] uppercase tracking-[0.2em] font-bold transition-colors", state === 'connected' && !isSpeaking ? "text-indigo-400" : "text-zinc-600")}>
              {state === 'connected' && !isSpeaking ? "Listening" : "Ready"}
            </span>
          </div>
          
          <div className="h-10 w-[1px] bg-zinc-800" />

          <div className="flex flex-col items-center opacity-100">
            <div className={cn(
              "w-12 h-12 rounded-2xl border flex items-center justify-center mb-2 transition-all duration-500",
              state === 'connected' ? "bg-pink-950/20 border-pink-500/50" : "bg-zinc-900 border-zinc-800"
            )}>
              <Globe className={cn("w-5 h-5 transition-colors", state === 'connected' ? "text-pink-400" : "text-zinc-600")} />
            </div>
            <span className={cn("text-[9px] uppercase tracking-[0.2em] font-bold transition-colors", state === 'connected' ? "text-pink-400" : "text-zinc-600")}>
              Tools Active
            </span>
          </div>
        </div>

        {/* Quick Active Indicator */}
        <div className="w-64 h-1 bg-zinc-900 rounded-full overflow-hidden mb-4">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: state === 'connected' ? "100%" : "0%" }}
            className="h-full bg-gradient-to-r from-indigo-500 to-pink-500" 
          />
        </div>
        
        <div className="flex items-center gap-4 text-[9px] text-zinc-600 uppercase tracking-widest font-mono">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Latency: {state === 'connected' ? "142ms" : "---"}
          </span>
          <span className="w-1 h-1 bg-zinc-800 rounded-full" />
          <span>Buffer: PCM16</span>
          <span className="w-1 h-1 bg-zinc-800 rounded-full" />
          <span className="flex items-center gap-1 text-pink-500/80">
            <Heart className="w-3 h-3 fill-current" />
            Emotion: {isSpeaking ? "Teasing" : "Observing"}
          </span>
        </div>
      </footer>
      
      {/* Visual Error handling */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-red-950/80 border border-red-500/50 px-6 py-3 rounded-2xl backdrop-blur-md"
          >
            <p className="text-red-200 text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
