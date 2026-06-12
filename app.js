let questions = [];
let currentQuestion = 0;
let userAnswers = {};     // { questionIndex: [selectedOptionIndices] }
let markedForReview = {}; // { questionIndex: true }
let revealed = {};         // { questionIndex: true }  -> answer has been checked / shown
let examSubmitted = false;
let timerInterval;
let timeLeftSeconds = 180 * 60; // 180 minutes

const params = new URLSearchParams(window.location.search);
const testNum = params.get("test") || "1";
const dataFile = `sap-c03-test${testNum}.json`;

fetch(dataFile)
  .then(res => res.json())
  .then(data => {
    questions = data;
    document.getElementById("testInfo").innerText =
      `Test ${testNum} — ${questions.length} questions — 180 minutes`;
    createPalette();
    loadQuestion(0);
    startTimer();
  });

function createPalette() {
  const palette = document.getElementById("palette");
  palette.innerHTML = "";
  questions.forEach((q, index) => {
    let btn = document.createElement("button");
    btn.innerText = index + 1;
    btn.id = `palette-btn-${index}`;
    btn.onclick = () => loadQuestion(index);
    palette.appendChild(btn);
  });
  updatePalette();
}

function updatePalette() {
  questions.forEach((q, index) => {
    const btn = document.getElementById(`palette-btn-${index}`);
    btn.className = ""; // reset

    if (examSubmitted) {
      // In review mode, show correct/incorrect instead of answered/unanswered
      if (isCorrect(index)) {
        btn.classList.add("correct-btn");
      } else {
        btn.classList.add("incorrect-btn");
      }
      if (index === currentQuestion) {
        btn.classList.add("current");
      }
      return;
    }

    if (index === currentQuestion) {
      btn.classList.add("current");
    } else if (markedForReview[index]) {
      btn.classList.add("review");
    } else if (userAnswers[index] && userAnswers[index].length > 0) {
      btn.classList.add("answered");
    } else {
      btn.classList.add("unanswered");
    }
  });
}

function isCorrect(index) {
  const q = questions[index];
  const userAns = userAnswers[index] || [];
  const correct = q.correctAnswers || [];
  return (
    correct.length > 0 &&
    userAns.length === correct.length &&
    userAns.slice().sort().every((v, i) => v === correct.slice().sort()[i])
  );
}

function loadQuestion(index) {
  currentQuestion = index;
  let q = questions[index];

  document.getElementById("questionNumber").innerText =
    `Question ${index + 1} of ${questions.length} (ID: ${q.id})`;

  document.getElementById("questionText").innerText = q.question;

  const inputType = q.questionType === "multiple" ? "checkbox" : "radio";
  const savedAnswers = userAnswers[index] || [];
  const showAnswer = examSubmitted || revealed[index];
  const correct = q.correctAnswers || [];

  let optionsHTML = "";
  q.options.forEach((option, i) => {
    const checked = savedAnswers.includes(i) ? "checked" : "";
    const disabled = showAnswer ? "disabled" : "";

    let cls = "option";
    if (showAnswer) {
      const isSelected = savedAnswers.includes(i);
      const isAnswer = correct.includes(i);
      if (isAnswer && isSelected) {
        cls += " correct";       // user picked it and it's correct
      } else if (isSelected && !isAnswer) {
        cls += " incorrect";     // user picked it but it's wrong
      } else if (isAnswer && !isSelected) {
        cls += " missed";        // correct answer the user did not pick
      }
    }

    optionsHTML += `
      <div class="${cls}">
        <label>
          <input type="${inputType}" name="option" value="${i}" ${checked} ${disabled}
                 onchange="recordAnswer(${index}, ${i}, '${inputType}')">
          ${option}
        </label>
      </div>
    `;
  });

  document.getElementById("options").innerHTML = optionsHTML;

  // Explanation / answer feedback box
  const explanationBox = document.getElementById("explanationBox");
  if (showAnswer) {
    const correctLetters = correct.map(i => String.fromCharCode(65 + i)).join(", ");
    const resultLabel = isCorrect(index)
      ? `<span class="result-tag result-correct">Correct</span>`
      : `<span class="result-tag result-incorrect">Incorrect</span>`;

    explanationBox.style.display = "block";
    explanationBox.innerHTML = `
      ${examSubmitted ? resultLabel : ""}
      <div class="correct-answer-line"><strong>Correct answer${correct.length > 1 ? "s" : ""}:</strong> ${correctLetters || "N/A"}</div>
      ${q.explanation ? `<div class="explanation-text">${q.explanation}</div>` : ""}
    `;
  } else {
    explanationBox.style.display = "none";
    explanationBox.innerHTML = "";
  }

  // Toggle Check Answer button visibility
  const checkBtn = document.getElementById("checkBtn");
  if (checkBtn) {
    checkBtn.style.display = examSubmitted ? "none" : "inline-block";
    checkBtn.disabled = !!revealed[index];
    checkBtn.innerText = revealed[index] ? "Answer Shown" : "Check Answer";
  }

  updatePalette();
}

function recordAnswer(qIndex, optionIndex, inputType) {
  if (examSubmitted || revealed[qIndex]) return; // locked after reveal/submit

  if (!userAnswers[qIndex]) userAnswers[qIndex] = [];

  if (inputType === "radio") {
    userAnswers[qIndex] = [optionIndex];
  } else {
    const idx = userAnswers[qIndex].indexOf(optionIndex);
    if (idx > -1) {
      userAnswers[qIndex].splice(idx, 1);
    } else {
      userAnswers[qIndex].push(optionIndex);
    }
  }
  updatePalette();
}

function checkAnswer() {
  revealed[currentQuestion] = true;
  loadQuestion(currentQuestion);
}

function nextQuestion() {
  if (currentQuestion < questions.length - 1) {
    loadQuestion(currentQuestion + 1);
  }
}

function previousQuestion() {
  if (currentQuestion > 0) {
    loadQuestion(currentQuestion - 1);
  }
}

function markReview() {
  if (examSubmitted) return;
  markedForReview[currentQuestion] = !markedForReview[currentQuestion];
  updatePalette();
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeftSeconds--;
    updateTimerDisplay();
    if (timeLeftSeconds <= 0) {
      clearInterval(timerInterval);
      submitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(timeLeftSeconds / 60);
  const secs = timeLeftSeconds % 60;
  document.getElementById("timer").innerText =
    `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function submitExam() {
  if (examSubmitted) return;
  clearInterval(timerInterval);
  examSubmitted = true;

  let correctCount = 0;
  let attempted = 0;

  questions.forEach((q, index) => {
    const userAns = userAnswers[index] || [];
    if (userAns.length > 0) attempted++;
    if (isCorrect(index)) correctCount++;
  });

  const total = questions.length;
  const percentage = ((correctCount / total) * 100).toFixed(2);

  // Reveal all answers (review mode)
  questions.forEach((q, index) => { revealed[index] = true; });

  // Show score banner
  const scoreBanner = document.getElementById("scoreBanner");
  scoreBanner.style.display = "block";
  scoreBanner.innerHTML = `
    <strong>Exam Submitted</strong><br>
    Total Questions: ${total} &nbsp;|&nbsp;
    Attempted: ${attempted} &nbsp;|&nbsp;
    Correct: ${correctCount} &nbsp;|&nbsp;
    Score: ${percentage}%
    <div class="review-hint">You are now in review mode. Use the palette or Previous/Next to see correct answers and explanations for every question.</div>
  `;

  // Hide submit button to avoid re-submission
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.style.display = "none";
  const reviewBtn = document.getElementById("reviewBtn");
  if (reviewBtn) reviewBtn.style.display = "none";

  loadQuestion(currentQuestion);
}
