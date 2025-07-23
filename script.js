// DOM Elements
const pages = {
    home: document.getElementById('home-page'),
    video: document.getElementById('video-page'),
    audio: document.getElementById('audio-page'),
    transcription: document.getElementById('transcription-page'),
    history: document.getElementById('history-page')
};

// Navigation buttons
const takeVideoBtn = document.getElementById('take-video');
const takeAudioBtn = document.getElementById('take-audio');
const goHomeBtn = document.getElementById('go-home');
const historyBtn = document.getElementById('history-btn');
const historyGoHomeBtn = document.getElementById('history-go-home');
const themeToggle = document.getElementById('theme-toggle');

// Video recording elements
const videoPreview = document.getElementById('video-preview');
const startVideoBtn = document.getElementById('start-video');
const stopVideoBtn = document.getElementById('stop-video');
const videoSourceSelect = document.getElementById('video-source');
const downloadVideoBtn = document.getElementById('download-video');
const transcribeVideoBtn = document.getElementById('transcribe-video');
const recordingTimer = document.getElementById('recording-timer');

// Audio recording elements
const audioVisualizer = document.getElementById('audio-visualizer');
const startAudioBtn = document.getElementById('start-audio');
const stopAudioBtn = document.getElementById('stop-audio');
const downloadAudioBtn = document.getElementById('download-audio');
const transcribeAudioBtn = document.getElementById('transcribe-audio');
const audioTimer = document.getElementById('audio-timer');

// Transcription elements
const loadingScreen = document.getElementById('loading-screen');
const transcriptionResult = document.getElementById('transcription-result');
const transcribedText = document.getElementById('transcribed-text');
const copyTextBtn = document.getElementById('copy-text');
const downloadBtn = document.getElementById('download-btn');

// History elements
const historyList = document.getElementById('history-list');

// State variables
let currentPage = 'home';
let mediaRecorder;
let recordedChunks = [];
let audioContext;
let analyser;
let dataArray;
let animationId;
let timerInterval;
let startTime;
let currentMediaType = ''; // 'video' or 'audio'
let currentBlob;

// Initialize the app
function init() {
    setupEventListeners();
    checkThemePreference();
    loadHistory();
    registerServiceWorker();
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    takeVideoBtn.addEventListener('click', () => navigateTo('video'));
    takeAudioBtn.addEventListener('click', () => navigateTo('audio'));
    goHomeBtn.addEventListener('click', () => navigateTo('home'));
    historyBtn.addEventListener('click', () => navigateTo('history'));
    historyGoHomeBtn.addEventListener('click', () => navigateTo('home'));
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Video recording
    startVideoBtn.addEventListener('click', startVideoRecording);
    stopVideoBtn.addEventListener('click', stopVideoRecording);
    downloadVideoBtn.addEventListener('click', downloadVideo);
    transcribeVideoBtn.addEventListener('click', () => transcribeMedia('video'));
    
    // Audio recording
    startAudioBtn.addEventListener('click', startAudioRecording);
    stopAudioBtn.addEventListener('click', stopAudioRecording);
    downloadAudioBtn.addEventListener('click', downloadAudio);
    transcribeAudioBtn.addEventListener('click', () => transcribeMedia('audio'));
    
    // Transcription
    copyTextBtn.addEventListener('click', copyTranscribedText);
    
    // Initialize video preview
    initVideoPreview();
}

// Navigation function
function navigateTo(page) {
    // Hide all pages
    Object.values(pages).forEach(p => p.classList.remove('active'));
    
    // Show the selected page
    pages[page].classList.add('active');
    currentPage = page;
    
    // Handle page-specific initialization
    if (page === 'home') {
        resetRecorders();
    } else if (page === 'transcription') {
        // Ensure loading screen is shown when navigating to transcription
        loadingScreen.style.display = 'flex';
        transcriptionResult.style.display = 'none';
    }
}

// Theme management
function checkThemePreference() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme toggle icon
    const themeIcon = themeToggle.querySelector('.theme-icon');
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Video recording functions
async function initVideoPreview() {
    try {
        const constraints = {
            video: {
                facingMode: 'user' // Start with front camera by default
            },
            audio: true
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
    } catch (err) {
        console.error('Error initializing video:', err);
        alert('Could not access camera. Please check permissions.');
    }
}

async function startVideoRecording() {
    try {
        const constraints = {
            video: {
                facingMode: videoSourceSelect.value === 'front' ? 'user' : 'environment'
            },
            audio: true
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
        
        // Set up media recorder
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        recordedChunks = [];
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const postActions = document.querySelector('#video-page .post-recording-actions');
            postActions.style.display = 'flex';
        };
        
        mediaRecorder.start(100); // Collect data every 100ms
        startVideoBtn.disabled = true;
        stopVideoBtn.disabled = false;
        videoSourceSelect.disabled = true;
        
        // Start timer
        startTimer(recordingTimer);
    } catch (err) {
        console.error('Error starting video recording:', err);
        alert('Error starting video recording. Please try again.');
    }
}

function stopVideoRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopTimer();
        
        // Stop all tracks in the stream
        const stream = videoPreview.srcObject;
        stream.getTracks().forEach(track => track.stop());
        
        startVideoBtn.disabled = false;
        stopVideoBtn.disabled = true;
        videoSourceSelect.disabled = false;
    }
}

function downloadVideo() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    currentBlob = blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `ajibola-transc-${new Date().toISOString()}.mp4`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Audio recording functions
function startAudioRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                const postActions = document.querySelector('#audio-page .post-recording-actions');
                postActions.style.display = 'flex';
                cancelAnimationFrame(animationId);
            };
            
            // Set up audio visualization
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            mediaRecorder.start();
            startAudioBtn.disabled = true;
            stopAudioBtn.disabled = false;
            
            // Start visualization
            drawAudioVisualizer();
            
            // Start timer
            startTimer(audioTimer);
        })
        .catch(err => {
            console.error('Error starting audio recording:', err);
            alert('Error starting audio recording. Please check microphone permissions.');
        });
}

function drawAudioVisualizer() {
    animationId = requestAnimationFrame(drawAudioVisualizer);
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    audioVisualizer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = audioVisualizer.offsetWidth;
    canvas.height = audioVisualizer.offsetHeight;
    audioVisualizer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = (width / dataArray.length) * 2.5;
    let x = 0;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}

function stopAudioRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopTimer();
        
        // Stop all tracks in the stream
        if (audioContext) {
            audioContext.close();
        }
        
        startAudioBtn.disabled = false;
        stopAudioBtn.disabled = true;
    }
}

function downloadAudio() {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    currentBlob = blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `ajibola-transc-${new Date().toISOString()}.mp3`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Timer functions
function startTimer(timerElement) {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        timerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// Transcription functions
async function transcribeMedia(mediaType) {
    currentMediaType = mediaType;
    navigateTo('transcription');
    
    try {
        // In a real app, you would send the blob to your transcription API
        // For this example, we'll simulate an API call with a timeout
        
        // Create a FormData object to send the file
        const formData = new FormData();
        const blob = new Blob(recordedChunks);
        const file = new File([blob], `recording.${mediaType === 'video' ? 'mp4' : 'mp3'}`, {
            type: mediaType === 'video' ? 'video/mp4' : 'audio/mp3'
        });
        formData.append('file', file);
        
        // Simulate API call (replace with actual API call)
        setTimeout(() => {
            // This is where you would process the actual response
            const mockResponse = {
                status: 'success',
                text: `This is a mock transcription of your ${mediaType} recording. 
                In a real application, this would be the actual transcribed text from 
                the API. The transcription would be accurate and include proper punctuation.
                
                The actual implementation would use a service like:
                - Google Speech-to-Text
                - AWS Transcribe
                - AssemblyAI
                - Or another transcription API.`
            };
            
            displayTranscriptionResult(mockResponse.text);
            saveToHistory(mockResponse.text, mediaType);
        }, 3000);
        
        // Actual API call would look something like this:
        /*
        const response = await fetch('https://api.transcription-service.com/v1/transcribe', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer YOUR_API_KEY'
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayTranscriptionResult(data.text);
            saveToHistory(data.text, mediaType);
        } else {
            throw new Error(data.error || 'Transcription failed');
        }
        */
    } catch (err) {
        console.error('Transcription error:', err);
        displayTranscriptionResult(`Error: ${err.message}`);
    }
}

function displayTranscriptionResult(text) {
    loadingScreen.style.display = 'none';
    transcriptionResult.style.display = 'block';
    transcribedText.value = text;
}

function copyTranscribedText() {
    transcribedText.select();
    document.execCommand('copy');
    
    // Visual feedback
    const originalText = copyTextBtn.textContent;
    copyTextBtn.textContent = 'Copied!';
    setTimeout(() => {
        copyTextBtn.textContent = originalText;
    }, 2000);
}

// Download functions
function setupDownloadButtons() {
    document.querySelectorAll('.download-options button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const format = e.target.getAttribute('data-format');
            downloadTranscription(format);
        });
    });
}

function downloadTranscription(format) {
    const text = transcribedText.value;
    const filename = `ajibola-transc-${new Date().toISOString()}`;
    
    switch (format) {
        case 'txt':
            downloadTextFile(text, `${filename}.txt`, 'text/plain');
            break;
        case 'pdf':
            generatePDF(text, filename);
            break;
        case 'docx':
            generateDocx(text, filename);
            break;
        case 'xlsx':
            generateExcel(text, filename);
            break;
        default:
            downloadTextFile(text, `${filename}.txt`, 'text/plain');
    }
}

function downloadTextFile(text, filename, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function generatePDF(text, filename) {
    // In a real app, you would use a library like jsPDF or make an API call
    alert('PDF generation would be implemented with a library like jsPDF in a real app.');
    // For now, we'll download as text
    downloadTextFile(text, `${filename}.txt`, 'text/plain');
}

function generateDocx(text, filename) {
    // In a real app, you would use a library like docx
    alert('DOCX generation would be implemented with a library like docx in a real app.');
    // For now, we'll download as text
    downloadTextFile(text, `${filename}.txt`, 'text/plain');
}

function generateExcel(text, filename) {
    // In a real app, you would use a library like xlsx
    alert('Excel generation would be implemented with a library like xlsx in a real app.');
    // For now, we'll download as text
    downloadTextFile(text, `${filename}.txt`, 'text/plain');
}

// History functions
function saveToHistory(text, mediaType) {
    const history = JSON.parse(localStorage.getItem('transcriptionHistory') || '[]');
    const newItem = {
        id: Date.now(),
        date: new Date().toISOString(),
        text: text,
        mediaType: mediaType,
        preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    };
    
    history.unshift(newItem);
    localStorage.setItem('transcriptionHistory', JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('transcriptionHistory') || '[]');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<p>No transcription history yet.</p>';
        return;
    }
    
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <h3>${item.mediaType === 'video' ? 'Video' : 'Audio'} Transcription</h3>
            <p>${new Date(item.date).toLocaleString()}</p>
            <div class="preview">${item.preview}</div>
        `;
        
        historyItem.addEventListener('click', () => viewHistoryItem(item));
        historyList.appendChild(historyItem);
    });
}

function viewHistoryItem(item) {
    navigateTo('transcription');
    loadingScreen.style.display = 'none';
    transcriptionResult.style.display = 'block';
    transcribedText.value = item.text;
}

// Reset recorders when leaving pages
function resetRecorders() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Hide post-recording actions
    document.querySelectorAll('.post-recording-actions').forEach(el => {
        el.style.display = 'none';
    });
    
    // Reset timers
    recordingTimer.textContent = '00:00';
    audioTimer.textContent = '00:00';
}

// PWA Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);