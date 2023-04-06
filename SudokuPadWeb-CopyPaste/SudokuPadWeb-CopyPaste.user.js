// ==UserScript==
// @name         SudokuPad Plugin - Copy/Paste
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add Copy/Paste (Ctrl-C, Ctrl-V) functionality. Also as dedicated buttons in the Import/Export settings
// @author       Mark Langezaal (MarkTekfan#8907)
// @match        https://*.crackingthecryptic.com/sudoku/*
// @match        https://*.sudokupad.app/*
// @match        http://127.0.0.1:5501/*
// @icon         https://icons.duckduckgo.com/ip2/sudokupad.app.ico
// @updateURL    https://raw.githubusercontent.com/MarkTekfan/Userscripts/main/SudokuPadWeb-CopyPaste/SudokuPadWeb-CopyPaste.user.js
// @downloadURL  https://raw.githubusercontent.com/MarkTekfan/Userscripts/main/SudokuPadWeb-CopyPaste/SudokuPadWeb-CopyPaste.user.js
// @supportURL   https://github.com/MarkTekfan/Userscripts/issues
// @grant        none
// @run-at       document-end
// ==/UserScript==

/* globals Framework, Puzzle, Cell */
/* globals bindHandlers, addHandler */
/* globals ClipboardItem */

(() => {
	const FeatureCopyPaste = (() => {
		function FeatureCopyPaste() {
			bindHandlers(this);
			this.name = 'featurecopypaste';
		}
		const C = FeatureCopyPaste, P = Object.assign(C.prototype, {constructor: C});
		const cellToVal = cell => cell.hideclue ? '.' : cell.propGet('given') || cell.propGet('normal') || '.';
		P.getSelectionMinMax = function(copy = false) {
			const {puzzle, currentPuzzle = {}} = Framework.app;
			const {selectedCells} = puzzle;
			const {cages = []} = currentPuzzle;
			const [minRC, maxRC] = Puzzle.getMinMaxRC(cages);
			// When a single cell is selected then copy should use whole grid
			// else use the top-left selected cell as starting point
			if (selectedCells.length > (copy ? 1 : 0)) {
				// get bounding box of selection
				let minRow = 99, maxRow = 0, minCol = 99, maxCol = 0;
				for (let cell of selectedCells) {
					if (cell.row < minRow) minRow = cell.row;
					if (cell.row > maxRow) maxRow = cell.row;
					if (cell.col < minCol) minCol = cell.col;
					if (cell.col > maxCol) maxCol = cell.col;
				}
				return {minRow, minCol, maxRow, maxCol, minRC, maxRC};
			}
			// When no cells are selected, or a single cell during copy, then use whole grid
			return {
				minRow: minRC[0], minCol: minRC[1],
				maxRow: maxRC[0], maxCol: maxRC[1],
				minRC, maxRC
			};
		}
		P.resetInputState = function() {
			// In case a dialog pops-up due to a paste action (E.g. finishing the puzzle)
			// then the keyup or mouseup event is not registered. Therefor clear the input states.
			// This should probably be refactored into e.g. app.resetInput. Or move to dialog
			const {app} = Framework;
			clearTimeout(app.longInputTimoutId); // This prevents a long-press smart-select for when a dialog pops-up.
			app.keys = {}; // This resets the ctrl state for when a dialog pops-up.
			app.changeTool(); // Pressing Ctrl did temp change the tool
		}
		P.handleCopySelection = function() {
			Framework.closeDialog();
			const {app} = Framework, {grid} = app;
			const {minRow, minCol, maxRow, maxCol} = this.getSelectionMinMax(true);
			const rows = maxRow - minRow + 1, cols = maxCol - minCol + 1;
			let text = '';
			let html = '';
			// Copy all cells in the selection rectangle
			for (let row = minRow; row <= maxRow; row++) {
				html += '<row>';
				for (let col = minCol; col <= maxCol; col++) {
					const cell = grid.getCell(row, col);
					const state = (cell.given ? cell.given : '') + cell.serialize();
					html += `<cell state="${state}"></cell>`;
					text += cellToVal(cell).toUpperCase();
				}
				html += '</row>';
				text += '\n';
			}

			let texthtml = `<sudokupad rows="${maxRow - minRow + 1}" cols="${maxCol - minCol + 1}">${html}</sudokupad><pre>${text.trim()}</pre>`;
			try {
				const blobInputPlain = new Blob([text], {type: 'text/plain'});
				const blobInputHtml = new Blob([texthtml], {type: 'text/html'});
				const clipboardItem = new ClipboardItem({'text/plain' : blobInputPlain, 'text/html' : blobInputHtml});
				navigator.clipboard.write([clipboardItem]);
				console.log('Cell Selection copied to Clipboard.');

				this.resetInputState();
				const fullRow = cols === grid.cols;
				const fullCol = rows === grid.rows;
				let selection;
				if (fullRow && fullCol) selection = `${cols}x${rows} Board`;
				else if (fullRow && rows === 1) selection = '1 Row';
				else if (fullCol && cols === 1) selection = '1 Column';
				else if (fullCol) selection = `${cols} Columns`;
				else if (fullRow) selection = `${rows} Rows`;
				else selection = `${cols}x${rows} Cells`;
				let dialogParts = [
					// {tag: 'title', innerHTML: `Board is copied to Clipboard <span style="vertical-align: middle;">${Framework.icons.copy}</span>`, style: 'text-align: center'},
					{tag: 'text', style: 'text-align: center; font-size: 120%;',
						innerHTML: `${selection} copied to Clipboard <span style="vertical-align: middle;">${Framework.icons.copy}</span>`,
					},
					{tag: 'options', options: [{tag: 'button', content: 'OK', action: 'close'}]}
				];
				Framework.showDialog({parts: dialogParts, centerOverBoard: true});
			} catch(e) {
				this.copyFailed = true;
				console.error('Unable to copy to Clipboard.');
			}

			//navigator.clipboard.writeText(text);
			//console.log(text);
		}
		P.handlePasteSelection = function() {
			Framework.closeDialog(); // When activated from Settings Dialog
			this.resetInputState();
			navigator.permissions.query({ name: 'clipboard-read' }).then(permission => {
				if (permission.state === 'denied') {
					console.warn('Clipboard access denied.');
					return;
				}
			    navigator.clipboard.read().then(clipboardContents => {
					for (const item of clipboardContents) {
						if (item.types.includes('text/html')) {
							item.getType('text/html').then(blob => {
								blob.text().then(text => this.pasteHtml(text));
							});
						}
						else if (item.types.includes('text/plain')) {
							item.getType('text/plain').then(blob => {
								blob.text().then(text => this.pasteText(text));
							});
						}
					}
				});
			});
		}
		P.pasteHtml = function(html) {
			// console.log('pasteHtml', html);
			var tempElem = document.createElement('div');
			tempElem.innerHTML = html;
			var elem = tempElem.firstChild;
			// console.log(elem);

			const rowsAttr = elem.getAttribute('rows') | 0;
			const colsAttr = elem.getAttribute('cols') | 0;
			if (elem.tagName !== 'SUDOKUPAD' || !rowsAttr || !colsAttr) {
				console.info('Clipboard does not contain recognizable sudoku input');
				return;
			}

			let {minRow, minCol, minRC, maxRC} = this.getSelectionMinMax(false);
			let rows = (maxRC[0] - minRC[0] + 1), cols = (maxRC[1] - minRC[1] + 1);

			// When clipboard is a complete grid then always paste at top-left.
			const fullGrid = (rowsAttr === rows && colsAttr === cols);
			if (fullGrid) {
				minRow = minRC[0];
				minCol = minRC[1];
			}
			// clipboard should fit in the grid at the selection (=top-left of selection bounding box)
			if (minRow + rowsAttr > maxRC[0] + 1 ||
				minCol + colsAttr > maxRC[1] + 1) {
				console.info('Clipboard does not fit at selection');
				return;
			}

			const {app} = Framework, {puzzle, grid} = app;
			const savedSelection = [...puzzle.selectedCells];
			app.act({type: 'groupstart'});

			let row = minRow;
			elem.querySelectorAll('row').forEach(rowObj => {
				let col = minCol;
				rowObj.querySelectorAll('cell').forEach(cellObj => {
					const cell = grid.getCell(row, col);
					const state = cellObj.getAttribute('state');
					if (cell && state) {
						this.setCellState(cell, state, fullGrid);
					}
					col++;
				});
				row++;
			});

			app.deselect();
			app.select(savedSelection);
			app.act({type: 'groupend'});
			console.log('Clipboard text/html Pasted into board');
		}
		P.setCellState = function(cell, state, fullGrid = false) {
			const {app} = Framework;
			const setProperty = function(values = '', toolName) {
				const tool = app.tools[toolName];
				let arr1 = cell.propGet(toolName);
				let arr2 = values.split(',');
				arr1.filter(x => x && !arr2.includes(x)).forEach(val => app.act({type: tool.actionLong, arg: val})); // remove
				arr2.filter(x => x && !arr1.includes(x)).forEach(val => app.act({type: tool.actionLong, arg: val})); // add
			}
			const setValue = function(value) {
				const tool = app.tools.normal;
				if (value && cellToVal(cell) !== value) {
					app.act({type: tool.actionLong, arg: value})
				}
			}
			const penValidForCell = function (v) {
				if (fullGrid) return true;
				if ('tuvwxyz@'.includes(v)) return false; // outside check-off
				if (cell.col !== 0 && '9brjklm'.includes(v)) return false; // Left side marks
				if (cell.row !== 0 && 'acslmno'.includes(v)) return false; // Top side marks
				return true;
			}
			const setPen = function(values = '', toolName = 'pen') {
				const tool = app.tools[toolName];
				let arr1 = cell.propGet(toolName);
				let arr2 = values.split(',');
				arr1.filter(x => x && !arr2.includes(x)).forEach(val => {
					let [v, c] = val.split('');
					app.act({type: 'pen', arg: v}); // remove
				});
				arr2.filter(x => x && !arr1.includes(x)).forEach(val => {
					let [v, c] = val.split('');
					if (!penValidForCell(v)) return;
					if (c && tool && tool.getStateColor() !== c) {
						app.act({type: 'pencolor', arg: c});
						tool.setStateColor(c);
					}
					app.act({type: 'pen', arg: v}); // add
				});
			}

			var json = {};
			var vals = state.split('/');
			Cell.StateKeys
				.forEach((key, idx) => {
					var val = vals[idx];
					if(val !== '' && val !== undefined) json[key] = val;
				});

			app.deselect();
			app.select(cell);

			setProperty(json.cl, 'colour');
			setPen(json.pe);
			setValue(json.v);
			if (json.v) return;
			setProperty(json.c, 'centre');
			setProperty(json.pm, 'corner');
		}
		P.pasteText = function(text) {
			// console.log('pasteText', text);
			let {minRow, minCol, minRC, maxRC} = this.getSelectionMinMax(false);
			text = text.replace(/[ \t]+/g, '').trim(); // Remove all spaces and tabs, and all leading and trailing empty lines
			const reValid = Framework.settings.toolletter ? /^[0-9a-z.\r\n]+$/i : /^[0-9.\r\n]+$/
			if (!text.match(reValid)) {
				console.info('Clipboard does not contain recognizable sudoku input');
				return;
			}
			const {app} = Framework, {puzzle, grid} = app;

			let lines = text.toLowerCase().split(/[\r\n]+/);
			let rows = (maxRC[0] - minRC[0] + 1), cols = (maxRC[1] - minRC[1] + 1);
			if (lines.length === 1 && lines[0].length === rows * cols) {
				// Single line is a complete sudoku. Split it.
				// When complete sudoku contains exactly 'rows' number of '0' then '0's are part of the solution.
	        	//const singleline = (lines[0].split('0').length - 1 === rows) ? lines[0] : lines[0].replaceAll('0', '.');
				const singleline = (lines[0].includes('.') || lines[0].split('0').length - 1 === rows) ? lines[0] : lines[0].replaceAll('0', '.');
				lines.length = 0;
				for (let r = 0; r < rows; r++) {
					lines.push(singleline.substring(r * cols, r * cols + cols));
				}
			}
			if (lines.length > rows || !lines.every(l => l.length <= cols)) {
				console.info('Clipboard does not contain recognizable sudoku input');
				return;
			}
			// When clipboard is a complete grid then always paste at top-left.
			if (lines.length === rows && lines.every(l => l.length === cols)) {
				minRow = minRC[0];
				minCol = minRC[1];
			}
			// clipboard should fit in the grid at the selection (=top-left of selection bounding box)
			if (minRow + lines.length > maxRC[0] + 1 ||
				!lines.every(l => minCol + l.length <= maxRC[1] + 1)) {
				console.info('Clipboard does not fit at selection');
				return;
			}

			const savedSelection = [...puzzle.selectedCells];
			app.act({type: 'groupstart'});
			const tool = app.tools.normal;
			let row = minRow;
			for (const line of lines) {
				let col = minCol;
				for (let value of line.trim()) {
					const cell = grid.getCell(row, col);
					if (cell && value !== '.' && cellToVal(cell) !== value) {
						app.deselect();
						app.select(cell);
						app.act({type: tool.actionLong, arg: value.toLowerCase()})
					}
					col++;
				}
				row++;
			}
			app.deselect();
			app.select(savedSelection);
			app.act({type: 'groupend'});
			console.log('Clipboard text/plain Pasted into board');
		}
		P.handleKeydown = function(event) {
			if(event.repeat) return;
			//if(Framework.settings['toolletter']) return;
			let controlPressed = Framework.app.controlPressed;
			if (controlPressed && event.keyCode === 67) { // CTRL+C
				this.handleCopySelection();
				event.preventDefault();
			}
			if (controlPressed && event.keyCode === 86) { // CTRL+V
				this.handlePasteSelection();
				event.preventDefault();
			}
		}
		P.addFeature = function() {
			Framework.addSettings([
				{tag: 'button', group: 'importexport', name: 'copyselection',
					innerHTML: `Copy to Clipboard <span class="icon">${Framework.icons.copy}</span>&nbsp;<span style="font-size: 1rem;">Ctrl+C</span>`,
					handler: this.handleCopySelection,
					style: 'display: block; margin: 0.5rem 1rem; padding: 0rem 1rem; font-size: 1.2rem;'
				},
				{tag: 'button', group: 'importexport', name: 'pasteselection',
					innerHTML: `Paste from Clipboard <span class="icon">${Framework.icons.copy}</span>&nbsp;<span style="font-size: 1rem;">Ctrl+V</span>`,
					handler: this.handlePasteSelection,
					style: 'display: block; margin: 0.5rem 1rem; padding: 0rem 1rem; font-size: 1.2rem;'
				},
			]);
			addHandler(document, 'keydown', this.handleKeydown, {passive: false});
			console.log('# feature-copypaste loaded');
			console.log(`
			#============================================================
			#                    DISCLAIMER
			# This plugin is provided as-is and is not supported by Sven.
			# Functionality can change or break the Sudokupad WebApp
			# Use at your own risk.
			#============================================================
			`);
        }
        P.removeFeature = function() {
            document.removeEventListener('keydown', P.handleKeyDown, {passive: false});
        }
        return C;
    })();

    const featureCopyPaste = new FeatureCopyPaste();
    Framework.getApp().then(() => featureCopyPaste.addFeature());

})();
