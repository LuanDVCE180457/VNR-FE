/* ==========================================================================
   VNR202 Interactive Quiz & Study Platform Logic
   ========================================================================== */

(function () {
  'use strict';

  // State Management
  const STATE_KEY = 'vnr202_study_state_v1';

  let questions = window.QUESTIONS || [];
  let congressSummary = window.CONGRESS_SUMMARY || [];
  let currentIndex = 0;
  let currentMode = 'practice'; // 'practice' | 'flashcard' | 'congress' | 'exam'
  let filterState = 'all'; // 'all' | 'unanswered' | 'wrong' | 'correct' | 'starred'
  let searchQuery = '';

  let userState = {
    answers: {},       // { qId: selectedOptionLabel }
    bookmarks: [],     // [ qId ]
    streak: 0,
    maxStreak: 0,
    theme: 'dark',
    sound: true,
    exam: {
      active: false,
      qIds: [],
      currentIndex: 0,
      userAnswers: {},
      timeRemaining: 0,
      timerId: null,
      submitted: false
    }
  };

  // Web Audio Synthesizer
  const SoundFX = {
    audioCtx: null,
    init() {
      if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
    },
    playCorrect() {
      if (!userState.sound) return;
      this.init();
      if (!this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
      } catch (e) {
        console.error(e);
      }
    },
    playWrong() {
      if (!userState.sound) return;
      this.init();
      if (!this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // DOM Element References
  const DOM = {
    themeBtn: document.getElementById('themeToggleBtn'),
    soundBtn: document.getElementById('soundToggleBtn'),
    resetBtn: document.getElementById('resetProgressBtn'),
    navPracticeBtn: document.getElementById('navPracticeBtn'),
    navFlashcardBtn: document.getElementById('navFlashcardBtn'),
    navCongressBtn: document.getElementById('navCongressBtn'),
    navExamBtn: document.getElementById('navExamBtn'),
    
    // Stats
    statTotal: document.getElementById('statTotal'),
    statCorrect: document.getElementById('statCorrect'),
    statWrong: document.getElementById('statWrong'),
    statAccuracy: document.getElementById('statAccuracy'),
    statStreak: document.getElementById('statStreak'),
    
    // Practice View
    practiceView: document.getElementById('practiceView'),
    qCardBadge: document.getElementById('qCardBadge'),
    bookmarkBtn: document.getElementById('bookmarkBtn'),
    qTitle: document.getElementById('qTitle'),
    optionsList: document.getElementById('optionsList'),
    feedbackBox: document.getElementById('feedbackBox'),
    prevBtn: document.getElementById('prevQBtn'),
    nextBtn: document.getElementById('nextQBtn'),
    
    // Flashcard View
    flashcardView: document.getElementById('flashcardView'),
    flashcardWrapper: document.getElementById('flashcardWrapper'),
    flashFrontBadge: document.getElementById('flashFrontBadge'),
    flashFrontTitle: document.getElementById('flashFrontTitle'),
    flashFrontOptions: document.getElementById('flashFrontOptions'),
    flashBackAnswer: document.getElementById('flashBackAnswer'),
    flashBackNotes: document.getElementById('flashBackNotes'),
    flashPrevBtn: document.getElementById('flashPrevBtn'),
    flashNextBtn: document.getElementById('flashNextBtn'),
    
    // Congress Summary View
    congressView: document.getElementById('congressView'),
    congressNavChips: document.getElementById('congressNavChips'),
    congressListContainer: document.getElementById('congressListContainer'),

    // Exam View
    examView: document.getElementById('examView'),
    examSetupCard: document.getElementById('examSetupCard'),
    examActiveCard: document.getElementById('examActiveCard'),
    examResultsCard: document.getElementById('examResultsCard'),
    startExamBtn: document.getElementById('startExamBtn'),
    examQCountInput: document.getElementById('examQCountInput'),
    examTimerBadge: document.getElementById('examTimerBadge'),
    examProgressBadge: document.getElementById('examProgressBadge'),
    examQTitle: document.getElementById('examQTitle'),
    examOptionsList: document.getElementById('examOptionsList'),
    examPrevBtn: document.getElementById('examPrevBtn'),
    examNextBtn: document.getElementById('examNextBtn'),
    submitExamBtn: document.getElementById('submitExamBtn'),
    
    // Sidebar Matrix & Filters
    searchBox: document.getElementById('searchBox'),
    filterChips: document.querySelectorAll('.chip-btn'),
    qGridMatrix: document.getElementById('qGridMatrix'),
    filteredCountLabel: document.getElementById('filteredCountLabel'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Initialization
  function init() {
    loadState();
    applyTheme();
    updateSoundUI();
    renderStats();
    setupEventListeners();
    renderFilteredMatrix();
    renderCurrentQuestion();
    renderCongressSummaryView();
  }

  // Load state from localStorage
  function loadState() {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        userState = { ...userState, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load local state:', e);
    }
  }

  // Save state to localStorage
  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(userState));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  // Apply Theme
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', userState.theme);
    if (DOM.themeBtn) {
      DOM.themeBtn.innerHTML = userState.theme === 'dark' 
        ? '<i class="fa-solid fa-moon"></i>' 
        : '<i class="fa-solid fa-sun"></i>';
    }
  }

  function toggleTheme() {
    userState.theme = userState.theme === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
    showToast(`Đã chuyển sang giao diện ${userState.theme === 'dark' ? 'Tối' : 'Sáng'}`);
  }

  function updateSoundUI() {
    if (DOM.soundBtn) {
      DOM.soundBtn.innerHTML = userState.sound 
        ? '<i class="fa-solid fa-volume-high"></i>' 
        : '<i class="fa-solid fa-volume-xmark"></i>';
      DOM.soundBtn.classList.toggle('active-icon', userState.sound);
    }
  }

  function toggleSound() {
    userState.sound = !userState.sound;
    saveState();
    updateSoundUI();
    showToast(userState.sound ? 'Đã bật âm thanh' : 'Đã tắt âm thanh');
  }

  // Filtered Questions Helper
  function getFilteredQuestions() {
    return questions.filter((q) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inQ = q.question.toLowerCase().includes(query);
        const inOpts = q.options.some((opt) => opt.text.toLowerCase().includes(query));
        if (!inQ && !inOpts) return false;
      }

      // 2. Status Filter
      const userAns = userState.answers[q.id];
      const isCorrect = userAns && q.answer.includes(userAns);
      const isWrong = userAns && !isCorrect;
      const isStarred = userState.bookmarks.includes(q.id);

      if (filterState === 'unanswered') return !userAns;
      if (filterState === 'correct') return isCorrect;
      if (filterState === 'wrong') return isWrong;
      if (filterState === 'starred') return isStarred;

      return true;
    });
  }

  // Calculate Overall Statistics
  function getStats() {
    const total = questions.length;
    let correct = 0;
    let wrong = 0;

    Object.keys(userState.answers).forEach((qIdStr) => {
      const qId = parseInt(qIdStr);
      const q = questions.find((item) => item.id === qId);
      if (q) {
        if (q.answer.includes(userState.answers[qId])) {
          correct++;
        } else {
          wrong++;
        }
      }
    });

    const answeredCount = correct + wrong;
    const accuracy = answeredCount > 0 ? Math.round((correct / answeredCount) * 100) : 0;

    return { total, correct, wrong, answeredCount, accuracy, streak: userState.streak };
  }

  function renderStats() {
    const stats = getStats();
    if (DOM.statTotal) DOM.statTotal.textContent = `${stats.answeredCount} / ${stats.total}`;
    if (DOM.statCorrect) DOM.statCorrect.textContent = stats.correct;
    if (DOM.statWrong) DOM.statWrong.textContent = stats.wrong;
    if (DOM.statAccuracy) DOM.statAccuracy.textContent = `${stats.accuracy}%`;
    if (DOM.statStreak) DOM.statStreak.textContent = `🔥 ${stats.streak}`;
  }

  // Switch App Mode
  function switchMode(newMode) {
    currentMode = newMode;
    DOM.navPracticeBtn.classList.toggle('active', currentMode === 'practice');
    DOM.navFlashcardBtn.classList.toggle('active', currentMode === 'flashcard');
    DOM.navCongressBtn.classList.toggle('active', currentMode === 'congress');
    DOM.navExamBtn.classList.toggle('active', currentMode === 'exam');

    DOM.practiceView.style.display = currentMode === 'practice' ? 'flex' : 'none';
    DOM.flashcardView.style.display = currentMode === 'flashcard' ? 'block' : 'none';
    DOM.congressView.style.display = currentMode === 'congress' ? 'flex' : 'none';
    DOM.examView.style.display = currentMode === 'exam' ? 'block' : 'none';

    renderCurrentQuestion();
    if (currentMode === 'congress') {
      renderCongressSummaryView();
    }
  }

  // Jump to specific Question ID in Practice Mode
  function jumpToQuestionId(qId) {
    // Reset filters if needed so question is visible
    filterState = 'all';
    searchQuery = '';
    DOM.searchBox.value = '';
    DOM.filterChips.forEach(c => c.classList.toggle('active', c.getAttribute('data-filter') === 'all'));

    const filtered = getFilteredQuestions();
    const idx = filtered.findIndex(item => item.id === qId);
    if (idx !== -1) {
      currentIndex = idx;
      switchMode('practice');
      renderFilteredMatrix();
      renderCurrentQuestion();
    }
  }

  // Practice View Renderer
  function renderPracticeQuestion() {
    const filteredList = getFilteredQuestions();
    if (filteredList.length === 0) {
      DOM.qTitle.textContent = 'Không tìm thấy câu hỏi nào phù hợp với bộ lọc.';
      DOM.optionsList.innerHTML = '';
      DOM.feedbackBox.style.display = 'none';
      DOM.qCardBadge.textContent = '0 / 0';
      return;
    }

    if (currentIndex >= filteredList.length) {
      currentIndex = 0;
    } else if (currentIndex < 0) {
      currentIndex = filteredList.length - 1;
    }

    const q = filteredList[currentIndex];

    // Header & Badge
    DOM.qCardBadge.textContent = `Câu ${q.id} / ${questions.length} (Danh sách lọc: ${currentIndex + 1}/${filteredList.length})`;
    
    // Bookmark status
    const isBookmarked = userState.bookmarks.includes(q.id);
    DOM.bookmarkBtn.classList.toggle('active', isBookmarked);
    DOM.bookmarkBtn.innerHTML = isBookmarked 
      ? '<i class="fa-solid fa-star"></i> Đã lưu' 
      : '<i class="fa-regular fa-star"></i> Lưu câu';

    // Title
    DOM.qTitle.textContent = q.question;

    // User previous answer
    const userAns = userState.answers[q.id];
    const isAnswered = !!userAns;

    // Options List
    DOM.optionsList.innerHTML = '';
    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      const keySpan = document.createElement('span');
      keySpan.className = 'option-key';
      keySpan.textContent = opt.label;

      const textSpan = document.createElement('span');
      textSpan.className = 'option-text';
      textSpan.textContent = opt.text;

      btn.appendChild(keySpan);
      btn.appendChild(textSpan);

      if (isAnswered) {
        btn.classList.add('disabled');
        const isTrueCorrect = q.answer.includes(opt.label);
        const isUserSelected = userAns === opt.label;

        if (isUserSelected && isTrueCorrect) {
          btn.classList.add('selected-correct');
          textSpan.innerHTML += ' <i class="fa-solid fa-circle-check" style="margin-left: 8px; color: #10b981;"></i>';
        } else if (isUserSelected && !isTrueCorrect) {
          btn.classList.add('selected-wrong');
          textSpan.innerHTML += ' <i class="fa-solid fa-circle-xmark" style="margin-left: 8px; color: #ef4444;"></i>';
        } else if (isTrueCorrect) {
          btn.classList.add('highlight-correct');
          textSpan.innerHTML += ' <i class="fa-solid fa-check" style="margin-left: 8px; color: #10b981;"></i> (Đáp án đúng)';
        }
      } else {
        btn.addEventListener('click', () => handleOptionSelect(q, opt.label));
      }

      DOM.optionsList.appendChild(btn);
    });

    // Feedback Box
    if (isAnswered) {
      const isCorrect = q.answer.includes(userAns);
      DOM.feedbackBox.style.display = 'flex';
      DOM.feedbackBox.className = `feedback-box ${isCorrect ? 'correct' : 'incorrect'}`;

      const iconHTML = isCorrect 
        ? '<i class="fa-solid fa-circle-check" style="font-size: 22px;"></i> Chính xác!' 
        : '<i class="fa-solid fa-triangle-exclamation" style="font-size: 22px;"></i> Chưa chính xác!';

      let detailHTML = `Đáp án đúng là: <strong>${q.answer.join(', ')}</strong>.`;
      if (q.answer_raw && q.answer_raw.includes('(')) {
        detailHTML += `<br><span style="margin-top: 4px; display: block; font-style: italic;">Note: ${q.answer_raw}</span>`;
      }

      DOM.feedbackBox.innerHTML = `
        <div class="feedback-title">${iconHTML}</div>
        <div class="feedback-detail">${detailHTML}</div>
      `;
    } else {
      DOM.feedbackBox.style.display = 'none';
    }

    // Prev / Next buttons
    DOM.prevBtn.disabled = currentIndex === 0;
    DOM.nextBtn.disabled = currentIndex === filteredList.length - 1;

    highlightActiveGridItem(q.id);
  }

  // Handle Option Click
  function handleOptionSelect(question, selectedLabel) {
    if (userState.answers[question.id]) return;

    userState.answers[question.id] = selectedLabel;
    const isCorrect = question.answer.includes(selectedLabel);

    if (isCorrect) {
      userState.streak++;
      if (userState.streak > userState.maxStreak) {
        userState.maxStreak = userState.streak;
      }
      SoundFX.playCorrect();
    } else {
      userState.streak = 0;
      SoundFX.playWrong();
    }

    saveState();
    renderStats();
    renderPracticeQuestion();
    renderFilteredMatrix();
  }

  // Flashcard View Renderer
  function renderFlashcardQuestion() {
    const filteredList = getFilteredQuestions();
    if (filteredList.length === 0) return;

    if (currentIndex >= filteredList.length) currentIndex = 0;
    const q = filteredList[currentIndex];

    DOM.flashcardWrapper.classList.remove('flipped');
    DOM.flashFrontBadge.textContent = `Câu ${q.id} / ${questions.length}`;
    DOM.flashFrontTitle.textContent = q.question;

    DOM.flashFrontOptions.innerHTML = '';
    q.options.forEach((opt) => {
      const div = document.createElement('div');
      div.className = 'option-btn disabled';
      div.style.cursor = 'default';
      div.innerHTML = `<span class="option-key">${opt.label}</span><span class="option-text">${opt.text}</span>`;
      DOM.flashFrontOptions.appendChild(div);
    });

    const correctOpts = q.options.filter(opt => q.answer.includes(opt.label));
    DOM.flashBackAnswer.innerHTML = `
      <div style="font-size: 14px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Đáp án đúng</div>
      <div style="font-size: 22px; font-weight: 800; color: var(--success);">
        ${q.answer.join(', ')} - ${correctOpts.map(o => o.text).join('; ')}
      </div>
    `;

    DOM.flashBackNotes.textContent = q.answer_raw ? `Ghi chú: ${q.answer_raw}` : '';

    DOM.flashPrevBtn.disabled = currentIndex === 0;
    DOM.flashNextBtn.disabled = currentIndex === filteredList.length - 1;
  }

  // Congress Summary View Renderer
  function renderCongressSummaryView() {
    if (!DOM.congressListContainer || !DOM.congressNavChips) return;

    // Render Quick Nav Chips
    DOM.congressNavChips.innerHTML = '';
    congressSummary.forEach((c) => {
      const chip = document.createElement('button');
      chip.className = 'chip-btn';
      chip.textContent = c.badge;
      chip.addEventListener('click', () => {
        const el = document.getElementById(`congress_card_${c.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      DOM.congressNavChips.appendChild(chip);
    });

    // Render Congress Cards
    DOM.congressListContainer.innerHTML = '';
    congressSummary.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'congress-card';
      card.id = `congress_card_${c.id}`;

      // Highlights List
      const highlightsHTML = c.highlights.map(h => `<li>${h}</li>`).join('');

      // Questions List
      let qListHTML = '';
      if (c.questions.length > 0) {
        qListHTML = c.questions.map(q => `
          <div class="congress-q-item">
            <div class="congress-q-head">
              <span class="q-number-badge" style="font-size: 12px; padding: 2px 10px;">Câu ${q.id}</span>
              <button class="practice-jump-btn" data-qid="${q.id}">
                <i class="fa-solid fa-play" style="font-size: 10px;"></i> Luyện câu này
              </button>
            </div>
            <div class="congress-q-text">${q.question}</div>
            <div class="congress-q-ans">
              <i class="fa-solid fa-circle-check"></i> Đáp án đúng (${q.answer.join(', ')}): <strong>${q.answer_text}</strong>
            </div>
          </div>
        `).join('');
      } else {
        qListHTML = '<div style="font-size: 13px; color: var(--text-muted); font-style: italic;">Không có câu hỏi trực tiếp trong bộ đề thi.</div>';
      }

      card.innerHTML = `
        <div class="congress-header">
          <div class="congress-title-area">
            <h3>${c.title}</h3>
            <div class="congress-location"><i class="fa-solid fa-location-dot"></i> ${c.location}</div>
          </div>
          <span class="congress-badge">${c.badge}</span>
        </div>

        <div class="congress-highlights">
          <div class="congress-highlights-title"><i class="fa-solid fa-lightbulb"></i> Kiến Thức Trọng Tâm</div>
          <ul>${highlightsHTML}</ul>
        </div>

        <div class="congress-questions-box">
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">
            <i class="fa-solid fa-list-check" style="color: var(--accent-primary);"></i> 
            Các Câu Hỏi Trắc Nghiệm Trong Bộ Đề (${c.questions.length} câu)
          </div>
          ${qListHTML}
        </div>
      `;

      DOM.congressListContainer.appendChild(card);
    });

    // Attach click listeners for "Luyện câu này" jump buttons
    const jumpBtns = DOM.congressListContainer.querySelectorAll('.practice-jump-btn');
    jumpBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const qId = parseInt(btn.getAttribute('data-qid'));
        jumpToQuestionId(qId);
      });
    });
  }

  // Render Exam Setup / Active Exam
  function renderExamView() {
    const exam = userState.exam;
    if (!exam.active && !exam.submitted) {
      DOM.examSetupCard.style.display = 'flex';
      DOM.examActiveCard.style.display = 'none';
      DOM.examResultsCard.style.display = 'none';
    } else if (exam.active && !exam.submitted) {
      DOM.examSetupCard.style.display = 'none';
      DOM.examActiveCard.style.display = 'flex';
      DOM.examResultsCard.style.display = 'none';
      renderExamQuestion();
    } else if (exam.submitted) {
      DOM.examSetupCard.style.display = 'none';
      DOM.examActiveCard.style.display = 'none';
      DOM.examResultsCard.style.display = 'flex';
      renderExamResults();
    }
  }

  function startExam() {
    const count = parseInt(DOM.examQCountInput.value) || 40;
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selectedQ = shuffled.slice(0, Math.min(count, questions.length));

    userState.exam = {
      active: true,
      qIds: selectedQ.map(q => q.id),
      currentIndex: 0,
      userAnswers: {},
      timeRemaining: Math.min(count * 60, 45 * 60),
      submitted: false
    };

    if (userState.exam.timerId) clearInterval(userState.exam.timerId);

    userState.exam.timerId = setInterval(() => {
      userState.exam.timeRemaining--;
      updateExamTimerUI();
      if (userState.exam.timeRemaining <= 0) {
        clearInterval(userState.exam.timerId);
        submitExam();
      }
    }, 1000);

    saveState();
    renderExamView();
  }

  function updateExamTimerUI() {
    const sec = userState.exam.timeRemaining;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    DOM.examTimerBadge.innerHTML = `<i class="fa-regular fa-clock"></i> ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function renderExamQuestion() {
    const exam = userState.exam;
    const qId = exam.qIds[exam.currentIndex];
    const q = questions.find(item => item.id === qId);

    updateExamTimerUI();
    DOM.examProgressBadge.textContent = `Câu ${exam.currentIndex + 1} / ${exam.qIds.length}`;
    DOM.examQTitle.textContent = q.question;

    const currentAns = exam.userAnswers[qId];

    DOM.examOptionsList.innerHTML = '';
    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = `option-btn ${currentAns === opt.label ? 'selected-correct' : ''}`;
      btn.innerHTML = `<span class="option-key">${opt.label}</span><span class="option-text">${opt.text}</span>`;
      btn.addEventListener('click', () => {
        exam.userAnswers[qId] = opt.label;
        saveState();
        renderExamQuestion();
      });
      DOM.examOptionsList.appendChild(btn);
    });

    DOM.examPrevBtn.disabled = exam.currentIndex === 0;
    DOM.examNextBtn.disabled = exam.currentIndex === exam.qIds.length - 1;
  }

  function submitExam() {
    const exam = userState.exam;
    if (exam.timerId) clearInterval(exam.timerId);
    exam.active = false;
    exam.submitted = true;

    let correctCount = 0;
    exam.qIds.forEach((qId) => {
      const q = questions.find(item => item.id === qId);
      const userAns = exam.userAnswers[qId];
      if (q && userAns && q.answer.includes(userAns)) {
        correctCount++;
        userState.answers[qId] = userAns;
      } else if (q && userAns) {
        userState.answers[qId] = userAns;
      }
    });

    saveState();
    renderStats();
    renderExamView();
  }

  function renderExamResults() {
    const exam = userState.exam;
    let correctCount = 0;
    exam.qIds.forEach((qId) => {
      const q = questions.find(item => item.id === qId);
      if (q && exam.userAnswers[qId] && q.answer.includes(exam.userAnswers[qId])) {
        correctCount++;
      }
    });

    const total = exam.qIds.length;
    const scorePct = Math.round((correctCount / total) * 100);

    const scoreCircle = DOM.examResultsCard.querySelector('.score-num');
    if (scoreCircle) scoreCircle.textContent = `${scorePct}%`;

    const summaryText = DOM.examResultsCard.querySelector('.exam-summary-text');
    if (summaryText) {
      summaryText.innerHTML = `Bạn đã trả lời đúng <strong>${correctCount}</strong> / <strong>${total}</strong> câu hỏi.`;
    }
  }

  function resetExam() {
    userState.exam = {
      active: false,
      qIds: [],
      currentIndex: 0,
      userAnswers: {},
      timeRemaining: 0,
      timerId: null,
      submitted: false
    };
    saveState();
    renderExamView();
  }

  // Render Current View
  function renderCurrentQuestion() {
    if (currentMode === 'practice') renderPracticeQuestion();
    if (currentMode === 'flashcard') renderFlashcardQuestion();
    if (currentMode === 'congress') renderCongressSummaryView();
    if (currentMode === 'exam') renderExamView();
  }

  // Sidebar Question Grid Matrix Renderer
  function renderFilteredMatrix() {
    const filteredList = getFilteredQuestions();
    DOM.filteredCountLabel.textContent = `(Hiển thị ${filteredList.length}/${questions.length})`;

    DOM.qGridMatrix.innerHTML = '';
    filteredList.forEach((q, index) => {
      const item = document.createElement('div');
      item.className = 'q-grid-item';
      item.textContent = q.id;

      const userAns = userState.answers[q.id];
      if (userAns) {
        const isCorrect = q.answer.includes(userAns);
        item.classList.add(isCorrect ? 'status-correct' : 'status-wrong');
      }

      if (userState.bookmarks.includes(q.id)) {
        item.classList.add('status-starred');
      }

      const activeQ = filteredList[currentIndex];
      if (activeQ && activeQ.id === q.id) {
        item.classList.add('active-current');
      }

      item.addEventListener('click', () => {
        currentIndex = index;
        if (currentMode !== 'practice') switchMode('practice');
        renderCurrentQuestion();
      });

      DOM.qGridMatrix.appendChild(item);
    });
  }

  function highlightActiveGridItem(qId) {
    const items = DOM.qGridMatrix.querySelectorAll('.q-grid-item');
    items.forEach((item) => {
      if (parseInt(item.textContent) === qId) {
        item.classList.add('active-current');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('active-current');
      }
    });
  }

  // Bookmark Toggle
  function toggleBookmark() {
    const filteredList = getFilteredQuestions();
    if (filteredList.length === 0) return;
    const q = filteredList[currentIndex];
    
    const idx = userState.bookmarks.indexOf(q.id);
    if (idx > -1) {
      userState.bookmarks.splice(idx, 1);
      showToast(`Đã bỏ lưu câu ${q.id}`);
    } else {
      userState.bookmarks.push(q.id);
      showToast(`Đã lưu câu ${q.id} vào danh sách ⭐`);
    }

    saveState();
    renderPracticeQuestion();
    renderFilteredMatrix();
  }

  // Toast Notification
  function showToast(message) {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-info-circle" style="color: var(--accent-primary);"></i> ${message}`;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Reset Progress
  function resetAllProgress() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử và làm lại từ đầu?')) {
      userState.answers = {};
      userState.bookmarks = [];
      userState.streak = 0;
      userState.maxStreak = 0;
      saveState();
      renderStats();
      renderFilteredMatrix();
      renderCurrentQuestion();
      showToast('Đã xóa toàn bộ tiến trình học tập!');
    }
  }

  // Event Listeners
  function setupEventListeners() {
    DOM.themeBtn.addEventListener('click', toggleTheme);
    DOM.soundBtn.addEventListener('click', toggleSound);
    DOM.resetBtn.addEventListener('click', resetAllProgress);

    // Nav Mode Tabs
    DOM.navPracticeBtn.addEventListener('click', () => switchMode('practice'));
    DOM.navFlashcardBtn.addEventListener('click', () => switchMode('flashcard'));
    DOM.navCongressBtn.addEventListener('click', () => switchMode('congress'));
    DOM.navExamBtn.addEventListener('click', () => switchMode('exam'));

    // Practice Nav
    DOM.prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        renderPracticeQuestion();
      }
    });

    DOM.nextBtn.addEventListener('click', () => {
      const filtered = getFilteredQuestions();
      if (currentIndex < filtered.length - 1) {
        currentIndex++;
        renderPracticeQuestion();
      }
    });

    DOM.bookmarkBtn.addEventListener('click', toggleBookmark);

    // Flashcard Flip & Nav
    if (DOM.flashcardWrapper) {
      DOM.flashcardWrapper.addEventListener('click', () => {
        DOM.flashcardWrapper.classList.toggle('flipped');
      });
    }

    DOM.flashPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentIndex > 0) {
        currentIndex--;
        renderFlashcardQuestion();
      }
    });

    DOM.flashNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filtered = getFilteredQuestions();
      if (currentIndex < filtered.length - 1) {
        currentIndex++;
        renderFlashcardQuestion();
      }
    });

    // Exam Nav
    DOM.startExamBtn.addEventListener('click', startExam);
    DOM.submitExamBtn.addEventListener('click', submitExam);
    DOM.examPrevBtn.addEventListener('click', () => {
      if (userState.exam.currentIndex > 0) {
        userState.exam.currentIndex--;
        renderExamQuestion();
      }
    });
    DOM.examNextBtn.addEventListener('click', () => {
      if (userState.exam.currentIndex < userState.exam.qIds.length - 1) {
        userState.exam.currentIndex++;
        renderExamQuestion();
      }
    });

    const resetExamBtn = document.getElementById('resetExamBtn');
    if (resetExamBtn) resetExamBtn.addEventListener('click', resetExam);

    // Search Input
    DOM.searchBox.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentIndex = 0;
      renderFilteredMatrix();
      renderCurrentQuestion();
    });

    // Filter Chips
    DOM.filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        DOM.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        filterState = chip.getAttribute('data-filter');
        currentIndex = 0;
        renderFilteredMatrix();
        renderCurrentQuestion();
      });
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (currentMode === 'practice' && currentIndex > 0) {
          currentIndex--;
          renderPracticeQuestion();
        } else if (currentMode === 'flashcard' && currentIndex > 0) {
          currentIndex--;
          renderFlashcardQuestion();
        }
      } else if (e.key === 'ArrowRight') {
        const filtered = getFilteredQuestions();
        if (currentMode === 'practice' && currentIndex < filtered.length - 1) {
          currentIndex++;
          renderPracticeQuestion();
        } else if (currentMode === 'flashcard' && currentIndex < filtered.length - 1) {
          currentIndex++;
          renderFlashcardQuestion();
        }
      } else if (currentMode === 'practice') {
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(key)) {
          const filtered = getFilteredQuestions();
          if (filtered[currentIndex]) {
            handleOptionSelect(filtered[currentIndex], key);
          }
        } else if (key === 'S') {
          toggleBookmark();
        }
      } else if (currentMode === 'flashcard') {
        if (e.key === ' ' || e.key.toUpperCase() === 'F') {
          e.preventDefault();
          DOM.flashcardWrapper.classList.toggle('flipped');
        }
      }
    });
  }

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
