import React, { useState, useEffect, useRef } from 'react';

// Theme Colors Configuration
const COLOR_OPTIONS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Teal', value: '#06b6d4' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' }
];

const CATEGORIES = ['General', 'Work', 'Personal', 'Ideas', 'Todo'];

function App() {
  // Notes State
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [noteId, setNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // Backend / Infrastructure Health State
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [dbEngine, setDbEngine] = useState('Checking...');
  const [serverUptime, setServerUptime] = useState('N/A');
  const [isLocalFallback, setIsLocalFallback] = useState(false);

  const pollIntervalRef = useRef(null);

  // Fetch all notes from API
  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) throw new Error('Failed to fetch notes from API');
      const data = await response.json();
      setNotes(data);
      setIsLocalFallback(false);
    } catch (err) {
      console.warn('Backend API offline. Falling back to LocalStorage:', err.message);
      // Fallback to LocalStorage for local-only visual demonstration
      const localNotes = localStorage.getItem('notes_fallback');
      if (localNotes) {
        setNotes(JSON.parse(localNotes));
      }
      setIsLocalFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch health check status
  const checkHealth = async () => {
    try {
      const response = await fetch('/health');
      if (!response.ok) throw new Error('API server degraded');
      const healthData = await response.json();
      setConnectionStatus(healthData.status === 'healthy' ? 'healthy' : 'degraded');
      setDbEngine(healthData.databaseEngine === 'postgres' ? 'AWS RDS (PostgreSQL)' : 'Local SQLite');
      setServerUptime(healthData.uptime);
    } catch (err) {
      setConnectionStatus('degraded');
      setDbEngine('Offline');
      setServerUptime('N/A');
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchNotes();
    checkHealth();

    // Poll server health every 8 seconds
    pollIntervalRef.current = setInterval(() => {
      checkHealth();
      // If we are currently in local storage fallback, try to poll for actual notes too
      if (isLocalFallback) {
        fetchNotes();
      }
    }, 8000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isLocalFallback]);

  // Handle Form Submission (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    const notePayload = { title, content, category, tags, color };

    if (isLocalFallback) {
      // LocalStorage Fallback Handler
      let updatedNotes;
      if (noteId) {
        // Edit Note
        updatedNotes = notes.map((note) =>
          note.id === noteId
            ? { ...note, ...notePayload, updated_at: new Date().toISOString() }
            : note
        );
      } else {
        // Create Note
        const newNote = {
          id: Date.now(),
          ...notePayload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        updatedNotes = [newNote, ...notes];
      }
      setNotes(updatedNotes);
      localStorage.setItem('notes_fallback', JSON.stringify(updatedNotes));
      resetForm();
      setIsSubmitting(false);
    } else {
      // Direct API Handler
      try {
        const url = noteId ? `/api/notes/${noteId}` : '/api/notes';
        const method = noteId ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notePayload)
        });

        if (!response.ok) throw new Error('API request failed');
        
        await fetchNotes();
        resetForm();
      } catch (err) {
        alert(`Failed to save note: ${err.message}. Backend offline?`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handle Edit Action
  const handleEdit = (note) => {
    setNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setTags(note.tags);
    setColor(note.color);
  };

  // Handle Delete Action
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    if (isLocalFallback) {
      const updatedNotes = notes.filter((n) => n.id !== id);
      setNotes(updatedNotes);
      localStorage.setItem('notes_fallback', JSON.stringify(updatedNotes));
      if (noteId === id) resetForm();
    } else {
      try {
        const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete note');
        
        if (noteId === id) resetForm();
        await fetchNotes();
      } catch (err) {
        alert(`Failed to delete note: ${err.message}`);
      }
    }
  };

  // Reset form to blank state
  const resetForm = () => {
    setNoteId(null);
    setTitle('');
    setContent('');
    setCategory('General');
    setTags('');
    setColor('#6366f1');
  };

  // Filter notes based on search queries and category buttons
  const filteredNotes = notes.filter((note) => {
    const matchesCategory = filterCategory === 'All' || note.category === filterCategory;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      note.title.toLowerCase().includes(searchLower) ||
      note.content.toLowerCase().includes(searchLower) ||
      note.tags.toLowerCase().includes(searchLower);

    return matchesCategory && matchesSearch;
  });

  // Calculate statistics dashboard data
  const totalCount = notes.length;
  const workCount = notes.filter(n => n.category === 'Work').length;
  const personalCount = notes.filter(n => n.category === 'Personal').length;
  const ideasCount = notes.filter(n => n.category === 'Ideas').length;
  const todoCount = notes.filter(n => n.category === 'Todo').length;

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">📝</div>
          <div>
            <h1 className="brand-name">CloudNotes</h1>
            <div className="brand-subtitle">AWS Infrastructure Target Sandbox</div>
          </div>
        </div>

        <div className="status-badge">
          <span className={`status-dot ${connectionStatus}`}></span>
          <span>
            {connectionStatus === 'healthy' 
              ? 'RDS Engine Connected' 
              : isLocalFallback 
                ? 'Backend Offline (Mock Sandbox mode)' 
                : 'ALB Connecting...'}
          </span>
        </div>
      </header>

      {/* Stats Dashboard */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <span className="stat-value">{totalCount}</span>
            <span className="stat-label">Total Notes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--cat-work)' }}>💼</div>
          <div className="stat-info">
            <span className="stat-value">{workCount}</span>
            <span className="stat-label">Work Tasks</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--cat-personal)' }}>🏠</div>
          <div className="stat-info">
            <span className="stat-value">{personalCount}</span>
            <span className="stat-label">Personal</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--cat-ideas)' }}>💡</div>
          <div className="stat-info">
            <span className="stat-value">{ideasCount}</span>
            <span className="stat-label">Ideas & Logs</span>
          </div>
        </div>
      </section>

      {/* Main Workspace Layout */}
      <main className="workspace-grid">
        {/* Left Side: Create / Edit Note Form */}
        <section className="side-panel">
          <div className="glass-panel">
            <h3 className="panel-title">
              <span>{noteId ? 'Edit Note' : 'Create Note'}</span>
              {noteId && <button className="clear-btn" onClick={resetForm}>Cancel</button>}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="note-title">Title</label>
                <input
                  type="text"
                  id="note-title"
                  className="form-input"
                  placeholder="Enter note title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="note-content">Content</label>
                <textarea
                  id="note-content"
                  className="form-textarea"
                  placeholder="Type your notes here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <div className="category-selector">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`cat-btn ${category === cat ? `active ${cat.toLowerCase()}` : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      <span className="cat-dot"></span>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="note-tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="note-tags"
                  className="form-input"
                  placeholder="aws, devops, secret..."
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Accent Color</label>
                <div className="color-picker">
                  {COLOR_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={`color-option ${color === opt.value ? 'active' : ''}`}
                      style={{ backgroundColor: opt.value }}
                      onClick={() => setColor(opt.value)}
                      title={opt.name}
                    ></div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving Note...' : noteId ? 'Update Note' : 'Add Note'}
              </button>
            </form>
          </div>
        </section>

        {/* Right Side: Search and Notes Grid */}
        <section className="notes-area">
          <div className="notes-toolbar">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search notes by title, tags or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-categories">
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-btn ${filterCategory === cat ? 'active general' : ''}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <h3>Loading notes...</h3>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="no-notes">
              <span className="no-notes-icon">📭</span>
              <h3>No Notes Found</h3>
              <p>Create a new note on the left or adjust your search filter.</p>
            </div>
          ) : (
            <div className="notes-grid">
              {filteredNotes.map((note) => {
                const formattedDate = new Date(note.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <div 
                    key={note.id} 
                    className="note-card" 
                    style={{ '--note-color': note.color }}
                  >
                    <div className="note-header">
                      <h4 className="note-title">{note.title}</h4>
                      <div className="note-actions">
                        <button 
                          className="action-btn" 
                          onClick={() => handleEdit(note)}
                          title="Edit Note"
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDelete(note.id)}
                          title="Delete Note"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <p className="note-body">{note.content}</p>

                    {note.tags && (
                      <div className="note-tags">
                        {note.tags.split(',').map((tag, idx) => (
                          <span key={idx} className="tag-badge">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="note-footer">
                      <span className={`note-category ${note.category.toLowerCase()}`}>
                        {note.category}
                      </span>
                      <span className="note-date">{formattedDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Cloud Infrastructure Technical Specs Card */}
      <footer className="infra-banner">
        <div className="infra-card">
          <div className="infra-info">
            <span className="infra-icon">☁️</span>
            <div className="infra-text">
              <h4>High-Availability AWS Architecture Specifications</h4>
              <p>This sandbox application maps to production-grade DevOps deployment models.</p>
            </div>
          </div>
          
          <div className="infra-specs">
            <div className="spec-badge">
              <span className="aws-dot"></span>
              DNS & CDN: Route53 / CloudFront
            </div>
            <div className="spec-badge">
              <span className="aws-dot"></span>
              Frontend: S3 Bucket Hosting
            </div>
            <div className="spec-badge">
              <span className="aws-dot"></span>
              Load Balancer: AWS ALB
            </div>
            <div className="spec-badge">
              <span className="aws-dot"></span>
              Compute: EC2 ASG / ECS Fargate
            </div>
            <div className="spec-badge">
              <span className="aws-dot"></span>
              DB: {dbEngine}
            </div>
            <div className="spec-badge" title="Retrieved dynamically via express process uptime">
              ⏱️ Uptime: {serverUptime}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
