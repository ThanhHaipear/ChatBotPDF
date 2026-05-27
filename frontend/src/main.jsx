import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    subject: 'Artificial Intelligence',
    topic: 'AI Automation',
    level: 'Beginner',
    priceType: 'FREE',
    sourceUrl: 'local-file',
  });
  const [chat, setChat] = useState({
    message: 'Tai lieu nay noi ve noi dung gi? Hay tom tat ngan gon va goi y cach hoc.',
    subject: 'Artificial Intelligence',
    topic: 'AI Automation',
    level: '',
    priceType: 'FREE',
  });

  const indexedChunks = useMemo(
    () => documents.reduce((total, doc) => total + (doc._count?.chunks || 0), 0),
    [documents],
  );

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setDocumentsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/documents`);
      if (!response.ok) {
        throw new Error(`GET /documents failed with ${response.status}`);
      }
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function uploadDocument(event) {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!file) {
      setError('Chon mot file PDF truoc khi upload.');
      return;
    }

    const payload = new FormData();
    payload.append('file', file);
    Object.entries(form).forEach(([key, value]) => {
      if (value) payload.append(key, value);
    });

    setUploading(true);

    try {
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Upload failed with ${response.status}`);
      }
      setStatus(`Uploaded "${data.title}" voi ${data.totalChunks} chunk.`);
      setFile(null);
      await loadDocuments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(id) {
    setError('');
    setStatus('');

    try {
      const response = await fetch(`${API_URL}/documents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Delete failed with ${response.status}`);
      }
      setStatus('Document da duoc xoa.');
      await loadDocuments();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    setError('');
    setStatus('');
    setAnswer('');
    setSources([]);
    setRecommendations([]);

    if (!chat.message.trim()) {
      setError('Nhap cau hoi truoc khi gui.');
      return;
    }

    const body = Object.fromEntries(
      Object.entries(chat).filter(([, value]) => value && value.trim()),
    );

    setChatLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `POST /chat failed with ${response.status}`);
      }
      setAnswer(data.answer || '');
      setSources(data.sources || []);
      setRecommendations(data.recommendedDocuments || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <span className="eyebrow">PDF RAG workspace</span>
          <div className="brand">
            <span className="brand-mark">
              <Bot size={28} aria-hidden="true" />
            </span>
            <h1>StudyDocs AI</h1>
          </div>
          <p>RAG demo for PDF learning material recommendations</p>
        </div>
        <div className="topbar-actions">
          <span className="api-pill">API {API_URL.replace('http://', '')}</span>
          <button className="icon-button" type="button" onClick={loadDocuments} title="Refresh documents">
            {documentsLoading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <Stat icon={<FileText size={20} />} label="Documents" value={documents.length} detail="Uploaded PDF files" />
        <Stat icon={<Database size={20} />} label="Indexed chunks" value={indexedChunks} detail="Vector records" />
        <Stat icon={<BookOpen size={20} />} label="Retrieval" value="Top 8" detail="Source-grounded context" />
      </section>

      {(status || error) && (
        <section className={error ? 'alert error' : 'alert success'}>
          {error ? <span>{error}</span> : <><CheckCircle2 size={18} /><span>{status}</span></>}
        </section>
      )}

      <section className="workspace">
        <form className="panel upload-panel" onSubmit={uploadDocument}>
          <div className="panel-heading">
            <div>
              <h2>Upload PDF</h2>
              <p>Index a study document into semantic chunks</p>
            </div>
            <Upload size={20} aria-hidden="true" />
          </div>

          <label className="file-drop">
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] || null;
                setFile(nextFile);
                if (nextFile && !form.title) {
                  setForm((current) => ({
                    ...current,
                    title: nextFile.name.replace(/\.pdf$/i, ''),
                  }));
                }
              }}
            />
            <span className="file-icon">
              <FileText size={22} aria-hidden="true" />
            </span>
            <span>
              <strong>{file ? file.name : 'Choose a PDF file'}</strong>
              <small>PDF text will be extracted and embedded</small>
            </span>
          </label>

          <div className="form-grid">
            <Field label="Title" value={form.title} onChange={(value) => setFormValue(setForm, 'title', value)} required />
            <Field label="Subject" value={form.subject} onChange={(value) => setFormValue(setForm, 'subject', value)} required />
            <Field label="Topic" value={form.topic} onChange={(value) => setFormValue(setForm, 'topic', value)} />
            <Field label="Level" value={form.level} onChange={(value) => setFormValue(setForm, 'level', value)} />
            <SelectField
              label="Price"
              value={form.priceType}
              onChange={(value) => setFormValue(setForm, 'priceType', value)}
              options={['FREE', 'PAID']}
            />
            <Field label="Source URL" value={form.sourceUrl} onChange={(value) => setFormValue(setForm, 'sourceUrl', value)} />
          </div>

          <button className="primary-button" type="submit" disabled={uploading}>
            {uploading ? <Loader2 className="spin" size={18} /> : <Upload size={18} />}
            <span>{uploading ? 'Indexing...' : 'Upload and index'}</span>
          </button>
        </form>

        <section className="panel documents-panel">
          <div className="panel-heading">
            <div>
              <h2>Documents</h2>
              <p>Indexed library available for retrieval</p>
            </div>
            <FileText size={20} aria-hidden="true" />
          </div>

          <div className="document-list">
            {documents.length === 0 && (
              <div className="empty-state">No indexed documents yet.</div>
            )}

            {documents.map((doc) => (
              <article className="document-row" key={doc.id}>
                <div>
                  <h3>{doc.title}</h3>
                  <p>{[doc.subject, doc.topic, doc.level, doc.priceType].filter(Boolean).join(' | ')}</p>
                  <span className="mini-badge">{doc._count?.chunks || 0} chunks</span>
                </div>
                <button
                  className="icon-button danger"
                  type="button"
                  title="Delete document"
                  onClick={() => deleteDocument(doc.id)}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="chat-layout">
        <form className="panel chat-panel" onSubmit={sendMessage}>
          <div className="panel-heading">
            <div>
              <h2>Chat</h2>
              <p>Ask a question against indexed sources</p>
            </div>
            <MessageSquare size={20} aria-hidden="true" />
          </div>

          <textarea
            value={chat.message}
            onChange={(event) => setFormValue(setChat, 'message', event.target.value)}
            rows={5}
          />

          <div className="chat-filters">
            <Field label="Subject" value={chat.subject} onChange={(value) => setFormValue(setChat, 'subject', value)} />
            <Field label="Topic" value={chat.topic} onChange={(value) => setFormValue(setChat, 'topic', value)} />
            <Field label="Level" value={chat.level} onChange={(value) => setFormValue(setChat, 'level', value)} />
            <SelectField
              label="Price"
              value={chat.priceType}
              onChange={(value) => setFormValue(setChat, 'priceType', value)}
              options={['', 'FREE', 'PAID']}
            />
          </div>

          <button className="primary-button" type="submit" disabled={chatLoading}>
            {chatLoading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            <span>{chatLoading ? 'Thinking...' : 'Send'}</span>
          </button>
        </form>

        <section className="panel answer-panel">
          <div className="panel-heading">
            <div>
              <h2>Answer</h2>
              <p>Generated response with retrieved evidence</p>
            </div>
            <Bot size={20} aria-hidden="true" />
          </div>
          {answer ? <p className="answer-text">{answer}</p> : <div className="empty-state">Ask a question to see the RAG answer.</div>}

          {recommendations.length > 0 && (
            <div className="source-section">
              <h3>Recommendations</h3>
              {recommendations.map((item) => (
                <div className="source-card" key={`${item.title}-${item.similarity}`}>
                  <div className="source-title">
                    <strong>{item.title}</strong>
                    <span>{Number(item.similarity).toFixed(3)}</span>
                  </div>
                  <p>{[item.subject, item.topic, item.level, item.priceType].filter(Boolean).join(' | ')}</p>
                </div>
              ))}
            </div>
          )}

          {sources.length > 0 && (
            <div className="source-section">
              <h3>Sources</h3>
              {sources.map((source, index) => (
                <article className="source-card" key={`${source.documentTitle}-${index}`}>
                  <div className="source-title">
                    <strong>{source.documentTitle}</strong>
                    <span>{Number(source.similarity).toFixed(3)}</span>
                  </div>
                  <p>{source.preview}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Stat({ icon, label, value, detail }) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option || 'any'} value={option}>
            {option || 'Any'}
          </option>
        ))}
      </select>
    </label>
  );
}

function setFormValue(setter, key, value) {
  setter((current) => ({
    ...current,
    [key]: value,
  }));
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
