'use client';

import { useState, useEffect, useRef } from 'react';

// Sample AI Text specifically tailored to 280 words (satisfying the 250 - 500 word limit)
const SAMPLE_AI_LONG_TEXT = `Dalam era perkembangan teknologi yang begitu pesat saat ini, kecerdasan buatan memainkan peranan yang sangat penting dan krusial dalam berbagai aspek kehidupan manusia. Oleh karena itu, dapat disimpulkan bahwa pemanfaatan inovasi komputasi ini memberikan lompatan efisiensi yang belum pernah terjadi sebelumnya dalam peradaban modern. Selain itu, penting bagi kita untuk menyadari bahwa adopsi sistem cerdas bukan hanya sebuah tren sementara, melainkan sebuah bukti nyata dari dedikasi manusia dalam mencapai kemajuan yang berkelanjutan.

Kecerdasan buatan memiliki potensi transformatif dalam memodernisasi sektor industri dan pendidikan secara holistik. Dengan memfasilitasi otomasi alur kerja serta pembelajaran yang dipersonalisasi, sistem ini mampu beradaptasi secara dinamis terhadap kebutuhan unik setiap individu maupun organisasi. Lebih lanjut, integrasi teknologi mutakhir akan menciptakan ekosistem kerja yang inklusif serta mendorong tercapainya produktivitas yang optimal tanpa mengorbankan kualitas keluaran.

Tidak dapat dipungkiri bahwa percepatan transformasi digital menuntut kesiapan infrastruktur dan etika yang kokoh. Seiring dengan berjalannya waktu, institusi global senantiasa dituntut untuk merumuskan regulasi komprehensif guna memastikan akuntabilitas operasional. Dengan demikian, kolaborasi strategis antara pemangku kebijakan dan pengembang teknologi merupakan salah satu pilar fundamental dalam memitigasi risiko disrupsi.

Pada hakikatnya, masa depan otomatisasi berada pada sinergi harmonis antara intuisi manusia dan kapabilitas kalkulasi mesin. Ketika kedua elemen ini berpadu secara proporsional, tantangan kompleks di era informasi dapat terselesaikan dengan presisi tinggi. Oleh sebab itu, penguatan literasi digital generasi mendatang menjadi agenda mendesak yang patut diprioritaskan oleh seluruh elemen bangsa demi menyongsong masa depan yang berdaya saing global.`;

export default function HumanizerPage() {
  // Input & Output Text
  const [inputText, setInputText] = useState(SAMPLE_AI_LONG_TEXT);
  const [outputText, setOutputText] = useState('');
  const [rawHumanizedResult, setRawHumanizedResult] = useState('');

  // Configuration
  const [tone, setTone] = useState('natural');
  const [speed, setSpeed] = useState('human');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState('dark');

  // Loading & Processing States
  const [isDetecting, setIsDetecting] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [viewMode, setViewMode] = useState('normal'); // 'normal' | 'diff'

  // Detection Results
  const [detectionResult, setDetectionResult] = useState(null);
  const [humanizeData, setHumanizeData] = useState(null);

  // Authentication State (Requirement 2.b: Diperlukan login terlebih dahulu)
  const [user, setUser] = useState({
    id: 'usr_demo_1',
    email: 'demo@humanizer.ai',
    name: 'Demo Researcher',
    dailyQuota: 2500,
    wordsUsedToday: 420,
    tier: 'Pro Researcher'
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Research Dataset Modal State (Tahap 1 Roadmap)
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [researchData, setResearchData] = useState({ experiments: [], analytics: {} });
  const [feedbackRating, setFeedbackRating] = useState(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');

  // Audio Context Ref
  const audioCtxRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingScreenRef = useRef(null);

  // Word Limits Configuration
  const minLimit = parseInt(process.env.NEXT_PUBLIC_WORD_LIMIT_MIN || '1', 10);
  const maxLimit = parseInt(process.env.NEXT_PUBLIC_WORD_LIMIT_MAX || '1000', 10);

  // Computed Word Count
  const words = inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const isWordCountValid = wordCount >= minLimit && wordCount <= maxLimit;

  // Show Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  // Mechanical Keyboard Sound Generator
  const playKeySound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const baseFreq = 180 + Math.random() * 140;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.05 + Math.random() * 0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Theme switch effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial detection scan on mount
  useEffect(() => {
    if (inputText) {
      handleDetectAi(true); // Silent scan
    }
  }, []);

  // Fetch Research Dataset
  const fetchResearchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const json = await res.json();
      if (json.success) {
        setResearchData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch research history:', err);
    }
  };

  // Handle AI Detection API Call
  const handleDetectAi = async (silent = false) => {
    if (!inputText.trim()) {
      if (!silent) showToast('Masukkan teks terlebih dahulu.');
      return;
    }

    setIsDetecting(true);
    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, bypassLimit: true })
      });
      const data = await res.json();

      if (data.success) {
        setDetectionResult(data.data);
        if (!silent) showToast(`Hasil Deteksi: ${data.data.verdict}`);
      } else {
        if (!silent) showToast(data.error || 'Gagal mendeteksi teks.');
      }
    } catch (err) {
      if (!silent) showToast('Gagal menghubungi server deteksi.');
    } finally {
      setIsDetecting(false);
    }
  };

  // Realistic Typing Simulator
  const startTypingSimulator = (fullText, speedMode) => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setIsTyping(true);
    setOutputText('');
    setViewMode('normal');

    if (speedMode === 'instant') {
      setOutputText(fullText);
      setIsTyping(false);
      return;
    }

    const chars = Array.from(fullText);
    let idx = 0;

    const speedMap = {
      human: { base: 28, jitter: 26, punctPause: 220 },
      slow: { base: 60, jitter: 35, punctPause: 320 },
      fast: { base: 12, jitter: 10, punctPause: 90 }
    };
    const cfg = speedMap[speedMode] || speedMap.human;

    function step() {
      if (idx >= chars.length) {
        setIsTyping(false);
        return;
      }

      const char = chars[idx];
      setOutputText(prev => prev + char);
      idx++;

      playKeySound();

      let delay = cfg.base + Math.random() * cfg.jitter;
      if (['.', '!', '?', ';', '\n'].includes(char)) {
        delay += cfg.punctPause;
      } else if ([',', '—', '-'].includes(char)) {
        delay += cfg.punctPause * 0.5;
      }

      typingTimerRef.current = setTimeout(step, delay);
    }

    step();
  };

  // Handle Humanize API Call
  const handleHumanize = async () => {
    // 1. Enforce Login requirement (Kebutuhan 2.b)
    if (!user) {
      setIsAuthModalOpen(true);
      showToast('Harap login terlebih dahulu untuk menggunakan fitur Humanizer.');
      return;
    }

    // 2. Enforce Word Limit (1 - 1000 kata)
    if (wordCount < minLimit || wordCount > maxLimit) {
      showToast(`Jumlah kata (${wordCount} kata) belum memenuhi batas ${minLimit} - ${maxLimit} kata.`);
      return;
    }

    setIsHumanizing(true);
    try {
      const res = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          tone,
          bypassLimit: false
        })
      });

      const json = await res.json();
      if (json.success) {
        const { humanizedText, initialDetection, resultDetection, learningLogId, providerUsed } = json.data;
        setRawHumanizedResult(humanizedText);
        setDetectionResult(initialDetection);
        setHumanizeData(json.data);
        setFeedbackRating(null);

        // Deduct Quota
        setUser(prev => ({
          ...prev,
          wordsUsedToday: prev.wordsUsedToday + wordCount
        }));

        // Start typing simulator
        startTypingSimulator(humanizedText, speed);
        showToast(`Teks berhasil di-humanize oleh ${providerUsed}!`);
      } else {
        showToast(json.error || 'Gagal mengubah teks.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan saat memproses teks.');
    } finally {
      setIsHumanizing(false);
    }
  };

  // Submit Feedback Rating for Tahap 1 Research Dataset
  const handleRatingSubmit = async (ratingVal) => {
    if (!humanizeData?.learningLogId) return;

    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: humanizeData.learningLogId,
          rating: ratingVal
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackRating(ratingVal);
        showToast(ratingVal === 'positive' ? 'Terima kasih! Dicatat sebagai respons berhasil.' : 'Feedback dicatat untuk evaluasi perbaikan prompt.');
      }
    } catch (e) {
      showToast('Gagal menyimpan rating.');
    }
  };

  // Render Diff View
  const renderDiffContent = () => {
    if (!rawHumanizedResult) return null;
    const oldWords = inputText.trim().split(/\s+/);
    const newWords = rawHumanizedResult.trim().split(/\s+/);
    const maxLen = Math.max(oldWords.length, newWords.length);

    const diffNodes = [];
    for (let i = 0; i < maxLen; i++) {
      const o = oldWords[i];
      const n = newWords[i];
      if (o === n) {
        diffNodes.push(<span key={i}>{n} </span>);
      } else {
        if (o) diffNodes.push(<span key={`del-${i}`} className="diff-del">{o}</span>, ' ');
        if (n) diffNodes.push(<span key={`add-${i}`} className="diff-add">{n}</span>, ' ');
      }
    }
    return diffNodes;
  };

  // Copy Result Text
  const handleCopy = () => {
    if (!rawHumanizedResult && !outputText) {
      showToast('Belum ada teks untuk disalin.');
      return;
    }
    navigator.clipboard.writeText(rawHumanizedResult || outputText);
    showToast('Teks berhasil disalin ke clipboard!');
  };

  // Download TXT
  const handleDownloadTxt = () => {
    const text = rawHumanizedResult || outputText;
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `humanized-${tone}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File TXT diunduh.');
  };

  // Quick Demo Login
  const handleQuickLogin = () => {
    setUser({
      id: 'usr_demo_1',
      email: authEmail || 'demo@humanizer.ai',
      name: (authEmail ? authEmail.split('@')[0] : 'Demo Researcher'),
      dailyQuota: 2500,
      wordsUsedToday: 420,
      tier: 'Pro Researcher'
    });
    setIsAuthModalOpen(false);
    showToast('Berhasil login sebagai Demo Researcher.');
  };

  return (
    <>
      <div className="bg-glow glow-top-left" />
      <div className="bg-glow glow-bottom-right" />
      <div className="bg-grid-pattern" />

      {/* App Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="logo-area">
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2a10 10 0 0 0-7.54 16.56l-1.39 3.47a1 1 0 0 0 1.25 1.3l3.52-1.34A10 10 0 1 0 12 2z" />
                <path d="M8 12h.01M12 12h.01M16 12h.01" />
              </svg>
            </div>
            <span className="logo-title">
              Humanizer<span className="gradient-text">.AI</span>
            </span>
            <span className="logo-badge">Next.js Pro v3</span>
          </div>

          <div className="header-nav">
            {/* Research & Learning Dataset Button (Tahap 1) */}
            <button
              className="nav-btn"
              onClick={() => {
                fetchResearchHistory();
                setIsResearchModalOpen(true);
              }}
              title="Buka Dataset Pembelajaran & Riset Uji Coba"
            >
              <span className="pulse-dot" />
              <span>🧪 Dataset Riset (Tahap 1)</span>
            </button>

            {/* Auth Profile / Login Button (Kebutuhan 2.b) */}
            {user ? (
              <div className="user-profile-badge" title="Status Kuota Akun">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{user.name}</span>
                <span style={{ color: 'var(--emerald-400)', fontSize: '0.74rem' }}>
                  ({Math.max(0, user.dailyQuota - user.wordsUsedToday)} kata tersisa)
                </span>
              </div>
            ) : (
              <button className="nav-btn" onClick={() => setIsAuthModalOpen(true)}>
                🔑 Masuk Akun
              </button>
            )}

            {/* Theme Toggle */}
            <button
              className="btn-theme-toggle"
              onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
              title="Ganti Tema"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <span>⚡ Pipeline Multi-Model: Gemini / Groq / OpenAI + RoBERTa Heuristik</span>
        </div>
        <h1 className="hero-title">
          Pendeteksi Teks AI & Konversi Jadi <br />
          <span className="gradient-text">Gaya Penulisan Manusia Alami</span>
        </h1>
        <p className="hero-subtitle">
          Dilengkapi validasi kuota 1–1.000 kata, evaluasi deteksi Turnitin & GPTZero, serta pencatatan dataset pembelajaran untuk riset prompt berkelanjutan.
        </p>
      </section>

      {/* Main Workspace */}
      <main className="workspace-wrapper">
        {/* Word Limit & Quota Guideline Bar (Kebutuhan 2.a) */}
        <div className="quota-guideline-bar">
          <div className="guideline-item">
            <span style={{ color: 'var(--text-subtle)' }}>Batas Kata per Request:</span>
            <span
              className={`quota-pill ${
                wordCount === 0
                  ? 'quota-ok'
                  : isWordCountValid
                  ? 'quota-ok'
                  : wordCount < minLimit
                  ? 'quota-warning'
                  : 'quota-danger'
              }`}
            >
              {wordCount} / {maxLimit} Kata {isWordCountValid ? '✓ Sesuai Syarat' : wordCount < minLimit ? `(Min. ${minLimit})` : `(Max. ${maxLimit})`}
            </span>
          </div>

          <div className="guideline-item">
            <span style={{ color: 'var(--text-subtle)' }}>Status Engine:</span>
            <span style={{ color: 'var(--emerald-400)', fontWeight: 600 }}>
              {humanizeData ? humanizeData.providerUsed : 'Siap Terhubung (.env Multi-Provider)'}
            </span>
          </div>
        </div>

        {/* Workspace Controls */}
        <div className="workspace-controls">
          <div className="control-group">
            <label className="control-label">Gaya Penulisan (Tone):</label>
            <div className="tone-pills">
              {[
                { id: 'natural', label: '✨ Natural Human' },
                { id: 'academic', label: '🎓 Akademik & Skripsi' },
                { id: 'casual', label: '☕ Kasual & Santai' },
                { id: 'professional', label: '💼 Profesional Kerja' },
                { id: 'stealth', label: '🥷 Ultra Stealth (Max Bypass)' }
              ].map(t => (
                <button
                  key={t.id}
                  className={`tone-pill ${tone === t.id ? 'active' : ''}`}
                  onClick={() => setTone(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Kecepatan Ketik:</label>
            <select
              value={speed}
              onChange={e => setSpeed(e.target.value)}
              className="custom-select"
            >
              <option value="human">Simulasi Alami (45–70 WPM)</option>
              <option value="fast">Cepat (90 WPM)</option>
              <option value="slow">Santai (35 WPM)</option>
              <option value="instant">Instan (Tanpa Animasi)</option>
            </select>

            <button
              className={`sound-toggle-btn ${!soundEnabled ? 'sound-off' : ''}`}
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                showToast(`Audio keyboard: ${!soundEnabled ? 'AKTIF' : 'NONAKTIF'}`);
              }}
              title="Efek Suara Keyboard"
            >
              <span>{soundEnabled ? '🔊 Audio FX: ON' : '🔈 Audio FX: OFF'}</span>
            </button>
          </div>
        </div>

        {/* Dual Workspace Grid */}
        <div className="workspace-grid">
          {/* PANEL KIRI: AI Text Input & Detector */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-area">
                <div className="status-dot dot-amber" />
                <h3>Input Teks AI Asli</h3>
              </div>
              <div className="panel-actions">
                <button
                  className="action-btn"
                  onClick={() => {
                    setInputText(SAMPLE_AI_LONG_TEXT);
                    showToast('Contoh teks AI 280 kata dimasukkan.');
                  }}
                  title="Gunakan Contoh Teks AI (280 kata)"
                >
                  <span>Contoh Teks (280 Kata)</span>
                </button>
                <button
                  className="action-btn"
                  onClick={async () => {
                    try {
                      const clip = await navigator.clipboard.readText();
                      if (clip) setInputText(clip);
                    } catch (e) {
                      showToast('Tidak dapat membaca clipboard.');
                    }
                  }}
                >
                  Paste
                </button>
                <button
                  className="action-btn text-danger"
                  onClick={() => setInputText('')}
                >
                  Hapus
                </button>
              </div>
            </div>

            <div className="editor-container">
              <textarea
                className="main-textarea"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`Tempel atau ketik teks AI Anda di sini (${minLimit} - ${maxLimit} kata)...`}
                spellCheck="false"
              />
            </div>

            <div className="panel-footer">
              <div className="word-counter">
                {wordCount} kata &bull; {inputText.length} karakter
              </div>

              {/* Detection Gauge Mini Card */}
              <div className="detection-status-card">
                <div
                  className={`gauge-pill ${
                    detectionResult?.badgeClass === 'badge-red'
                      ? 'gauge-danger'
                      : detectionResult?.badgeClass === 'badge-green'
                      ? 'gauge-success'
                      : ''
                  }`}
                >
                  <span className="gauge-dot" />
                  <span>
                    {isDetecting
                      ? 'Menganalisis...'
                      : detectionResult
                      ? detectionResult.verdict
                      : 'Siap Deteksi AI'}
                  </span>
                </div>
                <div className="gauge-bar-track">
                  <div
                    className="gauge-bar-fill"
                    style={{ width: `${detectionResult?.aiScore || 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="panel-cta-bar">
              <button
                className="btn btn-secondary"
                onClick={() => handleDetectAi(false)}
                disabled={isDetecting || !inputText.trim()}
              >
                {isDetecting ? 'Sedang Memindai...' : '🔍 Scan Deteksi AI'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleHumanize}
                disabled={isHumanizing || !isWordCountValid}
              >
                {isHumanizing ? 'Menulis Ulang...' : '✨ Humanize & Ketik Teks'}
              </button>
            </div>
          </div>

          {/* PANEL KANAN: Humanized Output & Typing Simulator */}
          <div className={`panel ${isTyping ? 'is-typing' : ''}`}>
            <div className="panel-header">
              <div className="panel-title-area">
                <div className="status-dot dot-emerald" />
                <h3>Hasil Humanized & Simulator</h3>
              </div>
              <div className="panel-actions">
                <button
                  className={`action-btn ${viewMode === 'diff' ? 'btn-success-subtle' : ''}`}
                  onClick={() => {
                    if (!rawHumanizedResult) {
                      showToast('Belum ada teks hasil konversi untuk dibanding.');
                      return;
                    }
                    setViewMode(prev => (prev === 'diff' ? 'normal' : 'diff'));
                  }}
                >
                  {viewMode === 'diff' ? 'Normal View' : 'Diff View'}
                </button>
                <button className="action-btn btn-success-subtle" onClick={handleCopy}>
                  Salin
                </button>
              </div>
            </div>

            <div className="editor-container" ref={typingScreenRef}>
              {viewMode === 'diff' ? (
                <div className="diff-view-screen">{renderDiffContent()}</div>
              ) : (
                <div className="human-typing-screen">
                  {!outputText && !isTyping ? (
                    <div className="placeholder-text">
                      <div className="placeholder-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <path d="M12 18v-6" />
                          <path d="m9 15 3 3 3-3" />
                        </svg>
                      </div>
                      <h4>Menunggu Teks Dikonversi</h4>
                      <p>Pastikan jumlah kata di sebelah kiri mencapai {minLimit}–{maxLimit} kata, lalu klik tombol Humanize.</p>
                    </div>
                  ) : (
                    <>
                      <div className="typed-content">{outputText}</div>
                      {isTyping && <span className="blinking-cursor" />}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Benchmark Multi-Detector Results */}
            <div className="output-detector-benchmark">
              <div className="benchmark-header">
                <span className="benchmark-title">Audit Detektor AI Setelah Humanize:</span>
                <span className="benchmark-verdict" style={{ color: 'var(--emerald-400)' }}>
                  {humanizeData?.resultDetection?.verdict || 'Belum Dikonversi'}
                </span>
              </div>
              <div className="benchmark-grid">
                <div className="detector-score-item">
                  <span className="detector-name">Turnitin Sim:</span>
                  <div className="score-badge badge-green">
                    {humanizeData ? `${100 - humanizeData.resultDetection.benchmarks.turnitin}% Human` : '-'}
                  </div>
                </div>
                <div className="detector-score-item">
                  <span className="detector-name">GPTZero:</span>
                  <div className="score-badge badge-green">
                    {humanizeData ? `${100 - humanizeData.resultDetection.benchmarks.gptzero}% Human` : '-'}
                  </div>
                </div>
                <div className="detector-score-item">
                  <span className="detector-name">Copyleaks:</span>
                  <div className="score-badge badge-green">
                    {humanizeData ? `${100 - humanizeData.resultDetection.benchmarks.copyleaks}% Human` : '-'}
                  </div>
                </div>
                <div className="detector-score-item">
                  <span className="detector-name">Burstiness:</span>
                  <div className="score-badge badge-blue">
                    {humanizeData ? humanizeData.resultDetection.metrics.burstiness.grade : '-'}
                  </div>
                </div>
              </div>

              {/* Feedback Rating Bar (Tahap 1 Pembelajaran) */}
              {rawHumanizedResult && (
                <div className="feedback-rating-bar">
                  <span>Beri rating hasil ini untuk pembelajaran AI:</span>
                  <button
                    className={`rating-btn ${feedbackRating === 'positive' ? 'active-pos' : ''}`}
                    onClick={() => handleRatingSubmit('positive')}
                  >
                    👍 Bagus (Lolos)
                  </button>
                  <button
                    className={`rating-btn ${feedbackRating === 'negative' ? 'active-neg' : ''}`}
                    onClick={() => handleRatingSubmit('negative')}
                  >
                    👎 Kurang Natural
                  </button>
                </div>
              )}
            </div>

            <div className="panel-cta-bar output-cta-bar">
              <button
                className="btn btn-outline"
                disabled={!rawHumanizedResult || isTyping}
                onClick={() => startTypingSimulator(rawHumanizedResult, speed)}
              >
                Ulangi Ketik
              </button>
              <button
                className="btn btn-outline"
                disabled={!rawHumanizedResult}
                onClick={handleDownloadTxt}
              >
                Unduh TXT
              </button>
              <button
                className="btn btn-primary"
                disabled={!isWordCountValid || isHumanizing}
                onClick={handleHumanize}
              >
                Re-Humanize
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: Dataset Riset & Riwayat Uji Coba (Tahap 1 Roadmap) */}
      {isResearchModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsResearchModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--emerald-400)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Tahap 1 Roadmap: Riset & Pembelajaran Prompt
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Dataset Uji Coba Perubahan Teks AI → Human</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsResearchModalOpen(false)}>
                &times;
              </button>
            </div>

            {/* Summary Statistics */}
            <div className="dataset-summary-grid">
              <div className="dataset-stat-card">
                <div className="stat-value">{researchData.analytics.totalExperiments || 0}</div>
                <div className="stat-label">Total Uji Coba</div>
              </div>
              <div className="dataset-stat-card">
                <div className="stat-value">{researchData.analytics.avgHumanScore || 0}%</div>
                <div className="stat-label">Rata-rata Skor Human</div>
              </div>
              <div className="dataset-stat-card">
                <div className="stat-value">+{researchData.analytics.avgImprovement || 0}%</div>
                <div className="stat-label">Peningkatan Rata-rata</div>
              </div>
              <div className="dataset-stat-card">
                <div className="stat-value" style={{ color: '#60a5fa' }}>
                  {researchData.analytics.positiveRatings || 0} 👍
                </div>
                <div className="stat-label">Feedback Positif</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px' }}>
              Riwayat Eksperimen Terbaru:
            </h4>

            {researchData.experiments?.length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-subtle)', padding: '20px 0', textAlign: 'center' }}>
                Belum ada data uji coba tersimpan. Lakukan konversi pertama untuk mulai mencatat dataset!
              </p>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {researchData.experiments.slice(0, 15).map(exp => (
                  <div key={exp.id} className="history-item-card">
                    <div className="history-item-header">
                      <span>Tone: <strong>{exp.tone}</strong> &bull; {exp.providerUsed}</span>
                      <span style={{ color: 'var(--emerald-400)', fontWeight: 700 }}>
                        {exp.humanScoreResult}% Human (+{exp.scoreImprovement}%)
                      </span>
                    </div>
                    <div className="history-snippet">
                      <strong>Hasil:</strong> {exp.humanizedText}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(researchData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `dataset-research-humanizer-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast('Dataset riset berhasil diunduh (JSON).');
                }}
              >
                💾 Export Dataset JSON
              </button>
              <button className="btn btn-secondary" onClick={() => setIsResearchModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Login & Autentikasi Pengguna (Kebutuhan 2.b) */}
      {isAuthModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAuthModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--emerald-400)', fontWeight: 700 }}>
                  Autentikasi Pengguna
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Masuk ke Humanizer</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAuthModalOpen(false)}>
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Sesuai ketentuan, Anda perlu masuk akun untuk mengakses kuota 2.500 kata harian.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <input
                type="email"
                placeholder="Email (contoh: peneliti@kampus.ac.id)"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: 'var(--text-main)',
                  fontSize: '0.86rem',
                  outline: 'none'
                }}
              />
              <input
                type="password"
                placeholder="Kata Sandi"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: 'var(--text-main)',
                  fontSize: '0.86rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleQuickLogin}>
                Masuk / Buat Akun
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setAuthEmail('demo@humanizer.ai');
                  handleQuickLogin();
                }}
              >
                ⚡ Masuk Akun Demo (1-Klik)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`toast ${toastMessage ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </>
  );
}
