// =============================================
// KPMIM Smart College Chat Bot
// TF-IDF + Cosine Similarity 
// =============================================

const chatWin = document.querySelector(".chatWindow");
const sendBtn = document.getElementById("sendBtn");
const floatingBtn = document.getElementById("floatingBtn");
const chatContainer = document.getElementById("chatContainer");
const closeBtn = document.getElementById("closeBtn");
const inputEl = document.getElementById("Questions");
const suggestionBox = document.getElementById("suggestions");
const quickSuggestionsContainer = document.getElementById("quickSuggestions");

let FAQ = [];
let tfidfVectors = [];
let vocabulary = [];

// ----------------------------------------
// Load FAQ Database
// ----------------------------------------
fetch("faq.json")
    .then(res => res.json())
    .then(data => {
        FAQ = data;
        buildTFIDF();
        console.log("✓ FAQ loaded successfully:", FAQ.length, "questions");
    })
    .catch(err => console.error("❌ Error loading FAQ:", err));

// ----------------------------------------
// Tokenize Text
// ----------------------------------------
function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 1);
}

// ----------------------------------------
// Build TF-IDF Vectors
// ----------------------------------------
function buildTFIDF() {
    const vocabSet = new Set();

    FAQ.forEach(item => {
        item.keywords.forEach(k => vocabSet.add(k));
    });

    vocabulary = Array.from(vocabSet).sort();

    tfidfVectors = FAQ.map(item => {
        const vec = new Array(vocabulary.length).fill(0);
        const tokens = item.keywords;

        tokens.forEach(t => {
            const idx = vocabulary.indexOf(t);
            if (idx !== -1) vec[idx] += 1;
        });

        return vec;
    });
}

// ----------------------------------------
// Cosine Similarity
// ----------------------------------------
function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    const denominator = Math.sqrt(magA) * Math.sqrt(magB);
    return denominator === 0 ? 0 : dot / denominator;
}

// ----------------------------------------
// Generate Query Vector
// ----------------------------------------
function queryVector(text) {
    const vec = new Array(vocabulary.length).fill(0);
    const tokens = tokenize(text);

    tokens.forEach(tok => {
        const idx = vocabulary.indexOf(tok);
        if (idx !== -1) vec[idx] += 1;
    });

    return vec;
}

// ----------------------------------------
// Find Best Matching Answer
// ----------------------------------------
function getBestAnswer(msg) {
    if (!msg.trim() || FAQ.length === 0) {
        return {
            reply: "Please ask me something about the college! Try asking about fees, admissions, courses, placements, etc.",
            intent: "empty",
            confidence: 0
        };
    }

    const userVec = queryVector(msg);
    let bestScore = 0;
    let bestIndex = -1;

    tfidfVectors.forEach((vec, i) => {
        const score = cosineSimilarity(userVec, vec);
        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    });

    if (bestScore < 0.05) {
        const suggestions = [
            "I'm not sure about that. Try asking: What are the fees? When does admission start? What courses are available?",
            "Hmm, that's outside my knowledge base. Ask me about admissions, courses, fees, facilities, or placements!",
            "I didn't quite understand. Try rephrasing your question. What would you like to know about KPMIM?"
        ];
        return {
            reply: suggestions[Math.floor(Math.random() * suggestions.length)],
            intent: "unclear",
            confidence: bestScore
        };
    }

    return {
        reply: FAQ[bestIndex].answer,
        intent: FAQ[bestIndex].question,
        confidence: bestScore
    };
}

// ----------------------------------------
// Auto-Suggestions on Input
// ----------------------------------------
inputEl.addEventListener("input", () => {
    const text = inputEl.value.toLowerCase().trim();
    suggestionBox.innerHTML = "";

    if (!text || text.length < 2) return;

    const matches = FAQ.filter(f =>
        f.question.toLowerCase().includes(text) ||
        f.keywords.some(k => k.includes(text))
    );

    matches.slice(0, 4).forEach(m => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.innerText = m.question;
        div.onclick = () => {
            inputEl.value = m.question;
            suggestionBox.innerHTML = "";
            sendMessage();
        };
        suggestionBox.appendChild(div);
    });
});

// ----------------------------------------
// Quick Suggestion Buttons
// ----------------------------------------
document.querySelectorAll(".quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const question = btn.getAttribute("data-question");
        inputEl.value = question;
        sendMessage();
    });
});

// ----------------------------------------
// Add Message Bubble
// ----------------------------------------
function addBubble(text, sender = "bot", meta = "") {
    const bubble = document.createElement("p");
    bubble.className = sender === "user" ? "user-msg" : "bot-msg";

    if (sender === "bot") {
        bubble.innerHTML = `<span class="bot-icon">🤖</span><span>${text}</span>`;
    } else {
        bubble.innerText = text;
    }

    chatWin.appendChild(bubble);

    if (meta && sender === "bot") {
        const small = document.createElement("small");
        small.innerText = meta;
        bubble.appendChild(small);
    }

    chatWin.scrollTop = chatWin.scrollHeight;
}

// ----------------------------------------
// Send Message Handler
// ----------------------------------------
function sendMessage() {
    const userMsg = inputEl.value.trim();
    if (!userMsg) return;

    addBubble(userMsg, "user");
    inputEl.value = "";
    suggestionBox.innerHTML = "";

    // Show typing indicator
    const thinking = document.createElement("p");
    thinking.className = "bot-msg";
    thinking.innerHTML = `<span class="bot-icon">🤖</span><span>Thinking<span class="dots"></span></span>`;
    chatWin.appendChild(thinking);

    setTimeout(() => {
        thinking.remove();

        const result = getBestAnswer(userMsg);
        const confidencePercent = (result.confidence * 100).toFixed(1);
        const meta = `📊 Match: ${confidencePercent}% | Q: ${result.intent.substring(0, 40)}...`;

        addBubble(result.reply, "bot", meta);
    }, 600);
}

// ----------------------------------------
// Event Listeners
// ----------------------------------------
sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

// Floating button toggle
floatingBtn.addEventListener("click", () => {
    chatContainer.classList.toggle("open");
    if (chatContainer.classList.contains("open")) {
        inputEl.focus();
    }
});

// Close button
closeBtn.addEventListener("click", () => {
    chatContainer.classList.remove("open");
});

// Close on outside click
document.addEventListener("click", (e) => {
    if (!chatContainer.contains(e.target) && !floatingBtn.contains(e.target)) {
        if (chatContainer.classList.contains("open")) {
            // Optional: uncomment to auto-close on outside click
            // chatContainer.classList.remove("open");
        }
    }
});

console.log("🤖 KPMIM Chat Bot initialized!"); 