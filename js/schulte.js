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
    this.colorStyle = 'color: black';
}

function Point(x, y) {
    this.x = x;
    this.y = y;
}

function Click(x, y, correct) {
    this.x = x;
    this.y = y;
    this.correct = correct;
}

var appData = {
    gridSize: 5,
    gridRange: [0, 1, 2, 3, 4],
    cells: [], // array of Cell
    trace: [],

    groupCount: 1,
    groups: [],
    currGroup: 0,
    currNum: 1,
    currNums: [],
    groupColorStyles: ['color: green', 'color: red', 'color: blue', 'color: magenta', 'color: brown'],

    gameStarted: false,

    hoverIndex: -1,
    clickIndex: -1,
    correctIndex: -1,

    showHover: true,
    showClickResult: true,
    showClickAnimation: true,
    showTrace: true,
    shuffleSymbols: false,
    turnSymbols: false,
    spinSymbols: false,

    mouseTracking: false,
    mouseMoves: [],   // array of Point
    mouseClicks: [],  // array of Click

    rowHeight: '20%',
    colWidth: '20%',
    selectTimeOut: 500,
    selectedTimerId: -1,

    dialogShowed: false,
    settingsTabVisible: true,
    statsTabVisible: false,
    mousemapTabVisible: false,

    stats: {
        startTime: new Date(),
        stopTime: new Date(),
        correctClicks: 0,
        wrongClicks: 0,
        clear: function () {
            this.startTime = new Date();
            this.stopTime = new Date();
            this.correctClicks = 0;
            this.wrongClicks = 0;
        },
        timeDiff: function () {
            var diff = (this.stopTime - this.startTime); // milliseconds between
            diff = diff / 1000;
            var seconds = Math.floor(diff % 60);
            diff = diff / 60;
            var minutes = Math.floor(diff % 60);
            diff = diff / 60;
            var hours = Math.floor(diff % 24);

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
        if (this.dialogShowed && this.mousemapTabVisible) {
            this.drawMousemap();
        }
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

            this.initGame();
        },
        spinSymbols: function (val) {
            this.updateSymbolSpins();
        },
        turnSymbols: function (val) {
            this.updateSymbolTurns();
        }
    },
    computed: {
        clickedCell: function () {
            return this.clickIndex;
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
            this.gameStarted = false;
            this.clearIndexes();
            this.currNum = 1;
            this.makeCells(this.gridSize * this.gridSize);
            this.shuffleCells(1000);
            this.updateSymbolTurns();
            this.updateSymbolSpins();
            this.trace = [];
            this.stats.clear();
            this.mouseMoves.length = 0;
            this.mouseClicks.length = 0;
            this.mouseTracking = false;
        },
        startGame: function () {
            this.initGame();
            this.startMouseTracking();
            this.gameStarted = true;
        },
        stopGame: function () {
            this.clearIndexes();
            clearTimeout(this.selectedTimerId);
            this.stats.stopTime = new Date();
            this.gameStarted = false;
            this.stopMouseTracking();
        },
        clearIndexes: function () {
            this.hoverIndex = -1;
            this.clickIndex = -1;
            this.correctIndex = -1;
        },
        setClickedCell: function (cellIdx, event) {
            if (this.gameStarted) {
                this.clickIndex = cellIdx;
                if (this.showClickResult) {
                    if (this.showClickAnimation) {
                        clearTimeout(this.selectedTimerId);
                    }
                    this.showClickAnimation = true;
                    this.selectedTimerId = setTimeout(this.hideSelect, this.selectTimeOut);
                } else {
                    this.showClickAnimation = false;
                }

                // append mouseClick
                if (this.mouseTracking) {
                    var nx = event.pageX / this.$el.clientWidth;  // normalize in [0, 1] interval
                    var ny = event.pageY / this.$el.clientHeight;
                    this.mouseClicks.push(new Click(nx, ny, this.isCellCorrect(this.clickIndex)));
                }

                this.nextTurn();
            }
        },
        nextTurn: function () {
            if (this.clickIndex >= 0 && this.clickIndex < this.cells.length) {
                if (this.isCellCorrect(this.clickIndex)) {
                    this.stats.correctClicks ++;
                    if (this.shuffleSymbols) {
                        this.shuffleCells(1000);
                    }
                    this.correctIndex = this.indexOfCellByNumber(this.currNum);
                    this.clickIndex = this.correctIndex;
                    this.currNum++;
                    if (this.currNum > this.cells.length) {
                        this.stopGame();
                        this.execDialog('stats');
                    }
                } else {
                    this.stats.wrongClicks ++;
                    this.correctIndex = -1;
                }
            }
        },
        isCellCorrect: function (cellIdx) {
            return this.cells[cellIdx].number === this.currNum;
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
            this.showClickAnimation = false;
            //console.log('showClickAnimation timeout');
        },
        execDialog: function (tabName) {
            this.changeDialogTab(tabName);
            this.stats.stopTime = new Date();
            this.dialogShowed = true;
            this.stopMouseTracking();
        },
        changeDialogTab: function (tabName) {
            this.statsTabVisible = false;
            this.settingsTabVisible = false;
            this.mousemapTabVisible = false;

            if (tabName === 'stats') {
                this.statsTabVisible = true;
            } else if (tabName === 'mousemap') {
                this.mousemapTabVisible = true; // see 'updated' section
                //this.drawMousemap();
            } else {
                this.settingsTabVisible = true;
            }
        },
        hideDialog: function () {
            this.dialogShowed = false;
            if ( ! this.gameStarted) {
                this.startGame();
            } else {
                this.restartMouseTracking();
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
        },
        startMouseTracking: function () {
            this.mouseMoves.length = 0;
            this.mouseClicks.length = 0;
            this.mouseTracking = true;
        },
        restartMouseTracking: function () {
            this.mouseTracking = true;
        },
        stopMouseTracking: function () {
            this.mouseTracking = false;
        },
        appendMouseMove: function(event) {
            if (this.mouseTracking) {
                var nx = event.clientX / this.$el.clientWidth;  // normalize in [0, 1] interval
                var ny = event.clientY / this.$el.clientHeight;
                this.mouseMoves.push(new Point(nx, ny));
            }
        },
        drawMousemap: function () {
            var canvas = this.$refs['mousemap_canvas']; // if mousemapTab visible
             if (canvas) {
                var ctx = canvas.getContext('2d');
                if (ctx) {
                    // clear canvas
                    var W = canvas.width;
                    var H = canvas.height;
                    ctx.fillStyle = 'white';
                    ctx.clearRect(0, 0, W, H);

                    this.drawMousemapGrid(ctx, W, H);
                    this.drawMousemapMoves(ctx, W, H);
                    this.drawMousemapClicks(ctx, W, H)
                }
            }
        },
        drawMousemapGrid: function (ctx, W,  H) {
            if (ctx && this.gridSize > 0) {
                var rowH = H / this.gridSize;
                var colW = W / this.gridSize;
                ctx.strokeStyle = '#ccc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (var i = 1; i < this.gridSize; i ++) {
                    ctx.moveTo(i*colW, 0);
                    ctx.lineTo(i*colW, H);
                    ctx.moveTo(0, i*rowH);
                    ctx.lineTo(W, i*rowH);
                }
                ctx.stroke();
                ctx.closePath();
            }
        },
        drawMousemapMoves: function (ctx, W,  H) {
            if (ctx) {
                ctx.beginPath();
                ctx.strokeStyle = '#1f6ef7'; //'#f78383';
                ctx.lineWidth = 2;
                for (var i = 0; i + 1 < this.mouseMoves.length; i ++) {
                    var x0 = this.mouseMoves[i].x * W;
                    var y0 = this.mouseMoves[i].y * H;
                    var x1 = this.mouseMoves[i+1].x * W;
                    var y1 = this.mouseMoves[i+1].y * H;
                    ctx.moveTo(x0, y0);
                    ctx.lineTo(x1, y1);
                }
                ctx.stroke();
                ctx.closePath();
            }
        },
        drawMousemapClicks: function (ctx, W,  H) {
            if (ctx) {
                ctx.lineWidth = 2;
                var radius = 5;
                for (var i = 0; i < this.mouseClicks.length; i ++) {
                    var centerX = this.mouseClicks[i].x * W;
                    var centerY = this.mouseClicks[i].y * H;
                    ctx.beginPath();
                    if (this.mouseClicks[i].correct) {
                        ctx.fillStyle = '#52a352'; //'#6ac46a';
                        ctx.strokeStyle = '#52a352';
                    } else {
                        ctx.fillStyle = '#ba2a29'; //'#f44f4d';
                        ctx.strokeStyle = '#ba2a29';
                    }
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
                    ctx.fill();
                    ctx.stroke();
                    ctx.closePath();
                }
            }
        }
    }
});
