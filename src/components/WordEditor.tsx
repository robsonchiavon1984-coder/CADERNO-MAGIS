import React, { useState, useEffect, useRef } from "react";
import { Node, Notebook, Style, PageSetup, AppData } from "../types";
import { FileText, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, ChevronRight, Minimize2, Maximize2, Download, Table, Image as ImageIcon, Settings, Sliders, Trash2, Edit } from "lucide-react";

interface WordEditorProps {
  notebook: Notebook;
  node: Node;
  path: Node[];
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  persistData: (updated: AppData) => void;
  toast: (msg: string, type?: "ok" | "err" | "info") => void;
  openModal: (html: React.ReactNode) => void;
  closeModal: () => void;
}

const FONTS = [
  "EB Garamond",
  "Cormorant Garamond",
  "Cinzel",
  "Arial",
  "Times New Roman",
  "Georgia",
  "Calibri",
  "Verdana",
  "Tahoma",
  "Courier New"
];

const SIZES = [8, 9, 10, 11, 12, 14, 16, 17, 18, 20, 22, 24, 28, 32, 36, 42, 48, 56, 72];
const FCOLORS = ["#1a1a1a", "#555555", "#ffffff", "#7b1e1e", "#c0392b", "#d35400", "#b8860b", "#1e7b34", "#1c4f8b", "#5b2a86"];
const HCOLORS = ["#fff59d", "#d7f59d", "#a8e6a3", "#a3e6e6", "#a3c7f5", "#d6b3f5", "#f5b3d6", "#f5a3a3", "#ffd59e", "#ffffff"];

const PAGE_SIZES = {
  A4: { w: 21, h: 29.7, label: "A4" },
  Carta: { w: 21.59, h: 27.94, label: "Carta" },
  Oficio: { w: 21.59, h: 33, label: "Ofício" },
  Legal: { w: 21.59, h: 35.56, label: "Legal" }
};

export default function WordEditor({
  notebook,
  node,
  path,
  appData,
  setAppData,
  persistData,
  toast,
  openModal,
  closeModal
}: WordEditorProps) {
  const [editorMax, setEditorMax] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [activeStyles, setActiveStyles] = useState<Style[]>([]);
  const [tocHeadings, setTocHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [saveStatus, setSaveStatus] = useState("Salvo automaticamente ✓");

  const editorRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (appData.styles) {
      setActiveStyles(appData.styles);
    }
  }, [appData.styles]);

  // Load editor content on node change
  useEffect(() => {
    if (editorRef.current && node) {
      editorRef.current.innerHTML = node.content || "";
      if (tocVisible) buildToc();
    }
  }, [node.id]);

  // Capture selection ranges for popping popups without losing selection
  const savedRangeRef = useRef<Range | null>(null);

  const captureSelection = () => {
    const s = window.getSelection();
    if (s && s.rangeCount > 0) {
      const r = s.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(r.commonAncestorContainer)) {
        savedRangeRef.current = r;
      }
    }
  };

  const restoreSelection = () => {
    const s = window.getSelection();
    if (s && savedRangeRef.current) {
      s.removeAllRanges();
      s.addRange(savedRangeRef.current);
    } else if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    setSaveStatus("Digitando...");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      const htmlContent = editorRef.current?.innerHTML || "";
      
      // Deep node update
      const updatedData = { ...appData };
      const findAndReplaceContent = (nodes: Node[]): boolean => {
        for (let n of nodes) {
          if (n.id === node.id) {
            n.content = htmlContent;
            return true;
          }
          if (n.children && findAndReplaceContent(n.children)) return true;
        }
        return false;
      };

      const notebookObj = updatedData.notebooks.find(n => n.id === notebook.id);
      if (notebookObj) {
        findAndReplaceContent(notebookObj.children);
      }

      setAppData(updatedData);
      persistData(updatedData);
      setSaveStatus(`Salvo ✓ ${new Date().toLocaleTimeString("pt-BR")}`);
      if (tocVisible) buildToc();
    }, 500);
  };

  const execCmd = (cmd: string, value: any = null) => {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, value);
    handleInput();
  };

  const setFontSize = (px: number) => {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontSize", false, "7");
    
    if (editorRef.current) {
      editorRef.current.querySelectorAll('font[size="7"]').forEach(font => {
        font.removeAttribute("size");
        (font as HTMLElement).style.fontSize = `${px}px`;
      });
    }
    handleInput();
  };

  const setLineHeight = (val: string) => {
    restoreSelection();
    const block = getSelectionBlock();
    if (block) {
      block.style.lineHeight = val;
      handleInput();
    }
  };

  const toggleFirstLineIndent = () => {
    restoreSelection();
    const block = getSelectionBlock();
    if (block) {
      block.style.textIndent = block.style.textIndent === "2.5em" ? "0" : "2.5em";
      handleInput();
    }
  };

  const getSelectionBlock = (): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let n: any = sel.getRangeAt(0).commonAncestorContainer;
    if (n.nodeType === 3) n = n.parentNode;
    const ed = editorRef.current;
    while (n && n !== ed && !["P", "DIV", "LI", "H1", "H2", "H3", "BLOCKQUOTE", "PRE", "TD"].includes(n.tagName)) {
      n = n.parentNode;
    }
    return n && n !== ed ? n : null;
  };

  // Custom Sizing Page Senders
  const sizeConfig = PAGE_SIZES[appData.pageSetup.size] || PAGE_SIZES.A4;
  const paddingStyle = {
    paddingTop: `${appData.pageSetup.top}cm`,
    paddingRight: `${appData.pageSetup.right}cm`,
    paddingBottom: `${appData.pageSetup.bottom}cm`,
    paddingLeft: `${appData.pageSetup.left}cm`,
    width: `${sizeConfig.w}cm`,
    minHeight: `${sizeConfig.h}cm`
  };

  // Drag rulers centimeter ticks
  const drawRulerTicks = () => {
    const list = [];
    const maxNum = Math.floor(sizeConfig.w);
    for (let i = 0; i <= maxNum; i++) {
      list.push(
        <div key={i} className="absolute top-3 text-[8.5px] font-mono text-white/40" style={{ left: `${i}cm`, transform: "translateX(-50%)" }}>
          <span>{i}</span>
          <span className="block w-[1px] h-[7px] bg-white/20 mx-auto mt-0.5" />
        </div>
      );
    }
    return list;
  };

  // Margin rulers markers drag handlers
  const handleRulerHeaderDrag = (e: React.MouseEvent, type: "left" | "right") => {
    e.preventDefault();
    const startX = e.clientX;
    const initialLeft = appData.pageSetup.left;
    const initialRight = appData.pageSetup.right;
    const pxToCmScalar = rulerRef.current ? rulerRef.current.getBoundingClientRect().width / sizeConfig.w : 38;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaCm = (ev.clientX - startX) / pxToCmScalar;
      const updatedSetup = { ...appData.pageSetup };
      
      if (type === "left") {
        let nval = parseFloat((initialLeft + deltaCm).toFixed(1));
        nval = Math.max(0, Math.min(nval, sizeConfig.w - updatedSetup.right - 1.5));
        updatedSetup.left = nval;
      } else {
        let nval = parseFloat((initialRight - deltaCm).toFixed(1));
        nval = Math.max(0, Math.min(nval, sizeConfig.w - updatedSetup.left - 1.5));
        updatedSetup.right = nval;
      }

      setAppData(prev => ({ ...prev, pageSetup: updatedSetup }));
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      persistData({ ...appData });
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  // TOC Generator
  const buildToc = () => {
    if (!editorRef.current) return;
    const hs = editorRef.current.querySelectorAll("h1, h2, h3");
    const arr: any[] = [];
    hs.forEach((h, idx) => {
      if (!h.id) {
        h.id = `h_${idx}_${Date.now().toString(36)}`;
      }
      arr.push({
        id: h.id,
        text: h.textContent || "",
        level: h.tagName === "H1" ? 1 : h.tagName === "H2" ? 2 : 3
      });
    });
    setTocHeadings(arr);
  };

  const scrollHeading = (hid: string) => {
    if (!editorRef.current) return;
    const target = editorRef.current.querySelector(`#${hid}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const el = target as HTMLElement;
      const previousColor = el.style.backgroundColor;
      el.style.transition = "background-color 0.4s";
      el.style.backgroundColor = "rgba(184, 134, 11, 0.25)";
      setTimeout(() => {
        el.style.backgroundColor = previousColor;
      }, 1500);
    }
  };

  // Pre-formatting blocks
  const handleFormatBlock = (tag: string) => {
    restoreSelection();
    document.execCommand("formatBlock", false, tag);
    handleInput();
  };

  // Table handling
  const triggerTableInsert = (rows: number, cols: number) => {
    restoreSelection();
    let markup = `<table class="doc-table border-collapse w-full my-3 border border-slate-250 text-[15px]"><tbody>`;
    for (let r = 0; r < rows; r++) {
      markup += `<tr>`;
      for (let c = 0; c < cols; c++) {
        markup += `<td class="border border-slate-200 p-2 min-w-[35px]" style="vertical-align: top;"><br></td>`;
      }
      markup += `</tr>`;
    }
    markup += `</tbody></table><p><br></p>`;
    document.execCommand("insertHTML", false, markup);
    handleInput();
    closeModal();
  };

  const handleTableModal = () => {
    captureSelection();
    openModal(
      <div className="p-1 text-slate-800">
        <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2 mb-2 font-sans tracking-tight">
          <Table size={20} className="text-indigo-650" /> Inserir Tabela de Resumo
        </h3>
        <p className="text-xs text-slate-450 italic mb-4">Selecione o tamanho inicial da sua tabela de estudo.</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Linhas</label>
            <input id="tbRowInput" type="number" min={1} max={25} defaultValue={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Colunas</label>
            <input id="tbColInput" type="number" min={1} max={15} defaultValue={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" />
          </div>
        </div>
        <div className="flex justify-end gap-2 text-xs">
          <button className="btn ghost px-4 py-2" onClick={closeModal}>Cancelar</button>
          <button className="btn primary px-4 py-2 font-semibold" onClick={() => {
            const rows = parseInt((document.getElementById("tbRowInput") as HTMLInputElement)?.value) || 3;
            const cols = parseInt((document.getElementById("tbColInput") as HTMLInputElement)?.value) || 3;
            triggerTableInsert(rows, cols);
          }}>Inserir Tabela</button>
        </div>
      </div>
    );
  };

  const performTableOp = (op: "rowBelow" | "colRight" | "delRow" | "delCol" | "mergeRight" | "mergeDown" | "split") => {
    restoreSelection();
    const cell = getSelectionBlock()?.closest("td") as HTMLTableCellElement | null;
    if (!cell) {
      toast("Coloque o cursor dentro de uma célula da tabela para essa operação.", "err");
      return;
    }
    const table = cell.closest("table") as HTMLTableElement;
    const row = cell.parentElement as HTMLTableRowElement;
    const rowsList = Array.from(table.rows);
    const rowIndex = rowsList.indexOf(row);
    const cellIndex = Array.from(row.cells).indexOf(cell);

    if (op === "rowBelow") {
      const newRow = document.createElement("tr");
      for (let i = 0; i < row.cells.length; i++) {
        const td = document.createElement("td");
        td.className = "border border-slate-200 p-2 min-w-[35px]";
        td.style.verticalAlign = "top";
        td.innerHTML = "<br>";
        newRow.appendChild(td);
      }
      row.after(newRow);
    } else if (op === "colRight") {
      rowsList.forEach(r => {
        const refCell = r.cells[cellIndex];
        const td = document.createElement("td");
        td.className = "border border-slate-200 p-2 min-w-[35px]";
        td.style.verticalAlign = "top";
        td.innerHTML = "<br>";
        if (refCell) refCell.after(td);
        else r.appendChild(td);
      });
    } else if (op === "delRow") {
      if (rowsList.length > 1) {
        row.remove();
      } else {
        toast("A tabela precisa conter ao menos uma linha.", "err");
      }
    } else if (op === "delCol") {
      const minColCount = Math.max(...rowsList.map(r => r.cells.length));
      if (minColCount > 1) {
        rowsList.forEach(r => {
          if (r.cells[cellIndex]) r.cells[cellIndex].remove();
        });
      } else {
        toast("A tabela precisa conter ao menos uma coluna.", "err");
      }
    } else if (op === "mergeRight") {
      const nextCell = cell.nextElementSibling as HTMLTableCellElement | null;
      if (nextCell) {
        cell.colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
        if (nextCell.innerHTML.replace(/<br\s*\/?>/gi, "").trim()) {
          cell.innerHTML += " " + nextCell.innerHTML;
        }
        nextCell.remove();
      } else {
        toast("Não há células livres à direita para mesclar.", "err");
      }
    } else if (op === "mergeDown") {
      const rowBelow = rowsList[rowIndex + 1];
      const cellBelow = rowBelow?.cells[cellIndex];
      if (cellBelow) {
        cell.rowSpan = (cell.rowSpan || 1) + (cellBelow.rowSpan || 1);
        if (cellBelow.innerHTML.replace(/<br\s*\/?>/gi, "").trim()) {
          cell.innerHTML += " " + cellBelow.innerHTML;
        }
        cellBelow.remove();
      } else {
        toast("Não há células livres abaixo para mesclar.", "err");
      }
    } else if (op === "split") {
      const cs = cell.colSpan || 1;
      const rs = cell.rowSpan || 1;
      cell.colSpan = 1;
      cell.rowSpan = 1;

      for (let k = 1; k < cs; k++) {
        const td = document.createElement("td");
        td.className = "border border-slate-200 p-2 min-w-[35px]";
        td.style.verticalAlign = "top";
        td.innerHTML = "<br>";
        cell.after(td);
      }

      for (let k = 1; k < rs; k++) {
        const rowTarget = rowsList[rowIndex + k];
        if (rowTarget) {
          const td = document.createElement("td");
          td.className = "border border-slate-200 p-2 min-w-[35px]";
          td.style.verticalAlign = "top";
          td.innerHTML = "<br>";
          const refCell = rowTarget.cells[cellIndex];
          if (refCell) refCell.before(td);
          else rowTarget.appendChild(td);
        }
      }
    }
    handleInput();
  };

  // Image handler and downscaling
  const triggerImageInsert = (source: string) => {
    restoreSelection();
    const markup = `<img src="${source}" class="max-w-full h-auto rounded-md shadow-md my-4" /><p><br></p>`;
    document.execCommand("insertHTML", false, markup);
    handleInput();
    closeModal();
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxW = 1200;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        try {
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          triggerImageInsert(compressed);
        } catch (err) {
          triggerImageInsert(loadEvent.target?.result as string);
        }
      };
      img.src = loadEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageModal = () => {
    captureSelection();
    openModal(
      <div className="p-1 text-slate-800">
        <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2 mb-2 font-sans tracking-tight">
          <ImageIcon size={20} className="text-indigo-650" /> Inserir Imagem de Apoio
        </h3>
        <p className="text-xs text-slate-450 italic mb-4">Escolha carregar do computador ou informe uma URL pública.</p>
        <div className="field mb-3">
          <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Do computador</label>
          <input type="file" accept="image/*" onChange={handleImageInput} className="w-full text-xs text-slate-800 block bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-400" />
        </div>
        <div className="field mb-4">
          <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Por Link / URL</label>
          <input id="imgWebUrl" placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" />
        </div>
        <div className="flex justify-end gap-2 text-xs">
          <button className="btn ghost px-4 py-2" onClick={closeModal}>Cancelar</button>
          <button className="btn primary px-4 py-2 font-semibold" onClick={() => {
            const url = (document.getElementById("imgWebUrl") as HTMLInputElement)?.value?.trim() || "";
            if (url) triggerImageInsert(url);
            else toast("Por favor, digite um link de imagem válido.", "err");
          }}>Inserir Imagem</button>
        </div>
      </div>
    );
  };

  // Style Presets Managing Modal
  const loadPresetStyle = (styleId: string) => {
    const s = activeStyles.find(x => x.id === styleId);
    if (!s) return;
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    if (s.fontFamily) document.execCommand("fontName", false, s.fontFamily);
    if (s.color) document.execCommand("foreColor", false, s.color);
    if (s.fontSize) setFontSize(s.fontSize);

    // Apply alignment
    const alignMap = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight", justify: "justifyFull" };
    document.execCommand(alignMap[s.align] || "justifyLeft");

    // Apply inline bold, italic, underline state togglers
    const checkStateAndApply = (cmdName: string, state: boolean) => {
      try {
        if (document.queryCommandState(cmdName) !== state) {
          document.execCommand(cmdName, false, null);
        }
      } catch (err) {}
    };
    checkStateAndApply("bold", s.bold);
    checkStateAndApply("italic", s.italic);
    checkStateAndApply("underline", s.underline);

    // Line heights
    const block = getSelectionBlock();
    if (block && s.lineHeight) {
      block.style.lineHeight = s.lineHeight;
    }

    handleInput();
    toast(`Estilo "${s.name}" aplicado.`, "info");
  };

  const handleManageStyles = () => {
    openModal(
      <div className="p-1 text-slate-800">
        <h3 className="font-semibold text-lg text-slate-905 flex items-center gap-2 mb-2 font-sans tracking-tight">
          <Sliders size={20} className="text-indigo-650" /> Presets de Estilo
        </h3>
        <p className="text-xs text-slate-450 italic mb-3">Estilos compartilhados para formatação rápida de texto.</p>
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 mb-4">
          {activeStyles.map(st => (
            <div key={st.id} className="p-3 bg-slate-50 rounded-xl border border-slate-205 flex items-center justify-between">
              <div>
                <span className="font-semibold block text-slate-800" style={{ fontFamily: st.fontFamily, color: st.color, fontWeight: st.bold ? "bold" : "normal", fontStyle: st.italic ? "italic" : "normal", textDecoration: st.underline ? "underline" : "none" }}>
                  {st.name}
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  {st.fontFamily} · {st.fontSize}px · {st.align}
                </span>
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 hover:text-red-550 hover:bg-red-50 rounded-lg cursor-pointer transition-colors text-slate-400" onClick={() => {
                  const kept = activeStyles.filter(x => x.id !== st.id);
                  const updatedOpts = { ...appData, styles: kept };
                  setAppData(updatedOpts);
                  persistData(updatedOpts);
                }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center text-xs">
          <button className="btn ghost px-4 py-2" onClick={closeModal}>Fechar</button>
          <button className="btn primary px-4 py-2 font-semibold" onClick={handleNewStyleForm}>
            ＋ Criar Preset
          </button>
        </div>
      </div>
    );
  };

  const handleNewStyleForm = () => {
    openModal(
      <div className="p-1 text-slate-800">
        <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2 mb-3 font-sans tracking-tight">
          🎨 Novo Preset de Estilo
        </h3>
        <div className="field mb-3">
          <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Nome do Estilo</label>
          <input id="nsName" placeholder="Ex: Citação de Acórdão" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Fonte</label>
            <select id="nsFont" className="w-full px-2 py-2 border border-slate-201 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none">
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Tamanho (px)</label>
            <select id="nsSize" className="w-full px-2 py-2 border border-slate-201 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none" defaultValue={17}>
              {SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Cor texto</label>
            <input id="nsColor" type="color" defaultValue="#1a1a1a" className="w-full h-[40px] px-1 py-1 border border-slate-201 rounded-lg bg-slate-50 cursor-pointer" />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Alinhamento</label>
            <select id="nsAlign" className="w-full px-2 py-2 border border-slate-201 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none" defaultValue="justify">
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
              <option value="justify">Justificado</option>
            </select>
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500 font-mono">Linhas</label>
            <select id="nsLh" className="w-full px-2 py-2 border border-slate-201 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none" defaultValue="1.5">
              <option value="1">1.0</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2">2.0</option>
            </select>
          </div>
        </div>
        <div className="field mb-4">
          <label className="block text-[10px] font-bold uppercase mb-2 text-slate-550 font-mono">Opções</label>
          <div className="flex gap-4 text-xs font-semibold text-slate-705">
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" id="nsBold" className="accent-indigo-600" /> Negrito</label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" id="nsItalic" className="accent-indigo-600" /> Itálico</label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" id="nsUnderline" className="accent-indigo-600" /> Sublinhado</label>
          </div>
        </div>
        <div className="flex justify-between items-center text-xs">
          <button className="btn ghost px-4 py-2" onClick={handleManageStyles}>Voltar</button>
          <button className="btn primary px-4 py-2 font-semibold" onClick={() => {
            const name = (document.getElementById("nsName") as HTMLInputElement)?.value?.trim() || "";
            if (!name) {
              toast("Nome do Estilo é obrigatório.", "err");
              return;
            }
            const o: Style = {
              id: `st_${Date.now()}_${Math.random().toString(36).substring(3, 7)}`,
              name,
              fontFamily: (document.getElementById("nsFont") as HTMLSelectElement).value,
              fontSize: parseInt((document.getElementById("nsSize") as HTMLSelectElement).value) || 17,
              color: (document.getElementById("nsColor") as HTMLInputElement).value,
              align: (document.getElementById("nsAlign") as HTMLSelectElement).value as any,
              lineHeight: (document.getElementById("nsLh") as HTMLSelectElement).value,
              bold: (document.getElementById("nsBold") as HTMLInputElement).checked,
              italic: (document.getElementById("nsItalic") as HTMLInputElement).checked,
              underline: (document.getElementById("nsUnderline") as HTMLInputElement).checked,
            };
            const updated = [...activeStyles, o];
            const updatedOpts = { ...appData, styles: updated };
            setAppData(updatedOpts);
            persistData(updatedOpts);
            handleManageStyles();
            toast(`Preset de estilo "${name}" criado.`, "ok");
          }}>Salvar Preset</button>
        </div>
      </div>
    );
  };

  // Exporters
  const triggerPDFExports = () => {
    if (!editorRef.current) return;
    const bodyCode = editorRef.current.innerHTML || "";
    const sizeConfig = PAGE_SIZES[appData.pageSetup.size] || PAGE_SIZES.A4;
    const setup = appData.pageSetup;

    const cssRule = `@page { size: ${sizeConfig.w}cm ${sizeConfig.h}cm; margin: ${setup.top}cm ${setup.right}cm ${setup.bottom}cm ${setup.left}cm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "EB Garamond", serif; font-size: 11pt; line-height: 1.5; color: #000; }
    h1, h2, h3 { font-family: "Cinzel", serif; font-weight: bold; margin-top: 15px; margin-bottom: 8px; }
    h1 { font-size: 20pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 13pt; }
    blockquote { border-left: 3px solid #b8860b; padding-left: 12px; font-style: italic; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
    table, th, td { border: 1px solid #8a7a5c; padding: 6px; }`;

    let iframe = document.getElementById("printFramePrivate") as HTMLIFrameElement | null;
    if (iframe) iframe.remove();
    iframe = document.createElement("iframe") as HTMLIFrameElement;
    iframe.id = "printFramePrivate";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${node.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond&family=EB+Garamond&display=swap" rel="stylesheet">
          <style>${cssRule}</style>
        </head>
        <body>
          <div class="Section1">${bodyCode}</div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (e) {
          toast("Seu navegador impediu o assistente de abrir a impressão. Tente abrir em aba exclusiva.", "err");
        }
      }, 800);
    }
  };

  const triggerWordExports = () => {
    if (!editorRef.current) return;
    const bodyCode = editorRef.current.innerHTML || "";
    const sizeConfig = PAGE_SIZES[appData.pageSetup.size] || PAGE_SIZES.A4;
    const setup = appData.pageSetup;

    const documentContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${node.name}</title>
    <style>
      @page Section1 { size: ${sizeConfig.w}cm ${sizeConfig.h}cm; margin: ${setup.top}cm ${setup.right}cm ${setup.bottom}cm ${setup.left}cm; }
      div.Section1 { page: Section1; }
      body { font-family: "Garamond", "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #000; }
      h1, h2, h3 { font-family: "Georgia", serif; font-weight: bold; margin-top: 15px; }
    </style></head>
    <body><div class="Section1">${bodyCode}</div></body></html>`;

    // Download blob trigger
    const blob = new Blob(["\ufeff", documentContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${node.name.replace(/[^\w-Á-ÿ ]/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1500);
    toast("Documento Word (.doc) gerado.", "ok");
  };

  // Custom margin configuration modal
  const handlePageSetupConfig = () => {
    openModal(
      <div className="p-1 text-slate-800">
        <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2 mb-2 font-sans tracking-tight">
          <FileText size={20} className="text-indigo-650" /> Tamanho do Papel &amp; Margens
        </h3>
        <p className="text-xs text-slate-450 italic mb-4">Escolha a padronização das folhas de estudo.</p>
        <div className="field mb-3">
          <label className="block text-[10px] font-bold uppercase mb-1 text-slate-550 font-mono">Tamanho de Folha</label>
          <select id="psSelSize" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" defaultValue={appData.pageSetup.size}>
            {Object.keys(PAGE_SIZES).map(k => (
              <option key={k} value={k}>{(PAGE_SIZES as any)[k].label} — {(PAGE_SIZES as any)[k].w} x {(PAGE_SIZES as any)[k].h} cm</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-550 font-mono">Margem Superior (cm)</label>
            <input id="psNumTop" type="number" step="0.1" min="0" max="10" defaultValue={appData.pageSetup.top} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-550 font-mono">Margem Inferior (cm)</label>
            <input id="psNumBottom" type="number" step="0.1" min="0" max="10" defaultValue={appData.pageSetup.bottom} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-550 font-mono">Margem Esquerda (cm)</label>
            <input id="psNumLeft" type="number" step="0.1" min="0" max="10" defaultValue={appData.pageSetup.left} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div className="field">
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-550 font-mono">Margem Direita (cm)</label>
            <input id="psNumRight" type="number" step="0.1" min="0" max="10" defaultValue={appData.pageSetup.right} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs outline-none focus:border-indigo-400" />
          </div>
        </div>
        <div className="hintbox text-xs bg-slate-50 border border-slate-200/60 text-slate-500 p-3 rounded-lg leading-relaxed mb-4">
          O padrão ABNT determina margens de <b>Superior: 3</b>, <b>Esquerda: 3</b>, <b>Inferior: 2</b> e <b>Direita: 2</b> para documentos formais.
        </div>
        <div className="flex justify-end gap-2 text-xs">
          <button className="btn ghost px-4 py-2" onClick={closeModal}>Cancelar</button>
          <button className="btn primary px-4 py-2 font-semibold" onClick={() => {
            const size = (document.getElementById("psSelSize") as HTMLSelectElement).value as any;
            const top = parseFloat((document.getElementById("psNumTop") as HTMLInputElement).value) || 2.0;
            const bottom = parseFloat((document.getElementById("psNumBottom") as HTMLInputElement).value) || 2.0;
            const left = parseFloat((document.getElementById("psNumLeft") as HTMLInputElement).value) || 2.0;
            const right = parseFloat((document.getElementById("psNumRight") as HTMLInputElement).value) || 2.0;
            const updated = { ...appData, pageSetup: { size, top, right, bottom, left } };
            setAppData(updated);
            persistData(updated);
            closeModal();
            toast("Configuração de folha aplicada.", "ok");
          }}>Aplicar</button>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full text-slate-800 ${editorMax ? "fixed inset-3 z-[110] bg-slate-50/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-y-auto" : ""}`}>
      {/* Editor Toolbar (Word-like layout) */}
      <div className="toolbar flex flex-wrap gap-1.5 items-center p-2 rounded-xl bg-white border border-slate-200 mb-3 shadow-sm select-none" onMouseDown={e => {
        if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
        e.preventDefault();
      }}>
        {/* Font Select */}
        <select className="h-8 rounded-lg border border-slate-200 text-xs px-2.5 py-1 bg-slate-50 text-slate-700 font-sans outline-none hover:bg-slate-100 transition-colors" onChange={e => execCmd("fontName", e.target.value)} defaultValue="">
          <option value="">Fonte ▾</option>
          {FONTS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>

        {/* Font Size Select */}
        <select className="h-8 rounded-lg border border-slate-200 text-xs px-2.5 py-1 bg-slate-50 text-slate-700 outline-none hover:bg-slate-100 transition-colors" onChange={e => setFontSize(parseInt(e.target.value))} defaultValue="">
          <option value="">Tamanho ▾</option>
          {SIZES.map(s => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>

        <span className="w-[1px] h-6 bg-slate-200 mx-1" />

        {/* Inline effects */}
        <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-200/80">
          <button className="h-7 w-8 text-xs font-bold hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => execCmd("bold")}>B</button>
          <button className="h-7 w-8 text-xs italic hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => execCmd("italic")}>I</button>
          <button className="h-7 w-8 text-xs underline hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => execCmd("underline")}>S</button>
          <button className="h-7 w-8 text-xs line-through hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => execCmd("strikeThrough")}>T</button>
        </div>

        {/* Colors pops */}
        <select className="h-8 rounded-lg border border-slate-200 text-xs px-2 py-1 bg-slate-50 text-slate-700 outline-none" onChange={e => execCmd("foreColor", e.target.value)} defaultValue="">
          <option value="">Cor Texto ▾</option>
          {FCOLORS.map(c => (
            <option key={c} value={c} style={{ color: c }}>■ Cor</option>
          ))}
        </select>

        <select className="h-8 rounded-lg border border-slate-200 text-xs px-2 py-1 bg-slate-50 text-slate-700 outline-none" onChange={e => execCmd("hiliteColor", e.target.value)} defaultValue="">
          <option value="">Marca-texto ▾</option>
          {HCOLORS.map(c => (
            <option key={c} value={c} style={{ backgroundColor: c }}>■ Marca</option>
          ))}
        </select>

        <span className="w-[1px] h-6 bg-slate-200 mx-1" />

        {/* Alignments */}
        <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-200/80">
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => execCmd("justifyLeft")}><AlignLeft size={14} /></button>
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => execCmd("justifyCenter")}><AlignCenter size={14} /></button>
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => execCmd("justifyRight")}><AlignRight size={14} /></button>
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => execCmd("justifyFull")}><AlignJustify size={14} /></button>
        </div>

        {/* Lists & Indents */}
        <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-200/80">
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer text-xs gap-0.5 font-bold" onClick={() => execCmd("insertUnorderedList")}><List size={14} /></button>
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer text-xs gap-0.5 font-bold" onClick={() => execCmd("insertOrderedList")}><ListOrdered size={14} /></button>
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer text-xs font-bold" onClick={() => execCmd("outdent")}>⇤</button>
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer text-xs font-bold" onClick={() => execCmd("indent")}>⇥</button>
          <button className="h-7 w-9 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer text-[11px] font-bold" title="Espaçamento de 1º parágrafo" onClick={toggleFirstLineIndent}>¶→</button>
        </div>

        {/* Line heights */}
        <select className="h-8 rounded-lg border border-slate-200 text-xs px-2 py-1 bg-slate-50 text-slate-700 outline-none" onChange={e => setLineHeight(e.target.value)} defaultValue="">
          <option value="">Espaç. ▾</option>
          <option value="1">1.0</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2">2.0</option>
        </select>

        {/* Styles list */}
        <select className="h-8 rounded-lg border border-slate-200 text-xs px-2 py-1 bg-slate-50 text-slate-700 outline-none font-semibold" onChange={e => {
          if (e.target.value === "__manage") handleManageStyles();
          else if (e.target.value) loadPresetStyle(e.target.value);
          e.target.value = "";
        }} defaultValue="">
          <option value="">Estilos Rápidos ▾</option>
          {activeStyles.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          <option value="__manage">⚙ Gerenciar Estilos...</option>
        </select>

        <select className="h-8 rounded-lg border border-slate-200 text-xs px-2 py-1 bg-slate-50 text-slate-700 outline-none" onChange={e => {
          if (e.target.value) handleFormatBlock(e.target.value);
          e.target.value = "";
        }} defaultValue="">
          <option value="">Headers ▾</option>
          <option value="P">Parágrafo Padrão</option>
          <option value="H1">Título H1</option>
          <option value="H2">Subtítulo H2</option>
          <option value="H3">Seção H3</option>
        </select>

        <span className="w-[1px] h-6 bg-slate-200/60 mx-1" />

        {/* Table Operations Selection */}
        <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-200/80">
          <button className="h-7 w-8 flex items-center justify-center hover:bg-slate-200/80 rounded text-slate-700 hover:text-slate-900 cursor-pointer text-xs font-bold" title="Inserir Tabela" onClick={handleTableModal}><Table size={14} /></button>
          <select className="h-7 rounded text-[11px] border border-transparent bg-transparent text-slate-750 outline-none font-medium" defaultValue="" onChange={e => {
            if (e.target.value) performTableOp(e.target.value as any);
            e.target.value = "";
          }}>
            <option value="">Ações Tabela ▾</option>
            <option value="rowBelow">＋ Linha Abaixo</option>
            <option value="colRight">＋ Coluna Direita</option>
            <option value="delRow">🗑 Excluir Linha</option>
            <option value="delCol">🗑 Excluir Coluna</option>
            <option value="mergeRight">⬌ Mesclar Direita</option>
            <option value="mergeDown">⬍ Mesclar Abaixo</option>
            <option value="split">⊟ Dividir Célula</option>
          </select>
        </div>

        <button className="h-8 w-8 flex items-center justify-center hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer" title="Inserir Imagem" onClick={handleImageModal}>
          <ImageIcon size={14} />
        </button>

        <button className={`h-8 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${tocVisible ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"}`} title="Gerar Sumário do Documento" onClick={() => {
          setTocVisible(prev => !prev);
          if (!tocVisible) setTimeout(buildToc, 50);
        }}>
          📑 Índice
        </button>
      </div>

      {/* Exporters and Layout Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-slate-200/60 p-2 rounded-xl shadow-sm">
        <button className="btn sm hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 font-bold cursor-pointer" onClick={handlePageSetupConfig}>
          <Sliders size={13} className="text-slate-500" /> Página &amp; Margens
        </button>
        <span className="text-[11px] text-slate-400 font-medium font-mono hidden sm:inline">arraste as margens cinzas na régua de cm para ajustar</span>

        <div className="ml-auto flex items-center gap-1.5">
          <button className="btn sm hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer" onClick={() => setEditorMax(prev => !prev)}>
            {editorMax ? <span className="flex items-center gap-1"><Minimize2 size={13} /> Minimizar</span> : <span className="flex items-center gap-1"><Maximize2 size={13} /> Tela Cheia</span>}
          </button>
          
          <button className="text-xs px-3.5 py-1.5 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer" onClick={triggerPDFExports}>
            <Download size={13} /> PDF
          </button>
          <button className="text-xs px-3.5 py-1.5 rounded-lg font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 cursor-pointer shadow-sm" onClick={triggerWordExports}>
            <Download size={13} /> Word
          </button>
        </div>
      </div>

      {/* Table of Contents panel */}
      {tocVisible && (
        <div className="bg-white border border-slate-200 p-3 rounded-xl mb-3 max-h-[160px] overflow-y-auto shadow-sm">
          <h5 className="font-sans font-bold text-xs uppercase text-slate-800 mb-1.5 border-b border-slate-100 pb-1">📑 Índice Automático</h5>
          {tocHeadings.length === 0 ? (
            <span className="text-xs italic text-slate-400">Nenhum título estruturado (H1, H2, H3) foi gerado ainda.</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tocHeadings.map(h => (
                <button key={h.id} className={`text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors`} style={{ marginLeft: `${(h.level - 1) * 8}px` }} onClick={() => scrollHeading(h.id)}>
                  {h.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor Main Canvas Sized */}
      <div className="flex-1 overflow-auto bg-slate-100 border border-slate-200/80 rounded-xl p-4 min-h-[400px] flex flex-col items-center shadow-inner">
        <div className="sheet-wrap relative flex flex-col items-center select-text">
          {/* Centimeter Horizontal Ruler */}
          <div ref={rulerRef} className="ruler-h relative h-7 bg-white border border-slate-200 rounded-xl mb-3 select-none flex items-center overflow-hidden" style={{ width: `${sizeConfig.w}cm` }}>
            {/* Draw centimetre increments */}
            {drawRulerTicks()}
            {/* Margin shades */}
            <div className="absolute top-0 bottom-0 left-0 bg-slate-50/50 border-r border-slate-200" style={{ width: `${appData.pageSetup.left}cm` }} />
            <div className="absolute top-0 bottom-0 right-0 bg-slate-50/50 border-l border-slate-200" style={{ width: `${appData.pageSetup.right}cm` }} />
            {/* Handles markers */}
            <div className="absolute top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center group" style={{ left: `${appData.pageSetup.left}cm`, transform: "translateX(-50%)" }} onMouseDown={e => handleRulerHeaderDrag(e, "left")}>
              <span className="w-1.5 h-4 bg-slate-400 rounded-lg group-hover:scale-y-125 transition-transform" />
            </div>
            <div className="absolute top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center group" style={{ left: `${sizeConfig.w - appData.pageSetup.right}cm`, transform: "translateX(-50%)" }} onMouseDown={e => handleRulerHeaderDrag(e, "right")}>
              <span className="w-1.5 h-4 bg-slate-400 rounded-lg group-hover:scale-y-125 transition-transform" />
            </div>
          </div>

          {/* Actual contentEditable Page */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            style={paddingStyle}
            className="editor-page bg-white text-black shadow-2xl rounded-sm border border-slate-200 outline-none text-left flex-1"
          />
        </div>
      </div>

      <div className="text-[11px] text-slate-400 font-medium italic mt-1.5 flex justify-between">
        <span>{saveStatus}</span>
        <span>A4 real size formatting (Garamond Print Ready)</span>
      </div>
    </div>
  );
}
