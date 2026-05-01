import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJPec8wnNGvp631GmngcWAkDaaWZeAYv4",
  authDomain: "salvation-thread-game.firebaseapp.com",
  projectId: "salvation-thread-game",
  storageBucket: "salvation-thread-game.firebasestorage.app",
  messagingSenderId: "123421337758",
  appId: "1:123421337758:web:c96044415f5355a302b38f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const startScreen = document.getElementById("start-screen");
    const gameHeader = document.getElementById("game-header");
    const quizSection = document.getElementById("quiz-section");
    const gameFooter = document.getElementById("game-footer");
    const stageBtns = document.querySelectorAll(".stage-btn");

    const questionText = document.getElementById("question-text");
    const choicesContainer = document.getElementById("choices-container");
    const timerBar = document.getElementById("timer-bar");
    const progressFill = document.getElementById("progress-fill");
    const feedbackOverlay = document.getElementById("feedback-overlay");
    const feedbackText = document.getElementById("feedback-text");
    const resultButtons = document.getElementById("result-buttons");
    const retryBtn = document.getElementById("retry-btn");
    const homeBtn = document.getElementById("home-btn");

    const creatorScreen = document.getElementById("creator-screen");
    const openCreatorBtn = document.getElementById("open-creator-btn");
    const registerBtn = document.getElementById("register-q-btn");
    const backToHomeBtn = document.getElementById("back-to-home-btn");

    const newQText = document.getElementById("new-q-text");
    const newQA = document.getElementById("new-q-a");
    const newQB = document.getElementById("new-q-b");
    const newQC = document.getElementById("new-q-c");
    const newQD = document.getElementById("new-q-d");
    const newQGenre = document.getElementById("new-q-genre");

    // Game State
    let activeQuizData = [];
    loadCustomQuestions();
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let altitude = 0; // 高度
    let life = 3; // 耐久値
    const targetAltitude = 15; // 15問正解分の高度でクリア
    
    // Timer State
    let timerInterval;
    let timeRemaining = 0;
    let lastTime = 0;

    // 現在の高度に応じた制限時間を取得
    function getTimeLimit() {
        if (altitude < 5) return 10000; // Lv.1: 10秒
        if (altitude < 10) return 7000;  // Lv.2: 7秒
        return 4000; // Lv.3: 4秒
    }

    // Event Listeners for Start Screen
    stageBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const stage = e.target.dataset.stage;
            startGame(stage);
        });
    });

    retryBtn.addEventListener("click", () => {
        resetGameVisuals();
        initGame();
    });

    homeBtn.addEventListener("click", () => {
        resetGameVisuals();
        showStartScreen();
    });

    function showStartScreen() {
        startScreen.classList.remove("hidden");
        gameHeader.style.display = "none";
        quizSection.style.display = "none";
        gameFooter.style.display = "none";
    }

    function resetGameVisuals() {
        // クラスのリセット
        const thread = document.getElementById("light-thread");
        thread.className = ""; 
        const player = document.getElementById("player-character");
        player.classList.remove("falling");
        
        // オーバーレイのリセット
        feedbackOverlay.classList.add("hidden");
        feedbackOverlay.style.background = ""; 
        resultButtons.classList.add("hidden");
        feedbackText.style.textShadow = "";
        feedbackText.innerHTML = "";
    }

    function startGame(stage) {
        startScreen.classList.add("hidden");
        gameHeader.style.display = "flex";
        quizSection.style.display = "flex";
        gameFooter.style.display = "flex";

        if (stage === "bible") {
            activeQuizData = [...quizData];
        } else if (stage === "spirit") {
            activeQuizData = [...spiritQuizData];
        } else if (stage === "galaxy") {
            activeQuizData = [...galaxyQuizData];
        }

        initGame();
    }

    // Creator Logic
    openCreatorBtn.addEventListener("click", () => {
        creatorScreen.classList.remove("hidden");
    });

    backToHomeBtn.addEventListener("click", () => {
        creatorScreen.classList.add("hidden");
        clearCreatorInputs();
    });

    registerBtn.addEventListener("click", () => {
        const text = newQText.value.trim();
        const a = newQA.value.trim();
        const b = newQB.value.trim();
        const c = newQC.value.trim();
        const d = newQD.value.trim();
        const correct = document.querySelector('input[name="correct-ans"]:checked').value;
        const genre = newQGenre.value;

        if (!text || !a || !b || !c || !d) {
            alert("全ての項目を入力してください。");
            return;
        }

        const newQuestion = {
            question: text,
            choices: [a, b, c, d],
            answer: parseInt(correct, 10),
            genre: genre
        };

        // 配列に追加
        if (genre === "bible") quizData.push(newQuestion);
        else if (genre === "spirit") spiritQuizData.push(newQuestion);
        else if (genre === "galaxy") galaxyQuizData.push(newQuestion);

        // Firestore に保存
        try {
            await addDoc(collection(db, "questions"), newQuestion);
            alert("登録しました！クラウドに保存されました。");
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("保存に失敗しました。");
        }

        creatorScreen.classList.add("hidden");
        clearCreatorInputs();
    });

    function clearCreatorInputs() {
        newQText.value = "";
        newQA.value = "";
        newQB.value = "";
        newQC.value = "";
        newQD.value = "";
        document.getElementById("ans0").checked = true;
    }

    async function loadCustomQuestions() {
        try {
            const querySnapshot = await getDocs(collection(db, "questions"));
            querySnapshot.forEach((doc) => {
                const q = doc.data();
                if (q.genre === "bible") quizData.push(q);
                else if (q.genre === "spirit") spiritQuizData.push(q);
                else if (q.genre === "galaxy") galaxyQuizData.push(q);
            });
            console.log("Firebase から問題を読み込みました。");
        } catch (e) {
            console.error("Error loading documents: ", e);
        }
    }

    // Initialize Game
    function initGame() {
        // 選ばれたデータをシャッフルして保持
        currentQuestions = [...activeQuizData].sort(() => Math.random() - 0.5);
        currentQuestionIndex = 0;
        altitude = 0;
        life = 3;
        updateLifeUI();
        updateProgress();
        showQuestion();
    }

    function showQuestion() {
        const q = currentQuestions[currentQuestionIndex];
        questionText.textContent = q.question;
        
        // 選択肢の生成
        choicesContainer.innerHTML = "";
        q.choices.forEach((choice, index) => {
            const btn = document.createElement("button");
            btn.classList.add("choice-btn");
            btn.textContent = choice;
            btn.dataset.index = index;
            btn.addEventListener("click", handleChoiceClick);
            choicesContainer.appendChild(btn);
        });

        startTimer();
    }

    function startTimer() {
        const timeLimit = getTimeLimit();
        timeRemaining = timeLimit;
        lastTime = performance.now();
        updateTimerDisplay(1); // 100%

        const tick = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            timeRemaining -= deltaTime;

            if (timeRemaining <= 0) {
                timeRemaining = 0;
                updateTimerDisplay(0);
                handleTimeout();
                return; // タイマー終了
            }

            const ratio = timeRemaining / timeLimit;
            updateTimerDisplay(ratio);
            timerInterval = requestAnimationFrame(tick);
        };

        timerInterval = requestAnimationFrame(tick);
    }

    function stopTimer() {
        cancelAnimationFrame(timerInterval);
    }

    function updateTimerDisplay(ratio) {
        timerBar.style.width = `${ratio * 100}%`;
        
        // 残り時間が少ない時に色を変える演出
        if (ratio < 0.3) {
            timerBar.style.background = "#f87171"; // Red
        } else {
            timerBar.style.background = "linear-gradient(90deg, #ff4e50, #f9d423)";
        }
    }

    function handleChoiceClick(e) {
        stopTimer();
        const selectedBtn = e.target;
        const selectedIndex = parseInt(selectedBtn.dataset.index, 10);
        const correctIndex = currentQuestions[currentQuestionIndex].answer;

        // 全ボタンを無効化
        const buttons = choicesContainer.querySelectorAll(".choice-btn");
        buttons.forEach(btn => btn.classList.add("disabled"));

        if (selectedIndex === correctIndex) {
            selectedBtn.classList.add("correct");
            showFeedback("AMEN", true);
            altitude = Math.min(targetAltitude, altitude + 1);
            spawnAngels(); // ラッパの天使演出
        } else {
            selectedBtn.classList.add("wrong");
            buttons[correctIndex].classList.add("correct");
            showFeedback("SIN", false);
            altitude = Math.max(0, altitude - 1);
            life--;
            updateLifeUI();
            if (life > 0) spawnCrow(); // カラス演出（ゲームオーバー以外）
        }
        
        // 正解でも不正解でも背景とキャラを動かす
        updateProgress();

        setTimeout(() => {
            nextQuestion();
        }, 1500); // 1.5秒後に次の問題へ
    }

    function handleTimeout() {
        const correctIndex = currentQuestions[currentQuestionIndex].answer;
        const buttons = choicesContainer.querySelectorAll(".choice-btn");
        buttons.forEach(btn => btn.classList.add("disabled"));
        buttons[correctIndex].classList.add("correct");
        
        showFeedback("TIME UP", false);
        altitude = Math.max(0, altitude - 1);
        life--;
        updateLifeUI();
        updateProgress();
        if (life > 0) spawnCrow();

        setTimeout(() => {
            nextQuestion();
        }, 1500);
    }

    function showFeedback(text, isCorrect) {
        feedbackText.textContent = text;
        feedbackText.className = isCorrect ? "feedback-correct" : "feedback-wrong";
        feedbackOverlay.classList.remove("hidden");
    }

    function nextQuestion() {
        feedbackOverlay.classList.add("hidden");
        currentQuestionIndex++;

        if (altitude >= targetAltitude) {
            triggerGameClear();
            choicesContainer.innerHTML = "";
            timerBar.style.width = "0%";
            questionText.textContent = "";
            return;
        }

        if (life <= 0) {
            triggerGameOver();
            choicesContainer.innerHTML = "";
            timerBar.style.width = "0%";
            questionText.textContent = "";
            return;
        }

        // 問題がループした場合の補充
        if (currentQuestionIndex >= currentQuestions.length) {
            currentQuestions = [...activeQuizData].sort(() => Math.random() - 0.5);
            currentQuestionIndex = 0;
        }

        showQuestion();
    }

    function updateProgress() {
        const progressRatio = altitude / targetAltitude;
        
        // ヘッダーのプログレスバー
        progressFill.style.width = `${progressRatio * 100}%`;

        // 背景のスクロール (-66.666%から0%へ)
        const bgTranslateY = -66.666 + (66.666 * progressRatio);
        document.getElementById("scrolling-bg").style.transform = `translateY(${bgTranslateY}%)`;

        // プレイヤーキャラクターの上昇 (画面下部20%から70%へ)
        const playerBottom = 20 + (50 * progressRatio);
        document.getElementById("player-character").style.bottom = `${playerBottom}%`;
    }

    function updateLifeUI() {
        const lifeIcons = document.querySelectorAll(".life-icon");
        lifeIcons.forEach((icon, index) => {
            if (index < life) {
                icon.classList.remove("lost");
            } else {
                icon.classList.add("lost");
            }
        });

        // 糸のダメージ演出を更新
        const thread = document.getElementById("light-thread");
        thread.className = ""; // リセット
        if (life === 2) {
            thread.classList.add("damage-1");
        } else if (life === 1) {
            thread.classList.add("damage-2");
        }
    }

    // フェーズ4: 演出用関数群
    function spawnAngels() {
        for (let i = 0; i < 2; i++) {
            const angel = document.createElement("div");
            angel.className = "angel";
            angel.style.left = (20 + i * 40) + "%"; 
            document.getElementById("visual-layer").appendChild(angel);
            setTimeout(() => angel.remove(), 3000);
        }
    }

    function spawnCrow() {
        const crow = document.createElement("div");
        crow.className = "crow";
        const fromLeft = Math.random() > 0.5;
        crow.style.setProperty('--facing', fromLeft ? '1' : '-1');
        crow.style.left = fromLeft ? "-20%" : "120%";
        
        // 高さはプレイヤーの位置より少し上
        const playerBottomStr = document.getElementById("player-character").style.bottom;
        const playerBottom = parseFloat(playerBottomStr) || 20;
        crow.style.bottom = `${playerBottom + 5}%`;

        document.getElementById("visual-layer").appendChild(crow);

        setTimeout(() => {
            crow.style.left = fromLeft ? "42%" : "58%"; // 糸の近くへ
        }, 50);

        setTimeout(() => {
            crow.classList.add("pecking");
        }, 1000);

        setTimeout(() => {
            crow.classList.remove("pecking");
            crow.style.left = fromLeft ? "120%" : "-20%"; // 飛び去る
        }, 2000);

        setTimeout(() => crow.remove(), 3500);
    }

    function triggerGameOver() {
        // 糸が切れて落下
        document.getElementById("light-thread").classList.add("cut");
        document.getElementById("player-character").classList.add("falling");

        setTimeout(() => {
            feedbackOverlay.classList.remove("hidden");
            feedbackOverlay.style.background = "rgba(0, 0, 0, 1)";
            feedbackText.innerHTML = "GAME OVER<br><span style='font-size: 1.5rem; color: #aaa'>糸はプツリと切れてしまった...</span>";
            feedbackText.className = "feedback-wrong";
            resultButtons.classList.remove("hidden");
        }, 1500);
    }

    function triggerGameClear() {
        spawnAngels();
        spawnAngels(); // たくさん出す
        
        // 光に包まれる
        feedbackOverlay.classList.remove("hidden");
        feedbackOverlay.style.background = "rgba(255, 255, 255, 0.95)";
        feedbackText.innerHTML = "HEAVEN<br><span style='font-size: 1.5rem; color: #d4af37'>神の光に救済されました</span>";
        feedbackText.className = "feedback-correct";
        feedbackText.style.textShadow = "0 0 10px rgba(212,175,55,0.8)";
        resultButtons.classList.remove("hidden");
    }

    // 初期状態はスタート画面を待機
});
