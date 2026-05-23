// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://gxxhlbimrahogsgvkpfy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eGhsYmltcmFob2dzZ3ZrcGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjA5NzEsImV4cCI6MjA0OTUzNjk3MX0.qT8YHgqJxJR66tFFDEmVb9XHgMSDkEzN5B3DXh2AKK0';

let supabase;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    console.error('Supabase initialization error:', error);
}

// ==========================================
// ADMIN STATE
// ==========================================
const adminState = {
    currentSection: 'dashboard',
    leads: [],
    filteredLeads: []
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initLeadsSection();
    initNotesEditor();
    initLinkGenerator();
    loadDashboardStats();
});

// ==========================================
// NAVIGATION
// ==========================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const section = item.dataset.section;
            showSection(section);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
    
    // Show initial section
    showSection('dashboard');
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => section.classList.remove('active'));
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        adminState.currentSection = sectionId;
        
        // Load section-specific data
        if (sectionId === 'leads') {
            loadLeads();
        }
    }
}

// ==========================================
// DASHBOARD STATS
// ==========================================
async function loadDashboardStats() {
    if (!supabase) {
        updateDashboardStats({ total: 0, today: 0 });
        return;
    }
    
    try {
        // Get total leads
        const { count: totalLeads, error: totalError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true });
        
        if (totalError) throw totalError;
        
        // Get today's leads
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: todayLeads, error: todayError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        
        if (todayError) throw todayError;
        
        updateDashboardStats({
            total: totalLeads || 0,
            today: todayLeads || 0
        });
    } catch (error) {
        console.error('Error loading stats:', error);
        updateDashboardStats({ total: 0, today: 0 });
    }
}

function updateDashboardStats(stats) {
    const totalLeadsEl = document.getElementById('totalLeads');
    const todayLeadsEl = document.getElementById('todayLeads');
    
    if (totalLeadsEl) totalLeadsEl.textContent = stats.total;
    if (todayLeadsEl) todayLeadsEl.textContent = stats.today;
}

// ==========================================
// LEADS MANAGEMENT
// ==========================================
function initLeadsSection() {
    const searchInput = document.getElementById('leadSearch');
    const exportBtn = document.getElementById('exportCSV');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterLeads(query);
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportLeadsToCSV);
    }
}

async function loadLeads() {
    if (!supabase) {
        showNoLeadsMessage();
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        adminState.leads = data || [];
        adminState.filteredLeads = [...adminState.leads];
        renderLeadsTable(adminState.filteredLeads);
    } catch (error) {
        console.error('Error loading leads:', error);
        showNoLeadsMessage();
    }
}

function filterLeads(query) {
    if (!query) {
        adminState.filteredLeads = [...adminState.leads];
    } else {
        adminState.filteredLeads = adminState.leads.filter(lead => 
            lead.name?.toLowerCase().includes(query) ||
            lead.mobile?.includes(query) ||
            lead.note_title?.toLowerCase().includes(query) ||
            lead.semester?.includes(query) ||
            lead.stream?.toLowerCase().includes(query)
        );
    }
    
    renderLeadsTable(adminState.filteredLeads);
}

function renderLeadsTable(leads) {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;
    
    if (leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    No leads found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = leads.map(lead => `
        <tr>
            <td>${lead.name || 'N/A'}</td>
            <td>${lead.mobile || 'N/A'}</td>
            <td>${lead.note_title || 'N/A'}</td>
            <td>${lead.semester || 'N/A'}</td>
            <td>${lead.stream || 'N/A'}</td>
            <td>${formatDate(lead.created_at)}</td>
            <td>
                <button class="delete-btn" onclick="deleteLead(${lead.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteLead(id) {
    if (!supabase) return;
    
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // Reload leads
        loadLeads();
        loadDashboardStats();
        
        alert('Lead deleted successfully');
    } catch (error) {
        console.error('Error deleting lead:', error);
        alert('Failed to delete lead');
    }
}

function exportLeadsToCSV() {
    if (adminState.leads.length === 0) {
        alert('No leads to export');
        return;
    }
    
    const headers = ['Name', 'Mobile', 'Note Title', 'Semester', 'Stream', 'Date'];
    const rows = adminState.leads.map(lead => [
        lead.name || '',
        lead.mobile || '',
        lead.note_title || '',
        lead.semester || '',
        lead.stream || '',
        formatDate(lead.created_at)
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function showNoLeadsMessage() {
    const tbody = document.getElementById('leadsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    Unable to load leads. Please check your Supabase configuration.
                </td>
            </tr>
        `;
    }
}

// ==========================================
// NOTES EDITOR
// ==========================================
function initNotesEditor() {
    const previewBtn = document.getElementById('previewBtn');
    const saveBtn = document.getElementById('saveNoteBtn');
    const editor = document.getElementById('markdownEditor');
    const previewPanel = document.getElementById('previewPanel');
    const previewContent = document.getElementById('previewContent');
    
    if (previewBtn && previewPanel && previewContent && editor) {
        previewBtn.addEventListener('click', () => {
            const markdown = editor.value;
            const html = marked.parse(markdown);
            previewContent.innerHTML = html;
            previewPanel.style.display = 'block';
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveNote();
        });
    }
}

function saveNote() {
    const semester = document.getElementById('noteSemester').value;
    const filename = document.getElementById('noteFilename').value.trim();
    const language = document.getElementById('noteLanguage').value;
    const content = document.getElementById('markdownEditor').value;
    
    if (!filename) {
        alert('Please enter a filename');
        return;
    }
    
    if (!content) {
        alert('Please write some content');
        return;
    }
    
    // In a real application, this would save to a server
    // For now, we'll download the file
    const fullFilename = `${filename}-${language}.md`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFilename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert(`Note saved as ${fullFilename}\n\nPlace this file in: notes/${semester}/`);
}

// ==========================================
// LINK GENERATOR
// ==========================================
function initLinkGenerator() {
    const generateBtn = document.getElementById('generateLinks');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', generateNoteLinks);
    }
}

function generateNoteLinks() {
    const semester = document.getElementById('genSemester').value;
    const subject = document.getElementById('genSubject').value;
    const linksContainer = document.getElementById('generatedLinks');
    
    if (!linksContainer) return;
    
    const subjectData = APP_CONFIG.subjects[subject];
    if (!subjectData) return;
    
    let html = '<h3 style="margin-bottom: 16px;">Generated Links</h3>';
    
    Object.entries(subjectData.units).forEach(([unitNum, unitName]) => {
        html += `
            <div style="margin-bottom: 16px;">
                <strong>Unit ${unitNum}: ${unitName}</strong>
                <div class="generated-link">
                    <code>&lt;a href="notes.html?sem=${semester.replace('sem', '')}&note=${subject}-unit${unitNum}"&gt;${unitName} Notes&lt;/a&gt;</code>
                    <button class="copy-link-btn" onclick="copyToClipboard('notes.html?sem=${semester.replace('sem', '')}&note=${subject}-unit${unitNum}')">Copy</button>
                </div>
            </div>
        `;
    });
    
    linksContainer.innerHTML = html;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Make functions available globally
window.deleteLead = deleteLead;
window.copyToClipboard = copyToClipboard;
