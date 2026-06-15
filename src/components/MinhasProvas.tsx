import React, { useState } from "react";
import { AppData, Prova, ProvaDisciplina, ProvaTopic } from "../types";
import { Trophy, Calendar, Sliders, ChevronDown, CheckSquare, Sparkles, TrendingUp, Edit3, Trash2, RotateCcw, Save } from "lucide-react";

interface MinhasProvasProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  persistData: (updated: AppData) => void;
  toast: (msg: string, type?: "ok" | "err" | "info") => void;
  openModal: (html: React.ReactNode) => void;
  closeModal: () => void;
}

export default function MinhasProvas({
  appData,
  setAppData,
  persistData,
  toast,
  openModal,
  closeModal
}: MinhasProvasProps) {
  const [activeProvaId, setActiveProvaId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<"geral" | "disciplinas" | "calendario" | "stats" | "config">("geral");

  // Get current active details
  const activeProva = appData.provas.find(p => p.id === activeProvaId);

  // Today helper
  const getTodayYmd = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const parseYmd = (s: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
    return new Date(s + "T00:00:00");
  };

  // Calculations
  const getTotals = (p: Prova) => {
    let total = 0;
    let read = 0;
    p.disciplinas.forEach(d => {
      total += d.total || 0;
      read += Math.min(d.read || 0, d.total || 0);
    });
    const pct = total > 0 ? Math.round((read / total) * 100) : 0;
    return { total, read, pct };
  };

  const getActiveDaysLeft = (p: Prova): number => {
    const examDate = parseYmd(p.dataProva);
    if (!examDate) return 0;
    const startDate = parseYmd(p.inicio) || new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = today < startDate ? startDate : today;
    let count = 0;
    const runner = new Date(checkDate);

    while (runner <= examDate) {
      const ymdStr = `${runner.getFullYear()}-${String(runner.getMonth() + 1).padStart(2, "0")}-${String(runner.getDate()).padStart(2, "0")}`;
      if (p.dias?.[ymdStr] !== "missed") {
        count++;
      }
      runner.setDate(runner.getDate() + 1);
    }
    return count;
  };

  const getDailyTarget = (p: Prova): number => {
    if (p.manualPPD) return p.manualPPD;
    const { total, read } = getTotals(p);
    const leftPages = Math.max(0, total - read);
    const utilDays = getActiveDaysLeft(p);
    return utilDays > 0 ? Math.ceil(leftPages / utilDays) : 0;
  };

  const getDaysToExam = (p: Prova): number | null => {
    const examDate = parseYmd(p.dataProva);
    if (!examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((examDate.getTime() - today.getTime()) / 86400000));
  };

  const getStreak = (p: Prova): number => {
    let count = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);

    const getStr = (dateObj: Date) => `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    if (p.dias?.[getStr(d)] !== "studied") {
      d.setDate(d.getDate() - 1);
    }
    while (p.dias?.[getStr(d)] === "studied") {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  };

  const getStudiedDaysCount = (p: Prova): number => {
    return Object.values(p.dias || {}).filter(v => v === "studied").length;
  };

  const handleCreateProva = () => {
    openModal(
      <form onSubmit={e => {
        e.preventDefault();
        const nome = (document.getElementById("pvName") as HTMLInputElement).value.trim();
        const banca = (document.getElementById("pvBanca") as HTMLInputElement).value.trim();
        const cargo = (document.getElementById("pvCargo") as HTMLInputElement).value.trim();
        const status = (document.getElementById("pvStatus") as HTMLSelectElement).value;
        const inicio = (document.getElementById("pvStart") as HTMLInputElement).value || getTodayYmd();
        const dataProva = (document.getElementById("pvExamDate") as HTMLInputElement).value;

        if (!nome) {
          alert("Nome do Concurso / Tribunal é obrigatório.");
          return;
        }

        const nextProva: Prova = {
          id: `p_${Date.now()}`,
          nome,
          banca,
          cargo,
          status,
          obs: "",
          inicio,
          dataProva,
          disciplinas: [],
          dias: {},
          pomo: { day: "", focusToday: 0, total: 0 },
          manualPPD: null
        };

        const updated = { ...appData, provas: [...appData.provas, nextProva] };
        setAppData(updated);
        persistData(updated);
        setActiveProvaId(nextProva.id);
        setPanelTab("geral");
        closeModal();
        toast(`Concurso "${nome}" criado com sucesso!`, "ok");
      }} className="p-1 text-slate-700">
        <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2 mb-2 font-sans">
          🎯 Novo Planejamento de Concurso
        </h3>
        <p className="text-xs text-slate-400 italic mb-4">Insira o Tribunal judicial, a banca examinadora do concurso e planeje suas leituras.</p>
        <div className="grid grid-cols-2 gap-3 mb-2 animate-none">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Órgão / Tribunal</label>
            <input id="pvName" placeholder="Ex: TJSC" className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" required />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Banca Examinadora</label>
            <input id="pvBanca" placeholder="Ex: FGV" className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Cargo Estudado</label>
            <input id="pvCargo" placeholder="Juiz de Direito Substituto" className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
          <div className="field animate-none">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Status de Edital</label>
            <select id="pvStatus" className="w-full px-2 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none cursor-pointer focus:border-indigo-400 focus:bg-white">
              <option value="Aguardando edital">Aguardando edital</option>
              <option value="Inscrito">Inscrito</option>
              <option value="1ª Fase (Objetiva)">1ª Fase (Objetiva)</option>
              <option value="2ª Fase (Discursiva)">2ª Fase (Discursiva)</option>
              <option value="Fase Oral">Fase Oral</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4 animate-none">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Início do Planejamento</label>
            <input id="pvStart" type="date" defaultValue={getTodayYmd()} className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Data Provável da Prova</label>
            <input id="pvExamDate" type="date" className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" required />
          </div>
        </div>
        <div className="flex justify-end gap-2 animate-none">
          <button type="button" className="btn ghost px-4 py-2 text-slate-500 hover:text-slate-700" onClick={closeModal}>Cancelar</button>
          <button type="submit" className="px-4 py-2 font-bold text-xs bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg cursor-pointer">Criar Concurso</button>
        </div>
      </form>
    );
  };

  const handleEditProva = (p: Prova) => {
    openModal(
      <form onSubmit={e => {
        e.preventDefault();
        const nome = (document.getElementById("pvName") as HTMLInputElement).value.trim();
        const banca = (document.getElementById("pvBanca") as HTMLInputElement).value.trim();
        const cargo = (document.getElementById("pvCargo") as HTMLInputElement).value.trim();
        const status = (document.getElementById("pvStatus") as HTMLSelectElement).value;
        const inicio = (document.getElementById("pvStart") as HTMLInputElement).value;
        const dataProva = (document.getElementById("pvExamDate") as HTMLInputElement).value;

        if (!nome) return;

        const updated = { ...appData };
        const idx = updated.provas.findIndex(x => x.id === p.id);
        if (idx >= 0) {
          updated.provas[idx] = {
            ...updated.provas[idx],
            nome,
            banca,
            cargo,
            status,
            inicio,
            dataProva
          };
        }

        setAppData(updated);
        persistData(updated);
        closeModal();
        toast("Dados do concurso atualizados.", "ok");
      }} className="p-1 text-slate-700">
        <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2 mb-2 font-sans">
          🎯 Editar {p.nome}
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-2 animate-none">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Órgão / Tribunal</label>
            <input id="pvName" defaultValue={p.nome} className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" required />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Banca Examinadora</label>
            <input id="pvBanca" defaultValue={p.banca} className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-2 animate-none">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Cargo</label>
            <input id="pvCargo" defaultValue={p.cargo} className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Status</label>
            <select id="pvStatus" defaultValue={p.status} className="w-full px-2 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none cursor-pointer focus:border-indigo-400 focus:bg-white">
              <option value="Aguardando edital">Aguardando edital</option>
              <option value="Inscrito">Inscrito</option>
              <option value="1ª Fase (Objetiva)">1ª Fase (Objetiva)</option>
              <option value="2ª Fase (Discursiva)">2ª Fase (Discursiva)</option>
              <option value="Fase Oral">Fase Oral</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4 animate-none">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Início do Planejamento</label>
            <input id="pvStart" type="date" defaultValue={p.inicio} className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Data Provável da Prova</label>
            <input id="pvExamDate" type="date" defaultValue={p.dataProva} className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white" required />
          </div>
        </div>
        <div className="flex justify-end gap-2 animate-none">
          <button type="button" className="btn ghost px-4 py-2 text-slate-500 hover:text-slate-700" onClick={closeModal}>Cancelar</button>
          <button type="submit" className="px-4 py-2 font-bold text-xs bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg cursor-pointer">Editar Dados</button>
        </div>
      </form>
    );
  };

  const handleCycleDay = (p: Prova, ymdStr: string) => {
    const updated = { ...appData };
    const pObj = updated.provas.find(x => x.id === p.id);
    if (pObj) {
      pObj.dias = pObj.dias || {};
      const state = pObj.dias[ymdStr];
      if (!state) pObj.dias[ymdStr] = "studied";
      else if (state === "studied") pObj.dias[ymdStr] = "missed";
      else delete pObj.dias[ymdStr];
    }
    setAppData(updated);
    persistData(updated);
  };

  const renderDashboardSelection = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
        <h4 className="font-sans font-bold text-lg text-slate-900 flex items-center gap-1.5">
          🎯 Sprints e Planejamento de Provas ({appData.provas.length})
        </h4>
        <button className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.01]" onClick={handleCreateProva}>
          ＋ Cadastrar Prova
        </button>
      </div>

      {appData.provas.length === 0 ? (
        <div className="text-center py-12 font-sans italic text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/55 select-none">
          Nenhum concurso está registrado no momento.<br />Cadastre seus principais editais-alvo para receber metas diárias personalizadas de leitura.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appData.provas.map(p => {
            const totals = getTotals(p);
            const daysLeft = getDaysToExam(p);
            return (
              <div key={p.id} className="p-5 bg-white border border-slate-200 rounded-2xl relative shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all text-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2.5 select-none">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                      {p.status}
                    </span>
                    {daysLeft !== null && (
                      <span className="chip bg-amber-50 border border-amber-200 text-amber-700 font-bold font-mono text-[10px] py-0.5 px-2 rounded-md">
                        ⏳ {daysLeft} dias restantes
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold font-sans text-lg text-slate-900 leading-tight mb-1">{p.nome}</h3>
                  <div className="text-xs text-slate-450 mb-4 leading-none">
                    🏛️ {p.banca} · {p.cargo} {p.dataProva && `· 📅 ${p.dataProva.split("-").reverse().join("/")}`}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1 font-mono">
                      <span>Metas Paginação</span>
                      <span>{totals.pct}% ({totals.read} / {totals.total} págs)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${totals.pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 select-none mt-3">
                  <button className="flex-1 text-xs py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl cursor-pointer transition-all border border-slate-200 shadow-sm" onClick={() => { setActiveProvaId(p.id); setPanelTab("geral"); }}>
                    Abrir Estudo
                  </button>
                  <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer" onClick={() => handleEditProva(p)}>
                    <Edit3 size={13} />
                  </button>
                  <button className="p-2 border border-slate-200 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer" onClick={() => {
                    if (confirm("Remover esse certame e todos os registros de presença?")) {
                      const updated = { ...appData, provas: appData.provas.filter(x => x.id !== p.id) };
                      setAppData(updated);
                      persistData(updated);
                      toast("Concurso removido.", "info");
                    }
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderActiveGeralTab = (p: Prova) => {
    const { total, read, pct } = getTotals(p);
    const dLeft = getDaysToExam(p);
    const meta = getDailyTarget(p);
    const uDays = getActiveDaysLeft(p);
    const streak = getStreak(p);
    const studiedCount = getStudiedDaysCount(p);

    const todayStr = getTodayYmd();
    const isStudiedToday = p.dias?.[todayStr] === "studied";
    const isMissedToday = p.dias?.[todayStr] === "missed";

    return (
      <div className="space-y-4">
        {/* Quick analytics info */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
            <span className="block font-sans text-2xl font-bold text-slate-800 leading-tight">{dLeft !== null ? dLeft : "—"}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">dias p/ prova</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
            <span className="block font-sans text-2xl font-bold text-indigo-600 leading-tight">{pct}%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{read}/{total} págs</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
            <span className="block font-sans text-2xl font-bold text-amber-500 leading-tight">{meta}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">págs / dia</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
            <span className="block font-sans text-2xl font-bold text-slate-800 leading-tight">{streak}🔥</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-medium">sequência</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
            <span className="block font-sans text-2xl font-bold text-slate-800 leading-tight">{studiedCount}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">dias estudados</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
            <span className="block font-sans text-2xl font-bold text-slate-800 leading-tight">{uDays}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">úteis restando</span>
          </div>
        </div>

        {/* Action card */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="font-sans font-bold text-xs uppercase text-slate-400 mb-2 tracking-wider font-semibold">Compromisso do Dia</h4>
          <div className="flex items-center flex-wrap sm:flex-nowrap justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-1 leading-relaxed">
                Leitura diária obrigatória calculada: <b className="text-indigo-650 font-mono text-base">{meta} páginas</b> para bater o edital.
              </p>
              <p className="text-xs text-slate-400 italic">
                Hoje é dia {todayStr.split("-").reverse().join("/")}. Mantenha a consistência de leitura focada!
              </p>
            </div>
            
            <div className="flex gap-2 shrink-0 select-none">
              {isStudiedToday ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">✓ Concluído hoje!</span>
                  <button className="text-xs text-slate-400 underline hover:text-slate-600 cursor-pointer" onClick={() => handleCycleDay(p, todayStr)}>desmarcar</button>
                </div>
              ) : isMissedToday ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-650 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">✕ Não estudei hoje</span>
                  <button className="text-xs text-slate-400 underline hover:text-slate-600 cursor-pointer" onClick={() => handleCycleDay(p, todayStr)}>desmarcar</button>
                </div>
              ) : (
                <>
                  <button className="px-4 py-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm cursor-pointer" onClick={() => handleCycleDay(p, todayStr)}>
                    ✓ Li a Meta
                  </button>
                  <button className="px-3 py-2 font-bold text-xs border border-slate-200 hover:bg-slate-100 shadow-sm rounded-xl text-red-500 cursor-pointer" onClick={() => {
                    const updated = { ...appData };
                    const pObj = updated.provas.find(x => x.id === p.id);
                    if (pObj) pObj.dias[todayStr] = "missed";
                    setAppData(updated);
                    persistData(updated);
                  }}>
                    ✕ Não estudei
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveDisciplinasTab = (p: Prova) => {
    const handleDiscFieldChange = (did: string, field: "read" | "total", val: number) => {
      const updated = { ...appData };
      const pObj = updated.provas.find(x => x.id === p.id);
      if (pObj) {
        const dObj = pObj.disciplinas.find(d => d.id === did);
        if (dObj) {
          dObj[field] = Math.max(0, val);
        }
      }
      setAppData(updated);
      persistData(updated);
    };

    const handleSyllabusImport = () => {
      const updated = { ...appData };
      const pObj = updated.provas.find(x => x.id === p.id);
      if (!pObj) return;

      let imported = 0;
      appData.notebooks.forEach(nb => {
        if (!pObj.disciplinas.some(d => d.name.toLowerCase().trim() === nb.name.toLowerCase().trim())) {
          pObj.disciplinas.push({
            id: `d_${Date.now()}_${Math.random().toString(36).substring(3, 6)}`,
            name: nb.name,
            total: 0,
            read: 0,
            topics: []
          });
          imported++;
        }
      });

      setAppData(updated);
      persistData(updated);
      toast(`${imported} disciplinas importadas com base nos seus cadernos de Direito.`, "ok");
    };

    const handleCreateDisc = () => {
      const nm = prompt("Insira o nome da nova disciplina (ex: Direito Processual Civil):");
      if (!nm) return;
      const updated = { ...appData };
      const pObj = updated.provas.find(x => x.id === p.id);
      if (pObj) {
        pObj.disciplinas.push({
          id: `d_${Date.now()}`,
          name: nm,
          total: 0,
          read: 0,
          topics: []
        });
      }
      setAppData(updated);
      persistData(updated);
    };

    const handleModifyTopics = (d: ProvaDisciplina) => {
      const currentListStr = d.topics.map(t => t.t).join("\n");
      openModal(
        <div className="p-1 text-slate-700">
          <h3 className="font-semibold text-lg text-slate-900 mb-1 font-sans">
            ✏️ Editar Programa de Tópicos — {d.name}
          </h3>
          <p className="text-xs text-slate-400 mb-3">Escreva um tópico por linha do edital cobrado.</p>
          <textarea id="tempTopicsList" defaultValue={currentListStr} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 h-[220px] font-sans text-xs outline-none focus:border-indigo-400 focus:bg-white" />
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn ghost px-4 py-2 text-slate-500 hover:text-slate-700" onClick={closeModal}>Cancelar</button>
            <button className="px-4 py-2 font-semibold text-sm rounded bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
              const text = (document.getElementById("tempTopicsList") as HTMLTextAreaElement).value;
              const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
              
              const updated = { ...appData };
              const pObj = updated.provas.find(x => x.id === p.id);
              if (pObj) {
                const dObj = pObj.disciplinas.find(x => x.id === d.id);
                if (dObj) {
                  // presere checked matching ones
                  const mappedOld: { [key: string]: boolean } = {};
                  dObj.topics.forEach(t => mappedOld[t.t] = t.done);
                  dObj.topics = lines.map(line => ({ t: line, done: !!mappedOld[line] }));
                }
              }
              setAppData(updated);
              persistData(updated);
              closeModal();
              toast("Tópicos salvos no edital.", "ok");
            }}>Salvar Programa</button>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4 text-slate-800">
        <div className="flex gap-2 flex-wrap select-none border-b border-slate-200 pb-3">
          <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg cursor-pointer" onClick={handleCreateDisc}>
            ＋ Adicionar Disciplina
          </button>
          <button className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 font-bold bg-slate-50 text-xs rounded-lg flex items-center gap-1 text-slate-700 cursor-pointer" onClick={handleSyllabusImport}>
            <Sparkles size={12} className="text-amber-500" /> Importar das Matérias
          </button>
          <span className="text-[11px] text-slate-400 font-sans italic self-center">Acompanhe porcentagem por disciplina em sequência.</span>
        </div>

        {p.disciplinas.length === 0 ? (
          <div className="text-center py-10 font-sans italic text-slate-400">
            Nenhuma disciplina cadastrada neste concurso. Adicione manualmente ou importe do painel de cadernos.
          </div>
        ) : (
          p.disciplinas.map((d, dIdx) => {
            const pct = d.total > 0 ? Math.round((d.read / d.total) * 100) : 0;
            const completedTopics = d.topics.filter(x => x.done).length;

            return (
              <div key={d.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-slate-400 font-bold">#{dIdx + 1}</span>
                    <h3 className="font-sans font-bold text-base text-slate-900 leading-tight">{d.name}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs select-none">
                    <label className="flex items-baseline gap-1">
                      <span className="font-sans text-slate-400 text-[11px] italic font-semibold">páginas lidas:</span>
                      <input type="number" min={0} value={d.read || 0} onChange={e => handleDiscFieldChange(d.id, "read", parseInt(e.target.value) || 0)} className="w-[64px] text-center px-1.5 py-0.5 border border-slate-250 bg-white text-slate-800 rounded-md outline-none focus:border-indigo-400" />
                    </label>
                    <label className="flex items-baseline gap-1">
                      <span className="font-sans text-slate-400 text-[11px] italic font-semibold">de:</span>
                      <input type="number" min={1} value={d.total || 0} onChange={e => handleDiscFieldChange(d.id, "total", parseInt(e.target.value) || 0)} className="w-[64px] text-center px-1.5 py-0.5 border border-slate-250 bg-white text-slate-800 rounded-md outline-none focus:border-indigo-400" />
                    </label>

                    <button className="text-red-550 hover:text-red-700 p-1 cursor-pointer" title="Excluir" onClick={() => {
                      if (confirm("Remover esta disciplina?")) {
                        const updated = { ...appData };
                        const pObj = updated.provas.find(x => x.id === p.id);
                        if (pObj) pObj.disciplinas = pObj.disciplinas.filter(x => x.id !== d.id);
                        setAppData(updated);
                        persistData(updated);
                      }
                    }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden border border-slate-200/10">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Topics checklist */}
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-slate-700 font-semibold flex items-center justify-between pb-1 outline-none select-none">
                    <span>Programa do Edital ({completedTopics} / {d.topics.length} itens marcados)</span>
                    <ChevronDown size={14} />
                  </summary>
                  <div className="pt-2 pl-3 space-y-1.5 select-none border-t border-slate-100 text-slate-600 leading-normal max-h-[160px] overflow-y-auto pr-1">
                    {d.topics.length === 0 ? (
                      <span className="italic text-slate-455 block pb-1">Sem programa cadastrado. Use editar para inserir o edital.</span>
                    ) : (
                      d.topics.map((t, tIdx) => (
                        <label key={tIdx} className={`flex items-start gap-1.5 cursor-pointer leading-tight ${t.done ? "line-through opacity-45" : ""}`}>
                          <input type="checkbox" checked={t.done} onChange={() => {
                            const updated = { ...appData };
                            const pObj = updated.provas.find(x => x.id === p.id);
                            if (pObj) {
                              const dObj = pObj.disciplinas.find(x => x.id === d.id);
                              if (dObj && dObj.topics[tIdx]) {
                                dObj.topics[tIdx].done = !dObj.topics[tIdx].done;
                              }
                            }
                            setAppData(updated);
                            persistData(updated);
                          }} className="mt-0.5 cursor-pointer" />
                          <span>{t.t}</span>
                        </label>
                      ))
                    )}
                    <button className="text-[10px] uppercase font-bold text-indigo-600 mt-1 hover:underline block cursor-pointer" onClick={() => handleModifyTopics(d)}>
                      ✏️ Editar Lista de Tópicos
                    </button>
                  </div>
                </details>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderActiveCalendarioTab = (p: Prova) => {
    const startObj = parseYmd(p.inicio);
    const endObj = parseYmd(p.dataProva);

    if (!startObj || !endObj) {
      return (
        <div className="text-center py-10 font-sans italic text-slate-400">
          Você precisa configurar datas de início e da prova na aba "⚙️ Configuração" para desenhar o plano.
        </div>
      );
    }

    const todayStr = getTodayYmd();
    const calendarMonthsList: { month: number; year: number; label: string }[] = [];
    const runner = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
    const limitMonth = new Date(endObj.getFullYear(), endObj.getMonth(), 1);

    while (runner <= limitMonth) {
      calendarMonthsList.push({
        month: runner.getMonth(),
        year: runner.getFullYear(),
        label: `${runner.toLocaleDateString("pt-BR", { month: "long" })} ${runner.getFullYear()}`.toUpperCase()
      });
      runner.setMonth(runner.getMonth() + 1);
    }

    const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500 italic">
          📅 Clique sobre um dia útil para alternar a frequência: 
          <b className="text-emerald-600 ml-1">Estudei (Verde)</b> → <b className="text-rose-600 ml-1">Faltei (Vermelho)</b> → Limpar. 
          Dias falhados recalculam automaticamente sua meta de leitura.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 select-none">
          {calendarMonthsList.map(item => {
            const daysInMonth = new Date(item.year, item.month + 1, 0).getDate();
            const firstDayIndex = new Date(item.year, item.month, 1).getDay();

            const monthDaysCells = [];
            for (let i = 0; i < firstDayIndex; i++) {
              monthDaysCells.push(<div key={`empty-${i}`} />);
            }

            for (let dNum = 1; dNum <= daysInMonth; dNum++) {
              const ymdStr = `${item.year}-${String(item.month + 1).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
              const dDate = parseYmd(ymdStr);
              const insideScope = dDate && dDate >= startObj && dDate <= endObj;

              let cellClass = "aspect-square flex items-center justify-center text-xs font-semibold rounded-lg font-mono ";
              let title = ymdStr;
              let isClickable = false;

              if (!insideScope) {
                cellClass += "opacity-20 text-slate-300 pointer-events-none";
              } else if (ymdStr === p.dataProva) {
                cellClass += "bg-amber-500 text-white font-black border border-amber-600/60 cursor-default shadow-sm";
                title += " · DIA DA PROVA ⚖️";
              } else {
                isClickable = true;
                const state = p.dias?.[ymdStr];
                if (state === "studied") {
                  cellClass += "bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer";
                } else if (state === "missed") {
                  cellClass += "bg-rose-500 text-white hover:bg-rose-600 cursor-pointer";
                } else {
                  cellClass += "bg-white border border-slate-200 hover:border-indigo-400 text-slate-705 cursor-pointer shadow-sm";
                }

                if (ymdStr === todayStr) {
                  cellClass += " ring-2 ring-indigo-600 ring-offset-1 ring-offset-white";
                }
              }

              monthDaysCells.push(
                <div key={dNum} className={cellClass} title={title} onClick={() => isClickable && handleCycleDay(p, ymdStr)}>
                  {dNum}
                </div>
              );
            }

            return (
              <div key={item.label} className="bg-slate-50 p-4 border rounded-xl border-slate-200 shadow-sm">
                <h5 className="font-sans font-bold text-xs text-indigo-600 mb-3 text-center tracking-wider">{item.label}</h5>
                <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                  {weekdays.map((w, idx) => (
                    <div key={idx} className="text-center text-[10px] font-bold text-slate-400 pb-1">{w}</div>
                  ))}
                  {monthDaysCells}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActiveStatsTab = (p: Prova) => {
    const { total, read, pct } = getTotals(p);
    const streak = getStreak(p);
    const studiedCount = getStudiedDaysCount(p);

    const ds = p.disciplinas;

    return (
      <div className="space-y-4 font-sans text-slate-800">
        <h4 className="font-bold text-base text-slate-900">Parâmetros de Desempenho</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-3">Frequência Geral</h5>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-slate-800 font-mono">{studiedCount}</span>
              <span className="text-xs text-slate-500 font-sans">dias úteis de consistência no período</span>
            </div>
            <p className="text-xs text-slate-400 font-sans italic">Sequência atual consecutiva ativa: <b>{streak} dia(s) estudando sem falhar.</b></p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 select-none">
            <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Páginas Lidas por Ramos</h5>
            <div className="space-y-2 mt-2">
              {ds.map(d => {
                const subPct = d.total > 0 ? Math.round((d.read / d.total) * 100) : 0;
                return (
                  <div key={d.id} className="text-xs font-sans">
                    <div className="flex justify-between font-semibold text-slate-705 mb-0.5">
                      <span>{d.name}</span>
                      <span>{d.read}/{d.total} ({subPct}%)</span>
                    </div>
                    <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden border border-slate-200/10">
                      <div className="bg-indigo-650 h-full rounded-full" style={{ width: `${subPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveConfigTab = (p: Prova) => {
    const handleSetManualPPD = () => {
      const inputStr = (document.getElementById("cfgManualPPD") as HTMLInputElement).value;
      const parsedVal = inputStr ? parseInt(inputStr) : null;

      const updated = { ...appData };
      const pObj = updated.provas.find(x => x.id === p.id);
      if (pObj) {
        pObj.manualPPD = parsedVal;
      }
      setAppData(updated);
      persistData(updated);
      toast("Configurações das metas de páginas salvas.", "ok");
    };

    const handleZerarSprints = () => {
      if (confirm("CUIDADO: Isso irá apagar todo o seu histórico de presença, dias marcados errados e páginas estudadas voltando a zero neste concurso. Deseja continuar?")) {
        const updated = { ...appData };
        const pObj = updated.provas.find(x => x.id === p.id);
        if (pObj) {
          pObj.dias = {};
          pObj.disciplinas.forEach(d => {
            d.read = 0;
            d.topics.forEach(t => t.done = false);
          });
        }
        setAppData(updated);
        persistData(updated);
        toast("Zerar de sprints concluído.", "info");
      }
    };

    return (
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-none max-w-lg mx-auto text-slate-800 shadow-sm">
        <h4 className="font-sans font-bold text-base text-slate-900">Ajuste de Presença e Escalonamento</h4>
        
        <div className="field">
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Páginas de leitura diária imutável (Manual)</label>
          <input id="cfgManualPPD" type="number" defaultValue={p.manualPPD || ""} placeholder="Vazio para meta calibrada automática" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-850 outline-none focus:border-indigo-400" />
          <p className="text-[10px] text-slate-400 italic mt-0.5">Se deixado em branco, recalcularemos automaticamente a meta baseado em: (páginas restando / dias úteis restando).</p>
        </div>

        <div className="flex gap-2 justify-end pt-2 select-none">
          <button className="px-4 py-2 font-bold text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer" onClick={handleSetManualPPD}>
            Salvar Configurações
          </button>
          <button className="px-4 py-2 font-bold text-xs rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 cursor-pointer" onClick={handleZerarSprints}>
            Zerar Todo o Progresso
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-2">
      <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-4 md:p-6">
        {activeProva ? (
          <div>
            {/* Header Concurso active details */}
            <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-200 pb-3 mb-3 select-none">
              <div>
                <h3 className="font-sans font-bold text-xl text-slate-900 leading-tight">🎯 {activeProva.nome}</h3>
                <span className="text-xs text-slate-400 font-mono italic">Ingresso: {activeProva.inicio} | Prova: {activeProva.dataProva}</span>
              </div>
              <button className="text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg cursor-pointer" onClick={() => setActiveProvaId(null)}>
                ← Voltar concursos
              </button>
            </div>

            {/* Sub navigation metrics */}
            <div className="flex gap-2 flex-wrap mb-4 select-none">
              <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${panelTab === "geral" ? "bg-indigo-600 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150"}`} onClick={() => setPanelTab("geral")}>
                📊 Geral
              </button>
              <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${panelTab === "disciplinas" ? "bg-indigo-600 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150"}`} onClick={() => setPanelTab("disciplinas")}>
                📚 Disciplinas ({activeProva.disciplinas.length})
              </button>
              <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${panelTab === "calendario" ? "bg-indigo-600 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150"}`} onClick={() => setPanelTab("calendario")}>
                📅 Calendário
              </button>
              <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${panelTab === "stats" ? "bg-indigo-600 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150"}`} onClick={() => setPanelTab("stats")}>
                📈 Estatísticas
              </button>
              <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${panelTab === "config" ? "bg-indigo-600 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150"}`} onClick={() => setPanelTab("config")}>
                ⚙️ Config
              </button>
            </div>

            {panelTab === "geral" && renderActiveGeralTab(activeProva)}
            {panelTab === "disciplinas" && renderActiveDisciplinasTab(activeProva)}
            {panelTab === "calendario" && renderActiveCalendarioTab(activeProva)}
            {panelTab === "stats" && renderActiveStatsTab(activeProva)}
            {panelTab === "config" && renderActiveConfigTab(activeProva)}
          </div>
        ) : (
          renderDashboardSelection()
        )}
      </div>
    </div>
  );
}
