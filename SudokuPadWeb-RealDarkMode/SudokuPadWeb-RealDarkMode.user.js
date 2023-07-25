// ==UserScript==
// @name         SudokuPad Plugin - Real Dark Mode
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add Real Dark Mode
// @author       Mark Langezaal (MarkTekfan)
// @match        https://*.crackingthecryptic.com/sudoku/*
// @match        https://*.sudokupad.app/*
// @match        http://127.0.0.1:5501/*
// @icon         https://icons.duckduckgo.com/ip2/sudokupad.app.ico
// @updateURL    https://raw.githubusercontent.com/MarkTekfan/Userscripts/main/SudokuPadWeb-RealDarkMode/SudokuPadWeb-RealDarkMode.user.js
// @downloadURL  https://raw.githubusercontent.com/MarkTekfan/Userscripts/main/SudokuPadWeb-RealDarkMode/SudokuPadWeb-RealDarkMode.user.js
// @supportURL   https://github.com/MarkTekfan/Userscripts/issues
// @grant        none
// @run-at       document-end
// ==/UserScript==

/* globals Framework, App */
/* globals bindHandlers, addMoveEventHandler, removeMoveEventHandler */
/* globals attachStylesheet */
(() => {
	const FeatureRealDarkMode = (() => {
		
		function FeatureRealDarkMode() {
			bindHandlers(this);
			this.featureStylesheet = undefined;
			this.featureEnabled = true;
			this.darkModeElem;
		}
		const C = FeatureRealDarkMode, P = Object.assign(C.prototype, {constructor: C});
		C.SettingName = 'realdarkmode';
		C.featureStyle = `
			section.realdarkmode {
				position: relative;
				width: 100%;
				height: 100vh;
				pointer-events: none; 
			}
			section.realdarkmode .focus {
				position: absolute;
				width: 100%;
				height: 100%;
				z-index: 99;
				xpointer-events: none; 
			}
		`;
		P.renderDarkModeElem = function() {
			if(this.darkModeElem) return;
			this.removeDarkModeElem();
			const overlayElem = document.querySelector('body');
			overlayElem.insertAdjacentHTML('afterbegin', `<section class="realdarkmode"><div class="focus"></div></section>`);
			this.darkModeElem = document.querySelector(`section.realdarkmode`);
		};
		P.removeDarkModeElem = function() {
			if(!this.darkModeElem) return;
			this.darkModeElem.remove();
			delete this.darkModeElem;
		};
		P.handleLoad = function() {
			this.renderDarkModeElem();
		};
		P.attachElem = function() {
			let {app} = Framework;
			if(app === undefined) return;
			//if(this.featureEnabled) return;
			this.featureEnabled = true;
			this.renderDarkModeElem();
			addMoveEventHandler(window, this.handleMove);
		};
		P.detachElem = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			this.removeDarkModeElem();
			removeMoveEventHandler(window, this.handleMove);
		};
		P.handleMove = function(e) {
			let focusElem = document.querySelector('section.realdarkmode .focus');
			if (!focusElem) return;
			let x = e.pageX;
			let y = e.pageY;
			focusElem.style.background = `radial-gradient(60em at ${x}px ${y}px, transparent, #0008 20%, #000E 40%)`
		};
		P.handleChange = function(...args) {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = function() {
			this.handleChange();
		};
		P.addFeature = async function() {
			App.SettingsDefaults[C.SettingName] = this.featureEnabled;
			Framework.addSetting({
				group: 'visual', name: C.SettingName, content: 'Real Dark Mode',
				tag: 'toggle',
				init: this.handleInit,
				onToggle: this.handleChange,
			});
			this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.removeFeature = function() {
			this.featureStylesheet.remove();
		};
		return C;
	})();

	const featureRealDarkMode = new FeatureRealDarkMode();
	Framework.getApp().then(() => featureRealDarkMode.addFeature());

})();