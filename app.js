// SRT Korrektur-Tool - Main Application
// Verwendet LanguageTool API (kostenlos)
// Unterstützt SRT aus Premiere Pro, DaVinci Resolve, Final Cut Pro, etc.

class SRTCorrector {
    constructor() {
        this.subtitles = [];
        this.corrections = new Map();
        this.videoFile = null;
        this.srtFile = null;

        // LanguageTool API (kostenlos, kein API-Key nötig)
        this.languageToolUrl = 'https://api.languagetool.org/v2/check';

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Upload elements
        this.videoInput = document.getElementById('video-input');
        this.srtInput = document.getElementById('srt-input');
        this.videoName = document.getElementById('video-name');
        this.srtName = document.getElementById('srt-name');
        this.videoUploadBox = document.getElementById('video-upload');
        this.srtUploadBox = document.getElementById('srt-upload');

        // Video elements
        this.videoSection = document.getElementById('video-section');
        this.videoPlayer = document.getElementById('video-player');
        this.subtitleOverlay = document.getElementById('subtitle-overlay');

        // Control elements
        this.checkBtn = document.getElementById('check-btn');
        this.progressContainer = document.getElementById('progress-container');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');

        // Editor elements
        this.editorSection = document.getElementById('editor-section');
        this.subtitlesList = document.getElementById('subtitles-list');
        this.acceptAllBtn = document.getElementById('accept-all-btn');
        this.rejectAllBtn = document.getElementById('reject-all-btn');
        this.filterCorrections = document.getElementById('filter-corrections');
        this.correctionStats = document.getElementById('correction-stats');

        // Export elements
        this.exportSection = document.getElementById('export-section');
        this.exportBtn = document.getElementById('export-btn');
        this.exportOriginalBtn = document.getElementById('export-original-btn');

        // Toast
        this.toast = document.getElementById('toast');
    }

    initEventListeners() {
        // File uploads
        this.videoInput.addEventListener('change', (e) => this.handleVideoUpload(e));
        this.srtInput.addEventListener('change', (e) => this.handleSrtUpload(e));

        // Drag and drop
        [this.videoUploadBox, this.srtUploadBox].forEach(box => {
            box.addEventListener('dragover', (e) => {
                e.preventDefault();
                box.classList.add('dragover');
            });
            box.addEventListener('dragleave', () => {
                box.classList.remove('dragover');
            });
        });

        this.videoUploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            this.videoUploadBox.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('video/')) {
                this.processVideoFile(file);
            }
        });

        this.srtUploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            this.srtUploadBox.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.srt')) {
                this.processSrtFile(file);
            }
        });

        // Video player
        this.videoPlayer.addEventListener('timeupdate', () => this.updateSubtitleOverlay());

        // Control buttons
        this.checkBtn.addEventListener('click', () => this.startCorrection());

        // Editor controls
        this.acceptAllBtn.addEventListener('click', () => this.acceptAllCorrections());
        this.rejectAllBtn.addEventListener('click', () => this.rejectAllCorrections());
        this.filterCorrections.addEventListener('change', () => this.renderSubtitles());

        // Export buttons
        this.exportBtn.addEventListener('click', () => this.exportCorrectedSrt());
        this.exportOriginalBtn.addEventListener('click', () => this.exportOriginalSrt());
    }

    // ==================== FILE HANDLING ====================

    handleVideoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processVideoFile(file);
        }
    }

    processVideoFile(file) {
        this.videoFile = file;
        this.videoName.textContent = file.name;
        this.videoUploadBox.classList.add('has-file');

        const url = URL.createObjectURL(file);
        this.videoPlayer.src = url;
        this.videoSection.style.display = 'block';

        this.showToast('Video geladen', 'success');
    }

    handleSrtUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processSrtFile(file);
        }
    }

    async processSrtFile(file) {
        this.srtFile = file;
        this.srtName.textContent = file.name;
        this.srtUploadBox.classList.add('has-file');

        const content = await file.text();
        this.subtitles = this.parseSrt(content);

        this.checkBtn.disabled = false;
        this.showToast(`${this.subtitles.length} Untertitel geladen`, 'success');

        // Show editor with original subtitles
        this.filterCorrections.checked = false;
        this.renderSubtitles();
        this.editorSection.style.display = 'block';
    }

    // ==================== SRT PARSING ====================
    // Unterstützt verschiedene SRT-Formate von Premiere Pro, DaVinci Resolve, etc.

    parseSrt(content) {
        const subtitles = [];

        // Normalize line endings (Windows, Mac, Linux)
        let normalizedContent = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        // Split by double newlines (or more)
        const blocks = normalizedContent.trim().split(/\n\n+/);

        for (const block of blocks) {
            const lines = block.split('\n').filter(line => line.trim() !== '');

            if (lines.length >= 2) {
                // First line should be the index number
                const index = parseInt(lines[0], 10);

                // Second line should be the timecode
                const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.:]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.:]\d{3})/);

                if (timeMatch && !isNaN(index)) {
                    const startTimeStr = timeMatch[1];
                    const endTimeStr = timeMatch[2];
                    const startTime = this.parseTime(startTimeStr);
                    const endTime = this.parseTime(endTimeStr);

                    // Text is everything after the timecode line
                    let text = lines.slice(2).join('\n');

                    // Clean up text from various editors
                    text = this.cleanSubtitleText(text);

                    subtitles.push({
                        index,
                        startTime,
                        endTime,
                        startTimeStr: this.normalizeTimeStr(startTimeStr),
                        endTimeStr: this.normalizeTimeStr(endTimeStr),
                        text,
                        cleanText: text, // Text ohne HTML für die Prüfung
                        originalText: text,
                        corrected: false,
                        accepted: false,
                        corrections: []
                    });
                }
            }
        }

        return subtitles;
    }

    // Clean subtitle text from HTML tags and formatting from various NLEs
    cleanSubtitleText(text) {
        // Remove common HTML tags from various editors
        // <b>, </b>, <i>, </i>, <u>, </u>, <font>, </font>, etc.
        let cleaned = text
            // Remove bold tags
            .replace(/<\/?b>/gi, '')
            // Remove italic tags
            .replace(/<\/?i>/gi, '')
            // Remove underline tags
            .replace(/<\/?u>/gi, '')
            // Remove font tags (with attributes)
            .replace(/<font[^>]*>/gi, '')
            .replace(/<\/font>/gi, '')
            // Remove span tags (with attributes)
            .replace(/<span[^>]*>/gi, '')
            .replace(/<\/span>/gi, '')
            // Remove any other HTML tags
            .replace(/<[^>]+>/g, '')
            // Decode HTML entities
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            // Remove multiple spaces
            .replace(/  +/g, ' ')
            // Trim each line
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            // Trim overall
            .trim();

        return cleaned;
    }

    parseTime(timeStr) {
        // Support both comma (,) and dot (.) as millisecond separator
        // Also support colon (:) sometimes used by some editors
        const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2})[,.:]+(\d{3})/);
        if (match) {
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            const milliseconds = parseInt(match[4], 10);
            return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
        }
        return 0;
    }

    normalizeTimeStr(timeStr) {
        // Normalize to standard SRT format with comma
        return timeStr.replace(/[.:]+(\d{3})$/, ',$1');
    }

    // ==================== VIDEO OVERLAY ====================

    updateSubtitleOverlay() {
        const currentTime = this.videoPlayer.currentTime;
        const currentSubtitle = this.subtitles.find(sub =>
            currentTime >= sub.startTime && currentTime <= sub.endTime
        );

        if (currentSubtitle) {
            this.subtitleOverlay.textContent = currentSubtitle.text;
            this.subtitleOverlay.classList.add('visible');
        } else {
            this.subtitleOverlay.classList.remove('visible');
        }
    }

    // ==================== CORRECTION PROCESS ====================

    async startCorrection() {
        if (this.subtitles.length === 0) {
            this.showToast('Keine Untertitel geladen', 'error');
            return;
        }

        this.checkBtn.disabled = true;
        this.progressContainer.style.display = 'flex';
        this.corrections.clear();

        // Reset correction state
        this.subtitles.forEach(sub => {
            sub.corrected = false;
            sub.accepted = false;
            sub.correctedText = null;
            sub.corrections = [];
        });

        let processed = 0;
        let hasErrors = false;

        for (const subtitle of this.subtitles) {
            try {
                await this.checkSubtitle(subtitle);
                await this.sleep(100);
            } catch (error) {
                console.error('Error checking subtitle:', error);
                if (error.message.includes('429') || error.message.includes('Too Many')) {
                    this.showToast('Rate-Limit erreicht. Warte kurz...', 'info');
                    await this.sleep(2000);
                    try {
                        await this.checkSubtitle(subtitle);
                    } catch (e) {
                        hasErrors = true;
                    }
                } else {
                    hasErrors = true;
                }
            }

            processed++;
            const progress = Math.round((processed / this.subtitles.length) * 100);
            this.progressFill.style.width = `${progress}%`;
            this.progressText.textContent = `${progress}%`;
        }

        this.checkBtn.disabled = false;
        this.progressContainer.style.display = 'none';

        const correctionCount = this.subtitles.filter(s => s.corrected).length;

        // Always show all subtitles, not just corrections
        this.filterCorrections.checked = false;

        this.renderSubtitles();
        this.exportSection.style.display = 'flex';
        this.updateStats();

        if (!hasErrors) {
            if (correctionCount > 0) {
                this.showToast(`Prüfung abgeschlossen! ${correctionCount} Untertitel mit Fehlern.`, 'success');
            } else {
                this.showToast('Prüfung abgeschlossen! Keine Fehler gefunden.', 'success');
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkSubtitle(subtitle) {
        const text = subtitle.text;

        if (!text.trim()) {
            return;
        }

        const params = new URLSearchParams();
        params.append('text', text);
        params.append('language', 'de-DE');
        params.append('enabledOnly', 'false');

        const response = await fetch(this.languageToolUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.matches && data.matches.length > 0) {
            const matches = [];

            for (const match of data.matches) {
                if (match.replacements && match.replacements.length > 0) {
                    const allReplacements = match.replacements.slice(0, 5).map(r => r.value);

                    matches.push({
                        offset: match.offset,
                        length: match.length,
                        original: text.substring(match.offset, match.offset + match.length),
                        replacements: allReplacements,
                        selectedIndex: 0,
                        message: match.message,
                        rule: match.rule?.description || 'Unbekannte Regel'
                    });
                }
            }

            if (matches.length > 0) {
                subtitle.matches = matches;
                subtitle.corrections = matches.map(m => ({
                    original: m.original,
                    replacement: m.replacements[0],
                    allReplacements: m.replacements,
                    message: m.message,
                    rule: m.rule,
                    offset: m.offset,
                    length: m.length
                }));

                subtitle.correctedText = this.applyCorrections(text, subtitle.corrections);
                subtitle.corrected = true;

                this.corrections.set(subtitle.index, {
                    original: text,
                    corrected: subtitle.correctedText,
                    details: subtitle.corrections
                });
            }
        }
    }

    applyCorrections(text, corrections) {
        const sorted = [...corrections].sort((a, b) => b.offset - a.offset);
        let result = text;

        for (const corr of sorted) {
            result = result.substring(0, corr.offset) +
                     corr.replacement +
                     result.substring(corr.offset + corr.length);
        }

        return result;
    }

    // ==================== RENDERING ====================

    renderSubtitles() {
        const filterOnly = this.filterCorrections.checked;
        const filtered = filterOnly
            ? this.subtitles.filter(sub => sub.corrected && !sub.accepted)
            : this.subtitles;

        if (filtered.length === 0 && filterOnly) {
            this.subtitlesList.innerHTML = '<div class="no-corrections">Keine Korrekturen mehr offen. Deaktiviere den Filter, um alle Untertitel zu sehen.</div>';
        } else {
            this.subtitlesList.innerHTML = filtered.map(sub => this.renderSubtitleItem(sub)).join('');
        }

        this.attachEventListeners();
        this.updateStats();
    }

    renderSubtitleItem(sub) {
        const hasCorrection = sub.corrected && !sub.accepted;
        const isAccepted = sub.accepted;

        let statusClass = '';
        if (hasCorrection) {
            statusClass = 'has-correction';
        } else if (isAccepted) {
            statusClass = 'accepted';
        }

        return `
            <div class="subtitle-item ${statusClass}" data-index="${sub.index}">
                <div class="subtitle-header">
                    <span class="subtitle-index">#${sub.index}</span>
                    <span class="subtitle-time">
                        <button class="btn-icon jump-to-time" data-time="${sub.startTime}" title="Zur Position springen">▶️</button>
                        ${sub.startTimeStr} → ${sub.endTimeStr}
                    </span>
                    ${hasCorrection ? '<span class="correction-badge">⚠️ Korrektur verfügbar</span>' : ''}
                    ${isAccepted ? '<span class="accepted-badge">✓ Korrigiert</span>' : ''}
                </div>
                <div class="subtitle-content">
                    <div class="subtitle-text ${hasCorrection ? 'needs-correction' : ''}"
                         contenteditable="true"
                         data-index="${sub.index}">${this.escapeHtml(sub.text)}</div>
                    <div class="edit-hint">💡 Klicken zum Bearbeiten • Enter = Speichern • Shift+Enter = Neue Zeile</div>
                </div>
                ${hasCorrection ? this.renderCorrectionPanel(sub) : ''}
            </div>
        `;
    }

    renderCorrectionPanel(sub) {
        const correctionsHtml = sub.corrections.map((c, idx) => {
            let replacementHtml;
            if (c.allReplacements && c.allReplacements.length > 1) {
                const options = c.allReplacements.map((r, i) =>
                    `<option value="${i}" ${i === 0 ? 'selected' : ''}>${this.escapeHtml(r)}</option>`
                ).join('');
                replacementHtml = `<select class="correction-select" data-sub-index="${sub.index}" data-corr-index="${idx}">${options}</select>`;
            } else {
                replacementHtml = `<span class="correction-replacement">${this.escapeHtml(c.replacement)}</span>`;
            }

            return `
                <div class="correction-item">
                    <div class="correction-words">
                        <span class="word-original">${this.escapeHtml(c.original)}</span>
                        <span class="word-arrow">→</span>
                        ${replacementHtml}
                    </div>
                    <div class="correction-reason">${this.escapeHtml(c.message)}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="correction-panel">
                <div class="correction-panel-header">
                    <span>📝 ${sub.corrections.length} Fehler gefunden</span>
                    <div class="correction-panel-actions">
                        <button class="btn btn-success btn-small accept-btn" data-index="${sub.index}">✓ Alle übernehmen</button>
                        <button class="btn btn-secondary btn-small reject-btn" data-index="${sub.index}">✗ Ignorieren</button>
                    </div>
                </div>
                <div class="correction-items">
                    ${correctionsHtml}
                </div>
                <div class="correction-preview">
                    <div class="preview-label">Vorschau nach Korrektur:</div>
                    <div class="preview-text" data-index="${sub.index}">${this.escapeHtml(sub.correctedText)}</div>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachEventListeners() {
        // Accept/Reject buttons
        this.subtitlesList.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.accept-btn').dataset.index, 10);
                this.acceptCorrection(index);
            });
        });

        this.subtitlesList.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.reject-btn').dataset.index, 10);
                this.rejectCorrection(index);
            });
        });

        // Editable text fields
        this.subtitlesList.querySelectorAll('.subtitle-text').forEach(el => {
            el.addEventListener('blur', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                this.handleManualEdit(index, e.target.textContent);
            });

            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });

            el.addEventListener('focus', (e) => {
                e.target.classList.add('editing');
            });

            el.addEventListener('input', (e) => {
                e.target.classList.add('modified');
            });
        });

        // Jump to time buttons
        this.subtitlesList.querySelectorAll('.jump-to-time').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const time = parseFloat(e.target.closest('.jump-to-time').dataset.time);
                if (this.videoPlayer.src) {
                    this.videoPlayer.currentTime = time;
                    this.videoPlayer.play();
                }
            });
        });

        // Correction dropdowns
        this.subtitlesList.querySelectorAll('.correction-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const subIndex = parseInt(e.target.dataset.subIndex, 10);
                const corrIndex = parseInt(e.target.dataset.corrIndex, 10);
                const selectedOptionIndex = parseInt(e.target.value, 10);
                this.updateCorrectionChoice(subIndex, corrIndex, selectedOptionIndex);
            });
        });
    }

    // ==================== CORRECTION ACTIONS ====================

    updateCorrectionChoice(subIndex, corrIndex, selectedOptionIndex) {
        const subtitle = this.subtitles.find(s => s.index === subIndex);
        if (subtitle && subtitle.corrections[corrIndex]) {
            const correction = subtitle.corrections[corrIndex];
            correction.replacement = correction.allReplacements[selectedOptionIndex];

            subtitle.correctedText = this.applyCorrections(subtitle.originalText, subtitle.corrections);

            const preview = this.subtitlesList.querySelector(`.preview-text[data-index="${subIndex}"]`);
            if (preview) {
                preview.textContent = subtitle.correctedText;
            }
        }
    }

    handleManualEdit(index, newText) {
        const subtitle = this.subtitles.find(s => s.index === index);
        if (!subtitle) return;

        const trimmedText = newText.trim();

        if (trimmedText === subtitle.text) {
            return;
        }

        subtitle.text = trimmedText;

        if (subtitle.corrected) {
            subtitle.accepted = true;
            subtitle.manuallyEdited = true;
        } else {
            subtitle.manuallyEdited = true;
        }

        this.renderSubtitles();
        this.showToast('Änderung gespeichert', 'success');
    }

    acceptCorrection(index) {
        const subtitle = this.subtitles.find(s => s.index === index);
        if (subtitle) {
            if (subtitle.corrections && subtitle.corrections.length > 0) {
                subtitle.correctedText = this.applyCorrections(subtitle.originalText, subtitle.corrections);
            }

            if (subtitle.correctedText) {
                subtitle.text = subtitle.correctedText;
                subtitle.accepted = true;
                this.renderSubtitles();
                this.showToast('Korrektur übernommen', 'success');
            }
        }
    }

    rejectCorrection(index) {
        const subtitle = this.subtitles.find(s => s.index === index);
        if (subtitle) {
            subtitle.corrected = false;
            subtitle.accepted = false;
            subtitle.corrections = [];
            this.corrections.delete(index);
            this.renderSubtitles();
            this.showToast('Korrektur ignoriert', 'info');
        }
    }

    acceptAllCorrections() {
        this.subtitles.forEach(sub => {
            if (sub.corrected && !sub.accepted) {
                if (sub.corrections && sub.corrections.length > 0) {
                    sub.correctedText = this.applyCorrections(sub.originalText, sub.corrections);
                }
                if (sub.correctedText) {
                    sub.text = sub.correctedText;
                    sub.accepted = true;
                }
            }
        });
        this.renderSubtitles();
        this.showToast('Alle Korrekturen übernommen', 'success');
    }

    rejectAllCorrections() {
        this.subtitles.forEach(sub => {
            if (sub.corrected && !sub.accepted) {
                sub.corrected = false;
                sub.corrections = [];
            }
        });
        this.corrections.clear();
        this.renderSubtitles();
        this.showToast('Alle Korrekturen ignoriert', 'info');
    }

    updateStats() {
        const total = this.subtitles.length;
        const withErrors = this.subtitles.filter(s => s.corrected && !s.accepted).length;
        const corrected = this.subtitles.filter(s => s.accepted).length;

        this.correctionStats.textContent = `${total} Untertitel | ${withErrors} mit Fehlern | ${corrected} korrigiert`;
    }

    // ==================== EXPORT ====================

    generateSrt(subtitles) {
        return subtitles.map(sub => {
            return `${sub.index}\n${sub.startTimeStr} --> ${sub.endTimeStr}\n${sub.text}\n`;
        }).join('\n');
    }

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportCorrectedSrt() {
        const content = this.generateSrt(this.subtitles);
        const originalName = this.srtFile?.name || 'subtitles.srt';
        const newName = originalName.replace('.srt', '_korrigiert.srt');
        this.downloadFile(content, newName);
        this.showToast('Korrigierte SRT exportiert', 'success');
    }

    exportOriginalSrt() {
        const originalSubtitles = this.subtitles.map(sub => ({
            ...sub,
            text: sub.originalText
        }));
        const content = this.generateSrt(originalSubtitles);
        const originalName = this.srtFile?.name || 'subtitles.srt';
        this.downloadFile(content, originalName);
        this.showToast('Original SRT exportiert', 'success');
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type} visible`;

        setTimeout(() => {
            this.toast.classList.remove('visible');
        }, 3000);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.srtCorrector = new SRTCorrector();
});
