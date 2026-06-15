import React, { useState, useEffect, useRef } from "react";
import { AppData, Prova } from "../types";
import { Play, Pause, RotateCcw, AlertCircle, Award } from "lucide-react";

interface PomodoroProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  persistData: (updated: AppData) => void;
  toast: (msg: string, type?: "ok" | "err" | "info") => void;
  closeModal: () => void;
}

const MODES = {
  focus: { label: "🎯 Foco", time: 25 * 60, color: "#eab308" },
  short: { label: "☕ Pausa Curta", time: 5 * 60, color: "#10b981" },
  long: { label: "🛋️ Pausa Longa", time: 15 * 60, color: "#8b5cf6" }
};

export default function Pomodoro({
  appData,
  setAppData,
  persistData,
  toast,
  closeModal
}: PomodoroProps) {
  const [mode, setMode] = useState<"focus" | "short" | "long">("focus");
  const [timeLeft, setTimeLeft] = useState(MODES.focus.time);
  const [isRunning, setIsRunning] = useState(false);
  const [selProvaId, setSelNbId] = useState("");
  const [selDiscId, setSelDiscId] = useState("");

  const timerRef = useRef<any>(null);

  useEffect(() => {
    setTimeLeft(MODES[mode].time);
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [mode]);

  const handleToggle = () => {
    if (isRunning) {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            triggerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(MODES[mode].time);
  };

  const triggerBeep = (freq: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (err) {}
  };

  const triggerComplete = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    triggerBeep(mode === "focus" ? 880 : 440);

    const updated = { ...appData };
    if (mode === "focus") {
      updated.pomo.focusToday += 1;
      updated.pomo.total += 1;

      if (selProvaId) {
        const pObj = updated.provas.find(x => x.id === selProvaId);
        if (pObj) {
          pObj.pomo = pObj.pomo || { day: "", focusToday: 0, total: 0 };
          const today = new Date().toLocaleDateString("en-US"); // sig date
          if (pObj.pomo.day !== today) {
            pObj.pomo.day = today;
            pObj.pomo.focusToday = 1;
          } else {
            pObj.pomo.focusToday += 1;
          }
          pObj.pomo.total += 1;
        }
      }

      setAppData(updated);
      persistData(updated);
      toast("🍅 Excelente! Sessão de Foco de 25m finalizada. Aproveite uma pausa legal.", "ok");
      
      const nextMode = updated.pomo.focusToday % 4 === 0 ? "long" : "short";
      setMode(nextMode as any);
    } else {
      toast("⏰ Pausa concluída! De volta ao trabalho.", "info");
      setMode("focus");
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // calculate circular path offset
  const circumference = 2 * Math.PI * 88;
  const strokeOffset = circumference * (1 - timeLeft / MODES[mode].time);

  const activeProva = appData.provas.find(x => x.id === selProvaId);
  const activeDiscName = activeProva?.disciplinas.find(x => x.id === selDiscId)?.name;

  return (
    <div className="text-center p-2 text-slate-800">
      <h3 className="font-sans font-bold text-lg text-slate-900 flex items-center justify-center gap-1.5 mb-1 animate-none">
        ⏱️ Temporizador de Concentração
      </h3>
      <p className="text-xs text-slate-400 italic mb-4">Mantenha a consistência de leitura focada sem distrações.</p>

      {/* Sprints selectors */}
      <div className="flex gap-2 justify-center mb-6 select-none text-xs">
        {Object.keys(MODES).map((mdKey: any) => (
          <button
            key={mdKey}
            className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
              mode === mdKey ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => !isRunning && setMode(mdKey as any)}
          >
            {(MODES as any)[mdKey].label}
          </button>
        ))}
      </div>

      {/* SVG Ring progress */}
      <div className="relative flex justify-center items-center h-[200px] mb-6">
        <svg className="transform -rotate-90" width="200" height="200" viewBox="0 0 200 200">
          <circle className="fill-none stroke-slate-100" cx="100" cy="100" r="88" strokeWidth="8" />
          <circle
            className="fill-none transition-all duration-300"
            cx="100"
            cy="100"
            r="88"
            strokeWidth="8"
            strokeLinecap="round"
            stroke={MODES[mode].color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
          />
        </svg>

        {/* Dynamic Display inside Ring */}
        <div className="absolute flex flex-col items-center justify-center select-none text-center">
          <span className="block font-sans text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">
            {timeStr}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {isRunning ? "Ativo" : "Pausado"}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex gap-2 justify-center mb-6 select-none">
        <button className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer" onClick={handleReset}>
          <RotateCcw size={14} className="text-slate-600" />
        </button>
        <button
          className="btn px-8 py-2.5 font-bold text-sm rounded-xl text-white shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          style={{ backgroundColor: MODES[mode].color === "#eab308" ? "#6366f1" : MODES[mode].color }}
          onClick={handleToggle}
        >
          {isRunning ? "Pausar" : "Iniciar Foco"}
        </button>
        <button className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-600 cursor-pointer" onClick={triggerComplete}>
          Pular ⏭
        </button>
      </div>

      {/* Config linkage */}
      <div className="border-t border-slate-200 pt-4 flex flex-col items-center gap-3">
        <div className="grid grid-cols-2 gap-2 text-left w-full text-xs animate-none max-w-sm">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-450 mb-0.5">Concurso Alvo (Opcional)</label>
            <select
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 outline-none cursor-pointer"
              value={selProvaId}
              onChange={e => {
                setSelNbId(e.target.value);
                setSelDiscId("");
              }}
            >
              <option value="">Sem vínculo</option>
              {appData.provas.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-450 mb-0.5">Ramo Disciplinar</label>
            <select
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 outline-none cursor-pointer"
              value={selDiscId}
              onChange={e => setSelDiscId(e.target.value)}
            >
              <option value="">Sem vínculo</option>
              {activeProva?.disciplinas.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global progress */}
        <div className="text-xs text-slate-600 flex items-center gap-1 font-sans select-none mt-2">
          <Award size={15} className="text-indigo-600" />
          <span>
            Hoje: <b>{appData.pomo.focusToday} sessões</b> ({appData.pomo.focusToday * 25} min) de leitura focada · Total: <b>{appData.pomo.total}</b>
          </span>
        </div>
      </div>

      <div className="modal-foot mt-4 border-t border-slate-200 pt-3 flex justify-end">
        <button className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 cursor-pointer font-bold" onClick={closeModal}>Fechar</button>
      </div>
    </div>
  );
}
