import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

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
      let url = `${API_URL}/chat/history`;
      if (selectedFile) {
        url += `?file=${encodeURIComponent(selectedFile)}`;
      }
      const response = await axios.get(url);
      if (response.data.history && response.data.history.length > 0) {
        setMessages(response.data.history);
      } else {
        setMessages([{ role: 'assistant', content: 'Hello! I am IntelliRAG, your intelligent document assistant. Upload some documents and ask me anything about them.' }]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
    const storedUser = localStorage.getItem('user');
    if (storedUser) setCurrentUser(storedUser);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // In a real app, you would pass previous history.
      // Here we just pass the current query to keep it simple.
      const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
      
      const payload = {
        message: userMessage,
        history: history,
        selected_file: selectedFile
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

      setIsLoading(false); // Stop loading animation, start streaming

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
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

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-800 bg-zinc-900/50 flex flex-col shadow-2xl z-10 relative">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">IntelliRAG</h1>
              <p className="text-xs text-zinc-400 font-medium">AI Document Assistant</p>
            </div>
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
                    <span className="text-xs text-zinc-500">PDF, DOCX, TXT, CSV</span>
                  </div>
                </div>
              )}
              <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt,.csv" disabled={isUploading} />
            </label>
          </div>

          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Uploaded Files ({files.length})</span>
              {selectedFile && (
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 normal-case"
                >
                  Clear Selection
                </button>
              )}
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
                    onClick={() => setSelectedFile(file === selectedFile ? null : file)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all group cursor-pointer ${
                      file === selectedFile 
                        ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                        : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <File className={`w-4 h-4 shrink-0 transition-colors ${file === selectedFile ? 'text-indigo-400' : 'text-zinc-400'}`} />
                      <span className={`text-sm truncate font-medium transition-colors ${file === selectedFile ? 'text-indigo-200' : 'text-zinc-300'}`}>
                        {file}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteFile(file, e)}
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

        {/* User Section */}
          <div className="p-4 border-t border-zinc-800">
            {currentUser ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 w-full p-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white uppercase">{currentUser.charAt(0)}</span>
                  </div>
                  <div className="text-left flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{currentUser}</p>
                    <p className="text-xs text-zinc-400">Pro Plan</p>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="text-xs font-medium text-zinc-500 hover:text-red-400 text-center transition-colors py-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to="/signin" className="flex items-center gap-3 w-full p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">Sign In</p>
                  <p className="text-xs text-zinc-500">Sync your chats</p>
                </div>
              </Link>
            )}
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
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-3xl rounded-tl-sm p-5 backdrop-blur-sm flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span className="text-sm font-medium text-zinc-400 animate-pulse">Thinking...</span>
                </div>
              </motion.div>
            )}

            {isStreaming && streamingContent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5 flex-row">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                
                <div className="max-w-[80%] flex flex-col gap-2 items-start">
                  <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800/50 text-zinc-300 rounded-tl-sm backdrop-blur-sm">
                    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 relative flex items-end">
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                      <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse rounded-sm"></span>
                    </div>
                  </div>
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
                  placeholder={selectedFile ? `Ask about ${selectedFile}...` : "Ask anything about your documents..."}
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
