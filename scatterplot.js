

document.addEventListener('DOMContentLoaded', function (e) { // we wrap in DOMContentLoaded to make sure everything has loaded before we run anything


    // variable initialization
    constants.plotId = 'geom_point.points.66.1';
    window.position = new Position(-1, -1);
    window.plot = new ScatterPlot();
    constants.chartType = "scatterplot";
    let audio = new Audio();
    let display = new Display();
    let point = new Point();
    let lastPlayed = '';

    // control eventlisteners
    constants.svg_container.addEventListener("keydown", function (e) {
        let updateInfoThisRound = false;

        // right arrow 39
        if (e.which === 39) {
            if (e.ctrlKey || e.metaKey) {
                if (e.shiftKey) {
                    Autoplay('right');
                } else {
                    position.x = plot.numPoints - 1;
                }
            } else {
                position.x += 1;
            }
            updateInfoThisRound = true;
        }

        // left arrow 37
        if (e.which === 37) {
            if (e.ctrlKey || e.metaKey) {
                if (e.shiftKey) {
                    Autoplay('left');
                } else {
                    position.x = 0;
                }
            } else {
                position.x -= 1;
            }
            updateInfoThisRound = true;
        }

        lockPosition();

        // update text, display, and audio
        if (updateInfoThisRound) {
            UpdateAll();
        }
    });


    constants.brailleInput.addEventListener("keydown", function (e) {
        let updateInfoThisRound = false;

        // @TODO

        if (e.which == 9) {
        } else if (e.which == 39) { // right arrow
            if (e.target.selectionStart > e.target.value.length - 2) {
                e.preventDefault();
            } else {
                position.x += 1;
            }
            updateInfoThisRound = true;
        } else if (e.which == 37) { // left
            position.x -= 1;
            updateInfoThisRound = true;
        } else {
            e.preventDefault();
        }

        lockPosition();

        if (updateInfoThisRound) {
            UpdateAllBraille();
        }
    });

    document.addEventListener("keydown", function (e) {

        // B: braille mode
        if (e.which == 66) {
            display.toggleBrailleMode();
            e.preventDefault();
        }
        // T: aria live text output mode
        if (e.which == 84) {
            display.toggleTextMode();
        }
        // S: sonification mode
        if (e.which == 83) {
            display.toggleSonificationMode();
        }

        // space: replay info but no other changes
        if (e.which === 32) {
            UpdateAll();
        }

        // ctrl/cmd: stop autoplay
        if (e.which == 17 || e.which == 91) {
            constants.KillAutoplay();
        }

        if (e.ctrlKey || e.metaKey) {

            // (ctrl/cmd)+(home/fn+left arrow): first element
            if (e.which == 36) {
                position.x = 0;
                position.y = 0;
                UpdateAll();
            }

            // (ctrl/cmd)+(end/fn+right arrow): last element
            else if (e.which == 35) {
                position.x = plot.num_cols - 1;
                position.y = plot.num_rows - 1;
                UpdateAll();
            }
        }

        // period: speed up
        if (e.which == 190) {
            constants.SpeedUp();
            if (constants.autoplayId != null) {
                constants.KillAutoplay();
                Autoplay(lastPlayed);
            }
        }

        // comma: speed down
        if (e.which == 188) {
            constants.SpeedDown();
            if (constants.autoplayId != null) {
                constants.KillAutoplay();
                Autoplay(lastPlayed);
            }
        }
    });

    // helper functions
    function lockPosition() {
        // lock to min / max postions
        if (position.x < 0) {
            position.x = 0;
        }
        if (position.x > plot.numPoints - 1) {
            position.x = plot.numPoints - 1;
        }
    }

    function UpdateAll() {
        if (constants.showDisplay) {
            display.displayValues(plot);
        }
        if (constants.showRect) {
            point.UpdatePointDisplay();
        }
        if (constants.audioPlay) {
            plot.PlayTones(audio);
        }
    }

    function UpdateAllAutoplay() {
        if (constants.showDisplayInAutoplay) {
            display.displayValues(plot);
        }
        if (constants.showRect) {
            point.UpdatePointDisplay();
        }
        if (constants.audioPlay) {
            plot.PlayTones(audio);
        }
        if (constants.brailleMode != "off") {
            display.UpdateBraillePos(plot);
        }
    }
    function UpdateAllBraille() {
        if (constants.showDisplayInBraille) {
            display.displayValues(plot);
        }
        if (constants.showRect) {
            point.UpdatePointDisplay();
        }
        if (constants.audioPlay) {
            plot.PlayTones(audio);
        }
        display.UpdateBraillePos(plot);
    }

    function Autoplay(dir) {
        lastPlayed = dir;
        let step = 1; // default right and down
        if (dir == "left") {
            step = -1;
        }

        // clear old autoplay if exists
        if (constants.autoplayId != null) {
            constants.KillAutoplay();
        }

        constants.autoplayId = setInterval(function () {
            position.x += step;
            if (position.x < 0 || plot.numPoints - 1 < position.x) {
                constants.KillAutoplay();
                lockPosition();
            } else {
                UpdateAllAutoplay();
            }
        }, constants.autoPlayRate);
    }

});

class ScatterPlot {
    constructor() {
        this.groupLabels = this.getGroupLabels();

        // layer = 0
        this.plotPoints = document.querySelectorAll('#' + constants.plotId.replaceAll('\.', '\\.') + ' > use');
        this.svgPointsX = this.getSvgPointCoords()[0];
        this.svgPointsY = this.getSvgPointCoords()[1];
        this.x = this.getPointValues()[0];
        this.y = this.getPointValues()[1];

        // layer = 1
        this.bestFitLinePoints = this.getBestFitLinePoints();
        this.numPoints = this.x.length;

    }

    getGroupLabels() {
        let labels_nodelist = document.querySelectorAll('tspan[dy="7.88"]');

        let labels = [];
        labels.push(labels_nodelist[0].innerHTML, labels_nodelist[1].innerHTML);

        return labels;
    }

    getSvgPointCoords() {
        let points = new Map();

        for (let i = 0; i < this.plotPoints.length; i++) {
            let x = parseFloat(this.plotPoints[i].getAttribute('x'));
            let y = parseFloat(this.plotPoints[i].getAttribute('y'));
            if (!points.has(x)) {
                points.set(x, new Set([y]));
            } else {
                points.get(x).add(y);
            }
        }

        points = new Map([...points].sort(function (a, b) { return a[0] - b[0] }));

        points.forEach(function (value, key) {
            points[key] = Array.from(value).sort(function (a, b) { return a - b });
        });

        let X = [...points.keys()];

        let Y = [];
        for (let i = 0; i < X.length; i++) {
            Y.push(points[X[i]]);
        }

        return [X, Y];
    }

    getPointValues() {
        // x values
        let xValues = [...displ];
        // for panning
        constants.minX = 0;
        constants.maxX = xValues.length;

        // y values
        let yValues = [...hwy];
        // default layer: point layer 
        // constants.minY & maxY should be adjusted according to layer
        constants.minY = Math.min([...yValues]);
        constants.maxY = Math.max([...yValues]);

        let points = new Map();

        for (let i = 0; i < xValues.length; i++) {
            let x = parseFloat(xValues[i]);
            let y = parseFloat(yValues[i]);
            if (!points.has(x)) {
                points.set(x, new Set([y]));
            } else {
                points.get(x).add(y);
            }
        }

        points = new Map([...points].sort(function (a, b) { return a[0] - b[0] }));

        points.forEach(function (value, key) {
            points[key] = Array.from(value).sort(function (a, b) { return a - b });
        });

        let X = [...points.keys()];

        let Y = [];
        for (let i = 0; i < X.length; i++) {
            Y.push(points[X[i]]);
        }

        return [X, Y];
    }

    PlayTones(audio) {
        if (constants.layer == 0) { // points layer
            if (plot.y[position.x].length == 1) {
                audio.playTone();
            } else {
                // we play a run of tones
                position.z = 0;
                let interval = setInterval(function () {
                    // play this tone
                    audio.playTone();

                    // and then set up for the next one
                    position.z += 1;

                    // and kill if we're done
                    if (position.z + 1 > plot.y[position.x].length) {
                        clearInterval(interval);
                        position.z = -1;
                    }

                }, constants.autoPlayPointsRate);
            }
        } else if (constants.layer == 1) { // best fit line layer

        }
    }

    getBestFitLinePoints() {
        let points = [];

        for (let i = 0; i < displ.length; i++) {
            if (!points.map(({ x }) => x).includes(displ[i]))
                points.push({ 'x': displ[i], 'y': prediciton_array[i] });
        }

        points.sort(function (a, b) { return a.y - b.y });
        points.sort(function (a, b) { return a.x - b.x });

        constants.minY = Math.min(...prediciton_array);
        constants.maxY = Math.max(...prediciton_array);

        return points.map(({ y }) => y);
    }
};

class Point {
    constructor() {
        this.x = plot.svgPointsX[0];
        this.y = plot.svgPointsY[0];
        this.strokeWidth = 1.35;
    }

    async UpdatePoints() {
        await this.ClearPoints();
        this.x = plot.svgPointsX[position.x];
        this.y = plot.svgPointsY[position.x];
    }

    async PrintPoints() {
        await this.ClearPoints();
        await this.UpdatePoints();
        for (let i = 0; i < this.y.length; i++) {
            const svgns = "http://www.w3.org/2000/svg";
            var point = document.createElementNS(svgns, 'circle');
            point.setAttribute('class', 'highlight_point');
            point.setAttribute('cx', this.x);
            point.setAttribute('cy', constants.svg.getBoundingClientRect().height - this.y[i]);
            point.setAttribute('r', 3.95);
            point.setAttribute('stroke', constants.colorSelected);
            point.setAttribute('stroke-width', this.strokeWidth);
            point.setAttribute('fill', constants.colorSelected);
            constants.svg.appendChild(point);
        }
    }

    async ClearPoints() {
        let points = document.getElementsByClassName('highlight_point');
        for (let i = 0; i < points.length; i++) {
            document.getElementsByClassName('highlight_point')[i].remove();
        }
    }

    UpdatePointDisplay() {
        this.ClearPoints();
        this.UpdatePoints();
        this.PrintPoints();
    }
}
