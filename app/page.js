"use client";

import { useEffect, useMemo, useState } from "react";

function BrandIcon() {
  return (
    <div className="brand-icon" aria-hidden="true">
      <div className="brand-icon-outer" />
      <div className="brand-icon-inner" />
      <div className="brand-icon-bar" />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="brand-wrap">
      <div className="brand-line">
        <BrandIcon />
        <div>
          <div className="brand-mark gold-text">Everforge</div>
          <div className="brand-product">
            <div className="brand-divider" />
            <div className="brand-sub gold-text">Movie &amp; Series Companion</div>
            <div className="brand-divider" />
          </div>
        </div>
      </div>
      <div className="brand-tagline">Decoding stories that stay with you.</div>
    </div>
  );
}

function Metric({ label, value, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{icon} {label}</div>
      <div className="metric-value">{value ?? "—"}</div>
    </div>
  );
}

function Section({ icon, title, right, children }) {
  return (
    <section className="section-card">
      <div className="section-head">
        <div className="section-title">
          <div className="section-icon" aria-hidden="true">{icon}</div>
          <h3 className="section-name">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function getAssistantReply(media, message, spoilerMode) {
  const text = message.toLowerCase();
  if (!media) return "Search for a title first, then I can help break down motives, themes, endings, and theories.";
  const spoilerTag = spoilerMode ? "Spoiler mode is on, so we can go deeper into reveals and endings. " : "Spoiler mode is off, so I’ll keep this broad and safe. ";
  if (text.includes("ending") || text.includes("finale")) return `${spoilerTag}A useful way to read the ending of ${media.title} is to ask whether it resolves only the plot, or also the emotional tension underneath it.`;
  if (text.includes("mean") || text.includes("symbol") || text.includes("symbolism")) return `${spoilerTag}For ${media.title}, focus on what the story keeps repeating: a visual motif, a fear, a relationship pattern, or a choice. That usually points to the deeper meaning.`;
  if (text.includes("character") || text.includes("favorite") || text.includes("best")) {
    const names = (media.cast || []).slice(0, 2).join(" and ");
    return `${spoilerTag}The strongest character discussion in ${media.title} probably starts with ${names || "the main cast"}. One often carries the visible arc while another carries the deeper emotional weight.`;
  }
  if (text.includes("theory") || text.includes("what if")) return `${spoilerTag}Nice theory territory. Test the idea against the story’s internal rules, character motivation, and emotional payoff. If all three still fit, your theory is probably strong.`;
  return `${spoilerTag}That’s a solid take. For ${media.title}, connect your idea to the overall tone, key relationships, and what the story is trying to make us feel in that moment.`;
}

const starterThreads = [
  "I think the ending lands emotionally even more than it lands logically.",
  "This feels like a story where the symbolism matters as much as the plot.",
  "One character is clearly carrying the emotional heart of the whole thing.",
  "The themes get stronger when you look at what the story keeps repeating.",
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedRef, setSelectedRef] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const [apiError, setApiError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [spoilerMode, setSpoilerMode] = useState(false);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([{ role: "assistant", text: "Welcome in. Search for a movie or series, then throw your thoughts in here. I can help unpack theories, clues, meanings, endings, and character choices." }]);

  useEffect(() => {
    let alive = true;
    async function checkApi() {
      try {
        const res = await fetch("/api/search?q=test");
        if (!alive) return;
        setApiStatus(res.ok ? "live" : "error");
      } catch {
        if (!alive) return;
        setApiStatus("error");
      }
    }
    checkApi();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selectedMedia) return;
    const key = `everforge-note-${selectedMedia.mediaType}-${selectedMedia.id}`;
    setNotes(window.localStorage.getItem(key) || "");
  }, [selectedMedia]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]); setSelectedRef(null); setSelectedMedia(null); setApiError(""); return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingSearch(true); setApiError("");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Search failed.");
        }
        const data = await res.json();
        const list = Array.isArray(data.results) ? data.results : [];
        setResults(list);
        setSelectedRef((prev) => {
          if (prev && list.some((item) => item.id === prev.id && item.media_type === prev.media_type)) return prev;
          return list[0] ? { id: list[0].id, media_type: list[0].media_type } : null;
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setResults([]); setSelectedRef(null); setSelectedMedia(null); setApiError(error.message || "Could not search right now.");
        }
      } finally { setLoadingSearch(false); }
    }, 380);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (!selectedRef) return;
    const controller = new AbortController();
    async function loadDetails() {
      setLoadingDetails(true); setApiError("");
      try {
        const res = await fetch(`/api/details?id=${selectedRef.id}&type=${selectedRef.media_type}`, { signal: controller.signal });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Could not load title details.");
        }
        const data = await res.json();
        setSelectedMedia(data);
      } catch (error) {
        if (error.name !== "AbortError") { setSelectedMedia(null); setApiError(error.message || "Could not load title details."); }
      } finally { setLoadingDetails(false); }
    }
    loadDetails();
    return () => controller.abort();
  }, [selectedRef]);

  const threadFeed = useMemo(() => {
    const title = selectedMedia?.title || "this title";
    return starterThreads.map((post, idx) => ({ author: ["Mia", "Andre", "Kayla", "Luca"][idx], post: post.replace("the whole thing", title).replace("the story", title) }));
  }, [selectedMedia]);

  const saveNotes = () => {
    if (!selectedMedia) return;
    const key = `everforge-note-${selectedMedia.mediaType}-${selectedMedia.id}`;
    window.localStorage.setItem(key, notes);
  };

  const handleSend = () => {
    if (!message.trim() || !selectedMedia) return;
    const userText = message.trim();
    const reply = getAssistantReply(selectedMedia, userText, spoilerMode);
    setChat((prev) => [...prev, { role: "user", text: userText }, { role: "assistant", text: reply }]);
    setMessage("");
  };

  const quickAsk = (prompt) => {
    if (!selectedMedia) return;
    const reply = getAssistantReply(selectedMedia, prompt, spoilerMode);
    setChat((prev) => [...prev, { role: "user", text: prompt }, { role: "assistant", text: reply }]);
  };

  return (
    <div className="page-shell">
      <section className="hero-card">
        <div className="hero-grid">
          <div>
            <div className="badge">✨ Everforge Product Concept</div>
            <BrandMark />
            <p className="hero-copy">Search any title, pull live data through your own Vercel API routes, keep the TMDB token private on the server, and use the built-in chat to unpack endings, clues, hidden meaning, and fan theories.</p>
          </div>
          <aside className="panel-card">
            <div className="panel-eyebrow">Server-side setup</div>
            <div className="notice-card" style={{ marginTop: 12 }}>
              <div className="notice-row">
                <div className="notice-icon">🛡️</div>
                <div>
                  <div className="notice-title">Live-only mode</div>
                  <div className="notice-text">This build has no demo data. It only uses your protected server routes, so the TMDB token stays on Vercel and never reaches the browser.</div>
                </div>
              </div>
              <div className="route-list">
                <div className="route-item">GET <span className="route-highlight">/api/search?q=dark</span></div>
                <div className="route-item">GET <span className="route-highlight">/api/details?id=1399&amp;type=tv</span></div>
                <div className="route-item">Vercel env var: <span className="route-highlight">TMDB_BEARER_TOKEN</span></div>
              </div>
              <div className="route-item" style={{ marginTop: 12, lineHeight: 1.6 }}>
                {apiStatus === "live" ? "Live API routes detected. Search is ready." : apiStatus === "checking" ? "Checking whether your Vercel API routes are available..." : "API routes are not responding yet. Add your TMDB token and deploy on Vercel."}
              </div>
            </div>
            <div className="metrics-grid">
              <Metric label="Route mode" value={apiStatus === "live" ? "Live API" : apiStatus === "checking" ? "Checking" : "Needs setup"} icon="🖥️" />
              <Metric label="Token safety" value="Server only" icon="🔒" />
              <Metric label="Threads" value="Discussion view" icon="💬" />
              <Metric label="Notes" value="Saved locally" icon="📝" />
            </div>
          </aside>
        </div>
      </section>

      <div className="app-grid">
        <aside className="sidebar panel-card">
          <div className="search-wrap">
            <div className="search-icon">🔎</div>
            <input className="text-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search any movie or series..." />
          </div>
          <div className="sidebar-head">
            <h2 className="sidebar-title">Library</h2>
            <span className="sidebar-meta">{loadingSearch ? "Searching..." : `${results.length} found`}</span>
          </div>
          {apiError ? <div className="error-box">{apiError}</div> : null}
          <div className="results-list">
            {loadingSearch ? (
              <div className="loading-row"><div className="spinner" />Loading results...</div>
            ) : results.length > 0 ? results.map((item) => {
              const active = selectedRef && item.id === selectedRef.id && item.media_type === selectedRef.media_type;
              return (
                <button key={`${item.media_type}-${item.id}`} className={`result-card ${active ? "active" : ""}`} onClick={() => { setSelectedRef({ id: item.id, media_type: item.media_type }); setActiveTab("overview"); }}>
                  <div className="result-row">
                    <div className="result-poster">{item.poster ? <img src={item.poster} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="result-empty-poster">{item.media_type === "movie" ? "🎬" : "📺"}</div>}</div>
                    <div className="result-main">
                      <div className="result-top">
                        <div style={{ minWidth: 0 }}>
                          <div className="result-name">{item.title}</div>
                          <div className="result-year">{item.year}</div>
                        </div>
                        <div className="result-rating">⭐ {item.rating}</div>
                      </div>
                      <div className="result-sub">{item.subtitle}</div>
                      <div className="result-type">{item.media_type === "movie" ? "🎬 Movie" : "📺 Series"}</div>
                    </div>
                  </div>
                </button>
              );
            }) : (
              <div className="empty-state">
                <h3 className="empty-title">Start by searching a title</h3>
                <p className="empty-copy">Enter a movie or series name and the site will load live results from TMDB through your protected Vercel API routes.</p>
              </div>
            )}
          </div>
        </aside>

        <main className="content-column">
          {!selectedMedia && !loadingDetails ? (
            <div className="empty-state">
              <h3 className="empty-title">Nothing selected yet</h3>
              <p className="empty-copy">Search for a movie or series on the left, then open it here to view the live details, cast, notes, and companion chat.</p>
            </div>
          ) : (
            <>
              <section className="title-card">
                <div className="title-hero">
                  {selectedMedia?.backdrop ? <img className="backdrop-img" src={selectedMedia.backdrop} alt={selectedMedia.title} /> : null}
                  <div className="backdrop-overlay" />
                  <div className="title-row">
                    <div className="title-left">
                      <div className="poster-large">{selectedMedia?.poster ? <img src={selectedMedia.poster} alt={selectedMedia.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="poster-placeholder-large">{selectedMedia?.mediaType === "movie" ? "🎬" : "📺"}</div>}</div>
                      <div>
                        <div className="status-chip">🕒 {selectedMedia?.status || "Loading"}</div>
                        <h1 className="title-name">{selectedMedia?.title || "Loading..."}</h1>
                        {selectedMedia?.tagline ? <div className="title-tagline">{selectedMedia.tagline}</div> : null}
                        <div className="title-overview">{selectedMedia?.overview || "Loading details..."}</div>
                      </div>
                    </div>
                    <div className="hero-metrics">
                      <Metric label="Year" value={selectedMedia?.year} icon="📅" />
                      <Metric label="Rating" value={selectedMedia?.rating} icon="⭐" />
                      <Metric label={selectedMedia?.mediaType === "tv" ? "Episodes" : "Runtime"} value={selectedMedia?.mediaType === "tv" ? selectedMedia?.episodes : selectedMedia?.runtime ? `${selectedMedia.runtime}m` : "—"} icon={selectedMedia?.mediaType === "tv" ? "📺" : "⏱️"} />
                      <Metric label="Lang" value={selectedMedia?.language} icon="🌐" />
                    </div>
                  </div>
                </div>
                <div className="tabs-row">
                  {["overview", "insights", "community"].map((tab) => <button key={tab} className={`pill-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
                  <button className={`pill-btn spoiler ${spoilerMode ? "active" : ""}`} onClick={() => setSpoilerMode((prev) => !prev)}>{spoilerMode ? "👁️ Spoiler mode on" : "🙈 Spoiler mode off"}</button>
                </div>
              </section>

              {loadingDetails ? <div className="loading-row"><div className="spinner" />Loading title details...</div> : null}

              {activeTab === "overview" && selectedMedia ? (
                <div className="two-grid">
                  <Section icon="💡" title="Why it works"><p className="body-copy">{selectedMedia.whyItHits}</p></Section>
                  <Section icon="🧠" title="Genres & tone"><div className="tag-row">{(selectedMedia.genres || []).length ? selectedMedia.genres.map((genre) => <div className="gold-tag" key={genre}>{genre}</div>) : <div className="visually-faint">No genres available.</div>}</div></Section>
                  <Section icon="👥" title="Cast to watch"><div className="item-grid">{(selectedMedia.cast || []).length ? selectedMedia.cast.map((name) => <div className="soft-item" key={name}>{name}</div>) : <div className="visually-faint">No cast loaded yet.</div>}</div></Section>
                  <Section icon="📚" title="Quick facts"><div className="item-grid">{selectedMedia.mediaType === "tv" ? <><div className="soft-item">📺 Seasons: {selectedMedia.seasons ?? "—"}</div><div className="soft-item">🎞️ Episodes: {selectedMedia.episodes ?? "—"}</div></> : <div className="soft-item">🎬 Type: Movie</div>}<div className="soft-item">🌐 Language: {selectedMedia.language || "—"}</div><div className="soft-item">📅 Year: {selectedMedia.year || "—"}</div><div className="soft-item">🕒 Status: {selectedMedia.status || "—"}</div></div></Section>
                </div>
              ) : null}

              {activeTab === "insights" && selectedMedia ? (
                <div className="content-column">
                  <Section icon="🧩" title="Companion prompts"><div className="note-list">{(selectedMedia.notes || []).length ? selectedMedia.notes.map((note) => <div className="note-item" key={note}>{note}</div>) : <div className="visually-faint">No insight notes loaded yet.</div>}</div></Section>
                  <Section icon="📝" title="Your notes" right={<button className="gold-btn pill-btn" onClick={saveNotes}>Save notes</button>}><textarea className="text-area notes-box" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write your theory, hidden clue, or what you think the story is really trying to say..." /></Section>
                </div>
              ) : null}

              {activeTab === "community" && selectedMedia ? (
                <Section icon="💬" title="Community thread preview"><div className="thread-list">{threadFeed.map((thread, index) => <div className="thread-item" key={`${thread.author}-${index}`}><div className="thread-author">{thread.author}</div><div className="thread-text">{thread.post}</div><button className="link-button">Open replies →</button></div>)}</div></Section>
              ) : null}
            </>
          )}
        </main>

        <aside className="chat-card panel-card">
          <div className="chat-head">
            <div className="chat-icon">🤖</div>
            <div>
              <h3 className="chat-title">Companion chat</h3>
              <p className="chat-sub">Ask what scenes mean, test theories, and unpack character motives.</p>
            </div>
          </div>
          <div className="prompt-row">{selectedMedia?.prompts?.length ? selectedMedia.prompts.map((prompt) => <button className="prompt-btn" key={prompt} onClick={() => quickAsk(prompt)}>{prompt}</button>) : <div className="visually-faint" style={{ fontSize: 12 }}>Search and select a title to unlock companion prompts.</div>}</div>
          <div className="info-strip">{spoilerMode ? "Spoiler mode is active. The discussion can go into reveals, finale ideas, and deep interpretation." : "Spoiler mode is off. The discussion stays safer and broader for people who are not done watching yet."}</div>
          <div className="chat-messages">{chat.map((item, idx) => <div key={idx} className={`chat-bubble ${item.role === "user" ? "user" : ""}`}>{item.text}</div>)}</div>
          <div className="chat-compose">
            <div className="compose-inner">
              <textarea className="compose-area" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={selectedMedia ? `Ask about ${selectedMedia.title}... like “What do you think that ending really meant?”` : "Search for a title first, then ask your question here."} />
              <div className="compose-row"><div className="compose-hint">Built for theories, clues, meaning, and fan debate.</div><button className="gold-btn pill-btn" onClick={handleSend} disabled={!selectedMedia || !message.trim()}>Send message</button></div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="footer-card">
        <div>This product uses the TMDB API but is not endorsed or certified by TMDB.</div>
        <div>Movie and series metadata, posters, and backdrops are provided by TMDB.</div>
      </footer>
    </div>
  );
}
