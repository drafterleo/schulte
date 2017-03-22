function Cell(number) {
    this.number = number;
    this.symbol = number;
    this.cssClasses = {
        'rotate-90': false,
        'rotate-180': false,
        'rotate-270': false,
        'spin-right': false,
        'spin-left': false
    };
}


var appData = {
    gridSize: 5,
    gridRange: [0, 1, 2, 3, 4],
    cells: [], // array of Cell object
    trace: [],
    currNum: 1,

    gameStarted: false,

    hoverIndex: -1,
    selectIndex: -1,
    correctIndex: -1,

    showHover: true,
    showHitResult: true,
    showTrace: true,
    turnSymbols: false,
    spinSymbols: false,

    rowHeight: '20%',
    colWidth: '20%',
    selectTimeOut: 500,
    selectedTimerId: -1,

    dialogShowed: false,
    settingsTabVisible: true,
    statsTabVisible: false,

    stats: {
        startTime: new Date(),
        stopTime: new Date(),
        correctHits: 0,
        wrongHits: 0,
        clear: function () {
            this.startTime = new Date(),
                this.stopTime = new Date(),
                this.correctHits = 0,
                this.wrongHits = 0
        },
        timeDiff: function () {
            var diff = (this.stopTime - this.startTime); // milliseconds between
            var days = Math.floor(diff / 86400000);
            var hours = Math.floor((diff % 86400000) / 3600000);
            var minutes = Math.floor(((diff % 86400000) % 3600000) / 60000);
            var seconds = Math.round(((diff % 86400000) % 3600000) / 1000);

            return ("0" + hours).slice (-2) + ':' +
                   ("0" + minutes).slice (-2) + ':' +
                   ("0" + seconds).slice (-2);
        }
    }
};

Vue.directive('focus', {                   // https://jsfiddle.net/LukaszWiktor/cap43pdn/
    inserted: function (el) {
        el.focus();
    },
    update: function (el) {
        Vue.nextTick(function () {
            el.focus();
        })
    }
});

vueApp = new Vue({
    el: '#app',
    data: appData,
    created: function () {
        this.initGame();
    },
    mounted: function () {
        this.execDialog('settings');
    },
    updated: function () {
    },
    watch: {
        gridSize: function (val) {
            if (isNaN(parseInt(val)) || parseInt(val) < 2) {
                this.gridSize = 2; // recursion !!!
                return;
            }
            this.gridRange = this.makeRange(0, val - 1);
            this.rowHeight = 100 / val + '%';
            this.colWidth = 100 / val + '%';

            this.startGame();
        },
        spinSymbols: function (val) {
            this.updateSymbolSpins();
        },
        turnSymbols: function (val) {
            this.updateSymbolTurns();
        }
    },
    computed: {
        selectedCell: {
            get: function () {
                return this.selectIndex;
            },
            set: function (cellIdx) {
                if (this.gameStarted) {
                    this.selectIndex = cellIdx;
                    this.showHitResult = true;
                    clearTimeout(this.selectedTimerId);
                    this.selectedTimerId = setTimeout(this.hideSelect, this.selectTimeOut);
                    this.nextTurn();
                }
            }
        },
        hoveredCell: {
            get: function () {
                return this.hoverIndex;
            },
            set: function (cellIdx) {
                this.hoverIndex = cellIdx;
                //console.log('hoveredCell: ' + this.hoverIndex);
            }
        }
    },
    methods: {
        initGame: function () {
            this.clearIndexes();
            this.currNum = 1;
            this.makeCells(this.gridSize * this.gridSize);
            this.updateSymbolTurns();
            this.updateSymbolSpins();
            this.trace = [];
            this.stats.clear();
            this.shuffleCells(1000);
            //console.log('init game');
        },
        startGame: function () {
            this.initGame();
            this.gameStarted = true;
            //console.log('start game');
        },
        stopGame: function () {
            this.clearIndexes();
            clearTimeout(this.selectedTimerId);
            this.stats.stopTime = new Date();
            this.gameStarted = false;
        },
        clearIndexes: function () {
            this.hoverIndex = -1;
            this.selectIndex = -1;
            this.correctIndex = -1;
        },
        nextTurn: function () {
            if (this.selectedCell >= 0 && this.selectedCell < this.cells.length) {
                if (this.cells[this.selectedCell].number === this.currNum) {      // correct answer
                    this.stats.correctHits ++;
                    this.correctIndex = this.indexOfCellByNumber(this.currNum);
                    this.currNum++;
                    if (this.currNum > this.cells.length) {
                        this.stopGame();
                        //alert('Game Over!');
                        this.execDialog('stats');
                        //this.startGame();
                        //console.log('game over!')
                        //setTimeout(this.initGame, 1000);
                    }
                } else {
                    this.stats.wrongHits ++;
                    this.correctIndex = -1;
                }
            }
        },
        indexOfCellByNumber: function (number) {
            var index = -1;
            for (var i = 0; i < this.cells.length; i++) {
                if (this.cells[i].number === number) {
                    index = i;
                    break;
                }
            }
            return index;
        },
        tracedCell: function (cellIdx) {
            return this.cells[cellIdx].number < this.currNum
        },
        makeRange: function (begin, end) {
            //range = Array.from({length: val}, (v, k) => k);
            var range = [];
            for (var i = begin; i <= end; i++) {
                range.push(i);
            }
            return range;
        },
        makeCells: function (n) {
            var range = [];
            for (var i = 1; i <= n; i++) {
                range.push(new Cell(i));
            }
            this.cells = range;
        },
        shuffleCells: function (shuffleCount) {
            for (var i = 0; i < shuffleCount; i++) {
                var aIdx = Math.floor(Math.random() * this.cells.length);
                var bIdx = Math.floor(Math.random() * this.cells.length);
                var aVal = this.cells[aIdx];
                this.cells[aIdx] = this.cells[bIdx];
                this.cells[bIdx] = aVal;
            }
        },
        hideSelect: function () {
            this.showHitResult = false;
            //console.log('showHitResult timeout');
        },
        execDialog: function (tabName) {
            this.changeDialogTab(tabName)
            this.stats.stopTime = new Date();
            this.dialogShowed = true;
        },
        changeDialogTab: function (tabName) {
            this.statsTabVisible = false;
            this.settingsTabVisible = false;

            if (tabName == 'stats') {
                this.statsTabVisible = true;
            } else {
                this.settingsTabVisible = true;
            }
        },
        hideDialog: function () {
            this.dialogShowed = false;
            if (!this.gameStarted) {
                this.startGame();
            }
        },
        changeGridSize: function (event) {
            var val = parseInt(event.target.value);
            if (!isNaN(val) && val >= 2 && val <= 9) {
                this.gridSize = val;
            }
        },
        updateSymbolSpins: function () {
            for (var i = 0; i < this.cells.length; i++) {
                this.cells[i].cssClasses['spin-left'] = false;
                this.cells[i].cssClasses['spin-right'] = false;
                if (this.spinSymbols) {
                    var rnd = Math.floor(Math.random() * 2);
                    if (rnd === 0) {
                        this.cells[i].cssClasses['spin-left'] = true;
                    } else {
                        this.cells[i].cssClasses['spin-right'] = true;
                    }
                }
            }
        },
        updateSymbolTurns: function () {
            for (var i = 0; i < this.cells.length; i++) {
                this.cells[i].cssClasses['rotate-90'] = false;
                this.cells[i].cssClasses['rotate-180'] = false;
                this.cells[i].cssClasses['rotate-270'] = false;
                if (this.turnSymbols) {
                    var rnd = Math.floor(Math.random() * 4);
                    switch (rnd) {
                        case 0:
                            this.cells[i].cssClasses['rotate-90'] = true;
                            break;
                        case 1:
                            this.cells[i].cssClasses['rotate-180'] = true;
                            break;
                        case 2:
                            this.cells[i].cssClasses['rotate-270'] = true;
                            break;
                        default:
                            // no turn
                    }
                }
            }
        }

    }
});
