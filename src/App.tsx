import { useState, useEffect } from "react";
import {
  Scissors,
  Settings,
  Copy,
  RefreshCw,
  Sparkles,
  BookOpen,
  Compass,
  ListTodo,
  Flame,
  FileText,
  X,
  Key,
  Info
} from "lucide-react";
import "./App.css";
import { tailorDiary, type DiaryStyle, STYLE_LABELS } from "./services/gemini";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

function App() {
  // ステート管理
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<DiaryStyle>("essay");
  const [instruction, setInstruction] = useState("");

  // APIキーの読み込み（LocalStorage 優先、なければ Vite 環境変数）
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      localStorage.getItem("detailor_api_key") ||
      (import.meta.env.VITE_GEMINI_API_KEY as string) ||
      ""
    );
  });

  const [tempApiKey, setTempApiKey] = useState(apiKey); // 設定モーダル用の一時入力キー
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoredTitle, setTailoredTitle] = useState("");
  const [tailoredContent, setTailoredContent] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // APIキーが変更されたら LocalStorage に同期する
  const saveApiKey = (newKey: string) => {
    const trimmedKey = newKey.trim();
    setApiKey(trimmedKey);
    localStorage.setItem("detailor_api_key", trimmedKey);
    setIsConfigOpen(false);
    showToast("APIキーを保存しました。");
  };

  // APIキーを削除する
  const deleteApiKey = () => {
    setApiKey("");
    setTempApiKey("");
    localStorage.removeItem("detailor_api_key");
    setIsConfigOpen(false);
    showToast("APIキーを削除しました。");
  };

  // モーダルを開いたときに、現在設定されているキーをコピー
  useEffect(() => {
    if (isConfigOpen) {
      setTempApiKey(apiKey);
    }
  }, [isConfigOpen, apiKey]);

  // トーストメッセージ表示用
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 日記を仕立てる (APIコール)
  const handleTailor = async () => {
    if (!title.trim() && !content.trim()) {
      showToast("タイトルと本文のどちらかを入力してください。", "error");
      return;
    }



    setIsTailoring(true);
    try {
      const result = await tailorDiary({
        title,
        content,
        style: selectedStyle,
        apiKey,
        instruction
      });
      setTailoredTitle(result.title);
      setTailoredContent(result.content);
      showToast("日記が美しく仕立て上がりました！");
    } catch (error: any) {
      showToast(error.message || "仕立てに失敗しました。", "error");
    } finally {
      setIsTailoring(false);
    }
  };

  // タイトルのコピー機能
  const handleCopyTitle = async () => {
    if (!tailoredTitle) return;
    try {
      await navigator.clipboard.writeText(tailoredTitle);
      showToast("タイトルをコピーしました！");
    } catch (err) {
      showToast("タイトルのコピーに失敗しました。", "error");
    }
  };

  // 本文のコピー機能
  const handleCopyContent = async () => {
    if (!tailoredContent) return;
    try {
      await navigator.clipboard.writeText(tailoredContent);
      showToast("本文をコピーしました！");
    } catch (err) {
      showToast("本文のコピーに失敗しました。", "error");
    }
  };

  // スタイルのアイコンマッピング
  const getStyleIcon = (style: DiaryStyle, size = 18) => {
    switch (style) {
      case "essay":
        return <BookOpen size={size} />;
      case "novel":
        return <Compass size={size} />;
      case "bullet":
        return <ListTodo size={size} />;
      case "viral":
        return <Flame size={size} />;
      case "blog":
        return <FileText size={size} />;
    }
  };

  return (
    <div className="app-container">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="brand-section">
          <h1 className="brand-title text-gold-gradient">
            <Scissors size={28} className="placeholder-icon" style={{ transform: "rotate(-45deg)" }} />
            DeTailor
          </h1>
          <span className="brand-subtitle">Diary Tailoring Service</span>
        </div>
        <div className="header-actions">
          <button
            className="btn-outline"
            onClick={() => setIsConfigOpen(true)}
            title="APIキー設定"
          >
            <Settings size={18} />
            <span>設定</span>
          </button>
        </div>
      </header>

      {/* メインレイアウト */}
      <main className="app-layout">

        {/* 左側: 採寸 (インプット) */}
        <section className="glass-panel stitch-border input-panel">

          <div className="input-section">
            <h2 className="panel-title">1. 日記の採寸 (入力)</h2>

            <div className="form-group">
              <label htmlFor="diary-title" className="form-label-sub">
                タイトル (必須または省略可)
              </label>
              <input
                id="diary-title"
                type="text"
                className="input-field"
                placeholder="今日を一言で表すと？ (例: 運命のランチ、雨の日曜日)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isTailoring}
              />
            </div>

            <div className="form-group">
              <label htmlFor="diary-notes" className="form-label-sub">
                出来事のメモ・キーワード
              </label>
              <textarea
                id="diary-notes"
                className="input-field textarea-field"
                placeholder="今日の出来事や感情のメモを自由に入力してください。短いフレーズでも大丈夫です。(例: 近所の犬と目が合った。美味いパン屋を見つけた)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isTailoring}
              />
            </div>
          </div>

          <div className="input-section">
            <h2 className="panel-title">2. 仕立てスタイルの選択</h2>
            <div className="style-selector">
              {(["essay", "novel", "bullet", "blog", "viral"] as DiaryStyle[]).map(
                (style) => (
                  <div
                    key={style}
                    className={`style-option ${selectedStyle === style ? "selected" : ""
                      }`}
                    onClick={() => !isTailoring && setSelectedStyle(style)}
                  >
                    <div className="style-icon-wrapper">
                      {getStyleIcon(style, 20)}
                    </div>
                    <span className="style-name">{STYLE_LABELS[style]}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="input-section">
            <h2 className="panel-title">3. 詳細なオーダー (オプションの指示)</h2>
            <div className="form-group">
              <textarea
                id="diary-instruction"
                className="input-field"
                placeholder="追加の仕立て要望があれば入力してください。(例: ポジティブに、英語を交えて、句読点多め)"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={isTailoring}
                style={{ minHeight: "40px", resize: "none", overflow: "hidden" }}
              />
            </div>
          </div>

          <button
            className="btn-gold"
            onClick={handleTailor}
            disabled={isTailoring}
            style={{ marginTop: "10px" }}
          >
            <Sparkles size={18} />
            {isTailoring ? "日記を仕立て中..." : "日記を仕立てる"}
          </button>
        </section>

        {/* 右側: 仕立て上がり (プレビュー・エディタ) */}
        <section className="glass-panel stitch-border output-panel">
          {isTailoring ? (
            // 仕立て中ローディング
            <div className="tailor-loading-container" style={{ flexGrow: 1 }}>
              <div className="needle-thread">
                <div className="needle"></div>
                <div className="thread"></div>
              </div>
              <p className="placeholder-text text-gold-gradient">
                言葉の生地を選び、<br />日記を縫い合わせています...
              </p>
              <p className="style-badge">
                {STYLE_LABELS[selectedStyle]}仕立て
              </p>
            </div>
          ) : (tailoredTitle || tailoredContent) ? (
            // 仕立て上がり
            <>
              <div className="output-header">
                <div className="output-meta">
                  <span className="style-badge">
                    {STYLE_LABELS[selectedStyle]}仕立て
                  </span>
                  <span>仕立て上がり</span>
                </div>
                <div className="output-actions">
                  <button
                    className="btn-gold"
                    onClick={handleTailor}
                    title="仕立て直す"
                    style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                  >
                    <RefreshCw size={16} />
                    <span>再仕立て</span>
                  </button>
                </div>
              </div>
              <div className="editor-container" style={{ display: "flex", flexDirection: "column", gap: "20px", flexGrow: 1 }}>

                {/* 仕立てられたタイトル */}
                <div className="form-group" style={{ flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label htmlFor="tailored-title" className="form-label" style={{ marginBottom: 0 }}>
                      仕立てられたタイトル
                    </label>
                    <button
                      className="btn-outline"
                      onClick={handleCopyTitle}
                      title="タイトルをコピー"
                      style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <Copy size={12} />
                      <span>コピー</span>
                    </button>
                  </div>
                  <input
                    id="tailored-title"
                    type="text"
                    className="input-field"
                    value={tailoredTitle}
                    onChange={(e) => setTailoredTitle(e.target.value)}
                    placeholder="仕立てられたタイトル..."
                    style={{ fontSize: "1.1rem", fontWeight: "600", fontFamily: "var(--font-serif)" }}
                  />
                </div>

                {/* 仕立てられた本文 */}
                <div className="form-group" style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexShrink: 0 }}>
                    <label htmlFor="tailored-content" className="form-label" style={{ marginBottom: 0 }}>
                      仕立てられた本文
                    </label>
                    <button
                      className="btn-outline"
                      onClick={handleCopyContent}
                      title="本文をコピー"
                      style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <Copy size={12} />
                      <span>コピー</span>
                    </button>
                  </div>
                  <textarea
                    id="tailored-content"
                    className="diary-editor"
                    value={tailoredContent}
                    onChange={(e) => setTailoredContent(e.target.value)}
                    placeholder="仕立てられた本文..."
                    style={{ flexGrow: 1 }}
                  />
                </div>

              </div>
            </>
          ) : (
            // プレースホルダー
            <div className="output-placeholder">
              <Scissors
                size={48}
                className="placeholder-icon"
                style={{ strokeWidth: 1 }}
              />
              <p className="placeholder-text">仕立てられた日記はここに表示されます</p>
              <p className="placeholder-subtext">
                左側のパネルにタイトルや出来事のメモを入力し、「日記を仕立てる」ボタンを押すと、AIが美しい日記へ仕立て上げます。
              </p>
            </div>
          )}
        </section>
      </main>

      {/* 設定モーダル */}
      {isConfigOpen && (
        <div className="modal-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title text-gold-gradient">
                <Key size={20} style={{ marginRight: "8px", verticalAlign: "middle" }} />
                Gemini API 設定
              </h3>
              <button className="close-btn" onClick={() => setIsConfigOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="help-text">
                本アプリは、ブラウザから直接 Google Gemini API を安全に呼び出します。
                APIキーはあなたのブラウザのローカルストレージにのみ保存され、外部サーバーへ送信されることはありません。
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="api-key-input">
                  Gemini API キー
                </label>
                <input
                  id="api-key-input"
                  type="password"
                  className="input-field"
                  placeholder="AQ.Ab..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  fontSize: "0.8rem",
                  color: "var(--color-text-secondary)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "10px",
                  borderRadius: "6px"
                }}
              >
                <Info size={24} style={{ color: "var(--gold-primary)", flexShrink: 0 }} />
                <div>
                  APIキーをお持ちでない場合は、無料で取得できます。
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="help-link"
                    style={{ marginLeft: "4px" }}
                  >
                    Google AI Studio
                  </a>
                  で取得してください。
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {apiKey && (
                <button
                  className="btn-outline"
                  onClick={deleteApiKey}
                  style={{
                    borderColor: "var(--danger-color)",
                    color: "var(--danger-color)",
                    marginRight: "auto"
                  }}
                >
                  削除する
                </button>
              )}
              <button
                className="btn-outline"
                onClick={() => setIsConfigOpen(false)}
              >
                キャンセル
              </button>
              <button
                className="btn-gold"
                onClick={() => saveApiKey(tempApiKey)}
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.type === "error" ? "error" : ""}`}
            onClick={() => removeToast(toast.id)}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
