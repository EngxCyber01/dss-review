// ========================================
// GLOBAL STATE MANAGEMENT
// ========================================

const quizState = {
    answers: {},
    locked: {}
};

// ========================================
// NAVIGATION FUNCTIONALITY
// ========================================

/**
 * Initialize navigation tabs
 * Sets up click event listeners for lecture navigation
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeSyntaxHighlighting();
    initializeQuizzes();
});

/**
 * Sets up navigation tab functionality
 */
function initializeNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const lectureContents = document.querySelectorAll('.lecture-content');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const lectureNum = this.getAttribute('data-lecture');
            
            // Remove active class from all tabs and contents
            navTabs.forEach(t => t.classList.remove('active'));
            lectureContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(`lecture-${lectureNum}`).classList.add('active');
            
            // Scroll to top smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ========================================
// SYNTAX HIGHLIGHTING
// ========================================

/**
 * Initialize syntax highlighting for code blocks
 */
function initializeSyntaxHighlighting() {
    if (typeof hljs !== 'undefined') {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

// ========================================
// INTERACTIVE CODE TERMINAL
// ========================================

/**
 * Simulates code execution in the terminal
 * @param {number} editorId - The ID of the code editor
 */
/**
 * Execute code using Piston API (free online compiler)
 * @param {number} editorId - The ID of the code editor
 */
function runCode(editorId) {
    const editor = document.getElementById(`editor-${editorId}`);
    const output = document.getElementById(`output-${editorId}`);
    const code = editor.value;
    
    // Clear previous output
    output.innerHTML = '<div class="output-line" style="color: #10b981;">▶ Compiling and executing your code...</div>';
    
    if (code.trim().length === 0) {
        displayCodeOutput(output, 'Error: No code to execute', false);
        return;
    }
    
    // Call Piston API to execute C++ code
    fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            language: 'c++',
            version: '10.2.0',
            files: [{
                content: code
            }]
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.run && data.run.output) {
            displayCodeOutput(output, data.run.output, true);
        } else if (data.run && data.run.stderr) {
            displayCodeOutput(output, 'Compilation Error:\n' + data.run.stderr, false);
        } else if (data.message) {
            displayCodeOutput(output, 'Error: ' + data.message, false);
        } else {
            displayCodeOutput(output, 'Error: Unable to execute code', false);
        }
    })
    .catch(error => {
        displayCodeOutput(output, 'Error: Could not connect to compiler.\nPlease check your internet connection.', false);
    });
}

/**
 * Display code execution output
 * @param {HTMLElement} outputElement - The output container
 * @param {string} text - The output text
 * @param {boolean} success - Whether execution was successful
 */
function displayCodeOutput(outputElement, text, success) {
    const lines = text.split('\n');
    let html = '';
    
    lines.forEach(line => {
        const color = success ? '#cbd5e1' : '#ef4444';
        const icon = success ? '' : '✗ ';
        html += `<div class="output-line" style="color: ${color};">${icon}${escapeHtml(line)}</div>`;
    });
    
    outputElement.innerHTML = html;
    
    // Add success indicator
    if (success) {
        setTimeout(() => {
            const successMsg = document.createElement('div');
            successMsg.className = 'output-line';
            successMsg.style.color = '#10b981';
            successMsg.style.marginTop = '10px';
            successMsg.style.borderTop = '1px solid #334155';
            successMsg.style.paddingTop = '10px';
            successMsg.textContent = '✓ Program executed successfully';
            outputElement.appendChild(successMsg);
        }, 100);
    }
}



/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// QUIZ FUNCTIONALITY
// ========================================

/**
 * Initialize quiz functionality
 */
function initializeQuizzes() {
    // Add change listeners to all radio buttons
    const radioButtons = document.querySelectorAll('.option input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            const parent = this.closest('.option');
            const siblings = parent.parentElement.querySelectorAll('.option');
            siblings.forEach(sib => sib.classList.remove('selected'));
            parent.classList.add('selected');
        });
    });
}

/**
 * Submit and check multiple choice answer
 * @param {number} questionId - The question ID
 * @param {string} correctAnswer - The correct answer (a, b, c, or d)
 */
function submitAnswer(questionId, correctAnswer) {
    const questionDiv = document.querySelector(`[data-question="${questionId}"]`);
    const selectedRadio = questionDiv.querySelector('input[type="radio"]:checked');
    const submitBtn = questionDiv.querySelector('.submit-answer');
    const feedback = questionDiv.querySelector('.answer-feedback');
    const options = questionDiv.querySelectorAll('.option');
    
    // Check if question is already locked
    if (quizState.locked[questionId]) {
        return;
    }
    
    // Check if an answer is selected
    if (!selectedRadio) {
        alert('Please select an answer before submitting.');
        return;
    }
    
    const userAnswer = selectedRadio.value;
    
    // Lock the question
    quizState.locked[questionId] = true;
    quizState.answers[questionId] = userAnswer;
    
    // Disable all options
    options.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        radio.disabled = true;
        option.classList.add('disabled');
        
        // Highlight correct and incorrect answers
        if (radio.value === correctAnswer) {
            option.classList.add('correct');
        } else if (radio.value === userAnswer && userAnswer !== correctAnswer) {
            option.classList.add('incorrect');
        }
    });
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
    
    // Show feedback
    feedback.style.display = 'block';
    
    if (userAnswer === correctAnswer) {
        feedback.classList.add('correct');
        feedback.innerHTML = `
            <p class="correct-answer">✓ Correct!</p>
            <p class="explanation">${feedback.querySelector('.explanation').innerHTML}</p>
        `;
    } else {
        feedback.classList.add('incorrect');
        const correctText = questionDiv.querySelector(`input[value="${correctAnswer}"]`)
            .parentElement.querySelector('span').textContent;
        feedback.innerHTML = `
            <p style="color: var(--danger-color); font-weight: 600;">✗ Incorrect</p>
            <p class="correct-answer">Correct Answer: ${correctText}</p>
            <p class="explanation">${feedback.querySelector('.explanation').innerHTML}</p>
        `;
    }
    
    // Scroll feedback into view
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Submit short answer question
 * @param {number} questionId - The question ID
 */
function submitShortAnswer(questionId) {
    const questionDiv = document.querySelector(`[data-question="${questionId}"]`);
    const textarea = questionDiv.querySelector('.short-answer');
    const submitBtn = questionDiv.querySelector('.submit-answer');
    const feedback = questionDiv.querySelector('.answer-feedback');
    
    // Check if question is already locked
    if (quizState.locked[questionId]) {
        return;
    }
    
    // Check if answer is provided
    if (!textarea.value.trim()) {
        alert('Please provide an answer before submitting.');
        return;
    }
    
    // Lock the question
    quizState.locked[questionId] = true;
    quizState.answers[questionId] = textarea.value;
    
    // Disable textarea and button
    textarea.disabled = true;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
    
    // Show model answer
    feedback.style.display = 'block';
    feedback.classList.add('correct');
    
    // Add user's answer to feedback
    const userAnswerDiv = document.createElement('div');
    userAnswerDiv.innerHTML = `
        <p style="color: var(--primary-light); font-weight: 600; margin-bottom: 10px;">Your Answer:</p>
        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid var(--primary-color);">
            ${escapeHtml(textarea.value)}
        </div>
    `;
    feedback.insertBefore(userAnswerDiv, feedback.firstChild);
    
    // Scroll feedback into view
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Create a quiz question dynamically
 * @param {object} config - Question configuration
 * @returns {string} - HTML string for the question
 */
function createQuizQuestion(config) {
    const { id, type, question, options, correctAnswer, explanation } = config;
    
    if (type === 'multiple-choice') {
        let optionsHtml = '';
        options.forEach((option, index) => {
            const letter = String.fromCharCode(97 + index); // a, b, c, d...
            optionsHtml += `
                <label class="option">
                    <input type="radio" name="q${id}" value="${letter}">
                    <span>${letter.toUpperCase()}) ${option}</span>
                </label>
            `;
        });
        
        return `
            <div class="quiz-question" data-question="${id}">
                <h4>Question ${id}: Multiple Choice</h4>
                <p class="question-text">${question}</p>
                <div class="options">
                    ${optionsHtml}
                </div>
                <button class="submit-answer" onclick="submitAnswer(${id}, '${correctAnswer}')">Submit Answer</button>
                <div class="answer-feedback" style="display: none;">
                    <p class="explanation">${explanation}</p>
                </div>
            </div>
        `;
    } else if (type === 'short-answer') {
        return `
            <div class="quiz-question" data-question="${id}">
                <h4>Question ${id}: Short Answer</h4>
                <p class="question-text">${question}</p>
                <textarea class="short-answer" id="sa-${id}" placeholder="Type your answer here..."></textarea>
                <button class="submit-answer" onclick="submitShortAnswer(${id})">Submit Answer</button>
                <div class="answer-feedback" style="display: none;">
                    <p class="model-answer"><strong>Model Answer:</strong></p>
                    <p>${explanation}</p>
                </div>
            </div>
        `;
    }
}

/**
 * Add copy functionality to code blocks
 */
function addCopyButtons() {
    const codeBlocks = document.querySelectorAll('.code-container');
    
    codeBlocks.forEach(block => {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.innerHTML = '📋 Copy';
        copyBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.3s ease;
        `;
        
        block.style.position = 'relative';
        block.appendChild(copyBtn);
        
        copyBtn.addEventListener('click', function() {
            const code = block.querySelector('code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyBtn.innerHTML = '✓ Copied!';
                copyBtn.style.background = 'var(--accent-color)';
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy';
                    copyBtn.style.background = 'var(--primary-color)';
                }, 2000);
            });
        });
    });
}

// Add copy buttons when DOM is loaded
document.addEventListener('DOMContentLoaded', addCopyButtons);

// ========================================
// PROGRESS TRACKING
// ========================================

/**
 * Track user progress through lectures
 */
function trackProgress() {
    const progress = {
        lecturesViewed: [],
        quizzesCompleted: [],
        codeRun: []
    };
    
    // Save to localStorage
    localStorage.setItem('dss_progress', JSON.stringify(progress));
}

/**
 * Load user progress
 */
function loadProgress() {
    const saved = localStorage.getItem('dss_progress');
    return saved ? JSON.parse(saved) : null;
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to run code in active terminal
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeEditor = document.querySelector('.code-editor:focus');
        if (activeEditor) {
            const editorId = activeEditor.id.split('-')[1];
            runCode(editorId);
            e.preventDefault();
        }
    }
    
    // Alt + Arrow keys for lecture navigation
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const activeTab = document.querySelector('.nav-tab.active');
        const allTabs = Array.from(document.querySelectorAll('.nav-tab'));
        const currentIndex = allTabs.indexOf(activeTab);
        
        if (e.key === 'ArrowRight' && currentIndex < allTabs.length - 1) {
            allTabs[currentIndex + 1].click();
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
            allTabs[currentIndex - 1].click();
        }
        e.preventDefault();
    }
});

// ========================================
// PRINT/EXPORT FUNCTIONALITY
// ========================================

/**
 * Print current lecture
 */
function printLecture() {
    window.print();
}

/**
 * Export lecture as PDF (requires additional library)
 */
function exportToPDF() {
    // This would require a library like jsPDF or html2pdf
    alert('PDF export functionality would be implemented with a library like jsPDF');
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

/**
 * Search across all lectures
 * @param {string} query - Search query
 */
function searchLectures(query) {
    const results = [];
    const lectures = document.querySelectorAll('.lecture-content');
    
    lectures.forEach((lecture, index) => {
        const content = lecture.textContent.toLowerCase();
        if (content.includes(query.toLowerCase())) {
            results.push({
                lecture: index + 1,
                element: lecture
            });
        }
    });
    
    return results;
}

// Console welcome message
console.log('%c🎓 DSS Review System Loaded Successfully! ', 'background: #2563eb; color: white; font-size: 16px; padding: 10px; border-radius: 5px;');
console.log('%cKeyboard Shortcuts:', 'font-weight: bold; font-size: 14px;');
console.log('• Ctrl/Cmd + Enter: Run code in active terminal');
console.log('• Alt + Arrow Keys: Navigate between lectures');
console.log('• Tab: Navigate through interactive elements');