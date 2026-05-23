// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://gxxhlbimrahogsgvkpfy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eGhsYmltcmFob2dzZ3ZrcGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjA5NzEsImV4cCI6MjA0OTUzNjk3MX0.qT8YHgqJxJR66tFFDEmVb9XHgMSDkEzN5B3DXh2AKK0';

let supabase;

// Initialize Supabase
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    console.error('Supabase initialization error:', error);
}

// ==========================================
// NOTES STATE
// ==========================================
const notesState = {
    currentSem: null,
    currentNote: null,
    currentLang: 'en',
    isUnlocked: false,
    fullContent: '',
    previewPercentage: 30
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const params = getUrlParams();
    notesState.currentSem = params.sem || '1';
    notesState.currentNote = params.note;
    
    if (!notesState.currentNote) {
        showError('No note specified');
        return;
    }
    
    // Check if already unlocked
    const unlockKey = `unlocked_${notesState.currentNote}_${notesState.currentLang}`;
    notesState.isUnlocked = localStorage.getItem(unlockKey) === 'true';
    
    // Load the note
    loadNote();
    
    // Initialize UI components
    initThemeToggle();
    initLanguageToggle();
    initSidebarToggle();
    initReadingProgress();
    initImageZoom();
    initCopyCode();
    initScrollToTop();
    initUnlockForm();
});

// ==========================================
// LOAD NOTE
// ==========================================
async function loadNote() {
    const contentElement = document.getElementById('markdownContent');
    const noteTitle = document.getElementById('noteTitle');
    const noteSemester = document.getElementById('noteSemester');
    const noteSubject = document.getElementById('noteSubject');
    
    if (!contentElement) return;
    
    try {
        const filename = `${notesState.currentNote}-${notesState.currentLang}.md`;
        const path = `notes/sem${notesState.currentSem}/${filename}`;
        
        const response = await fetch(path);
        
        if (!response.ok) {
            // Try English fallback
            const fallbackPath = `notes/sem${notesState.currentSem}/${notesState.currentNote}-en.md`;
            const fallbackResponse = await fetch(fallbackPath);
            
            if (!fallbackResponse.ok) {
                throw new Error('Note not found');
            }
            
            notesState.fullContent = await fallbackResponse.text();
        } else {
            notesState.fullContent = await response.text();
        }
        
        // Update metadata
        if (noteTitle) {
            const firstLine = notesState.fullContent.split('\n')[0];
            noteTitle.textContent = firstLine.replace('# ', '');
        }
        
        if (noteSemester) {
            noteSemester.textContent = `Semester ${notesState.currentSem}`;
        }
        
        // Get subject from URL params
        const params = getUrlParams();
        if (noteSubject && params.subject) {
            const subjectData = APP_CONFIG.subjects[params.subject];
            noteSubject.textContent = subjectData ? subjectData.name : params.subject;
        }
        
        // Render content
        renderContent();
        
        // Generate table of contents
        generateTOC();
        
    } catch (error) {
        console.error('Error loading note:', error);
        showError('Failed to load note. Please try again later.');
    }
}

// ==========================================
// RENDER CONTENT
// ==========================================
function renderContent() {
    const contentElement = document.getElementById('markdownContent');
    if (!contentElement) return;
    
    if (notesState.isUnlocked) {
        // Show full content
        const html = marked.parse(notesState.fullContent);
        contentElement.innerHTML = html;
        hidePremiumOverlay();
    } else {
        // Show preview (30%)
        const lines = notesState.fullContent.split('\n');
        const previewLines = Math.ceil(lines.length * (notesState.previewPercentage / 100));
        const previewContent = lines.slice(0, previewLines).join('\n');
        
        const html = marked.parse(previewContent);
        contentElement.innerHTML = html;
        showPremiumOverlay();
    }
    
    // Add event listeners to images for zoom
    addImageZoomListeners();
    
    // Add copy buttons to code blocks
    addCopyButtons();
}

// ==========================================
// TABLE OF CONTENTS
// ==========================================
function generateTOC() {
    const tocNav = document.getElementById('tocNav');
    if (!tocNav) return;
    
    const contentElement = document.getElementById('markdownContent');
    if (!contentElement) return;
    
    const headings = contentElement.querySelectorAll('h2, h3');
    
    let tocHTML = '';
    headings.forEach((heading, index) => {
        const id = `heading-${index}`;
        heading.id = id;
        
        const level = heading.tagName.toLowerCase();
        const text = heading.textContent;
        
        tocHTML += `<a href="#${id}" class="toc-link ${level}">${text}</a>`;
    });
    
    tocNav.innerHTML = tocHTML || '<p style="color: var(--text-secondary); font-size: 0.85rem;">No sections found</p>';
}

// ==========================================
// PREMIUM OVERLAY
// ==========================================
function showPremiumOverlay() {
    const overlay = document.getElementById('premiumOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hidePremiumOverlay() {
    const overlay = document.getElementById('premiumOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ==========================================
// UNLOCK FORM
// ==========================================
function initUnlockForm() {
    const form = document.getElementById('unlockForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('unlockName').value.trim();
        const mobile = document.getElementById('unlockMobile').value.trim();
        
        if (!name || !mobile) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!/^[0-9]{10}$/.test(mobile)) {
            alert('Please enter a valid 10-digit mobile number');
            return;
        }
        
        // Save to Supabase
        await saveLead(name, mobile);
        
        // Unlock note
        const unlockKey = `unlocked_${notesState.currentNote}_${notesState.currentLang}`;
        localStorage.setItem(unlockKey, 'true');
        notesState.isUnlocked = true;
        
        // Re-render full content
        renderContent();
        
        alert('Notes unlocked successfully!');
    });
}

async function saveLead(name, mobile) {
    if (!supabase) {
        console.warn('Supabase not initialized. Lead not saved.');
        return;
    }
    
    const params = getUrlParams();
    
    try {
        const { data, error } = await supabase
            .from('leads')
            .insert([
                {
                    name: name,
                    mobile: mobile,
                    note_title: notesState.currentNote,
                    semester: notesState.currentSem,
                    stream: params.stream || 'pcm',
                    created_at: new Date().toISOString()
                }
            ]);
        
        if (error) throw error;
        console.log('Lead saved successfully:', data);
    } catch (error) {
        console.error('Error saving lead:', error);
    }
}

// ==========================================
// THEME TOGGLE
// ==========================================
function initThemeToggle() {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) return;
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    updateThemeButton(savedTheme);
    
    themeBtn.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        applyTheme(newTheme);
        updateThemeButton(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.style.background = '#0f172a';
        document.body.style.color = '#e2e8f0';
        document.documentElement.style.setProperty('--glass-bg', 'rgba(15, 23, 42, 0.7)');
        document.documentElement.style.setProperty('--text-primary', '#e2e8f0');
        document.documentElement.style.setProperty('--text-secondary', '#94a3b8');
    } else {
        document.body.style.background = '#f8fafc';
        document.body.style.color = '#1e293b';
        document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.7)');
        document.documentElement.style.setProperty('--text-primary', '#1e293b');
        document.documentElement.style.setProperty('--text-secondary', '#64748b');
    }
}

function updateThemeButton(theme) {
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// ==========================================
// LANGUAGE TOGGLE
// ==========================================
function initLanguageToggle() {
    const langBtns = document.querySelectorAll('.lang-btn');
    if (!langBtns.length) return;
    
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            if (lang === notesState.currentLang) return;
            
            notesState.currentLang = lang;
            
            // Update active button
            langBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Check unlock state for new language
            const unlockKey = `unlocked_${notesState.currentNote}_${lang}`;
            notesState.isUnlocked = localStorage.getItem(unlockKey) === 'true';
            
            // Reload note
            loadNote();
        });
    });
}

// ==========================================
// SIDEBAR TOGGLE
// ==========================================
function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('notesSidebar');
    
    if (!toggleBtn || !sidebar) return;
    
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // Close sidebar when clicking on a TOC link (mobile)
    const tocLinks = document.querySelectorAll('.toc-link');
    tocLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });
}

// ==========================================
// READING PROGRESS
// ==========================================
function initReadingProgress() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;
    
    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

// ==========================================
// IMAGE ZOOM
// ==========================================
function initImageZoom() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.querySelector('.modal-close');
    
    if (!modal || !modalImg) return;
    
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
}

function addImageZoomListeners() {
    const images = document.querySelectorAll('.markdown-body img');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    images.forEach(img => {
        img.addEventListener('click', () => {
            if (modal && modalImg) {
                modal.classList.add('show');
                modalImg.src = img.src;
            }
        });
    });
}

// ==========================================
// COPY CODE BUTTONS
// ==========================================
function addCopyButtons() {
    const codeBlocks = document.querySelectorAll('.markdown-body pre');
    
    codeBlocks.forEach(pre => {
        // Check if button already exists
        if (pre.querySelector('.copy-code-btn')) return;
        
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.textContent = 'Copy';
        button.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 12px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.3s ease;
        `;
        
        button.addEventListener('click', async () => {
            const code = pre.querySelector('code');
            if (code) {
                await navigator.clipboard.writeText(code.textContent);
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            }
        });
        
        pre.style.position = 'relative';
        pre.appendChild(button);
    });
}

// ==========================================
// SCROLL TO TOP
// ==========================================
function initScrollToTop() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (!scrollBtn) return;
    
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==========================================
// COPY CODE FLOATING BUTTON
// ==========================================
function initCopyCode() {
    const copyBtn = document.getElementById('copyCodeBtn');
    if (!copyBtn) return;
    
    copyBtn.addEventListener('click', async () => {
        const codeBlocks = document.querySelectorAll('.markdown-body pre code');
        if (codeBlocks.length > 0) {
            const allCode = Array.from(codeBlocks).map(code => code.textContent).join('\n\n');
            await navigator.clipboard.writeText(allCode);
            
            copyBtn.textContent = '✅';
            setTimeout(() => {
                copyBtn.textContent = '📋';
            }, 2000);
        }
    });
}

// ==========================================
// ERROR HANDLING
// ==========================================
function showError(message) {
    const contentElement = document.getElementById('markdownContent');
    if (contentElement) {
        contentElement.innerHTML = `
            <div class="error-message glass" style="text-align: center; padding: 40px;">
                <p style="font-size: 1.2rem; color: #ef4444;">${message}</p>
                <a href="index.html" style="color: var(--primary); margin-top: 16px; display: inline-block;">← Back to Home</a>
            </div>
        `;
    }
}
