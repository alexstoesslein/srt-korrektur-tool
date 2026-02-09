// SRT Korrektur-Tool - Main Application
// Unterstützt LanguageTool (kostenlos) und Claude AI
// Kompatibel mit Premiere Pro, DaVinci Resolve, Final Cut Pro, etc.

class SRTCorrector {
    constructor() {
        this.subtitles = [];
        this.corrections = new Map();
        this.videoFile = null;
        this.srtFile = null;

        // API Settings
        this.selectedApi = 'languagetool'; // 'languagetool' or 'claude'
        this.claudeApiKey = '';
        this._ck = atob('YXBpa2V5XzAxUmoyTjhTVnZvNkJlUFpqOTlOaG1pVA==');
        this.languageToolUrl = 'https://api.languagetool.org/v2/check';
        this.claudeApiUrl = 'https://api.anthropic.com/v1/messages';

        this.initElements();
        this.initEventListeners();
        this.loadSettings();
    }

    initElements() {
        // Upload elements
        this.videoInput = document.getElementById('video-input');
        this.srtInput = document.getElementById('srt-input');
        this.videoName = document.getElementById('video-name');
        this.srtName = document.getElementById('srt-name');
        this.videoUploadBox = document.getElementById('video-upload');
        this.srtUploadBox = document.getElementById('srt-upload');

        // API elements
        this.toggleButtons = document.querySelectorAll('.toggle-btn');
        this.claudeApiSection = document.getElementById('claude-api-section');
        this.claudeApiKeyInput = document.getElementById('claude-api-key');
        this.toggleApiKeyBtn = document.getElementById('toggle-api-key');
        this.languageToolInfo = document.getElementById('languagetool-info');
        this.claudeInfo = document.getElementById('claude-info');

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

        // API toggle
        this.toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchApi(btn.dataset.api));
        });

        // Claude API Key
        if (this.claudeApiKeyInput) {
            this.claudeApiKeyInput.addEventListener('input', () => this.saveClaudeApiKey());
        }
        if (this.toggleApiKeyBtn) {
            this.toggleApiKeyBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
        }

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

    // ==================== SETTINGS ====================

    loadSettings() {
        const savedApi = localStorage.getItem('srt_selected_api');
        if (savedApi) {
            this.switchApi(savedApi);
        }

        const savedClaudeKey = localStorage.getItem('claude_api_key');
        if (savedClaudeKey && this.claudeApiKeyInput) {
            this.claudeApiKeyInput.value = savedClaudeKey;
            this.claudeApiKey = savedClaudeKey;
        }
    }

    switchApi(api) {
        this.selectedApi = api;
        localStorage.setItem('srt_selected_api', api);

        // Update toggle buttons
        this.toggleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.api === api);
        });

        // Show/hide API key section
        if (this.claudeApiSection) {
            this.claudeApiSection.style.display = api === 'claude' ? 'block' : 'none';
        }

        // Show/hide info sections
        if (this.languageToolInfo) {
            this.languageToolInfo.style.display = api === 'languagetool' ? 'block' : 'none';
        }
        if (this.claudeInfo) {
            this.claudeInfo.style.display = api === 'claude' ? 'block' : 'none';
        }
    }

    saveClaudeApiKey() {
        this.claudeApiKey = this.claudeApiKeyInput.value;
        localStorage.setItem('claude_api_key', this.claudeApiKey);
    }

    toggleApiKeyVisibility() {
        if (this.claudeApiKeyInput.type === 'password') {
            this.claudeApiKeyInput.type = 'text';
            this.toggleApiKeyBtn.textContent = '🙈';
        } else {
            this.claudeApiKeyInput.type = 'password';
            this.toggleApiKeyBtn.textContent = '👁️';
        }
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

        this.filterCorrections.checked = false;
        this.renderSubtitles();
        this.editorSection.style.display = 'block';
    }

    // ==================== SRT PARSING ====================

    parseSrt(content) {
        const subtitles = [];

        let normalizedContent = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        const blocks = normalizedContent.trim().split(/\n\n+/);

        for (const block of blocks) {
            const lines = block.split('\n').filter(line => line.trim() !== '');

            if (lines.length >= 2) {
                const index = parseInt(lines[0], 10);
                const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.:]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.:]\d{3})/);

                if (timeMatch && !isNaN(index)) {
                    const startTimeStr = timeMatch[1];
                    const endTimeStr = timeMatch[2];
                    const startTime = this.parseTime(startTimeStr);
                    const endTime = this.parseTime(endTimeStr);

                    let text = lines.slice(2).join('\n');
                    text = this.cleanSubtitleText(text);

                    subtitles.push({
                        index,
                        startTime,
                        endTime,
                        startTimeStr: this.normalizeTimeStr(startTimeStr),
                        endTimeStr: this.normalizeTimeStr(endTimeStr),
                        text,
                        cleanText: text,
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

    cleanSubtitleText(text) {
        let cleaned = text
            .replace(/<\/?b>/gi, '')
            .replace(/<\/?i>/gi, '')
            .replace(/<\/?u>/gi, '')
            .replace(/<font[^>]*>/gi, '')
            .replace(/<\/font>/gi, '')
            .replace(/<span[^>]*>/gi, '')
            .replace(/<\/span>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/  +/g, ' ')
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            .trim();

        return cleaned;
    }

    parseTime(timeStr) {
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

        // Use built-in key if user hasn't provided one
        if (this.selectedApi === 'claude' && !this.claudeApiKey) {
            this.claudeApiKey = this._ck;
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

        if (this.selectedApi === 'claude') {
            // Claude: Process in batches for efficiency
            const batchSize = 10;
            for (let i = 0; i < this.subtitles.length; i += batchSize) {
                const batch = this.subtitles.slice(i, i + batchSize);
                try {
                    await this.checkWithClaude(batch);
                } catch (error) {
                    console.error('Claude error:', error);
                    this.showToast(`Fehler: ${error.message}`, 'error');
                    hasErrors = true;
                }
                processed += batch.length;
                const progress = Math.round((processed / this.subtitles.length) * 100);
                this.progressFill.style.width = `${progress}%`;
                this.progressText.textContent = `${progress}%`;
            }
        } else {
            // LanguageTool: Process one by one
            for (const subtitle of this.subtitles) {
                try {
                    await this.checkWithLanguageTool(subtitle);
                    await this.sleep(100);
                } catch (error) {
                    console.error('LanguageTool error:', error);
                    if (error.message.includes('429')) {
                        this.showToast('Rate-Limit erreicht. Warte kurz...', 'info');
                        await this.sleep(2000);
                        try {
                            await this.checkWithLanguageTool(subtitle);
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
        }

        this.checkBtn.disabled = false;
        this.progressContainer.style.display = 'none';

        const correctionCount = this.subtitles.filter(s => s.corrected).length;
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

    // ==================== LANGUAGETOOL API ====================

    async checkWithLanguageTool(subtitle) {
        const text = subtitle.text;
        if (!text.trim()) return;

        const params = new URLSearchParams();
        params.append('text', text);
        params.append('language', 'de-DE');
        params.append('enabledOnly', 'false');
        params.append('disabledCategories', '');
        params.append('enabledCategories', 'PUNCTUATION,TYPOGRAPHY,CASING,GRAMMAR,TYPOS,STYLE');

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
                        message: match.message,
                        rule: match.rule?.description || 'Regel'
                    });
                }
            }

            if (matches.length > 0) {
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
            }
        }
    }

    // ==================== CLAUDE API ====================

    async checkWithClaude(batch) {
        const textsToCheck = batch.map(sub => ({
            id: sub.index,
            text: sub.text
        }));

        const prompt = `Du bist ein professioneller deutscher Lektor. Prüfe die folgenden Untertiteltexte auf:
1. Rechtschreibfehler
2. Grammatikfehler
3. Kommasetzung (wichtig!)
4. Punktsetzung
5. Groß-/Kleinschreibung

Für jeden Text, der Fehler enthält, gib die Korrekturen an.
Behalte den ursprünglichen Stil und Zeilenumbrüche bei.

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "corrections": [
    {
      "id": 1,
      "hasErrors": true,
      "original": "Der originale Text",
      "corrected": "Der korrigierte Text",
      "changes": [
        {"from": "fehler", "to": "richtig", "reason": "Rechtschreibung"}
      ]
    }
  ]
}

Wenn ein Text keine Fehler hat, setze "hasErrors" auf false.

Texte:
${JSON.stringify(textsToCheck, null, 2)}`;

        const response = await fetch(this.claudeApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.claudeApiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `API-Fehler: ${response.status}`);
        }

        const data = await response.json();
        const content = data.content[0].text;

        // Parse JSON response
        let result;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                result = JSON.parse(content);
            }
        } catch (e) {
            console.error('JSON parse error:', e, content);
            return;
        }

        // Apply corrections
        if (result.corrections) {
            for (const correction of result.corrections) {
                if (correction.hasErrors) {
                    const subtitle = this.subtitles.find(s => s.index === correction.id);
                    if (subtitle) {
                        subtitle.correctedText = correction.corrected;
                        subtitle.corrected = true;

                        // Create corrections array from changes
                        if (correction.changes && correction.changes.length > 0) {
                            subtitle.corrections = correction.changes.map(c => ({
                                original: c.from,
                                replacement: c.to,
                                allReplacements: [c.to],
                                message: c.reason || 'Korrektur',
                                offset: 0,
                                length: c.from.length
                            }));
                        } else {
                            subtitle.corrections = [{
                                original: subtitle.originalText,
                                replacement: correction.corrected,
                                allReplacements: [correction.corrected],
                                message: 'Korrektur',
                                offset: 0,
                                length: subtitle.originalText.length
                            }];
                        }
                    }
                }
            }
        }
    }

    applyCorrections(text, corrections) {
        const sorted = [...corrections].sort((a, b) => b.offset - a.offset);
        let result = text;

        for (const corr of sorted) {
            if (corr.offset !== undefined && corr.length !== undefined) {
                result = result.substring(0, corr.offset) +
                         corr.replacement +
                         result.substring(corr.offset + corr.length);
            }
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
            this.subtitlesList.innerHTML = '<div class="no-corrections">Keine Korrekturen mehr offen.</div>';
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
        if (hasCorrection) statusClass = 'has-correction';
        else if (isAccepted) statusClass = 'accepted';

        return `
            <div class="subtitle-item ${statusClass}" data-index="${sub.index}">
                <div class="subtitle-header">
                    <span class="subtitle-index">#${sub.index}</span>
                    <span class="subtitle-time">
                        <button class="btn-icon jump-to-time" data-time="${sub.startTime}" title="Zur Position springen">▶️</button>
                        ${sub.startTimeStr} → ${sub.endTimeStr}
                    </span>
                    ${hasCorrection ? '<span class="correction-badge">⚠️ Korrektur</span>' : ''}
                    ${isAccepted ? '<span class="accepted-badge">✓ Korrigiert</span>' : ''}
                </div>
                <div class="subtitle-content">
                    <div class="subtitle-text ${hasCorrection ? 'needs-correction' : ''}"
                         contenteditable="true"
                         data-index="${sub.index}">${this.escapeHtml(sub.text)}</div>
                    <div class="edit-hint">💡 Klicken zum Bearbeiten • Enter = Speichern</div>
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
                    <span>📝 ${sub.corrections.length} Korrektur${sub.corrections.length > 1 ? 'en' : ''}</span>
                    <div class="correction-panel-actions">
                        <button class="btn btn-success btn-small accept-btn" data-index="${sub.index}">✓ Übernehmen</button>
                        <button class="btn btn-secondary btn-small reject-btn" data-index="${sub.index}">✗ Ignorieren</button>
                    </div>
                </div>
                <div class="correction-items">${correctionsHtml}</div>
                <div class="correction-preview">
                    <div class="preview-label">Vorschau:</div>
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
        });

        this.subtitlesList.querySelectorAll('.jump-to-time').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const time = parseFloat(e.target.closest('.jump-to-time').dataset.time);
                if (this.videoPlayer.src) {
                    this.videoPlayer.currentTime = time;
                    this.videoPlayer.play();
                }
            });
        });

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
        if (trimmedText === subtitle.text) return;

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
        if (subtitle && subtitle.correctedText) {
            subtitle.text = subtitle.correctedText;
            subtitle.accepted = true;
            this.renderSubtitles();
            this.showToast('Korrektur übernommen', 'success');
        }
    }

    rejectCorrection(index) {
        const subtitle = this.subtitles.find(s => s.index === index);
        if (subtitle) {
            subtitle.corrected = false;
            subtitle.accepted = false;
            subtitle.corrections = [];
            this.renderSubtitles();
            this.showToast('Korrektur ignoriert', 'info');
        }
    }

    acceptAllCorrections() {
        this.subtitles.forEach(sub => {
            if (sub.corrected && !sub.accepted && sub.correctedText) {
                sub.text = sub.correctedText;
                sub.accepted = true;
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
