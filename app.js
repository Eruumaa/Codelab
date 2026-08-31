/* ═══════════════════════════════════════════════════════════════════════
   Codelab by Informatics 25 — Master SPA Application Controller
   Splashscreen, Moving Pixel Hero, Aslab Live Chat & Full Profile
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── Configuration & Endpoints ───
  const API_BASE = (typeof window !== "undefined" && window.location.origin && !window.location.origin.startsWith("file:"))
    ? window.location.origin
    : "http://localhost:8000";

  const CONFIG = {
    API_BASE: API_BASE,
    ENDPOINTS: {
      MATERIALS: `${API_BASE}/materials`,
      ASSIGNMENTS: `${API_BASE}/assignments`,
      QUIZZES: `${API_BASE}/quizzes`,
      ARTICLES: `${API_BASE}/articles`,
      EXECUTE: `${API_BASE}/execute`,
      USERS: `${API_BASE}/users`,
      PROGRESS: `${API_BASE}/users/progress`,
      SUBMISSIONS: `${API_BASE}/submissions`,
      LEADERBOARD: `${API_BASE}/leaderboard`,
      LIVESCORE: `${API_BASE}/livescore`,
      LIVESCORE_SUBMIT: `${API_BASE}/livescore/submit`,
      ASLAB_ACCOUNTS: `${API_BASE}/aslab/accounts`,
      ASLAB_LOGIN: `${API_BASE}/aslab/login`,
      CHAT: `${API_BASE}/chat/messages`
    },
    STORAGE_KEYS: {
      CURRENT_USER: "codelab_active_user",
      LAST_PAGE: "codelab_last_page",
      LAST_MAT_IDX: "codelab_last_mat_idx",
      ASLAB_AUTH: "codelab_aslab_auth_token",
      THEME: "codelab_theme_mode"
    }
  };

  // ─── Application State ───
  const state = {
    currentPage: "dashboard", // 'landing' | 'dashboard' | 'course' | 'assignment' | 'quiz' | 'leaderboard' | 'materials' | 'ide' | 'workspace' | 'profile' | 'aslab'
    materials: [],
    assignments: [],
    quizzes: [],
    activeQuiz: null,
    activeQuizQuestionIndex: 0,
    quizAnswers: {},
    quizTimerSecondsRemaining: 0,
    quizTimerInterval: null,
    quizFilter: "all",
    aslabQuizBuilderQuestions: [],
    articles: [],
    leaderboard: [],
    liveScores: [],
    chatMessages: [],
    filteredCategory: "all",
    users: [],
    currentUser: null,
    isAslabAuthenticated: false,
    activeMaterialIndex: 0,
    currentLanguage: "c",
    pureLanguage: "c",
    activeTaskToSubmit: null,
    aslabTab: "modules",

    // Workspace Code Store (Empty starter so students think and write themselves)
    workspaceCode: {
      c: `#include <stdio.h>

int main() {
    // Tulis kode program C Anda di sini sesuai petunjuk praktikum
    
    return 0;
}`,
      python: `# Tulis kode program Python Anda di sini
def main():
    pass

if __name__ == "__main__":
    main()`
    },

    // Pure IDE Code Store (Clean blank canvas for free exploration)
    pureCode: {
      c: `#include <stdio.h>

int main() {
    printf("Hello from Codelab IDE!\\n");
    return 0;
}`,
      python: `# Codelab Python IDE
print("Hello from Python IDE!")`
    },

    workspaceEditor: null,
    pureEditor: null,
    isExecuting: false,
    heroCanvasAnimId: null
  };

  // ─── Toast Notification System ───
  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ─── Splashscreen Controller ───
  function initSplashscreen() {
    const splash = document.getElementById("app-splashscreen");
    if (!splash) return;

    // After the IF Logo pops in and "Codelab" slides out gracefully from behind the logo (1.8s)
    setTimeout(() => {
      splash.classList.add("fade-out");
      setTimeout(() => { splash.style.display = "none"; }, 600);
    }, 1800);
  }

  // ─── Moving Pixel Hero Background Canvas ───
  function initHeroPixelCanvas() {
    const canvas = document.getElementById("hero-pixel-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.parentElement.offsetWidth;
    let height = canvas.height = canvas.parentElement.offsetHeight;

    window.addEventListener("resize", () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    });

    // Generate 60 pixel stars and twinkling sparks
    const stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() > 0.8 ? 3 : (Math.random() > 0.4 ? 2 : 1),
        alpha: Math.random(),
        speed: (Math.random() * 0.02) + 0.005,
        driftX: (Math.random() - 0.5) * 0.3,
        color: Math.random() > 0.6 ? "#ffd43b" : (Math.random() > 0.3 ? "#38bdf8" : "#ffffff")
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      stars.forEach(star => {
        star.alpha += star.speed;
        star.x += star.driftX;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;

        const currentAlpha = Math.abs(Math.sin(star.alpha));
        ctx.fillStyle = star.color;
        ctx.globalAlpha = currentAlpha * 0.85;
        // Crisp pixel rect
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
      });

      ctx.globalAlpha = 1.0;
      state.heroCanvasAnimId = requestAnimationFrame(render);
    }

    render();
  }

  // ─── CodeMirror Initialization ───
  function initWorkspaceCodeMirror() {
    const mount = document.getElementById("codemirror-mount-point");
    if (!mount || state.workspaceEditor) return;

    state.workspaceEditor = CodeMirror(mount, {
      value: state.workspaceCode[state.currentLanguage],
      mode: state.currentLanguage === "c" ? "text/x-csrc" : "python",
      theme: "material-darker",
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      tabSize: 4,
      indentUnit: 4,
      indentWithTabs: false,
      lineWrapping: false,
      extraKeys: {
        "Ctrl-Enter": () => executeCode("workspace"),
        "Cmd-Enter": () => executeCode("workspace"),
        Tab: function (cm) { cm.replaceSelection("    ", "end"); }
      }
    });

    state.workspaceEditor.on("change", () => {
      state.workspaceCode[state.currentLanguage] = state.workspaceEditor.getValue();
    });
  }

  function initPureCodeMirror() {
    const mount = document.getElementById("pure-codemirror-mount");
    if (!mount || state.pureEditor) return;

    state.pureEditor = CodeMirror(mount, {
      value: state.pureCode[state.pureLanguage],
      mode: state.pureLanguage === "c" ? "text/x-csrc" : "python",
      theme: "material-darker",
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      tabSize: 4,
      indentUnit: 4,
      indentWithTabs: false,
      lineWrapping: false,
      extraKeys: {
        "Ctrl-Enter": () => executeCode("pure"),
        "Cmd-Enter": () => executeCode("pure"),
        Tab: function (cm) { cm.replaceSelection("    ", "end"); }
      }
    });

    state.pureEditor.on("change", () => {
      state.pureCode[state.pureLanguage] = state.pureEditor.getValue();
    });
  }

  // ─── Page Router (DOM Manipulation & Guest Route Protection) ───
  function switchPage(pageName) {
    const isGuest = !state.currentUser;
    const guestAllowedPages = ["landing", "course", "ide"];

    // If logged in, redirect landing/explore to dashboard / aslab
    if (!isGuest && pageName === "landing") {
      pageName = state.isAslabAuthenticated ? "aslab" : "dashboard";
    }

    if (pageName === "aslab") {
      if (!state.isAslabAuthenticated) {
        showToast("🔒 Masukkan PIN Asisten Lab untuk membuka Aslab Studio", "info");
        openAuthModal("aslab");
        return;
      }
    } else if (isGuest && !guestAllowedPages.includes(pageName)) {
      showToast("Silakan login atau daftar akun praktikan untuk mengakses fitur ini!", "info");
      openAuthModal("login");
      return;
    }

    state.currentPage = pageName;
    if (!isGuest) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_PAGE, pageName);
    }

    // Hide all pages, display target
    document.querySelectorAll(".app-page").forEach((page) => {
      page.classList.remove("active-page");
    });
    const targetPage = document.getElementById(`view-${pageName}`);
    if (targetPage) targetPage.classList.add("active-page");

    // Update active nav button
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.target === pageName);
    });

    // Page-specific setup
    if (pageName === "workspace") {
      initWorkspaceCodeMirror();
      setTimeout(() => {
        if (state.workspaceEditor) {
          state.workspaceEditor.refresh();
          state.workspaceEditor.focus();
        }
      }, 50);
    } else if (pageName === "ide") {
      initPureCodeMirror();
      setTimeout(() => {
        if (state.pureEditor) {
          state.pureEditor.refresh();
          state.pureEditor.focus();
        }
      }, 50);
    } else if (pageName === "assignment") {
      renderAssignments();
    } else if (pageName === "quiz") {
      exitQuizPlayer();
      fetchQuizzes();
    } else if (pageName === "profile") {
      renderUserProfilePage();
    } else if (pageName === "aslab") {
      loadAslabDashboard();
    } else if (pageName === "course") {
      renderCourseCurriculum();
    } else if (pageName === "dashboard") {
      renderDashboard();
    } else if (pageName === "leaderboard") {
      fetchLeaderboard();
      fetchLiveScores();
    } else if (pageName === "materials") {
      fetchArticles();
      renderArticlesList();
    }

    if (targetPage) targetPage.scrollTop = 0;
  }

  // ─── User Profile & Role Controller ───
  async function fetchUsers() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.USERS);
      if (!res.ok) throw new Error("Fetch users failed");
      state.users = await res.json();
    } catch (e) {
      console.warn("Database users empty or unreachable", e);
      state.users = [];
    }

    // Check saved Aslab Token
    const savedToken = sessionStorage.getItem(CONFIG.STORAGE_KEYS.ASLAB_AUTH);
    if (savedToken) {
      state.isAslabAuthenticated = true;
    }

    const savedUsername = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
    const found = savedUsername ? (state.users.find(u => u.username === savedUsername) || null) : null;
    setCurrentUser(found);
  }

  function setCurrentUser(user) {
    state.currentUser = user;
    if (user) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, user.username);
    } else {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
    }

    const isAslab = user && user.role === "aslab" && state.isAslabAuthenticated;

    // Topbar Profile Pill
    const navAvatar = document.getElementById("nav-user-avatar");
    const navName = document.getElementById("nav-user-name");
    const navXp = document.getElementById("nav-user-xp");
    const navStreak = document.getElementById("nav-user-streak");
    const roleBadge = document.getElementById("nav-user-role-badge");

    if (navAvatar) navAvatar.textContent = user ? (user.avatar || "👨‍💻") : "👤";
    if (navName) navName.textContent = user ? user.name : "Belum Login";
    if (navXp) navXp.textContent = `${user ? (user.xp || 0) : 0} XP`;
    if (navStreak) navStreak.textContent = user ? (user.streak || 0) : 0;

    if (roleBadge) {
      roleBadge.textContent = isAslab ? "ASISTEN LAB" : (user ? "PRAKTIKAN" : "TAMU");
      roleBadge.style.color = isAslab ? "var(--accent-gold)" : (user ? "var(--accent-cyan)" : "var(--text-muted)");
    }

    // Topbar Authentication State
    const authElements = document.querySelectorAll(".user-auth-only");
    const guestElements = document.querySelectorAll(".guest-only");
    const regBtn = document.getElementById("btn-open-register-modal");
    if (user) {
      authElements.forEach(el => el.style.display = "inline-flex");
      guestElements.forEach(el => el.style.display = "none");
      if (regBtn) regBtn.style.display = "none";
    } else {
      authElements.forEach(el => el.style.display = "none");
      guestElements.forEach(el => el.style.display = "inline-flex");
      if (regBtn) regBtn.style.display = "inline-flex";
    }

    // Toggle Aslab Nav Button visibility
    const aslabNavBtn = document.getElementById("nav-btn-aslab");
    const aslabSideBlocks = document.querySelectorAll(".aslab-only-block");
    if (isAslab) {
      if (aslabNavBtn) aslabNavBtn.style.display = "inline-flex";
      aslabSideBlocks.forEach(b => b.style.display = "block");
    } else {
      if (aslabNavBtn) aslabNavBtn.style.display = "none";
      aslabSideBlocks.forEach(b => b.style.display = "none");
    }

    // Update Dashboard Sidebar Widgets
    const sideAvatar = document.getElementById("side-user-avatar");
    const sideName = document.getElementById("side-user-name");
    const sideLvl = document.getElementById("side-user-level-label");
    const sideXp = document.getElementById("side-stat-xp");
    const sideStreak = document.getElementById("side-stat-streak");
    const sideComp = document.getElementById("side-stat-completed");
    const sideBadges = document.getElementById("side-stat-badges");

    if (sideAvatar) sideAvatar.textContent = user ? (user.avatar || "👨‍💻") : "👤";
    if (sideName) sideName.textContent = user ? user.name : "Praktikan Baru";
    if (sideLvl) sideLvl.textContent = user ? `Level ${user.level || 1} ${isAslab ? 'Master' : 'Cadet'}` : "Silakan Daftar";
    if (sideXp) sideXp.textContent = user ? (user.xp || 0) : 0;
    if (sideStreak) sideStreak.textContent = user ? (user.streak || 0) : 0;

    const completedCount = (user?.completed_materials || []).length;
    if (sideComp) sideComp.textContent = `${completedCount} / ${state.materials.length || 9}`;
    if (sideBadges) sideBadges.textContent = completedCount;

    renderCourseCurriculum();
    renderDashboard();
    if (state.currentPage === "profile") renderUserProfilePage();
  }

  // ─── Profile Page Renderer (Matching Erumaa.png) ───
  function renderUserProfilePage() {
    const u = state.currentUser || {
      name: "Praktikan Baru",
      username: "tamu",
      nim: "-",
      role: "praktikan",
      avatar: "👤",
      banner: "",
      xp: 0,
      level: 1,
      streak: 0,
      completed_materials: []
    };

    const isAslab = u.role === "aslab" && state.isAslabAuthenticated;
    const completed = Array.isArray(u.completed_materials) ? u.completed_materials : [];

    const avEl = document.getElementById("prof-avatar-display");
    const nameEl = document.getElementById("prof-name-display");
    const userEl = document.getElementById("prof-username-display");
    const nimEl = document.getElementById("prof-nim-display");
    const roleEl = document.getElementById("prof-role-display");
    const rankEl = document.getElementById("prof-side-rank");

    if (avEl) avEl.textContent = u.avatar || (isAslab ? "👑" : "👨‍💻");
    if (nameEl) nameEl.textContent = u.name;
    if (userEl) userEl.textContent = `@${u.username}`;
    if (nimEl) nimEl.textContent = u.nim;
    if (roleEl) {
      roleEl.textContent = isAslab ? "ASISTEN LABORATORIUM" : "PRAKTIKAN";
      roleEl.style.color = isAslab ? "var(--accent-gold)" : "var(--accent-cyan)";
    }

    // Custom Banner Background
    const bannerBg = document.getElementById("profile-banner-bg");
    if (bannerBg) {
      if (u.banner && u.banner.trim()) {
        if (u.banner.startsWith("http") || u.banner.startsWith("Assets/") || u.banner.startsWith("data:")) {
          bannerBg.style.backgroundImage = `url('${u.banner}')`;
          bannerBg.style.backgroundSize = "cover";
          bannerBg.style.backgroundPosition = "center";
        } else {
          bannerBg.style.background = u.banner;
        }
      } else {
        bannerBg.style.background = isAslab
          ? "linear-gradient(135deg, #0c1c4d 0%, #1e1035 100%)"
          : "radial-gradient(circle at 75% 25%, #312e81 0%, #1e3a8a 45%, #064e3b 85%, #022c22 100%)";
      }
    }

    // Calculate Rank
    let rank = isAslab ? "👑 Master Aslab" : "Cadet";
    if (!isAslab) {
      if (u.xp >= 500) rank = "Master 🏆";
      else if (u.xp >= 300) rank = "Gold 🥇";
      else if (u.xp >= 150) rank = "Silver 🥈";
      else if (u.xp >= 50) rank = "Bronze 🥉";
    }
    if (rankEl) rankEl.textContent = rank;

    // Render Completed Materials list
    const compList = document.getElementById("prof-completed-materials-list");
    if (compList) {
      compList.innerHTML = "";
      if (completed.length === 0) {
        compList.innerHTML = "<p style='color: var(--text-muted); font-size: 0.86rem;'>Belum ada modul yang diselesaikan. Buka Course Map untuk mulai praktikum!</p>";
      } else {
        completed.forEach((matId) => {
          const mat = state.materials.find(m => m.id === matId);
          if (mat) {
            const item = document.createElement("div");
            item.className = "prof-comp-item";
            item.innerHTML = `
              <div>
                <strong style="color: var(--text-primary);">${mat.title}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${mat.category}</div>
              </div>
              <span style="color: var(--accent-green); font-family: var(--font-pixel); font-size: 0.62rem;">✓ SELESAI (+${mat.xp_reward || 50} XP)</span>
            `;
            compList.appendChild(item);
          }
        });
      }
    }

    // Render Assignments Summary
    const assignList = document.getElementById("prof-assignments-list");
    if (assignList) {
      assignList.innerHTML = "";
      state.assignments.forEach((ass) => {
        const item = document.createElement("div");
        item.className = "prof-comp-item";
        item.innerHTML = `
          <div>
            <strong style="color: var(--text-primary);">${ass.title}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${ass.category} • ${ass.deadline || 'Sesi Praktikum'}</div>
          </div>
          <span style="color: var(--accent-cyan); font-family: var(--font-pixel); font-size: 0.62rem;">+${ass.points || 100} POIN</span>
        `;
        assignList.appendChild(item);
      });
    }
  }

  // ─── Floating Aslab Live Chat Controller (Matching Chat.png) ───
  async function fetchChatMessages() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.CHAT);
      if (!res.ok) throw new Error("Fetch chat failed");
      state.chatMessages = await res.json();
      renderChatMessages();
    } catch (e) {
      console.warn("Chat fetch warning:", e);
    }
  }

  function renderChatMessages() {
    const stream = document.getElementById("chat-messages-stream");
    if (!stream) return;
    stream.innerHTML = "";

    if (state.chatMessages.length === 0) {
      stream.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <span style="font-size: 2rem; margin-bottom: 8px;">💬</span>
          <strong style="color: var(--text-primary); font-size: 0.9rem;">Belum ada pesan</strong>
          <p style="font-size: 0.78rem; margin-top: 4px; line-height: 1.4;">Tanyakan kendala koding, petunjuk modul, atau diskusikan error compiler langsung ke Aslab!</p>
        </div>
      `;
      return;
    }

    state.chatMessages.forEach((msg) => {
      const isAslab = msg.role === "aslab";
      const wrap = document.createElement("div");
      wrap.className = `chat-bubble-wrap ${isAslab ? 'aslab-msg' : 'student-msg'}`;
      wrap.innerHTML = `
        <div class="chat-msg-sender">
          <span>${msg.avatar || (isAslab ? '👑' : '👨‍💻')}</span>
          <strong>${msg.sender_name || 'Praktikan'}</strong>
          <span>• ${msg.timestamp || ''}</span>
        </div>
        <div class="chat-bubble">
          ${escapeHtml(msg.text)}
        </div>
      `;
      stream.appendChild(wrap);
    });

    stream.scrollTop = stream.scrollHeight;
  }

  async function sendChatMessage(text) {
    if (!text || !text.trim()) return;
    const user = state.currentUser || {
      username: "tamu",
      name: "Praktikan Tamu",
      avatar: "👨‍💻",
      role: "praktikan"
    };

    const isAslab = user.role === "aslab" && state.isAslabAuthenticated;

    try {
      const res = await fetch(CONFIG.ENDPOINTS.CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          sender_name: user.name,
          avatar: isAslab ? "👑" : (user.avatar || "👨‍💻"),
          role: isAslab ? "aslab" : "praktikan",
          text: text.trim()
        })
      });

      if (!res.ok) throw new Error("Gagal mengirim pesan");
      document.getElementById("chat-input-field").value = "";
      await fetchChatMessages();
    } catch (e) {
      showToast("Gagal mengirim chat: " + e.message, "error");
    }
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ─── API: GET /materials ───
  async function fetchMaterials() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.MATERIALS);
      if (!res.ok) throw new Error("Fetch materials failed");
      const data = await res.json();
      state.materials = Array.isArray(data) && data.length > 0 ? data : [];
    } catch (e) {
      console.warn("Using default materials fallback", e);
    }

    renderLandingCards();
    renderDashboard();
    renderCourseCurriculum();
    loadMaterial(0);
  }

  // ─── API: GET /assignments ───
  async function fetchAssignments() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.ASSIGNMENTS);
      if (!res.ok) throw new Error("Fetch assignments failed");
      state.assignments = await res.json();
    } catch (e) {
      console.warn("Using fallback assignments", e);
    }
  }

  // ─── Landing Page Renderer ───
  function renderLandingCards() {
    const grid = document.getElementById("landing-cards-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = state.materials.filter((m) => {
      if (state.filteredCategory === "all") return true;
      return m.category === state.filteredCategory;
    });

    filtered.forEach((mat) => {
      const idx = state.materials.findIndex(x => x.id === mat.id);
      const isC = (mat.language || "c").toLowerCase() === "c";
      const card = document.createElement("div");
      card.className = "l-course-card";
      card.innerHTML = `
        <div>
          <div class="l-card-top">
            <span class="l-card-tag">${mat.category ? mat.category.toUpperCase() : (isC ? 'BAHASA C (GCC)' : 'PYTHON 3.9')}</span>
            <span style="font-family: var(--font-pixel); font-size: 0.55rem; color: var(--accent-green);">MODUL #${mat.id}</span>
          </div>
          <h3 class="l-card-title">${mat.title}</h3>
          <p class="l-card-desc">${mat.summary || 'Pelajari konsep materi kurikulum praktikum dan tulis program C mandiri.'}</p>
        </div>
        <div class="l-card-footer">
          <span>+${mat.xp_reward || 50} XP</span>
          <span>Buka Modul →</span>
        </div>
      `;
      card.addEventListener("click", () => {
        loadMaterial(idx >= 0 ? idx : 0);
        switchPage("workspace");
      });
      grid.appendChild(card);
    });
  }

  // ─── Dashboard Renderer ───
  function renderDashboard() {
    const activeMat = state.materials[state.activeMaterialIndex] || state.materials[0];
    if (activeMat) {
      const elTitle = document.getElementById("dash-active-course-title");
      const elNext = document.getElementById("dash-next-exercise-label");
      if (elTitle) elTitle.textContent = activeMat.title;
      if (elNext) elNext.textContent = activeMat.title;
    }

    const progRow = document.getElementById("dash-progress-cards");
    if (progRow) {
      progRow.innerHTML = "";
      state.materials.forEach((mat, idx) => {
        const isCompleted = (state.currentUser?.completed_materials || []).includes(mat.id);
        const card = document.createElement("div");
        card.className = "dash-prog-card";
        card.innerHTML = `
          <div class="prog-card-top">
            <span class="chip-lang-badge ${mat.language === 'python' ? 'py' : 'c'}">${mat.category || mat.language.toUpperCase()}</span>
            <span style="font-family: var(--font-pixel); font-size: 0.58rem; color: ${isCompleted ? 'var(--accent-green)' : 'var(--accent-gold)'};">
              ${isCompleted ? '✓ SELESAI' : 'PRAKTIKUM'}
            </span>
          </div>
          <h4 class="prog-card-title">${mat.title}</h4>
          <div class="bar-track" style="margin-top: 4px;"><div class="bar-fill ${isCompleted ? '' : 'gold'}" style="width: ${isCompleted ? '100%' : '0%'};"></div></div>
        `;
        card.addEventListener("click", () => {
          loadMaterial(idx);
          switchPage("workspace");
        });
        progRow.appendChild(card);
      });
    }
  }

  // ─── Course Curriculum Roadmap Renderer ───
  function renderCourseCurriculum() {
    const tree = document.getElementById("course-chapters-tree");
    if (!tree) return;
    tree.innerHTML = "";

    const userCompleted = state.currentUser?.completed_materials || [];

    state.materials.forEach((mat, idx) => {
      const isCompleted = userCompleted.includes(mat.id);
      const card = document.createElement("div");
      card.className = "curriculum-chapter-card";
      card.innerHTML = `
        <div class="chapter-card-header">
          <div class="chapter-header-left">
            <div class="chapter-status-dot ${isCompleted ? 'completed' : ''}">
              ${isCompleted ? '✓' : (idx + 1)}
            </div>
            <span class="chapter-title-text">${mat.title}</span>
          </div>
          <span style="font-family: var(--font-pixel); font-size: 0.6rem; color: var(--accent-gold);">
            ${isCompleted ? 'SELESAI' : '+ ' + (mat.xp_reward || 50) + ' XP'}
          </span>
        </div>
        <div class="chapter-nested-list">
          <div class="nested-exercise-row" data-action="workspace" data-index="${idx}">
            <div class="nested-ex-left">
              <span>💻</span>
              <span>Latihan: Tulis Kode Program C</span>
            </div>
            <span class="nested-ex-badge">${isCompleted ? '✓ SELESAI' : 'MULAI'}</span>
          </div>
          <div class="nested-exercise-row" data-action="article" data-index="${idx}">
            <div class="nested-ex-left">
              <span>📖</span>
              <span>Artikel Teori &amp; Penjelasan Modul</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--accent-cyan);">Baca Teori →</span>
          </div>
        </div>
      `;

      card.querySelector('[data-action="workspace"]').addEventListener("click", () => {
        loadMaterial(idx);
        switchPage("workspace");
      });

      card.querySelector('[data-action="article"]').addEventListener("click", () => {
        openArticle(idx);
      });

      tree.appendChild(card);
    });

    const progNumbers = document.getElementById("course-progress-numbers");
    if (progNumbers) {
      progNumbers.textContent = `${userCompleted.length} / ${state.materials.length}`;
    }
    const badgeLbl = document.getElementById("course-badge-count-lbl");
    if (badgeLbl) {
      badgeLbl.textContent = `${userCompleted.length} / ${state.materials.length}`;
    }
    const barFill = document.getElementById("course-progress-bar-fill");
    if (barFill && state.materials.length > 0) {
      const pct = Math.round((userCompleted.length / state.materials.length) * 100);
      barFill.style.width = `${pct}%`;
    }

    // Update Badge Icons
    for (let i = 1; i <= 9; i++) {
      const el = document.getElementById(`badge-icon-${i}`);
      if (el) {
        const isDone = userCompleted.includes(i);
        el.classList.toggle("active", isDone);
        el.classList.toggle("locked", !isDone);
      }
    }
  }

  // ─── Assignment Page Renderer ───
  function renderAssignments() {
    const grid = document.getElementById("assignment-cards-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (state.assignments.length === 0) {
      grid.innerHTML = "<p style='color: var(--text-muted);'>Belum ada daftar tugas praktikum.</p>";
      return;
    }

    state.assignments.forEach((ass) => {
      const card = document.createElement("div");
      card.className = "assignment-card";
      card.innerHTML = `
        <div>
          <div class="assignment-card-header">
            <span class="assignment-cat-tag">${ass.category ? ass.category.toUpperCase() : 'TUGAS PRAKTIKUM'}</span>
            <span class="assignment-points">+${ass.points || 100} POIN</span>
          </div>
          <h3 class="assignment-title">${ass.title}</h3>
          <p class="assignment-desc">${ass.description}</p>
        </div>
        <div class="assignment-card-footer">
          <div class="assignment-deadline-pill" title="Jadwal Praktikum: ${ass.deadline || 'Sesi Praktikum'}">
            <span class="deadline-icon">⏰</span>
            <span class="deadline-text">${ass.deadline || 'Sesi Praktikum'}</span>
          </div>
          <button class="btn-pixel btn-primary-action btn-start-assignment" data-id="${ass.id}">
            💻 Kerjakan di IDE
          </button>
        </div>
      `;

      card.querySelector(".btn-start-assignment").addEventListener("click", () => {
        state.activeTaskToSubmit = ass;
        const promptComment = `/* ═════════════════════════════════════════════════════════════════
   ${ass.title}
   Kategori : ${ass.category}
   Petunjuk : ${ass.task_prompt || ass.description}
   ═════════════════════════════════════════════════════════════════ */

#include <stdio.h>

int main() {
    // Tulis kode penyelesaian tugas Anda di sini
    
    return 0;
}
`;
        state.pureCode.c = promptComment;
        if (state.pureEditor) {
          state.pureEditor.setValue(promptComment);
        }
        switchPage("ide");
        showToast(`Tugas "${ass.title}" dimuat ke IDE! Klik "🚀 Submit Tugas" jika sudah selesai.`, "info");
      });

      grid.appendChild(card);
    });
  }

  // ─── Quiz & Exam System Controller ───
  async function fetchQuizzes() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.QUIZZES);
      if (!res.ok) throw new Error("Fetch quizzes failed");
      state.quizzes = await res.json();
      renderQuizzesList();
      if (document.getElementById("aslab-count-quiz")) {
        document.getElementById("aslab-count-quiz").textContent = state.quizzes.length;
      }
    } catch (e) {
      console.warn("Could not fetch quizzes:", e);
      state.quizzes = [];
      renderQuizzesList();
    }
  }

  function renderQuizzesList() {
    const grid = document.getElementById("quiz-cards-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = state.quizzes.filter(q => {
      if (!q.is_active && !state.isAslabAuthenticated) return false;
      if (state.quizFilter === "quiz") return q.type === "quiz";
      if (state.quizFilter === "ujian") return q.type === "ujian";
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: var(--bg-card); border: 1px dashed var(--border-medium); border-radius: var(--radius-sm);">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 10px;">📋</span>
          <h3 style="font-family: var(--font-pixel); font-size: 0.9rem; color: var(--text-primary); margin-bottom: 8px;">Belum Ada Quiz / Exam Aktif</h3>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 480px; margin: 0 auto 16px auto;">Quiz dan Exam praktikum akan diterbitkan langsung oleh Asisten Laboratorium pada sesi lab yang ditentukan.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(q => {
      const card = document.createElement("div");
      card.className = `quiz-card ${q.type || 'quiz'}`;
      const isExam = q.type === "ujian";
      const qCount = q.question_count || (q.questions ? q.questions.length : 0);

      card.innerHTML = `
        <div>
          <div class="quiz-card-header">
            <span class="quiz-type-badge ${isExam ? 'ujian' : 'quiz'}">${isExam ? '⚡ EXAM' : '🎯 QUIZ PRAKTIKUM'}</span>
            <span class="quiz-points-pill">+${q.points || 100} POIN</span>
          </div>
          <h3 class="quiz-card-title">${q.title}</h3>
          <p class="quiz-card-desc">${q.description || 'Evaluasi pemahaman konsep praktikum pemrograman C.'}</p>
          <div class="quiz-card-meta">
            <span>⏱️ ${q.duration_minutes || 15} Menit</span>
            <span>📝 ${qCount} Soal</span>
            <span>📅 ${q.schedule || 'Sesi Praktikum'}</span>
          </div>
        </div>
        <div class="quiz-card-footer">
          <span style="font-size: 0.76rem; color: var(--accent-cyan); font-family: var(--font-mono);">${q.category || 'Dasar Pemrograman'}</span>
          <button class="btn-pixel btn-primary-action btn-start-quiz" data-id="${q.id}">
            ▶ Mulai Kerjakan
          </button>
        </div>
      `;

      card.querySelector(".btn-start-quiz").addEventListener("click", () => {
        startQuiz(q.id);
      });

      grid.appendChild(card);
    });
  }

  async function startQuiz(quizId) {
    if (!state.currentUser) {
      showToast("Silakan login menggunakan NIM / Username untuk mulai mengerjakan!", "info");
      openAuthModal("login");
      return;
    }

    try {
      showToast("Memuat soal kuis...", "info");
      const res = await fetch(`${CONFIG.ENDPOINTS.QUIZZES}/${quizId}`);
      if (!res.ok) throw new Error("Gagal memuat kuis");
      const qData = await res.json();
      if (!qData.questions || qData.questions.length === 0) {
        showToast("Kuis ini belum memiliki butir soal.", "error");
        return;
      }

      state.activeQuiz = qData;
      state.activeQuizQuestionIndex = 0;
      state.quizAnswers = {};
      state.quizTimerSecondsRemaining = (qData.duration_minutes || 15) * 60;

      // Switch to Player View
      document.getElementById("quiz-list-view").style.display = "none";
      document.getElementById("quiz-result-view").style.display = "none";
      document.getElementById("quiz-player-view").style.display = "block";

      // Setup Player Header
      const typeBadge = document.getElementById("player-quiz-type-badge");
      if (typeBadge) {
        typeBadge.textContent = qData.type === "ujian" ? "UJIAN" : "QUIZ";
      }
      const titleEl = document.getElementById("player-quiz-title");
      if (titleEl) titleEl.textContent = qData.title;
      const ptsBadge = document.getElementById("player-quiz-points-badge");
      if (ptsBadge) ptsBadge.textContent = `${qData.points || 100} Poin`;

      renderQuizNavPills();
      renderQuizQuestion(0);
      startQuizCountdown();
    } catch (e) {
      showToast("Error: " + e.message, "error");
    }
  }

  function startQuizCountdown() {
    if (state.quizTimerInterval) clearInterval(state.quizTimerInterval);
    const timerDigits = document.getElementById("quiz-timer-digits");

    function updateDisplay() {
      const mins = Math.floor(state.quizTimerSecondsRemaining / 60);
      const secs = state.quizTimerSecondsRemaining % 60;
      if (timerDigits) {
        timerDigits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (state.quizTimerSecondsRemaining <= 120) {
          timerDigits.classList.add("warning");
        } else {
          timerDigits.classList.remove("warning");
        }
      }
    }

    updateDisplay();
    state.quizTimerInterval = setInterval(() => {
      state.quizTimerSecondsRemaining -= 1;
      updateDisplay();

      if (state.quizTimerSecondsRemaining <= 0) {
        clearInterval(state.quizTimerInterval);
        state.quizTimerInterval = null;
        showToast("⏰ Waktu pengerjaan telah habis! Mengirim jawaban otomatis...", "info");
        submitActiveQuiz();
      }
    }, 1000);
  }

  function renderQuizNavPills() {
    const grid = document.getElementById("quiz-nav-grid");
    if (!grid || !state.activeQuiz || !state.activeQuiz.questions) return;
    grid.innerHTML = "";

    state.activeQuiz.questions.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.className = "q-nav-btn";
      btn.textContent = idx + 1;

      const isAnswered = state.quizAnswers[idx] !== undefined;
      const isActive = state.activeQuizQuestionIndex === idx;

      if (isAnswered) btn.classList.add("answered");
      if (isActive) btn.classList.add("active");

      btn.onclick = () => renderQuizQuestion(idx);
      grid.appendChild(btn);
    });
  }

  function renderQuizQuestion(idx) {
    if (!state.activeQuiz || !state.activeQuiz.questions) return;
    if (idx < 0 || idx >= state.activeQuiz.questions.length) return;

    state.activeQuizQuestionIndex = idx;
    const q = state.activeQuiz.questions[idx];
    const totalQ = state.activeQuiz.questions.length;

    // Header meta
    const numLbl = document.getElementById("q-active-num-lbl");
    if (numLbl) numLbl.textContent = `Soal ${idx + 1} dari ${totalQ}`;
    const ptsLbl = document.getElementById("q-active-pts-lbl");
    if (ptsLbl) ptsLbl.textContent = `${q.points || Math.round((state.activeQuiz.points || 100) / totalQ)} Poin`;

    // Question text
    const textEl = document.getElementById("q-active-text");
    if (textEl) textEl.textContent = q.question;

    // Code snippet
    const codeWrap = document.getElementById("q-active-code-wrap");
    const codeEl = document.getElementById("q-active-code");
    if (q.code_snippet && q.code_snippet.trim()) {
      if (codeWrap) codeWrap.style.display = "block";
      if (codeEl) codeEl.textContent = q.code_snippet;
    } else {
      if (codeWrap) codeWrap.style.display = "none";
    }

    // Options
    const optContainer = document.getElementById("q-active-options");
    if (optContainer) {
      optContainer.innerHTML = "";
      const letters = ["A", "B", "C", "D", "E"];
      (q.options || []).forEach((opt, optIdx) => {
        const isSelected = state.quizAnswers[idx] === optIdx;
        const pill = document.createElement("div");
        pill.className = `q-option-pill ${isSelected ? 'selected' : ''}`;
        pill.innerHTML = `
          <div class="q-option-letter">${letters[optIdx] || optIdx + 1}</div>
          <div class="q-option-text">${opt}</div>
        `;
        pill.onclick = () => {
          selectQuizAnswer(idx, optIdx);
        };
        optContainer.appendChild(pill);
      });
    }

    // Prev / Next Buttons
    const prevBtn = document.getElementById("btn-q-prev");
    const nextBtn = document.getElementById("btn-q-next");
    if (prevBtn) {
      prevBtn.disabled = idx === 0;
      prevBtn.style.opacity = idx === 0 ? "0.4" : "1";
      prevBtn.onclick = () => renderQuizQuestion(idx - 1);
    }
    if (nextBtn) {
      if (idx === totalQ - 1) {
        nextBtn.textContent = "🏁 Selesai & Kirim";
        nextBtn.onclick = () => submitActiveQuiz();
      } else {
        nextBtn.textContent = "Selanjutnya ▶";
        nextBtn.onclick = () => renderQuizQuestion(idx + 1);
      }
    }

    renderQuizNavPills();
  }

  function selectQuizAnswer(qIdx, optIdx) {
    state.quizAnswers[qIdx] = optIdx;
    renderQuizQuestion(qIdx);
  }

  async function submitActiveQuiz() {
    if (!state.activeQuiz) return;
    if (state.quizTimerInterval) {
      clearInterval(state.quizTimerInterval);
      state.quizTimerInterval = null;
    }

    const totalQ = state.activeQuiz.questions.length;
    const answeredCount = Object.keys(state.quizAnswers).length;

    if (answeredCount < totalQ) {
      const confirmSubmit = confirm(`Anda baru menjawab ${answeredCount} dari ${totalQ} soal. Yakin ingin mengakhiri dan mengirim jawaban sekarang?`);
      if (!confirmSubmit) {
        startQuizCountdown();
        return;
      }
    }

    const durationSec = (state.activeQuiz.duration_minutes || 15) * 60;
    const timeTakenSeconds = Math.max(1, durationSec - state.quizTimerSecondsRemaining);
    const username = state.currentUser ? state.currentUser.username : "tamu";

    try {
      showToast("Mengirim dan mengevaluasi lembar jawaban...", "info");
      const res = await fetch(`${CONFIG.ENDPOINTS.QUIZZES}/${state.activeQuiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          answers: state.quizAnswers,
          time_taken_seconds: timeTakenSeconds
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Gagal submit kuis");
      }

      const resultData = await res.json();
      showToast(`🎉 Kuis Selesai! Skor Anda: ${resultData.score}/${resultData.total_points}`, "success");
      
      // Update local user XP
      if (state.currentUser) {
        state.currentUser.xp = (state.currentUser.xp || 0) + resultData.score;
        state.currentUser.level = Math.max(1, Math.floor(state.currentUser.xp / 150) + 1);
        updateUserHeaderDisplay();
      }

      renderQuizResults(resultData, state.activeQuiz, timeTakenSeconds);
    } catch (e) {
      showToast("Submit error: " + e.message, "error");
    }
  }

  function renderQuizResults(resData, quizData, timeTakenSeconds) {
    document.getElementById("quiz-player-view").style.display = "none";
    document.getElementById("quiz-list-view").style.display = "none";
    document.getElementById("quiz-result-view").style.display = "block";

    const isPassed = (resData.score / (resData.total_points || 100)) >= 0.6;
    const verdictTitle = document.getElementById("result-verdict-title");
    if (verdictTitle) {
      verdictTitle.textContent = isPassed ? "Kuis Berhasil Diselesaikan! 🎉" : "Kuis Selesai (Perlu Peningkatan) 📚";
    }
    const trophyIcon = document.getElementById("result-trophy-icon");
    if (trophyIcon) {
      trophyIcon.textContent = isPassed ? "🏆" : "🎯";
    }
    const subTitle = document.getElementById("result-quiz-title-sub");
    if (subTitle) subTitle.textContent = quizData.title;

    // Score numbers
    const scoreNum = document.getElementById("result-score-num");
    if (scoreNum) scoreNum.textContent = resData.score;
    const scoreDenom = document.getElementById("result-score-denom");
    if (scoreDenom) scoreDenom.textContent = `/ ${resData.total_points || 100}`;

    // Meta items
    const correctCount = document.getElementById("result-correct-count");
    if (correctCount) correctCount.textContent = `${resData.correct_count} / ${resData.total_questions} Soal`;

    const mins = Math.floor(timeTakenSeconds / 60);
    const secs = timeTakenSeconds % 60;
    const timeTakenEl = document.getElementById("result-time-taken");
    if (timeTakenEl) timeTakenEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const xpGain = document.getElementById("result-xp-gain");
    if (xpGain) xpGain.textContent = `+${resData.score} XP`;

    // Explanations Breakdown
    const listEl = document.getElementById("result-breakdown-list");
    if (listEl && resData.details) {
      listEl.innerHTML = "";
      const letters = ["A", "B", "C", "D", "E"];
      resData.details.forEach((item, idx) => {
        const qOriginal = quizData.questions[idx] || {};
        const isRight = item.is_correct;
        const bItem = document.createElement("div");
        bItem.className = `breakdown-item ${isRight ? 'correct' : 'wrong'}`;

        const userAnsText = item.user_answer !== undefined && item.user_answer !== null
          ? `${letters[item.user_answer] || item.user_answer}`
          : "Tidak Dijawab";
        const correctAnsText = `${letters[item.correct_answer] || item.correct_answer}`;

        bItem.innerHTML = `
          <div class="breakdown-item-q">${idx + 1}. ${qOriginal.question || 'Soal Evaluasi'}</div>
          <div class="breakdown-item-meta">
            <span class="breakdown-ans-badge ${isRight ? 'correct' : 'wrong'}">
              ${isRight ? '✅ Jawaban Anda Benar' : `❌ Jawaban Anda: (${userAnsText})`}
            </span>
            <span style="color: var(--accent-cyan);">Kunci Jawaban: (${correctAnsText})</span>
          </div>
          ${item.explanation ? `<div class="breakdown-explanation">💡 <strong>Pembahasan:</strong> ${item.explanation}</div>` : ''}
        `;
        listEl.appendChild(bItem);
      });
    }
  }

  function exitQuizPlayer() {
    if (state.quizTimerInterval) {
      clearInterval(state.quizTimerInterval);
      state.quizTimerInterval = null;
    }
    state.activeQuiz = null;
    state.quizAnswers = {};
    const playerView = document.getElementById("quiz-player-view");
    const resultView = document.getElementById("quiz-result-view");
    const listView = document.getElementById("quiz-list-view");
    if (playerView) playerView.style.display = "none";
    if (resultView) resultView.style.display = "none";
    if (listView) listView.style.display = "block";
  }

  // ─── Article / Materials Reading Page Controller ───
  async function fetchArticles() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.ARTICLES);
      if (!res.ok) throw new Error("Fetch articles failed");
      state.articles = await res.json();
    } catch (e) {
      console.warn("Could not fetch articles:", e);
      state.articles = [];
    }
  }

  function renderArticlesList() {
    const bodyContainer = document.getElementById("article-full-content");
    const bottomBar = document.querySelector(".article-bottom-bar");
    const titleEl = document.getElementById("article-page-header-title");
    const ideBtn = document.getElementById("btn-open-article-in-ide");

    if (state.articles.length === 0) {
      if (titleEl) titleEl.textContent = "Belum Ada Artikel Teori";
      if (bottomBar) bottomBar.style.display = "none";
      if (ideBtn) ideBtn.style.display = "none";
      if (bodyContainer) {
        const aslabBtnHtml = state.isAslabAuthenticated
          ? `<button class="btn-pixel btn-hero-ghost" id="btn-art-go-aslab">👑 Studio Aslab</button>`
          : ``;
        const aslabDesc = state.isAslabAuthenticated
          ? `Halaman artikel teori saat ini masih kosong. Klik tombol di bawah untuk membuat dan menerbitkan artikel teori baru melalui Aslab Studio.`
          : `Halaman artikel teori saat ini masih kosong. Artikel bacaan, studi kasus, dan materi rujukan tambahan nantinya akan diterbitkan langsung oleh Asisten Laboratorium (Aslab).`;

        bodyContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; background: rgba(15, 23, 42, 0.6); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 12px; margin: 30px auto; max-width: 680px;">
            <span style="font-size: 3.2rem; margin-bottom: 14px;">📖</span>
            <h2 style="font-family: var(--font-pixel); font-size: 1.1rem; color: var(--text-primary); margin-bottom: 8px;">Belum Ada Artikel Teori</h2>
            <p style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.6; max-width: 520px; margin-bottom: 24px;">
              ${aslabDesc}
            </p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
              <button class="btn-pixel btn-primary-action" id="btn-art-go-course">🗺️ Buka Course Map</button>
              ${aslabBtnHtml}
            </div>
          </div>
        `;
        document.getElementById("btn-art-go-course")?.addEventListener("click", () => switchPage("course"));
        if (state.isAslabAuthenticated) {
          document.getElementById("btn-art-go-aslab")?.addEventListener("click", () => switchPage("aslab"));
        }
      }
      return;
    }

    if (bottomBar) bottomBar.style.display = "flex";
    if (ideBtn) ideBtn.style.display = "inline-flex";
    openArticle(0);
  }

  function openArticle(index) {
    if (state.articles.length === 0) {
      renderArticlesList();
      return;
    }

    if (index < 0 || index >= state.articles.length) return;
    const art = state.articles[index];

    const titleEl = document.getElementById("article-page-header-title");
    if (titleEl) titleEl.textContent = art.title;

    const stepEl = document.getElementById("article-reading-step-lbl");
    if (stepEl) stepEl.textContent = `Artikel ${index + 1} dari ${state.articles.length}`;

    const bodyContainer = document.getElementById("article-full-content");
    if (bodyContainer) {
      bodyContainer.innerHTML = `
        <h1>${art.title}</h1>
        <div style="display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap;">
          <span class="badge-lang-tag">${art.category || 'TEORI'}</span>
          <span class="badge-time-tag">⏱️ ${art.reading_time || '10 Menit'}</span>
          <span class="badge-xp-tag">+25 Reading XP</span>
        </div>
        ${art.content}
        
        ${art.references_url ? `
        <div class="callout-box" style="margin-top: 32px; border-left: 4px solid var(--accent-cyan); background: rgba(15, 23, 42, 0.85);">
          <strong style="color: var(--accent-cyan);">📚 Referensi Kurikulum Resmi:</strong>
          <p style="margin: 8px 0 0; font-size: 0.88rem;">
            Pelajari konsep terkait pada materi rujukan: <br>
            • <a href="${art.references_url}" target="_blank" rel="noopener" style="color: #38bdf8; text-decoration: underline;">${art.references_url} ↗</a>
          </p>
        </div>` : ''}
      `;
    }

    const ideBtn = document.getElementById("btn-open-article-in-ide");
    if (ideBtn) {
      ideBtn.onclick = () => {
        switchPage("ide");
      };
    }
  }

  // ─── Workspace Controller (Guided Exercise) ───
  function loadMaterial(index) {
    if (index < 0 || index >= state.materials.length) return;
    state.activeMaterialIndex = index;
    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_MAT_IDX, index);

    const mat = state.materials[index];
    const lang = mat.language === "python" ? "python" : "c";

    // Update Left Panel
    document.getElementById("mat-display-title").textContent = mat.title;
    document.getElementById("mat-display-lang").textContent = lang === "c" ? "Bahasa C (GCC)" : "Python 3.9 (Alpine)";
    document.getElementById("mat-display-body").innerHTML = mat.content;

    // Topbar breadcrumb
    document.getElementById("crumb-lang-badge").textContent = lang.toUpperCase();
    document.getElementById("crumb-module-title").textContent = mat.title;
    document.getElementById("workspace-step-counter").textContent = `Modul ${index + 1} / ${state.materials.length}`;

    document.getElementById("btn-prev-material").disabled = index === 0;
    document.getElementById("btn-next-material").disabled = index === state.materials.length - 1;

    // Workspace editor starts with empty skeleton so student thinks and writes code
    const emptySkeleton = lang === "c" ? `#include <stdio.h>

int main() {
    // Tulis kode program untuk ${mat.title} di sini
    
    return 0;
}` : `# Tulis kode program Python Anda di sini
def main():
    pass

if __name__ == "__main__":
    main()`;

    state.workspaceCode[lang] = emptySkeleton;
    if (state.workspaceEditor) {
      state.workspaceEditor.setValue(emptySkeleton);
    }

    switchWorkspaceLanguage(lang, false);
  }

  function switchWorkspaceLanguage(lang, forceFocus = true) {
    state.currentLanguage = lang;
    document.getElementById("tab-lang-c").classList.toggle("active", lang === "c");
    document.getElementById("tab-lang-python").classList.toggle("active", lang === "python");

    if (state.workspaceEditor) {
      state.workspaceEditor.setValue(state.workspaceCode[lang]);
      state.workspaceEditor.setOption("mode", lang === "c" ? "text/x-csrc" : "python");
      if (forceFocus) state.workspaceEditor.focus();
    }
  }

  function switchPureLanguage(lang, forceFocus = true) {
    state.pureLanguage = lang;
    document.getElementById("pure-tab-lang-c").classList.toggle("active", lang === "c");
    document.getElementById("pure-tab-lang-python").classList.toggle("active", lang === "python");

    if (state.pureEditor) {
      state.pureEditor.setValue(state.pureCode[lang]);
      state.pureEditor.setOption("mode", lang === "c" ? "text/x-csrc" : "python");
      if (forceFocus) state.pureEditor.focus();
    }
  }

  // ─── LEADERBOARD & LIVE SCOREBOARD CONTROLLER ───
  async function fetchLeaderboard() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.LEADERBOARD);
      if (!res.ok) throw new Error("Fetch leaderboard failed");
      state.leaderboard = await res.json();
      renderLeaderboard();
    } catch (e) {
      console.warn("Leaderboard fetch error:", e);
      state.leaderboard = [];
      renderLeaderboard();
    }
  }

  function renderLeaderboard(filterText = "") {
    const podiumEl = document.getElementById("leaderboard-podium-grid");
    const tbody = document.getElementById("lead-xp-tbody");
    if (!tbody) return;

    let list = [...state.leaderboard];
    if (filterText.trim()) {
      const q = filterText.toLowerCase().trim();
      list = list.filter(s => (s.name || "").toLowerCase().includes(q) || (s.nim || "").toLowerCase().includes(q));
    }

    // Render Podium for Top 3 (if no search filter)
    if (podiumEl) {
      if (!filterText && state.leaderboard.length >= 1) {
        const first = state.leaderboard[0];
        const second = state.leaderboard[1] || null;
        const third = state.leaderboard[2] || null;

        podiumEl.innerHTML = `
          <!-- 2nd Place -->
          <div class="podium-card podium-second">
            <span class="podium-crown">🥈</span>
            <div class="podium-avatar">${second ? second.avatar : '👤'}</div>
            <div class="podium-name">${second ? second.name : 'Praktikan 2'}</div>
            <div class="podium-nim">${second ? second.nim : '-'}</div>
            <div class="podium-xp-tag">${second ? second.xp : 0} XP</div>
          </div>
          <!-- 1st Place -->
          <div class="podium-card podium-first">
            <span class="podium-crown">👑</span>
            <div class="podium-avatar">${first.avatar || '👨‍💻'}</div>
            <div class="podium-name">${first.name}</div>
            <div class="podium-nim">${first.nim}</div>
            <div class="podium-xp-tag">${first.xp} XP • Rank 1</div>
          </div>
          <!-- 3rd Place -->
          <div class="podium-card podium-third">
            <span class="podium-crown">🥉</span>
            <div class="podium-avatar">${third ? third.avatar : '👤'}</div>
            <div class="podium-name">${third ? third.name : 'Praktikan 3'}</div>
            <div class="podium-nim">${third ? third.nim : '-'}</div>
            <div class="podium-xp-tag">${third ? third.xp : 0} XP</div>
          </div>
        `;
      } else if (filterText) {
        podiumEl.innerHTML = "";
      } else {
        podiumEl.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--text-muted);'>Belum ada data praktikan di leaderboard. Daftar sekarang untuk mengumpulkan XP!</p>";
      }
    }

    // Render Table
    tbody.innerHTML = "";
    if (list.length === 0) {
      tbody.innerHTML = "<tr><td colspan='6' style='text-align: center; color: var(--text-muted);'>Tidak ada data praktikan yang sesuai.</td></tr>";
      return;
    }

    list.forEach((s) => {
      const tr = document.createElement("tr");
      let rankClass = "rank-default";
      let rankBadge = `#${s.rank}`;
      if (s.rank === 1) { rankClass = "rank-1"; rankBadge = "🥇 #1"; }
      else if (s.rank === 2) { rankClass = "rank-2"; rankBadge = "🥈 #2"; }
      else if (s.rank === 3) { rankClass = "rank-3"; rankBadge = "🥉 #3"; }

      tr.innerHTML = `
        <td><span class="rank-pill ${rankClass}">${rankBadge}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">${s.avatar || '👤'}</span>
            <strong style="color: var(--text-primary);">${s.name}</strong>
          </div>
        </td>
        <td style="font-family: var(--font-mono); color: var(--text-muted);">${s.nim}</td>
        <td><span style="font-family: var(--font-pixel); font-size: 0.62rem; color: var(--accent-cyan);">${s.badge || '🥉'} ${s.tier || 'BRONZE'}</span></td>
        <td><span style="font-family: var(--font-mono);">${s.completed_count || 0} / 9 Modul</span></td>
        <td style="text-align: right; font-family: var(--font-pixel); font-size: 0.75rem; color: var(--accent-cyan);">${s.xp} XP</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function fetchLiveScores() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.LIVESCORE);
      if (!res.ok) throw new Error("Fetch livescores failed");
      state.liveScores = await res.json();
      renderLiveScores();
    } catch (e) {
      console.warn("Live score fetch error:", e);
      state.liveScores = [];
      renderLiveScores();
    }
  }

  function renderLiveScores() {
    const tbody = document.getElementById("lead-livescore-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (state.liveScores.length === 0) {
      tbody.innerHTML = "<tr><td colspan='7' style='text-align: center; color: var(--text-muted);'>Belum ada submission evaluasi kuis atau ujian live pada sesi ini. Mulai kerjakan kuis di halaman 'Quiz &amp; Ujian'!</td></tr>";
      return;
    }

    state.liveScores.forEach((ls) => {
      const tr = document.createElement("tr");
      const isPass = ls.status === "PASSED";
      const isExam = (ls.assignment_title || "").includes("[UJIAN]");
      const isQuiz = (ls.assignment_title || "").includes("[QUIZ]");
      
      let badgeTypeHtml = "";
      let cleanTitle = ls.assignment_title || "Evaluasi Praktikum";
      if (isExam) {
        badgeTypeHtml = `<span class="quiz-type-badge ujian" style="margin-right: 6px; font-size: 0.55rem;">UJIAN</span>`;
        cleanTitle = cleanTitle.replace("[UJIAN]", "").trim();
      } else if (isQuiz) {
        badgeTypeHtml = `<span class="quiz-type-badge quiz" style="margin-right: 6px; font-size: 0.55rem;">QUIZ</span>`;
        cleanTitle = cleanTitle.replace("[QUIZ]", "").trim();
      }

      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">⏰ ${ls.timestamp || '-'}</td>
        <td><strong style="color: var(--text-primary);">${ls.student_name || ls.username}</strong></td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${ls.nim || '-'}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${badgeTypeHtml}
            <span style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">${cleanTitle}</span>
          </div>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">⏱️ ${ls.exec_time || '1m'}</td>
        <td><span class="verdict-badge ${isPass ? 'verdict-pass' : 'verdict-fail'}">${ls.status}</span></td>
        <td style="text-align: right; font-family: var(--font-pixel); font-size: 0.75rem; color: ${isPass ? '#34d399' : '#f87171'}; font-weight: 700;">+${ls.score} PTS</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function submitTaskLiveScore() {
    if (!state.pureEditor) return;
    const code = state.pureEditor.getValue().trim();
    if (!code) {
      showToast("Tulis kode program tugas terlebih dahulu di editor!", "error");
      return;
    }

    // Determine target assignment
    let targetAss = state.activeTaskToSubmit;
    if (!targetAss && state.assignments.length > 0) {
      targetAss = state.assignments[0];
    }

    if (!targetAss) {
      showToast("Belum ada tugas praktikum aktif untuk disubmit!", "error");
      return;
    }

    const username = state.currentUser ? state.currentUser.username : "tamu";
    showToast(`Mengirim tugas "${targetAss.title}" ke sistem penilaian live...`, "info");

    try {
      const res = await fetch(CONFIG.ENDPOINTS.LIVESCORE_SUBMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          assignment_id: targetAss.id,
          code: code,
          language: state.pureLanguage || "c"
        })
      });

      if (!res.ok) throw new Error("Submit live score failed");
      const data = await res.json();

      const termBox = document.getElementById("pure-terminal-content");
      if (termBox) {
        termAppend(termBox, `\n[EVALUASI TUGAS LIVE] ${data.assignment_title}`, "cmd-line");
        termAppend(termBox, `Status: ${data.verdict} | Skor: ${data.score} Poin`, data.verdict === "PASSED" ? "stdout-line" : "stderr-line");
      }

      if (data.verdict === "PASSED") {
        showToast(`🎉 ${data.message}`, "success");
      } else {
        showToast(data.message, "error");
      }

      await fetchUsers();
      if (state.currentUser) {
        const u = state.users.find(x => x.username === state.currentUser.username);
        if (u) setCurrentUser(u);
      }
      fetchLiveScores();
      fetchLeaderboard();
    } catch (e) {
      showToast("Gagal melakukan submit live score: " + e.message, "error");
    }
  }

  // ─── Code Execution (POST /execute) ───
  async function executeCode(mode = "workspace") {
    if (state.isExecuting) return;

    const editor = mode === "pure" ? state.pureEditor : state.workspaceEditor;
    const lang = mode === "pure" ? state.pureLanguage : state.currentLanguage;
    const termBox = document.getElementById(mode === "pure" ? "pure-terminal-content" : "terminal-content-box");
    const termMetrics = document.getElementById(mode === "pure" ? "pure-term-metrics" : "term-exec-metrics");
    const btnRun = document.getElementById(mode === "pure" ? "btn-pure-run" : "btn-run-code");

    if (!editor) return;
    const code = editor.getValue().trim();
    if (!code) {
      showToast("Tulis kode sebelum menjalankan!", "error");
      return;
    }

    state.isExecuting = true;
    if (btnRun) btnRun.disabled = true;

    if (mode === "workspace") {
      setExecStatus("running", "Sedang Mengompilasi...");
    }
    if (termMetrics) termMetrics.textContent = "running...";

    termClear(termBox, termMetrics);
    termAppend(termBox, `$ gcc -Wall -Wextra main.c -o main && ./main`, "cmd-line");

    const startTime = performance.now();

    try {
      const response = await fetch(CONFIG.ENDPOINTS.EXECUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang,
          code: code,
          username: state.currentUser?.username || "tamu"
        })
      });

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.detail || `HTTP error ${response.status}`;
        if (mode === "workspace") setExecStatus("error", "Error Kompilasi");
        termAppend(termBox, `[ERROR KOMPILASI] ${errMsg}`, "stderr-line");
        if (termMetrics) termMetrics.textContent = `failed in ${duration}s`;
        showToast("Eksekusi gagal: " + errMsg, "error");
        return;
      }

      const result = await response.json();
      const rawOutput = result.output || "(tidak ada output)";
      const status = result.status;

      if (status === "success") {
        if (mode === "workspace") setExecStatus("success", "Sukses");
        if (termMetrics) termMetrics.textContent = `finished in ${duration}s`;
        parseTerminalOutput(termBox, rawOutput, true);

        // Record User Progress in SQLite if student is logged in
        if (mode === "workspace" && state.currentUser) {
          await recordProgress(state.materials[state.activeMaterialIndex]?.id || 1, 50);
        }
        showToast("Eksekusi Program Berhasil! +50 XP", "success");
      } else {
        if (mode === "workspace") setExecStatus("error", "Error");
        if (termMetrics) termMetrics.textContent = `exited with errors in ${duration}s`;
        parseTerminalOutput(termBox, rawOutput, false);
        showToast("Periksa pesan kesalahan kompilasi pada terminal!", "error");
      }

    } catch (err) {
      console.error("Execute fetch error:", err);
      if (mode === "workspace") setExecStatus("error", "Offline");
      if (termMetrics) termMetrics.textContent = "server unreachable";
      termAppend(termBox, `[NETWORK ERROR] Gagal menghubungi backend API: ${err.message}`, "stderr-line");
      termAppend(termBox, `Pastikan server uvicorn berjalan di port 8000.`, "info-line");
      showToast("Koneksi backend terputus", "error");
    } finally {
      state.isExecuting = false;
      if (btnRun) btnRun.disabled = false;
    }
  }

  function parseTerminalOutput(box, output, isSuccess) {
    const lines = output.split("\n");
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Filter out raw memory audit lines for clean Semester 1 view
      if (trimmed.startsWith("==") || trimmed.startsWith("--") || trimmed.includes("HEAP SUMMARY") || trimmed.includes("LEAK SUMMARY") || trimmed.includes("ERROR SUMMARY")) {
        return;
      }

      if (!isSuccess || trimmed.toLowerCase().includes("error:") || trimmed.toLowerCase().includes("fatal error:")) {
        termAppend(box, line, "stderr-line");
      } else if (trimmed.toLowerCase().includes("warning:")) {
        termAppend(box, line, "info-line");
      } else {
        termAppend(box, line, "stdout-line");
      }
    });
  }

  async function recordProgress(materialId, xpEarned) {
    if (!state.currentUser || state.currentUser.username === "tamu") return;
    try {
      const res = await fetch(CONFIG.ENDPOINTS.PROGRESS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: state.currentUser.username,
          material_id: materialId,
          xp_earned: xpEarned
        })
      });
      if (res.ok) {
        const data = await res.json();
        state.currentUser.xp = data.xp;
        state.currentUser.level = data.level;
        state.currentUser.completed_materials = data.completed_materials;
        setCurrentUser(state.currentUser);
      }
    } catch (e) {
      console.warn("Could not save progress to backend", e);
    }
  }

  // ─── Terminal Helpers ───
  function termClear(box, metrics) {
    if (box) box.innerHTML = "";
    if (metrics) metrics.textContent = "cleared";
  }

  function termAppend(box, text, className = "stdout-line") {
    if (!box) return;
    const p = document.createElement("p");
    p.className = `term-line ${className}`;
    p.textContent = text;
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
  }

  function setExecStatus(status, text) {
    const badge = document.getElementById("exec-status-badge");
    if (badge) badge.setAttribute("data-status", status);
    const txt = document.getElementById("exec-status-text");
    if (txt) txt.textContent = text;
  }

  // ─── Dynamic Aslab Accounts Loader ───
  async function fetchAslabAccounts() {
    try {
      const res = await fetch(CONFIG.ENDPOINTS.ASLAB_ACCOUNTS);
      if (!res.ok) throw new Error("Fetch aslab accounts failed");
      const accounts = await res.json();
      const sel = document.getElementById("aslab-account-select");
      if (sel && Array.isArray(accounts) && accounts.length > 0) {
        sel.innerHTML = "";
        accounts.forEach((acc) => {
          const opt = document.createElement("option");
          opt.value = acc.username;
          opt.textContent = acc.name;
          sel.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn("Could not fetch dynamic aslab accounts:", e);
    }
  }

  // ─── Unified Auth Modal Controller (2 Tabs: Login Mahasiswa, Login Aslab) ───
  function openAuthModal(defaultTab = "login") {
    fetchAslabAccounts();
    const modal = document.getElementById("modal-auth-hub");
    if (!modal) return;
    modal.classList.add("open");

    const tabLogin = document.getElementById("tab-auth-login");
    const tabAslab = document.getElementById("tab-auth-aslab");
    const formLogin = document.getElementById("form-auth-login");
    const formAslab = document.getElementById("form-auth-aslab");

    [tabLogin, tabAslab].forEach(t => t && t.classList.remove("active"));
    [formLogin, formAslab].forEach(f => f && (f.style.display = "none"));

    if (defaultTab === "aslab") {
      if (tabAslab) tabAslab.classList.add("active");
      if (formAslab) formAslab.style.display = "block";
      document.getElementById("aslab-auth-pin")?.focus();
    } else {
      if (tabLogin) tabLogin.classList.add("active");
      if (formLogin) formLogin.style.display = "block";
      document.getElementById("login-student-identifier")?.focus();
    }
  }

  async function submitStudentLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById("login-student-identifier")?.value.trim();
    if (!identifier) {
      showToast("Masukkan NIM atau Username Anda!", "error");
      return;
    }

    try {
      const res = await fetch(`${CONFIG.ENDPOINTS.USERS}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Akun tidak ditemukan");
      }
      const data = await res.json();
      state.isAslabAuthenticated = false;
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ASLAB_AUTH);
      setCurrentUser(data.user);

      document.getElementById("modal-auth-hub")?.classList.remove("open");
      document.getElementById("form-auth-login")?.reset();
      showToast(data.message || `Selamat datang kembali, ${data.user.name}!`, "success");
      switchPage("dashboard");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function submitRegisterUser(e) {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim();
    const name = document.getElementById("reg-name").value.trim();
    const nim = document.getElementById("reg-nim").value.trim();
    const avatar = document.getElementById("reg-avatar").value;

    if (!username || !name || !nim) {
      showToast("Harap lengkapi semua kolom!", "error");
      return;
    }

    try {
      const res = await fetch(CONFIG.ENDPOINTS.USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name, nim, avatar })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Registrasi gagal");
      }
      showToast(`Akun mahasiswa "${name}" berhasil didaftarkan!`, "success");
      document.getElementById("modal-auth-hub").classList.remove("open");
      document.getElementById("form-auth-register").reset();

      await fetchUsers();
      const newUser = state.users.find(u => u.username === username.toLowerCase().replace(/ /g, "_"));
      if (newUser) {
        setCurrentUser(newUser);
        switchPage("dashboard");
      }
    } catch (e) {
      showToast("Gagal mendaftar: " + e.message, "error");
    }
  }

  async function submitAslabLogin(e) {
    e.preventDefault();
    const aslabId = document.getElementById("aslab-account-select")?.value || "aslab_1";
    const pin = document.getElementById("aslab-auth-pin").value.trim();
    if (!pin) {
      showToast("Masukkan kode PIN Asisten Lab!", "error");
      return;
    }

    try {
      const res = await fetch(CONFIG.ENDPOINTS.ASLAB_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aslab_id: aslabId, pin: pin })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Kode PIN Aslab salah");
      }
      const data = await res.json();
      state.isAslabAuthenticated = true;
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.ASLAB_AUTH, data.token);

      const aslabUser = data.user || {
        username: aslabId,
        name: aslabId === "aslab_1" ? "Aslab 1" : (aslabId === "aslab_2" ? "Aslab 2" : "Aslab 3"),
        nim: aslabId === "aslab_1" ? "ASLAB1" : (aslabId === "aslab_2" ? "ASLAB2" : "ASLAB3"),
        role: "aslab",
        avatar: aslabId === "aslab_1" ? "👑" : (aslabId === "aslab_2" ? "⚡" : "🛡️"),
        xp: 999,
        level: 9,
        streak: 14,
        completed_materials: [1, 2, 3, 4, 5, 6, 7, 8, 9]
      };
      setCurrentUser(aslabUser);

      document.getElementById("modal-auth-hub").classList.remove("open");
      document.getElementById("form-auth-aslab").reset();
      showToast(data.message || `Autentikasi ${aslabUser.name} Berhasil!`, "success");
      switchPage("aslab");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function handleSignOut() {
    state.isAslabAuthenticated = false;
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ASLAB_AUTH);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
    setCurrentUser(null);
    showToast("Berhasil keluar akun (Sign Out)", "info");
    switchPage("landing");
  }

  // ─── Aslab Management Studio Controller (4 Tabs: Modul, Tugas, Artikel, Submissions) ───
  function switchAslabTab(tabName) {
    state.aslabTab = tabName;
    document.querySelectorAll(".aslab-tab-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.aslabTab === tabName);
    });
    document.querySelectorAll(".aslab-tab-section").forEach(s => {
      s.style.display = s.id === `aslab-section-${tabName}` ? "block" : "none";
    });

    const topActionBtn = document.getElementById("btn-aslab-top-action");
    if (topActionBtn) {
      if (tabName === "modules") {
        topActionBtn.textContent = "➕ Tambah Modul";
        topActionBtn.onclick = () => openAddMaterialModal();
      } else if (tabName === "assignments") {
        topActionBtn.textContent = "➕ Tambah Tugas";
        topActionBtn.onclick = () => openAddAssignmentModal();
      } else if (tabName === "quizzes") {
        topActionBtn.textContent = "➕ Tambah Kuis";
        topActionBtn.onclick = () => openAddQuizModal();
      } else if (tabName === "articles") {
        topActionBtn.textContent = "➕ Tambah Artikel";
        topActionBtn.onclick = () => openAddArticleModal();
      } else {
        topActionBtn.textContent = "🔄 Refresh Data";
        topActionBtn.onclick = () => { fetchSubmissionsFeed(); fetchLiveScores(); };
      }
    }
  }

  async function loadAslabDashboard() {
    // Update active badge name
    const badgeEl = document.getElementById("aslab-active-badge");
    if (badgeEl && state.currentUser) {
      badgeEl.textContent = `${state.currentUser.avatar || '👑'} ${state.currentUser.name.toUpperCase()}`;
    }

    // Render 5 Sections
    renderAslabMaterialsTable();
    renderAslabAssignmentsTable();
    renderAslabQuizzesTable();
    renderAslabArticlesTable();
    fetchSubmissionsFeed();
    switchAslabTab(state.aslabTab || "modules");
  }

  function renderAslabMaterialsTable() {
    const tbody = document.getElementById("aslab-materials-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    document.getElementById("aslab-count-mat").textContent = state.materials.length;

    state.materials.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family: var(--font-mono);">#${m.id}</td>
        <td><strong>${m.title}</strong></td>
        <td><span class="chip-lang-badge ${m.language === 'python' ? 'py' : 'c'}">${m.language.toUpperCase()}</span></td>
        <td>${m.category || 'Dasar'}</td>
        <td style="font-family: var(--font-mono); color: var(--accent-cyan);">+${m.xp_reward || 50} XP</td>
        <td style="text-align: right;">
          <button class="btn-table-edit" data-id="${m.id}">Edit ✎</button>
          <button class="btn-table-del" data-id="${m.id}">Hapus ✕</button>
        </td>
      `;
      tr.querySelector(".btn-table-edit").addEventListener("click", () => openEditMaterialModal(m));
      tr.querySelector(".btn-table-del").addEventListener("click", () => deleteAslabMaterial(m.id));
      tbody.appendChild(tr);
    });
  }

  function renderAslabAssignmentsTable() {
    const tbody = document.getElementById("aslab-assignments-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    document.getElementById("aslab-count-ass").textContent = state.assignments.length;

    state.assignments.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family: var(--font-mono);">#${a.id}</td>
        <td><strong>${a.title}</strong></td>
        <td><span class="assignment-cat-tag">${a.category || 'Tugas'}</span></td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">⏰ ${a.deadline || 'Sesi Praktikum'}</td>
        <td style="font-family: var(--font-pixel); font-size: 0.65rem; color: var(--accent-cyan);">+${a.points || 100}</td>
        <td style="text-align: right;">
          <button class="btn-table-edit" data-id="${a.id}">Edit ✎</button>
          <button class="btn-table-del" data-id="${a.id}">Hapus ✕</button>
        </td>
      `;
      tr.querySelector(".btn-table-edit").addEventListener("click", () => openEditAssignmentModal(a));
      tr.querySelector(".btn-table-del").addEventListener("click", () => deleteAslabAssignment(a.id));
      tbody.appendChild(tr);
    });
  }

  function renderAslabQuizzesTable() {
    const tbody = document.getElementById("aslab-quizzes-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (document.getElementById("aslab-count-quiz")) {
      document.getElementById("aslab-count-quiz").textContent = state.quizzes.length;
    }

    state.quizzes.forEach((q) => {
      const tr = document.createElement("tr");
      const isExam = q.type === "ujian";
      const qCount = q.question_count || (q.questions ? q.questions.length : 0);
      const isActive = q.is_active !== 0;

      tr.innerHTML = `
        <td style="font-family: var(--font-mono);">#${q.id}</td>
        <td><strong>${q.title}</strong></td>
        <td><span class="quiz-type-badge ${isExam ? 'ujian' : 'quiz'}">${isExam ? 'UJIAN' : 'QUIZ'}</span></td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">⏱️ ${q.duration_minutes || 15} Menit</td>
        <td style="font-family: var(--font-mono);">${qCount} Soal</td>
        <td style="font-family: var(--font-pixel); font-size: 0.65rem; color: var(--accent-gold);">+${q.points || 100}</td>
        <td><span style="color: ${isActive ? '#34d399' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600;">${isActive ? '🟢 Aktif' : '⚪ Nonaktif'}</span></td>
        <td style="text-align: right;">
          <button class="btn-table-edit" data-id="${q.id}">Edit ✎</button>
          <button class="btn-table-del" data-id="${q.id}">Hapus ✕</button>
        </td>
      `;
      tr.querySelector(".btn-table-edit").addEventListener("click", () => openEditQuizModal(q));
      tr.querySelector(".btn-table-del").addEventListener("click", () => deleteAslabQuiz(q.id));
      tbody.appendChild(tr);
    });
  }

  function openAddQuizModal() {
    document.getElementById("aslab-quiz-edit-id").value = "";
    document.getElementById("modal-heading-quiz").textContent = "Tambah Kuis / Ujian Baru";
    document.getElementById("form-add-quiz").reset();
    state.aslabQuizBuilderQuestions = [
      {
        id: 1,
        question: "",
        code_snippet: "",
        options: ["", "", "", ""],
        correct_answer: 0,
        explanation: "",
        points: 25
      }
    ];
    renderAslabQuizBuilderQuestions();
    document.getElementById("modal-aslab-quiz").classList.add("open");
  }

  async function openEditQuizModal(q) {
    document.getElementById("aslab-quiz-edit-id").value = q.id;
    document.getElementById("modal-heading-quiz").textContent = `Edit Kuis #${q.id}`;
    document.getElementById("quiz-form-title").value = q.title || "";
    document.getElementById("quiz-form-type").value = q.type || "quiz";
    document.getElementById("quiz-form-category").value = q.category || "";
    document.getElementById("quiz-form-duration").value = q.duration_minutes || 15;
    document.getElementById("quiz-form-schedule").value = q.schedule || "";
    document.getElementById("quiz-form-points").value = q.points || 100;
    document.getElementById("quiz-form-desc").value = q.description || "";

    // Fetch full questions if not loaded
    if (!q.questions) {
      try {
        const res = await fetch(`${CONFIG.ENDPOINTS.QUIZZES}/${q.id}`);
        if (res.ok) {
          const detail = await res.json();
          q.questions = detail.questions || [];
        }
      } catch (e) {
        q.questions = [];
      }
    }

    state.aslabQuizBuilderQuestions = q.questions && q.questions.length > 0 ? JSON.parse(JSON.stringify(q.questions)) : [
      {
        id: 1,
        question: "",
        code_snippet: "",
        options: ["", "", "", ""],
        correct_answer: 0,
        explanation: "",
        points: 25
      }
    ];
    renderAslabQuizBuilderQuestions();
    document.getElementById("modal-aslab-quiz").classList.add("open");
  }

  function renderAslabQuizBuilderQuestions() {
    const builderContainer = document.getElementById("aslab-quiz-questions-builder");
    if (!builderContainer) return;
    builderContainer.innerHTML = "";

    state.aslabQuizBuilderQuestions.forEach((q, idx) => {
      const qCard = document.createElement("div");
      qCard.className = "question-builder-item";
      qCard.innerHTML = `
        <div class="q-builder-top">
          <strong>BUTIR SOAL #${idx + 1}</strong>
          ${state.aslabQuizBuilderQuestions.length > 1 ? `<button type="button" class="q-builder-del" data-idx="${idx}">Hapus Soal ✕</button>` : ''}
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label style="font-size: 0.78rem;">Teks Pertanyaan *</label>
          <input type="text" class="form-input q-input-text" data-idx="${idx}" value="${(q.question || '').replace(/"/g, '&quot;')}" placeholder="Tuliskan pertanyaan soal..." required>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label style="font-size: 0.78rem;">Potongan Kode C (Opsional)</label>
          <textarea class="form-input q-input-code" data-idx="${idx}" rows="2" placeholder="int a = 10; printf(&quot;%d&quot;, a);">${q.code_snippet || ''}</textarea>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label style="font-size: 0.78rem;">Pilihan Jawaban (A, B, C, D) &amp; Kunci Jawaban *</label>
          <div class="q-builder-options-grid">
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="radio" name="correct_ans_${idx}" value="0" ${q.correct_answer === 0 ? 'checked' : ''} class="q-correct-radio" data-idx="${idx}">
              <span style="font-family: var(--font-pixel); font-size: 0.6rem; color: var(--accent-cyan);">A.</span>
              <input type="text" class="form-input q-opt-input" data-idx="${idx}" data-opt="0" value="${(q.options && q.options[0] || '').replace(/"/g, '&quot;')}" placeholder="Opsi A" required style="width: 100%;">
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="radio" name="correct_ans_${idx}" value="1" ${q.correct_answer === 1 ? 'checked' : ''} class="q-correct-radio" data-idx="${idx}">
              <span style="font-family: var(--font-pixel); font-size: 0.6rem; color: var(--accent-cyan);">B.</span>
              <input type="text" class="form-input q-opt-input" data-idx="${idx}" data-opt="1" value="${(q.options && q.options[1] || '').replace(/"/g, '&quot;')}" placeholder="Opsi B" required style="width: 100%;">
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="radio" name="correct_ans_${idx}" value="2" ${q.correct_answer === 2 ? 'checked' : ''} class="q-correct-radio" data-idx="${idx}">
              <span style="font-family: var(--font-pixel); font-size: 0.6rem; color: var(--accent-cyan);">C.</span>
              <input type="text" class="form-input q-opt-input" data-idx="${idx}" data-opt="2" value="${(q.options && q.options[2] || '').replace(/"/g, '&quot;')}" placeholder="Opsi C" required style="width: 100%;">
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="radio" name="correct_ans_${idx}" value="3" ${q.correct_answer === 3 ? 'checked' : ''} class="q-correct-radio" data-idx="${idx}">
              <span style="font-family: var(--font-pixel); font-size: 0.6rem; color: var(--accent-cyan);">D.</span>
              <input type="text" class="form-input q-opt-input" data-idx="${idx}" data-opt="3" value="${(q.options && q.options[3] || '').replace(/"/g, '&quot;')}" placeholder="Opsi D" required style="width: 100%;">
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.78rem;">Penjelasan / Pembahasan Kunci Jawaban</label>
          <input type="text" class="form-input q-input-exp" data-idx="${idx}" value="${(q.explanation || '').replace(/"/g, '&quot;')}" placeholder="Jelaskan alasan jawaban yang benar...">
        </div>
      `;

      // Bind input events to keep state synced
      qCard.querySelector(".q-input-text").addEventListener("input", (e) => {
        state.aslabQuizBuilderQuestions[idx].question = e.target.value;
      });
      qCard.querySelector(".q-input-code").addEventListener("input", (e) => {
        state.aslabQuizBuilderQuestions[idx].code_snippet = e.target.value;
      });
      qCard.querySelector(".q-input-exp").addEventListener("input", (e) => {
        state.aslabQuizBuilderQuestions[idx].explanation = e.target.value;
      });
      qCard.querySelectorAll(".q-opt-input").forEach(optInp => {
        optInp.addEventListener("input", (e) => {
          const optIdx = parseInt(e.target.dataset.opt);
          if (!state.aslabQuizBuilderQuestions[idx].options) {
            state.aslabQuizBuilderQuestions[idx].options = ["", "", "", ""];
          }
          state.aslabQuizBuilderQuestions[idx].options[optIdx] = e.target.value;
        });
      });
      qCard.querySelectorAll(".q-correct-radio").forEach(radio => {
        radio.addEventListener("change", (e) => {
          state.aslabQuizBuilderQuestions[idx].correct_answer = parseInt(e.target.value);
        });
      });

      const delBtn = qCard.querySelector(".q-builder-del");
      if (delBtn) {
        delBtn.addEventListener("click", () => {
          state.aslabQuizBuilderQuestions.splice(idx, 1);
          renderAslabQuizBuilderQuestions();
        });
      }

      builderContainer.appendChild(qCard);
    });
  }

  function aslabQuizBuilderAddQuestion() {
    state.aslabQuizBuilderQuestions.push({
      id: state.aslabQuizBuilderQuestions.length + 1,
      question: "",
      code_snippet: "",
      options: ["", "", "", ""],
      correct_answer: 0,
      explanation: "",
      points: 25
    });
    renderAslabQuizBuilderQuestions();
  }

  async function submitAslabQuiz(e) {
    e.preventDefault();
    const editId = document.getElementById("aslab-quiz-edit-id").value;
    const title = document.getElementById("quiz-form-title").value.trim();
    const type = document.getElementById("quiz-form-type").value;
    const category = document.getElementById("quiz-form-category").value.trim() || "Dasar Pemrograman";
    const duration_minutes = parseInt(document.getElementById("quiz-form-duration").value) || 15;
    const schedule = document.getElementById("quiz-form-schedule").value.trim() || "Sesi Praktikum";
    const points = parseInt(document.getElementById("quiz-form-points").value) || 100;
    const description = document.getElementById("quiz-form-desc").value.trim();

    if (state.aslabQuizBuilderQuestions.length === 0) {
      showToast("Kuis harus memiliki minimal 1 butir soal!", "error");
      return;
    }

    // Validate that questions and options are filled
    for (let i = 0; i < state.aslabQuizBuilderQuestions.length; i++) {
      const q = state.aslabQuizBuilderQuestions[i];
      if (!q.question.trim()) {
        showToast(`Teks pertanyaan Soal #${i + 1} belum diisi!`, "error");
        return;
      }
      if (!q.options || q.options.some(opt => !opt.trim())) {
        showToast(`Seluruh pilihan jawaban A-D pada Soal #${i + 1} wajib diisi!`, "error");
        return;
      }
    }

    const payload = {
      title,
      type,
      category,
      duration_minutes,
      schedule,
      points,
      description,
      questions_json: JSON.stringify(state.aslabQuizBuilderQuestions),
      is_active: 1
    };

    const isEdit = Boolean(editId);
    const url = isEdit ? `${CONFIG.ENDPOINTS.QUIZZES}/${editId}` : CONFIG.ENDPOINTS.QUIZZES;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Save quiz failed");
      showToast(isEdit ? "Kuis berhasil diperbarui!" : "Kuis baru berhasil diterbitkan!", "success");
      document.getElementById("modal-aslab-quiz").classList.remove("open");
      await fetchQuizzes();
      renderAslabQuizzesTable();
    } catch (e) {
      showToast("Gagal menyimpan kuis: " + e.message, "error");
    }
  }

  async function deleteAslabQuiz(id) {
    if (!confirm(`Yakin ingin menghapus kuis #${id}? Seluruh riwayat submission kuis ini juga akan dihapus.`)) return;
    try {
      const res = await fetch(`${CONFIG.ENDPOINTS.QUIZZES}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Kuis berhasil dihapus!", "success");
      await fetchQuizzes();
      renderAslabQuizzesTable();
    } catch (e) {
      showToast("Gagal menghapus kuis: " + e.message, "error");
    }
  }

  function renderAslabArticlesTable() {
    const tbody = document.getElementById("aslab-articles-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    document.getElementById("aslab-count-art").textContent = state.articles.length;

    state.articles.forEach((art) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family: var(--font-mono);">#${art.id}</td>
        <td><strong>${art.title}</strong></td>
        <td>${art.category || 'Teori'}</td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">⏱️ ${art.reading_time || '10 Menit'}</td>
        <td><a href="${art.references_url || '#'}" target="_blank" rel="noopener" style="color: var(--accent-cyan); font-size: 0.75rem; text-decoration: underline;">MIT OCW ↗</a></td>
        <td style="text-align: right;">
          <button class="btn-table-edit" data-id="${art.id}">Edit ✎</button>
          <button class="btn-table-del" data-id="${art.id}">Hapus ✕</button>
        </td>
      `;
      tr.querySelector(".btn-table-edit").addEventListener("click", () => openEditArticleModal(art));
      tr.querySelector(".btn-table-del").addEventListener("click", () => deleteAslabArticle(art.id));
      tbody.appendChild(tr);
    });
  }

  async function fetchSubmissionsFeed() {
    const feed = document.getElementById("aslab-submissions-feed");
    if (!feed) return;
    feed.innerHTML = "<p style='color: var(--text-muted); font-size: 0.8rem;'>Memuat data submissions...</p>";

    try {
      const res = await fetch(CONFIG.ENDPOINTS.SUBMISSIONS);
      if (!res.ok) throw new Error("Fetch submissions failed");
      const data = await res.json();

      feed.innerHTML = "";
      if (data.length === 0) {
        feed.innerHTML = "<p style='color: var(--text-muted); font-size: 0.8rem;'>Belum ada submission dari praktikan.</p>";
        return;
      }

      data.forEach((s) => {
        const isSuccess = s.status === "success";
        const item = document.createElement("div");
        item.className = "sub-log-item";
        item.innerHTML = `
          <div class="sub-log-header">
            <span class="sub-user-badge">👤 ${s.username || 'student'} • ${s.language.toUpperCase()}</span>
            <span class="sub-status-tag ${isSuccess ? 'success' : 'error'}">${s.status.toUpperCase()}</span>
          </div>
          <span class="sub-time">⏰ ${s.timestamp || 'Baru saja'}</span>
          <div class="sub-code-preview"><code>${(s.code || '').replace(/\\n/g, ' ').slice(0, 70)}...</code></div>
        `;
        feed.appendChild(item);
      });
    } catch (e) {
      feed.innerHTML = "<p style='color: var(--accent-red); font-size: 0.8rem;'>Gagal memuat riwayat submission dari database.</p>";
    }
  }

  // Modals Open / Edit Helpers
  function openAddMaterialModal() {
    document.getElementById("aslab-mat-edit-id").value = "";
    document.getElementById("modal-heading-mat").textContent = "Tambah Modul Praktikum Baru";
    document.getElementById("form-add-material").reset();
    document.getElementById("modal-aslab").classList.add("open");
  }

  function openEditMaterialModal(m) {
    document.getElementById("aslab-mat-edit-id").value = m.id;
    document.getElementById("modal-heading-mat").textContent = `Edit Modul #${m.id}`;
    document.getElementById("aslab-title").value = m.title;
    document.getElementById("aslab-summary").value = m.summary || "";
    document.getElementById("aslab-lang").value = m.language || "c";
    document.getElementById("aslab-category").value = m.category || "";
    document.getElementById("aslab-content").value = m.content || "";
    document.getElementById("modal-aslab").classList.add("open");
  }

  function openAddAssignmentModal() {
    document.getElementById("aslab-ass-edit-id").value = "";
    document.getElementById("modal-heading-ass").textContent = "Tambah Tugas Praktikum Baru";
    document.getElementById("form-add-assignment").reset();
    document.getElementById("modal-aslab-assignment").classList.add("open");
  }

  function openEditAssignmentModal(a) {
    document.getElementById("aslab-ass-edit-id").value = a.id;
    document.getElementById("modal-heading-ass").textContent = `Edit Tugas #${a.id}`;
    document.getElementById("ass-form-title").value = a.title;
    document.getElementById("ass-form-category").value = a.category || "";
    document.getElementById("ass-form-deadline").value = a.deadline || "";
    document.getElementById("ass-form-points").value = a.points || 100;
    document.getElementById("ass-form-desc").value = a.description || "";
    document.getElementById("modal-aslab-assignment").classList.add("open");
  }

  function openAddArticleModal() {
    document.getElementById("aslab-art-edit-id").value = "";
    document.getElementById("modal-heading-art").textContent = "Tambah Artikel Teori Baru";
    document.getElementById("form-add-article").reset();
    document.getElementById("modal-aslab-article").classList.add("open");
  }

  function openEditArticleModal(art) {
    document.getElementById("aslab-art-edit-id").value = art.id;
    document.getElementById("modal-heading-art").textContent = `Edit Artikel #${art.id}`;
    document.getElementById("art-form-title").value = art.title;
    document.getElementById("art-form-category").value = art.category || "";
    document.getElementById("art-form-time").value = art.reading_time || "10 Menit";
    document.getElementById("art-form-summary").value = art.summary || "";
    document.getElementById("art-form-ref").value = art.references_url || "";
    document.getElementById("art-form-content").value = art.content || "";
    document.getElementById("modal-aslab-article").classList.add("open");
  }

  // Material CRUD Submit
  async function submitAslabMaterial(e) {
    e.preventDefault();
    const editId = document.getElementById("aslab-mat-edit-id").value;
    const title = document.getElementById("aslab-title").value.trim();
    const summary = document.getElementById("aslab-summary").value.trim();
    const language = document.getElementById("aslab-lang").value;
    const category = document.getElementById("aslab-category").value.trim() || "Dasar Pemrograman";
    const content = document.getElementById("aslab-content").value.trim();

    const isEdit = Boolean(editId);
    const url = isEdit ? `${CONFIG.ENDPOINTS.MATERIALS}/${editId}` : CONFIG.ENDPOINTS.MATERIALS;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary, content, language, category, difficulty: "Beginner", xp_reward: 50 })
      });
      if (!res.ok) throw new Error("Save material failed");
      showToast(isEdit ? "Modul berhasil diperbarui!" : "Modul baru berhasil ditambahkan!", "success");
      document.getElementById("modal-aslab").classList.remove("open");
      await fetchMaterials();
      renderAslabMaterialsTable();
    } catch (e) {
      showToast("Gagal menyimpan modul: " + e.message, "error");
    }
  }

  async function deleteAslabMaterial(id) {
    if (!confirm(`Yakin ingin menghapus modul #${id}?`)) return;
    try {
      const res = await fetch(`${CONFIG.ENDPOINTS.MATERIALS}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Modul berhasil dihapus!", "success");
      await fetchMaterials();
      renderAslabMaterialsTable();
    } catch (e) {
      showToast("Gagal menghapus modul: " + e.message, "error");
    }
  }

  // Assignment CRUD Submit
  async function submitAslabAssignment(e) {
    e.preventDefault();
    const editId = document.getElementById("aslab-ass-edit-id").value;
    const title = document.getElementById("ass-form-title").value.trim();
    const category = document.getElementById("ass-form-category").value.trim();
    const deadline = document.getElementById("ass-form-deadline").value.trim();
    const points = parseInt(document.getElementById("ass-form-points").value) || 100;
    const description = document.getElementById("ass-form-desc").value.trim();

    const isEdit = Boolean(editId);
    const url = isEdit ? `${CONFIG.ENDPOINTS.ASSIGNMENTS}/${editId}` : CONFIG.ENDPOINTS.ASSIGNMENTS;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: 1, title, category, deadline, points, description, task_prompt: description })
      });
      if (!res.ok) throw new Error("Save assignment failed");
      showToast(isEdit ? "Tugas berhasil diperbarui!" : "Tugas baru berhasil ditambahkan!", "success");
      document.getElementById("modal-aslab-assignment").classList.remove("open");
      await fetchAssignments();
      renderAslabAssignmentsTable();
    } catch (e) {
      showToast("Gagal menyimpan tugas: " + e.message, "error");
    }
  }

  async function deleteAslabAssignment(id) {
    if (!confirm(`Yakin ingin menghapus tugas #${id}?`)) return;
    try {
      const res = await fetch(`${CONFIG.ENDPOINTS.ASSIGNMENTS}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Tugas berhasil dihapus!", "success");
      await fetchAssignments();
      renderAslabAssignmentsTable();
    } catch (e) {
      showToast("Gagal menghapus tugas: " + e.message, "error");
    }
  }

  // Article CRUD Submit
  async function submitAslabArticle(e) {
    e.preventDefault();
    const editId = document.getElementById("aslab-art-edit-id").value;
    const title = document.getElementById("art-form-title").value.trim();
    const category = document.getElementById("art-form-category").value.trim();
    const reading_time = document.getElementById("art-form-time").value.trim();
    const summary = document.getElementById("art-form-summary").value.trim();
    const references_url = document.getElementById("art-form-ref").value.trim();
    const content = document.getElementById("art-form-content").value.trim();

    const isEdit = Boolean(editId);
    const url = isEdit ? `${CONFIG.ENDPOINTS.ARTICLES}/${editId}` : CONFIG.ENDPOINTS.ARTICLES;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: 1, title, category, reading_time, summary, content, references_url })
      });
      if (!res.ok) throw new Error("Save article failed");
      showToast(isEdit ? "Artikel berhasil diperbarui!" : "Artikel baru berhasil diterbitkan!", "success");
      document.getElementById("modal-aslab-article").classList.remove("open");
      await fetchArticles();
      renderAslabArticlesTable();
    } catch (e) {
      showToast("Gagal menyimpan artikel: " + e.message, "error");
    }
  }

  async function deleteAslabArticle(id) {
    if (!confirm(`Yakin ingin menghapus artikel #${id}?`)) return;
    try {
      const res = await fetch(`${CONFIG.ENDPOINTS.ARTICLES}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Artikel berhasil dihapus!", "success");
      await fetchArticles();
      renderAslabArticlesTable();
    } catch (e) {
      showToast("Gagal menghapus artikel: " + e.message, "error");
    }
  }

  // ─── Theme Switcher Controller ───
  function toggleTheme() {
    const isCyber = document.body.classList.toggle("theme-cyber");
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isCyber ? "cyber" : "dark");
    const lbl = document.getElementById("drop-theme-lbl");
    if (lbl) lbl.textContent = isCyber ? "Theme: Cyber Neon" : "Theme: Midnight";
    showToast(`Tema diubah ke ${isCyber ? 'Cyber Neon' : 'Midnight Dark'}`, "info");
  }

  // ─── Draggable Resizable Splitter ───
  function initDivider() {
    const divider = document.getElementById("workspace-divider");
    const panelLeft = document.getElementById("panel-left");
    const splitWorkspace = document.getElementById("split-workspace");
    if (!divider || !panelLeft || !splitWorkspace) return;

    let isDragging = false;

    divider.addEventListener("pointerdown", (e) => {
      isDragging = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const rect = splitWorkspace.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(22, Math.min(68, pct));
      panelLeft.style.width = `${clamped}%`;
    });

    document.addEventListener("pointerup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (state.workspaceEditor) state.workspaceEditor.refresh();
    });
  }

  // ─── Pure IDE Scratchpad & Notes Manager ───
  function initIdeScratchpad() {
    const STORAGE_KEY = "codelab_ide_scratchpad_notes";
    const scratchpad = document.getElementById("pure-scratchpad-area");
    const status = document.getElementById("notes-autosave-status");
    const toggleBtn = document.getElementById("btn-toggle-ide-notes");
    const sidebar = document.getElementById("pure-ide-notes-sidebar");
    const copyBtn = document.getElementById("btn-copy-scratchpad");
    const clearBtn = document.getElementById("btn-clear-scratchpad");
    const divider = document.getElementById("pure-notes-divider");

    // Load saved notes
    if (scratchpad) {
      const saved = localStorage.getItem(STORAGE_KEY) || "";
      scratchpad.value = saved;

      let saveTimeout = null;
      scratchpad.addEventListener("input", () => {
        if (status) {
          status.textContent = "💾 Menyimpan...";
          status.style.color = "var(--accent-gold)";
        }
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          localStorage.setItem(STORAGE_KEY, scratchpad.value);
          if (status) {
            status.textContent = "💾 Tersimpan";
            status.style.color = "var(--accent-green)";
          }
        }, 300);
      });
    }

    // Quick templates insertion
    const TEMPLATES = {
      todo: "\n[ ] 1. Rancang fungsi utama\n[ ] 2. Deklarasi variabel & tipe data\n[ ] 3. Periksa kondisi looping & edge case\n[ ] 4. Uji eksekusi & cek output\n",
      algo: "\n/* === LOGIKA / PSEUDOCODE === */\n1. Ambil input dari pengguna\n2. Lakukan iterasi / percabangan kondisi\n3. Hitung hasil komputasi\n4. Tampilkan format output akhir\n",
      vars: "\n/* === TRACKER VARIABEL === */\n- int n: jumlah data\n- int arr[100]: buffer memori\n- int i, j: indeks iterasi\n- int status: penanda kondisi\n",
      testcase: "\n/* === TEST CASE / CONTOH UJI === */\nInput:\n10 20 30\nExpected:\nTotal = 60 | Avg = 20.00\n"
    };

    document.querySelectorAll(".notes-templates-bar .note-chip-btn").forEach((chip) => {
      chip.addEventListener("click", () => {
        const t = chip.dataset.template;
        if (TEMPLATES[t] && scratchpad) {
          scratchpad.value += TEMPLATES[t];
          scratchpad.scrollTop = scratchpad.scrollHeight;
          scratchpad.dispatchEvent(new Event("input"));
          scratchpad.focus();
          showToast(`Template ${chip.textContent} ditambahkan ke catatan!`, "info");
        }
      });
    });

    // Copy notes
    if (copyBtn && scratchpad) {
      copyBtn.addEventListener("click", () => {
        if (!scratchpad.value.trim()) {
          showToast("Catatan masih kosong!", "info");
          return;
        }
        navigator.clipboard.writeText(scratchpad.value);
        showToast("Catatan & coretan berhasil disalin!", "success");
      });
    }

    // Clear notes
    if (clearBtn && scratchpad) {
      clearBtn.addEventListener("click", () => {
        if (confirm("Kosongkan semua isi catatan & coretan?")) {
          scratchpad.value = "";
          localStorage.removeItem(STORAGE_KEY);
          if (status) {
            status.textContent = "💾 Bersih";
            status.style.color = "var(--text-muted)";
          }
          showToast("Catatan telah dibersihkan", "info");
        }
      });
    }

    // Toggle Sidebar
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        if (state.pureEditor) {
          setTimeout(() => state.pureEditor.refresh(), 50);
        }
      });
    }

    // Resizable Scratchpad Divider
    if (divider && sidebar) {
      let isDragging = false;
      divider.addEventListener("pointerdown", (e) => {
        isDragging = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
      });

      document.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const split = document.getElementById("pure-ide-workspace-split");
        if (!split) return;
        const rect = split.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const clamped = Math.max(200, Math.min(650, newWidth));
        sidebar.style.width = `${clamped}px`;
      });

      document.addEventListener("pointerup", () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (state.pureEditor) state.pureEditor.refresh();
      });
    }
  }

  // ─── Setup Global Event Listeners ───
  function setupEventListeners() {
    const on = (id, event, handler) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, handler);
    };

    // Navigation Buttons
    on("nav-brand-btn", "click", (e) => {
      e.preventDefault();
      if (state.currentUser) {
        switchPage(state.isAslabAuthenticated ? "aslab" : "dashboard");
      } else {
        switchPage("landing");
      }
    });
    on("nav-btn-landing", "click", () => switchPage("landing"));
    on("nav-btn-dashboard", "click", () => switchPage("dashboard"));
    on("nav-btn-course", "click", () => switchPage("course"));
    on("nav-btn-assignment", "click", () => switchPage("assignment"));
    on("nav-btn-quiz", "click", () => switchPage("quiz"));
    on("nav-btn-leaderboard", "click", () => switchPage("leaderboard"));
    on("nav-btn-materials", "click", () => switchPage("materials"));
    on("nav-btn-ide", "click", () => switchPage("ide"));
    on("nav-btn-aslab", "click", () => switchPage("aslab"));

    // User Dropdown Trigger & Items (Matching userclick.png)
    const userWidget = document.getElementById("btn-open-user-menu");
    const userMenu = document.getElementById("user-dropdown-menu");
    if (userWidget && userMenu) {
      userWidget.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.toggle("open");
      });
      document.addEventListener("click", () => userMenu.classList.remove("open"));
    }

    on("drop-btn-profile", "click", () => {
      if (userMenu) userMenu.classList.remove("open");
      switchPage("profile");
    });
    on("drop-btn-leaderboard", "click", () => {
      if (userMenu) userMenu.classList.remove("open");
      switchPage("leaderboard");
    });
    on("drop-btn-bookmarks", "click", () => {
      if (userMenu) userMenu.classList.remove("open");
      switchPage("assignment");
    });
    on("drop-btn-account", "click", () => {
      if (userMenu) userMenu.classList.remove("open");
      openAuthModal("login");
    });
    on("drop-btn-signout", "click", () => {
      if (userMenu) userMenu.classList.remove("open");
      handleSignOut();
    });

    // Topbar Login Button
    on("btn-open-register-modal", "click", () => openAuthModal("login"));

    // Auth Hub Modal Tabs & Actions
    on("tab-auth-login", "click", () => openAuthModal("login"));
    on("tab-auth-aslab", "click", () => openAuthModal("aslab"));
    on("btn-close-auth-modal", "click", () => {
      const modal = document.getElementById("modal-auth-hub");
      if (modal) modal.classList.remove("open");
    });
    on("btn-cancel-login-modal", "click", () => {
      const modal = document.getElementById("modal-auth-hub");
      if (modal) modal.classList.remove("open");
    });
    on("btn-cancel-aslab-auth-modal", "click", () => {
      const modal = document.getElementById("modal-auth-hub");
      if (modal) modal.classList.remove("open");
    });
    on("form-auth-login", "submit", submitStudentLogin);
    on("form-auth-aslab", "submit", submitAslabLogin);

    // ─── Profile Customization Modal Logic ───
    const AVATAR_PRESETS = ["👨‍💻", "👩‍💻", "🤖", "👾", "🧙‍♂️", "🦊", "⚡", "👑", "🚀", "🐱", "🐉", "🎯", "💻", "🧠", "🎮", "🛡️", "🔥", "🔮", "💎", "⭐"];
    const BANNER_PRESETS = [
      { id: "cyber-neon", name: "Cyber Neon", style: "radial-gradient(circle at 75% 25%, #312e81 0%, #1e3a8a 45%, #064e3b 85%, #022c22 100%)" },
      { id: "matrix-emerald", name: "Matrix Green", style: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #030712 100%)" },
      { id: "synth-purple", name: "Synthwave", style: "linear-gradient(135deg, #4a044e 0%, #701a75 40%, #1e1b4b 100%)" },
      { id: "deep-space", name: "Deep Space", style: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)" },
      { id: "cyber-cyan", name: "Electric Cyan", style: "linear-gradient(135deg, #082f49 0%, #0369a1 50%, #020617 100%)" }
    ];

    let selectedCustomAvatar = "👨‍💻";
    let selectedCustomBanner = BANNER_PRESETS[0].style;

    function openProfileCustomizationModal() {
      if (!state.currentUser) {
        showToast("Silakan masuk menggunakan NIM / Username terlebih dahulu!", "info");
        openAuthModal("login");
        return;
      }

      const u = state.currentUser;
      const nameInp = document.getElementById("edit-prof-name");
      const nimInp = document.getElementById("edit-prof-nim");
      const avInp = document.getElementById("edit-prof-custom-avatar");
      const banInp = document.getElementById("edit-prof-custom-banner");

      if (nameInp) nameInp.value = u.name || "";
      if (nimInp) nimInp.value = u.nim || "";
      if (avInp) avInp.value = u.avatar || "";
      if (banInp) banInp.value = u.banner || "";

      selectedCustomAvatar = u.avatar || "👨‍💻";
      selectedCustomBanner = u.banner || BANNER_PRESETS[0].style;

      // Render Avatar Presets
      const avatarGrid = document.getElementById("avatar-presets-grid");
      if (avatarGrid) {
        avatarGrid.innerHTML = "";
        AVATAR_PRESETS.forEach((av) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `avatar-preset-btn ${av === selectedCustomAvatar ? 'active' : ''}`;
          btn.textContent = av;
          btn.addEventListener("click", () => {
            selectedCustomAvatar = av;
            if (avInp) avInp.value = av;
            avatarGrid.querySelectorAll(".avatar-preset-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
          });
          avatarGrid.appendChild(btn);
        });
      }

      // Render Banner Presets
      const bannerGrid = document.getElementById("banner-presets-grid");
      if (bannerGrid) {
        bannerGrid.innerHTML = "";
        BANNER_PRESETS.forEach((bp) => {
          const card = document.createElement("div");
          card.className = `banner-preset-card ${bp.style === selectedCustomBanner ? 'active' : ''}`;
          card.style.background = bp.style;
          card.textContent = bp.name;
          card.addEventListener("click", () => {
            selectedCustomBanner = bp.style;
            if (banInp) banInp.value = bp.style;
            bannerGrid.querySelectorAll(".banner-preset-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
          });
          bannerGrid.appendChild(card);
        });
      }

      const modalEdit = document.getElementById("modal-edit-profile");
      if (modalEdit) modalEdit.classList.add("open");
    }

    // Form Customize Profile Submit
    on("form-customize-profile", "submit", async (e) => {
      e.preventDefault();
      if (!state.currentUser) return;

      const nameVal = document.getElementById("edit-prof-name")?.value.trim();
      const nimVal = document.getElementById("edit-prof-nim")?.value.trim();
      const customAv = document.getElementById("edit-prof-custom-avatar")?.value.trim() || selectedCustomAvatar;
      const customBan = document.getElementById("edit-prof-custom-banner")?.value.trim() || selectedCustomBanner;

      try {
        const res = await fetch(`${CONFIG.ENDPOINTS.USERS}/${state.currentUser.username}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameVal,
            nim: nimVal,
            avatar: customAv,
            banner: customBan
          })
        });

        if (!res.ok) throw new Error("Gagal memperbarui profil");

        state.currentUser.name = nameVal;
        state.currentUser.nim = nimVal;
        state.currentUser.avatar = customAv;
        state.currentUser.banner = customBan;

        setCurrentUser(state.currentUser);
        renderUserProfilePage();
        const modalEdit = document.getElementById("modal-edit-profile");
        if (modalEdit) modalEdit.classList.remove("open");
        showToast("Profil, avatar, dan banner berhasil diperbarui!", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    });

    on("btn-close-edit-prof-modal", "click", () => {
      const modalEdit = document.getElementById("modal-edit-profile");
      if (modalEdit) modalEdit.classList.remove("open");
    });
    on("btn-cancel-edit-prof", "click", () => {
      const modalEdit = document.getElementById("modal-edit-profile");
      if (modalEdit) modalEdit.classList.remove("open");
    });

    on("btn-edit-profile-action", "click", openProfileCustomizationModal);
    on("btn-change-banner-direct", "click", openProfileCustomizationModal);
    on("btn-change-avatar-direct", "click", openProfileCustomizationModal);

    // ─── Spotlight Search Modal Logic ───
    const spotlightModal = document.getElementById("global-search-modal");
    const spotlightInput = document.getElementById("spotlight-search-input");
    const spotlightResults = document.getElementById("spotlight-results-list");

    function openSpotlightSearch() {
      if (!spotlightModal) return;
      spotlightModal.classList.add("open");
      if (spotlightInput) {
        spotlightInput.value = "";
        spotlightInput.focus();
      }
      renderSpotlightResults("");
    }

    function closeSpotlightSearch() {
      if (spotlightModal) spotlightModal.classList.remove("open");
    }

    function renderSpotlightResults(query) {
      if (!spotlightResults) return;
      spotlightResults.innerHTML = "";
      const q = (query || "").toLowerCase().trim();

      const matchedMats = state.materials.filter(m =>
        !q || m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      );

      const matchedAss = state.assignments.filter(a =>
        !q || (a.title && a.title.toLowerCase().includes(q)) || (a.description && a.description.toLowerCase().includes(q))
      );

      if (matchedMats.length === 0 && matchedAss.length === 0) {
        spotlightResults.innerHTML = `
          <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
            <span style="font-size: 1.6rem;">🔍</span>
            <p style="margin-top: 6px; font-size: 0.88rem;">Tidak ditemukan materi atau tugas dengan kata kunci "<strong>${escapeHtml(q)}</strong>"</p>
          </div>
        `;
        return;
      }

      // Render Materials Results
      matchedMats.slice(0, 5).forEach((mat) => {
        const item = document.createElement("div");
        item.className = "spotlight-item";
        item.innerHTML = `
          <div class="spotlight-item-left">
            <span class="spotlight-item-icon">📘</span>
            <div>
              <div class="spotlight-item-title">${escapeHtml(mat.title)}</div>
              <div class="spotlight-item-sub">${escapeHtml(mat.summary.slice(0, 75))}...</div>
            </div>
          </div>
          <span class="spotlight-item-tag">MODUL #${mat.id}</span>
        `;
        item.addEventListener("click", () => {
          closeSpotlightSearch();
          openArticle(state.materials.indexOf(mat));
        });
        spotlightResults.appendChild(item);
      });

      // Render Assignments Results
      matchedAss.slice(0, 3).forEach((ass) => {
        const item = document.createElement("div");
        item.className = "spotlight-item";
        item.innerHTML = `
          <div class="spotlight-item-left">
            <span class="spotlight-item-icon">📝</span>
            <div>
              <div class="spotlight-item-title">${escapeHtml(ass.title)}</div>
              <div class="spotlight-item-sub">${escapeHtml(ass.description.slice(0, 70))}...</div>
            </div>
          </div>
          <span class="spotlight-item-tag" style="color: var(--accent-gold); border-color: rgba(255, 212, 59, 0.3);">+${ass.points} XP</span>
        `;
        item.addEventListener("click", () => {
          closeSpotlightSearch();
          switchPage("assignment");
        });
        spotlightResults.appendChild(item);
      });
    }

    if (spotlightInput) {
      spotlightInput.addEventListener("input", (e) => {
        renderSpotlightResults(e.target.value);
      });
      spotlightInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const first = spotlightResults.querySelector(".spotlight-item");
          if (first) first.click();
        }
      });
    }

    on("btn-close-spotlight", "click", closeSpotlightSearch);

    // Profile Page Events
    on("btn-prof-goto-course", "click", () => switchPage("course"));
    on("btn-prof-explore-courses", "click", () => switchPage("course"));
    on("prof-tab-btn-overview", "click", () => {
      document.getElementById("prof-tab-btn-overview")?.classList.add("active");
      document.getElementById("prof-tab-btn-assignments")?.classList.remove("active");
      const c1 = document.getElementById("prof-content-overview");
      const c2 = document.getElementById("prof-content-assignments");
      if (c1) c1.style.display = "flex";
      if (c2) c2.style.display = "none";
    });
    on("prof-tab-btn-assignments", "click", () => {
      document.getElementById("prof-tab-btn-assignments")?.classList.add("active");
      document.getElementById("prof-tab-btn-overview")?.classList.remove("active");
      const c1 = document.getElementById("prof-content-overview");
      const c2 = document.getElementById("prof-content-assignments");
      if (c1) c1.style.display = "none";
      if (c2) c2.style.display = "flex";
    });

    // Floating Chat Drawer Events
    const chatBtn = document.getElementById("btn-floating-chat");
    const chatWindow = document.getElementById("chat-drawer-window");

    const closeChatDrawer = () => {
      if (chatWindow) chatWindow.classList.remove("open");
      if (chatBtn) chatBtn.classList.remove("chat-open");
    };

    if (chatBtn && chatWindow) {
      chatBtn.addEventListener("click", () => {
        const isOpen = chatWindow.classList.toggle("open");
        chatBtn.classList.toggle("chat-open", isOpen);
        if (isOpen) {
          fetchChatMessages();
          document.getElementById("chat-input-field")?.focus();
        }
      });
    }

    on("btn-close-chat-x", "click", closeChatDrawer);
    on("btn-close-chat-arrow", "click", closeChatDrawer);

    on("form-chat-send", "submit", (e) => {
      e.preventDefault();
      const val = document.getElementById("chat-input-field")?.value;
      if (val) sendChatMessage(val);
    });

    // Landing Page Filters
    document.querySelectorAll(".landing-chips .l-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".landing-chips .l-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        state.filteredCategory = chip.dataset.cat;
        renderLandingCards();
      });
    });

    const searchInput = document.getElementById("landing-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll(".landing-cards-grid .l-course-card");
        cards.forEach((c) => {
          const text = c.textContent.toLowerCase();
          c.style.display = text.includes(q) ? "flex" : "none";
        });
      });
    }

    // Landing Page CTAs
    on("btn-landing-start", "click", () => switchPage("dashboard"));
    on("btn-landing-explore", "click", () => switchPage("course"));
    on("badge-aslab-landing", "click", () => switchPage("aslab"));

    // Scroll Indicator Click
    on("hero-scroll-cue-btn", "click", () => {
      const anchor = document.getElementById("landing-modules-anchor");
      if (anchor) anchor.scrollIntoView({ behavior: "smooth" });
    });

    // Topbar Search Icon Click (Opens Spotlight)
    on("nav-search-trigger-btn", "click", openSpotlightSearch);

    // Footer Links Navigation
    document.querySelectorAll(".footer-nav-link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = link.getAttribute("data-target");
        const idx = link.getAttribute("data-idx");
        if (target === "materials" && idx !== null) {
          openArticle(parseInt(idx, 10));
        } else if (target) {
          switchPage(target);
        }
      });
    });

    on("footer-btn-open-chat", "click", (e) => {
      e.preventDefault();
      if (chatWindow) {
        chatWindow.classList.add("open");
        fetchChatMessages();
        document.getElementById("chat-input-field")?.focus();
      }
    });

    // Dashboard CTAs
    on("dash-btn-continue", "click", () => {
      loadMaterial(state.activeMaterialIndex);
      switchPage("workspace");
    });
    on("btn-dash-view-all-course", "click", (e) => {
      e.preventDefault();
      switchPage("course");
    });
    on("btn-view-course-map-side", "click", () => switchPage("course"));
    on("btn-switch-user-side", "click", () => openAuthModal("login"));
    on("btn-open-aslab-studio-side", "click", () => switchPage("aslab"));

    // Course Page CTAs
    on("btn-resume-course", "click", () => {
      loadMaterial(state.activeMaterialIndex);
      switchPage("workspace");
    });

    // Article Page CTAs
    on("btn-back-from-article", "click", () => switchPage("course"));
    on("btn-article-prev", "click", () => {
      if (state.activeMaterialIndex > 0) openArticle(state.activeMaterialIndex - 1);
    });
    on("btn-article-next", "click", () => {
      if (state.activeMaterialIndex < state.materials.length - 1) openArticle(state.activeMaterialIndex + 1);
    });

    // Pure IDE CTAs
    on("pure-tab-lang-c", "click", () => switchPureLanguage("c"));
    on("pure-tab-lang-python", "click", () => switchPureLanguage("python"));
    on("btn-pure-run", "click", () => executeCode("pure"));
    on("btn-pure-submit-task", "click", submitTaskLiveScore);
    on("btn-pure-reset", "click", () => {
      if (confirm("Kosongkan editor IDE?")) {
        state.pureCode[state.pureLanguage] = "";
        if (state.pureEditor) state.pureEditor.setValue("");
      }
    });
    on("btn-pure-copy", "click", () => {
      if (state.pureEditor) {
        navigator.clipboard.writeText(state.pureEditor.getValue());
        showToast("Kode disalin ke clipboard", "success");
      }
    });
    on("btn-pure-clear-term", "click", () => {
      termClear(document.getElementById("pure-terminal-content"), document.getElementById("pure-term-metrics"));
    });
    on("btn-pure-copy-term", "click", () => {
      const el = document.getElementById("pure-terminal-content");
      if (el) {
        navigator.clipboard.writeText(el.innerText);
        showToast("Output terminal disalin ke clipboard", "success");
      }
    });

    // Leaderboard CTAs
    on("btn-lead-tab-xp", "click", () => {
      document.getElementById("btn-lead-tab-xp")?.classList.add("active");
      document.getElementById("btn-lead-tab-live")?.classList.remove("active");
      const p1 = document.getElementById("pane-lead-xp");
      const p2 = document.getElementById("pane-lead-livescore");
      if (p1) p1.style.display = "block";
      if (p2) p2.style.display = "none";
    });
    on("btn-lead-tab-live", "click", () => {
      document.getElementById("btn-lead-tab-live")?.classList.add("active");
      document.getElementById("btn-lead-tab-xp")?.classList.remove("active");
      const p1 = document.getElementById("pane-lead-xp");
      const p2 = document.getElementById("pane-lead-livescore");
      if (p1) p1.style.display = "none";
      if (p2) p2.style.display = "block";
    });
    on("btn-refresh-leaderboard", "click", async () => {
      await fetchLeaderboard();
      await fetchLiveScores();
      showToast("Leaderboard & Live Scoreboard diperbarui!", "info");
    });
    on("lead-search-input", "input", (e) => {
      renderLeaderboard(e.target.value);
    });

    // Quiz & Exam Page Events
    on("qfilter-all", "click", () => {
      state.quizFilter = "all";
      document.querySelectorAll(".quiz-type-chips .q-chip").forEach(c => c.classList.toggle("active", c.id === "qfilter-all"));
      renderQuizzesList();
    });
    on("qfilter-quiz", "click", () => {
      state.quizFilter = "quiz";
      document.querySelectorAll(".quiz-type-chips .q-chip").forEach(c => c.classList.toggle("active", c.id === "qfilter-quiz"));
      renderQuizzesList();
    });
    on("qfilter-ujian", "click", () => {
      state.quizFilter = "ujian";
      document.querySelectorAll(".quiz-type-chips .q-chip").forEach(c => c.classList.toggle("active", c.id === "qfilter-ujian"));
      renderQuizzesList();
    });

    on("btn-quit-quiz", "click", () => {
      if (confirm("Yakin ingin keluar dari pengerjaan kuis? Jawaban belum tersimpan.")) {
        exitQuizPlayer();
      }
    });
    on("btn-submit-quiz-direct", "click", submitActiveQuiz);
    on("btn-goto-livescore-quiz", "click", () => {
      switchPage("leaderboard");
      document.getElementById("btn-lead-tab-live")?.click();
    });
    on("btn-result-view-livescore", "click", () => {
      switchPage("leaderboard");
      document.getElementById("btn-lead-tab-live")?.click();
    });
    on("btn-result-back-quizzes", "click", () => {
      exitQuizPlayer();
      switchPage("quiz");
    });

    // Course Workspace CTAs
    on("btn-back-dashboard", "click", () => switchPage("course"));
    on("btn-prev-material", "click", () => {
      if (state.activeMaterialIndex > 0) loadMaterial(state.activeMaterialIndex - 1);
    });
    on("btn-next-material", "click", () => {
      if (state.activeMaterialIndex < state.materials.length - 1) loadMaterial(state.activeMaterialIndex + 1);
    });
    on("tab-lang-c", "click", () => switchWorkspaceLanguage("c"));
    on("tab-lang-python", "click", () => switchWorkspaceLanguage("python"));
    on("btn-run-code", "click", () => executeCode("workspace"));
    on("btn-reset-code", "click", () => {
      if (confirm("Kosongkan editor untuk menulis kode dari awal?")) {
        state.workspaceCode[state.currentLanguage] = "";
        if (state.workspaceEditor) state.workspaceEditor.setValue("");
      }
    });
    on("btn-copy-code", "click", () => {
      if (state.workspaceEditor) {
        navigator.clipboard.writeText(state.workspaceEditor.getValue());
        showToast("Kode disalin ke clipboard", "success");
      }
    });
    on("btn-clear-terminal", "click", () => {
      termClear(document.getElementById("terminal-content-box"), document.getElementById("term-exec-metrics"));
    });
    on("btn-copy-terminal", "click", () => {
      const el = document.getElementById("terminal-content-box");
      if (el) {
        navigator.clipboard.writeText(el.innerText);
        showToast("Output terminal disalin ke clipboard", "success");
      }
    });

    // Aslab Studio Navigation Tabs
    on("tab-aslab-modules", "click", () => switchAslabTab("modules"));
    on("tab-aslab-assignments", "click", () => switchAslabTab("assignments"));
    on("tab-aslab-quizzes", "click", () => switchAslabTab("quizzes"));
    on("tab-aslab-articles", "click", () => switchAslabTab("articles"));
    on("tab-aslab-audit", "click", () => switchAslabTab("audit"));

    // Aslab Studio Modul Modals
    on("btn-aslab-add-new-mat", "click", openAddMaterialModal);
    on("btn-close-aslab-modal", "click", () => document.getElementById("modal-aslab")?.classList.remove("open"));
    on("btn-cancel-aslab-modal", "click", () => document.getElementById("modal-aslab")?.classList.remove("open"));
    on("form-add-material", "submit", submitAslabMaterial);

    // Aslab Studio Assignment Modals
    on("btn-aslab-add-new-ass", "click", openAddAssignmentModal);
    on("btn-close-ass-modal", "click", () => document.getElementById("modal-aslab-assignment")?.classList.remove("open"));
    on("btn-cancel-ass-modal", "click", () => document.getElementById("modal-aslab-assignment")?.classList.remove("open"));
    on("form-add-assignment", "submit", submitAslabAssignment);

    // Aslab Studio Quiz Modals
    on("btn-aslab-add-new-quiz", "click", openAddQuizModal);
    on("btn-aslab-add-question", "click", aslabQuizBuilderAddQuestion);
    on("btn-close-quiz-modal", "click", () => document.getElementById("modal-aslab-quiz")?.classList.remove("open"));
    on("btn-cancel-quiz-modal", "click", () => document.getElementById("modal-aslab-quiz")?.classList.remove("open"));
    on("form-add-quiz", "submit", submitAslabQuiz);

    // Aslab Studio Article Modals
    on("btn-aslab-add-new-art", "click", openAddArticleModal);
    on("btn-close-art-modal", "click", () => document.getElementById("modal-aslab-article")?.classList.remove("open"));
    on("btn-cancel-art-modal", "click", () => document.getElementById("modal-aslab-article")?.classList.remove("open"));
    on("form-add-article", "submit", submitAslabArticle);

    on("btn-aslab-logout", "click", handleSignOut);
    on("btn-refresh-submissions", "click", () => {
      fetchSubmissionsFeed();
      fetchLiveScores();
    });

    // Global Keydown (ESC and Ctrl+K)
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSpotlightSearch();
      } else if (e.key === "Escape") {
        const m1 = document.getElementById("modal-aslab");
        const m2 = document.getElementById("modal-auth-hub");
        const m3 = document.getElementById("modal-edit-profile");
        const m4 = document.getElementById("modal-aslab-assignment");
        const m5 = document.getElementById("modal-aslab-article");
        const m6 = document.getElementById("modal-aslab-quiz");
        if (m1) m1.classList.remove("open");
        if (m2) m2.classList.remove("open");
        if (m3) m3.classList.remove("open");
        if (m4) m4.classList.remove("open");
        if (m5) m5.classList.remove("open");
        if (m6) m6.classList.remove("open");
        closeSpotlightSearch();
        closeChatDrawer();
        if (userMenu) userMenu.classList.remove("open");
      }
    });
  }

  // ─── Application Bootstrap ───
  async function init() {
    initSplashscreen();

    // Default theme is Cyber Neon permanently
    document.body.classList.add("theme-cyber");

    initDivider();
    initIdeScratchpad();
    setupEventListeners();
    await fetchUsers();
    await fetchAslabAccounts();
    await fetchMaterials();
    await fetchAssignments();
    await fetchQuizzes();
    await fetchArticles();
    await fetchLeaderboard();
    await fetchLiveScores();
    await fetchChatMessages();

    const isGuest = !state.currentUser;
    const initialPage = isGuest ? "landing" : (localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_PAGE) || "dashboard");
    switchPage(initialPage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
