import React, { useState, useEffect } from "react";
import { AppData, Notebook, Node, Material, Tese, Sumula, Style, PageSetup, Prova } from "./types";
import { EDITAL_STRUCTURE } from "./data/edital";

// Component imports
import WordEditor from "./components/WordEditor";
import TesesSumulas from "./components/TesesSumulas";
import MinhasProvas from "./components/MinhasProvas";
import Pomodoro from "./components/Pomodoro";
import AiChat from "./components/AiChat";

// Icons
import {
  BookOpen,
  Library,
  Trophy,
  Calendar,
  Sparkles,
  Info,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  FilePlus,
  Trash2,
  FolderOpen,
  FileText,
  Search,
  MessageSquare,
  Clock,
  ExternalLink,
  ChevronLeft,
  Settings,
  Sliders,
  Plus
} from "lucide-react";

// Local storage key
const STORAGE_KEY = "codex_magistratura_data_v2";

export default function App() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeTab, setActiveTab] = useState<"cadernos" | "precedentes" | "concursos">("cadernos");

  // Selection state inside Notebooks
  const [activeNotebookId, setActiveNotebookId] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [nodeTab, setNodeTab] = useState<"editor" | "materiais">("editor");

  // Search inside folders tree
  const [treeQuery, setTreeQuery] = useState("");

  // Expanding nodes tracking
  const [expandedNodes, setExpandedNodes] = useState<{ [id: string]: boolean }>({});

  // Global overlay Modals state
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);

  // Custom Toast notification states
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"ok" | "err" | "info">("ok");

  // Active AI Sidebar state
  const [aiSidebarType, setAiSidebarType] = useState<"notebook" | "teses" | "sumulas" | null>(null);

  // Time ticker state
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    // Current ticker format matching 2026-06-15 21:30 format
    const interval = setInterval(() => {
      const d = new Date();
      const yr = d.getUTCFullYear();
      const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dy = String(d.getUTCDate()).padStart(2, "0");
      const hrs = String(d.getUTCHours()).padStart(2, "0");
      const mins = String(d.getUTCMinutes()).padStart(2, "0");
      const secs = String(d.getUTCSeconds()).padStart(2, "0");
      setTimeStr(`${yr}-${mo}-${dy} ${hrs}:${mins}:${secs} UTC`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Toast trigger func
  const triggerToast = (msg: string, type: "ok" | "err" | "info" = "ok") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMsg("");
    }, 4500);
  };

  const openOverlayModal = (content: React.ReactNode) => {
    setModalContent(content);
  };

  const closeOverlayModal = () => {
    setModalContent(null);
  };

  // Helper local caching persistency
  const saveToStorage = (updated: AppData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Local storage storage limits reached.", err);
    }
  };

  // Pre-seed mock databases to help user explore beautiful features
  const getSeededInitialData = (): AppData => {
    // Generate empty layouts
    const seededNotebooks: Notebook[] = [];
    
    // Default preset typography styling structures
    const defaultStyles: Style[] = [
      { id: "st_title", name: "Título do Acórdão", fontFamily: "Space Grotesk", fontSize: 22, color: "#7b1e1e", bold: true, italic: false, underline: false, align: "center", lineHeight: "1.2", heading: 1 },
      { id: "st_subtitle", name: "Ementa Sumária", fontFamily: "Inter", fontSize: 13, color: "#555555", bold: false, italic: true, underline: false, align: "justify", lineHeight: "1.4", heading: 2 },
      { id: "st_body", name: "Doutrina padrão", fontFamily: "Inter", fontSize: 13, color: "#1a1a1a", bold: false, italic: false, underline: false, align: "justify", lineHeight: "1.5" },
      { id: "st_quote", name: "Citação Regulamentar", fontFamily: "EB Garamond", fontSize: 12, color: "#3a2a08", bold: false, italic: true, underline: false, align: "left", lineHeight: "1.3" }
    ];

    const defaultPage: PageSetup = {
      size: "A4",
      top: 2.5,
      right: 2.5,
      bottom: 2.5,
      left: 3.0
    };

    // Prepopulate notebooks using official EDITAL_STRUCTURE
    EDITAL_STRUCTURE.forEach((disc, idx) => {
      const colors = ["#7b1e1e", "#1c4f8b", "#b8860b"];
      const col = colors[idx % colors.length];

      // Convert syllabus elements into nested tree Nodes
      const rootsChildren: Node[] = disc.itens.map(item => {
        // Initial Note prefill
        const textNotes = `<h3>📚 ${item.t}</h3>
<p><strong>Edital Concurso Subtópico:</strong> ${item.n} · ${disc.nome}</p>
<p><strong>Ementa oficial TJSC / TRF6:</strong> <em>"${item.c}"</em></p>
<hr />
<p>Escreva aqui suas sínteses de doutrina estruturada ou considerações de curadorias escolares. Clique em <b>"Suporte IA"</b> na aba ao lado se quiser que o Gemini monte uma rodada de perguntas discursivas ou simule um questionário de memorização oradora sobre esse assunto!</p>`;

        // Preseed child materials clips
        const sampleClip: Material = {
          id: `m_seed_${Date.now()}_${item.n}`,
          title: "Leitura sugerida de Jurisprudência",
          source: "STF Informativo de Teses",
          body: `Confira os limites constitucionais relacionados ao teor de ${item.t}. Estude o princípio da proporcionalidade aplicado.`,
          createdAt: Date.now()
        };

        const childrenObj: Node = {
          id: `n_${disc.nome.slice(0,3)}_${item.n}`,
          name: `${item.n}. ${item.t.slice(0, 32)}${item.t.length > 32 ? "..." : ""}`,
          content: textNotes,
          materials: {
            doutrina: [sampleClip]
          },
          children: []
        };
        return childrenObj;
      });

      const rootNode: Node = {
        id: `n_root_${disc.nome.slice(0,3)}`,
        name: `Edital Oficial Completo (${disc.nome})`,
        content: `<h2>📋 Ementa oficial unificada da Magistratura</h2><p>Navegue pelas subpastas na coluna de controle ao lado para abrir os cadernos correspondentes a cada ponto cobrado.</p>`,
        materials: {},
        children: rootsChildren
      };

      seededNotebooks.push({
        id: `nb_${Date.now()}_${idx}`,
        name: disc.nome,
        color: col,
        createdAt: Date.now() - (idx * 86400000),
        children: [rootNode]
      });
    });

    // Sample pre-populated Provas study sprints
    const seededProvas: Prova[] = [
      {
        id: "p_tjsc_seed",
        nome: "TJSC (Santa Catarina)",
        banca: "FGV Concursos",
        cargo: "Juiz de Direito Substituto",
        status: "1ª Fase (Objetiva)",
        obs: "Edital publicado com previsão de provas para o segundo semestre de 2026.",
        inicio: "2026-06-01",
        dataProva: "2026-10-18",
        manualPPD: null,
        pomo: { day: "", focusToday: 0, total: 12 },
        dias: {
          "2026-06-12": "studied",
          "2026-06-13": "studied",
          "2026-06-14": "missed",
          "2026-06-15": "studied"
        },
        disciplinas: [
          {
            id: "d_1",
            name: "Direito Constitucional",
            total: 340,
            read: 125,
            topics: [
              { t: "Constituição: conceito e classificação", done: true },
              { t: "Estado Democrático de Direito princípios", done: true },
              { t: "Controle de constitucionalidade", done: false }
            ]
          },
          {
            id: "d_2",
            name: "Direito Administrativo",
            total: 280,
            read: 45,
            topics: [
              { t: "Atos administrativos elementos", done: true },
              { t: "Licitações (Lei nº 14.133/2021)", done: false }
            ]
          },
          {
            id: "d_3",
            name: "Direito Civil",
            total: 400,
            read: 10,
            topics: []
          }
        ]
      }
    ];

    // Seed exemplary professional Teses & Súmulas
    const seededTeses: Tese[] = [
      {
        id: "t_seed_1",
        orgao: "STF",
        tipo: "Repercussão Geral",
        status: "Trânsito em julgado",
        tema: "Tema STF 1099",
        processo: "RE 1.234.567 / SC",
        teseFirmada: "O cancelamento de inscrição de candidato em concurso público por motivo de idade superior ao limite fixado em edital é inconstitucional se não houver previsão em lei em sentido formal.",
        ramo: "Direito Constitucional",
        data: "12/04/2025",
        origem: "Banco de Precedentes",
        obs: "Súmula importante sobre repercussão penal de infrações tributárias.",
        links: ["n_Dir_5"], // Links constitution,
        createdAt: Date.now()
      },
      {
        id: "t_seed_2",
        orgao: "STJ",
        tipo: "Recurso Repetitivo",
        status: "Pendente",
        tema: "Tema STJ 1120",
        processo: "REsp 1.987.654/PR",
        teseFirmada: "O ressarcimento ao erário por improbidade administrativa em virtude de violação aos princípios exige a caracterização cabal de dolo específico e prejuízo financeiro real.",
        ramo: "Direito Administrativo",
        data: "21/05/2025",
        origem: "Manual",
        obs: "Improbidade administrativa e necessidade de dolo específico após a Lei 14.230.",
        links: ["n_Dir_6"],
        createdAt: Date.now()
      }
    ];

    const seededSumulas: Sumula[] = [
      {
        id: "s_seed_1",
        orgao: "STF",
        tema: "Súmula Vinculante 37",
        enunciado: "Não cabe ao Poder Judiciário, que não tem função legislativa, aumentar vencimentos de servidores públicos sob o fundamento de isonomia.",
        ramo: "Direito Administrativo",
        data: "25/03/2015",
        status: "Vigente",
        origem: "Sistema",
        obs: "Aplicação frequente em controle difuso e mandado de segurança de servidores estaduais.",
        links: [],
        createdAt: Date.now()
      },
      {
        id: "s_seed_2",
        orgao: "STF",
        tema: "Súmula Vinculante 14",
        enunciado: "É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.",
        ramo: "Direito Constitucional",
        data: "02/02/2009",
        status: "Vigente",
        origem: "Súmulas STF",
        obs: "Relevante também em Direito Processual Penal.",
        links: [],
        createdAt: Date.now()
      }
    ];

    // Seed defaults
    return {
      version: 2,
      updatedAt: Date.now(),
      notebooks: seededNotebooks,
      provas: seededProvas,
      teses: seededTeses,
      sumulas: seededSumulas,
      styles: defaultStyles,
      pageSetup: defaultPage,
      pomo: { day: "", focusToday: 0, total: 3 },
      tesesChat: { messages: [] },
      sumulasChat: { messages: [] },
      viewPrefs: {
        nbColW: 240,
        nbFont: 13,
        treeColW: 280,
        treeFont: 12,
        edZoom: 100,
        edH: 600
      },
      cats: {
        orgaos: ["STF", "STJ", "TST", "TSE", "STM", "TNU", "TJSC", "TRF6"],
        tipos: ["Repercussão Geral", "Recurso Repetitivo", "Súmula Vinculante", "Incidente de Resolução", "Tese"],
        status: ["Trânsito em julgado", "Pendente de publicação", "Pauta de julgamento", "Vigente", "Superada"],
        origens: ["Manual", "Banco Nacional de Precedentes", "Gemini IA", "Caderno"],
        ramos: [
          "Direito Constitucional",
          "Direito Administrativo",
          "Direito Civil",
          "Direito Processual Civil",
          "Direito Penal",
          "Direito Processual Penal",
          "Direito Empresarial",
          "Direito Financeiro e Tributário",
          "Direito Ambiental",
          "Direito do Consumidor",
          "Humanística e Ética"
        ]
      }
    };
  };

  // On mount: load or seed data
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.notebooks && parsed.notebooks.length > 0) {
          setAppData(parsed);
          // Set selection fallbacks
          if (parsed.notebooks[0]) {
            setActiveNotebookId(parsed.notebooks[0].id);
            if (parsed.notebooks[0].children?.[0]) {
              setSelectedNodeId(parsed.notebooks[0].children[0].id);
            }
          }
          return;
        }
      } catch (err) {
        console.error("Failed to parse magistratura session.", err);
      }
    }

    // fallback seed
    const seeded = getSeededInitialData();
    setAppData(seeded);
    saveToStorage(seeded);

    if (seeded.notebooks[0]) {
      setActiveNotebookId(seeded.notebooks[0].id);
      if (seeded.notebooks[0].children?.[0]) {
        setSelectedNodeId(seeded.notebooks[0].children[0].id);
      }
    }
    triggerToast("Seja bem-vindo ao Codex Magistratura! Base de dados oficial iniciada com sucesso.", "ok");
  }, []);

  if (!appData) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-600 select-none">
        <div className="text-center animate-pulse">
          <BookOpen className="mx-auto text-indigo-600 mb-3 animate-none" size={44} />
          <span className="font-semibold text-xs tracking-wider uppercase">Montando fichários da Magistratura...</span>
        </div>
      </div>
    );
  }

  const handleNotebookSelect = (id: string) => {
    setActiveNotebookId(id);
    const nbObj = appData.notebooks.find(n => n.id === id);
    if (nbObj) {
      if (nbObj.children && nbObj.children.length > 0) {
        setSelectedNodeId(nbObj.children[0].id);
      } else {
        setSelectedNodeId("");
      }
    }
  };

  // Find Node by Recurse Walk inside active selected notebook
  const findNodeAndPathInNotebook = (nb: Notebook, targetId: string): { node: Node | null, path: Node[] } => {
    let foundNode: Node | null = null;
    let finalPath: Node[] = [];

    const recurse = (currentNodes: Node[], currentPath: Node[]): boolean => {
      for (const node of currentNodes) {
        if (node.id === targetId) {
          foundNode = node;
          finalPath = [...currentPath, node];
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (recurse(node.children, [...currentPath, node])) return true;
        }
      }
      return false;
    };

    recurse(nb.children, []);
    return { node: foundNode, path: finalPath };
  };

  const activeNotebook = appData.notebooks.find(n => n.id === activeNotebookId);
  const { node: activeNode, path: activeNodePath } = activeNotebook && selectedNodeId
    ? findNodeAndPathInNotebook(activeNotebook, selectedNodeId)
    : { node: null, path: [] };

  // Sync edited notes back to node immediately
  const handleEditorChange = (newHtml: string) => {
    if (!activeNotebook || !activeNode) return;
    const updated = { ...appData };
    const nbObj = updated.notebooks.find(nb => nb.id === activeNotebook.id);
    if (nbObj) {
      const walkAndReplace = (nodes: Node[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === activeNode.id) {
            nodes[i].content = newHtml;
            return true;
          }
          if (nodes[i].children && walkAndReplace(nodes[i].children)) {
            return true;
          }
        }
        return false;
      };
      walkAndReplace(nbObj.children);
    }
    setAppData(updated);
    saveToStorage(updated);
  };

  // Tree manipulating callbacks
  const handleAddNewTreeFolder = (parentId: string | null) => {
    const name = prompt("Insira o nome do novo Fichário de Estudos / Divisão:");
    if (!name) return;

    const updated = { ...appData };
    const nbObj = updated.notebooks.find(nb => nb.id === activeNotebookId);
    if (nbObj) {
      const newNode: Node = {
        id: `n_folder_${Date.now()}`,
        name,
        content: `<h3>📁 ${name}</h3><p>Nova seção criada. Use o editor para escrever conceitos ou crie tópicos aninhados.</p>`,
        materials: {},
        children: []
      };

      if (!parentId) {
        nbObj.children.push(newNode);
      } else {
        const walkAndAdd = (nodes: Node[]): boolean => {
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === parentId) {
              nodes[i].children = nodes[i].children || [];
              nodes[i].children.push(newNode);
              return true;
            }
            if (nodes[i].children && walkAndAdd(nodes[i].children)) return true;
          }
          return false;
        };
        walkAndAdd(nbObj.children);
      }

      setAppData(updated);
      saveToStorage(updated);
      setSelectedNodeId(newNode.id);
      triggerToast(`Pasta "${name}" criada.`, "ok");
    }
  };

  const handleAddNewTopicLeaf = (parentId: string) => {
    const name = prompt("Insira o título do Tópico de Leitura / Item de Estudo:");
    if (!name) return;

    const updated = { ...appData };
    const nbObj = updated.notebooks.find(nb => nb.id === activeNotebookId);
    if (nbObj) {
      const newLeaf: Node = {
        id: `n_topic_${Date.now()}`,
        name,
        content: `<h3>📝 Tópico de Edital: ${name}</h3><hr /><p>Insira seus resumos ou anotações legais aqui.</p>`,
        materials: {
          doutrina: [],
          jurisprudencia: [],
          legislacao: []
        },
        children: []
      };

      const walkAndAdd = (nodes: Node[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === parentId) {
            nodes[i].children = nodes[i].children || [];
            nodes[i].children.push(newLeaf);
            return true;
          }
          if (nodes[i].children && walkAndAdd(nodes[i].children)) return true;
        }
        return false;
      };
      walkAndAdd(nbObj.children);

      setAppData(updated);
      saveToStorage(updated);
      setSelectedNodeId(newLeaf.id);
      triggerToast(`Tópico "${name}" adicionado com sucesso.`, "ok");
    }
  };

  const handleDeleteTreeNode = (nid: string) => {
    if (!confirm("Excluir esta divisão e todas as subanotações nela contidas permanentemente?")) return;

    const updated = { ...appData };
    const nbObj = updated.notebooks.find(nb => nb.id === activeNotebookId);
    if (nbObj) {
      const walkAndRemove = (nodes: Node[], currentParentId: string | null): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === nid) {
            nodes.splice(i, 1);
            return true;
          }
          if (nodes[i].children && walkAndRemove(nodes[i].children, nodes[i].id)) return true;
        }
        return false;
      };
      walkAndRemove(nbObj.children, null);

      setAppData(updated);
      saveToStorage(updated);

      if (selectedNodeId === nid) {
        setSelectedNodeId(nbObj.children[0]?.id || "");
      }
      triggerToast("Nó de estudo removido.", "info");
    }
  };

  // Materials clips logic inside a Node
  const handleAddMaterialClip = () => {
    if (!activeNode) return;
    openOverlayModal(
      <form onSubmit={e => {
        e.preventDefault();
        const category = (document.getElementById("matCat") as HTMLSelectElement).value;
        const title = (document.getElementById("matTitle") as HTMLInputElement).value.trim();
        const source = (document.getElementById("matSource") as HTMLInputElement).value.trim();
        const body = (document.getElementById("matBody") as HTMLTextAreaElement).value.trim();

        if (!title || !body) {
          alert("Título e Teor do material são de preenchimento obrigatório.");
          return;
        }

        const updated = { ...appData };
        const nbObj = updated.notebooks.find(nb => nb.id === activeNotebookId);
        if (nbObj) {
          const walkAndInsert = (nodes: Node[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].id === activeNode.id) {
                nodes[i].materials = nodes[i].materials || {};
                nodes[i].materials[category] = nodes[i].materials[category] || [];
                nodes[i].materials[category].push({
                  id: `m_${Date.now()}`,
                  title,
                  source,
                  body,
                  createdAt: Date.now()
                });
                return true;
              }
              if (nodes[i].children && walkAndInsert(nodes[i].children)) return true;
            }
            return false;
          };
          walkAndInsert(nbObj.children);
        }

        setAppData(updated);
        saveToStorage(updated);
        closeOverlayModal();
        triggerToast("Fichamento acoplado à pasta.", "ok");
      }} className="p-1">
        <h4 className="font-semibold text-lg text-[#7b1e1e] flex items-center gap-1.5 font-serif mb-2">
          📎 Acoplar Destaque / Julgado de Cabeceira
        </h4>
        <p className="text-xs text-neutral-500 italic mb-4">Insira leis, informativos jurisprudenciais ou fichamento de livro vinculados a esse tema.</p>
        
        <div className="field mb-2">
          <label className="block text-[10px] font-bold uppercase mb-0.5">Categoria material</label>
          <select id="matCat" className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white/70">
            <option value="doutrina">📚 Resumos / Doutrina Clássica</option>
            <option value="jurisprudencia">🏛️ Informativos / Jurisprudência Livre</option>
            <option value="legislacao">⚖️ Legislação / Artigo de Lei Seca</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-0.5">Identificador / Título</label>
            <input id="matTitle" placeholder="Ex: Artigo 5º, inciso LXVIII" className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-0.5">Origem / Referência</label>
            <input id="matSource" placeholder="Ex: Manual de Requisitos, pag. 47" className="w-full px-3 py-1.5 border rounded-lg text-xs" />
          </div>
        </div>

        <div className="field mb-4">
          <label className="block text-[10px] font-bold uppercase mb-0.5">Teor Compacto / Recorte de Texto</label>
          <textarea id="matBody" className="w-full px-3 py-2 border rounded-lg text-xs h-[100px] font-sans" placeholder="Cole aqui o trecho copiado do PDF ou doutrina..." required />
        </div>

        <div className="flex justify-end gap-2 text-xs">
          <button type="button" className="btn ghost px-4 py-2" onClick={closeOverlayModal}>Cancelar</button>
          <button type="submit" className="btn px-4 py-2 bg-[#7b1e1e] text-white font-bold">Vincular Recorte</button>
        </div>
      </form>
    );
  };

  const handleCreateNotebook = () => {
    const name = prompt("Insira o nome do seu novo Caderno de Matéria:");
    if (!name) return;
    const color = prompt("Insira uma cor em formato Hexadecimal para a capa (ex: #7b1e1e, #1c4f8b, #b8860b):") || "#1c4f8b";

    const updated = { ...appData };
    const newNb: Notebook = {
      id: `nb_${Date.now()}`,
      name,
      color,
      createdAt: Date.now(),
      children: [
        {
          id: `n_root_${Date.now()}`,
          name: `Sumário de Estudos`,
          content: `<h3>📓 ${name}</h3><p>Divisão de fichas criada. Adicione pastas ou crie materiais vinculados para organizar seus estudos.</p>`,
          materials: {},
          children: []
        }
      ]
    };

    updated.notebooks.push(newNb);
    setAppData(updated);
    saveToStorage(updated);
    setActiveNotebookId(newNb.id);
    setSelectedNodeId(newNb.children[0].id);
    triggerToast(`Caderno "${name}" criado com sucesso.`, "ok");
  };

  // Recurse Render Tree Structure folders
  const renderTreeRecursively = (nodes: Node[], level: number) => {
    return nodes.map(n => {
      const isExpanded = !!expandedNodes[n.id];
      const hasChildren = n.children && n.children.length > 0;
      const isSelected = selectedNodeId === n.id;

      // Filter matches
      const matchesSearch = treeQuery ? n.name.toLowerCase().includes(treeQuery.toLowerCase()) : true;

      // Render children block
      const renderKids = hasChildren && isExpanded ? (
        <div className="border-l border-slate-200 ml-3.5 pl-1.5 space-y-0.5 mt-0.5">
          {renderTreeRecursively(n.children, level + 1)}
        </div>
      ) : null;

      if (!matchesSearch && !hasChildren) return null;

      return (
        <div key={n.id} className="text-xs transition-colors">
          <div className={`group flex items-center justify-between px-2 py-1.5 rounded-lg select-none cursor-pointer ${
            isSelected ? "bg-indigo-50 text-indigo-950 font-bold border border-indigo-100/50 shadow-sm" : "hover:bg-slate-100/80 text-slate-705"
          }`}>
            <div className="flex items-center gap-1.5 truncate flex-1 min-w-0" onClick={() => {
              if (hasChildren) {
                setExpandedNodes(prev => ({ ...prev, [n.id]: !prev[n.id] }));
              }
              setSelectedNodeId(n.id);
            }}>
              <span className="shrink-0 text-slate-400">
                {hasChildren ? (
                  isExpanded ? <ChevronDown size={14} className="text-amber-500" /> : <ChevronRight size={14} />
                ) : (
                  <div className="w-3" />
                )}
              </span>
              <span className="shrink-0">
                {hasChildren ? <FolderOpen size={13} className="text-indigo-500" /> : <FileText size={13} className="text-slate-400" />}
              </span>
              <span className="truncate">{n.name}</span>
            </div>

            {/* Quick Action elements visible on hover */}
            <div className="hidden group-hover:flex items-center gap-1 pr-1 shrink-0 select-none">
              <button className="p-0.5 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Nova pasta" onClick={(e) => { e.stopPropagation(); handleAddNewTreeFolder(n.id); }}>
                <FolderPlus size={12} />
              </button>
              <button className="p-0.5 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Novo tópico" onClick={(e) => { e.stopPropagation(); handleAddNewTopicLeaf(n.id); }}>
                <FilePlus size={12} />
              </button>
              <button className="p-0.5 hover:bg-rose-100 rounded text-rose-600 transition-colors" title="Excluir" onClick={(e) => { e.stopPropagation(); handleDeleteTreeNode(n.id); }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          {renderKids}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800 antialiased">
      {/* Top Main navigation bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 h-20 px-6 shadow-sm sticky top-0 z-40 select-none flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2">
            <Library className="text-indigo-650 bg-indigo-50 p-1.5 rounded-xl border border-indigo-100/55" size={32} />
            <div>
              <h1 className="font-sans font-extrabold text-lg tracking-wider text-slate-900 leading-none">
                AURUM <span className="text-indigo-650 font-semibold">STUDIO</span>
              </h1>
              <p className="text-[9px] font-mono tracking-widest uppercase text-slate-400 font-bold mt-1.5">Codex Magistratura</p>
            </div>
          </div>
        </div>

        {/* Global time and stats ribbon */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-sans text-slate-500">
          <div className="flex items-center gap-1.5 text-orange-650 bg-orange-50 border border-orange-200/50 px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-550 animate-pulse"></span> {timeStr || "Sprints..."}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">🍅 Focos: <b className="text-slate-700 font-sans">{appData.pomo.total} completados</b></span>
        </div>

        {/* Center menu button tabs switcher */}
        <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
          <button
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans tracking-tight transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "cadernos" ? "bg-white text-slate-900 shadow-sm border border-slate-200/30 font-extrabold" : "hover:text-slate-900 text-slate-500 hover:bg-slate-50/50"
            }`}
            onClick={() => { setActiveTab("cadernos"); setAiSidebarType(null); }}
          >
            <BookOpen size={13} /> Meus Cadernos
          </button>
          <button
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans tracking-tight transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "precedentes" ? "bg-white text-slate-900 shadow-sm border border-slate-200/30 font-extrabold" : "hover:text-slate-900 text-slate-500 hover:bg-slate-50/55"
            }`}
            onClick={() => { setActiveTab("precedentes"); setAiSidebarType(null); }}
          >
            <Library size={13} /> Súmulas &amp; Precedentes
          </button>
          <button
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans tracking-tight transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "concursos" ? "bg-white text-slate-900 shadow-sm border border-slate-200/30 font-extrabold" : "hover:text-slate-900 text-slate-500 hover:bg-slate-50/50"
            }`}
            onClick={() => { setActiveTab("concursos"); setAiSidebarType(null); }}
          >
            <Trophy size={13} /> Planejar Concursos
          </button>
        </nav>

        {/* Action Widgets panel (Pomodoro toggle) */}
        <div className="flex items-center gap-1.5">
          <button
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 text-rose-750 flex items-center gap-1.5 font-bold text-xs transition-all duration-150 hover:scale-[1.02] shadow-sm cursor-pointer"
            onClick={() => openOverlayModal(
              <Pomodoro
                appData={appData}
                setAppData={setAppData}
                persistData={saveToStorage}
                toast={triggerToast}
                closeModal={closeOverlayModal}
              />
            )}
          >
            🍅 Pomodoro Foco
          </button>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === "cadernos" ? (
          <div className="flex-1 flex overflow-hidden bg-slate-50">
            {/* Inner Left Subpanel - Notebook Covers list */}
            <div className="w-[180px] bg-slate-50 border-r border-slate-200/60 py-4 px-2 flex flex-col justify-between shrink-0 select-none">
              <div className="space-y-4">
                <div className="px-2">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-4 font-mono">Cadernos Físicos</h4>
                </div>
                <div className="space-y-1">
                  {appData.notebooks.map(nb => {
                    const isActive = nb.id === activeNotebookId;
                    return (
                      <button
                        key={nb.id}
                        className={`w-full text-left px-2.5 py-2.5 rounded-xl text-xs font-sans font-bold transition-all flex items-center gap-2 border ${
                          isActive
                            ? "bg-white border-slate-200 shadow-md text-slate-800"
                            : "bg-transparent border-transparent text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                        onClick={() => handleNotebookSelect(nb.id)}
                      >
                        <div className="w-2.5 h-4.5 rounded-sm shadow-sm shrink-0" style={{ backgroundColor: nb.color }} />
                        <span className="truncate leading-none">{nb.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cover creation option */}
              <div className="px-1 text-center">
                <button className="w-full btn sm py-2 font-bold cursor-pointer" onClick={handleCreateNotebook}>
                  ＋ Novo Caderno
                </button>
              </div>
            </div>

            {/* Inner Middle Subpanel - Nested Directory Index Explorer */}
            <div className="w-[240px] md:w-[280px] bg-white border-r border-slate-100 px-3 py-3 flex flex-col justify-between shrink-0 select-none">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold font-mono">Tópicos do Caderno</h4>
                  <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer animate-none" title="Criar seção no topo" onClick={() => handleAddNewTreeFolder(null)}>
                    <FolderPlus size={14} />
                  </button>
                </div>

                {/* Sub-search filter */}
                <div className="flex items-center bg-slate-50 border border-slate-200/60 rounded-xl px-2 py-1.5">
                  <Search size={12} className="text-slate-400 mr-1.5" />
                  <input value={treeQuery} onChange={e => setTreeQuery(e.target.value)} placeholder="Filtrar matérias..." className="bg-transparent border-0 outline-none text-xs w-full text-slate-705 placeholder-slate-400 font-sans" />
                </div>

                {/* Folders scrollbar container */}
                <div className="overflow-y-auto max-h-[64vh] pr-1 space-y-0.5 flex-1">
                  {activeNotebook ? (
                    renderTreeRecursively(activeNotebook.children, 0)
                  ) : (
                    <span className="text-xs text-slate-400 italic">Nenhum caderno ativo.</span>
                  )}
                </div>
              </div>

              {/* Bottom informational tooltip banner */}
              <div className="text-[10px] text-slate-400 font-sans leading-relaxed italic border-t border-slate-150/80 pt-2.5 mt-2">
                💡 Pressione um item ou pasta para visualizar as opções rápidas ou editá-lo de forma livre.
              </div>
            </div>

            {/* Main Active Notes Leaf Panel */}
            <div className="flex-grow flex flex-col bg-slate-50/50 overflow-hidden">
              {activeNode ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Top Node path display header */}
                  <div className="bg-white border-b border-slate-100 py-3 px-4 md:px-6 select-none flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 font-sans text-xs font-bold text-slate-400">
                      <span>Meus Cadernos</span>
                      <span>›</span>
                      <span>{activeNotebook?.name}</span>
                      <span>›</span>
                      <span className="text-slate-800 truncate font-extrabold">{activeNode.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 hover:text-indigo-850 border border-indigo-120 bg-indigo-50/65 hover:bg-indigo-50 py-1.5 px-3.5 rounded-xl transition-all duration-155 shadow-sm cursor-pointer" onClick={() => setAiSidebarType(aiSidebarType === "notebook" ? null : "notebook")}>
                        <Sparkles size={11} className="animate-pulse" /> 
                        {aiSidebarType === "notebook" ? "Fechar Tutor IA" : "Suporte IA Caderno"}
                      </button>
                    </div>
                  </div>

                  {/* Inner Page Tabs dispatcher */}
                  <div className="bg-white border-b border-slate-100 select-none flex gap-4 px-4 md:px-6">
                    <button className={`py-3 px-1 text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                      nodeTab === "editor" ? "border-indigo-600 text-indigo-705" : "border-transparent text-slate-405 hover:text-slate-800"
                    }`} onClick={() => setNodeTab("editor")}>
                      📝 Editor de Fichas (Doutrina)
                    </button>
                    <button className={`py-3 px-1 text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                      nodeTab === "materiais" ? "border-indigo-600 text-indigo-705" : "border-transparent text-slate-405 hover:text-slate-800"
                    }`} onClick={() => setNodeTab("materiais")}>
                      📎 Materiais &amp; Precedentes
                    </button>
                  </div>

                  {/* Main Display Box */}
                  <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 animate-none">
                      {nodeTab === "editor" ? (
                        <div className="flex-1 flex flex-col">
                          {activeNotebook && (
                            <WordEditor
                              notebook={activeNotebook}
                              node={activeNode}
                              path={activeNodePath}
                              appData={appData}
                              setAppData={setAppData}
                              persistData={saveToStorage}
                              toast={triggerToast}
                              openModal={openOverlayModal}
                              closeModal={closeOverlayModal}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="space-y-5 max-w-4xl text-slate-800">
                          <div className="flex justify-between items-center border-b border-slate-205 pb-3">
                            <h4 className="font-sans font-bold text-base text-slate-900 flex items-center gap-1.5">
                              📎 Recortes de Jurisprudência e Leis Secas Anexadas
                            </h4>
                            <button className="text-xs px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-indigo-700 font-extrabold hover:bg-indigo-50 shadow-sm transition-all cursor-pointer" onClick={handleAddMaterialClip}>
                              ＋ Vincular Novo Recorte
                            </button>
                          </div>

                          {/* Render different categories of lists */}
                          {["doutrina", "jurisprudencia", "legislacao"].map(cat => {
                            const list = activeNode.materials?.[cat] || [];
                            const catLabels: { [k: string]: string } = {
                              doutrina: "📚 Resumo / Doutrina Clássica",
                              jurisprudencia: "🏛️ Informativos / Julgados",
                              legislacao: "⚖️ Artigos / Legislação"
                            };

                            return (
                              <div key={cat} className="space-y-2">
                                <h5 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-wide">{catLabels[cat]}</h5>
                                {list.length === 0 ? (
                                  <div className="p-4 bg-white border border-slate-200 border-dashed rounded-xl text-slate-400 italic text-[11px] text-center select-none shadow-sm">
                                    Nenhum recorte registrado de {catLabels[cat].split("").slice(3).join("")}. Use o cabeçalho acima para cadastrar.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {list.map(m => (
                                      <div key={m.id} className="p-4 bg-white border border-slate-200/80 rounded-xl relative shadow hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                                        <div>
                                          <h6 className="font-bold font-sans text-sm text-slate-900 pr-4">{m.title}</h6>
                                          <span className="text-[10px] text-slate-400 font-bold block mb-2">{m.source}</span>
                                          <p className="text-xs text-slate-600 leading-relaxed text-justify whitespace-pre-wrap">{m.body}</p>
                                        </div>

                                        <div className="flex justify-end gap-1.5 mt-3 select-none">
                                          <button className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline inline-flex items-center cursor-pointer font-sans" onClick={() => {
                                            if (confirm("Remover este recorte material?")) {
                                              const updated = { ...appData };
                                              const nbObj = updated.notebooks.find(nb => nb.id === activeNotebookId);
                                              if (nbObj) {
                                                const walkAndRemove = (nodes: Node[]): boolean => {
                                                  for (let i = 0; i < nodes.length; i++) {
                                                    if (nodes[i].id === activeNode.id) {
                                                      nodes[i].materials[cat] = nodes[i].materials[cat].filter(x => x.id !== m.id);
                                                      return true;
                                                    }
                                                    if (nodes[i].children && walkAndRemove(nodes[i].children)) return true;
                                                  }
                                                  return false;
                                                };
                                                walkAndRemove(nbObj.children);
                                              }
                                              setAppData(updated);
                                              saveToStorage(updated);
                                              triggerToast("Recorte removido.", "info");
                                            }
                                          }}>Excluir material</button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Grounded AI Tutor Sidebar block */}
                    {aiSidebarType === "notebook" && (
                      <div className="w-[340px] md:w-[380px] bg-white border-l border-slate-100 p-4 shadow-xl flex flex-col h-full shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3 select-none">
                          <h4 className="font-sans font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-indigo-600" /> Tutor Magistratura (IA)
                          </h4>
                          <button className="text-xs text-slate-400 hover:text-slate-800" onClick={() => setAiSidebarType(null)}>✕</button>
                        </div>
                        <AiChat
                          type="notebook"
                          notebookId={activeNotebookId}
                          appData={appData}
                          setAppData={setAppData}
                          persistData={saveToStorage}
                          toast={triggerToast}
                          onClose={() => setAiSidebarType(null)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-700 select-none">
                  <div className="max-w-md bg-white border border-slate-200/65 shadow-xl rounded-2xl p-6 md:p-8 animate-none">
                    <BookOpen className="mx-auto text-indigo-505 mb-4 stroke-1" size={54} />
                    <h3 className="font-sans font-extrabold text-lg text-slate-905 mb-2 leading-tight">Cadernos Digitais Integrados</h3>
                    <p className="text-xs leading-relaxed text-slate-400 text-justify mb-4 font-sans">
                      Selecione um tópico específico cobrado no edital utilizando o explorer à esquerda do painel. Nele você poderá escrever de forma livre, formatar teses jurídicas, acoplar julgados importantes e acionar o assistente virtual do Codex.
                    </p>
                    <button className="btn primary w-full py-2.5 font-bold cursor-pointer" onClick={() => handleAddNewTreeFolder(null)}>
                      ＋ Criar pasta no topo do caderno
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "precedentes" ? (
          <div className="flex-1 flex overflow-hidden bg-slate-50">
            {/* Left sidebar filter controls */}
            <div className="w-[200px] bg-slate-50 border-r border-slate-200 py-5 px-3 flex flex-col justify-between shrink-0 select-none">
              <div>
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mb-4 font-mono">Assistência Jurídica</h4>
                <div className="space-y-2">
                  <button className="w-full text-center justify-center px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all shadow-md cursor-pointer" onClick={() => setAiSidebarType(aiSidebarType === "teses" ? null : "teses")}>
                    <Sparkles size={13} /> Chat Assistente STF/STJ
                  </button>
                  <p className="text-[10px] text-slate-400 leading-relaxed italic pr-1">A IA responde a dúvidas complexas baseando no seu banco local e no Google Search simultaneamente.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200 text-[10px] leading-relaxed text-slate-400">
                <b>Sincronismo:</b> Ao criar resumos ligados, os precedentes aparecem no fichário correspondente da disciplina sob demanda.
              </div>
            </div>

            {/* Inner Main Repository */}
            <div className="flex-grow flex bg-slate-50 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <TesesSumulas
                  appData={appData}
                  setAppData={setAppData}
                  persistData={saveToStorage}
                  toast={triggerToast}
                  openModal={openOverlayModal}
                  closeModal={closeOverlayModal}
                />
              </div>

              {/* Chat panel */}
              {aiSidebarType && (aiSidebarType === "teses" || aiSidebarType === "sumulas") && (
                <div className="w-[340px] md:w-[380px] bg-white border-l border-slate-100 p-4 shadow-xl flex flex-col h-full shrink-0">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3 select-none">
                    <h4 className="font-sans font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-605" /> Assistente de Temas (IA)
                    </h4>
                    <button className="text-xs text-slate-400 hover:text-slate-800" onClick={() => setAiSidebarType(null)}>✕</button>
                  </div>
                  <AiChat
                    type={aiSidebarType}
                    appData={appData}
                    setAppData={setAppData}
                    persistData={saveToStorage}
                    toast={triggerToast}
                    onClose={() => setAiSidebarType(null)}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex bg-slate-50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <MinhasProvas
                appData={appData}
                setAppData={setAppData}
                persistData={saveToStorage}
                toast={triggerToast}
                openModal={openOverlayModal}
                closeModal={closeOverlayModal}
              />
            </div>
          </div>
        )}
      </main>

      {/* Global Overlay Modal Container */}
      {modalContent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-text">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto text-slate-800 transition-all duration-300 transform scale-100">
            {modalContent}
          </div>
        </div>
      )}

      {/* Global Toast Notification widget */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 select-none pointer-events-none transition-all duration-300 transform scale-100 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold bg-slate-900 border-slate-850 text-white">
          <Sparkles size={13} className="text-indigo-400" /> 
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
