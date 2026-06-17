import { useState, useEffect } from 'react';

const API = 'https://urlshortener-production-de71.up.railway.app';

function Dashboard({ user, token, onLogout }) {
  const [urls, setUrls] = useState([]);
  const [input, setInput] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadUrls();
  }, []);

  const loadUrls = async () => {
    try {
      const res = await fetch(`${API}/urls`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await res.json();
      setUrls(data.urls || []);
    } catch (err) {
      console.error(err);
    }
  };

  const shortenUrl = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ original_url: input, title })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setUrls(prev => [data.url, ...prev]);
      setInput('');
      setTitle('');
    } catch (err) {
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(`${API}/${code}`);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteUrl = async (id) => {
    try {
      await fetch(`${API}/urls/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      setUrls(prev => prev.filter(u => u.id !== id));
      if (analytics?.url?.id === id) setAnalytics(null);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnalytics = async (id) => {
    try {
      const res = await fetch(`${API}/urls/${id}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0);

  return (
    <div className="dashboard">
      <div className="header">
        <span className="logo">🔗 LinkShort</span>
        <div className="header-right">
          <span className="username">👤 {user.name}</span>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="main">
        {/* STATS BAR */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-card-number">{urls.length}</div>
            <div className="stat-card-label">Total Links</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-number">{totalClicks}</div>
            <div className="stat-card-label">Total Clicks</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-number">
              {urls.length > 0 ? Math.round(totalClicks / urls.length) : 0}
            </div>
            <div className="stat-card-label">Avg Clicks per Link</div>
          </div>
        </div>

        {/* SHORTEN FORM */}
        <div className="shorten-card">
          <h2>Shorten a URL</h2>
          <form onSubmit={shortenUrl} className="shorten-form">
            <input
              type="text"
              placeholder="Paste your long URL here... (include https://)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {error && <div className="error-msg">⚠️ {error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Shortening...' : 'Shorten URL'}
            </button>
          </form>
        </div>

        {/* URLS LIST */}
        <div className="urls-section">
          <h2>Your Links ({urls.length})</h2>
          {urls.length === 0 && (
            <div className="empty">No links yet — shorten your first URL above!</div>
          )}
          {urls.map(url => (
            <div key={url.id} className="url-card">
              <div className="url-info">
                <div className="url-title">{url.title || 'Untitled'}</div>
                <div className="url-original">{url.original_url}</div>
                <div className="url-short">
                  <a href={`${API}/${url.short_code}`} target="_blank" rel="noreferrer">
                    {API}/{url.short_code}
                  </a>
                </div>
              </div>
              <div className="url-stats">
                <div className="clicks-badge">{url.clicks} clicks</div>
              </div>
              <div className="url-actions">
                <button className="action-btn copy" onClick={() => copyToClipboard(url.short_code)}>
                  {copied === url.short_code ? 'Copied!' : 'Copy'}
                </button>
                <button className="action-btn analytics" onClick={() => loadAnalytics(url.id)}>
                  Analytics
                </button>
                <button className="action-btn delete" onClick={() => deleteUrl(url.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ANALYTICS PANEL */}
        {analytics && (
          <div className="analytics-card">
            <div className="analytics-header">
              <h2>Analytics — {analytics.url.title || analytics.url.short_code}</h2>
              <button onClick={() => setAnalytics(null)} className="close-btn">✕</button>
            </div>
            <div className="analytics-stats">
              <div className="stat-box">
                <div className="stat-number">{analytics.totalClicks}</div>
                <div className="stat-label">Total Clicks</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{analytics.deviceBreakdown.mobile || 0}</div>
                <div className="stat-label">Mobile</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{analytics.deviceBreakdown.desktop || 0}</div>
                <div className="stat-label">Desktop</div>
              </div>
            </div>
            <div className="analytics-breakdown">
              <h3>Browser Breakdown</h3>
              {Object.entries(analytics.browserBreakdown).map(([browser, count]) => (
                <div key={browser} className="breakdown-row">
                  <span>{browser}</span>
                  <span>{count} clicks</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;