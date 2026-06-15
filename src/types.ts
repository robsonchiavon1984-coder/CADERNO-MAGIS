export interface Notebook {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  children: Node[];
  ai?: {
    messages: Message[];
  };
}

export interface Node {
  id: string;
  name: string;
  content: string;
  materials: {
    [category: string]: Material[];
  };
  children: Node[];
}

export interface Material {
  id: string;
  title?: string;
  source?: string;
  body?: string;
  createdAt: number;
  type?: string; // e.g. "doutrina", "jurisprudencia", "tese", "sumula", "enunciado", "legislacao", "arquivo"
  driveId?: string;
  mimeType?: string;
  url?: string;
}

export interface Style {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight: string;
  heading?: number;
}

export interface PageSetup {
  size: 'A4' | 'Carta' | 'Oficio' | 'Legal';
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Tese {
  id: string;
  orgao: string;
  tipo: string;
  tema: string;
  teseFirmada: string;
  processo: string;
  ramo: string;
  data: string;
  status: string;
  origem: string;
  obs: string;
  links: string[]; // Node IDs this is linked to
  createdAt: number;
  _origem?: 'repo' | 'caderno';
  _nodeId?: string;
  _nb?: string;
  _path?: string;
}

export interface Sumula {
  id: string;
  orgao: string;
  tema: string;
  enunciado: string;
  ramo: string;
  data: string;
  status: string;
  origem: string;
  obs: string;
  links: string[]; // Node IDs this is linked to
  createdAt: number;
  _origem?: 'repo' | 'caderno';
  _nodeId?: string;
  _nb?: string;
  _path?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { uri: string; title: string }[];
}

export interface Prova {
  id: string;
  nome: string;
  banca: string;
  cargo: string;
  status: string;
  obs: string;
  inicio: string; // YYYY-MM-DD
  dataProva: string; // YYYY-MM-DD
  disciplinas: ProvaDisciplina[];
  dias: { [ymd: string]: string }; // e.g., "2026-06-15": "studied" | "missed"
  pomo: {
    day: string;
    focusToday: number;
    total: number;
  };
  manualPPD: number | null;
}

export interface ProvaDisciplina {
  id: string;
  name: string;
  total: number;
  read: number;
  topics: ProvaTopic[];
}

export interface ProvaTopic {
  t: string;
  done: boolean;
}

export interface Settings {
  clientId?: string;
  geminiApiKey?: string;
  pickerApiKey?: string;
  geminiModel?: string;
  theme?: string;
  autosave?: boolean;
  _email?: string;
}

export interface ViewPrefs {
  nbColW: number;
  nbFont: number;
  treeColW: number;
  treeFont: number;
  edZoom: number;
  edH: number;
}

export interface AppData {
  version: number;
  updatedAt: number;
  notebooks: Notebook[];
  provas: Prova[];
  teses: Tese[];
  sumulas: Sumula[];
  styles: Style[];
  pageSetup: PageSetup;
  tesesChat: { messages: Message[] };
  sumulasChat: { messages: Message[] };
  pomo: { day: string; focusToday: number; total: number };
  viewPrefs: ViewPrefs;
  cats: {
    orgaos: string[];
    tipos: string[];
    status: string[];
    origens: string[];
    ramos: string[];
  };
}
