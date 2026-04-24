import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, Bot, User, Loader2, File, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am IntelliRAG, your intelligent document assistant. Upload some documents and ask me anything about them.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/upload/files`);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/history`);
      if (response.data.history && response.data.history.length > 0) {
        setMessages(response.data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // In a real app, you would pass previous history.
      // Here we just pass the current query to keep it simple.
      const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
      
      const response = await axios.post(`${API_URL}/chat/`, {
        message: userMessage,
        history: history
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.answer,
          citations: response.data.citations
        }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }

    setIsUploading(true);
    try {
      await axios.post(`${API_URL}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteFile = async (filename: string) => {
    try {
      await axios.delete(`${API_URL}/upload/files/${filename}`);
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-800 bg-zinc-900/50 flex flex-col shadow-2xl z-10 relative">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">IntelliRAG</h1>
            <p className="text-xs text-zinc-400 font-medium">AI Document Assistant</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="mb-8">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Knowledge Base
            </h2>
            
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-700/50 rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 group relative overflow-hidden">
              {isUploading ? (
                <div className="flex flex-col items-center gap-3 text-indigo-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-medium">Processing...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-zinc-400 group-hover:text-indigo-400 transition-colors">
                  <div className="p-3 bg-zinc-800/50 rounded-full group-hover:bg-indigo-500/10 transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold block mb-1">Upload Documents</span>
                    <span className="text-xs text-zinc-500">PDF, DOCX, TXT</span>
                  </div>
                </div>
              )}
              <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt" disabled={isUploading} />
            </label>
          </div>

          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
              Uploaded Files ({files.length})
            </h2>
            <div className="space-y-2">
              <AnimatePresence>
                {files.map((file, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    key={file}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <File className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="text-sm text-zinc-300 truncate font-medium">{file}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {files.length === 0 && !isUploading && (
                <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                  <p className="text-sm text-zinc-500">No documents uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((msg, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx}
                className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-zinc-800 text-zinc-300' 
                    : 'bg-indigo-600 text-white shadow-indigo-500/20'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                
                <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-5 rounded-3xl ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm' 
                      : 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-300 rounded-tl-sm backdrop-blur-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[15px] leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                  
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.citations.map((cite, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                          <FileText className="w-3 h-3" />
                          {cite}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-3xl rounded-tl-sm p-5 backdrop-blur-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-10">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
              <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your documents..."
                  className="flex-1 bg-transparent border-none outline-none py-5 pl-6 pr-4 text-[15px] text-zinc-100 placeholder-zinc-500"
                  disabled={isLoading}
                />
                <div className="pr-3">
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-2xl transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                </div>
              </div>
            </form>
            <p className="text-center text-xs text-zinc-600 mt-4 font-medium">
              IntelliRAG uses advanced AI models. Responses may vary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
