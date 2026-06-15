import React, { useState, useEffect } from "react";
import { AppData, Tese, Sumula, Node, Notebook } from "../types";
import { Search, Plus, Sliders, Settings, Link, Trash2, Edit2, ShieldAlert, Sparkles, BookOpen, Clipboard, Eye, FileSpreadsheet } from "lucide-react";
import { EDITAL_STRUCTURE } from "../data/edital";

interface TesesSumulasProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  persistData: (updated: AppData) => void;
  toast: (msg: string, type?: "ok" | "err" | "info") => void;
  openModal: (html: React.ReactNode) => void;
  closeModal: () => void;
}

export default function TesesSumulas({
  appData,
  setAppData,
  persistData,
  toast,
  openModal,
  closeModal
}: TesesSumulasProps) {
  const [subTab, setSubTab] = useState<"teses" | "sumulas" | "importers">("teses");

  // Filters State
  const [q, setQ] = useState("");
  const [orgao, setOrgao] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [ramo, setRamo] = useState("");
  const [origem, setOrigem] = useState("todos");
  const [nodeFilterId, setNodeFilterId] = useState("");

  // Helper selectors
  const getSubpastaLabel = (nodeId: string): string => {
    let label = "";
    appData.notebooks.forEach(nb => {
      const search = (nodes: Node[], path: string[]) => {
        for (let n of nodes) {
          if (n.id === nodeId) {
            label = `${nb.name} › ${[...path, n.name].join(" › ")}`;
            return;
          }
          if (n.children) search(n.children, [...path, n.name]);
        }
      };
      search(nb.children, []);
    });
    return label || "Subpasta";
  };

  // Auto linkage logic by text checking
  const bestMatchingNodeId = (text: string, notebookObj: Notebook): string | null => {
    const tokens = text.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(t => t.length > 3);
    if (!tokens.length) return null;

    let bestId: string | null = null;
    let maxMatch = 0;

    const traverse = (nodes: Node[]) => {
      for (const n of nodes) {
        const nameTokens = n.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, " ").split(/\s+/);
        let matchCount = 0;
        tokens.forEach(tok => {
          if (nameTokens.includes(tok)) matchCount++;
        });
        if (matchCount > maxMatch) {
          maxMatch = matchCount;
          bestId = n.id;
        }
        if (n.children) traverse(n.children);
      }
    };
    traverse(notebookObj.children);
    return maxMatch >= 1 ? bestId : null;
  };

  const getNotebookByRamo = (branchName: string): Notebook | null => {
    if (!branchName) return null;
    const cleanBranch = branchName.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
    return appData.notebooks.find(n => n.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "").includes(cleanBranch) || cleanBranch.includes(n.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, ""))) || null;
  };

  const handleAutoLinkAll = () => {
    const updated = { ...appData };
    let totalLinked = 0;

    updated.teses.forEach(t => {
      if (t.ramo) {
        const nbObj = getNotebookByRamo(t.ramo);
        if (nbObj) {
          const matchingId = bestMatchingNodeId(t.tema + " " + t.teseFirmada, nbObj);
          if (matchingId && !t.links.includes(matchingId)) {
            t.links.push(matchingId);
            totalLinked++;
          }
        }
      }
    });

    updated.sumulas.forEach(s => {
      if (s.ramo) {
        const nbObj = getNotebookByRamo(s.ramo);
        if (nbObj) {
          const matchingId = bestMatchingNodeId(s.tema + " " + s.enunciado, nbObj);
          if (matchingId && !s.links.includes(matchingId)) {
            s.links.push(matchingId);
            totalLinked++;
          }
        }
      }
    });

    if (totalLinked > 0) {
      setAppData(updated);
      persistData(updated);
      toast(`${totalLinked} novos vínculos criados automaticamente com base nos Ramos de Direito.`, "ok");
    } else {
      toast("Nenhum novo vínculo encontrado. Certifique-se de que os ramos de Direito combinam com o nome de seus cadernos.", "info");
    }
  };

  // --- REPOSITORIO DE TESES VINCULANTES ---
  const handleTeseForm = (id?: string) => {
    const existing = appData.teses.find(x => x.id === id);
    let editLinks = existing ? [...existing.links] : [];

    const handleTeseSave = () => {
      const orgaoVal = (document.getElementById("teOrgao") as HTMLSelectElement).value;
      const tipoVal = (document.getElementById("teTipo") as HTMLSelectElement).value;
      const statusVal = (document.getElementById("teStatus") as HTMLSelectElement).value;
      const temaVal = (document.getElementById("teTema") as HTMLInputElement).value.trim();
      const teseVal = (document.getElementById("teTeseText") as HTMLTextAreaElement).value.trim();
      const procVal = (document.getElementById("teProc") as HTMLInputElement).value.trim();
      const ramoVal = (document.getElementById("teRamo") as HTMLSelectElement).value;
      const dataVal = (document.getElementById("teDataText") as HTMLInputElement).value.trim();
      const obsVal = (document.getElementById("teObs") as HTMLTextAreaElement).value.trim();

      if (!temaVal || !teseVal) {
        alert("Tema/Número e a Tese firmada são obrigatórios.");
        return;
      }

      const updated = { ...appData };
      if (id) {
        const idx = updated.teses.findIndex(x => x.id === id);
        if (idx >= 0) {
          updated.teses[idx] = {
            ...updated.teses[idx],
            orgao: orgaoVal,
            tipo: tipoVal,
            status: statusVal,
            tema: temaVal,
            teseFirmada: teseVal,
            processo: procVal,
            ramo: ramoVal,
            data: dataVal,
            obs: obsVal,
            links: editLinks
          };
        }
      } else {
        const item: Tese = {
          id: `t_${Date.now()}`,
          orgao: orgaoVal,
          tipo: tipoVal,
          status: statusVal,
          tema: temaVal,
          teseFirmada: teseVal,
          processo: procVal,
          ramo: ramoVal,
          data: dataVal,
          origem: "Cadastro manual",
          obs: obsVal,
          links: editLinks,
          createdAt: Date.now()
        };
        updated.teses.push(item);
      }

      setAppData(updated);
      persistData(updated);
      closeModal();
      toast("Tese salva com sucesso.", "ok");
    };

    const LinkWidget = () => {
      const [selNb, setSelNb] = useState(appData.notebooks[0]?.id || "");
      const [selNode, setSelNode] = useState("");
      const [activeLinks, setActiveLinks] = useState<string[]>(editLinks);

      const nbObj = appData.notebooks.find(n => n.id === selNb);
      const nodesOptions: { id: string; name: string }[] = [];
      if (nbObj) {
        const fill = (list: Node[], level: number) => {
          list.forEach(n => {
            nodesOptions.push({ id: n.id, name: "— ".repeat(level) + n.name });
            if (n.children) fill(n.children, level + 1);
          });
        };
        fill(nbObj.children, 0);
      }

      const appendLink = () => {
        if (!selNode) return;
        if (!activeLinks.includes(selNode)) {
          const next = [...activeLinks, selNode];
          editLinks = next;
          setActiveLinks(next);
        }
      };

      const removeLink = (nid: string) => {
        const next = activeLinks.filter(x => x !== nid);
        editLinks = next;
        setActiveLinks(next);
      };

      return (
        <div className="bg-[#efe2c7]/20 p-3 rounded-xl border border-[#8a7a5c]/20 my-3">
          <label className="block text-xs font-bold uppercase text-[#5c4a38] mb-1">Vincular a Subpastas das Matérias</label>
          <div className="flex gap-2 mb-2 flex-wrap sm:flex-nowrap">
            <select className="px-2 py-1.5 border rounded-lg bg-white bg-opacity-80 text-xs flex-1" value={selNb} onChange={e => { setSelNb(e.target.value); setSelNode(""); }}>
              <option value="">Selecione Caderno...</option>
              {appData.notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
            </select>
            <select className="px-2 py-1.5 border rounded-lg bg-white bg-opacity-80 text-xs flex-1" value={selNode || ""} onChange={e => setSelNode(e.target.value)}>
              <option value="">Selecione Subpasta...</option>
              {nodesOptions.map(no => <option key={no.id} value={no.id}>{no.name}</option>)}
            </select>
            <button className="btn sm px-3 py-1 font-semibold rounded bg-[#b8860b] text-white" onClick={appendLink}>vincular</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeLinks.map(lid => (
              <span key={lid} className="chip bg-white border px-2 py-0.5 rounded text-[11px] font-sans flex items-center gap-1">
                {getSubpastaLabel(lid)}
                <b className="text-red-700 cursor-pointer pl-1 hover:scale-110" onClick={() => removeLink(lid)}>✕</b>
              </span>
            ))}
          </div>
        </div>
      );
    };

    openModal(
      <div className="p-1 text-white">
        <h3 className="font-semibold text-lg text-white flex items-center gap-2 mb-1 font-serif">
          🏛️ {existing ? "Editar" : "Nova"} Tese Vinculante
        </h3>
        <p className="text-xs text-white/40 italic mb-3">Preencha os campos referentes às Súmulas Vinculantes ou Incidentes de Resolução Repercussão.</p>
        
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Órgão</label>
            <select id="teOrgao" defaultValue={existing?.orgao || "STF"} className="w-full px-2 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none">
              {appData.cats.orgaos.map(o => <option key={o} value={o} className="text-black">{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Tipo</label>
            <select id="teTipo" defaultValue={existing?.tipo || "Repercussão Geral"} className="w-full px-2 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none">
              {appData.cats.tipos.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Status</label>
            <select id="teStatus" defaultValue={existing?.status || "Trânsito em julgado"} className="w-full px-2 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none">
              {appData.cats.status.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Tema / ID</label>
            <input id="teTema" defaultValue={existing?.tema || ""} placeholder="Ex: Tema 1099" className="w-full px-3 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none focus:border-white/20 animate-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Leading Case / Processo</label>
            <input id="teProc" defaultValue={existing?.processo || ""} placeholder="Ex: RE 1.234.567" className="w-full px-3 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none focus:border-white/20 animate-none" />
          </div>
        </div>

        <div className="field mb-2">
          <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Teor da Tese Firmada</label>
          <textarea id="teTeseText" defaultValue={existing?.teseFirmada || ""} placeholder="Ementa oficial ou tese firmada..." className="w-full px-3 py-2 border border-white/10 rounded-lg text-xs h-[100px] bg-zinc-950 text-white outline-none focus:border-white/20 font-sans"></textarea>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2 animate-none">
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Ramo do Direito</label>
            <select id="teRamo" defaultValue={existing?.ramo || ""} className="w-full px-2 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none">
              <option value="" className="text-black">Selecione...</option>
              {appData.cats.ramos.map(r => <option key={r} value={r} className="text-black">{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Data Julgamento</label>
            <input id="teDataText" defaultValue={existing?.data || ""} placeholder="Ex: 27/02/2026" className="w-full px-3 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none focus:border-white/20 animate-none" />
          </div>
        </div>

        {/* Links Widget loaded here */}
        <LinkWidget />

        <div className="field mb-3 animate-none">
          <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Observações (modulação, divergências, etc)</label>
          <textarea id="teObs" defaultValue={existing?.obs || ""} className="w-full px-3 py-1.5 border border-white/10 rounded-lg text-xs h-[50px] bg-zinc-950 text-white outline-none focus:border-white/20"></textarea>
        </div>

        <div className="flex justify-end gap-2 text-xs animate-none">
          <button className="btn ghost px-4 py-2" onClick={closeModal}>Cancelar</button>
          <button className="btn primary px-4 py-2 font-semibold" onClick={handleTeseSave}>Salvar Tese</button>
        </div>
      </div>
    );
  };

  // --- REPOSITORIO DE SÚMULAS ---
  const handleSumulaForm = (id?: string) => {
    const existing = appData.sumulas.find(x => x.id === id);
    let editLinks = existing ? [...existing.links] : [];

    const handleSumulaSave = () => {
      const orgaoVal = (document.getElementById("suOrgao") as HTMLSelectElement).value;
      const statusVal = (document.getElementById("suStatus") as HTMLSelectElement).value;
      const temaVal = (document.getElementById("suTema") as HTMLInputElement).value.trim();
      const enunVal = (document.getElementById("suEnunText") as HTMLTextAreaElement).value.trim();
      const ramoVal = (document.getElementById("suRamo") as HTMLSelectElement).value;
      const obsVal = (document.getElementById("suObs") as HTMLTextAreaElement).value.trim();

      if (!temaVal || !enunVal) {
        alert("Número da Súmula e Enunciado são obrigatórios.");
        return;
      }

      const updated = { ...appData };
      if (id) {
        const idx = updated.sumulas.findIndex(x => x.id === id);
        if (idx >= 0) {
          updated.sumulas[idx] = {
            ...updated.sumulas[idx],
            orgao: orgaoVal,
            status: statusVal,
            tema: temaVal,
            enunciado: enunVal,
            ramo: ramoVal,
            obs: obsVal,
            links: editLinks
          };
        }
      } else {
        const item: Sumula = {
          id: `s_${Date.now()}`,
          orgao: orgaoVal,
          status: statusVal,
          tema: temaVal,
          enunciado: enunVal,
          ramo: ramoVal,
          data: "",
          origem: "Cadastro manual",
          obs: obsVal,
          links: editLinks,
          createdAt: Date.now()
        };
        updated.sumulas.push(item);
      }

      setAppData(updated);
      persistData(updated);
      closeModal();
      toast("Súmula salva com sucesso.", "ok");
    };

    const LinkWidget = () => {
      const [selNb, setSelNb] = useState(appData.notebooks[0]?.id || "");
      const [selNode, setSelNode] = useState("");
      const [activeLinks, setActiveLinks] = useState<string[]>(editLinks);

      const nbObj = appData.notebooks.find(n => n.id === selNb);
      const nodesOptions: { id: string; name: string }[] = [];
      if (nbObj) {
        const fill = (list: Node[], level: number) => {
          list.forEach(n => {
            nodesOptions.push({ id: n.id, name: "— ".repeat(level) + n.name });
            if (n.children) fill(n.children, level + 1);
          });
        };
        fill(nbObj.children, 0);
      }

      const appendLink = () => {
        if (!selNode) return;
        if (!activeLinks.includes(selNode)) {
          const next = [...activeLinks, selNode];
          editLinks = next;
          setActiveLinks(next);
        }
      };

      const removeLink = (nid: string) => {
        const next = activeLinks.filter(x => x !== nid);
        editLinks = next;
        setActiveLinks(next);
      };

      return (
        <div className="bg-[#efe2c7]/20 p-3 rounded-xl border border-[#8a7a5c]/20 my-3">
          <label className="block text-xs font-bold uppercase text-[#5c4a38] mb-1">Vincular a Subpastas das Matérias</label>
          <div className="flex gap-2 mb-2 flex-wrap sm:flex-nowrap">
            <select className="px-2 py-1.5 border rounded-lg bg-white bg-opacity-80 text-xs flex-1" value={selNb} onChange={e => { setSelNb(e.target.value); setSelNode(""); }}>
              <option value="">Selecione Caderno...</option>
              {appData.notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
            </select>
            <select className="px-2 py-1.5 border rounded-lg bg-white bg-opacity-80 text-xs flex-1" value={selNode || ""} onChange={e => setSelNode(e.target.value)}>
              <option value="">Selecione Subpasta...</option>
              {nodesOptions.map(no => <option key={no.id} value={no.id}>{no.name}</option>)}
            </select>
            <button className="btn sm px-3 py-1 font-semibold rounded bg-[#b8860b] text-white" onClick={appendLink}>vincular</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeLinks.map(lid => (
              <span key={lid} className="chip bg-white border px-2 py-0.5 rounded text-[11px] font-sans flex items-center gap-1">
                {getSubpastaLabel(lid)}
                <b className="text-red-700 cursor-pointer pl-1 hover:scale-110" onClick={() => removeLink(lid)}>✕</b>
              </span>
            ))}
          </div>
        </div>
      );
    };

    openModal(
      <div className="p-1 text-white">
        <h3 className="font-semibold text-lg text-white flex items-center gap-2 mb-1 font-serif">
          § {existing ? "Editar" : "Nova"} Súmula ou Enunciado
        </h3>
        <p className="text-xs text-white/40 italic mb-3">Insira enunciados de súmulas do STF, STJ ou Turmas Nacionais.</p>

        <div className="grid grid-cols-2 gap-2 mb-2 animate-none">
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Órgão</label>
            <select id="suOrgao" defaultValue={existing?.orgao || "STF"} className="w-full px-2 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none">
              {appData.cats.orgaos.map(o => <option key={o} value={o} className="text-black">{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Status</label>
            <select id="suStatus" defaultValue={existing?.status || "Vigente"} className="w-full px-2 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none">
              <option value="Vigente" className="text-black">Vigente</option>
              <option value="Superada" className="text-black">Superada</option>
              <option value="Cancelada" className="text-black">Cancelada</option>
              <option value="Modulada" className="text-black">Modulada</option>
            </select>
          </div>
        </div>

        <div className="field mb-2 animate-none">
          <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Identificação / Nº Súmula</label>
          <input id="suTema" defaultValue={existing?.tema || ""} placeholder="Ex: Súmula 473" className="w-full px-3 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none focus:border-white/20" />
        </div>

        <div className="field mb-2 animate-none">
          <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Enunciado da Súmula</label>
          <textarea id="suEnunText" defaultValue={existing?.enunciado || ""} placeholder="Cole o teor completo do enunciado..." className="w-full px-3 py-2 border border-white/10 rounded-lg text-xs h-[100px] bg-zinc-950 text-white outline-none focus:border-white/20 font-sans"></textarea>
        </div>

        <div className="field mb-2 animate-none">
          <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Ramo do Direito</label>
          <select id="suRamo" defaultValue={existing?.ramo || ""} className="w-full px-2 py-1.5 border border-white/10 rounded-lg text-xs bg-zinc-950 text-white outline-none">
            <option value="" className="text-black">Selecione...</option>
            {appData.cats.ramos.map(r => <option key={r} value={r} className="text-black">{r}</option>)}
          </select>
        </div>

        {/* Links Widget loaded here */}
        <LinkWidget />

        <div className="field mb-3 animate-none">
          <label className="block text-[10px] font-bold uppercase text-white/50 mb-0.5">Observações Adicionais</label>
          <textarea id="suObs" defaultValue={existing?.obs || ""} className="w-full px-3 py-1.5 border border-white/10 rounded-lg text-xs h-[50px] bg-zinc-950 text-white outline-none focus:border-white/20"></textarea>
        </div>

        <div className="flex justify-end gap-2 text-xs animate-none">
          <button className="btn ghost px-4 py-2" onClick={closeModal}>Cancelar</button>
          <button className="btn primary px-4 py-2 font-semibold" onClick={handleSumulaSave}>Salvar Súmula</button>
        </div>
      </div>
    );
  };

  const handleBNPImportSubmit = () => {
    const rawVal = (document.getElementById("bnpArea") as HTMLTextAreaElement).value;
    if (!rawVal.trim()) return;

    // Parse BNP logic
    const lines = rawVal.replace(/\r/g, "").split("\n").map(l => l.trim());
    const ORG = /^(STF|STJ|TST|TSE|STM|TNU|TJSC|TJ[A-Z]{2}|TRF\s?-?\s?[1-6])$/;
    const UA = /^Última Atualiza[çc][ãa]o\s*:/i;
    const starts: number[] = [];

    for (let i = 0; i < lines.length - 1; i++) {
      if (ORG.test(lines[i]) && UA.test(lines[i + 1])) {
        starts.push(i);
      }
    }

    const importedTeses: Tese[] = [];
    for (let s = 0; s < starts.length; s++) {
      const a = starts[s];
      const b = s + 1 < starts.length ? starts[s + 1] : lines.length;
      const seg = lines.slice(a, b).filter(Boolean);
      if (seg.length < 2) continue;

      const orgao = seg[0].replace(/\s|-/g, "");
      const dataMatch = seg[1].match(/(\d{2}\/\d{2}\/\d{4})/);
      const valDate = dataMatch ? dataMatch[1] : "";
      const titulo = seg[2] || "";

      let questao = "";
      let tese = "";
      let ementa = "";
      let situations = "";
      let curBlock: string | null = null;

      const NOISE = /^(\*|©|\[|Lei Comentada|Todas as categorias|Anota|Artigos$|Selecione um trecho|Mostrar s[óo]|★|📖|📚|📄|⬇|⬆|☁|↑|↓|×|Sobre$|Manual$|Painel|Pesquisa avançada|Filtrar pesquisa|Data de atualiza|at[ée]$|Filtros aplicados|Foram encontrados|Itens por p[áa]gina|Ver hist[óo]rico|Decis[õo]es$|Processos$|Suspens[ãa]o$|\d+\s+de\s+\d+\s*$|^[\d\s]+$)/i;

      for (let k = 3; k < seg.length; k++) {
        let ln = seg[k];
        if (NOISE.test(ln)) continue;
        if (/^Quest[ãa]o\s*:/i.test(ln)) {
          curBlock = "q";
          questao = ln.replace(/^Quest[ãa]o\s*:\s*/i, "");
          continue;
        }
        if (/^Tese\s*:/i.test(ln)) {
          curBlock = "t";
          tese = ln.replace(/^Tese\s*:\s*/i, "");
          continue;
        }
        if (/^Ementa\s*:/i.test(ln)) {
          curBlock = "e";
          ementa = ln.replace(/^Ementa\s*:\s*/i, "");
          continue;
        }
        if (/^Situa[çc][ãa]o\s*:/i.test(ln)) {
          situations = ln.replace(/^Situa[çc][ãa]o\s*:\s*/i, "").replace(/\s*\|\s*$/, "");
          curBlock = null;
          continue;
        }
        if (/^Ver mais$/i.test(ln)) continue;

        if (curBlock === "q") questao += " " + ln;
        else if (curBlock === "t") tese += " " + ln;
        else if (curBlock === "e") ementa += " " + ln;
      }

      const bodyText = [
        questao && "Questão: " + questao.trim(),
        tese && "Tese: " + tese.trim(),
        ementa && "Ementa: " + ementa.trim()
      ].filter(Boolean).join("\n\n");

      if (titulo || bodyText) {
        importedTeses.push({
          id: `t_bnp_${Date.now()}_${Math.random().toString(36).substring(3, 7)}`,
          orgao,
          tipo: "Tese",
          tema: titulo,
          teseFirmada: bodyText,
          processo: "",
          ramo: "",
          data: valDate,
          status: situations || "Trânsito em julgado",
          origem: "Banco Nacional de Precedentes",
          obs: "",
          links: [],
          createdAt: Date.now()
        });
      }
    }

    if (importedTeses.length === 0) {
      toast("Nenhuma tese válida identificada. Certifique-se de copiar as linhas inteiras do BNP incluindo 'Questão:' ou 'Situação:'.", "err");
      return;
    }

    const updated = { ...appData };
    const existedSigs = new Set(updated.teses.map(t => `${t.orgao}|${t.tema.toLowerCase().trim()}`));
    let added = 0;

    importedTeses.forEach(t => {
      const sig = `${t.orgao}|${t.tema.toLowerCase().trim()}`;
      if (!existedSigs.has(sig)) {
        updated.teses.push(t);
        added++;
        existedSigs.add(sig);
      }
    });

    setAppData(updated);
    persistData(updated);
    toast(`${added} novas teses importadas do BNP (${importedTeses.length - added} duplicidades ignoradas).`, "ok");
    setSubTab("teses");
  };

  // --- GEMINI INTELLIGENT AI IMPORTER ---
  const [aiImpLoading, setAiImpLoading] = useState(false);

  const handleAIImportScan = async () => {
    const rawVal = (document.getElementById("aiImpTextArea") as HTMLTextAreaElement)?.value || "";
    if (!rawVal.trim()) {
      toast("Por favor, cole algum texto para a IA analisar.", "info");
      return;
    }

    setAiImpLoading(true);
    try {
      // Direct post to backend full-stack proxy `/api/ai/chat`
      const systemInstruction = `Você é um robô de análise de jurisprudência. Analise o texto e extraia precedentes judiciais (teses, súmulas, acórdãos importantes).
      Você DEVE retornar obrigatoriamente um objeto JSON com uma única chave "items" que contém um Array de objetos. Cada objeto deve seguir exatamente essa estrutura:
      {
        "orgao": "STF" | "STJ" | "TST" | "TSE" | "TNU" | "TJSC" | "OUTRO",
        "tipo": "Repercussão Geral" | "Recurso Repetitivo" | "Súmula Vinculante" | "Tese",
        "tema": "Tema XXX ou Número Súmula",
        "processo": "Leading Case Ex: RE 1.234.567",
        "teseFirmada": "Teor da decisão ou tese firmada",
        "ramo": "Uma área jurídica de preferência entre: Direito Constitucional, Direito Administrativo, Direito Civil, Direito Processual Civil, Direito Penal, Direito Processual Penal, Direito Empresarial, Direito Financeiro e Tributário, Direito Ambiental, Direito do Consumidor, Direito Eleitoral, Direito Previdenciário, Direitos Humanos",
        "status": "Trânsito em julgado" | "Pendente" | "Vigente"
      }
      Retorne apenas o JSON puro, sem trechos Markdown em volta ou explicações adicionais.`;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", text: rawVal.slice(0, 10000) }],
          systemInstruction,
          customApiKey: appData.version ? appData.viewPrefs ? "mock" : "" : "" // placeholder
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error?.message || "Houve um erro no servidor ao acionar o Gemini.");
      }

      const rawText = resJson.text || "";
      // Clean JSON delimiters if any
      const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleanedText);

      const items = (parsed.items || []) as any[];
      if (items.length === 0) {
        toast("A IA não conseguiu interpretar precedentes estruturados nesse bloco.", "err");
        setAiImpLoading(false);
        return;
      }

      // Add to repository reviewing automatically matching subpastas
      const updated = { ...appData };
      let created = 0;

      items.forEach((item: any) => {
        const links: string[] = [];
        const checkedRamo = item.ramo || "";
        if (checkedRamo) {
          const nb = getNotebookByRamo(checkedRamo);
          if (nb) {
            const bestId = bestMatchingNodeId(item.tema + " " + item.teseFirmada, nb);
            if (bestId) links.push(bestId);
          }
        }

        const t: Tese = {
          id: `t_ai_${Date.now()}_${Math.random().toString(36).substring(3, 7)}`,
          orgao: item.orgao || "STF",
          tipo: item.tipo || "Tese",
          status: item.status || "Trânsito em julgado",
          tema: item.tema || "Tema IA",
          processo: item.processo || "",
          teseFirmada: item.teseFirmada || "",
          ramo: checkedRamo,
          data: new Date().toLocaleDateString("pt-BR"),
          origem: "Importador Inteligente (IA)",
          obs: "Extraído automaticamente sobre jurisprudência livre (revisar vínculo).",
          links: links,
          createdAt: Date.now()
        };
        updated.teses.push(t);
        created++;
      });

      setAppData(updated);
      persistData(updated);
      toast(`IA concluiu a análise! ${created} novos itens estruturados foram inseridos e pré-vinculados aos cadernos com sucesso.`, "ok");
      setSubTab("teses");
    } catch (err: any) {
      console.error(err);
      toast(`Falha na IA: ${err.message}`, "err");
    } finally {
      setAiImpLoading(false);
    }
  };

  // Extract merged list of client-injected cadernos / text linked lists
  const getCombinedTeses = (): Tese[] => {
    const list: Tese[] = appData.teses.map(t => ({ ...t, _origem: "repo" }));
    appData.notebooks.forEach(nb => {
      const walkFill = (nodes: Node[], currentPath: string[]) => {
        nodes.forEach(n => {
          if (n.materials && n.materials.tese) {
            n.materials.tese.forEach(it => {
              list.push({
                id: it.id,
                orgao: "Caderno",
                tipo: "Tese",
                tema: it.title || "Sem número",
                teseFirmada: it.body || "",
                processo: it.source || "",
                ramo: nb.name,
                data: "",
                status: "Caderno",
                origem: "Do caderno",
                obs: "",
                links: [n.id],
                createdAt: it.createdAt,
                _origem: "caderno",
                _nodeId: n.id,
                _nb: nb.name,
                _path: [...currentPath, n.name].join(" › ")
              });
            });
          }
          if (n.children) walkFill(n.children, [...currentPath, n.name]);
        });
      };
      walkFill(nb.children, []);
    });

    // Custom filtering
    return list.filter(t => {
      if (tipo && t.tipo !== tipo) return false;
      if (orgao && t._origem === "repo" && t.orgao !== orgao) return false;
      if (status && t._origem === "repo" && t.status !== status) return false;
      if (ramo && t.ramo !== ramo) return false;
      if (origem !== "todos" && t._origem !== origem) return false;
      if (nodeFilterId && !t.links.includes(nodeFilterId)) return false;

      if (q) {
        const queryLower = q.toLowerCase();
        const searchPool = `${t.tema} ${t.teseFirmada} ${t.processo} ${t.ramo} ${t.orgao} ${t.obs}`.toLowerCase();
        if (!searchPool.includes(queryLower)) return false;
      }
      return true;
    });
  };

  const getCombinedSumulas = (): Sumula[] => {
    const list: Sumula[] = appData.sumulas.map(s => ({ ...s, _origem: "repo" }));
    appData.notebooks.forEach(nb => {
      const walkFill = (nodes: Node[], currentPath: string[]) => {
        nodes.forEach(n => {
          if (n.materials && n.materials.sumula) {
            n.materials.sumula.forEach(it => {
              list.push({
                id: it.id,
                orgao: "Caderno",
                tema: it.title || "Súmula",
                enunciado: it.body || "",
                ramo: nb.name,
                data: "",
                status: "Vigente",
                origem: "Súmula Caderno",
                obs: "",
                links: [n.id],
                createdAt: it.createdAt,
                _origem: "caderno",
                _nodeId: n.id,
                _nb: nb.name,
                _path: [...currentPath, n.name].join(" › ")
              });
            });
          }
          if (n.children) walkFill(n.children, [...currentPath, n.name]);
        });
      };
      walkFill(nb.children, []);
    });

    return list.filter(s => {
      if (orgao && s._origem === "repo" && s.orgao !== orgao) return false;
      if (ramo && s.ramo !== ramo) return false;
      if (origem !== "todos" && s._origem !== origem) return false;
      if (nodeFilterId && !s.links.includes(nodeFilterId)) return false;

      if (q) {
        const queryLower = q.toLowerCase();
        const searchPool = `${s.tema} ${s.enunciado} ${s.ramo} ${s.orgao} ${s.obs}`.toLowerCase();
        if (!searchPool.includes(queryLower)) return false;
      }
      return true;
    });
  };

  const filteredTeses = getCombinedTeses();
  const filteredSumulas = getCombinedSumulas();

  return (
    <div className="max-w-5xl mx-auto py-2">
      <div className="bg-zinc-900/40 border border-white/10 shadow-2xl rounded-2xl p-4 md:p-6 backdrop-blur-sm">
        {/* Main Tab dispatcher */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/5 pb-4 mb-4 select-none">
          <div className="flex gap-2">
            <button className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${subTab === "teses" ? "bg-white text-black font-bold" : "bg-white/5 hover:bg-white/10 text-white/70"}`} onClick={() => setSubTab("teses")}>
              🏛️ Teses Vinculantes ({filteredTeses.length})
            </button>
            <button className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${subTab === "sumulas" ? "bg-white text-black font-bold" : "bg-white/5 hover:bg-white/10 text-white/70"}`} onClick={() => setSubTab("sumulas")}>
              § Súmulas ({filteredSumulas.length})
            </button>
            <button className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${subTab === "importers" ? "bg-white text-black font-bold" : "bg-white/5 hover:bg-white/10 text-white/70"}`} onClick={() => setSubTab("importers")}>
              📥 Importar Cadastro
            </button>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {subTab === "teses" && (
              <button className="text-xs px-3 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-zinc-200 transition-all cursor-pointer" onClick={() => handleTeseForm()}>
                ＋ Nova Tese
              </button>
            )}
            {subTab === "sumulas" && (
              <button className="text-xs px-3 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-zinc-200 transition-all cursor-pointer" onClick={() => handleSumulaForm()}>
                ＋ Nova Súmula
              </button>
            )}
            <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-semibold text-white/95 cursor-pointer" onClick={handleAutoLinkAll}>
              🔗 Vincular Auto
            </button>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-semibold text-white/95 cursor-pointer" onClick={() => {
              const updated = { ...appData };
              const initialCount = updated.teses.length;
              const uniqueSigs = new Set();
              const uniqueTeses: Tese[] = [];

              updated.teses.forEach(t => {
                const sig = `${t.orgao}|${t.tema.toLowerCase().trim()}`;
                if (sig === "|" || !uniqueSigs.has(sig)) {
                  if (sig !== "|") uniqueSigs.add(sig);
                  uniqueTeses.push(t);
                }
              });

              updated.teses = uniqueTeses;
              setAppData(updated);
              persistData(updated);
              toast(`Limpeza completa: ${initialCount - uniqueTeses.length} teses duplicadas removidas.`, "ok");
            }}>
              🧹 Limpar Duplicados
            </button>
          </div>
        </div>

        {/* Filters bar */}
        {subTab !== "importers" && (
          <div className="bg-[#0e0e0e]/50 border border-white/5 p-3 rounded-xl flex flex-wrap gap-2 items-center mb-4 text-xs select-none">
            {/* Search Input */}
            <div className="flex items-center bg-zinc-950 border border-white/10 rounded-lg px-2 py-1.5 flex-1 min-w-[200px] text-white">
              <Search size={14} className="text-white/40 mr-1.5" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar número, ementa, ramo ou anotador..." className="bg-transparent border-0 outline-none w-full text-white placeholder-white/30" />
            </div>

            {/* Organ filter */}
            <select className="px-2 py-1.5 border border-white/10 rounded-lg bg-zinc-950 text-white outline-none cursor-pointer" value={orgao} onChange={e => setOrgao(e.target.value)}>
              <option value="" className="text-black">Todos Órgãos</option>
              {appData.cats.orgaos.map(o => <option key={o} value={o} className="text-black">{o}</option>)}
            </select>

            {/* Type filter */}
            {subTab === "teses" && (
              <select className="px-2 py-1.5 border border-white/10 rounded-lg bg-zinc-950 text-white outline-none cursor-pointer" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="" className="text-black">Todos Tipos</option>
                {appData.cats.tipos.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
              </select>
            )}

            {/* Branch filter */}
            <select className="px-2 py-1.5 border border-white/10 rounded-lg bg-zinc-950 text-white outline-none cursor-pointer" value={ramo} onChange={e => setRamo(e.target.value)}>
              <option value="" className="text-black">Ramos do Direito (Todos)</option>
              {appData.cats.ramos.map(r => <option key={r} value={r} className="text-black">{r}</option>)}
            </select>

            {/* Origins */}
            <select className="px-2 py-1.5 border border-white/10 rounded-lg bg-zinc-950 text-white font-bold outline-none cursor-pointer" value={origem} onChange={e => setOrigem(e.target.value)}>
              <option value="todos" className="text-black">Repositório + Cadernos</option>
              <option value="repo" className="text-black">Apenas no Repositório</option>
              <option value="caderno" className="text-black">Apenas nos Cadernos</option>
            </select>

            {/* Filter by Subpasta specific tag */}
            {nodeFilterId && (
              <span className="chip bg-white/5 text-white/90 border-white/10 font-semibold flex items-center gap-1.5">
                Filtrado por Subpasta
                <b className="cursor-pointer text-red-400 hover:scale-110" onClick={() => setNodeFilterId("")}>✕</b>
              </span>
            )}
          </div>
        )}

        {/* Content Tabs */}
        {subTab === "teses" && (
          <div className="space-y-3 animate-none">
            {filteredTeses.length === 0 ? (
              <div className="text-center py-10 font-serif italic text-white/40">
                Nenhum precedente ou tese vinculante encontrado com base nos filtros acima.
              </div>
            ) : (
              filteredTeses.map(t => (
                <div key={t.id} className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl relative shadow-md hover:translate-y-[-2px] transition-transform text-white/90">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase bg-zinc-800 text-white/90 border border-white/5">
                      {t.orgao}
                    </span>
                    {t.tipo && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/90 border border-white/5">
                        {t.tipo}
                      </span>
                    )}
                    {t.status && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-white/60 border border-white/5">
                        {t.status}
                      </span>
                    )}
                    <span className="text-sm font-bold font-serif ml-1 text-white">{t.tema}</span>
                  </div>

                  {t._origem === "caderno" ? (
                    <div className="text-[11px] text-[#a3c7f5] font-semibold mb-2 leading-relaxed">
                      Vínculo: caderno material <b>{t.ramo}</b> › {t._path}
                    </div>
                  ) : (
                    <div className="text-xs text-white/40 mb-2 font-medium font-serif leading-none flex gap-3">
                      {t.ramo && <span>📚 {t.ramo}</span>}
                      {t.processo && <span>⚖ {t.processo}</span>}
                      {t.data && <span>📅 {t.data}</span>}
                      {t.origem && <span>🏷️ {t.origem}</span>}
                    </div>
                  )}

                  <p className="text-xs md:text-sm text-white/80 font-serif leading-relaxed text-justify mb-2 font-medium whitespace-pre-wrap">
                    {t.teseFirmada}
                  </p>

                  {t.obs && (
                    <div className="bg-zinc-950/50 rounded-lg p-2.5 text-xs text-white/50 border border-white/5 mb-3 italic">
                      💡 {t.obs}
                    </div>
                  )}

                  {t._origem !== "caderno" && t.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {t.links.map(lid => (
                        <span key={lid} className="chip bg-white/5 text-white/80 border-white/10 hover:bg-white/10 cursor-pointer" onClick={() => setNodeFilterId(lid)}>
                          🗂 {getSubpastaLabel(lid)}
                        </span>
                      ))}
                    </div>
                  )}

                  {t._origem !== "caderno" && (
                    <div className="flex justify-end gap-1.5 mt-3 select-none text-xs">
                      <button className="p-1 px-2.5 rounded border border-white/10 bg-zinc-900/50 hover:bg-white/5 hover:text-white flex items-center gap-1 font-semibold text-white/80 cursor-pointer" onClick={() => handleTeseForm(t.id)}>
                        <Edit2 size={11} /> Editar
                      </button>
                      <button className="p-1 px-2.5 rounded border border-red-900/40 hover:bg-red-950/20 text-red-400 flex items-center gap-1 font-semibold cursor-pointer" onClick={() => {
                        if (confirm("Excluir esta tese do repositório completo?")) {
                          const filterKept = appData.teses.filter(x => x.id !== t.id);
                          const updated = { ...appData, teses: filterKept };
                          setAppData(updated);
                          persistData(updated);
                          toast("Tese removida do repositório.", "info");
                        }
                      }}>
                        <Trash2 size={11} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {subTab === "sumulas" && (
          <div className="space-y-3 animate-none">
            {filteredSumulas.length === 0 ? (
              <div className="text-center py-10 font-serif italic text-white/40">
                Nenhuma súmula cadastrada ou encontrada com base nos filtros acima.
              </div>
            ) : (
              filteredSumulas.map(s => (
                <div key={s.id} className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl relative shadow-md hover:translate-y-[-2px] transition-transform text-white/90">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase bg-zinc-800 text-white/90 border border-white/5">
                      {s.orgao}
                    </span>
                    {s.status && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-white/60 border border-white/5">
                        {s.status}
                      </span>
                    )}
                    <span className="text-sm font-bold font-serif ml-1 text-white">{s.tema}</span>
                  </div>

                  {s._origem === "caderno" ? (
                    <div className="text-[11px] text-[#a3c7f5] font-semibold mb-2 leading-relaxed">
                      Vínculo: material vinculado no caderno <b>{s.ramo}</b> › {s._path}
                    </div>
                  ) : (
                    <div className="text-xs text-white/40 mb-2 font-medium font-serif leading-none flex gap-3">
                      {s.ramo && <span>📚 {s.ramo}</span>}
                      {s.origem && <span>🏷️ {s.origem}</span>}
                    </div>
                  )}

                  <p className="text-xs md:text-sm text-white/80 font-serif leading-relaxed text-justify mb-2 font-medium whitespace-pre-wrap">
                    {s.enunciado}
                  </p>

                  {s.obs && (
                    <div className="bg-zinc-950/50 rounded-lg p-2.5 text-xs text-white/50 border border-white/5 mb-3 italic">
                      💡 {s.obs}
                    </div>
                  )}

                  {s._origem !== "caderno" && s.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.links.map(lid => (
                        <span key={lid} className="chip bg-white/5 text-white/80 border-white/10 hover:bg-white/10 cursor-pointer" onClick={() => setNodeFilterId(lid)}>
                          🗂 {getSubpastaLabel(lid)}
                        </span>
                      ))}
                    </div>
                  )}

                  {s._origem !== "caderno" && (
                    <div className="flex justify-end gap-1.5 mt-3 select-none text-xs">
                      <button className="p-1 px-2.5 rounded border border-white/10 bg-zinc-900/50 hover:bg-white/5 hover:text-white flex items-center gap-1 font-semibold text-white/80 cursor-pointer" onClick={() => handleSumulaForm(s.id)}>
                        <Edit2 size={11} /> Editar
                      </button>
                      <button className="p-1 px-2.5 rounded border border-red-900/40 hover:bg-red-950/20 text-red-400 flex items-center gap-1 font-semibold cursor-pointer" onClick={() => {
                        if (confirm("Excluir esta súmula do repositório?")) {
                          const filterKept = appData.sumulas.filter(x => x.id !== s.id);
                          const updated = { ...appData, sumulas: filterKept };
                          setAppData(updated);
                          persistData(updated);
                          toast("Súmula removida com sucesso.", "info");
                        }
                      }}>
                        <Trash2 size={11} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {subTab === "importers" && (
          <div className="space-y-6 animate-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* BNP Clipboard Importer */}
              <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl shadow-xl flex flex-col justify-between text-white">
                <div>
                  <h4 className="font-serif font-bold text-base text-white flex items-center gap-1.5 mb-1.5">
                    <Clipboard size={18} /> Banco Nacional de Precedentes (BNP)
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed mb-4">
                    Abra o repositório de jurisprudência no CNJ / BNP, selecione toda a página (Ctrl+A / Cmd+A) e cole-a bruta abaixo.
                  </p>
                  <textarea id="bnpArea" className="w-full px-3 py-2 border border-white/10 rounded-xl bg-zinc-950 text-white h-[140px] text-xs font-mono placeholder:italic outline-none focus:border-white/20" placeholder="Questão: ...&#10;Situação: Trânsito em Julgado&#10;Última Atualização: 21/04/2026..." />
                </div>
                <button className="w-full btn primary mt-4 py-2 font-bold text-sm shadow-md" onClick={handleBNPImportSubmit}>
                  Analisar e Importar Precedentes
                </button>
              </div>

              {/* Gemini AI Smart Importer */}
              <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl shadow-xl flex flex-col justify-between text-white">
                <div>
                  <h4 className="font-serif font-bold text-base text-white flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={18} /> Importador Inteligente (Gemini IA)
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed mb-4">
                    Cole notícias informativas do Conjur, julgados soltos da Jurisprudência em Teses do STJ ou do STF. A IA estruturará dados e criará os tópicos para você.
                  </p>
                  <textarea id="aiImpTextArea" className="w-full px-3 py-2 border border-white/10 rounded-xl bg-zinc-950 text-white h-[140px] text-xs placeholder:italic outline-none focus:border-white/20" placeholder="Decisão da 2ª Turma do STF sobre marco temporal de terras indígenas..." />
                </div>
                <button className="w-full btn mt-4 py-2 bg-white text-black hover:bg-neutral-200 transition-all font-bold text-sm shadow-md flex items-center justify-center gap-1 cursor-pointer" onClick={handleAIImportScan} disabled={aiImpLoading}>
                  {aiImpLoading ? <span className="animate-spin text-sm">⏳</span> : <Sparkles size={14} />}
                  {aiImpLoading ? "IA Analisando Texto..." : "Importar pela IA Inteligente"}
                </button>
              </div>
            </div>
            
            <div className="bg-zinc-950 rounded-xl p-4 border border-white/5 leading-relaxed text-xs text-white/50 shadow-inner font-serif">
               💡 <b>Dica de Sucesso:</b> Ao importar do BNP ou usar o assistente de IA, o sistema realiza varredura automática tentando ligar o teor da decisão a descrições das suas pastas (disciplinas constitutivas). Você pode em seguida clicar no botão <b>"Vincular Auto"</b> no topo para recalibrar todas as pendências livres.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
