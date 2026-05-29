import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ═══════════════════════════════════════════════
   App
   ═══════════════════════════════════════════════ */
function App() {
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);   // { type: 'success'|'error', text }
  const [messages, setMessages] = useState([]); // chat history
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [form, setForm] = useState({
    title: '',
    subject: 'Artificial Intelligence',
    topic: 'AI Automation',
    level: 'Beginner',
    priceType: 'FREE',
    sourceUrl: 'local-file',
  });
  const [chatInput, setChatInput] = useState('');
  const [filters, setFilters] = useState({
    subject: 'Artificial Intelligence',
    topic: 'AI Automation',
    level: '',
    priceType: 'FREE',
  });

  // ── Toast helper ──
  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Load documents ──
  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    setDocumentsLoading(true);
    try {
      const res = await fetch(`${API_URL}/documents`);
      if (!res.ok) throw new Error(`Lỗi tải danh sách tài liệu (${res.status})`);
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function uploadDocuments(e) {
    e.preventDefault();

    if (files.length === 0) {
      showToast('error', 'Please select at least one PDF file before uploading.');
      return;
    }

    setUploading(true);
    setUploadProgress('');

    try {
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${currentFile.name}`);

        const payload = new FormData();
        payload.append('file', currentFile);
        Object.entries(form).forEach(([key, value]) => {
          if (value && key !== 'title') payload.append(key, value);
        });
        payload.append('title', getUploadTitle(currentFile, form.title, files.length));

        const response = await fetch(`${API_URL}/documents/upload`, {
          method: 'POST',
          body: payload,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Upload failed for ${currentFile.name} (${response.status})`);
        }
      }

      showToast('success', `Uploaded ${files.length} PDF file${files.length > 1 ? 's' : ''} successfully.`);
      setFiles([]);
      setForm(prev => ({ ...prev, title: '' }));
      setShowUploadModal(false);
      await loadDocuments();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }

  function handleFilesChange(nextFiles) {
    const pdfFiles = Array.from(nextFiles || []).filter((item) =>
      item.type === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf'),
    );

    setFiles(pdfFiles);
    if (pdfFiles.length === 1 && !form.title) {
      setForm(prev => ({ ...prev, title: removePdfExtension(pdfFiles[0].name) }));
    }
  }

  // ── Delete ──
  async function deleteDocument(id) {
    try {
      const res = await fetch(`${API_URL}/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Xóa thất bại (${res.status})`);
      }
      showToast('success', 'Đã xóa tài liệu.');
      await loadDocuments();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  }

  // ── Send message ──
  async function sendMessage(e) {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    // Add user message
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    const body = { message: text };
    Object.entries(filters).forEach(([k, v]) => { if (v?.trim()) body[k] = v; });

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Lỗi chat (${res.status})`);

      const botMsg = {
        role: 'bot',
        text: data.answer || 'Không có câu trả lời.',
        sources: data.sources || [],
        recommendations: data.recommendedDocuments || [],
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errMsg = { role: 'bot', text: `⚠️ ${getErrorMessage(err)}`, isError: true };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Suggestion click ──
  function handleSuggestion(text) {
    setChatInput(text);
  }

  return (
    <div className="app-layout">
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar
        documents={documents}
        documentsLoading={documentsLoading}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onUploadClick={() => { setShowUploadModal(true); setSidebarOpen(false); }}
        onDelete={deleteDocument}
        onRefresh={loadDocuments}
      />

      {/* Chat Area */}
      <ChatArea
        messages={messages}
        chatLoading={chatLoading}
        chatInput={chatInput}
        filters={filters}
        onInputChange={setChatInput}
        onFiltersChange={setFilters}
        onSend={sendMessage}
        onSuggestion={handleSuggestion}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          files={files}
          form={form}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onFilesChange={handleFilesChange}
          onRemoveFile={(index) => setFiles(prev => prev.filter((_, i) => i !== index))}
          onFormChange={(key, val) => setForm(prev => ({ ...prev, [key]: val }))}
          onSubmit={uploadDocuments}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Sidebar
   ═══════════════════════════════════════════════ */
function Sidebar({ documents, documentsLoading, isOpen, onClose, onUploadClick, onDelete, onRefresh }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Bot size={24} />
          </div>
          <div className="brand-text">
            <h1>StudyDocs AI</h1>
            <p>Hỏi đáp tài liệu PDF</p>
          </div>
        </div>
      </div>

      <button className="upload-trigger" onClick={onUploadClick}>
        <Plus size={18} />
        <span>Tải lên tài liệu PDF</span>
      </button>

      <div className="sidebar-section-title">
        <span>Tài liệu ({documents.length})</span>
        <button onClick={onRefresh} title="Làm mới">
          {documentsLoading ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
        </button>
      </div>

      <div className="document-list">
        {documents.length === 0 && (
          <div className="sidebar-empty">
            <FileText size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Chưa có tài liệu nào.<br />Hãy tải lên PDF đầu tiên!</p>
          </div>
        )}
        {documents.map((doc) => (
          <div className="doc-item" key={doc.id}>
            <div className="doc-icon">
              <FileText size={16} />
            </div>
            <div className="doc-info">
              <h4>{doc.title}</h4>
              <p>{[doc.subject, doc.level].filter(Boolean).join(' · ')}</p>
            </div>
            <button
              className="doc-delete"
              title="Xóa tài liệu"
              onClick={() => onDelete(doc.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <span className="api-dot" />
        <span>API: {API_URL.replace('http://', '')}</span>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════
   Chat Area
   ═══════════════════════════════════════════════ */
function ChatArea({
  messages, chatLoading, chatInput, filters,
  onInputChange, onFiltersChange, onSend, onSuggestion, onMenuClick,
}) {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [chatInput]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  }

  const suggestions = [
    'Tài liệu này nói về nội dung gì? Hãy tóm tắt ngắn gọn.',
    'Các khái niệm chính trong tài liệu là gì?',
    'Gợi ý cách học hiệu quả từ tài liệu này.',
    'Liệt kê các chủ đề quan trọng cần ôn tập.',
  ];

  return (
    <main className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="mobile-menu-btn" onClick={onMenuClick}>
            <Menu size={22} />
          </button>
          <div>
            <h2>💬 Trò chuyện</h2>
            <p>Hỏi đáp thông minh về tài liệu PDF của bạn</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <WelcomeScreen suggestions={suggestions} onSuggestion={onSuggestion} />
        ) : (
          <div className="messages-inner">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}

            {chatLoading && (
              <div className="typing-indicator">
                <div className="message-avatar" style={{ background: '#f1f5f9', color: '#0ea5e9', border: '1px solid #e2e8f0' }}>
                  <Bot size={18} />
                </div>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="input-bar">
        <div className="input-bar-inner">
          <form className="input-wrapper" onSubmit={onSend}>
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi về tài liệu..."
              rows={1}
            />
            <button className="send-btn" type="submit" disabled={chatLoading || !chatInput.trim()}>
              {chatLoading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            </button>
          </form>

          <div className="filter-row">
            <FilterChip label="Môn" value={filters.subject} onChange={(v) => onFiltersChange(prev => ({ ...prev, subject: v }))} />
            <FilterChip label="Chủ đề" value={filters.topic} onChange={(v) => onFiltersChange(prev => ({ ...prev, topic: v }))} />
            <FilterChip label="Cấp độ" value={filters.level} onChange={(v) => onFiltersChange(prev => ({ ...prev, level: v }))} />
            <label className="filter-chip">
              <span>Giá</span>
              <select value={filters.priceType} onChange={(e) => onFiltersChange(prev => ({ ...prev, priceType: e.target.value }))}>
                <option value="">Tất cả</option>
                <option value="FREE">Miễn phí</option>
                <option value="PAID">Trả phí</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── Welcome Screen ── */
function WelcomeScreen({ suggestions, onSuggestion }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-icon">
        <Sparkles size={32} />
      </div>
      <h2>Xin chào! 👋</h2>
      <p>
        Tôi là trợ lý AI giúp bạn hỏi đáp về tài liệu PDF.
        Hãy tải lên tài liệu và đặt câu hỏi để bắt đầu!
      </p>
      <div className="welcome-suggestions">
        {suggestions.map((text, i) => (
          <button key={i} className="suggestion-card" onClick={() => onSuggestion(text)}>
            <MessageSquare size={16} />
            <span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Message Bubble ── */
function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div className="message-body">
        <div className="message-sender">
          {message.role === 'user' ? 'Bạn' : 'StudyDocs AI'}
        </div>
        <div className="message-content">
          <p>{message.text}</p>
        </div>

        {/* Recommendations */}
        {message.recommendations?.length > 0 && (
          <div className="recommendations">
            {message.recommendations.map((rec, i) => (
              <span className="rec-tag" key={i}>
                <BookOpen size={12} />
                {rec.title}
              </span>
            ))}
          </div>
        )}

        {/* Sources toggle */}
        {message.sources?.length > 0 && (
          <>
            <button
              className={`sources-toggle ${showSources ? 'open' : ''}`}
              onClick={() => setShowSources(!showSources)}
            >
              <FileText size={13} />
              {message.sources.length} nguồn tham khảo
              <ChevronDown size={13} />
            </button>

            {showSources && (
              <div className="sources-list">
                {message.sources.map((src, i) => (
                  <div className="source-chip" key={i}>
                    <strong>{src.documentTitle}</strong>
                    <p>{src.preview}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Filter Chip ── */
function FilterChip({ label, value, onChange }) {
  return (
    <label className="filter-chip">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="..."
      />
    </label>
  );
}

/* ═══════════════════════════════════════════════
   Upload Modal
   ═══════════════════════════════════════════════ */
function UploadModal({
  files,
  form,
  uploading,
  uploadProgress,
  onFilesChange,
  onRemoveFile,
  onFormChange,
  onSubmit,
  onClose,
}) {
  const hasFiles = files.length > 0;
  const totalSizeMb = files.reduce((total, item) => total + item.size, 0) / 1024 / 1024;

  // Close on Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>📄 Tải lên tài liệu PDF</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="modal-body" onSubmit={onSubmit}>
          {/* File drop zone */}
          <label className={`file-dropzone ${hasFiles ? 'has-file' : ''}`}>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => onFilesChange(e.target.files)}
            />
            <div className="file-dropzone-icon">
              {hasFiles ? <CheckCircle2 size={24} /> : <Upload size={24} />}
            </div>
            <strong>{hasFiles ? `${files.length} PDF file${files.length > 1 ? 's' : ''} selected` : 'Choose or drag PDF files'}</strong>
            <small>{hasFiles ? `${totalSizeMb.toFixed(2)} MB total` : 'Select one or more PDFs to extract text and create vectors'}</small>
          </label>

          {hasFiles && (
            <div className="selected-files">
              {files.map((selectedFile, index) => (
                <div className="selected-file" key={`${selectedFile.name}-${selectedFile.lastModified}`}>
                  <FileText size={15} />
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <small>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</small>
                  </div>
                  <button type="button" onClick={() => onRemoveFile(index)} disabled={uploading} title="Remove file">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Form fields */}
          <div className="modal-form-grid">
            <div className="modal-field full-width">
              <label>Tiêu đề</label>
              <input
                value={form.title}
                onChange={(e) => onFormChange('title', e.target.value)}
                placeholder="Nhập tiêu đề tài liệu..."
              />
            </div>
            <div className="modal-field">
              <label>Môn học</label>
              <input
                value={form.subject}
                required
                onChange={(e) => onFormChange('subject', e.target.value)}
                placeholder="VD: Artificial Intelligence"
              />
            </div>
            <div className="modal-field">
              <label>Chủ đề</label>
              <input
                value={form.topic}
                onChange={(e) => onFormChange('topic', e.target.value)}
                placeholder="VD: AI Automation"
              />
            </div>
            <div className="modal-field">
              <label>Cấp độ</label>
              <input
                value={form.level}
                onChange={(e) => onFormChange('level', e.target.value)}
                placeholder="VD: Beginner"
              />
            </div>
            <div className="modal-field">
              <label>Loại giá</label>
              <select value={form.priceType} onChange={(e) => onFormChange('priceType', e.target.value)}>
                <option value="FREE">Miễn phí</option>
                <option value="PAID">Trả phí</option>
              </select>
            </div>
          </div>

          {uploadProgress && (
            <div className="upload-progress">
              <Loader2 className="spin" size={14} />
              <span>{uploadProgress}</span>
            </div>
          )}

          <button className="modal-submit" type="submit" disabled={uploading || !hasFiles}>
            {uploading ? <Loader2 className="spin" size={18} /> : <Upload size={18} />}
            <span>{uploading ? 'Đang xử lý...' : 'Tải lên và phân tích'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════ */
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không mong muốn.';
}

/* ── Mount ── */
function removePdfExtension(fileName) {
  return fileName.replace(/\.pdf$/i, '');
}

function getUploadTitle(file, titlePrefix, totalFiles) {
  const fileTitle = removePdfExtension(file.name);
  const cleanPrefix = titlePrefix.trim();

  if (!cleanPrefix) return fileTitle;
  if (totalFiles === 1) return cleanPrefix;
  return `${cleanPrefix} - ${fileTitle}`;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
