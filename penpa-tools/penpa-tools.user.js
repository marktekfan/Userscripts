// ==UserScript==
// @name        Penpa Tools
// @version     1.1.0
// @description Miscellaneous tools for Penpa puzzles
// @license     MIT
// @author      MarkTekfan (marknn3)
// @namespace   http://github.com/MarkTekfan
// @match       */penpa-edit/*
// @grant       GM_registerMenuCommand
// @icon        https://icons.duckduckgo.com/ip2/github.io.ico
// @updateURL   https://raw.githubusercontent.com/MarkTekfan/Userscripts/main/penpa-tools/penpa-tools.user.js
// @downloadURL https://raw.githubusercontent.com/MarkTekfan/Userscripts/main/penpa-tools/penpa-tools.user.js
// @supportURL  https://github.com/MarkTekfan/Userscripts/issues
// @run-at      document-end
// ==/UserScript==

/* globals pu */

(function() {
    'use strict';

    function penpaFillSolution() {
        if (typeof pu !== 'object' || !pu.solution) {
            return alert('This Penpa puzzle has no embedded solution');
        }

        if (!pu.multisolution) {
            let stext = JSON.parse(pu.solution);
            if (stext[0]) {
                for(let s of stext[0]) {
                    pu.pu_a.surface[s] = 8;
                }
            }
            if (stext[1]) {
                for(let s of stext[1]) {
                    let [p1, p2, val] = s.split(',');
                    pu.pu_a.line[`${p1},${p2}`] = val === '2' ? 30 : 3;
                }
            }
            if (stext[2]) {
                for(let s of stext[2]) {
                    let [p1, p2, val] = s.split(',');
                    pu.pu_a.lineE[`${p1},${p2}`] = val === '2' ? 30 : 3;
                }
            }
            if (stext[3]) {
                for(let s of stext[3]) {
                    let [p1, p2, val] = s.split(',');
                    pu.pu_a.wall[`${p1},${p2}`] = 3;
                }
            }
            if (stext[4]) {
                for(let s of stext[4]) {
                    let [p, val] = s.split(',');
                    pu.pu_a.number[p] = [val, 9, '1'];
                }
            }
            if (stext[5]) {
                const solSymbolMap = {
                    'A': 'circle_M',
                    'B': 'tri',
                    'C': 'arrow_S',
                    'D': 'battleship_B',
                    'D+':'battleship_B+',
                    'E': 'star',
                    'F': 'tents',
                    'G': 'math',
                    'H': 'sun_moon',
                    'I': 'sun_moon',
                };
                for(let s of stext[5]) {
                    let [p, val] = s.split(',');
                    let symbol = solSymbolMap[val.substr(1)];
                    if (symbol) {
                        let v = Number(val.substr(0, 1));
                        pu.pu_a.symbol[p] = [v, symbol, 1];
                    }
                }
            }
        }
        else {
            let settingstatus_or = document.getElementById('answersetting').getElementsByClassName('solcheck_or');
            var sol_count = -1; // as list indexing starts at 0
            // loop through and check which 'OR' settings are selected
            for (var m = 0; m < settingstatus_or.length; m++) {
                if (settingstatus_or[m].checked) {
                    // incrementing solution count by 1
                    sol_count++;

                    // Extracting the checkbox id. First 7 chracters 'sol_or_' are sliced.
                    let sol_id = settingstatus_or[m].id.slice(7);
                    var solution = pu.solution[sol_count];
                    switch (sol_id) {
                        case 'surface':
                            for(let s of solution) {
                                pu.pu_a.surface[s] = 8;
                            }
                            break;
                        case 'number':
                            for(let s of solution) {
                                let [p, val] = s.split(',');
                                pu.pu_a.number[p] = [val, 9, '1'];
                            }
                            break;
                        case 'loopline':
                            for(let s of solution) {
                                let [p1, p2, val] = s.split(',');
                                pu.pu_a.line[`${p1},${p2}`] = val === '2' ? 30 : 3;
                            }
                            break;
                        case 'loopedge':
                            for(let s of solution) {
                                let [p1, p2, val] = s.split(',');
                                pu.pu_a.lineE[`${p1},${p2}`] = val === '2' ? 30 : 3;
                            }
                            break;
                        case 'wall':
                            for(let s of solution) {
                                let [p1, p2, val] = s.split(',');
                                pu.pu_a.wall[`${p1},${p2}`] = 3;
                            }
                            break;
                        case 'wall':
                            for(let s of solution) {
                                let [p1, p2, val] = s.split(',');
                                pu.pu_a.wall[`${p1},${p2}`] = 3;
                            }
                            break;
                        case 'square':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [2, 'square_LL', 1]; //black square
                            }
                            break;
                        case 'circle':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [2, 'circle_M', 1]; //black circle
                            }
                            break;
                        case 'tri':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [1, 'tri', 1]; //top-left tri
                            }
                            break;
                        case 'arrow':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [1, 'arrow_S', 1]; //left-arroe
                            }
                            break;
                        case 'math':
                            for(let s of solution) {
                                let [p, val] = s.split(',');
                                pu.pu_a.symbol[p] = [Number(val), 'math', 1]; //plus or minus
                            }
                            break;
                        case 'battleship':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [2, 'battleship_B', 1]; //midship
                            }
                            break;
                        case 'tent':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [2, 'tents', 1]; //tent
                            }
                            break;
                        case 'star':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [2, 'star', 1]; //black star
                            }
                            break;
                        case 'akari':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [3, 'sun_moon', 1]; //lightbulb
                            }
                            break;
                        case 'mine':
                            for(let s of solution) {
                                pu.pu_a.symbol[s] = [4, 'sun_moon', 1]; //mine
                            }
                            break;
                    }
                }
            }
        }

        pu.redraw(false, false);
    }

    function penpaShowCenterlist() {
        pu.conflict_cells = [...pu.centerlist];
        pu.redraw(false, false);
    }

    function penpaMarkCenterlist() {
        const {symbol} = pu.pu_q;
        for (let p of pu.centerlist) {
            if (!symbol[p]) {
                symbol[p] = [1, 'diamond_SS', 1];
            }
        }
        pu.redraw(false, false);
    }

    setTimeout(() => {
        if (typeof pu !== 'object' || !pu.solution) {
            console.log(1);
            GM_registerMenuCommand(
                " - No Solution available",
                () => {}
            );
        }
        else {
            console.log(2);
            GM_registerMenuCommand(
                " Fill Solution",
                () => {
                    penpaFillSolution();
                }
            );
        }

        GM_registerMenuCommand(
            " Colorize Centerlist",
            () => {
                penpaShowCenterlist();
            }
        );
        GM_registerMenuCommand(
            " Mark Centerlist",
            () => {
                penpaMarkCenterlist();
            }
        );

    }, 500);

})();