// ==========================================
// APP CONFIGURATION
// ==========================================
const APP_CONFIG = {
    streams: {
        pcm: {
            name: 'PCM',
            subjects: ['Physics', 'Chemistry', 'Mathematics'],
            icon: '⚛️'
        },
        cbz: {
            name: 'CBZ',
            subjects: ['Chemistry', 'Botany', 'Zoology'],
            icon: '🧬'
        },
        maths: {
            name: 'Mathematics',
            subjects: ['Mathematics'],
            icon: '📐'
        }
    },
    semesters: [1, 2, 3, 4, 5, 6],
    subjects: {
        physics: {
            name: 'Physics',
            units: {
                1: 'Mechanics & Motion',
                2: 'Waves & Oscillations',
                3: 'Thermodynamics',
                4: 'Electromagnetism',
                5: 'Optics'
            }
        },
        chemistry: {
            name: 'Chemistry',
            units: {
                1: 'Atomic Structure',
                2: 'Chemical Bonding',
                3: 'Thermodynamics',
                4: 'Organic Chemistry',
                5: 'Electrochemistry'
            }
        },
        mathematics: {
            name: 'Mathematics',
            units: {
                1: 'Algebra',
                2: 'Calculus',
                3: 'Geometry',
                4: 'Statistics',
                5: 'Differential Equations'
            }
        },
        botany: {
            name: 'Botany',
            units: {
                1: 'Plant Anatomy',
                2: 'Plant Physiology',
                3: 'Genetics',
                4: 'Ecology',
                5: 'Taxonomy'
            }
        },
        zoology: {
            name: 'Zoology',
            units: {
                1: 'Animal Diversity',
                2: 'Cell Biology',
                3: 'Genetics',
                4: 'Evolution',
                5: 'Ecology'
            }
        }
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        stream: params.get('stream'),
        sem: params.get('sem'),
        subject: params.get('subject'),
        unit: params.get('unit'),
        note: params.get('note')
    };
}

function formatSemester(sem) {
    return `Semester ${sem}`;
}

function getStreamFromUrl() {
    const params = getUrlParams();
    if (params.stream) return params.stream;
    if (params.sem) {
        // Determine stream from context
        const streamParam = new URLSearchParams(window.location.search).get('stream');
        return streamParam || 'pcm';
    }
    return 'pcm';
}

// ==========================================
// GLOBAL SEARCH
// ==========================================
function initGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query, searchResults);
        }, 300);
    });
    
    // Close search results on click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

function performSearch(query, resultsContainer) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    // Search through streams
    Object.entries(APP_CONFIG.streams).forEach(([key, stream]) => {
        if (stream.name.toLowerCase().includes(lowerQuery)) {
            results.push({
                type: 'Stream',
                title: stream.name,
                link: `semester.html?stream=${key}`,
                icon: stream.icon
            });
        }
        
        // Search subjects
        stream.subjects.forEach(subject => {
            const subjectKey = subject.toLowerCase();
            const subjectData = APP_CONFIG.subjects[subjectKey];
            
            if (subjectData && subject.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'Subject',
                    title: `${subject} (${stream.name})`,
                    link: `subject.html?stream=${key}&subject=${subjectKey}&sem=1`,
                    icon: '📖'
                });
            }
            
            // Search units
            if (subjectData) {
                Object.entries(subjectData.units).forEach(([unitNum, unitName]) => {
                    if (unitName.toLowerCase().includes(lowerQuery)) {
                        results.push({
                            type: 'Unit',
                            title: `${subject} - Unit ${unitNum}: ${unitName}`,
                            link: `unit.html?stream=${key}&subject=${subjectKey}&sem=1&unit=${unitNum}`,
                            icon: '📝'
                        });
                    }
                });
            }
        });
    });
    
    // Display results
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No results found</p>';
    } else {
        resultsContainer.innerHTML = results.slice(0, 10).map(result => `
            <a href="${result.link}" class="search-result-item">
                <span class="result-icon">${result.icon}</span>
                <div class="result-info">
                    <span class="result-type">${result.type}</span>
                    <span class="result-title">${result.title}</span>
                </div>
            </a>
        `).join('');
    }
    
    resultsContainer.style.display = 'block';
}

// ==========================================
// SEMESTER PAGE LOGIC
// ==========================================
function initSemesterPage() {
    const params = getUrlParams();
    const streamTitle = document.getElementById('streamTitle');
    const subjectsGrid = document.getElementById('subjectsGrid');
    
    if (!subjectsGrid) return;
    
    const stream = params.stream || 'pcm';
    const streamData = APP_CONFIG.streams[stream];
    
    if (streamTitle && streamData) {
        streamTitle.textContent = `${streamData.name} - Semesters`;
    }
    
    // Filter buttons logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            loadSubjects(stream, filter);
        });
    });
    
    // Initial load
    loadSubjects(stream, 'all');
}

function loadSubjects(stream, filter) {
    const subjectsGrid = document.getElementById('subjectsGrid');
    if (!subjectsGrid) return;
    
    const streamData = APP_CONFIG.streams[stream];
    if (!streamData) return;
    
    const semestersToShow = filter === 'all' 
        ? APP_CONFIG.semesters 
        : [parseInt(filter.replace('sem', ''))];
    
    let html = '';
    
    semestersToShow.forEach(sem => {
        streamData.subjects.forEach(subject => {
            const subjectKey = subject.toLowerCase();
            const subjectData = APP_CONFIG.subjects[subjectKey];
            
            if (subjectData) {
                const unitCount = Object.keys(subjectData.units).length;
                const icon = getSubjectIcon(subjectKey);
                
                html += `
                    <a href="subject.html?stream=${stream}&subject=${subjectKey}&sem=${sem}" 
                       class="subject-card glass">
                        <span class="subject-icon">${icon}</span>
                        <h3>${subject}</h3>
                        <p>${formatSemester(sem)} • ${unitCount} Units</p>
                        <div class="card-meta">
                            <span class="note-badge">${unitCount * 2}+ Notes</span>
                            <span>→</span>
                        </div>
                    </a>
                `;
            }
        });
    });
    
    subjectsGrid.innerHTML = html || '<p class="no-results">No subjects found</p>';
}

// ==========================================
// SUBJECT PAGE LOGIC
// ==========================================
function initSubjectPage() {
    const params = getUrlParams();
    const subjectTitle = document.getElementById('subjectTitle');
    const subjectInfo = document.getElementById('subjectInfo');
    const unitsGrid = document.getElementById('unitsGrid');
    
    if (!unitsGrid) return;
    
    const subjectKey = params.subject || 'physics';
    const sem = params.sem || '1';
    const stream = params.stream || 'pcm';
    
    const subjectData = APP_CONFIG.subjects[subjectKey];
    if (!subjectData) return;
    
    if (subjectTitle) {
        subjectTitle.textContent = subjectData.name;
    }
    
    if (subjectInfo) {
        const unitCount = Object.keys(subjectData.units).length;
        subjectInfo.textContent = `${formatSemester(sem)} • ${unitCount} Units • ${unitCount * 2}+ Notes`;
    }
    
    let html = '';
    Object.entries(subjectData.units).forEach(([unitNum, unitName]) => {
        html += `
            <a href="unit.html?stream=${stream}&subject=${subjectKey}&sem=${sem}&unit=${unitNum}" 
               class="unit-card glass">
                <span class="unit-number">Unit ${unitNum}</span>
                <h3>${unitName}</h3>
                <p>Comprehensive notes, PYQs & important questions</p>
                <div class="card-meta">
                    <span class="note-badge">4 Notes</span>
                    <span>→</span>
                </div>
            </a>
        `;
    });
    
    unitsGrid.innerHTML = html;
}

// ==========================================
// UNIT PAGE LOGIC
// ==========================================
function initUnitPage() {
    const params = getUrlParams();
    const unitTitle = document.getElementById('unitTitle');
    const unitInfo = document.getElementById('unitInfo');
    const notesGrid = document.getElementById('notesGrid');
    
    if (!notesGrid) return;
    
    const subjectKey = params.subject || 'physics';
    const sem = params.sem || '1';
    const unit = params.unit || '1';
    const stream = params.stream || 'pcm';
    
    const subjectData = APP_CONFIG.subjects[subjectKey];
    if (!subjectData) return;
    
    const unitName = subjectData.units[unit] || `Unit ${unit}`;
    
    if (unitTitle) {
        unitTitle.textContent = `Unit ${unit}: ${unitName}`;
    }
    
    if (unitInfo) {
        unitInfo.textContent = `${subjectData.name} • ${formatSemester(sem)}`;
    }
    
    // Generate note cards based on subject
    const notes = getNotesForUnit(subjectKey, unit);
    
    let html = '';
    notes.forEach(note => {
        html += `
            <a href="notes.html?stream=${stream}&subject=${subjectKey}&sem=${sem}&unit=${unit}&note=${note.filename}" 
               class="note-card glass">
                <h3>${note.title}</h3>
                <p>${note.description}</p>
                <div class="card-meta">
                    <span class="note-badge">${note.pages || '15'} pages</span>
                    <span>→</span>
                </div>
            </a>
        `;
    });
    
    notesGrid.innerHTML = html || '<p class="no-results">No notes available for this unit</p>';
    
    // Load PYQs and Important Questions
    loadAdditionalResources(subjectKey, unit);
}

function getNotesForUnit(subjectKey, unit) {
    const notesMap = {
        physics: {
            1: [
                { filename: 'physics-motion', title: 'Motion in One Dimension', description: 'Complete notes on kinematics', pages: '12' },
                { filename: 'physics-motion-laws', title: "Newton's Laws of Motion", description: 'Detailed explanation with examples', pages: '15' }
            ],
            2: [
                { filename: 'physics-waves', title: 'Wave Motion', description: 'Types of waves and their properties', pages: '14' }
            ]
        },
        chemistry: {
            1: [
                { filename: 'chemistry-atomic-structure', title: 'Atomic Structure', description: 'Bohr model, quantum numbers', pages: '18' }
            ],
            2: [
                { filename: 'chemistry-bonding', title: 'Chemical Bonding', description: 'Ionic, covalent & metallic bonds', pages: '16' }
            ]
        },
        mathematics: {
            1: [
                { filename: 'maths-algebra', title: 'Advanced Algebra', description: 'Groups, rings & fields', pages: '20' }
            ],
            2: [
                { filename: 'maths-calculus', title: 'Differential Calculus', description: 'Limits, derivatives & applications', pages: '18' }
            ]
        }
    };
    
    return notesMap[subjectKey]?.[unit] || [
        { filename: `${subjectKey}-unit${unit}`, title: `Unit ${unit} Notes`, description: 'Comprehensive study material', pages: '15' }
    ];
}

function loadAdditionalResources(subjectKey, unit) {
    const pyqList = document.getElementById('pyqList');
    const importantList = document.getElementById('importantList');
    
    if (pyqList) {
        pyqList.innerHTML = `
            <ul>
                <li>Previous Year Question 1 (2023)</li>
                <li>Previous Year Question 2 (2022)</li>
                <li>Previous Year Question 3 (2021)</li>
            </ul>
        `;
    }
    
    if (importantList) {
        importantList.innerHTML = `
            <ul>
                <li>Important Question 1</li>
                <li>Important Question 2</li>
                <li>Important Question 3</li>
                <li>Important Question 4</li>
            </ul>
        `;
    }
}

// ==========================================
// LATEST NOTES (INDEX PAGE)
// ==========================================
function loadLatestNotes() {
    const latestGrid = document.getElementById('latestNotes');
    if (!latestGrid) return;
    
    const latestNotes = [
        { title: 'Quantum Mechanics', subject: 'Physics', sem: 'Semester 5', stream: 'PCM' },
        { title: 'Molecular Biology', subject: 'Zoology', sem: 'Semester 3', stream: 'CBZ' },
        { title: 'Linear Algebra', subject: 'Mathematics', sem: 'Semester 2', stream: 'PCM' },
        { title: 'Organic Chemistry', subject: 'Chemistry', sem: 'Semester 4', stream: 'CBZ' },
        { title: 'Plant Physiology', subject: 'Botany', sem: 'Semester 3', stream: 'CBZ' },
        { title: 'Electromagnetic Theory', subject: 'Physics', sem: 'Semester 4', stream: 'PCM' }
    ];
    
    latestGrid.innerHTML = latestNotes.map(note => `
        <div class="note-card glass">
            <h3>${note.title}</h3>
            <p>${note.subject} • ${note.sem}</p>
            <div class="card-meta">
                <span class="note-badge">${note.stream}</span>
                <a href="notes.html?note=${note.title.toLowerCase().replace(/\s+/g, '-')}" class="view-link">Read →</a>
            </div>
        </div>
    `).join('');
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function getSubjectIcon(subject) {
    const icons = {
        physics: '⚡',
        chemistry: '🧪',
        mathematics: '📐',
        botany: '🌿',
        zoology: '🦁'
    };
    return icons[subject] || '📖';
}

// ==========================================
// MOBILE MENU
// ==========================================
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (!menuBtn || !navLinks) return;
    
    menuBtn.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        menuBtn.classList.toggle('active');
    });
}

// ==========================================
// PARTICLE BACKGROUND
// ==========================================
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: rgba(99, 102, 241, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float-particle ${Math.random() * 10 + 10}s infinite linear;
            animation-delay: ${Math.random() * 5}s;
        `;
        particlesContainer.appendChild(particle);
    }
}

// Add particle animation
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    @keyframes float-particle {
        0%, 100% {
            transform: translate(0, 0);
        }
        25% {
            transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
        }
        50% {
            transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
        }
        75% {
            transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
        }
    }
`;
document.head.appendChild(particleStyle);

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize based on current page
    const currentPath = window.location.pathname;
    
    initMobileMenu();
    initGlobalSearch();
    initParticles();
    
    if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
        loadLatestNotes();
    } else if (currentPath.includes('semester.html')) {
        initSemesterPage();
    } else if (currentPath.includes('subject.html')) {
        initSubjectPage();
    } else if (currentPath.includes('unit.html')) {
        initUnitPage();
    }
});

// Export for use in other files
window.APP_CONFIG = APP_CONFIG;
window.getUrlParams = getUrlParams;
