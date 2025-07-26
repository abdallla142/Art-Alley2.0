document.addEventListener('DOMContentLoaded', () => {
    const COLS = 60;
    const ROWS = 30;
    const MAX_HISTORY_SIZE = 50;
    const ZOOM_STEP = 0.1;
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 4.0;
    const PALETTE_CHARS = ['#', '@', '%', '&', '*', '+', '=', '-', '.', ' ', '_', '|', '/', '\\', '█', '▓', '▒', '░', '▄', '▀', 'O', 'X', 'A', 'V'];
    const DEFAULT_COLOR = '#e0e0e0';

    let appState = {
        activeTool: 'pencil',
        isDrawing: false,
        isRainbowMode: false,
        rainbowHue: 0,
        showGrid: true,
        zoomLevel: 1.0,
        pan: { x: 0, y: 0, active: false, startX: 0, startY: 0 },
        frames: [],
        currentFrameIndex: 0,
        isPlaying: false,
        animationInterval: null,
        inChallengeMode: false,
        challengeSolution: null,
        totalChallengeChars: 0,
        hintTimeout: null,
        canvasStateHistory: [],
        historyPointer: -1,
        audioContextInitiated: false,
        synth: null,
        selection: { x1: 0, y1: 0, x2: 0, y2: 0, active: false },
        clipboard: null,
        textToolState: { active: false, x: 0, y: 0, tempFrame: null },
        backgroundMode: 'matrix',
        isPanning: false,
        baseCellSize: 18,
    };

    const dom = {
        introScreen: document.getElementById('intro-screen'),
        introLogo: document.getElementById('intro-logo'),
        introSubtitle: document.getElementById('intro-subtitle'),
        mainContainer: document.getElementById('main-container'),
        canvasContainer: document.getElementById('canvas-container'),
        canvasWrapper: document.getElementById('canvas-wrapper'),
        mainCanvas: document.getElementById('main-canvas'),
        challengeTraceCanvas: document.getElementById('challenge-trace-canvas'),
        selectionBox: document.getElementById('selection-box'),
        textInputOverlay: document.getElementById('text-input-overlay'),
        textToolInput: document.getElementById('text-tool-input'),
        textToolCaret: document.getElementById('text-tool-caret'),
        charInput: document.getElementById('char-input'),
        colorPicker: document.getElementById('color-picker'),
        pencilTool: document.getElementById('pencil-tool'),
        eraserTool: document.getElementById('eraser-tool'),
        fillTool: document.getElementById('fill-tool'),
        textTool: document.getElementById('text-tool'),
        selectTool: document.getElementById('select-tool'),
        eyedropperTool: document.getElementById('eyedropper-tool'),
        exportBtn: document.getElementById('export-btn'),
        clearBtn: document.getElementById('clear-btn'),
        charPalette: document.getElementById('char-palette'),
        rainbowModeBtn: document.getElementById('rainbow-mode-btn'),
        framesContainer: document.getElementById('frames-container'),
        addFrameBtn: document.getElementById('add-frame-btn'),
        copyFrameBtn: document.getElementById('copy-frame-btn'),
        deleteFrameBtn: document.getElementById('delete-frame-btn'),
        playBtn: document.getElementById('play-btn'),
        fpsInput: document.getElementById('fps-input'),
        fpsDisplay: document.getElementById('fps-display'),
        frameCounter: document.getElementById('frame-counter'),
        undoBtn: document.getElementById('undo-btn'),
        redoBtn: document.getElementById('redo-btn'),
        gridToggleBtn: document.getElementById('grid-toggle-btn'),
        zoomInBtn: document.getElementById('zoom-in-btn'),
        zoomOutBtn: document.getElementById('zoom-out-btn'),
        saveBtn: document.getElementById('save-btn'),
        loadBtn: document.getElementById('load-btn'),
        feedbackMessage: document.getElementById('feedback-message'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalConfirmBtn: document.getElementById('modal-confirm-btn'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        challengeModeBtn: document.getElementById('challenge-mode-btn'),
        challengeBar: document.getElementById('challenge-bar'),
        newChallengeBtn: document.getElementById('new-challenge-btn'),
        hintBtn: document.getElementById('hint-btn'),
        quitChallengeBtn: document.getElementById('quit-challenge-btn'),
        showSolutionBtn: document.getElementById('show-solution-btn'),
        challengeScoreDisplay: document.getElementById('challenge-score'),
        challengeCharDisplay: document.getElementById('challenge-char-display'),
        selectionActions: document.getElementById('selection-actions'),
        flipHBtn: document.getElementById('flip-h-btn'),
        flipVBtn: document.getElementById('flip-v-btn'),
        copySelectionBtn: document.getElementById('copy-selection-btn'),
        pasteSelectionBtn: document.getElementById('paste-selection-btn'),
        deleteSelectionBtn: document.getElementById('delete-selection-btn'),
        presetButtons: document.getElementById('preset-buttons'),
        presetPalette: document.getElementById('preset-palette'),
        mainControls: document.getElementById('main-controls'),
        toggleControlsBtn: document.getElementById('toggle-controls-btn'),
        toggleBackgroundBtn: document.getElementById('toggle-background-btn'),
        toggleThemeBtn: document.getElementById('toggle-theme-btn'),
    };

    const challenges = {
        "Easy": { "Smile": ["  _  _  ", " | o o | ", " |  _  | ", "  \\___/  "], "Heart": ["  .@.  ", ".`   `.", " `._.' "], "Boat": ["    _\\_    ", "   |___|   ", "\\_     _/", "  \\_____/  "] },
        "Medium": { "Ghost": ["  .--.  ", " / o o\\ ", "|  ^  |", " '----' "], "Cat": [" /\\_/\\ ", "( o.o )", " > ^ < "], "House": ["   /\\   ", "  /  \\  ", " |----| ", " | [] | ", " '----' "] },
        "Hard": { "Rocket": ["   /\\   ", "  /  \\  ", " /____\\ ", "|      |", "| Art  |", "| Alley|", " '====' ", "  /\\/\\  "], "Dragon": ["    _\\/_    ", "   /o'o\\   ", "  (|_-_|)  ", "  /\\   /\\  ", " / /| |\\ \\ ", " \\/ | | \\/ "], "Knight": ["    _O_    ", "   /|\\    ", "   / \\    ", "  /___\\  ", " (_____)  "] },
        "Master": { "Phoenix": ["        _.-```'-,_        ", "      ,'`           `'-,    ", "     ,'                   `-, ", "    /   ,'.`'--,''--'`.' ,  \\ ", "   /   / /'\\`'--'`--'`/`\\ \\  \\", "  |   | |'-.`'-----'´.-'| |   |", "  |   | |   `'-----'´   | |   |", "   \\   \\ \\_           / /   / ", "    \\   `#`-,_     _,-'#´   /  ", "     `-,       `'\"'`       ,-'   ", "         `'-,_     _,-'´        ", "             `'\"\"\"'´             "] }
    };
    const colorPresets = {
        "Vaporwave": ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff", "#fffb96"], "Forest": ["#2f3e46", "#354f52", "#52796f", "#84a98c", "#cad2c5"], "Fire": ["#000000", "#780000", "#c1121f", "#fdf0d5", "#ffba08"], "Ocean": ["#001219", "#005f73", "#0a9396", "#94d2bd", "#e9d8a6"], "Retro": ["#2d2a2e", "#f4b393", "#f29479", "#f2746b", "#f05a5a"]
    };

    function initializeApp() {
        try {
            animateIntro();
            setTimeout(() => {
                dom.introScreen.classList.add('fade-out');
                dom.mainContainer.classList.add('visible');
                if (!localStorage.getItem('artAlleyVisited')) {
                    showInstructionsModal();
                    localStorage.setItem('artAlleyVisited', 'true');
                }
            },0);

            initBackground();
            appState.baseCellSize = calculateBaseCellSize();
            
            [dom.mainCanvas, dom.challengeTraceCanvas].forEach(canvas => {
                canvas.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
                canvas.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
                for (let i = 0; i < ROWS * COLS; i++) {
                    const cell = document.createElement('div');
                    cell.classList.add('grid-cell');
                    canvas.appendChild(cell);
                }
            });

            appState.frames.push(createEmptyFrame());
            initializePalette();
            initializePresets();
            applyPanAndZoom();
            updateFramesContainer();
            updateFrameControlsState();
            saveCanvasState();
            setupEventListeners();
        } catch (error) {
            console.error("Fatal error during initialization:", error);
            document.body.innerHTML = "<h1>An error occurred. Please refresh the page.</h1>";
        }
    }

    function setupEventListeners() {
        dom.canvasContainer.addEventListener('mousedown', handleCanvasMouseDown);
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        dom.canvasContainer.addEventListener('touchstart', handleCanvasMouseDown, { passive: false });
        window.addEventListener('touchmove', handleWindowMouseMove, { passive: false });
        window.addEventListener('touchend', handleWindowMouseUp);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const tools = { 'pencil': dom.pencilTool, 'eraser': dom.eraserTool, 'fill': dom.fillTool, 'text': dom.textTool, 'select': dom.selectTool, 'eyedropper': dom.eyedropperTool };
        for (const toolName in tools) {
            tools[toolName].addEventListener('click', () => setActiveTool(toolName));
        }

        dom.charPalette.addEventListener('click', (e) => { if (e.target.classList.contains('palette-char')) selectPaletteChar(e.target); });
        dom.charInput.addEventListener('input', (e) => updateActivePaletteChar(e.target.value));
        dom.rainbowModeBtn.addEventListener('click', toggleRainbowMode);

        dom.addFrameBtn.addEventListener('click', addFrame);
        dom.copyFrameBtn.addEventListener('click', copyFrame);
        dom.deleteFrameBtn.addEventListener('click', deleteFrame);
        dom.playBtn.addEventListener('click', () => { appState.isPlaying ? stopPlayback() : playAnimation(); });
        dom.fpsInput.addEventListener('input', () => { dom.fpsDisplay.textContent = dom.fpsInput.value; if (appState.isPlaying) { stopPlayback(); playAnimation(); } });

        dom.clearBtn.addEventListener('click', () => showModal('Clear Canvas', 'Are you sure you want to clear the current frame?', 'Yes, Clear', true, clearCanvas));
        dom.undoBtn.addEventListener('click', () => restoreCanvasState(appState.historyPointer - 1));
        dom.redoBtn.addEventListener('click', () => restoreCanvasState(appState.historyPointer + 1));
        dom.gridToggleBtn.addEventListener('click', toggleGrid);
        dom.toggleBackgroundBtn.addEventListener('click', toggleBackground);
        dom.toggleThemeBtn.addEventListener('click', () => document.body.classList.toggle('light-mode'));
        dom.zoomInBtn.addEventListener('click', () => zoom(1));
        dom.zoomOutBtn.addEventListener('click', () => zoom(-1));
        dom.saveBtn.addEventListener('click', saveLocal);
        dom.loadBtn.addEventListener('click', loadLocal);
        dom.exportBtn.addEventListener('click', exportArt);

        dom.challengeModeBtn.addEventListener('click', showChallengeSelection);
        dom.newChallengeBtn.addEventListener('click', selectNewChallenge);
        dom.quitChallengeBtn.addEventListener('click', () => endChallenge(true));
        dom.hintBtn.addEventListener('click', showHint);
        dom.showSolutionBtn.addEventListener('click', showSolution);

        dom.flipHBtn.addEventListener('click', flipSelectionHorizontal);
        dom.flipVBtn.addEventListener('click', flipSelectionVertical);
        dom.copySelectionBtn.addEventListener('click', copySelectionToClipboard);
        dom.pasteSelectionBtn.addEventListener('click', pasteFromClipboard);
        dom.deleteSelectionBtn.addEventListener('click', deleteSelection);
        
        dom.textToolInput.addEventListener('input', previewText);
        dom.textToolInput.addEventListener('blur', applyText);
        dom.textToolInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyText(); });
        
        dom.toggleControlsBtn.addEventListener('click', () => dom.mainControls.classList.toggle('collapsed'));
        window.addEventListener('resize', debounce(handleWindowResize, 250));
    }

    function renderCanvas(sourceFrame) {
        const frame = sourceFrame || appState.frames[appState.currentFrameIndex];
        if (!frame) return;

        const cells = dom.mainCanvas.children;
        for (let i = 0; i < cells.length; i++) {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const cellData = frame[r][c];
            const cellElement = cells[i];

            if (cellElement) {
                cellElement.textContent = cellData.char;
                cellElement.style.color = cellData.color;

                if (appState.inChallengeMode && appState.challengeSolution) {
                    const isCorrect = appState.challengeSolution[r]?.[c] && appState.challengeSolution[r][c].char !== ' ' && cellData.char === appState.challengeSolution[r][c].char;
                    cellElement.classList.toggle('correct-char', isCorrect);
                } else {
                    cellElement.classList.remove('correct-char');
                }
                cellElement.classList.remove('hint-char');
            }
        }
        updateFrameCounter();
    }
    
    function draw(r, c, isStartOfStroke) {
        const currentFrame = appState.frames[appState.currentFrameIndex];
        if (!currentFrame?.[r]?.[c]) return;

        const char = dom.charInput.value.length === 0 ? ' ' : dom.charInput.value;
        const color = appState.isRainbowMode ? `hsl(${(appState.rainbowHue = (appState.rainbowHue + 2) % 360)}, 100%, 50%)` : dom.colorPicker.value;

        switch (appState.activeTool) {
            case 'pencil':
                if (currentFrame[r][c].char !== char || currentFrame[r][c].color !== color) {
                    currentFrame[r][c] = { char, color };
                }
                break;
            case 'eraser':
                if (currentFrame[r][c].char !== ' ') {
                    currentFrame[r][c] = { char: ' ', color: DEFAULT_COLOR };
                }
                break;
            case 'fill':
                if (isStartOfStroke) floodFill(r, c, char, color);
                break;
        }
        renderCanvas();
        updateFramesContainer();
    }

    function floodFill(startR, startC, newChar, newColor) {
        const frame = appState.frames[appState.currentFrameIndex];
        if (!frame[startR]?.[startC]) return;

        const targetChar = frame[startR][startC].char;
        const targetColor = frame[startR][startC].color;
        if (targetChar === newChar && targetColor === newColor) return;

        const stack = [[startR, startC]];
        const visited = new Set([`${startR},${startC}`]);

        while (stack.length > 0) {
            const [r, c] = stack.pop();
            frame[r][c] = { char: newChar, color: newColor };
            
            const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
            for (const [nr, nc] of neighbors) {
                const key = `${nr},${nc}`;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited.has(key)) {
                    const neighborCell = frame[nr][nc];
                    if (neighborCell.char === targetChar && neighborCell.color === targetColor) {
                        visited.add(key);
                        stack.push([nr, nc]);
                    }
                }
            }
        }
    }

    function handleCanvasMouseDown(e) {
        initAudio();
        e.preventDefault();
        
        if (appState.isPanning) {
            appState.pan.active = true;
            const coords = getEventCoords(e);
            appState.pan.startX = coords.clientX - appState.pan.x;
            appState.pan.startY = coords.clientY - appState.pan.y;
            dom.canvasContainer.classList.add('panning');
            return;
        }
        
        appState.isDrawing = true;
        handleDrawEvent(e);
    }

    function handleWindowMouseMove(e) {
        if (appState.pan.active) {
            e.preventDefault();
            const coords = getEventCoords(e);
            appState.pan.x = coords.clientX - appState.pan.startX;
            appState.pan.y = coords.clientY - appState.pan.startY;
            applyPanAndZoom();
        } else if (appState.isDrawing) {
            e.preventDefault();
            handleDrawEvent(e);
        }
    }

    function handleWindowMouseUp(e) {
        if (appState.isDrawing) {
            handleDrawEvent({ type: 'mouseup', clientX: getEventCoords(e).clientX, clientY: getEventCoords(e).clientY });
            appState.isDrawing = false;
        }
        if (appState.pan.active) {
            appState.pan.active = false;
            dom.canvasContainer.classList.remove('panning');
        }
    }
    
    function handleKeyDown(e) {
        if (e.code === 'Space' && !appState.textToolState.active && !e.repeat) {
            e.preventDefault();
            appState.isPanning = true;
            dom.canvasContainer.style.cursor = 'grab';
        }
    }

    function handleKeyUp(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            appState.isPanning = false;
            dom.canvasContainer.style.cursor = '';
            if(appState.pan.active) {
                appState.pan.active = false;
                dom.canvasContainer.classList.remove('panning');
            }
        }
    }

    function handleWindowResize() {
        resizeBackgroundCanvas();
        appState.baseCellSize = calculateBaseCellSize();
        applyPanAndZoom();
    }

    function handleDrawEvent(e) {
        const { r, c } = getCellCoordsFromEvent(e);
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

        const isStartOfStroke = e.type === 'mousedown' || e.type === 'touchstart';

        if (appState.activeTool === 'select') { handleSelectTool(e); return; }
        if (appState.activeTool === 'text') { if (isStartOfStroke) activateTextTool(r, c); return; }
        
        resetSelection();

        if (appState.activeTool === 'eyedropper') {
            if (isStartOfStroke) eyedrop(r, c);
            return;
        }

        if (appState.inChallengeMode) {
            handleChallengeDraw(r, c, isStartOfStroke);
        } else {
            draw(r, c, isStartOfStroke);
        }

        if (isStartOfStroke) {
            saveCanvasState();
        }
    }

    function setActiveTool(toolName) {
        if (appState.textToolState.active) applyText();
        resetSelection();
        appState.activeTool = toolName;
        
        document.querySelectorAll('.tool-button').forEach(t => t.classList.remove('active'));
        document.getElementById(`${toolName}-tool`).classList.add('active');
        
        updateCursor();
    }

    function activateTextTool(r, c) {
        appState.textToolState.active = true;
        appState.textToolState.x = c;
        appState.textToolState.y = r;
        appState.textToolState.tempFrame = appState.frames[appState.currentFrameIndex].map(row => row.map(cell => ({...cell})));
        
        dom.textInputOverlay.classList.remove('hidden');
        dom.textInputOverlay.style.transform = `translate(${c * appState.baseCellSize}px, ${r * appState.baseCellSize}px)`;
        
        const inputSize = appState.baseCellSize * 0.9;
        dom.textToolInput.style.fontSize = `${inputSize}px`;
        dom.textToolInput.style.lineHeight = `${appState.baseCellSize}px`;
        dom.textToolInput.style.height = `${appState.baseCellSize}px`;
        
        dom.textToolCaret.style.height = `${inputSize}px`;
        dom.textToolCaret.style.left = '0px';
        
        dom.textToolInput.value = '';
        dom.textToolInput.focus();
    }

    function previewText() {
        if (!appState.textToolState.active) return;
        const text = dom.textToolInput.value;
        const tempFrame = appState.textToolState.tempFrame.map(row => row.map(cell => ({...cell})));
        
        for (let i = 0; i < text.length; i++) {
            const c = appState.textToolState.x + i;
            const r = appState.textToolState.y;
            if (c < COLS) {
                if (appState.isRainbowMode) appState.rainbowHue = (appState.rainbowHue + 5) % 360;
                const color = appState.isRainbowMode ? `hsl(${appState.rainbowHue}, 100%, 50%)` : dom.colorPicker.value;
                tempFrame[r][c] = { char: text[i], color };
            }
        }
        renderCanvas(tempFrame);
    }

    function applyText() {
        if (!appState.textToolState.active) return;
        
        previewText();
        appState.frames[appState.currentFrameIndex] = appState.textToolState.tempFrame;
        
        dom.textInputOverlay.classList.add('hidden');
        appState.textToolState.active = false;
        appState.textToolState.tempFrame = null;
        
        renderCanvas();
        saveCanvasState();
        setActiveTool('pencil');
    }

    function eyedrop(r, c) {
        const cell = appState.frames[appState.currentFrameIndex][r][c];
        const pickedColor = cell.color;
        
        dom.colorPicker.value = pickedColor.startsWith('hsl') ? hslToHex(...pickedColor.match(/\d+/g).map(Number)) : pickedColor;
        dom.charInput.value = cell.char;
        updateActivePaletteChar(cell.char);
        showFeedbackMessage(`Picked: "${cell.char}"`, 1500);
        setActiveTool('pencil');
    }

    function zoom(direction) {
        const oldZoom = appState.zoomLevel;
        appState.zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, appState.zoomLevel + direction * ZOOM_STEP));
        if (oldZoom !== appState.zoomLevel) {
            applyPanAndZoom();
            showFeedbackMessage(`Zoom: ${Math.round(appState.zoomLevel * 100)}%`);
        }
    }
    
    function applyPanAndZoom() {
        dom.canvasWrapper.style.width = `${COLS * appState.baseCellSize}px`;
        dom.canvasWrapper.style.height = `${ROWS * appState.baseCellSize}px`;
        dom.canvasWrapper.style.transform = `translate(${appState.pan.x}px, ${appState.pan.y}px) scale(${appState.zoomLevel})`;
        renderCanvas();
        if (appState.inChallengeMode) renderChallengeTrace();
        updateSelectionBoxVisuals();
    }

    function handleSelectTool(e) {
        const { r, c } = getCellCoordsFromEvent(e);
        const eventType = e.type;

        if (eventType === 'mousedown' || eventType === 'touchstart') {
            appState.selection.active = true;
            appState.selection.x1 = c;
            appState.selection.y1 = r;
            appState.selection.x2 = c;
            appState.selection.y2 = r;
        }
        if (appState.isDrawing && (eventType === 'mousemove' || eventType === 'touchmove')) {
            appState.selection.x2 = c;
            appState.selection.y2 = r;
        }
        if (e.type === 'mouseup' || e.type === 'touchend') {
            if (appState.selection.x1 === c && appState.selection.y1 === r && e.type !== 'touchstart') {
                resetSelection();
            }
        }
        updateSelectionBoxVisuals();
    }
    
    function updateSelectionBoxVisuals() {
        if (!appState.selection.active) {
            dom.selectionBox.classList.add('hidden');
            dom.selectionActions.classList.add('hidden');
            return;
        }
        dom.selectionBox.classList.remove('hidden');
        dom.selectionActions.classList.remove('hidden');

        const { x1, y1, width, height } = getSelectionBounds();
        dom.selectionBox.style.left = `${x1 * appState.baseCellSize}px`;
        dom.selectionBox.style.top = `${y1 * appState.baseCellSize}px`;
        dom.selectionBox.style.width = `${width * appState.baseCellSize}px`;
        dom.selectionBox.style.height = `${height * appState.baseCellSize}px`;
    }
    
    function getSelectionBounds() {
        const x1 = Math.min(appState.selection.x1, appState.selection.x2);
        const y1 = Math.min(appState.selection.y1, appState.selection.y2);
        const x2 = Math.max(appState.selection.x1, appState.selection.x2);
        const y2 = Math.max(appState.selection.y1, appState.selection.y2);
        return { x1, y1, x2, y2, width: x2 - x1 + 1, height: y2 - y1 + 1 };
    }

    function resetSelection() {
        appState.selection.active = false;
        updateSelectionBoxVisuals();
    }

    function performSelectionAction(action) {
        if (!appState.selection.active) return;
        const { x1, y1, x2, y2 } = getSelectionBounds();
        const frame = appState.frames[appState.currentFrameIndex];
        
        let region = [];
        for (let r = y1; r <= y2; r++) {
            let row = [];
            for (let c = x1; c <= x2; c++) {
                row.push({...frame[r][c]});
            }
            region.push(row);
        }

        action(region);

        for (let r = y1; r <= y2; r++) {
            for (let c = x1; c <= x2; c++) {
                frame[r][c] = region[r - y1][c - x1];
            }
        }
        renderCanvas();
        saveCanvasState();
    }

    function flipSelectionHorizontal() { performSelectionAction(region => region.forEach(row => row.reverse())); }
    function flipSelectionVertical() { performSelectionAction(region => region.reverse()); }
    function deleteSelection() { performSelectionAction(region => {
        for (let r = 0; r < region.length; r++) {
            for (let c = 0; c < region[0].length; c++) {
                region[r][c] = { char: ' ', color: DEFAULT_COLOR };
            }
        }
    }); resetSelection(); }
    
    function copySelectionToClipboard() {
        if (!appState.selection.active) return;
        const { x1, y1, x2, y2 } = getSelectionBounds();
        const frame = appState.frames[appState.currentFrameIndex];
        appState.clipboard = [];
        for (let r = y1; r <= y2; r++) {
            let row = [];
            for (let c = x1; c <= x2; c++) {
                row.push({...frame[r][c]});
            }
            appState.clipboard.push(row);
        }
        dom.pasteSelectionBtn.disabled = false;
        showFeedbackMessage('Selection copied!');
    }

    function pasteFromClipboard() {
        if (!appState.clipboard) return;
        setActiveTool('select');
        const pasteR = appState.selection.active ? getSelectionBounds().y1 : Math.floor(ROWS / 2 - appState.clipboard.length / 2);
        const pasteC = appState.selection.active ? getSelectionBounds().x1 : Math.floor(COLS / 2 - appState.clipboard[0].length / 2);
        const frame = appState.frames[appState.currentFrameIndex];

        appState.clipboard.forEach((row, r_offset) => {
            row.forEach((cell, c_offset) => {
                const r = pasteR + r_offset;
                const c = pasteC + c_offset;
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                    frame[r][c] = cell;
                }
            });
        });
        renderCanvas();
        saveCanvasState();
    }

    function addFrame() { stopPlayback(); appState.frames.splice(appState.currentFrameIndex + 1, 0, createEmptyFrame()); appState.currentFrameIndex++; renderCanvas(); updateFramesContainer(); saveCanvasState(); showFeedbackMessage('Frame added!'); }
    function copyFrame() { stopPlayback(); const currentGrid = appState.frames[appState.currentFrameIndex]; const newGrid = currentGrid.map(row => row.map(cell => ({ ...cell }))); appState.frames.splice(appState.currentFrameIndex + 1, 0, newGrid); appState.currentFrameIndex++; renderCanvas(); updateFramesContainer(); saveCanvasState(); showFeedbackMessage('Frame copied!'); }
    function deleteFrame() { if (appState.frames.length > 1) { showModal('Delete Frame', 'Are you sure you want to delete this frame?', 'Delete', true, () => { stopPlayback(); appState.frames.splice(appState.currentFrameIndex, 1); if (appState.currentFrameIndex >= appState.frames.length) { appState.currentFrameIndex = appState.frames.length - 1; } renderCanvas(); updateFramesContainer(); saveCanvasState(); showFeedbackMessage('Frame deleted.'); }); } else { showModal('Cannot Delete', 'You cannot delete the last frame. Use "Clear" to erase its content.', 'OK'); } }
    
    function playAnimation() {
        if (appState.isPlaying) return;
        appState.isPlaying = true;
        dom.playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M14 19H18V5H14M6 19H10V5H6V19Z" /></svg> Pause';
        dom.playBtn.classList.add('active');
        const intervalTime = 1000 / parseInt(dom.fpsInput.value);
        appState.animationInterval = setInterval(() => {
            appState.currentFrameIndex = (appState.currentFrameIndex + 1) % appState.frames.length;
            renderCanvas();
            updateFramesContainer();
        }, intervalTime);
    }

    function stopPlayback() {
        if (!appState.isPlaying) return;
        appState.isPlaying = false;
        dom.playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg> Play';
        dom.playBtn.classList.remove('active');
        clearInterval(appState.animationInterval);
    }

    function saveCanvasState() {
        if (appState.historyPointer < appState.canvasStateHistory.length - 1) {
            appState.canvasStateHistory = appState.canvasStateHistory.slice(0, appState.historyPointer + 1);
        }
        const currentState = appState.frames.map(frame => frame.map(row => row.map(cell => ({ ...cell }))));
        appState.canvasStateHistory.push(currentState);
        if (appState.canvasStateHistory.length > MAX_HISTORY_SIZE) {
            appState.canvasStateHistory.shift();
        }
        appState.historyPointer = appState.canvasStateHistory.length - 1;
        updateUndoRedoButtons();
    }

    function restoreCanvasState(newPointer) {
        if (newPointer >= 0 && newPointer < appState.canvasStateHistory.length) {
            appState.historyPointer = newPointer;
            appState.frames = appState.canvasStateHistory[newPointer].map(frame => frame.map(row => row.map(cell => ({ ...cell }))));
            appState.currentFrameIndex = Math.min(appState.currentFrameIndex, appState.frames.length - 1);
            renderCanvas();
            updateFramesContainer();
            updateUndoRedoButtons();
            if (appState.inChallengeMode) {
                updateChallengeScore();
                updateNextCharHint();
            }
        }
    }

    function updateUndoRedoButtons() { dom.undoBtn.disabled = appState.historyPointer <= 0; dom.redoBtn.disabled = appState.historyPointer >= appState.canvasStateHistory.length - 1; }
    function updateFramesContainer() { dom.framesContainer.innerHTML = ''; appState.frames.forEach((frame, index) => { const thumbnail = document.createElement('div'); thumbnail.className = 'frame-thumbnail'; thumbnail.classList.toggle('active', index === appState.currentFrameIndex); let previewText = ''; for (let r = 0; r < ROWS; r += 2) { for (let c = 0; c < COLS; c += 2) { previewText += frame[r][c].char; } previewText += '\n'; } thumbnail.textContent = previewText; const frameIndexSpan = document.createElement('span'); frameIndexSpan.className = 'frame-index'; frameIndexSpan.textContent = `${index + 1}`; thumbnail.appendChild(frameIndexSpan); thumbnail.addEventListener('click', () => { appState.currentFrameIndex = index; renderCanvas(); updateFramesContainer(); }); dom.framesContainer.appendChild(thumbnail); }); const activeThumbnail = dom.framesContainer.querySelector('.active'); if (activeThumbnail) { activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } updateFrameControlsState(); }
    function updateFrameCounter() { dom.frameCounter.textContent = `Frame: ${appState.currentFrameIndex + 1} / ${appState.frames.length}`; }
    function updateFrameControlsState() { dom.deleteFrameBtn.disabled = appState.frames.length <= 1; dom.playBtn.disabled = appState.frames.length <= 1; }
    function updateCursor() { dom.mainCanvas.className = `grid-canvas cursor-${appState.activeTool}`; }
    
    function createEmptyFrame() { return Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => ({ char: ' ', color: DEFAULT_COLOR }))); }
    function clearCanvas() { appState.frames[appState.currentFrameIndex] = createEmptyFrame(); renderCanvas(); if (!appState.inChallengeMode) updateFramesContainer(); saveCanvasState(); showFeedbackMessage('Frame cleared!'); }
    function getCellCoordsFromEvent(e) {
        const rect = dom.canvasContainer.getBoundingClientRect();
        const coords = getEventCoords(e);
        const viewX = coords.clientX - rect.left;
        const viewY = coords.clientY - rect.top;
        const worldX = (viewX - appState.pan.x) / appState.zoomLevel;
        const worldY = (viewY - appState.pan.y) / appState.zoomLevel;
        const c = Math.floor(worldX / appState.baseCellSize);
        const r = Math.floor(worldY / appState.baseCellSize);
        return { r, c };
    }
    function getEventCoords(e) { return e.touches?.[0] || e; }
    function debounce(func, delay) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; }
    function initAudio() { if (appState.audioContextInitiated) return; try { if (typeof Tone !== 'undefined') { appState.synth = new Tone.Synth().toDestination(); Tone.start(); appState.audioContextInitiated = true; } } catch (e) { console.error("Audio context failed:", e); } }
    function playSound(note) { if (appState.audioContextInitiated && appState.synth) { appState.synth.triggerAttackRelease(note, '8n'); } }
    function hslToHex(h, s, l) { l /= 100; const a = s * Math.min(l, 1 - l) / 100; const f = n => { const k = (n + h / 30) % 12; const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * color).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; }
    function calculateBaseCellSize() { const containerWidth = dom.canvasContainer.clientWidth; return Math.max(8, Math.floor(containerWidth / COLS)); }
    
    function saveLocal() { try { const dataToSave = { frames: appState.frames, currentFrameIndex: appState.currentFrameIndex, isRainbowMode: appState.isRainbowMode, charInput: dom.charInput.value, color: dom.colorPicker.value, fps: dom.fpsInput.value, showGrid: appState.showGrid, zoomLevel: appState.zoomLevel }; localStorage.setItem('ArtAlleyData', JSON.stringify(dataToSave)); showFeedbackMessage('Artwork saved!', 3000); } catch (e) { showModal('Save Error', 'Failed to save. Storage might be full.', 'OK'); } }
    function loadLocal() { showModal('Load Artwork', 'Loading will replace your current work. Are you sure?', 'Load', true, () => { const savedData = localStorage.getItem('ArtAlleyData'); if (savedData) { try { const data = JSON.parse(savedData); appState.frames = data.frames || [createEmptyFrame()]; appState.currentFrameIndex = data.currentFrameIndex || 0; appState.isRainbowMode = data.isRainbowMode || false; dom.charInput.value = data.charInput || '#'; dom.colorPicker.value = data.color || '#00f7ff'; dom.fpsInput.value = data.fps || 8; appState.showGrid = data.showGrid !== undefined ? data.showGrid : true; appState.zoomLevel = data.zoomLevel || 1.0; endChallenge(false); resetSelection(); applyPanAndZoom(); renderCanvas(); updateFramesContainer(); initializePalette(); setActiveTool('pencil'); dom.rainbowModeBtn.textContent = `Rainbow Mode: ${appState.isRainbowMode ? 'ON' : 'OFF'}`; dom.rainbowModeBtn.classList.toggle('active', appState.isRainbowMode); dom.gridToggleBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M22 10V14H12V10H22M10 10V14H2V10H10M22 4V8H12V4H22M10 4V8H2V4H10M22 16V20H12V16H22M10 16V20H2V16H10Z" /></svg> Grid: ${appState.showGrid ? 'ON' : 'OFF'}`; updateGridVisibility(); appState.canvasStateHistory = []; appState.historyPointer = -1; saveCanvasState(); showFeedbackMessage('Artwork loaded!', 3000); } catch (e) { showModal('Load Error', 'Failed to load artwork. Data may be corrupt.', 'OK'); } } else { showFeedbackMessage('No saved artwork found.', 2000); } }); }
    function exportArt() { const text = appState.frames.map(frame => frame.map(row => row.map(cell => cell.char).join('')).join('\n')).join('\n\n--- FRAME ---\n\n'); const blob = new Blob([text], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'art-alley-creation.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href); showFeedbackMessage('Exported as .txt!', 3000); }
    
    let bgAnimationId;
    function initBackground() { const bgCanvas = document.getElementById('bg-canvas'); if (!bgCanvas) return; const bgCtx = bgCanvas.getContext('2d'); function resize() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; } resize(); window.addEventListener('resize', resize); if (bgAnimationId) cancelAnimationFrame(bgAnimationId); if (appState.backgroundMode === 'matrix') { let columns = Math.floor(bgCanvas.width / 20); let drops = Array(columns).fill(1); const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()"; function drawMatrix() { bgCtx.fillStyle = 'rgba(10, 10, 20, 0.05)'; bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height); bgCtx.fillStyle = '#00f7ff'; bgCtx.font = '15pt monospace'; for (let i = 0; i < drops.length; i++) { const text = chars[Math.floor(Math.random() * chars.length)]; bgCtx.fillText(text, i * 20, drops[i] * 20); if (drops[i] * 20 > bgCanvas.height && Math.random() > 0.975) { drops[i] = 0; } drops[i]++; } bgAnimationId = requestAnimationFrame(drawMatrix); } drawMatrix(); } else { let time = 0; function drawGradient() { time += 0.002; const gradient = bgCtx.createLinearGradient(0, 0, bgCanvas.width, bgCanvas.height); const color1 = `hsl(${time * 10 % 360}, 100%, 50%)`; const color2 = `hsl(${(time * 10 + 60) % 360}, 90%, 50%)`; const color3 = `hsl(${(time * 10 + 120) % 360}, 80%, 50%)`; gradient.addColorStop(0, color1); gradient.addColorStop(0.5, color2); gradient.addColorStop(1, color3); bgCtx.fillStyle = gradient; bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height); bgAnimationId = requestAnimationFrame(drawGradient); } drawGradient(); } }
    function toggleBackground() { appState.backgroundMode = appState.backgroundMode === 'matrix' ? 'gradient' : 'matrix'; initBackground(); }
    function animateIntro() { const logoLines = ["    _    ____ ___  ____ _  _ ____ ", "   / \\  |  |   |  |___ |\\/| |___ ", "  /___\\ |__|   |  |___ |  | |___ ", "                                 ", "    _|_  _  _  _       _  _ _  _ ", "     |  |  |  |_ |_| |_ | | |\\/| ", "     |  |__| _|  |  |_ |_| |  | "]; const combined = logoLines.join('\n'); let i = 0; function type() { if (i < combined.length) { dom.introLogo.textContent += combined.charAt(i); i++; setTimeout(type, 15); } else { dom.introLogo.classList.add('visible'); } } setTimeout(type, 500); }
    function initializePresets() { for (const name in colorPresets) { const btn = document.createElement('button'); btn.className = 'preset-btn'; btn.textContent = name; btn.onclick = () => { loadPreset(name); document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }; dom.presetButtons.appendChild(btn); } loadPreset(Object.keys(colorPresets)[0]); document.querySelector('.preset-btn').classList.add('active'); }
    function loadPreset(name) { dom.presetPalette.innerHTML = ''; colorPresets[name].forEach(color => { const colorDiv = document.createElement('div'); colorDiv.className = 'preset-color'; colorDiv.style.backgroundColor = color; colorDiv.onclick = () => { dom.colorPicker.value = color; }; dom.presetPalette.appendChild(colorDiv); }); }
    function initializePalette() { dom.charPalette.innerHTML = ''; PALETTE_CHARS.forEach(char => { const charDiv = document.createElement('div'); charDiv.className = 'palette-char'; charDiv.textContent = char; charDiv.classList.toggle('active', char === dom.charInput.value); dom.charPalette.appendChild(charDiv); }); }
    function selectPaletteChar(selectedCharDiv) { dom.charInput.value = selectedCharDiv.textContent; updateActivePaletteChar(dom.charInput.value); }
    function updateActivePaletteChar(char) { Array.from(dom.charPalette.children).forEach(div => div.classList.toggle('active', div.textContent === char)); }
    function toggleGrid() { appState.showGrid = !appState.showGrid; dom.canvasWrapper.classList.toggle('no-grid-lines', !appState.showGrid); dom.gridToggleBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M22 10V14H12V10H22M10 10V14H2V10H10M22 4V8H12V4H22M10 4V8H2V4H10M22 16V20H12V16H22M10 16V20H2V16H10Z" /></svg> Grid: ${appState.showGrid ? 'ON' : 'OFF'}`; }
    function updateGridVisibility() { dom.canvasWrapper.classList.toggle('no-grid-lines', !appState.showGrid); }
    function toggleRainbowMode() { appState.isRainbowMode = !appState.isRainbowMode; dom.rainbowModeBtn.textContent = `Rainbow Mode: ${appState.isRainbowMode ? 'ON' : 'OFF'}`; dom.rainbowModeBtn.classList.toggle('active', appState.isRainbowMode); }

    function showModal(title, content, confirmText = 'OK', showCancel = false, onConfirm = () => {}, onCancel = () => {}) {
        dom.modalTitle.textContent = title;
        dom.modalBody.innerHTML = '';
        if (typeof content === 'string') {
            dom.modalBody.innerHTML = content;
        } else {
            dom.modalBody.appendChild(content);
        }
        dom.modalConfirmBtn.textContent = confirmText;
        dom.modalCancelBtn.classList.toggle('hidden', !showCancel);
        dom.modal.style.display = 'flex';
        
        const confirmHandler = () => { cleanup(); if(onConfirm) onConfirm(); };
        const cancelHandler = () => { cleanup(); if(onCancel) onCancel(); };
        const overlayHandler = (e) => { if (e.target === dom.modal) cancelHandler(); };
        
        function cleanup() {
            dom.modalConfirmBtn.removeEventListener('click', confirmHandler);
            dom.modalCancelBtn.removeEventListener('click', cancelHandler);
            dom.modal.removeEventListener('click', overlayHandler);
            hideModal();
        }
        
        dom.modalConfirmBtn.addEventListener('click', confirmHandler);
        dom.modalCancelBtn.addEventListener('click', cancelHandler);
        dom.modal.addEventListener('click', overlayHandler);
    }

    function hideModal() { dom.modal.style.display = 'none'; }
    function showFeedbackMessage(message, duration = 2000) { dom.feedbackMessage.textContent = message; dom.feedbackMessage.classList.add('show'); clearTimeout(dom.feedbackMessage.hideTimeout); dom.feedbackMessage.hideTimeout = setTimeout(() => { dom.feedbackMessage.classList.remove('show'); }, duration); }
    
    function showInstructionsModal() {
        const content = `
            <p>Welcome to <strong>Art Alley</strong>, your personal ASCII art studio!</p>
            <ul>
                <li><strong>Draw:</strong> Select the <strong>Pencil</strong> and a character/color to start creating.</li>
                <li><strong>Animate:</strong> Use the <strong>+ Frame</strong> button to build animations, then press <strong>Play</strong>.</li>
                <li><strong>Navigate:</strong> Hold the <strong>Spacebar</strong> and drag to pan the canvas. Use the zoom buttons to get a closer look.</li>
                <li><strong>Challenge Yourself:</strong> Try <strong>Challenge Mode</strong> to trace cool ASCII art. A guide will appear when you start.</li>
            </ul>
            <p>Explore the other tools and have fun creating!</p>
        `;
        showModal('Quick Start Guide', content, "Let's Go!");
    }

    function showChallengeSelection() {
        const content = document.createElement('div');
        content.innerHTML = `<p>Your goal is to trace the faint outline by selecting the correct characters and placing them in the right spots. Good luck!</p><select id="challenge-difficulty-select"></select><div id="challenge-selection"></div>`;
        const difficultySelect = content.querySelector('#challenge-difficulty-select');
        const selectionContainer = content.querySelector('#challenge-selection');
        for (const difficulty in challenges) {
            const option = document.createElement('option');
            option.value = difficulty;
            option.textContent = difficulty;
            difficultySelect.appendChild(option);
        }
        function populateChallenges(difficulty) {
            selectionContainer.innerHTML = '';
            const difficultyChallenges = challenges[difficulty];
            for (const name in difficultyChallenges) {
                const challengeArt = difficultyChallenges[name];
                const preview = document.createElement('div');
                preview.className = 'challenge-preview';
                preview.textContent = challengeArt.join('\n');
                preview.onclick = () => { startChallenge(challengeArt); hideModal(); };
                selectionContainer.appendChild(preview);
            }
        }
        difficultySelect.onchange = (e) => populateChallenges(e.target.value);
        showModal('Challenge Mode', content, 'Cancel', false, null, hideModal);
        populateChallenges(difficultySelect.value);
    }

    function startChallenge(challengeArt) {
        endChallenge(false);
        appState.inChallengeMode = true;
        
        const parsed = parseChallenge(challengeArt);
        appState.challengeSolution = parsed.grid;
        appState.totalChallengeChars = parsed.charCount;

        clearCanvas();
        renderChallengeTrace();
        
        dom.mainControls.classList.add('hidden');
        dom.challengeBar.classList.remove('hidden');
        
        updateChallengeScore();
        updateNextCharHint();
        showFeedbackMessage('Challenge Started! Trace the gray art.', 3000);
    }

    function endChallenge(showMsg) {
        appState.inChallengeMode = false;
        appState.challengeSolution = null;
        appState.totalChallengeChars = 0;
        clearTimeout(appState.hintTimeout);
        
        const traceCells = dom.challengeTraceCanvas.children;
        for(let i = 0; i < traceCells.length; i++) { traceCells[i].textContent = ''; }

        dom.mainControls.classList.remove('hidden');
        dom.challengeBar.classList.add('hidden');
        
        clearCanvas();
        saveCanvasState();
        if (showMsg) showFeedbackMessage('Exited Challenge Mode');
    }

    function handleChallengeDraw(r, c, isStartOfStroke) {
        const solutionChar = appState.challengeSolution?.[r]?.[c]?.char;
        if (!solutionChar || solutionChar === ' ') return;

        const currentFrame = appState.frames[appState.currentFrameIndex];
        const userChar = currentFrame[r][c].char;

        if (userChar !== solutionChar) {
            currentFrame[r][c] = { char: solutionChar, color: dom.colorPicker.value };
            playSound('C4');
        } else {
            currentFrame[r][c] = { char: ' ', color: DEFAULT_COLOR };
            playSound('A3');
        }

        renderCanvas();
        updateChallengeScore();
        updateNextCharHint();
        if (isStartOfStroke) saveCanvasState();
    }

    function parseChallenge(art) {
        let grid = createEmptyFrame();
        let charCount = 0;
        const startRow = Math.floor((ROWS - art.length) / 2);
        const artWidth = Math.max(...art.map(line => line.length));
        const startCol = Math.floor((COLS - artWidth) / 2);

        art.forEach((line, r) => {
            for (let c = 0; c < line.length; c++) {
                const gridR = startRow + r;
                const gridC = startCol + c;
                if (gridR >= 0 && gridR < ROWS && gridC >= 0 && gridC < COLS) {
                    const char = line[c];
                    grid[gridR][gridC].char = char;
                    if (char !== ' ') {
                        charCount++;
                    }
                }
            }
        });
        return { grid, charCount };
    }

    function renderChallengeTrace() {
        const traceCells = dom.challengeTraceCanvas.children;
        for (let i = 0; i < traceCells.length; i++) {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const char = appState.challengeSolution?.[r]?.[c]?.char || ' ';
            traceCells[i].textContent = char === ' ' ? '' : char;
        }
    }

    function updateChallengeScore() {
        if (!appState.inChallengeMode) return;
        let correctCount = 0;
        const frame = appState.frames[appState.currentFrameIndex];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const solutionChar = appState.challengeSolution[r][c].char;
                if (solutionChar !== ' ' && frame[r][c].char === solutionChar) {
                    correctCount++;
                }
            }
        }
        const score = appState.totalChallengeChars > 0 ? Math.round((correctCount / appState.totalChallengeChars) * 100) : 0;
        dom.challengeScoreDisplay.textContent = `${score}%`;
        if (score === 100) {
            showFeedbackMessage('Challenge Complete!', 5000);
            playSound('C5');
        }
    }
    
    function updateNextCharHint() {
        if (!appState.inChallengeMode) return;
        const frame = appState.frames[appState.currentFrameIndex];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const solutionChar = appState.challengeSolution[r][c].char;
                if (solutionChar !== ' ' && frame[r][c].char !== solutionChar) {
                    dom.challengeCharDisplay.textContent = solutionChar;
                    return;
                }
            }
        }
        dom.challengeCharDisplay.textContent = '✓';
    }

    function showHint() {
        if (!appState.inChallengeMode) return;
        const frame = appState.frames[appState.currentFrameIndex];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const solutionChar = appState.challengeSolution[r][c].char;
                if (solutionChar !== ' ' && frame[r][c].char !== solutionChar) {
                    const cellIndex = r * COLS + c;
                    const cell = dom.mainCanvas.children[cellIndex];
                    if (cell) {
                        cell.classList.add('hint-char');
                        clearTimeout(appState.hintTimeout);
                        appState.hintTimeout = setTimeout(() => cell.classList.remove('hint-char'), 1500);
                        return;
                    }
                }
            }
        }
    }

    function showSolution() {
        if (!appState.inChallengeMode) return;
        showModal('Show Solution', 'This will reveal the full solution. Are you sure?', 'Show', true, () => {
            const frame = appState.frames[appState.currentFrameIndex];
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const solutionChar = appState.challengeSolution[r][c].char;
                    if (solutionChar !== ' ') {
                        frame[r][c] = { char: solutionChar, color: dom.colorPicker.value };
                    }
                }
            }
            renderCanvas();
            updateChallengeScore();
        });
    }

    function selectNewChallenge() {
        endChallenge(false);
        showChallengeSelection();
    }

    initializeApp();
});
