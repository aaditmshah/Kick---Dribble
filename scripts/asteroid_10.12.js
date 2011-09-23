/*
    Asteroid | The html5 powered, packaged javascript game engine!
    Copyright (C) 2010 Aadit M Shah

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
    The asteroid engine, along with all its dependencies is packaged into
    a single javascript file. This is done to ensure that the engine will
    work as it is expected to. The API exposed by the engine is formally
    known as the Blanc Canvas API.

    The ASTEROID global encapsulates all the modules and dependencies of
    the asteroid engine. This ensures that they don't conflict with other
    libraries used by the programmer.
*/

ASTEROID = {

/*
    The start method is used to get the asteroid engine to start running.
    It accepts a single argument: the config object, which is used to pass
    parameters to initialize the engine. If no argument is passed, the
    engine selects the default parameters. If a certain parameter is
    missing, the engine selects the default value of that parameter. If
    the engine encounters any exceptional condition during the execution
    of this method, it throws an error message back to the calling scope.

    The parameters used to initialize the engine are listed in
    alphabetical order as follows:

    autoFullscreen     - If set to true, the canvas resizes to fullscreen
                         when the fullscreen mode is detected. The default
                         value is false.

    captureScreenshots - If set to true, the user can take screenshots of
                         the canvas states by releasing the F9 key. The
                         screenshot is saved to a local database on the
                         user's hard disk and can be accessed by the
                         program via the Blanc Canvas API. The default
                         value is false.

    easelElement       - It's the container element of the webgl and 2d
                         canvas elements. The container element allows CSS
                         properties to be set on the canvas elements. Its
                         nomenclature is derived from the fact that it's
                         the easel on which the canvas is mounted. The
                         default container element used is the HTML body
                         element.

    easelWidth         - It's used to set the initial size of the canvas
                         elements. It's so call because a canvas can only
                         be as big as the easel holding it. The height of
                         the canvas is automatically calculated from the
                         specified width. This is used to ensure that the
                         canvas elements always maintain a certain aspect
                         ratio, which is the aspect ratio of the client's
                         screen. The default value is 800.

    webglDisabled      - If set to true, the webgl canvas is not appended
                         to the easelElement and the ASTEROID initialize
                         function is called with the second argument set
                         to false. It's used to create 2d games. The
                         default value is false.
*/

    start: function (config) {

        try {

            if (!document.createElement("canvas").getContext) {
                throw "CANVAS_NOT_SUPPORTED";
            }

            config                    = config                    || {};
            config.autoFullscreen     = config.autoFullscreen     || false;
            config.captureScreenshots = config.captureScreenshots || false;
            config.easelElement       = config.easelElement       || document.body;
            config.easelWidth         = config.easelWidth         || 800;
            config.webglDisabled      = config.webglDisabled      || false;

/*
    The following code is the core of the engine. It's an anonymous
    function constructor which is immediately invoked to create a new
    object. Thus it enables private members (closures) to be created. The
    object itself is the manifestation of a canvas. It provides a simple
    API, formally known as the Blanc Canvas API, to handle canvas
    operations. It's not explicitly stored in a variable, but the object's
    this pointer is stored in the closure "that", which is passed onto
    other functions as an argument.
*/

            (new function () {

                var activePainter = null;                                                   //the name of the currently active painter object

                var aspectRatio = screen.width / screen.height;                             //the aforementioned aspect ratio of the client's screen

                var defaultHandler = function () {};                                        //the empty default event handler function

                var DOMStrings = ["click", "dblclick", "mousedown", "mouseup", "mouseover", //the mouse events' DOMStrings
                "mouseout", "mousemove"];

                var firefox = navigator.userAgent.indexOf("Firefox") > 0;                   //firefox devours a one pixel height row in fullscreen mode

                var fixedPosition = null;                                                   //the absolute position of the canvas elements

                var fixedWidth = config.easelWidth;                                         //the most recent width of the canvas elements when not in fullscreen mode -
                                                                                            //used to reset the size of the canvas elements when exiting fullscreen mode

                var fontSize = 10;                                                          //the font size of the 2d canvas context
                var fontFamily = "sans-serif";                                              //the font family of the 2d canvas context

                var fullscreenMode = false;                                                 //is the size of the canvas fullscreen

                var i;                                                                      //for loop counter variable i
                var j;                                                                      //for loop counter variable j

                var mousePosition = {                                                       //the last known mouse position over the canvas
                    x: -1,
                    y: -1
                };

                var gl = document.createElement("canvas").getContext("experimental-webgl"); //the webgl context of the first canvas

                var painters = {};                                                          //a hashtable of all the painter objects
                var paths = {};                                                             //a hashtable of all the paths in the current painter

                var supervisorMode = false;                                                 //is the canvas being resized by the engine or the user

                var td = document.createElement("canvas").getContext("2d");                 //the 2d context of the second canvas

                var that = this;                                                            //the aforementioned this pointer closure

                var webglPallete = gl && !config.webglDisabled;                             //is webgl enabled, and supported by the client

/*
    In the beginning we only initialize the 2d canvas. Thus if the client
    doesn't support webgl, we don't initialize the wegbl canvas.
*/

                config.easelElement.appendChild(td.canvas);

                this.width = td.canvas.width = fixedWidth;
                this.height = td.canvas.height = fixedWidth / aspectRatio;

                td.canvas.style.position = webglPallete ? "absolute" : "relative";

                td.canvas.style.left = "0px";
                td.canvas.style.top = "0px";

                this.resize = function (width) {
                    if (!supervisorMode) {
                        if (fullscreenMode || width === fixedWidth) {
                            throw "CANNOT_RESIZE_CANVAS";
                        } else {
                            fixedWidth = width;
                        }
                    }

                    var height = width / aspectRatio - ((firefox && fullscreenMode) ? 1 : 0);

                    this.width = td.canvas.width = width;
                    this.height = td.canvas.height = height;

                    if (webglPallete) {
                        gl.canvas.width = width;
                        gl.canvas.height = height;
                        fixPosition();
                    }

                    if (activePainter) {
                        painters[activePainter].paint();
                    }
                };

                if (config.autoFullscreen) {
                    function toggleFullscreen() {
                        var isFullscreen = (window.innerWidth === screen.width && window.innerHeight === screen.height - (firefox ? 1 : 0));

                        supervisorMode = true;

                        if (isFullscreen && !fullscreenMode) {
                            fullscreenMode = true;
                            if (webglPallete) {
                                gl.canvas.style.position = "absolute";
                                td.canvas.style.left = "0px";
                                td.canvas.style.top = "0px";
                            } else {
                                td.canvas.style.position = "absolute";
                                fixedPosition = ASTEROID.getPosition(td.canvas);
                            }
                            that.resize(screen.width);
                        } else if (!isFullscreen && fullscreenMode) {
                            fullscreenMode = false;
                            if (webglPallete) {
                                gl.canvas.style.position = "relative";
                            } else {
                                td.canvas.style.position = "relative";
                                fixedPosition = ASTEROID.getPosition(td.canvas);
                            }
                            that.resize(fixedWidth);
                        }

                        supervisorMode = false;
                    }

                    window.addEventListener("resize", function () {
                        toggleFullscreen();
                    }, false);

                    window.addEventListener("load", function () {
                        toggleFullscreen();
                    }, false);
                }

                if (config.captureScreenshots) {
                    var buffer = null;
                    var db = null;

                    this.screenshots = [];

                    if (window.indexedDB) {
                        window.indexedDB.open("asteroidDB", "game engine database").onsuccess = function (event) {
                            db = event.result;

                            if (db.version === "") {
                                db.setVersion("1.0").onsuccess = function () {
                                    db.createObjectStore("screenshots", "no", true);
                                };
                            } else {
                                db.transaction(["screenshots"], IDBTransaction.READ_ONLY).objectStore("screenshots").openCursor().onsuccess = function (event) {
                                    if (event.result) {
                                        that.screenshots.push(event.result.value.dataURL);
                                    }
                                };
                            }
                        };
                    } else if (window.openDatabase) {
                        db = window.openDatabase("asteroidDB", "", "game engine database", 5120);

                        if (db.version === "") {
                            db.changeVersion(db.version, "1.0", function (tx) {
                                tx.executeSql("CREATE TABLE screenshots (no INTEGER PRIMARY KEY, dataURL TEXT);");
                            }, null, null);
                        } else {
                            db.readTransaction(function (tx) {
                                tx.executeSql("SELECT * FROM screenshots;", [], function (tx, results) {
                                    var rows = results.rows;

                                    for (i = 0; i < rows.length; i++) {
                                        that.screenshots.push(rows.item(i).dataURL);
                                    }
                                });
                            });
                        }
                    }

                    if (webglPallete) {
                        buffer = document.createElement("canvas").getContext("2d");
                    }

                    function captureScreenshot() {
                        if (db) {
                            var dataURL = null;

                            if (webglPallete) {
                                buffer.canvas.width = that.width;
                                buffer.canvas.height = that.height;

                                buffer.clearRect(0, 0, that.width, that.height);

                                buffer.drawImage(gl.canvas, 0, 0);
                                buffer.drawImage(td.canvas, 0, 0);

                                dataURL = buffer.canvas.toDataURL();
                            } else {
                                dataURL = td.canvas.toDataURL();
                            }

                            if (window.indexedDB) {
                                var tx = db.transaction(["screenshots"], IDBTransaction.READ_WRITE);
                                tx.objectStore("screenshots").add({
                                    dataURL: dataURL
                                }).onerror = function () {
                                    tx.abort();
                                };
                            } else {
                                db.transaction(function (tx) {
                                    tx.executeSql("INSERT INTO screenshots VALUES (?, ?);", [that.screenshots.length, dataURL]);
                                });
                            }

                            that.screenshots.push(dataURL);
                        }
                    }

                    window.addEventListener("keyup", function (event) {
                        if (event.keyCode === 120) {
                            captureScreenshot();
                        }
                    }, false);
                }

                fixedPosition = ASTEROID.getPosition(td.canvas);

/*
    The createPainter method is used to create new painter objects. Each
    painter object corresponds to a unique screen or 3d scene of the game.
    It takes two arguments: a painterName to uniquely identify the painter
    object, and a painterFunction to callback when the paint method of the
    painter object is called. The painterFunction is called back with two
    arguments: the Blanc Canvas object and the 2d canvas context. However
    if the client supports webgl a third argument, the webgl canvas
    context, is also passed.
*/

                this.createPainter = function (painterName, painterFunction) {
                    painters[painterName] = (new function () {
                        this.path = {};

/*
    The paint method is used to callback the painterFunction with the
    Blanc Canvas object and the canvas contexts. It also points the active
    painter object to the current painter and copies the active paths into
    the paths object.
*/

                        this.paint = function () {
                            paths = this.path;
                            activePainter = painterName;
                            if (webglPallete) {
                                painterFunction(that, td, gl);
                            } else {
                                painterFunction(that, td);
                            }
                        };

/*
    The addPath method creates and returns a new path object. If the
    painter is active, it also appends it to the active paths object. It
    takes three arguments: the pathName to map the path, the pathData to
    determine the path, and the closePath flag to specify whether the path
    must be closed or not.
*/

                        this.addPath = function (pathName, pathData, closePath) {
                            this.path[pathName] = (new function () {
                                this.hover = false;

/*
    The focus function is used to set the path of the 2d canvas. It throws
    an exception if it encounters an invalid subpath name.
*/

                                function focus() {
                                    td.beginPath();

                                    for (i = 0; i < pathData.length; i++) {
                                        var subPathData = pathData[i];                      //the data about the current path
                                        var subPathName = subPathData[0];                   //the name of the current path

                                        switch (subPathName) {
                                        case "moveTo":
                                        case "lineTo":
                                            td[subPathName](subPathData[1], subPathData[2]);
                                            break;
                                        case "rect":
                                        case "quadraticCurveTo":
                                            td[subPathName](subPathData[1], subPathData[2], subPathData[3], subPathData[4]);
                                            break;
                                        case "bezierCurveTo":
                                        case "arc":
                                            td[subPathName](subPathData[1], subPathData[2], subPathData[3], subPathData[4], subPathData[5], subPathData[6]);
                                            break;
                                        case "arcTo":
                                            td[subPathName](subPathData[1], subPathData[2], subPathData[3], subPathData[4], subPathData[5]);
                                            break;
                                        default:
                                            throw "INVALID_SUBPATH_NAME";
                                        }
                                    }

                                    if (closePath) {
                                        td.closePath();
                                    }
                                }

/*
    The fill method is used to fill in the path.
*/

                                this.fill = function () {
                                    focus();
                                    td.fill();
                                };

/*
    The stroke method is used to outline the path.
*/

                                this.stroke = function () {
                                    focus();
                                    td.stroke();
                                };

/*
    The clip method is used to set the clipping path of the canvas to the
    current path.
*/

                                this.clip = function () {
                                    focus();
                                    td.clip();
                                };

/*
    The isPointInPath method is used to determine whether the specified
    point lies in the path or not. It takes two arguments: the x and y
    coordinates of the point to consider.
*/

                                this.isPointInPath = function (x, y) {
                                    focus();
                                    return td.isPointInPath(x, y);
                                };

                                if (this.isPointInPath(mousePosition.x, mousePosition.y)) {
                                    this.hover = true;
                                }

/*
    Initializing the default mouse event handlers of each path.
*/

                                for (i = 0; i < DOMStrings.length; i++) {
                                    this[DOMStrings[i]] = defaultHandler;
                                }
                            }());

                            if (activePainter === painterName) {
                                paths = this.path;
                            }

                            return this.path[pathName];
                        };

/*
    The removePath method destroys the specified path. If the painter is
    active, it also removes it from the active paths object. It takes one
    argument: the name of the path to remove.
*/

                        this.removePath = function (namePath) {
                            paths[namePath] = null;

                            if (activePainter === painterName) {
                                paths = this.path;
                            }
                        };
                    }());

                    return painters[painterName];
                };

/*
    The getPainter method returns the specified painter object. It accepts
    one argument: the name of the painter object to get.
*/

                this.getPainter = function (painterName) {
                    return painters[painterName];
                };

/*
    The getPath method returns the specified path object of the active
    painter. It accepts one argument: the name of the path object to get.
*/

                td.getPath = function (pathName) {
                    return paths[pathName];
                };

/*
    The addMouseEventListener function initializes the specified mouse
    event listener and its default event handler. It takes one argument:
    the index of the mouse event to initialize.
*/

                function addMouseEventListener(index) {
                    var DOMString = DOMStrings[index];

                    td.canvas.addEventListener(DOMString, function (event) {
                        event = {
                            x: event.pageX - fixedPosition.left,
                            y: event.pageY - fixedPosition.top
                        };

                        td.canvas[DOMString](event);

                        for (property in paths) {
                            var path = paths[property];

                            if (path.hover) {
                                path[DOMString](event);
                            }
                        }
                    }, false);
                }

/*
    The addHoverEventListener function initializes the specified mouse
    event listener and its default event handler. It takes one argument:
    the index of the mouse event to initialize.
*/

                function addHoverEventListener(index) {
                    var DOMString = DOMStrings[index];

                    td.canvas.addEventListener(DOMString, function (event) {
                        td.canvas[DOMString]({
                            x: event.pageX - fixedPosition.left,
                            y: event.pageY - fixedPosition.top
                        });
                    }, false);
                }

/*
    Initializing the mouse event listeners and its default event handlers.
*/

                for (i = 0; i < DOMStrings.length; i++) {
                    if (i < 4) {
                        addMouseEventListener(i);
                    } else if (i < 6) {
                        addHoverEventListener(i);
                    }

                    td.canvas[DOMStrings[i]] = defaultHandler;
                }

                td.canvas.addEventListener("mousemove", function (event) {
                    mousePosition = {
                        x: event.pageX - fixedPosition.left,
                        y: event.pageY - fixedPosition.top
                    };

                    td.canvas.mousemove(mousePosition);

                    for (property in paths) {
                        var path = paths[property];                                         //the current path of the painter object
                        var hover = path.isPointInPath(mousePosition.x, mousePosition.y);   //is the cursor hover above the path flag

                        if (hover) {
                            if (!path.hover) {
                                if (path.click.toString() !== defaultHandler) {
                                    td.canvas.style.cursor = "pointer";
                                }
                                path.mouseover(mousePosition);
                            }
                            path.mousemove(mousePosition);
                        } else if (path.hover) {
                            td.canvas.style.cursor = "default";
                            path.mouseout(mousePosition);
                        }

                        path.hover = hover;
                    }
                }, false);

/*
    The setFont method is used to set the font of the 2d canvas context.
    It takes two arguments: the size and family of the font to set to.
*/

                td.setFont = function (size, family) {
                    fontSize = size;
                    fontFamily = family;
                };

/*
    The fillTextBox method is used to fill text which wraps over multiple
    lines. It takes four arguments: the text to draw, the x and y
    coordinates to draw it at, and the maximum width of the each line.
*/

                td.fillTextBox = function (text, x, y, maxWidth) {
                    this.font = fontSize + "px " + fontFamily;

                    var words = text.split(" ");

                    var line = "";
                    var lineNumber = 0;

                    for (i = 0; i < words.length; i++) {
                        var word = words[i];
                        var wordLength = this.measureText(word).width;

                        var lineWidth = this.measureText(line).width;

                        if (lineWidth > 0 && lineWidth + wordLength > maxWidth) {
                            this.fillText(line, x, y + (fontSize * lineNumber));

                            line = "";
                            lineNumber++;
                        }

                        line += word + " ";
                    }

                    this.fillText(line, x, y + (fontSize * lineNumber));
                };

/*
    The strokeTextBox method is used to outline text which wraps over
    multiple lines. It takes four arguments: the text to draw, the x
    and y coordinates to draw it at, and the maximum width of the each
    line.
*/

                td.strokeTextBox = function (text, x, y, maxWidth) {
                    this.font = fontSize + "px " + fontFamily;

                    var words = text.split(" ");

                    var line = "";
                    var lineNumber = 0;

                    for (i = 0; i < words.length; i++) {
                        var word = words[i];
                        var wordLength = this.measureText(word).width;

                        var lineWidth = this.measureText(line).width;

                        if (lineWidth > 0 && lineWidth + wordLength > maxWidth) {
                            this.strokeText(line, x, y + (fontSize * lineNumber));

                            line = "";
                            lineNumber++;
                        }

                        line += word + " ";
                    }

                    this.strokeText(line, x, y + (fontSize * lineNumber));
                };

/*
    If the client doesn't support webgl or if webgl is disabled, call
    back the init method of ASTEROID with the Blanc Canvas object and
    the 2d canvas context, and throw an exception to prevent furthur
    propagation.
*/

                if (!webglPallete) {
                    ASTEROID.init(that, webglPallete);
                    throw "NO_WEBGL";
                }

/*
    The fixPosition function is used to perfectly position the 2d canvas
    over the webgl canvas.
*/

                function fixPosition() {

/*
    The following code is executed twice. This is done to perfectly
    position the 2nd canvas over the 1st, because the DOM incorrectly
    positions it in the first pass in some conditions for reasons I
    don't know.
*/

                    for (i = 0; i < 2; i++) {
                        fixedPosition = ASTEROID.getPosition(gl.canvas);

                        td.canvas.style.left = fixedPosition.left + "px";
                        td.canvas.style.top = fixedPosition.top + "px";
                    }

                }

                config.easelElement.appendChild(gl.canvas);

                gl.canvas.width = this.width;
                gl.canvas.height = this.height;

                gl.canvas.style.position = "relative";

                gl.canvas.style.left = "0px";
                gl.canvas.style.top = "0px";

                td.canvas.style.zIndex = "1";

                fixPosition();

                window.addEventListener("resize", function () {
                    fixPosition();
                }, false);

                var programs = {};
                var models = {};
                var textures = {};

                this.addProgram = function (programName, attributeList, uniformList, callback) {
                    var vs = null;
                    var fs = null;
                    var vsError = null;
                    var fsError = null;

                    function linkProgram() {
                        var linkErr = null;

                        programs[programName] = gl.createProgram();
                        gl.attachShader(programs[programName], vs);
                        gl.attachShader(programs[programName], fs);
                        gl.linkProgram(programs[programName]);

                        if (!gl.getProgramParameter(programs[programName], gl.LINK_STATUS)) {
                            linkErr = gl.getProgramInfoLog(programs[programName]);
                        }

                        programs[programName].linkErr = linkErr;
                        programs[programName].vsError = vsError;
                        programs[programName].fsError = fsError;

                        var attributes = {};
                        var uniforms = {};

                        for (i = 0; i < attributeList.length; i++) {
                            var attributeName = attributeList[i];

                            attributes[attributeName] = gl.getAttribLocation(programs[programName], attributeName);
                            gl.enableVertexAttribArray(attributes[attributeName]);
                        }

                        for (i = 0; i < uniformList.length; i++) {
                            var uniformName = uniformList[i];

                            uniforms[uniformName] = gl.getUniformLocation(programs[programName], uniformName);
                        }

                        programs[programName].getAttribute = function (attributeName) {
                            return attributes[attributeName];
                        };

                        programs[programName].getUniform = function (uniformName) {
                            return uniforms[uniformName];
                        };

                        callback();
                    }

                    ASTEROID.AJAX.get("shaders/" + programName + ".vs", function (response) {
                        vs = gl.createShader(gl.VERTEX_SHADER);
                        gl.shaderSource(vs, response);
                        gl.compileShader(vs);

                        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
                            vsError = gl.getShaderInfoLog(vs);
                        }

                        if (fs) {
                            linkProgram();
                        }
                    });

                    ASTEROID.AJAX.get("shaders/" + programName + ".fs", function (response) {
                        fs = gl.createShader(gl.FRAGMENT_SHADER);
                        gl.shaderSource(fs, response);
                        gl.compileShader(fs);

                        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                            fsError = gl.getShaderInfoLog(fs);
                        }

                        if (vs) {
                            linkProgram();
                        }
                    });
                };

                this.addModel = function (modelName, callback) {
                    ASTEROID.AJAX.get("models/" + modelName + ".json", function (response) {
                        var model = JSON.parse(response);
                        models[modelName] = {};

                        if (model.positions) {
                            models[modelName].positions = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].positions);
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.positions), gl.STATIC_DRAW);
                            models[modelName].length = model.positions.length / 3;
                        }

                        if (model.indices) {
                            models[modelName].indices = gl.createBuffer();
                            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, models[modelName].indices);
                            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STREAM_DRAW);
                            models[modelName].length = model.indices.length;
                        }

                        if (model.colors) {
                            models[modelName].colors = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].colors);
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.colors), gl.STATIC_DRAW);
                        }

                        if (model.texcoords) {
                            models[modelName].texcoords = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].texcoords);
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texcoords), gl.STATIC_DRAW);
                        }

                        if (model.normals) {
                            models[modelName].normals = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].normals);
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);
                        }

                        if (model.tangents) {
                            models[modelName].tangents = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].tangents);
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.tangents), gl.STATIC_DRAW);
                        }

                        if (model.bitangents) {
                            models[modelName].bitangents = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].bitangents);
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.bitangents), gl.STATIC_DRAW);
                        }

                        callback();
                    });
                };

                var sphere = {
                    texcoords: [],
                    indices: [],
                    normals: [],
                    tangents: [],
                    bitangents: []
                };

                for (i = 0; i <= 180; i++) {
                    var theta = i * Math.PI / 180;
                    var sin = Math.sin(theta);

                    for (j = 0; j <= 360; j++) {
                        var phi = j * Math.PI / 180;
                        var psi = phi + Math.PI / 2;

                        var x = sin * Math.cos(phi);
                        var y = Math.cos(theta);
                        var z = sin * Math.sin(phi);

                        var m = Math.cos(psi);
                        var n = Math.sin(psi);

                        var b = [x, y, z].cross([m, 0, n]);

                        sphere.texcoords.push(1 - (j / 360));
                        sphere.texcoords.push(1 - (i / 180));

                        sphere.normals.push(x);
                        sphere.normals.push(y);
                        sphere.normals.push(z);

                        sphere.tangents.push(m);
                        sphere.tangents.push(0);
                        sphere.tangents.push(n);

                        sphere.bitangents.push(b[0]);
                        sphere.bitangents.push(b[1]);
                        sphere.bitangents.push(b[2]);
                    }
                }

                for (i = 0; i < 180; i++) {
                    for (j = 0; j < 360; j++) {
                        var firstVertex = 361 * i + j;
                        var secondVertex = firstVertex + 361;

                        sphere.indices.push(firstVertex);
                        sphere.indices.push(secondVertex);
                        sphere.indices.push(firstVertex + 1);

                        sphere.indices.push(secondVertex);
                        sphere.indices.push(firstVertex + 1);
                        sphere.indices.push(secondVertex + 1);
                    }
                }

                this.createSphere = function (modelName, radius) {
                    models[modelName] = {};

                    models[modelName].positions = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].positions);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.normals.scale(radius)), gl.STATIC_DRAW);

                    models[modelName].indices = gl.createBuffer();
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, models[modelName].indices);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphere.indices), gl.STREAM_DRAW);
                    models[modelName].length = sphere.indices.length;

                    models[modelName].texcoords = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].texcoords);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.texcoords), gl.STATIC_DRAW);

                    models[modelName].normals = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].normals);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.normals), gl.STATIC_DRAW);

                    models[modelName].tangents = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].tangents);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.tangents), gl.STATIC_DRAW);

                    models[modelName].bitangents = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, models[modelName].bitangents);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.bitangents), gl.STATIC_DRAW);
                };

                this.addTexture = function (textureName, extension, filter, callback) {
                    var image = new Image();
                    image.onload = function () {
                        textures[textureName] = gl.createTexture();
                        gl.bindTexture(gl.TEXTURE_2D, textures[textureName]);
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

                        switch (filter) {
                        case Filter.NEAREST:
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                            break;
                        case Filter.LINEAR:
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                            break;
                        case Filter.MIPMAP:
                        default:
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                            gl.generateMipmap(gl.TEXTURE_2D);
                        }

                        gl.bindTexture(gl.TEXTURE_2D, null);

                        callback();
                    };
                    image.src = "textures/" + textureName + "." + extension;
                };

                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

                gl.getProgram = function (programName) {
                    return programs[programName];
                };

                gl.getModel = function (modelName) {
                    return models[modelName];
                };

                gl.getTexture = function (textureName) {
                    return textures[textureName];
                };

                var modelViews = [];

                gl.perspective = [
                    [1, 0, 0, 0],
                    [0, 1, 0, 0],
                    [0, 0, 1, 0],
                    [0, 0, 0, 1]
                ];

                gl.modelView = [
                    [1, 0, 0, 0],
                    [0, 1, 0, 0],
                    [0, 0, 1, 0],
                    [0, 0, 0, 1]
                ];

                gl.normalMatrix = [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1]
                ];

                gl.setIdentity = function () {
                    this.modelView = this.perspective = [
                        [1, 0, 0, 0],
                        [0, 1, 0, 0],
                        [0, 0, 1, 0],
                        [0, 0, 0, 1]
                    ];
                };

                gl.setNormal = function () {
                    this.normalMatrix = [
                        [this.modelView[0][0], this.modelView[0][1], this.modelView[0][2]],
                        [this.modelView[1][0], this.modelView[1][1], this.modelView[1][2]],
                        [this.modelView[2][0], this.modelView[2][1], this.modelView[2][2]]
                    ].inverse().transpose();
                };

                gl.save = function () {
                    modelViews.push(gl.modelView);
                };

                gl.restore = function () {
                    gl.modelView = modelViews.pop() || gl.modelView;
                };

                gl.Translate = function (x, y, z) {
                    var t = null;
                    if (z !== undefined) {
                        t = [
                            [1, 0, 0, x],
                            [0, 1, 0, y],
                            [0, 0, 1, z],
                            [0, 0, 0, 1]
                        ];
                    } else {
                        t = [
                            [1, 0, 0],
                            [0, 1, 0],
                            [x, y, 1]
                        ];
                    }
                    this.modelView = this.modelView.times(t);
                };

                gl.Rotate = function (degrees, axis) {
                    var unit = axis.unit();
                    var x = unit[0];
                    var y = unit[1];
                    var z = unit[2];

                    var radians = degrees * Math.PI / 180;
                    var c = Math.cos(radians);
                    var s = Math.sin(radians);
                    var t = 1 - c;

                    this.modelView = this.modelView.times([
                        [t*x*x + c, t*x*y - s*z, t*x*z + s*y, 0],
                        [t*x*y + s*z, t*y*y + c, t*y*z - s*x, 0],
                        [t*x*z - s*y, t*y*z + s*x, t*z*z + c, 0],
                        [0, 0, 0, 1]
                    ]);
                };

                gl.RotateX = function (degrees) {
                    var radians = degrees * Math.PI / 180;
                    var c = Math.cos(radians);
                    var s = Math.sin(radians);
                    this.modelView = this.modelView.times([
                        [1, 0, 0, 0],
                        [0, c, -s, 0],
                        [0, s, c, 0],
                        [0, 0, 0, 1]
                    ]);
                };

                gl.RotateY = function (degrees) {
                    var radians = degrees * Math.PI / 180;
                    var c = Math.cos(radians);
                    var s = Math.sin(radians);
                    this.modelView = this.modelView.times([
                        [c, 0, s, 0],
                        [0, 1, 0, 0],
                        [-s, 0, c, 0],
                        [0, 0, 0, 1]
                    ]);
                };

                gl.RotateZ = function (degrees) {
                    var radians = degrees * Math.PI / 180;
                    var c = Math.cos(radians);
                    var s = Math.sin(radians);
                    this.modelView = this.modelView.times([
                        [c, -s, 0, 0],
                        [s, c, 0, 0],
                        [0, 0, 1, 0],
                        [0, 0, 0, 1]
                    ]);
                };

                gl.LookAt = function (eye, center, up) {
                    var z = eye.minus(center).unit();
                    var x = up.cross(z).unit();
                    var y = z.cross(x).unit();

                    var m = [
                        [x[0], x[1], x[2], 0],
                        [y[0], y[1], y[2], 0],
                        [z[0], z[1], z[2], 0],
                        [0, 0, 0, 1]
                    ];

                    var t = [
                        [1, 0, 0, -eye[0]],
                        [0, 1, 0, -eye[1]],
                        [0, 0, 1, -eye[2]],
                        [0, 0, 0, 1]
                    ];

                    this.perspective = this.perspective.times(m.times(t));
                };

                gl.Ortho = function (left, right, bottom, top, near, far) {
                    var dX = right - left;
                    var dY = top - bottom;
                    var dZ = far - near;

                    this.perspective = [
                        [2 / dX, 0, 0, -(right + left) / dX],
                        [0, 2 / dY, 0, -(top + bottom) / dY],
                        [0, 0, -2 / dZ, -(far + near) / dZ],
                        [0, 0, 0, 1]
                    ];
                };

                gl.Frustrum = function (left, right, bottom, top, near, far) {
                    var dX = right - left;
                    var dY = top - bottom;
                    var dZ = far - near;

                    this.perspective = [
                        [2 * near / dX, 0, (right + left) / dX, 0],
                        [0, 2 * near / dY, (top + bottom) / dY, 0],
                        [0, 0, -(far + near) / dZ, -2 * far * near / dZ],
                        [0, 0, -1, 0]
                    ];
                };

                gl.Perspective = function(fov, aspect, near, far) {
                    var top = near * Math.tan(fov * Math.PI / 360);
                    var bottom = -top;

                    this.Frustrum(bottom * aspect, top * aspect, bottom, top, near, far);
                };

                ASTEROID.init(that, webglPallete);

            }());

        } catch (error) {
            throw error;
        }

    },

/*
    The AJAX property provides an simple interface for programmers to make
    asynchronous requests to a server and retrieve both text as well as
    XML documents.
*/

    AJAX: {

/*
    The get method takes two arguments: a url to request, and a function
    to callback when the server sends the response. It passes the reponse
    text or XML as an argument to the callback function, depending upon
    the resource requested.
*/

        get: function (url, callback) {
            var request = new XMLHttpRequest();
            request.open("GET", url, true);

            request.onreadystatechange = function () {
                if (request.readyState === 4) {
                    callback((request.responseXML && request.responseXML.documentElement) || request.responseText);
                }
            };

            request.overrideMimeType("text/plain; charset=x-user-defined");
            request.send();
        },

/*
    The post method takes three arguments: a url to request, a query
    string to post, and a function to callback when the server sends the
    response. It passes the reponse text or XML as an argument to the
    callback function, depending upon the resource requested.
*/

        post: function (url, query, callback) {
            var request = new XMLHttpRequest();
            request.open("POST", url, true);

            request.onreadystatechange = function () {
                if (request.readyState === 4) {
                    callback((request.responseXML && request.responseXML.documentElement) || request.responseText);
                }
            };

            request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            request.setRequestHeader("Content-Length", query.length);

            request.overrideMimeType("text/plain; charset=x-user-defined");
            request.send(query);
        }

    },

/*
    The following code was taken from quirksmode:
    <http://www.quirksmode.org/js/findpos.html>

    It calculates the absolute position of the given element. Note that
    the assignment in the while clause is not a typo, it's supposed to
    change the value of the element to its offset parent element until
    there are no more offset parent elements. For more information visit:

    <http://www.quirksmode.org/blog/archives/2008/01/using_the_assig.html>
*/

    getPosition: function (element) {
        var position = {
            left: 0,
            top: 0
        };

        do {
            position.left += element.offsetLeft;
            position.top += element.offsetTop;
        } while (element = element.offsetParent);

        return position;
    }
};

var Filter = {
    NEAREST: 1,
    LINEAR: 2,
    MIPMAP: 4
};

Array.prototype.toString = function () {
    var string = "[ ";
    if (this[0].length) {
        for (i = 0; i < this.length; i++) {
            string += (i > 0 ? "  " : "") + this[i].join(" ") + (i < this.length - 1 ? "\n" : "");
        }
    } else {
        string += this.join(" ");
    }
    return string + " ]";
};

Array.prototype.equals = function (array) {
    if (this[0].length) {
        if (array.length === this.length && array[0].length === this[0].length) {
            for (i = 0; i < this.length; i++) {
                for (j = 0; j < this[0].length; j++) {
                    if (array[i][j] !== this[i][j]) {
                        return false;
                    }
                }
            }
        } else {
            return false;
        }
    } else {
        if (array.length === this.length) {
            for (i = 0; i < this.length; i++) {
                if (array[i] !== this[i]) {
                    return false;
                }
            }
        } else {
            return false;
        }
    }
    return true;
};

Array.prototype.plus = function (array) {
    if (this[0].length) {
        if (array.length === this.length && array[0].length === this[0].length) {
            var matrix = new Array(this.length);
            for (i = 0; i < this.length; i++) {
                matrix[i] = new Array(this[0].length);
                for (j = 0; j < this[0].length; j++) {
                    matrix[i][j] = this[i][j] + array[i][j];
                }
            }
            return matrix;
        } else {
            return null;
        }
    } else {
        if (!array[0].length && array.length === this.length) {
            var vector = new Array(this.length);
            for (i = 0; i < this.length; i++) {
                vector[i] = this[i] + array[i];
            }
            return vector;
        } else {
            return null;
        }
    }
};

Array.prototype.minus = function (array) {
    if (this[0].length) {
        if (array.length === this.length && array[0].length === this[0].length) {
            var matrix = new Array(this.length);
            for (i = 0; i < this.length; i++) {
                matrix[i] = new Array(this[0].length);
                for (j = 0; j < this[0].length; j++) {
                    matrix[i][j] = this[i][j] - array[i][j];
                }
            }
            return matrix;
        } else {
            return null;
        }
    } else {
        if (!array[0].length && array.length === this.length) {
            var vector = new Array(this.length);
            for (i = 0; i < this.length; i++) {
                vector[i] = this[i] - array[i];
            }
            return vector;
        } else {
            return null;
        }
    }
};

Array.prototype.scale = function (constant) {
    if (this[0].length) {
        var matrix = new Array(this.length);
        for (i = 0; i < this.length; i++) {
            matrix[i] = new Array(this[0].length);
            for (j = 0; j < this[0].length; j++) {
                matrix[i][j] = constant * this[i][j];
            }
        }
        return matrix;
    } else {
        var vector = new Array(this.length);
        for (i = 0; i < this.length; i++) {
            vector[i] = constant * this[i];
        }
        return vector;
    }
};

Array.prototype.transpose = function () {
    if (this[0].length > 1) {
        var matrix = new Array(this[0].length);
        for (i = 0; i < this[0].length; i++) {
            matrix[i] = new Array(this.length);
            for (j = 0; j < this.length; j++) {
                matrix[i][j] = this[j][i];
            }
        }
        return matrix;
    } else if (this[0].length === 1) {
        var row = new Array(this.length);
        for (i = 0; i < this.length; i++) {
            row[i] = this[i][0];
        }
        return row;
    } else {
        var column = new Array(this.length);
        for (i = 0; i < this.length; i++) {
            column[i] = [this[i]];
        }
        return column;
    }
};

Array.prototype.dot = function (array) {
    if (this[0].length) {
        return null;
    } else {
        if (!array[0].length && array.length === this.length) {
            var constant = 0;
            for (i = 0; i < this.length; i++) {
                constant += this[i] * array[i];
            }
            return constant;
        } else {
            return null;
        }
    }
};

Array.prototype.cross = function (array) {
    if (this[0].length) {
        return null;
    } else {
        if (!array[0].length && array.length === this.length && array.length === 3) {
            var vector = new Array(this.length);
            vector[0] = this[1] * array[2] - this[2] * array[1];
            vector[1] = this[2] * array[0] - this[0] * array[2];
            vector[2] = this[0] * array[1] - this[1] * array[0];
            return vector;
        } else {
            return null;
        }
    }
};

Array.prototype.times = function (array) {
    if (this[0].length) {
        if (array[0].length) {
            if (array.length === this[0].length) {
                var matrix = new Array(this.length);
                for (i = 0; i < this.length; i++) {
                    matrix[i] = new Array(array[0].length);
                    for (j = 0; j < array[0].length; j++) {
                        matrix[i][j] = 0;
                        for (k = 0; k < array.length; k++) {
                            matrix[i][j] += this[i][k] * array[k][j];
                        }
                    }
                }
                return matrix;
            } else {
                return null;
            }
        } else if (this[0].length === 1) {
            var matrix = new Array(this.length);
            for (i = 0; i < this.length; i++) {
                matrix[i] = new Array(array.length);
                for (j = 0; j < array.length; j++) {
                    matrix[i][j] = this[i][0] * array[j];
                }
            }
            return matrix;
        } else {
            return null;
        }
    } else {
        if (array[0].length) {
            if (array.length === this.length) {
                var row = new Array(array[0].length);
                for (i = 0; i < array[0].length; i++) {
                    row[i] = 0;
                    for (j = 0; j < this.length; j++) {
                        row[i] += this[j] * array[j][i];
                    }
                }
                return row;
            } else {
                return null;
            }
        } else if (this.length === 1) {
            var row = new Array(array.length);
            for (i = 0; i < array.length; i++) {
                row[i] = this[0] * array[i];
            }
            return row;
        } else {
            return null;
        }
    }
};

Array.prototype.magnitude = function () {
    if (this[0].length) {
        return null;
    } else {
        var constant = 0;
        for (i = 0; i < this.length; i++) {
            constant += this[i] * this[i];
        }
        return Math.sqrt(constant);
    }
};

Array.prototype.vectorize = function() {
    if (this[0].length) {
        var vector = [];
        for (j = 0; j < this[0].length; j++) {
            for (i = 0; i < this.length; i++) {
                vector.push(this[i][j]);
            }
        }
        return vector;
    } else {
        return this;
    }
};

Array.prototype.unit = function() {
    if (this[0].length) {
        return null;
    } else {
        return this.scale(1 / this.magnitude());
    }
};

Array.prototype.factorize = function () {
    if (this.length === this[0].length) {
        var lower = new Array(this.length);
        var upper = new Array(this.length);
        for (i = 0; i < this.length; i++) {
            lower[i] = [];
            upper[i] = [];
            for (j = 0; j < this.length; j++) {
                lower[i].push((i === j) ? 1 : 0);
                upper[i].push(0);
            }
        }
        for (i = 0; i < this.length; i++) {
            for (j = i; j < this.length; j++) {
                upper[i][j] = this[i][j];
                for (k = 0; k < i; k++) {
                    upper[i][j] -= lower[i][k] * upper [k][j];
                }
            }
            for (j = i + 1; j < this.length; j++) {
                lower[j][i] = this[j][i];
                for (k = 0; k < i; k++) {
                    lower[j][i] -= lower[j][k] * upper [k][i];
                }
                lower[j][i] /= upper[i][i];
            }
        }
        return {
            lower: lower,
            upper: upper
        };
    } else {
        return null;
    }
};

Array.prototype.determinant = function () {
    if (this.length === this[0].length) {
        var determinant = 1;
        var matrix = this.factorize().upper;
        for (i = 0; i < this.length; i++) {
            determinant *= matrix[i][i];
        }
        return determinant;
    } else {
        return null;
    }
};

Array.prototype.inverse = function () {
    if (this.length === this[0].length && this.determinant() !== 0) {
        var factors = this.factorize();
        var identity = new Array(this.length);
        var intermediate = new Array(this.length);
        var inverse = new Array(this.length);
        var lower = factors.lower;
        var upper = factors.upper;
        for (i = 0; i < this.length; i++) {
            identity[i] = [];
            intermediate[i] = [];
            inverse[i] = [];
            for (j = 0; j < this.length; j++) {
                identity[i].push((i === j) ? 1 : 0);
                intermediate[i].push(0);
                inverse[i].push(0);
            }
        }
        for (i = 0; i < this.length; i++) {
            for (j = 0; j < this.length; j++) {
                intermediate[i][j] = identity[i][j];
                for (k = 0; k < i; k++) {
                    intermediate[i][j] -= lower[i][k] * intermediate[k][j];
                }
            }
        }
        for (i = this.length - 1; i >= 0; i--) {
            for (j = this.length - 1; j >= 0; j--) {
                inverse[i][j] = intermediate[i][j];
                for (k = this.length - 1; k > i; k--) {
                    inverse[i][j] -= upper[i][k] * inverse[k][j];
                }
                inverse[i][j] /= upper[i][i];
            }
        }
        return inverse;
    } else {
        return null;
    }
};

Array.prototype.cosFrom = function (array) {
    if (this[0].length) {
        return null;
    } else {
        if (!array[0].length && array.length === this.length) {
            return Math.acos(this.dot(array) / (this.magnitude() * array.magnitude()));
        } else {
            return null
        }
    }
};

Array.prototype.angleFrom = function (array) {
    if (this[0].length) {
        return null;
    } else {
        if (!array[0].length && array.length === this.length) {
            return Math.acos(this.cosFrom(array));
        } else {
            return null
        }
    }
};

Array.prototype.reflect = function (array) {
    if (this[0].length) {
        return null;
    } else {
        if (!array[0].length && array.length === this.length) {
            return array.minus(this.scale(2 * this.dot(array)));
        } else {
            return null
        }
    }
};

if (window.webkitIndexedDB) {
    window.indexedDB = window.webkitIndexedDB;
    window.IDBTransaction = window.webkitIDBTransaction;
    window.IDBKeyRange = window.webkitIDBKeyRange;
} else if (window.moz_indexedDB) {
    window.indexedDB = window.moz_indexedDB;
}