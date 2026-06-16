// app.js - Full Core Game Engine Logic
(function() {
    let secretAnswer = "";
    let cursorRow = 0;
    let cursorCol = 0;
    let lockInput = false;

    const DOM = {
        board: document.getElementById("board-matrix"),
        keyboard: document.getElementById("virtual-keyboard"),
        toasts: document.getElementById("toast-manager"),
        btnPlayAgain: document.getElementById("action-play-again"),
        modalSettings: document.getElementById("settings-overlay"),
        modalStats: document.getElementById("stats-overlay")
    };

    let profileStats = JSON.parse(localStorage.getItem("premium-w-scores")) || { played: 0, won: 0, streak: 0, maxStreak: 0 };

    async function bootstrap() {
        await loadWordLists();
        assembleUIMatrix();
        assembleKeyboardLayout();
        bindInputHooks();
        triggerRoundReset();
    }

    function assembleUIMatrix() {
        DOM.board.innerHTML = "";
        for (let r = 0; r < 6; r++) {
            let row = document.createElement("div");
            row.className = "grid-row";
            for (let c = 0; c < 5; c++) {
                let node = document.createElement("div");
                node.className = "tile-node";
                node.id = `tile-${r}-${c}`;
                row.appendChild(node);
            }
            DOM.board.appendChild(row);
        }
    }

    const keysMap = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
    ];

    function assembleKeyboardLayout() {
        DOM.keyboard.innerHTML = "";
        keysMap.forEach(line => {
            let rowContainer = document.createElement("div");
            rowContainer.className = "kb-line";
            line.forEach(char => {
                let btn = document.createElement("button");
                btn.className = "input-key";
                btn.textContent = char;
                btn.id = `key-${char}`;
                if (char === "ENTER" || char === "⌫") btn.classList.add("extended");
                btn.onclick = () => routeKeyInput(char);
                rowContainer.appendChild(btn);
            });
            DOM.keyboard.appendChild(rowContainer);
        });
    }

    function triggerRoundReset() {
        const pool = window.WORDLE_DICTIONARY.TARGET_WORDS;
        secretAnswer = pool[Math.floor(Math.random() * pool.length)];
        cursorRow = 0;
        cursorCol = 0;
        lockInput = false;
        DOM.btnPlayAgain.style.display = "none";
        assembleUIMatrix();
        assembleKeyboardLayout();
    }

    function routeKeyInput(val) {
        if (lockInput) return;
        if (val === "⌫" || val === "Backspace") {
            if (cursorCol > 0) {
                cursorCol--;
                let target = document.getElementById(`tile-${cursorRow}-${cursorCol}`);
                target.textContent = "";
                target.removeAttribute("data-state");
            }
            return;
        }
        if (val === "ENTER" || val === "Enter") {
            processSubmission();
            return;
        }
        if (val.length === 1 && val.match(/[A-Z]/i) && cursorCol < 5) {
            let target = document.getElementById(`tile-${cursorRow}-${cursorCol}`);
            target.textContent = val.toUpperCase();
            target.setAttribute("data-state", "tbd");
            cursorCol++;
        }
    }

    function postToast(msg, duration = 1800) {
        let alertNode = document.createElement("div");
        alertNode.className = "toast-msg";
        alertNode.textContent = msg;
        DOM.toasts.appendChild(alertNode);
        setTimeout(() => alertNode.remove(), duration);
    }

    function processSubmission() {
        if (cursorCol !== 5) {
            postToast("Not enough letters");
            shakeRowError();
            return;
        }
        let guessStr = "";
        for (let c = 0; c < 5; c++) {
            guessStr += document.getElementById(`tile-${cursorRow}-${c}`).textContent;
        }
        if (!window.WORDLE_DICTIONARY.ALL_WORDS.includes(guessStr)) {
            postToast("Not in word list");
            shakeRowError();
            return;
        }
        verifyMatches(guessStr);
    }

    function verifyMatches(guess) {
        lockInput = true;
        let ansArr = secretAnswer.split("");
        let guessArr = guess.split("");
        let rowTokens = ["absent", "absent", "absent", "absent", "absent"];

        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === ansArr[i]) {
                rowTokens[i] = "correct";
                ansArr[i] = null;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (rowTokens[i] === "correct") continue;
            let findPos = ansArr.indexOf(guessArr[i]);
            if (findPos !== -1) {
                rowTokens[i] = "present";
                ansArr[findPos] = null;
            }
        }

        // Sequential flip and color shift mid-flip
        for (let i = 0; i < 5; i++) {
            let el = document.getElementById(`tile-${cursorRow}-${i}`);
            setTimeout(() => {
                el.style.animation = "tileSpin 0.5s ease-in-out";
                setTimeout(() => {
                    el.setAttribute("data-state", rowTokens[i]);
                }, 250);
            }, i * 220);
        }

        // Wait for all 5 tiles to finish changing color, then update keyboard
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                commitKeyStyles(guessArr[i], rowTokens[i]);
            }

            if (guess === secretAnswer) {
                postToast("Splendid!");
                finalizeScore(true);
            } else {
                cursorRow++;
                cursorCol = 0;
                if (cursorRow === 6) {
                    postToast(`Answer: ${secretAnswer}`, 3500);
                    finalizeScore(false);
                } else {
                    lockInput = false;
                }
            }
        }, (4 * 220) + 500);
    }

    function commitKeyStyles(char, incomingState) {
        let node = document.getElementById(`key-${char}`);
        if (!node) return;
        let presentState = node.getAttribute("data-state");
        if (presentState === "correct") return;
        if (presentState === "present" && incomingState === "absent") return;
        node.setAttribute("data-state", incomingState);
    }

    function shakeRowError() {
        let elements = DOM.board.childNodes[cursorRow].childNodes;
        elements.forEach(node => {
            node.classList.remove("shake-animate");
            void node.offsetWidth;
            node.classList.add("shake-animate");
        });
    }

    function finalizeScore(winFlag) {
        lockInput = true;
        profileStats.played++;
        if (winFlag) {
            profileStats.won++;
            profileStats.streak++;
            if (profileStats.streak > profileStats.maxStreak) profileStats.maxStreak = profileStats.streak;
        } else {
            profileStats.streak = 0;
        }
        localStorage.setItem("premium-w-scores", JSON.stringify(profileStats));

        document.getElementById("val-played").textContent = profileStats.played;
        document.getElementById("val-pct").textContent = Math.round((profileStats.won / profileStats.played) * 100) || 0;
        document.getElementById("val-streak").textContent = profileStats.streak;
        document.getElementById("val-max").textContent = profileStats.maxStreak;

        setTimeout(() => {
            DOM.modalStats.classList.add("active");
            DOM.btnPlayAgain.style.display = "block";
        }, 800);
    }

    function bindInputHooks() {
        window.addEventListener("keydown", (e) => {
            if (e.key === "Enter") routeKeyInput("ENTER");
            else if (e.key === "Backspace") routeKeyInput("⌫");
            else if (e.key.length === 1 && e.key.match(/[a-z]/i)) routeKeyInput(e.key.toUpperCase());
        });

        document.getElementById("settings-trigger").onclick = () => DOM.modalSettings.classList.add("active");
        document.getElementById("hide-settings").onclick = () => DOM.modalSettings.classList.remove("active");
        document.getElementById("stats-trigger").onclick = () => DOM.modalStats.classList.add("active");
        document.getElementById("hide-stats").onclick = () => DOM.modalStats.classList.remove("active");

        document.getElementById("theme-toggle").onchange = (e) => document.body.classList.toggle("light-theme", e.target.checked);
        document.getElementById("contrast-toggle").onchange = (e) => document.body.classList.toggle("high-contrast", e.target.checked);
        DOM.btnPlayAgain.onclick = () => { DOM.modalStats.classList.remove("active"); triggerRoundReset(); };
    }

    bootstrap();
})();
