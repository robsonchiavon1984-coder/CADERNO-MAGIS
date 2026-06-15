import React, { useState, useEffect, useRef } from "react";
import { AppData, Notebook, Message, Node, Tese, Sumula } from "../types";
import { Sparkles, Send, RotateCcw, AlertTriangle, ExternalLink, Download } from "lucide-react";

interface AiChatProps {
  type: "notebook" | "teses" | "sumulas";
  notebookId?: string; // used if type === "notebook"
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  persistData: (updated: AppData) => void;
  toast: (msg: string, type?: "ok" | "err" | "info") => void;
  onClose: () => void;
}

export default function AiChat({
  type,
  notebookId,
  appData,
  setAppData,
  persistData,
  toast,
  onClose
}: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useGrounding, setUseGrounding] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load appropriate previous chat messages
  useEffect(() => {
    if (type === "notebook" && notebookId) {
      const nb = appData.notebooks.find(n => n.id === notebookId);
      if (nb) {
        setMessages(nb.ai?.messages || []);
      }
    } else if (type === "teses") {
      setMessages(appData.tesesChat?.messages || []);
    } else if (type === "sumulas") {
      setMessages(appData.sumulasChat?.messages || []);
    }
  }, [type, notebookId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Compile full notebook text context to feed to server
  const compileNotebookContextText = (nb: Notebook): string => {
    let result = `CADERNO: ${nb.name}\nCONTEUDO COMPLETO DO CADERNO:\n`;
    
    const fill = (nodes: Node[], path: string[]) => {
      nodes.forEach(n => {
        result += `\n# SEÇÃO: ${[...path, n.name].join(" › ")}\n`;
        // Clean HTML tags for context compactness
        const cleanContent = n.content ? n.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
        if (cleanContent) result += `CONTEUDO ESCRITO: ${cleanContent.slice(0, 1500)}\n`;

        // Materials
        Object.keys(n.materials || {}).forEach(k => {
          const list = n.materials[k] || [];
          if (list.length > 0) {
            result += `MATERIAIS VINCULADOS (${k}):\n`;
            list.forEach(it => {
              result += `— Sku: ${it.title || ""}. Fonte: ${it.source || ""}. Teor: ${it.body || ""}\n`;
            });
          }
        });

        if (n.children) fill(n.children, [...path, n.name]);
      });
    };

    fill(nb.children, []);
    return result;
  };

  // Compile active repository tese / sumula context
  const compilePrecedentsContextText = (): string => {
    let result = "";
    if (type === "teses") {
      result = "REPOSITÓRIO ADICIONAL DE TESES VINCULANTES CADASTRADAS PELO ALUNO:\n";
      appData.teses.slice(0, 80).forEach(t => {
        result += `— [Tese ${t.orgao}] ${t.tema}: ${t.teseFirmada} (Ramo: ${t.ramo})\n`;
      });
    } else {
      result = "REPOSITÓRIO ADICIONAL DE SÚMULAS CADASTRADAS PELO ALUNO:\n";
      appData.sumulas.slice(0, 120).forEach(s => {
        result += `— [Súmula ${s.orgao}] ${s.tema}: ${s.enunciado} (Ramo: ${s.ramo})\n`;
      });
    }
    return result;
  };

  const handleClear = () => {
    if (!confirm("Deseja apagar o histórico de conversa com a IA neste chat?")) return;
    const updated = { ...appData };
    if (type === "notebook" && notebookId) {
      const nb = updated.notebooks.find(n => n.id === notebookId);
      if (nb) {
        nb.ai = { messages: [] };
      }
    } else if (type === "teses") {
      updated.tesesChat = { messages: [] };
    } else if (type === "sumulas") {
      updated.sumulasChat = { messages: [] };
    }

    setMessages([]);
    setAppData(updated);
    persistData(updated);
    toast("Histórico excluído.", "info");
  };

  const handleSaveAsPrecedent = (text: string) => {
    const updated = { ...appData };
    if (type === "sumulas") {
      const item: Sumula = {
        id: `s_ia_${Date.now()}`,
        orgao: "STF",
        tema: `Enunciado sugerido por IA #${updated.sumulas.length + 1}`,
        enunciado: text,
        ramo: "",
        data: "",
        status: "Vigente",
        origem: "Sugerido por IA do caderno",
        links: [],
        obs: "Criado automaticamente a partir de reposta do assistente virtual (revisar).",
        createdAt: Date.now()
      };
      updated.sumulas.push(item);
      toast("Resposta salva em suas Súmulas com sucesso.", "ok");
    } else {
      const item: Tese = {
        id: `t_ia_${Date.now()}`,
        orgao: "STF",
        tipo: "Tese",
        status: "Trânsito em julgado",
        tema: `Tese sugerida por IA #${updated.teses.length + 1}`,
        processo: "",
        teseFirmada: text,
        ramo: "",
        data: "",
        origem: "Sugerida por IA",
        obs: "Criado automaticamente a partir de reposta do assistente virtual (revisar).",
        links: [],
        createdAt: Date.now()
      };
      updated.teses.push(item);
      toast("Resposta salva em suas Teses Vinculantes com sucesso.", "ok");
    }
    setAppData(updated);
    persistData(updated);
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt) return;

    const nextMessages: Message[] = [...messages, { role: "user", text: prompt }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      let sysInstruction = "";
      if (type === "notebook" && notebookId) {
        const nb = appData.notebooks.find(n => n.id === notebookId);
        if (nb) {
          sysInstruction = `Você é o assistente inteligente do caderno de estudos da magistratura "${nb.name}". 
          Responda a dúvidas jurídicas do aluno com absoluto rigor técnico e clareza, citando artigos, súmulas e julgados se couber.
          BASEIE-SE estritamente nas anotações de doutrina e materiais que o aluno reuniu na pasta (disponibilizada abaixo).
          Use o Grounding do Google (se ativado) para trazer jurisprudência ou debates doutrinários após o ano de 2024 para complementar.
          Sempre recomende conferir na fonte oficial.
          
          === CONTEÚDO REUNIDO DO ALUNO ===
          ${compileNotebookContextText(nb)}`;
        }
      } else {
        sysInstruction = `Você é o assistente inteligente especializado em ${type === "teses" ? "Teses Vinculantes" : "Súmulas e Enunciados"} da magistratura brasileira.
        Responda em português com precisão técnica exemplar, citando o órgão julgador (STF, STJ, etc.) e o leading case se houver.
        Seu repositório de cabeceira está anexado abaixo. Use a ferramenta do Google Search Grounding integrada para resgatar notícias, decisões mais novas do STF/STJ ou modulação de efeitos.
        Seja sempre didático e voltado para a jurisprudência das provas orais e discursivas de Juiz de Direito.
        
        === SEU REPOSITÓRIO CADASTRADO ===
        ${compilePrecedentsContextText()}`;
      }

      // POST with payload, keeps API secrets strictly hidden on server-side
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          systemInstruction: sysInstruction,
          model: appData.viewPrefs ? "gemini-3.5-flash" : "", // optional
          useGrounding
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error?.message || "Erro no servidor ao solicitar processamento.");
      }

      const replyMsg: Message = {
        role: "model",
        text: resJson.text || "",
        sources: resJson.sources || undefined
      };

      const finalMessages = [...nextMessages, replyMsg];
      setMessages(finalMessages);

      // Persist conversations
      const updated = { ...appData };
      if (type === "notebook" && notebookId) {
        const nbObj = updated.notebooks.find(n => n.id === notebookId);
        if (nbObj) nbObj.ai = { messages: finalMessages };
      } else if (type === "teses") {
        updated.tesesChat = { messages: finalMessages };
      } else if (type === "sumulas") {
        updated.sumulasChat = { messages: finalMessages };
      }

      setAppData(updated);
      persistData(updated);

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: "model", text: `⚠ Erro ao obter resposta do Gemini: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const parseMarkdownBold = (text: string) => {
    // Elegant regex mapping of simple **bold**, *italic*, `code` without installing bulky external deps
    const cleanEscaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return cleanEscaped
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code class='bg-neutral-100 rounded px-1 text-xs font-mono border text-neutral-800'>$1</code>");
  };

  return (
    <div className="flex flex-col h-[74vh] select-text">
      {/* Scope alert */}
      <div className="text-xs text-[#5c4a38] italic bg-[#efe2c7]/20 border border-[#8a7a5c]/20 p-2.5 rounded-xl mb-3 flex items-center justify-between select-none">
        <div>
          {type === "notebook" ? (
            <span>O Gemini lê a doutrina escrita e jurisprudência vinculada a este caderno físico.</span>
          ) : (
            <span>O Gemini se orienta pelo seu repositório local e busca o site oficial do STF/STJ.</span>
          )}
        </div>
        <label className="flex items-center gap-1.5 shrink-0 ml-3">
          <input type="checkbox" checked={useGrounding} onChange={e => setUseGrounding(e.target.checked)} />
          <span className="font-semibold text-neutral-700">Grounding Web Search 🌐</span>
        </label>
      </div>

      {/* Messages listing */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4" id="aiScrollArea">
        {messages.length === 0 ? (
          <div className="p-4 bg-white/60 border rounded-2xl text-xs text-neutral-500 leading-relaxed font-serif italic text-justify select-none">
            ✨ Olá! Sou o assistente de inteligência artificial Codex programado com o Gemini. Posso decifrar teses e acórdãos complexos, formular debates doutrinários, estruturar tópicos ágeis ou criar simulados com base no edital. Como posso te auxiliar nos estudos hoje?
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`p-3 md:p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-[#7b1e1e] text-[#fbeede] rounded-br-sm font-sans" : "bg-white border rounded-bl-sm font-serif text-neutral-800 text-justify border-neutral-300"
                }`}
                dangerouslySetInnerHTML={{ __html: m.role === "user" ? m.text : parseMarkdownBold(m.text) }}
              />
              
              {/* Citations / sources grounded links */}
              {m.role === "model" && m.sources && (
                <div className="mt-1 px-1 flex flex-wrap gap-1.5 text-[11px] font-medium text-neutral-500 select-none">
                  <span>Grounding:</span>
                  {m.sources.map((s, sIdx) => (
                    <a key={sIdx} href={s.uri} target="_blank" rel="noopener" className="text-[#1c4f8b] hover:underline inline-flex items-center gap-0.5">
                      [{sIdx + 1}] {s.title.slice(0, 30)}{s.title.length > 30 ? "..." : ""} <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              )}

              {/* Conversion helper */}
              {m.role === "model" && !m.text.includes("⚠ Erro") && (
                <button className="text-[10px] uppercase font-bold text-[#b8860b] hover:text-[#8a6608] mt-1 pr-1 active:scale-95 transition-transform" onClick={() => handleSaveAsPrecedent(m.text)}>
                  📁 Salvar como tese em meu repositório
                </button>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel */}
      <div className="flex gap-2 select-none">
        <button className="p-2 border rounded-xl hover:bg-neutral-50" title="Apagar histórico" onClick={handleClear}>
          <RotateCcw size={16} className="text-neutral-500" />
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isLoading}
          placeholder={isLoading ? "IA processando jurisprudência..." : "Faça uma pergunta jurídica para a IA..."}
          className="flex-1 px-3 py-2 border rounded-xl text-xs h-[45px] resize-none outline-none focus:ring-1 focus:ring-[#7b1e1e]/60 focus:border-[#7b1e1e]/60 bg-white bg-opacity-90"
        />
        <button className="px-4 bg-[#7b1e1e] hover:bg-[#5a1414] text-white rounded-xl shadow-md flex items-center justify-center disabled:opacity-50" onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? <span className="animate-spin text-sm">⏳</span> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}
