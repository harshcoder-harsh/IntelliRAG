import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, Upload, FileText, Bot, User, Loader2, File, Trash2, X, LayoutDashboard, SplitSquareHorizontal, Globe, Download, Menu, ChevronLeft, CheckCircle2, BarChart3, Database, MessageSquare, Zap, Clock, Search, Sparkles, ArrowRight, Plus, Image as ImageIcon, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'compare'>('chat');
  const [isWebSearchMode, setIsWebSearchMode] = useState(false);
  const [compareFile1, setCompareFile1] = useState<string | null>(null);
  const [compareFile2, setCompareFile2] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/upload/documents`);
      const data = await response.json();
      setDocuments(data.documents);
      setFiles(data.documents.map((d: any) => d.filename));
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      let url = `${API_URL}/chat/history`;
      if (selectedFile) {
        url += `?file=${encodeURIComponent(selectedFile)}`;
      }
      const response = await axios.get(url);
      if (response.data.history && response.data.history.length > 0) {
        setMessages(response.data.history);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchFiles();
    const storedUser = localStorage.getItem('user');
    if (storedUser) setCurrentUser(storedUser);
    
    // Desktop: sidebar open by default
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    window.location.href = '/signin';
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedFile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, streamingContent]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleCompare = async () => {
    if (!compareFile1 || !compareFile2) return;
    setIsComparing(true);
    setCompareResult('');

    try {
      const response = await fetch(`${API_URL}/chat/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file1: compareFile1, file2: compareFile2 }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let fullContent = '';

      if (reader) {
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            setCompareResult(fullContent);
          }
        }
      }
    } catch (error) {
      console.error('Error comparing:', error);
      setCompareResult('Error generating comparison.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleExport = (format: 'txt' | 'pdf') => {
    if (format === 'txt') {
      let content = `IntelliRAG Chat Export\n`;
      content += `Date: ${new Date().toLocaleString()}\n`;
      content += `Mode: ${isWebSearchMode ? 'Web Search' : (selectedFile || 'General Knowledge Base')}\n\n`;
      content += `--------------------------------------------------\n\n`;
      
      messages.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'IntelliRAG';
        content += `${role}:\n${msg.content}\n\n`;
      });
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IntelliRAG_Chat_${isWebSearchMode ? 'Web' : (selectedFile || 'General')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      
      let html = `
        <html>
          <head>
            <title>IntelliRAG Chat Export</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0 auto; padding: 20px; color: #111827; }
              h1 { color: #7C3AED; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
              .user { background-color: #f3f4f6; border-left: 4px solid #9ca3af; }
              .assistant { background-color: #f5f3ff; border-left: 4px solid #7C3AED; }
              .role { font-weight: bold; margin-bottom: 5px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.05em; }
              .user .role { color: #6b7280; }
              .assistant .role { color: #7C3AED; }
              pre { background: #1f2937; color: #f9fafb; padding: 10px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
              code { font-family: monospace; }
              .meta { color: #6b7280; font-size: 0.9em; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>IntelliRAG Chat Export</h1>
            <div class="meta">
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Mode:</strong> ${isWebSearchMode ? 'Web Search' : (selectedFile || 'General Knowledge Base')}</p>
            </div>
      `;
      
      messages.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'IntelliRAG';
        const cssClass = msg.role === 'user' ? 'user' : 'assistant';
        const formattedContent = msg.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
          
        html += `
          <div class="message ${cssClass}">
            <div class="role">${role}</div>
            <div style="white-space: pre-wrap;">${formattedContent}</div>
          </div>
        `;
      });
      
      html += `
          </body>
        </html>
      `;
      
      doc.open();
      doc.write(html);
      doc.close();
      
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    }
  };

  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent | { preventDefault: () => void }, customQuery?: string) => {
    e.preventDefault();
    const queryToUse = customQuery || input.trim();
    if (!queryToUse || isLoading || isStreaming) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    setMessages(prev => [...prev, { role: 'user', content: queryToUse }]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
      
      const payload = {
        message: queryToUse,
        history: history,
        selected_file: selectedFile,
        web_search: isWebSearchMode
      };
      
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      setIsLoading(false);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let fullContent = '';

      if (reader) {
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            setStreamingContent(fullContent);
          }
        }
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: fullContent,
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
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const processFiles = async (selectedFiles: FileList | File[]) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    let hasLargeFile = false;
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      if (selectedFiles[i].size > 5 * 1024 * 1024) { // 5MB
        hasLargeFile = true;
      }
      formData.append('files', selectedFiles[i]);
    }

    if (hasLargeFile) {
      alert("You selected a large file (>5MB). Processing this locally on your CPU may take several minutes. Please be patient while it says 'Processing...'.");
    }

    setIsUploading(true);
    setUploadSuccess(false);
    try {
      await axios.post(`${API_URL}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchFiles();
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteFile = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/upload/files/${filename}`);
      if (selectedFile === filename) setSelectedFile(null);
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase();
    if (ext.endsWith('.pdf')) return <FileText className="w-4 h-4 text-red-400" />;
    if (ext.endsWith('.csv')) return <LayoutDashboard className="w-4 h-4 text-emerald-400" />;
    if (ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return <ImageIcon className="w-4 h-4 text-purple-400" />;
    return <File className="w-4 h-4 text-[#3B82F6]" />;
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#07090F] text-gray-900 dark:text-[#F8FAFC] font-sans selection:bg-[#7C3AED]/30 overflow-hidden relative">
      
      {/* Background Grain & Radial Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gray-50 dark:bg-[#07090F]" />
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[50%] opacity-20 mix-blend-screen pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#7C3AED]/40 via-transparent to-transparent blur-[80px] animate-pulse" style={{ animationDuration: '8s' }} />
        </div>
        <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] opacity-10 mix-blend-screen pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#3B82F6]/40 via-transparent to-transparent blur-[80px]" />
        </div>
        <svg className="absolute inset-0 w-full h-full opacity-[0.025] mix-blend-overlay pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div 
        className={`fixed md:relative inset-y-0 left-0 z-50 w-[280px] bg-gray-50/60 dark:bg-[#07090F]/60 backdrop-blur-2xl border-r border-gray-200 dark:border-white/[0.04] shadow-[4px_0_24px_rgba(0,0,0,0.2)] flex flex-col shrink-0 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center shadow-lg shadow-[#7C3AED]/20 border border-black/10 dark:border-white/10">
              <Bot className="w-4 h-4 text-gray-900 dark:text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[17px] tracking-tight text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-[#94A3B8]">IntelliRAG</h1>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar space-y-8">
          {/* Navigation Links */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider mb-3">Menu</p>
            <button 
              onClick={() => { setActiveTab('chat'); setIsWebSearchMode(false); if(window.innerWidth<768) setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'chat' && !isWebSearchMode ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 shadow-[inset_0_0_20px_rgba(124,58,237,0.05)]' : 'text-gray-500 dark:text-[#94A3B8] hover:bg-black/5 dark:bg-white/5 hover:text-gray-900 dark:text-[#F8FAFC] border border-transparent'}`}
            >
              <MessageSquare className={`w-4 h-4 ${activeTab === 'chat' && !isWebSearchMode ? 'text-[#7C3AED]' : 'group-hover:text-gray-900 dark:text-[#F8FAFC]'}`} />
              <span className="text-sm font-medium">Chat with Docs</span>
              {activeTab === 'chat' && !isWebSearchMode && (
                <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('chat'); setIsWebSearchMode(true); if(window.innerWidth<768) setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'chat' && isWebSearchMode ? 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]' : 'text-gray-500 dark:text-[#94A3B8] hover:bg-black/5 dark:bg-white/5 hover:text-gray-900 dark:text-[#F8FAFC] border border-transparent'}`}
            >
              <Globe className={`w-4 h-4 ${activeTab === 'chat' && isWebSearchMode ? 'text-[#3B82F6]' : 'group-hover:text-gray-900 dark:text-[#F8FAFC]'}`} />
              <span className="text-sm font-medium">Web Search</span>
              {activeTab === 'chat' && isWebSearchMode && (
                <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('dashboard'); if(window.innerWidth<768) setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'dashboard' ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 shadow-[inset_0_0_20px_rgba(124,58,237,0.05)]' : 'text-gray-500 dark:text-[#94A3B8] hover:bg-black/5 dark:bg-white/5 hover:text-gray-900 dark:text-[#F8FAFC] border border-transparent'}`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-[#7C3AED]' : 'group-hover:text-gray-900 dark:text-[#F8FAFC]'}`} />
              <span className="text-sm font-medium">Dashboard</span>
              {activeTab === 'dashboard' && (
                <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('compare'); if(window.innerWidth<768) setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'compare' ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 shadow-[inset_0_0_20px_rgba(124,58,237,0.05)]' : 'text-gray-500 dark:text-[#94A3B8] hover:bg-black/5 dark:bg-white/5 hover:text-gray-900 dark:text-[#F8FAFC] border border-transparent'}`}
            >
              <SplitSquareHorizontal className={`w-4 h-4 ${activeTab === 'compare' ? 'text-[#7C3AED]' : 'group-hover:text-gray-900 dark:text-[#F8FAFC]'}`} />
              <span className="text-sm font-medium">Compare Docs</span>
              {activeTab === 'compare' && (
                <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
              )}
            </button>
          </div>

          <div>
            <p className="px-3 text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider mb-3">Knowledge Base</p>
            
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-28 border border-dashed rounded-2xl cursor-pointer transition-all duration-300 group relative overflow-hidden mb-4
                ${isDragging ? 'border-[#7C3AED] bg-[#7C3AED]/10 scale-[1.02]' : 'border-gray-300 dark:border-[#ffffff1a] bg-white dark:bg-[#111827] hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5'}
                ${uploadSuccess ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
              `}
            >
              <AnimatePresence mode="wait">
                {isUploading ? (
                  <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 text-[#7C3AED]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[13px] font-medium">Processing...</span>
                  </motion.div>
                ) : uploadSuccess ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[13px] font-medium">Uploaded!</span>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-gray-500 dark:text-[#94A3B8] group-hover:text-[#7C3AED] transition-colors">
                    <div className="p-2 bg-black/5 dark:bg-white/5 rounded-xl group-hover:bg-[#7C3AED]/20 transition-all duration-300 border border-black/10 dark:border-white/5 group-hover:border-[#7C3AED]/30">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                      <span className="text-[13px] font-medium block text-gray-900 dark:text-[#F8FAFC] group-hover:text-[#7C3AED]">Drop files here</span>
                      <span className="text-[10px] text-gray-500 dark:text-[#94A3B8]">PDF, DOCX, TXT, CSV, PNG, JPG</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg" disabled={isUploading} />
            </label>

            <div className="space-y-1 px-1">
              <AnimatePresence>
                {files.map((file, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={file}
                    onClick={() => setSelectedFile(file === selectedFile ? null : file)}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all group cursor-pointer ${
                      file === selectedFile 
                        ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 shadow-[0_0_15px_rgba(124,58,237,0.05)]' 
                        : 'bg-transparent border-transparent hover:bg-white dark:bg-[#111827]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`p-1.5 rounded-lg ${file === selectedFile ? 'bg-[#7C3AED]/20' : 'bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:bg-white/10'} transition-colors`}>
                        {getFileIcon(file)}
                      </div>
                      <span className={`text-[13px] truncate font-medium transition-colors ${file === selectedFile ? 'text-[#7C3AED]' : 'text-gray-500 dark:text-[#94A3B8] group-hover:text-gray-900 dark:text-[#F8FAFC]'}`}>
                        {file}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteFile(file, e)}
                      className="p-1.5 text-gray-500 dark:text-[#94A3B8] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {files.length === 0 && !isUploading && (
                <div className="text-center p-4 border border-dashed border-gray-300 dark:border-[#ffffff1a] rounded-xl bg-white dark:bg-[#111827]">
                  <p className="text-[12px] text-gray-500 dark:text-[#94A3B8]">No documents yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200 dark:border-white/[0.04] bg-transparent">
          {currentUser ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 w-full p-2 bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-[#ffffff0f] hover:border-gray-300 dark:border-[#ffffff1a] transition-colors cursor-pointer group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center shadow-inner">
                  <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{currentUser.charAt(0)}</span>
                </div>
                <div className="text-left flex-1 overflow-hidden">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-[#F8FAFC] truncate">{currentUser}</p>
                  <p className="text-[11px] text-gray-500 dark:text-[#94A3B8]">Workspace</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="text-[12px] font-medium text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white text-center transition-colors py-1.5 hover:bg-black/5 dark:bg-white/5 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/signin" className="flex items-center gap-3 w-full p-2 bg-white dark:bg-[#111827] rounded-xl transition-all border border-gray-200 dark:border-[#ffffff0f] hover:border-gray-300 dark:border-[#ffffff1a] group">
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:bg-white/10 transition-colors">
                <User className="w-4 h-4 text-gray-500 dark:text-[#94A3B8] group-hover:text-gray-900 dark:text-[#F8FAFC]" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[13px] font-medium text-gray-900 dark:text-[#F8FAFC]">Sign In</p>
                <p className="text-[11px] text-gray-500 dark:text-[#94A3B8]">Sync your workspace</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-200 dark:border-white/[0.04] flex items-center justify-between px-4 sm:px-6 bg-gray-50/40 dark:bg-[#07090F]/40 backdrop-blur-2xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white dark:bg-[#111827] rounded-xl transition-colors text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="h-5 w-px bg-black/10 dark:bg-white/10 mx-1 hidden sm:block"></div>
            <div className={`hidden sm:flex w-8 h-8 rounded-xl items-center justify-center border ${activeTab === 'chat' && isWebSearchMode ? 'bg-[#3B82F6]/10 border-[#3B82F6]/20' : 'bg-[#7C3AED]/10 border-[#7C3AED]/20'}`}>
              {activeTab === 'chat' && !isWebSearchMode && <MessageSquare className="w-4 h-4 text-[#7C3AED]" />}
              {activeTab === 'chat' && isWebSearchMode && <Globe className="w-4 h-4 text-[#3B82F6]" />}
              {activeTab === 'dashboard' && <LayoutDashboard className="w-4 h-4 text-[#7C3AED]" />}
              {activeTab === 'compare' && <SplitSquareHorizontal className="w-4 h-4 text-[#7C3AED]" />}
            </div>
            <h2 className="font-semibold text-[15px] text-gray-900 dark:text-[#F8FAFC] hidden sm:block">
              {activeTab === 'chat' && !isWebSearchMode && 'IntelliRAG Assistant'}
              {activeTab === 'chat' && isWebSearchMode && 'Web Search Assistant'}
              {activeTab === 'dashboard' && 'Document Dashboard'}
              {activeTab === 'compare' && 'Compare Documents'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.04] rounded-full text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:hover:text-white transition-colors shadow-sm"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="hidden lg:flex items-center gap-3 mr-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] shadow-inner">
                <Database className="w-3 h-3 text-gray-500 dark:text-[#94A3B8]" />
                <span className="text-[11px] font-medium text-gray-500 dark:text-[#94A3B8]">{documents.length} Docs Loaded</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-400">AI Ready</span>
              </div>
            </div>
            
            {activeTab === 'chat' && selectedFile && !isWebSearchMode && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#7C3AED]/10 rounded-full border border-[#7C3AED]/20">
                <Database className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span className="text-[13px] font-medium text-[#7C3AED] truncate max-w-[150px]">{selectedFile}</span>
                <button onClick={() => setSelectedFile(null)} className="ml-1 p-0.5 hover:bg-[#7C3AED]/20 rounded-full transition-colors text-[#7C3AED]/70 hover:text-[#7C3AED]">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
            
            {activeTab === 'chat' && messages.length > 0 && (
              <div className="flex items-center gap-2 bg-white dark:bg-[#111827] p-1 rounded-full border border-gray-200 dark:border-[#ffffff0f] shadow-sm">
                <button onClick={() => handleExport('txt')} className="px-4 py-1.5 hover:bg-black/5 dark:bg-white/5 text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-[#F8FAFC] text-[12px] font-medium rounded-full transition-colors flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> TXT
                </button>
                <button onClick={() => handleExport('pdf')} className="px-4 py-1.5 hover:bg-black/5 dark:bg-white/5 text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-[#F8FAFC] text-[12px] font-medium rounded-full transition-colors flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-gray-50 dark:bg-[#07090F]">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-[#F8FAFC] tracking-tight mb-2">Overview</h1>
                  <p className="text-gray-500 dark:text-[#94A3B8] text-[15px]">Analyze and manage your knowledge base.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="px-5 py-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#ffffff0f] rounded-2xl flex items-center gap-4 shadow-lg shadow-black/20">
                    <div className="p-3 bg-[#7C3AED]/10 rounded-xl border border-[#7C3AED]/20"><Database className="w-5 h-5 text-[#7C3AED]" /></div>
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-[#94A3B8] font-bold uppercase tracking-wider mb-1">Total Docs</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-[#F8FAFC] leading-none">{documents.length}</p>
                    </div>
                  </div>
                  <div className="px-5 py-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#ffffff0f] rounded-2xl flex items-center gap-4 shadow-lg shadow-black/20">
                    <div className="p-3 bg-[#3B82F6]/10 rounded-xl border border-[#3B82F6]/20"><BarChart3 className="w-5 h-5 text-[#3B82F6]" /></div>
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-[#94A3B8] font-bold uppercase tracking-wider mb-1">Total Chats</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-[#F8FAFC] leading-none">{messages.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {documents.map((doc, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.05 }}
                    key={doc.filename} 
                    className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#ffffff0f] hover:border-[#7C3AED]/40 hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)] transition-all duration-300 group flex flex-col relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#ffffff0f] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        {getFileIcon(doc.filename)}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="font-semibold text-[16px] text-gray-900 dark:text-[#F8FAFC] truncate">{doc.filename}</h3>
                        <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1 flex items-center gap-1">
                           <Clock className="w-3 h-3" /> {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 mb-6">
                      <p className="text-[14px] text-gray-500 dark:text-[#94A3B8] leading-relaxed line-clamp-3 group-hover:text-gray-600 dark:text-zinc-300 transition-colors">
                        {doc.summary || "No summary available. Chat with this document to generate insights."}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedFile(doc.filename);
                        setActiveTab('chat');
                      }}
                      className="w-full py-3 bg-white dark:bg-[#0F172A] hover:bg-[#7C3AED] text-gray-900 dark:text-[#F8FAFC] text-[13px] font-medium rounded-xl border border-gray-200 dark:border-[#ffffff0f] hover:border-transparent transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                    >
                      Analyze Document <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                ))}
                {documents.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-300 dark:border-[#ffffff1a] rounded-3xl bg-gray-100 dark:bg-[#111827]/50">
                    <div className="w-20 h-20 bg-white dark:bg-[#0F172A] rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-gray-200 dark:border-[#ffffff0f]">
                       <Database className="w-10 h-10 text-gray-500 dark:text-[#94A3B8]" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-[#F8FAFC] mb-2">Knowledge Base Empty</h3>
                    <p className="text-[15px] text-gray-500 dark:text-[#94A3B8] max-w-md text-center">Upload documents from the sidebar to generate AI summaries and start chatting with your data.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compare Tab */}
        {activeTab === 'compare' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#07090F]">
            <div className="p-6 md:p-8 border-b border-gray-200 dark:border-[#ffffff0f] bg-white dark:bg-[#0F172A] backdrop-blur-sm z-10 shadow-xl">
              <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider ml-1">Document A</label>
                  <div className="relative">
                    <select 
                      value={compareFile1 || ''} 
                      onChange={e => setCompareFile1(e.target.value)}
                      className="w-full bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#ffffff1a] hover:border-[#7C3AED]/50 text-gray-900 dark:text-[#F8FAFC] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 transition-all text-[15px] shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">Select a document...</option>
                      {files.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-[#94A3B8]">
                      <ChevronLeft className="w-4 h-4 -rotate-90" />
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex items-center justify-center w-14 h-14 mb-1 rounded-2xl bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#ffffff1a] shrink-0 shadow-inner">
                  <span className="text-[13px] font-bold text-[#7C3AED]">VS</span>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider ml-1">Document B</label>
                  <div className="relative">
                    <select 
                      value={compareFile2 || ''} 
                      onChange={e => setCompareFile2(e.target.value)}
                      className="w-full bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#ffffff1a] hover:border-[#7C3AED]/50 text-gray-900 dark:text-[#F8FAFC] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 transition-all text-[15px] shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">Select a document...</option>
                      {files.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-[#94A3B8]">
                      <ChevronLeft className="w-4 h-4 -rotate-90" />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleCompare}
                  disabled={!compareFile1 || !compareFile2 || isComparing}
                  className="w-full md:w-auto px-8 py-3.5 bg-[#F8FAFC] hover:bg-white text-[#07090F] rounded-2xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-0.5 shadow-lg shadow-black/5 dark:shadow-white/10 flex items-center justify-center gap-2 text-[15px]"
                >
                  {isComparing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Compare</>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white dark:from-[#0F172A] via-gray-50 dark:via-[#07090F] to-gray-50 dark:to-[#07090F]">
              {compareResult ? (
                <div className="max-w-5xl mx-auto p-8 md:p-12 rounded-3xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#ffffff0f] shadow-2xl shadow-black/40 backdrop-blur-sm">
                  <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-[16px] prose-p:text-gray-500 dark:text-[#94A3B8] prose-headings:text-gray-900 dark:text-[#F8FAFC] prose-pre:bg-white dark:bg-[#0F172A] prose-pre:border prose-pre:border-gray-200 dark:border-[#ffffff0f] prose-li:text-gray-500 dark:text-[#94A3B8] prose-strong:text-gray-900 dark:text-[#F8FAFC]">
                    <ReactMarkdown>{compareResult}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-[#94A3B8] opacity-80 max-w-md mx-auto text-center">
                  <div className="w-24 h-24 bg-white dark:bg-[#111827] rounded-full flex items-center justify-center mb-8 border border-gray-200 dark:border-[#ffffff0f] shadow-inner">
                    <SplitSquareHorizontal className="w-10 h-10 text-[#7C3AED]" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-[#F8FAFC] mb-3 tracking-tight">Document Comparison</h3>
                  <p className="text-[16px] leading-relaxed">Select two different documents from your knowledge base to generate a comprehensive side-by-side analysis using AI.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat / Web Search Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col relative bg-transparent">
            
            {messages.length === 0 && !isLoading && !isStreaming ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-700">
                <div className="w-24 h-24 mb-8 relative">
                  <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${isWebSearchMode ? 'bg-[#3B82F6]' : 'bg-[#7C3AED]'}`} />
                  <div className={`relative w-full h-full bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#ffffff1a] rounded-3xl shadow-2xl flex items-center justify-center ${isWebSearchMode ? 'text-[#3B82F6]' : 'text-[#7C3AED]'}`}>
                     {isWebSearchMode ? <Globe className="w-10 h-10" /> : <Database className="w-10 h-10" />}
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-[#F8FAFC] mb-4 tracking-tight">
                  {isWebSearchMode ? 'Search the Web' : 'Chat with your Knowledge Base'}
                </h2>
                <p className="text-gray-500 dark:text-[#94A3B8] text-[16px] max-w-md leading-relaxed mb-10">
                  {isWebSearchMode 
                    ? 'Ask any question and I will search the internet to find the most accurate and up-to-date information for you.' 
                    : 'Upload documents, reports, and data. Ask questions and get instant, accurate answers backed by your files.'}
                </p>
                
                {isWebSearchMode && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                    {["What are the latest AI breakthroughs?", "Summarize today's top tech news.", "How does quantum computing work?", "What is the current stock price of Apple?"].map((suggestion, i) => (
                      <button 
                        key={i}
                        onClick={(e) => handleSendMessage(e, suggestion)}
                        className="p-4 text-left rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#ffffff0f] hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/5 transition-all duration-300 text-[14px] text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-[#F8FAFC]"
                      >
                        <Search className="w-4 h-4 text-[#3B82F6] mb-2" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 custom-scrollbar scroll-smooth">
                <div className="max-w-[760px] mx-auto space-y-6 pb-10">
                  {messages.map((msg, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.05 }}
                      key={idx}
                      className={`flex gap-4 sm:gap-6 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${
                          isWebSearchMode 
                            ? 'bg-white dark:bg-[#111827] border-[#3B82F6]/30 text-[#3B82F6] shadow-[#3B82F6]/10'
                            : 'bg-white dark:bg-[#111827] border-[#7C3AED]/30 text-[#7C3AED] shadow-[#7C3AED]/10'
                        }`}>
                          {isWebSearchMode ? <Globe className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                      )}
                      
                      <div className={`max-w-[85%] sm:max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-5 py-4 sm:px-6 sm:py-5 rounded-3xl shadow-2xl ${
                          msg.role === 'user' 
                            ? 'bg-white dark:bg-[#111827] text-gray-900 dark:text-[#F8FAFC] rounded-tr-sm border border-gray-200 dark:border-white/[0.04]' 
                            : 'bg-white/60 dark:bg-[#0F172A]/60 border border-gray-300 dark:border-white/[0.08] shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-gray-900 dark:text-[#F8FAFC] rounded-tl-sm backdrop-blur-2xl'
                        }`}>
                          {msg.role === 'assistant' ? (
                            <div className={`prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-[15px] prose-p:text-gray-600 dark:prose-p:text-zinc-300 prose-headings:text-gray-900 dark:prose-headings:text-zinc-100 prose-pre:bg-gray-50 dark:prose-pre:bg-[#07090F]/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-white/[0.04] prose-li:text-gray-600 dark:prose-li:text-zinc-300 prose-strong:text-gray-900 dark:prose-strong:text-zinc-100 ${isWebSearchMode ? 'prose-a:text-[#3B82F6]' : 'prose-a:text-[#7C3AED]'}`}>
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 sm:gap-6 justify-start w-full">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${isWebSearchMode ? 'bg-white dark:bg-[#111827] border-[#3B82F6]/30 text-[#3B82F6] shadow-[#3B82F6]/10' : 'bg-white dark:bg-[#111827] border-[#7C3AED]/30 text-[#7C3AED] shadow-[#7C3AED]/10'}`}>
                        {isWebSearchMode ? <Globe className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </div>
                      <div className="bg-white/60 dark:bg-[#0F172A]/60 border border-gray-300 dark:border-white/[0.08] shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-3xl rounded-tl-sm px-6 py-5 backdrop-blur-2xl flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <span className={`w-2 h-2 rounded-full animate-bounce ${isWebSearchMode ? 'bg-[#3B82F6]' : 'bg-[#7C3AED]'}`} style={{ animationDelay: '0ms' }} />
                          <span className={`w-2 h-2 rounded-full animate-bounce ${isWebSearchMode ? 'bg-[#3B82F6]' : 'bg-[#7C3AED]'}`} style={{ animationDelay: '150ms' }} />
                          <span className={`w-2 h-2 rounded-full animate-bounce ${isWebSearchMode ? 'bg-[#3B82F6]' : 'bg-[#7C3AED]'}`} style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[14px] font-medium text-gray-500 dark:text-[#94A3B8] ml-2">Thinking...</span>
                      </div>
                    </motion.div>
                  )}

                  {isStreaming && streamingContent && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 sm:gap-6 justify-start w-full">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${isWebSearchMode ? 'bg-white dark:bg-[#111827] border-[#3B82F6]/30 text-[#3B82F6] shadow-[#3B82F6]/10' : 'bg-white dark:bg-[#111827] border-[#7C3AED]/30 text-[#7C3AED] shadow-[#7C3AED]/10'}`}>
                        {isWebSearchMode ? <Globe className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </div>
                      
                      <div className="max-w-[85%] sm:max-w-[85%] flex flex-col gap-2 items-start">
                        <div className="px-5 py-4 sm:px-6 sm:py-5 rounded-3xl bg-white/60 dark:bg-[#0F172A]/60 border border-gray-300 dark:border-white/[0.08] shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-gray-900 dark:text-[#F8FAFC] rounded-tl-sm backdrop-blur-2xl">
                          <div className={`prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-[15px] prose-p:text-gray-600 dark:prose-p:text-zinc-300 prose-headings:text-gray-900 dark:prose-headings:text-zinc-100 prose-pre:bg-gray-50 dark:prose-pre:bg-[#07090F]/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-white/[0.04] prose-li:text-gray-600 dark:prose-li:text-zinc-300 prose-strong:text-gray-900 dark:prose-strong:text-zinc-100 relative flex items-end ${isWebSearchMode ? 'prose-a:text-[#3B82F6]' : 'prose-a:text-[#7C3AED]'}`}>
                            <ReactMarkdown>{streamingContent}</ReactMarkdown>
                            <span className={`inline-block w-2 h-4 ml-1 animate-pulse rounded-sm ${isWebSearchMode ? 'bg-[#3B82F6]' : 'bg-[#7C3AED]'}`}></span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 sm:p-6 bg-gradient-to-t from-gray-50 dark:from-[#07090F] via-gray-50 dark:via-[#07090F] to-transparent pt-12 relative z-20">
              <div className="max-w-[760px] mx-auto">
                <form onSubmit={handleSendMessage} className="relative group">
                  <div className={`absolute -inset-1 bg-gradient-to-r rounded-[32px] blur-lg opacity-20 group-focus-within:opacity-50 transition duration-700 ${isWebSearchMode ? 'from-[#3B82F6] to-teal-500' : 'from-[#7C3AED] to-[#3B82F6]'}`} />
                  <div className={`relative flex items-end bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border rounded-[28px] shadow-2xl overflow-hidden transition-all duration-300 ${isWebSearchMode ? 'border-gray-300 dark:border-white/[0.06] focus-within:border-[#3B82F6]/60 focus-within:shadow-[0_0_40px_rgba(59,130,246,0.2)]' : 'border-gray-300 dark:border-white/[0.06] focus-within:border-[#7C3AED]/60 focus-within:shadow-[0_0_40px_rgba(124,58,237,0.2)]'}`}>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      placeholder={isWebSearchMode ? "Search the web..." : (selectedFile ? `Ask about ${selectedFile}...` : "Ask anything...")}
                      className="flex-1 bg-transparent border-none outline-none py-5 pl-6 pr-4 text-[15px] text-gray-900 dark:text-[#F8FAFC] placeholder-[#94A3B8] resize-none max-h-[200px] custom-scrollbar"
                      disabled={isLoading}
                      rows={1}
                      style={{ minHeight: '64px' }}
                    />
                    <div className="pr-3 pb-3 shrink-0">
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className={`w-10 h-10 flex items-center justify-center disabled:bg-black/[0.03] dark:bg-white/[0.03] disabled:text-gray-500 dark:text-[#94A3B8] text-[#07090F] rounded-2xl transition-all duration-300 active:scale-95 ${isWebSearchMode ? 'bg-[#F8FAFC] hover:bg-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-[#F8FAFC] hover:bg-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
                      >
                        {isLoading || isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
