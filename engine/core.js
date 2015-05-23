/**
 * Wrapper of Console <br>
 * This module is used to display logs.
 * and notice that only under debug mode, the info is displayed
 * @namespace webvn.log
 */
webvn.module('log', function (config, util, exports) {
    "use strict";
    var conf = config.log;
    var colors = conf.colors;

    /**
     * Display error message in console.
     * @function webvn.log.error
     * @param {string|Error} str error message or Error instance
     */
    exports.error = function (str) {
        var errStack;
        if (str instanceof Error) {
            errStack = getErrorStack(str);
            str = str.message;
        } else {
            errStack = getErrorStack();
        }

        if (config.build === 'release') {
            return;
        }

        console.log('%c' + '!! ' + str + '\n' + errStack,
            'color: ' + colors.error);
    };

    /**
     * Display info in console.
     * @function webvn.log.info
     * @param {string} str info
     * @param {boolean=} displayFile
     */
    exports.info = function (str, displayFile) {
        displayFile = displayFile || false;
        var fileInfo;
        if (displayFile) {
            fileInfo = ' ' + getFileInfo();
        }

        if (config.build === 'release') {
            return;
        }

        console.log('%c' + '> ' + str + (displayFile ? fileInfo : ''),
            'color: ' + colors.info);
    };

    /**
     * Display warning in console
     * @function webvn.log.warn
     * @param {string} str warning message
     */
    exports.warn = function (str) {
        var fileInfo = getFileInfo();

        if (config.build === 'release') {
            return;
        }

        console.log('%c' + '! ' + str + ' ' + fileInfo,
            'color: ' + colors.warn);
    };

    // Get info of file that logs the message
    function getFileInfo() {
        var err = new Error,
            stack = err.stack;
        var stacks = stack.split('\n');

        return util.trim(stacks[3]);
    }

    function getErrorStack(e) {
        var spliceNum = 3;
        if (e === undefined) {
            e = new Error;
        } else {
            spliceNum = 1;
        }
        var stack = e.stack,
            stacks = stack.split('\n');
        stacks.splice(0, spliceNum);

        return stacks.join('\n');
    }
});
webvn.module('Class', function (util, exports) {
    var ObjCreate = Object.create;

    exports.create = function (px, attrs, sx) {
        return Base.extend(px, attrs, sx);
    };

    /* Create a new class using px's constructor if exists.
     * Also set static method of the class
     */
    function create(px, sx) {
        var _class;
        px = px || {};
        sx = sx || {};

        // Whether a constructor is defined
        if (px.hasOwnProperty('constructor')) {
            _class = px.constructor;
        } else {
            _class = function () {};
            px.constructor = _class;
        }

        // Atach __name__ and __owner__ to each prototype method, used for callSuper
        util.each(px, function (val, key) {
            if (util.isFunction(val)) {
                val.__name__ = key;
                val.__owner__ = _class;
            }
        });

        // Set statics
        util.each(sx, function (value, p) {
            _class[p] = value;
        });

        _class.extend = function (px, attrs, sx) {
            return extend.apply(null, [_class, px, attrs, sx]);
        };

        _class.prototype = px;

        return _class;
    }

    var Empty = function() {};
    /* Create a new object with prototype
     * equals to object.create
     */
    function createObj(proto, constructor) {
        var newProto;
        if (ObjCreate) {
            newProto = ObjCreate(proto);
        } else {
            Empty.prototype = proto;
            newProto = new Empty();
        }
        newProto.constructor = constructor;
        return newProto;
    }

    /* Extend a class that already exist.
     * All it does is just to set the superClass's prototype into px's __proto__.
     */
    function extend(superClass, px, attrs, sx) {
        var _class = create(px, sx),
            newPx = createObj(superClass.prototype, _class);


        var keys = util.keys(px), key;
        for (var i = 0, len = keys.length; i < len; i++) {
            key = keys[i];
            newPx[key] = px[key];
        }

        _class.superclass = superClass.prototype;

        _class.extendFn = function (obj) {
            util.mix(newPx, obj);
        };

        // Define getter and setter
        attrs = attrs || {};
        util.each(attrs, function (val, key) {
            if (!val.get) {
                val.get = function () {
                    return this['_' + key];
                }
            }
            if (!val.set) {
                val.set = function (val) {
                    this['_' + key] = val;
                }
            }
        });
        Object.defineProperties(newPx, attrs);

        // fn: Short name for prototype
        _class.fn = newPx;
        _class.prototype = newPx;

        return _class;
    }

    var Base = exports.Base = create({

        constructor: function Base () {},

        callSuper: function () {
            var method, obj,
                self = this,
                args = arguments;

            method = arguments.callee.caller;
            obj = self;

            var name = method.__name__;
            if (!name) {
                return undefined;
            }

            var member = method.__owner__.superclass[name];
            if (!member) {
                return undefined;
            }

            return member.apply(obj, args || []);
        }

    });
});
webvn.extend('Class', function (exports, util) {
    'use strict';
    exports.module = function (requires, fn) {
        var exports = {};

        if (util.isFunction(requires) && fn === undefined) {
            fn = requires;
            requires = [];
        }

        webvn.use(requires, function() {
            var args = util.toArray(arguments);
            args.splice(args.length - 1, 0, exports);
            var ret = fn.apply(null, args);
            if (ret) exports = ret;
        });

        return exports;
    };
});
webvn.module('storage', function (Class, util) {
    "use strict";
    var exports = {};

    var localStore = Class.module(function () {
        var exports = {};

        var localStore = window.localStorage;

        exports.get = function (key) {
            var value = localStore.getItem(key);
            try {
                value = JSON.parse(value);
            } catch (e) {}

            return value;
        };

        exports.set = function(key, value) {
            if (util.isObject(value)) {
                value = JSON.stringify(value);
            }
            localStore.setItem(key, value);
        };

        exports.remove = function (key) {
            localStore.removeItem(key);
        };

        return exports;
    });

    var prefix = 'wvn-';

    var LocalStore = exports.LocalStore = Class.create({

        constructor: function LocalStore(name) {
            var key = this.key = prefix + name;
            var value = this.value = localStore.get(key);
            if (!util.isObject(value)) {
                this.value = {};
            }
        },

        save: function () {
            localStore.set(this.key, this.value);
        },

        clear: function () {
            this.value = {};
            this.save();
        },

        destroy: function () {
            localStore.remove(this.key);
        },

        get: function (key) {
            var value = this.value;

            // If no key is given, return the whole value
            if (key === undefined) {
                return value;
            }
            if (value[key]) {
                return value[key];
            }

            return null;
        },

        set: function (key, value, overwrite) {
            var attrs;

            if (util.isObject(key)) {
                attrs = key;
                overwrite = value;
            } else {
                attrs = {};
                attrs[key] = value;
            }

            if (overwrite === undefined) {
                overwrite = true;
            }
            if (overwrite) {
                this.value = util.merge(this.value, attrs);
            } else {
                this.value = util.merge(attrs, this.value);
            }

            this.save();
        }

    });

    var localStores = {};

    exports.createLocalStore= function (name) {
        if (!localStores[name]) {
            localStores[name] = new LocalStore(name);
        }

        return localStores[name];
    };

    return exports;
});
webvn.extend('storage', function (exports, Class, util) {
    "use strict";
    var createLocalStore = exports.createLocalStore;

    function emptyFunc() {}

    var Save = exports.Save = Class.create({

        constructor: function Save(saveFn, loadFn) {
            this.saveFn = saveFn || emptyFunc;
            this.loadFn = loadFn || emptyFunc;
        },

        save: function (fn) {
            if (util.isFunction(fn)) {
                this.saveFn = fn;
                return this;
            }

            return this.saveFn.call(null);
        },

        load: function (fn) {
            if (util.isFunction(fn)) {
                this.loadFn = fn;
                return this;
            }

            this.loadFn.call(null, fn);
        }

    });

    var saves = {};

    exports.create = function (name) {
        if (!saves[name]) {
            saves[name] = new Save(name);
        }

        return saves[name];
    };

    exports.save = function (name) {

        var localStore = createLocalStore(name);
        localStore.clear();

        var values = {};

        util.each(saves, function (save, key) {
            values[key] = save.save();
        });

        localStore.set(values);
    };

    exports.load = function (name) {
        var localStore = createLocalStore(name);

        var values = localStore.get();

        util.each(saves, function (save, key) {
            save.load(values[key]);
        });
    };

});
webvn.extend('config', function (exports, kclass, storage) {
    var configStore = storage.createLocalStore('config');

    var Config = exports.Config = storage.LocalStore.extend({

        constructor: function Config(name) {
            var value = configStore.get(name);
            if (value === null) {
                value = {};
            }
            this.key = name;
            this.value = value;
        },

        set: function (key, value, overwrite) {
            this.callSuper(key, value, overwrite);

            return this;
        },

        save: function () {
            configStore.set(this.key, this.value);
        }

    });

    var configs = {};

    exports.create = function (name) {
        if (!configs[name]) {
            configs[name] = new Config(name);
        }

        if (exports[name]) {
            exports.build === 'release' ? configs[name].set(exports[name], false) :
                configs[name].set(exports[name], true);
        }

        return configs[name];
    };

});

webvn.extend('storage', function (exports, Class, config) {
    "use strict";

    var basePath = '';
    if (config.build === 'test') {
        basePath = '../';
    }

    var fileExt = /(jpg|png|bmp|ogg|webm)$/;

    var Asset = exports.Asset = Class.create({

        constructor: function Asset(path, extension) {
            this.path = path || '';
            this.extension = extension || '';
        },

        get: function (src) {
            // If src ends with extension, do not modify it;
            if (fileExt.test(src)) {
                return basePath + src;
            }
            return basePath + this.path + src + '.' + this.extension;
        },

        setPath: function (str) {
            this.path = str;
        },

        setExtension: function (str) {
            this.extension = str;
        }

    });

    exports.createAsset = function (path, extension) {
        return new Asset(path, extension);
    };

});
/**
 * @namespace webvn.select
 */
webvn.module('select', function (util) {
    "use strict";
    var exports = {};

    var selectUtil = {};

    /**
     * Change 'background-color' into 'backgroundColor'
     * @method webvn.select.camelize
     * @param {string} str
     * @retuns {string}
     */
    selectUtil.camelize = function (str) {
        return str.replace(/-+(.)?/g, function(match, chr){
            return chr ? chr.toUpperCase() : '';
        });
    };

    /**
     * Change 'backgroundColor' into 'background-color'
     * @method webvn.select.dasherize
     * @param {string} str
     * @return {string}
     */
    var dasherize = selectUtil.dasherize = function (str) {
        return str.replace(/([a-z])([A-Z])/, '$1-$2').toLowerCase();
    };

    var elementDisplay = {};
    // Get a element's default display type
    selectUtil.defaultDisplay = function (nodeName) {
        var element, display;
        if (!elementDisplay[nodeName]) {
            element = document.createElement(nodeName);
            document.body.appendChild(element);
            display = getComputedStyle(element, '').getPropertyValue("display");
            element.parentNode.removeChild(element);
            display == "none" && (display = "block");
            elementDisplay[nodeName] = display;
        }
        return elementDisplay[nodeName];
    };

    // Do not add px to properties below
    var cssNumber = {
        'column-count': 1,
        'columns': 1,
        'font-weight': 1,
        'line-height': 1,
        'opacity': 1,
        'z-index': 1,
        'zoom': 1
    };
    // Add px suffix to value if necessary
    selectUtil.addPx = function (name, value) {
        if (util.isNumber(value) && !cssNumber[dasherize(name)]) {
            return value + 'px';
        }
        return value;
    };

    // Remove px suffix to value if necessary and change string to number if possible
    selectUtil.removePx = function (name, value) {
        if (util.endsWith(value, 'px')) {
            return Number(value.substr(0, value.length-2));
        }
        if (Number(value) === Number(value)) {
            return Number(value);
        }
        return value;
    };

    var traverseNode = selectUtil.traverseNode = function (node, fn) {
        fn(node);
        for (var i = 0, len = node.childNodes.length; i < len; i++) {
            traverseNode(node.childNodes[i], fn);
        }
    };

    // Set attribute to a node, if value is null, remove it.
    selectUtil.setAttribute = function (node, name, value) {
        value == null ? node.removeAttribute(name) : node.setAttribute(name, value);
    };

    exports.util = selectUtil;

    return exports;
});
webvn.extend('select', function (exports, Class, util) {
    "use strict";

    var selectUtil = exports.util;

    /**
     * Create New Select Object
     * @function webvn.select.create
     * @param {string} name node name, div, canvas...
     * @returns {Select}
     */
    exports.create = function (name) {
        var element = document.createElement(name);
        return new Select(element);
    };

    /**
     * Get Select Object by Selector
     * @function webvn.select.get
     * @param {string} selector
     * @returns {Select}
     */
    exports.get = function (selector) {
        return new Select(selector);
    };

    var emptyArr = [],
        slice = emptyArr.slice;
    /**
     * Select class
     * @class webvn.select.Select
     * @param {string|object} selector
     */
    var Select = exports.Select = Class.create({
        /**
         * @memberof webvn.select.Select
         */
        length: 0,
        constructor: function Select(selector) {
            /* Nothing is passed in
             * Return empty Select instance
             */
            if (!selector) {
                return this;
            }
            // No context specified
            if (util.isString(selector)) {
                return rootSelect.find(selector);
            } else if (selector.nodeType) {
                // Handle: dom
                this[0] = selector;
                this.length = 1;
            }
        },
        /**
         * Get the descendants of each element in the current set
         * of matched elements, filtered by a selector.
         * @method webvn.select.Select#find
         * @param {string} selector
         */
        find: function (selector) {
            var result = [];
            util.each(this, function (value) {
                Select.merge(result, value.querySelectorAll(selector));
            });
            var select = new Select();
            return Select.merge(select, result);
        },
        /**
         * Iterate elements
         * @method webvn.select.Select#each
         * @param {function} fn
         * @returns {Select}
         */
        each: function (fn) {
            util.each(this, function (element, index) {
                fn.call(element, index, element);
            });
            return this;
        },
        /**
         * Return first element.
         * @method webvn.select.Select#first
         * @returns {Select}
         */
        first: function () {
            return new Select(this[0]);
        },
        /**
         * Return last element.
         * @method webvn.select.Select#last
         * @returns {Select}
         */
        last: function () {
            return new Select(this[this.length - 1]);
        },
        /**
         * Determine whether any of the matched elements are assigned the given class.
         * @method webvn.select.Select#hasClass
         * @param {string} name
         * @returns {boolean}
         */
        hasClass: function (name) {
            return emptyArr.some.call(this, function (element) {
                return this.test(element.className);
            }, new RegExp('(^|\\s)' + name + '(\\s|$)'));
        },
        /**
         * Adds the specified class(es) to each element in the set of matched elements.
         * @method webvn.select.Select#addClass
         * @param {string} name
         * @returns {Select}
         */
        addClass: function (name) {
            return this.each(function (index) {
                var classList = [];
                // Only add classes that do not exist
                name.split(/\s+/g).forEach(function (value) {
                    var select = new Select(this);
                    if (!select.hasClass(value)) {
                        classList.push(value);
                    }
                }, this);
                // Add new classes
                if (classList.length) {
                    var cn = this.className;
                    this.className += (cn ? ' ' : '') + classList.join(' ');
                }
            });
        },
        /**
         * Removes class(es)
         * @method webvn.select.Select#removeClass
         * @param {string} name
         * @returns {Select}
         */
        removeClass: function (name) {
            return this.each(function () {
                var classList = this.className;
                name.split(/\s+/g).forEach(function (Class) {
                    classList = classList.replace(new RegExp('(^|\\s)' + Class + '(\\s|$)'), " ");
                });
                this.className = classList;
            });
        },
        /**
         * Set Text
         * @method webvn.select.Select#text
         * @param {string} text
         * @returns {Select}
         */
        /**
         * Get Text
         * @method webvn.select.Select#text
         * @returns {string}
         */
        text: function (text) {
            // Get text
            if (text === undefined) {
                return this[0].textContent;
            }
            // Set text
            return this.each(function (index) {
                this.textContent = text;
            });
        },

        visible: function (visiblity) {
            if (visiblity === undefined) {
                return this.css('display') !== 'none';
            }
            if (visiblity) {
                return this.show();
            } else {
                return this.hide();
            }
        },

        /**
         * Display Element
         * @method webvn.select.Select#show
         * @returns {Select}
         */
        show: function () {
            return this.each(function () {
                if (getComputedStyle(this, '').getPropertyValue('display') === 'none') {
                    this.style.display = selectUtil.defaultDisplay(this.nodeName);
                }
            });
        },
        /**
         * Get Style Value
         * @method webvn.select.Select#css
         * @param {string|Array} property
         * @returns {string|object}
         */
        /**
         * Set Style Value
         * @method webvn.select.Select#css
         * @param {object|string} property
         * @param {string=} value
         * @returns {Select}
         */
        css: function (property, value) {
            // Get style value
            if (value === undefined) {
                var computedStyle, element = this[0];
                computedStyle = getComputedStyle(element, '');
                // Handle: String
                if (util.isString(property)) {
                    return element.style[selectUtil.camelize(property)] || computedStyle.getPropertyValue(property);
                } else if (util.isArray(property)) {
                    // Handle: Array
                    var props = {};
                    util.each(property, function (prop) {
                        props[prop] = element.style[camelize(prop)] || computedStyle.getPropertyValue(property);
                    });
                    return props;
                }
            }
            var css = '';
            // Set style value
            if (util.isString(property)) {
                css = selectUtil.dasherize(property) + ':' + selectUtil.addPx(property, value);
            } else {
                // Handle: Object
                util.each(property, function (value, key) {
                    css += selectUtil.dasherize(key) + ':' + selectUtil.addPx(key, value) + ';';
                });
            }
            return this.each(function () {
                this.style.cssText += ';' + css;
            });
        },
        cssComputed: function (property) {
            var computedStyle, element = this[0], ret;
            computedStyle = getComputedStyle(element, '');
            if (util.isString(property)) {
                ret = computedStyle.getPropertyValue(property);
                return selectUtil.removePx(property, ret);
            } else if (util.isArray(property)) {
                // Handle: Array
                var props = {};
                util.each(property, function (prop) {
                    props[prop] = computedStyle.getPropertyValue(property);
                    props[prop] = removePx(prop, props[prop]);
                });
                return props;
            }
        },
        width: function () {
            return this.cssComputed('width');
        },
        /**
         * Set Element Attribute
         * @method webvn.select.Select#attr
         * @param {string|object} name
         * @param {string=} value
         * @returns {Select}
         */
        /**
         * Get Element Attribute
         * @method webvn.select.Select#attr
         * @param {string} name
         */
        attr: function (name, value) {
            // Get attributes
            if (value === undefined && util.isString(name)) {
                return this[0].getAttribute(name);
            }
            // Set attributes
            var self = this;
            return this.each(function () {
                if (util.isObject(name)) {
                    util.each(name, function (value, key) {
                        selectUtil.setAttribute(self, key, value);
                    });
                } else {
                    selectUtil.setAttribute(this, name, value);
                }
            });
        },

        data: function (name, value) {
            if (util.isString(name)) {
                name = 'data-' + name;
            } else if (util.isObject(name)) {
                util.each(name, function (value, key) {
                    name[key] = 'data-' + value;
                });
            }

            return this.attr(name, value);
        },

        removeAttr: function (name) {
            return this.each(function () {
                if (this.nodeType === 1) {
                    name.split(' ').forEach(function (name) {
                        selectUtil.setAttribute(this, name);
                    }, this);
                }
            });
        },

        /**
         * Set HTML
         * @method webvn.select.Select#html
         * @param {string} html
         * @returns {Select}
         */
        /**
         * Get HTML
         * @method webvn.select.Select#html
         * @returns {string}
         */
        html: function (html) {
            // Get html
            if (html === undefined) {
                return this[0].innerHTML;
            }
            // Set html
            return this.each(function () {
                this.innerHTML = html;
            });
        },
        /**
         * Get Element Number
         * @method webvn.select.Select#size
         * @returns {number}
         */
        size: function () {
            return this.length;
        },
        /**
         * Get Raw Element <br>
         * If index is undefined, then returns all elements.
         * @method webvn.select.Select#get
         * @param {number=} index
         */
        get: function (index) {
            if (index === undefined) {
                return slice.call(this);
            }
            return this[index];
        },
        /**
         * Hide Element
         * @method webvn.select.Select#hide
         */
        hide: function () {
            this.css('display', 'none');
        },
        /**
         * Change Select Into Array
         * @method webvn.select.Select#toArray
         * @returns {Array}
         */
        toArray: function () {
            return this.get();
        }
    }, {}, {

        /**
         * Merge Second Array Into First Array
         * @function webvn.select.Select.merge
         * @param {Array} first
         * @param {Array} second
         * @returns {Array}
         */
        merge: function (first, second) {
            var len = +second.length,
                i = first.length;
            for (var j = 0; j < len; j++) {
                first[i++] = second[j];
            }
            first.length = i;
            return first;
        },

        /**
         * Convert html string to actual dom element
         * @function webvn.select.Select.parseHTML
         * @param data
         * @returns {Array}
         */
        parseHTML: function (data) {
            // Div for creating nodes
            var div = document.createElement('div');
            if ( !data || !util.isString(data)) {
                return null;
            }
            div.innerHTML = data;
            var elements = div.childNodes;
            return Select.merge([], elements);
        },

        /**
         * Whether a Node contains another node
         * @function webvn.select.Select.contains
         * @param parent
         * @param node
         * @returns {boolean}
         */
        contains: function (parent, node) {
            return parent !== node && parent.contains(node);
        }

    });

    var rootSelect = new Select(document);

    /**
     * Whether is a Select element
     * @function webvn.select.isSelect
     * @param o
     * @returns {boolean}
     */
    var isSelect = exports.isSelect = function (o) {
        return o instanceof Select;
    };

    /* Generate 'after', 'prepend', 'before', 'append'
     * 'insertAfter', 'insertBefore', 'appendTo' and 'prependTo' methods
     */
    var fn = Select.prototype;
    [ 'after', 'prepend', 'before', 'append' ].forEach(function (operator, idx) {
        var inside = idx % 2; // prepend, append
        fn[operator] = function () {
            // Arguments can be nodes, arrays of nodes and Html strings
            var nodeArray = util.map(arguments, function (arg) {
                return util.isString(arg) ? Select.parseHTML(arg) : arg;
            });
            var nodes = [];
            for (var i = 0, len = nodeArray.length; i < len; i++) {
                if (util.isArray(nodeArray[i])) {
                    // Node array
                    nodes = nodes.concat(nodeArray[i]);
                } else if (isSelect(nodeArray[i])) {
                    // Select
                    nodes = nodes.concat(nodeArray[i].toArray());
                } else {
                    // Node
                    nodes.push(nodeArray[i]);
                }
            }
            var parent, copyByClone = this.length > 1;
            if (nodes.length < 1) {
                return this;
            }
            return this.each(function (_, target) {
                parent = inside ? target : target.parentNode;
                switch (idx) {
                    case 0:
                        target = target.nextSibling;
                        break;
                    case 1:
                        target = target.firstChild;
                        break;
                    case 2:
                        break;
                    default:
                        target = null;
                        break;
                }
                var parentInDocument = Select.contains(document.documentElement, parent);
                nodes.forEach(function(node){
                    if (copyByClone) {
                        node = node.cloneNode(true);
                    } else if (!parent) {
                        return select(node).remove();
                    }
                    parent.insertBefore(node, target);
                    if (parentInDocument) selectUtil.traverseNode(node, function(el){
                        if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
                            (!el.type || el.type === 'text/javascript') && !el.src) {
                            window['eval'].call(window, el.innerHTML);
                        }
                    });
                });
            });
        };
        fn[inside ? operator + 'To' : 'insert' + (idx ? 'Before' : 'After')] = function (html) {
            select(html)[operator](this);
            return this;
        }
    });

});
/**
 * Provide some common system info and function,
 * such as the screen width and height.
 * @namespace webvn.system
 */
webvn.module('system', function (select, config, exports) {
    "use strict";
    var conf = config.create('system');

    // Screen width and height
    exports.screenWidth = screen.width;
    exports.screenHeight = screen.height;

    var $title = select.get('title');

    // Set window title
    var title = exports.title = function (text) {
        if (text === undefined) {
            return $title.text();
        }
        $title.text(text);
    };

    // Set default title
    title(conf.get('title'));
});
webvn.extend('loader', function (exports, util) {
    "use strict";

    var ajaxSettings = {
        // Default type of request
        type: 'GET',
        // Callback that is executed before request
        beforeSend: empty,
        // Callback that is executed if the request succeeds
        success: empty,
        // Callback that is executed the the server drops error
        error: empty,
        // The context for the callbacks
        context: null,
        async: true,
        // Transport
        xhr: function () {
            return new window.XMLHttpRequest();
        },
        // Default timeout
        timeout: 0
    };

    var ajax = function (options) {

        var settings = util.merge(ajaxSettings, options);

        var dataType = settings.dataType,
            context = settings.context,
            protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
            xhr = settings.xhr();

        return new Promise(function (resolve, reject) {

            xhr.onload = function () {

                clearTimeout(abortTimeout);

                var status = xhr.status,
                    result = xhr.responseText;

                if ((status >= 200 && status < 300) ||
                    status == 304 || (status == 0 && protocol === 'file:')) {
                    try {
                        switch (dataType) {
                            case 'script':
                                eval(result);
                                break;
                            case 'xml':
                                result = xhr.responseXML;
                                break;
                            case 'json':
                                result = JSON.parse(result);
                                break;
                        }
                    } catch(e) {}
                    settings.success.call(context, result, 'success', xhr);
                    resolve(result, xhr);
                } else {
                    error();
                }

            };

            if (settings.beforeSend.call(context, xhr, settings) === false) {
                abort();
            }

            // Request error
            xhr.onerror = error;

            if (settings.timeout > 0) {
                var abortTimeout = setTimeout(function () {

                    abort();

                }, settings.timeout);
            }

            xhr.open(settings.type, settings.url, settings.async);

            xhr.send(settings.data ? settings.data : null);

            function abort() {

                xhr.abort();
                error();

            }

            function error() {

                settings.error.call(context, xhr, 'ajaxError', xhr);
                reject(xhr);

            }

        });

    };

    ajax.get = function (url, data, success, dataType) {

        return ajax({
            type: 'get',
            url: url,
            data: data,
            success: success,
            dataType: dataType
        });

    };

    ajax.post = function (url, data, success, dataType) {

        return ajax({
            type: 'post',
            url: url,
            data: data,
            success: success,
            dataType: dataType
        });

    };

    function empty() {}

    /**
     * @function wvn.loader.image
     * @param sources
     * @returns {Promise}
     */
    exports.image = function (sources) {
        if (!util.isArray(sources)) {
            sources = [sources];
        }

        var images = [],
            len = sources.length,
            count = 0;

        return new Promise(function (resolve, reject) {

            util.each(sources, function (source, index) {
                var image = new Image;
                images[index] = image;

                image.onload = function () {
                    count++;
                    if (count === len) {
                        if (len === 1) {
                            resolve(images[0]);
                        } else {
                            resolve(images);
                        }
                    }
                };

                image.onerror = function () {
                    reject();
                };

                image.src = source;
            });

        });
    };

    exports.scenario = function (scenes, cb) {
        _scenario(scenes, 0, cb);
    };

    // Private function
    function _scenario (scenes, i, cb) {
        ajax.get(scenes[i]).then(function (value) {
            cb(value, i === scenes.length - 1);
            if (i < scenes.length - 1) {
                _scenario(scenes, i + 1, cb);
            }
        });
    }

});

/* Provide function used by parser,
 * and helper function related to wvnScript/javaScript translation
 */
webvn.module('parserNode', function (Class, util, exports) {
    'use strict';
    exports.lineNum = function (value) {
        lineNum = value;
    };
    var lineNum = 0;

    exports.expression = function (content) {
        content = removeLastLineBreak(content);

        return '$$(' + content + ', ' + lineNum + ');\n';
    };

    exports.label = function (label) {
        return '"label", "' + util.trim(label) + '"';
    };

    exports.command = function (command) {
        command = formatParam(escapeQuote(command));

        return '"command", "' + util.trim(command) + '"';
    };

    exports.code = function (code) {
        // Trim every line to make it look decent
        var lines = code.split('\n');
        for (var i = 0, len = lines.length; i < len; i++) {
            lines[i] = util.trim(lines[i]);
        }
        code = lines.join('\n');
        code = escapeQuote(code);

        return '"code", "' + code + '"';
    };

    exports.block = function (block) {
        block = indent(block);

        return ' {\n' + block + '}\n';
    };

    exports.paramList = function (paramList, param) {
        return paramList + ', ' + param;
    };

    exports.ifWrapper = function (body) {
        body = indent(body);

        return '"if", function () {\n' + body + '}\n';
    };

    exports['if'] = function (condition, block) {
        return 'if (' + condition + ')' + block;
    };

    exports.ifElse = function (former, latter) {
        former = removeLastLineBreak(former);

        return former + ' else ' + util.trim(latter) + '\n';
    };

    exports['function'] = function (name, param, block) {
        if (block === undefined) {
            block = param;
            param = '';
        }

        return '"function", "' + name + '", function (' + param + ')' + block;
    };

    function removeLastLineBreak(text) {
        var len = text.length;

        if (text[len - 1] === '\n') {
            text = text.substr(0, len - 1);
        }

        return text;
    }

    function indent(text) {
        var ret = '\t' + text;

        ret = ret.replace(/\n/g, '\n\t');

        var len = ret.length;
        if (ret[len - 1] === '\t') {
            ret = ret.substr(0, len - 1);
        }

        return ret;
    }

    // Change {{param}} to " + param + "
    function formatParam(text) {
        return text.replace(/\{\{/g, '" + ').replace(/}}/g, ' + "');
    }

    // https://github.com/joliss/js-string-escape/blob/master/index.js
    var escapeQuote = exports.escapeQuote = function (text) {
        return ('' + text).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
            switch (character) {
                case '"':
                case "'":
                case '\\':
                    return '\\' + character;
                case '\n':
                    return '\\n';
                case '\r':
                    return '\\r';
                case '\u2028':
                    return '\\u2028';
                case '\u2029':
                    return '\\u2029';
            }
        });
    };

});
webvn.module("parser", function () {
var exports = {}, require = function(){};
/* parser generated by jison 0.4.15 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,15],$V1=[1,14],$V2=[1,12],$V3=[1,13],$V4=[1,11],$V5=[1,16],$V6=[1,13,14,15,16,17,22,23],$V7=[1,18],$V8=[1,23],$V9=[1,13,14,15,16,17,20,22,23],$Va=[21,26];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Root":3,"Body":4,"Line":5,"Expression":6,"If":7,"CodeLine":8,"CodeBlock":9,"Command":10,"Label":11,"Function":12,"LABEL":13,"COMMAND":14,"CODE_LINE":15,"CODE_BLOCK":16,"IF":17,"CONDITION":18,"Block":19,"ELSE":20,"{":21,"}":22,"FUNCTION":23,"FUNCTION_NAME":24,"ParamList":25,"PARAM":26,"$accept":0,"$end":1},
terminals_: {2:"error",13:"LABEL",14:"COMMAND",15:"CODE_LINE",16:"CODE_BLOCK",17:"IF",18:"CONDITION",20:"ELSE",21:"{",22:"}",23:"FUNCTION",24:"FUNCTION_NAME",26:"PARAM"},
productions_: [0,[3,0],[3,1],[4,1],[4,2],[5,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[11,1],[10,1],[8,1],[9,1],[7,3],[7,3],[7,3],[19,2],[19,3],[12,4],[12,3],[25,1],[25,2]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
return this.$ = ""
break;
case 2:
return this.$ = $$[$0]
break;
case 3: case 11: case 12: case 23:
this.$ = $$[$0]
break;
case 4:
this.$ = $$[$0-1] + $$[$0]
break;
case 5:
this.$ = yy.expression($$[$0])
break;
case 6:
this.$ = yy.ifWrapper($$[$0])
break;
case 7: case 8:
this.$ = yy.code($$[$0])
break;
case 9:
this.$ = yy.command($$[$0])
break;
case 10:
this.$ = yy.label($$[$0])
break;
case 13: case 14: case 15:
yy.lineNum(yylineno); this.$ = $$[$0]
break;
case 16:
yy.lineNum(yylineno); this.$ = yy["if"]($$[$0-1], $$[$0])
break;
case 17: case 18:
this.$ = yy.ifElse($$[$0-2], $$[$0])
break;
case 19:
this.$ = yy.block("")
break;
case 20:
this.$ = yy.block($$[$0-1])
break;
case 21:
this.$ = yy["function"]($$[$0-2], $$[$0-1], $$[$0])
break;
case 22:
this.$ = yy["function"]($$[$0-1], $$[$0])
break;
case 24:
this.$ = yy.paramList($$[$0-1], $$[$0])
break;
}
},
table: [{1:[2,1],3:1,4:2,5:3,6:4,7:5,8:6,9:7,10:8,11:9,12:10,13:$V0,14:$V1,15:$V2,16:$V3,17:$V4,23:$V5},{1:[3]},{1:[2,2],5:17,6:4,7:5,8:6,9:7,10:8,11:9,12:10,13:$V0,14:$V1,15:$V2,16:$V3,17:$V4,23:$V5},o($V6,[2,3]),o($V6,[2,5]),o($V6,[2,6],{20:$V7}),o($V6,[2,7]),o($V6,[2,8]),o($V6,[2,9]),o($V6,[2,10]),o($V6,[2,11]),{18:[1,19]},o($V6,[2,14]),o($V6,[2,15]),o($V6,[2,13]),o($V6,[2,12]),{24:[1,20]},o($V6,[2,4]),{7:21,17:$V4,19:22,21:$V8},{19:24,21:$V8},{19:26,21:$V8,25:25,26:[1,27]},o($V6,[2,17],{20:$V7}),o($V9,[2,18]),{4:29,5:3,6:4,7:5,8:6,9:7,10:8,11:9,12:10,13:$V0,14:$V1,15:$V2,16:$V3,17:$V4,22:[1,28],23:$V5},o($V9,[2,16]),{19:30,21:$V8,26:[1,31]},o($V6,[2,22]),o($Va,[2,23]),o($V9,[2,19]),{5:17,6:4,7:5,8:6,9:7,10:8,11:9,12:10,13:$V0,14:$V1,15:$V2,16:$V3,17:$V4,22:[1,32],23:$V5},o($V6,[2,21]),o($Va,[2,24]),o($V9,[2,20])],
defaultActions: {},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        function lex() {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
return exports;
});
webvn.module('lexer', function (Class, log, util, exports) {
    "use strict";
    /**
     * @class webvn.script.Token
     * @param {string} tag tag name
     * @param {string} value value
     * @param {object} locationData {first_line, first_column, last_line, last_column}
     * @returns {Array} result [tag, value, locationData]
     */
    var Token = exports.Token = Class.create({

        constructor: function (tag, value, locationData) {
            var token = [];
            token[0] = tag;
            token[1] = value;
            token[2] = locationData;
            return token;
        }

    });

    var EOF = 'END_OF_FILE';

    var Lexer = exports.Lexer = Class.create({

        constructor: function Lexer() {},

        reConfigure: function (code) {

            this.input = code;
            this.length = code.length;
            this.i = 0;
            this.c = this.input.charAt(this.i);
            this.currentLine = 1;
            this.currentColumn = 1;
            this.tokens = [];

        },

        tokenize: function (code) {

            this.reConfigure(code);

            var token = this.nextToken();
            while (token) {
                this.pushToken(token);
                token = this.nextToken();
            }

            return this.tokens;

        },

        lastTokenIs: function (target) {
            var token = this.tokens[this.tokens.length - 1];
            return token && token[0] === target;
        },

        pushToken: function (token) {

            this.tokens.push(token);

        },

        createToken: function (tag, value, locationData) {
            if (value === undefined) {
                value = tag;
                if (locationData === undefined) {
                    locationData = {
                        first_line: this.currentLine,
                        first_column: this.currentColumn - tag.length,
                        last_line: this.currentLine,
                        last_column: this.currentColumn - 1
                    };
                }
            }

            return new Token(tag, value, locationData);

        },

        nextToken: function () {
            while (this.c !== EOF) {
                switch (this.c) {
                    case ' ': case '\t': case '\r': this.WS(); continue;
                    case '/': {
                        if (this.lookAhead(1, '/')) {
                            this.commentLine();
                        } else if (this.lookAhead(1, '*')) {
                            this.commentBlock();
                        }
                    } this.consume(); continue; // Comment
                    case '`': {
                        if (this.lookAhead(2, '``')) {
                            this.consume();
                            return this.codeBlock();
                        } else {
                            this.consume();
                            return this.codeLine();
                        }
                    }
                    case '(': {
                        if (this.lastTokenIs('IF')) {
                            this.consume();
                            return this.condition();
                        } else if (this.lastTokenIs('FUNCTION_NAME')) {
                            this.consume();
                            if (this.c !== ')') {
                                return this.functionParam();
                            } else {
                                this.consume();
                            }
                        } else {
                            this.consume();
                        }
                        break;
                    }
                    case ',': {
                        if (this.lastTokenIs('PARAM')) {
                            this.consume();
                            return this.functionParam();
                        } else {
                            this.consume();
                        }
                        break;
                    }
                    case '{': this.consume(); return this.createToken('{');
                    case '}': this.consume(); return this.createToken('}');
                    default: {
                        if (this.lastTokenIs('FUNCTION') && this.isLetter(this.c)) {
                            return this.functionName();
                        } else if (this.c === 'i' && this.lookAhead(1, 'f')) {
                            this.consumes(2);
                            return this.createToken('IF');
                        } else if (this.c === 'e' && this.lookAhead(3, 'lse')) {
                            this.consumes(4);
                            return this.createToken('ELSE');
                        } else if (this.c === 'f' && this.lookAhead(7, 'unction')) {
                            this.consumes(8);
                            return this.createToken('FUNCTION');
                        } else if (this.c === '*') {
                            this.consume(1);
                            return this.label();
                        }else if (this.isLetter(this.c)) {
                            /* If nothing above matches and it is a letter currently,
                             * it is a command(function call, alias command).
                             */
                            return this.command();
                        } else {
                            this.consume();
                        }
                    }
                }
            }
        },

        /* WS: (' ' | '\t' | '\r')*; Ignore any white space.
         * Line break is not part of the white space group
         * since it is used to indicate the end of line comment and other stuff
         */
        WS: function () {
            while (this.empty(this.c)) {
                this.advance();
            }
        },

        empty: function (c) {
            return c === ' ' || c === '\t' || c === '\r';
        },

        // Move one character and detect end of file
        advance: function () {

            this.i++;
            if (this.i >= this.length) {
                this.c = EOF;
            } else {
                if (this.c === '\n') {
                    this.currentLine++;
                    this.currentColumn = 1;
                } else {
                    this.currentColumn++;
                }
                this.c = this.input.charAt(this.i);
            }

        },

        // Move to next non-whitespace character
        consume: function () {
            this.advance();
            this.WS();
        },

        // Consume several times
        consumes: function (num) {

            var i;

            for (i = 0; i < num; i++) {
                this.consume();
            }

        },

        // Look ahead n character, and see if it resembles target
        lookAhead: function (len, target) {
            var str = '', i;
            for (i = 1; i <= len; i++) {
                str += this.input.charAt(this.i + i);
            }
            return str === target;
        },

        isLetter: function (char) {
            if (!util.isString(char) || char.length !== 1) {
                return false;
            }
            var code = char.charCodeAt(0);
            return ((code >= 65) && (code <= 90)) ||
                ((code >= 97) && (code <= 122)) ||
                // Chinese is regarded as legal letter too.
                ((code >= 19968) && (code <= 40869));
        },

        // Line comment, starts with '//' until the line break
        commentLine: function () {
            this.consumes(2);

            while (!(this.c === '\n')) {
                this.consume();
                if (this.c === EOF) {
                    break;
                }
            }
        },

        // Block comment, starts with '/*', ends with '*/'
        commentBlock: function () {
            this.consumes(2);

            while (!(this.c === '*' && this.lookAhead(1, '/'))) {
                this.consume();
                if (this.c === EOF) {
                    throw new Error('The comment block must end with "*/"');
                }
            }
            this.consume();

        },

        // Line code, starts with '`' until the line break
        codeLine: function () {
            var value = '',
                firstLine, firstColumn, lastLine, lastColumn;

            firstLine = this.currentLine;
            firstColumn = this.currentColumn;

            while (!(this.c === '\n')) {
                value += this.c;
                // Use advance() instead of consume() because white space should be keep
                this.advance();
                if (this.c === EOF) {
                    break;
                }
            }

            lastLine = this.currentLine;
            lastColumn = this.currentColumn - 1;

            return this.createToken('CODE_LINE', value, {
                first_line: firstLine,
                first_column: firstColumn,
                last_line: lastLine,
                last_column: lastColumn
            });
        },

        // Block code, starts with '```', ends with '```'
        codeBlock: function () {
            var value = '',
                firstLine, firstColumn, lastLine, lastColumn;

            this.consumes(2);

            firstLine = this.currentLine;
            firstColumn = this.currentColumn;

            while (!(this.c === '`' && this.lookAhead(2, '``'))) {
                value += this.c;
                this.advance();
                if (this.c === EOF) {
                    throw new Error('The code line must end with "```"');
                }
            }

            lastLine = this.currentLine;
            lastColumn = this.currentColumn - 1;

            this.consumes(3);

            return this.createToken('CODE_BLOCK', value, {
                first_line: firstLine,
                first_column: firstColumn,
                last_line: lastLine,
                last_column: lastColumn
            });
        },

        // Condition
        condition: function () {
            var value = '', leftBracket = 0,
                firstLine, firstColumn, lastLine, lastColumn;

            firstLine = this.currentLine;
            firstColumn = this.currentColumn;

            while (!(this.c === ')' && leftBracket === 0)) {
                value += this.c;
                if (this.c === '(') {
                    leftBracket++;
                } else if (this.c === ')') {
                    leftBracket--;
                }
                this.advance();
                if (this.c === EOF) {
                    throw new Error("One right bracket is missing");
                }
            }

            lastLine = this.currentLine;
            lastColumn = this.currentColumn - 1;

            this.consume();

            return this.createToken('CONDITION', value, {
                first_line: firstLine,
                first_column: firstColumn,
                last_line: lastLine,
                last_column: lastColumn
            });
        },

        functionName: function () {
            var value = '',
                firstLine, firstColumn, lastLine, lastColumn;

            firstLine = this.currentLine;
            firstColumn = this.currentColumn;

            while (this.isLetter(this.c)) {
                value += this.c;
                this.advance();
            }

            lastLine = this.currentLine;
            lastColumn = this.currentColumn - 1;

            return this.createToken('FUNCTION_NAME', value, {
                first_line: firstLine,
                first_column: firstColumn,
                last_line: lastLine,
                last_column: lastColumn
            });
        },

        functionParam: function () {
            var value = '',
                firstLine, firstColumn, lastLine, lastColumn;

            firstLine = this.currentLine;
            firstColumn = this.currentColumn;

            while (this.isLetter(this.c)) {
                value += this.c;
                this.advance();
            }

            lastLine = this.currentLine;
            lastColumn = this.currentColumn - 1;

            return this.createToken('PARAM', value, {
                first_line: firstLine,
                first_column: firstColumn,
                last_line: lastLine,
                last_column: lastColumn
            });
        },

        label: function () {
            var value = '',
                firstLine, firstColumn, lastLine, lastColumn;

            firstLine = this.currentLine;
            firstColumn = this.currentColumn;

            while (!(this.c === '\n') && this.isLetter(this.c)) {
                value += this.c;
                if (this.c === EOF) {
                    break;
                }
                this.advance();
            }

            lastLine = this.currentLine;
            lastColumn = this.currentColumn - 1;

            return this.createToken('LABEL', value, {
                first_line: firstLine,
                first_column: firstColumn,
                last_line: lastLine,
                last_column: lastColumn
            });
        },

        // Command, ends with line break;
        command: function () {
            var value = '',
                firstLine, firstColumn, lastLine, lastColumn;

            firstLine = this.currentLine;
            firstColumn = this.currentColumn;

            var lastC = '';

            // If there is a '\' before line break, then it is not the end of command.
            while (!(this.c === '\n' && lastC !== '\\')) {
                if (this.c === '\n' && lastC === '\\') {
                    value = value.substr(0, value.length - 1) + this.c;
                } else {
                    value += this.c;
                }
                lastC = this.c;
                if (lastC === '\\') {
                    this.consume();
                } else {
                    this.advance();
                }
                if (this.c === EOF) {
                    break;
                }
            }

            lastLine = this.currentLine;
            lastColumn = this.currentColumn - 1;

            return this.createToken('COMMAND', value, {
                first_line: firstLine,
                first_column: firstColumn,
                last_line: lastLine,
                last_column: lastColumn
            });
        }
    });

    var _lexer = new Lexer;

    exports.lexer = function (code) {
        var tokens;

        try {
            tokens = _lexer.tokenize(code);
            return tokens;
        } catch (e) {
            log.error(e.message);
        }
    };
});
/**
 * The WebVN script controller <br>
 * Include lexer, javascript eval and a bunch of other things
 * for controlling the scripts.<br>
 * Note: the parser is generated by jison.
 * @namespace webvn.script
 */
webvn.module('script', function (config, parser, parserNode, util, loader, lexer, log, storage, Class, exports) {
    "use strict";
    var conf = config.create('script');

    lexer = lexer.lexer;

    // Parser
    parser = parser.parser;

    parser.lexer = {
        lex: function () {

            var tag, token;
            token = parser.tokens[this.pos++];

            if (token) {
                tag = token[0];
                this.yytext = token[1];
                this.yyloc = token[2];
                this.yylineno = this.yyloc.first_line;
            } else {
                tag = '';
            }

            return tag;

        },
        setInput: function (tokens) {

            parser.tokens = tokens;

            return this.pos = 0;

        }
    };

    parser.yy = parserNode;

    var parse = exports.parse = function (scenario) {
        var tokens = lexer(scenario);
        return parser.parse(tokens);
    };

    // Parse the source code and eval it
    var wvnEval = exports.eval = function (code) {
        exports.jsEval(parse(code));
    };

    // Script controller

    /* Contains the result of source file eval:
     * [ ['command', 'dialog -d'], ['if', function () { if... }]... ]
     */
    var sources = [];

    // Middle scripts, temporary usage
    var middles = [];

    /* Final command waiting for executing
     */
    var executions = [];

    var isSource = true;

    //noinspection JSUnusedLocalSymbols
    exports.$$ = function () {
        var source = util.toArray(arguments);

        preExec(source, sources.length);

        /* When executing,
         * command defined inside a if statement
         * should be loaded into middles.
         */
        if (isSource) {
            sources.push(source);
        } else {
            middles.push(source);
        }
    };

    // Execute command when first load, handle things like label
    function preExec(source, line) {
        switch (source[0]) {
            case 'label':
                label.create(source[1], line);
                break;
            case 'function':
                // Since functions can't be stored, we have to create them at start
                functions.create(source[1], source[2]);
                break;
        }
    }

    var label = Class.module(function () {
        var exports = {};

        var labels = {};

        exports.create = function (name, lineNum) {
            labels[name] = lineNum;
        };

        exports.has = function (name) {
            return labels[name] !== undefined;
        };

        exports.get = function (name) {
            return labels[name];
        };

        return exports;
    });

    var asset = storage.createAsset(conf.get('path'), conf.get('extension'));

    // Load scenarios and begin executing them
    exports.load = function (scenarios) {

        scenarios = scenarios || conf.get('scenarios');

        if (!util.isArray(scenarios)) {
            scenarios = [scenarios];
        }

        scenarios = scenarios.map(function (value) {
            return asset.get(value);
        });

        loader.scenario(scenarios, function (data, isLast) {
            loadText(data, isLast);
        });

    };

    /**
     * @function webvn.script.loadText
     * @param {string} str
     * @param {boolean=} startGame
     */
    var loadText = exports.loadText = function (str, startGame) {
        wvnEval(str);
        if (startGame) {
            start();
        }
    };

    // Execute command or code
    var exec = exports.exec = function (unit) {

        switch (unit[0]) {
            case 'command':
                execCommand(unit);
                break;
            case 'code':
                execCode(unit);
                break;
            case 'label':
                // Just pass it
                play();
                break;
            default:
                log.warn("Unknown command type");
                break;
        }

    };

    var alias = exports.alias = Class.module(function () {
        var exports = {};

        var container = {};

        exports.create = function (name, value) {
            container[name] = value;
        };

        var commandRegex = /^[^\s]+/;

        exports.parse = function (str) {
            var command = commandRegex.exec(str)[0];
            if (container[command]) {
                return str.replace(commandRegex, container[command]);
            }

            return str;
        };

        return exports;
    });

    var functions = Class.module(function () {
        var exports = {};

        var container = {};

        exports.create = function (name, fn) {
            container[name] = fn;
        };

        exports.has = function (name) {
            return container[name] !== undefined;
        };

        var spaceRegex = /\s/;

        exports.execute = function (name, params) {
            var fn = container[name];

            // Wrap params with spaces
            params = params.map(function (value) {
                if (spaceRegex.test(value)) {
                    value = "'" + value + "'";
                }
                return value;
            });

            isSource = false;
            fn.apply(null, params);
            isSource = true;

            executions = middles.concat(executions);
            middles = [];
        };

        return exports;
    });

    function execCommand(command) {
        var lineNum = command[2],
            commandText = cmdBeautify(command[1]);

        log.info('Command: ' + commandText + ' ' + lineNum);

        // Before parse command, do the alias replacement first.
        commandText = alias.parse(commandText);

        command = exports.parseCommand(commandText);
        var name = command.name,
            options = command.options,
            values = command.values;

        // Execute function
        if (functions.has(name)) {
            functions.execute(name, values);
            play();
            return;
        }

        // Execute command
        var cmd = exports.getCommand(name);
        if (!cmd) {
            if (functions.has('default')) {
                functions.execute('default', [commandText]);
                play();
                return;
            }
            log.warn('Command ' + name + ' doesn\'t exist');
            return;
        }
        cmd.execute(options);
    }

    function cmdBeautify(str) {
        return str.split('\n').
            map(function (value) {
                return util.trim(value);
            }).join(' ');
    }

    function execCode(code) {
        var lineNum = code[2];
        log.info('Code: ' + code[1] + ' ' + lineNum);
        exports.jsEval(code[1]);
    }

    /* Indicate which line is being executed now,
     * related to sources array.
     */
    var curNum = 0;

    // Start executing the scripts from beginning.
    var start = exports.start = function () {
        reset();
        play();
    };

    exports.jump = function (labelName) {
        // Clear executions
        if (!label.has(labelName)) {
            log.warn('Label ' + labelName + ' not found');
            return;
        }
        executions = [];
        curNum = label.get(labelName);
        resume();
    };

    exports.insertCmd = function (script) {
        isSource = false;
        wvnEval(script);
        isSource = true;
    };

    // Reset everything to initial state
    var reset = exports.reset = function () {
        isPaused = false;
        curNum = 0;
        middles = [];
        executions = [];
    };

    // Whether
    var isPaused = false;

    // Similar to play, except the isPaused will be changed to true.
    //noinspection JSUnusedLocalSymbols
    var resume = exports.resume = function () {

        isPaused = false;
        play();

    };

    /* Play the next command,
     * if isPaused is true, then it's not going to work.
     */
    var play = exports.play = function () {
        if (isPaused) {
            return;
        }
        var execution = loadExecutions();
        if (execution) {
            exec(execution);
        }
    };

    // Load executions script
    function loadExecutions() {
        var source, isCommand = false;

        while (true) {
            if (!_loadExecutions()) {
                return;
            }

            source = executions.shift();

            switch (source[0]) {
                case 'if':
                    isSource = false;
                    source[1]();
                    isSource = true;
                    executions = middles.concat(executions);
                    middles = [];
                    break;
                case 'function':
                    functions.create(source[1], source[2]);
                    break;
                default:
                    isCommand = true;
            }

            if (isCommand) {
                break;
            }
        }

        return source;
    }

    function _loadExecutions() {

        if (executions.length === 0) {
            if (curNum >= sources.length) {
                log.warn('End of scripts');
                isPaused = true;
                return false;
            }
            executions.push(sources[curNum]);
            curNum++;
        }

        return true;

    }

    //noinspection JSUnusedLocalSymbols
    var pause = exports.pause = function (duration, cb) {

        isPaused = true;

        if (duration) {
            setTimeout(function () {

                isPaused = false;
                cb && cb();

            }, duration);
        }

    };

    exports.wait = function (duration) {
        pause(duration, function () {
            play();
        });
    };
});
webvn.extend('script', function (exports, util, storage) {
    "use strict";
    var globalStore = storage.createLocalStore('global'),
        g = globalStore.get(), s = {};

    // Quick reference
    var playNext = exports.play;

    // Eval javaScript code with not return value.
    exports.jsEval = function (code) {
        _jsEval(code);
    };

    /* Eval javaScript code with return value.
     * Only simple expressions are allowed to pass in.
     */
    exports.jsEvalVal = function (code) {
        return _jsEval(code, true);
    };

    var emptyStr = '';

    function _jsEval(code, returnOrNot) {

        if (util.trim(code) === '') {
            return emptyStr;
        }

        var scope = {};

        var functionName = util.uid('eval');

        code = 'scope["' + functionName + '"]=function(){' +
        (returnOrNot ? 'return (' : '') +
        code +
        (returnOrNot ? ');' : '') +'}';

        try {
            var $$ = exports.$$;
            eval(code);
        } catch (e) {
            log.error(e.message);
            return emptyStr;
        }

        /* Save it after a while,
         * in case that the eval process is not finished.
         */
        setTimeout(function () {
            globalStore.save();
        }, 1000);

        return scope[functionName]();
    }

    var save = storage.create('s');
    save.save(function () {
        return s;
    }).load(function (value) {
        s = value;
    });
});
webvn.extend('script', function (exports, Class, util) {
    "use strict";
    var commands = {};

    exports.getCommand = function (name) {
        return commands[name];
    };

    exports.createCommand = function (px) {
        new (Command.extend(px));
    };

    /**
     * Command Class <br>
     * Every command that is used should be created using this class.
     * otherwise, the command may not be executed properly by the script interpreter.
     * @class webvn.script.Command
     * @param {string} name command name
     */
    var Command = exports.Command = Class.create({
        constructor: function Command(name) {
            // Add to commands first
            if (commands[name]) {
                log.warn('The command ' + name + ' is overwritten');
            }
            commands[name] = this;

            // Init shortHands and defaults
            var shortHands = {},
                defaults = {};
            util.each(this.options, function (value, key) {
                value.shortHand && (shortHands[value.shortHand] = key);
                value.defaultValue && (defaults[key] = value.defaultValue);
            });
            this.shortHands = shortHands;
            this.defaults = defaults;
        },

        shortHands: {},
        options: {},
        orders: [],

        playNext: function (value) {
            value && exports.play();
        },

        /**
         * Execute command with given options.
         * @method webvn.script.Command#exec
         * @param {object} values
         */
        execute: function (values) {
            values = this.parseOptions(values);
            values = this.evalValue(values);
            this.execution(values);
        },

        /**
         * Call functions according to option values.
         * If you like, you can re-implement it.
         * @method webvn.script.Command#execution
         * @param {object} values values parsed from scripts
         */
        execution: function (values) {
            var orders = this.orders,
                defaults = this.defaults,
                value, order, def;

            this.beforeExec(values);

            for (var i = 0, len = orders.length; i < len; i++) {
                order = orders[i];
                value = values[order];
                def = defaults[order];

                if (!util.isFunction(this[order])) {
                     continue;
                }

                if (value !== undefined) {
                    this[order](value, values);
                } else if (def !== undefined) {
                    this[order](def, values);
                }
            }

            this.afterExec(values);
        },

        beforeExec: function (values) {},

        afterExec: function (values) {},

        evalValue: function (values) {
            var ret = {};

            util.each(values, function (value, key) {
                if (util.isString(value) && util.startsWith(value, '`')) {
                    ret[key] = exports.jsEvalVal(value.substr(1));
                } else {
                    ret[key] = value;
                }
            });

            return ret;
        },

        /**
         * Parse options for final usage in execution function.
         * @param values
         * @returns {object}
         */
        parseOptions: function (values) {
            var ret = {},
                self = this,
                shortHands = this.shortHands;
            util.each(values, function (value, key) {
                var keys = [], opt;
                if (util.startsWith(key, '--')) {
                    key = key.substr(2, key.length - 2);
                    ret[key] = value;
                    keys.push(key);
                } else {
                    key = key.substr(1, key.length - 1);
                    if (shortHands[key]) {
                        ret[shortHands[key]] = value;
                        keys.push(shortHands[key]);
                    } else {
                        for (var i = 0, len = key.length; i < len; i++) {
                            var k = shortHands[key[i]];
                            if (k) {
                                ret[k] = value;
                            }
                            keys.push(k);
                        }
                    }
                }
                // Get rid of illegal options and parse values
                for (i = 0, len = keys.length; i < len; i++) {
                    key = keys[i];
                    opt = self.options[key];
                    if (opt) {
                        ret[key] = self.parseValue(opt.type, ret[key]);
                    } else {
                        delete ret[key];
                    }
                }
            });
            return ret;
        },

        /**
         * Parse option value into specific type
         * @method webvn.script.Command#parseValue
         * @param {string} type String, Boolean...
         * @param {string} value value to be parsed
         * @returns {*}
         */
        parseValue: function (type, value) {
            // Support null assignment
            switch (value) {
                case 'null':
                    return null;
            }

            // LowerCase the type, so that you can write either 'String' or 'string'
            type = type.toLowerCase();
            switch (type) {
                case 'string':
                    return String(value);
                case 'boolean':
                    return !(value === 'false' || value === '0');
                case 'number':
                    return Number(value);
                case 'json':
                    return JSON.parse(value);
                default:
                    return value;
            }
        }

    });

    exports.parseCommand = function (text) {

        /* Break the command into different parts by space
         * The space inside quotes is ignored.
         */
        var parts = [],
            sq = "'",
            dq = '"',
            insideSq = false,
            insideDq = false,
            word = '',
            lastC = '';
        for (var i = 0, len = text.length; i < len; i++, lastC = c) {
            var c = text[i];
            if (i === len - 1) {
                if (c !== sq && c !== dq) {
                    word += c;
                }
                parts.push(word);
            }
            switch (c) {
                case ' ':
                    if (lastC !== ' ') {
                        if (insideDq || insideSq) {
                            word += c;
                            continue;
                        } else {
                            parts.push(word);
                            word = '';
                        }
                    }
                    continue;
                case sq:
                    if (insideSq) {
                        insideSq = false;
                    } else {
                        if (!insideDq) {
                            insideSq = true;
                        } else {
                            word += c;
                        }
                    }
                    continue;
                case dq:
                    if (insideDq) {
                        insideDq = false;
                    } else {
                        if (!insideSq) {
                            insideDq = true;
                        } else {
                            word += c;
                        }
                    }
                    continue;
            }
            word += c;
        }

        var options = {},
            ret = {},
            values = [];
        ret.name = parts.shift();
        for (i = 0, len = parts.length; i < len; i++) {
            var part = parts[i];
            if (util.startsWith(part, '-')) {
                var opt = parseOption(part);
                options[opt.name] = opt.value;
                continue;
            }
            values.push(part);
        }
        ret.options = options;
        ret.values = values;

        return ret;

    };

    /* Change --t=none
     * into {name:'--t', value:'none'}
     */
    function parseOption(text) {

        var ret = {},
            equalPos = text.indexOf('=');

        /* If the option has value, set it to the value
         * Otherwise, just set it to true
         */
        if (equalPos > -1) {
            ret.name = text.substr(0, equalPos);
            ret.value = text.substr(equalPos + 1, text.length - equalPos - 1);
        } else {
            ret.name = text;
            ret.value = true;
        }

        return ret;

    }

});
/* Event module
 * Note: jQuery's implementation is too complex for this one
 * Zepto's implementation is way too simple and has some kind of problem
 * Now I have to implement my own version :(
 */
webvn.module('event', function (util, select, Class) {

    var event = {};

    /* Add event
     * All events are attached to the elem's events, it looks as below:
     * ele.events = {
     *      'click': [],
     *      'mouseenter': []
     * }
     */
    event.add = function (ele, type, fn, selector) {

        var handleObj = {
            selector: selector,
            handler: fn
        }, handlers;

        if (!ele.events) {
            ele.events = {};
        }
        if (!(handlers = ele.events[type])) {
            handlers = ele.events[type] = [];
            handlers.delegateCount = 0;
            ele.addEventListener(type, function (e) {

                trigger.apply(ele, arguments);

            }, false);
        }

        if (selector) {
            handlers.splice(handlers.delegateCount++, 0, handleObj);
        } else {
            handlers.push(handleObj);
        }

    };

    event.Event = Class.create({
        constructor: function Event(e) {

            this.originalEvent = e;

        },
        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,
        isImmediatePropagationStopped: returnFalse,
        preventDefault: function () {

            var e = this.originalEvent;
            this.isDefaultPrevented = returnTrue;
            if (e && e.preventDefault) {
                e.preventDefault();
            }

        },
        stopPropagation: function () {

            var e = this.originalEvent;
            this.isPropagationStopped = returnTrue;
            if (e && e.stopPropagation) {
                e.stopPropagation();
            }

        },
        stopImmediatePropagation: function () {

            var e = this.originalEvent;
            this.isImmediatePropagationStopped = returnTrue;
            if (e && e.stopImmediatePropagation) {
                e.stopImmediatePropagation();
            }
            this.stopPropagation();

        }
    });

    function returnFalse() {

        return false;

    }

    function returnTrue() {

        return true;

    }

    function trigger(e) {

        var handlers = this.events[e.type],
            handlerObj,
            handlerQueue = formatHandlers.call(this, e, handlers);

        e = new event.Event(e);

        var i, j, matched, ret;

        i = 0;
        while ((matched = handlerQueue[i++]) && !e.isPropagationStopped()) {
            e.currentTarget = matched.elem;
            j = 0;
            while ((handleObj = matched.handlers[j++]) && !e.isImmediatePropagationStopped()) {
                ret = handleObj.handler.apply(matched.elem, [e]);
                if (ret === false) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }

    }

    function formatHandlers(e, handlers) {

        var cur = e.target,
            matches,
            handlerQueue = [],
            delegateCount = handlers.delegateCount;

        if (cur.nodeType) {
            for (; cur !== this; cur = cur.parentNode || this) {
                matches = [];
                for (var i = 0; i < delegateCount; i++) {
                    handleObj = handlers[i];
                    sel = handleObj.selector + ' ';
                    if (matches[sel] === undefined) {
                        matches[sel] = util.contains(this.querySelectorAll(sel), cur);
                    }
                    if (matches[sel]) {
                        matches.push(handleObj);
                    }
                }
                if (matches.length) {
                    handlerQueue.push({elem: cur, handlers: matches});
                }
            }
        }
        if (delegateCount < handlers.length) {
            handlerQueue.push({
                elem: this,
                handlers: handlers.slice(delegateCount)
            });
        }

        return handlerQueue;

    }

    // Extend select method
    select.Select.extendFn({
        /**
         * Event binding
         * @method webvn.select.Select#on
         * @param {string} type
         * @param {string=} selector
         * @param {function} fn
         * @returns {Select}
         */
        on: function (type, selector, fn) {
            if (fn === undefined) {
                fn = selector;
                selector = undefined;
            }
            return this.each(function (_, ele) {
                event.add(ele, type, fn, selector);
            });
        }
    });

    return event;

});
/**
 * @namespace webvn.anim
 */
webvn.module('anim', function (exports) {
    "use strict";
    var ease = {};

    ease.linear = function(x, t, b, c, d) {
        t /= d;
        return c*t + b;
    };

    ease.easeInQuad = function (x, t, b, c, d) {
        return c*(t/=d)*t + b;
    };

    ease.easeOutQuad = function (x, t, b, c, d) {
        return -c *(t/=d)*(t-2) + b;
    };

    ease.easeInOutQuad = function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t + b;
        return -c/2 * ((--t)*(t-2) - 1) + b;
    };

    ease.easeInCubic = function (x, t, b, c, d) {
        return c*(t/=d)*t*t + b;
    };

    ease.easeOutCubic = function (x, t, b, c, d) {
        return c*((t=t/d-1)*t*t + 1) + b;
    };

    ease.easeInOutCubic = function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
    };

    ease.easeInQuart = function (x, t, b, c, d) {
        return c*(t/=d)*t*t*t + b;
    };

    ease.easeOutQuart = function (x, t, b, c, d) {
        return -c * ((t=t/d-1)*t*t*t - 1) + b;
    };

    ease.easeInOutQuart = function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
        return -c/2 * ((t-=2)*t*t*t - 2) + b;
    };

    ease.easeInQuint = function (x, t, b, c, d) {
        return c*(t/=d)*t*t*t*t + b;
    };

    ease.easeOutQuint = function (x, t, b, c, d) {
        return c*((t=t/d-1)*t*t*t*t + 1) + b;
    };

    ease.easeInOutQuint = function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
        return c/2*((t-=2)*t*t*t*t + 2) + b;
    };

    ease.easeInSine = function (x, t, b, c, d) {
        return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
    };

    ease.easeOutSine = function (x, t, b, c, d) {
        return c * Math.sin(t / d * (Math.PI / 2)) + b;
    };

    ease.easeInOutSine = function (x, t, b, c, d) {
        return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
    };

    ease.easeInExpo = function (x, t, b, c, d) {
        return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
    };

    ease.easeOutExpo = function (x, t, b, c, d) {
        return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
    };

    ease.easeInOutExpo = function (x, t, b, c, d) {
        if (t==0) return b;
        if (t==d) return b+c;
        if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
        return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
    };

    ease.easeInCirc = function (x, t, b, c, d) {
        return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
    };

    ease.easeOutCirc = function (x, t, b, c, d) {
        return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
    };

    ease.easeInOutCirc = function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
        return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
    };

    ease.easeInElastic = function (x, t, b, c, d) {
        var s;
        s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
        if (a < Math.abs(c)) { a=c; s=p/4; }
        else s = p/(2*Math.PI) * Math.asin (c/a);
        return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
    };

    ease.easeOutElastic = function (x, t, b, c, d) {
        var s;
        s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
        if (a < Math.abs(c)) { a=c; s=p/4; }
        else s = p/(2*Math.PI) * Math.asin (c/a);
        return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
    };

    ease.easeInOutElastic = function (x, t, b, c, d) {
        var s;
        s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
        if (a < Math.abs(c)) { a=c; s=p/4; }
        else s = p/(2*Math.PI) * Math.asin (c/a);
        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
        return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
    };

    ease.easeInBack = function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        return c*(t/=d)*t*((s+1)*t - s) + b;
    };

    ease.easeOutBack = function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
    };

    ease.easeInOutBack = function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
        return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
    };

    ease.easeInBounce = function (x, t, b, c, d) {
        return c - anim.ease.easeOutBounce (x, d-t, 0, c, d) + b;
    };

    ease.easeOutBounce = function (x, t, b, c, d) {
        if ((t/=d) < (1/2.75)) {
            return c*(7.5625*t*t) + b;
        } else if (t < (2/2.75)) {
            return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
        } else if (t < (2.5/2.75)) {
            return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
        } else {
            return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
        }
    };

    ease.easeInOutBounce = function (x, t, b, c, d) {
        if (t < d/2) return anim.ease.easeInBounce (x, t*2, 0, c, d) * .5 + b;
        return anim.ease.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
    };

    exports.ease = ease;
});
webvn.extend('anim', function (exports, Class, util, select) {
    "use strict";

    var STATE = {
        PAUSE: 0,
        PLAY: 1
    };

    var requestAnim = window.requestAnimationFrame;

    var Anim = exports.Anim = Class.create({

        constructor: function Anim(target) {
            this.loop = false;
            this.target = target;
            this.clear();
        },

        clear: function () {
            this.state = STATE.PAUSE;
            this._steps = [];
            this._curStep = 0;
        },

        to: function (props, duration, easeName) {
            if (!util.isNumber(duration) || duration < 0) {
                duration = 0;
            }
            easeName = easeName || 'linear';
            easeName = exports.ease[easeName];
            this._steps.push({
                type: 'to',
                props: props,
                duration: duration,
                ease: easeName
            });
            this.play();
            return this;
        },

        pause: function () {
            if (this.state === STATE.PAUSE) {
                return;
            }
            this.state = STATE.PAUSE;
        },

        stop: function () {
            this._curStep = 0;
            this.pause();
        },

        play: function () {
            if (this._steps.length === 0 || this.state === STATE.PLAY) {
                return;
            }
            if (this._curStep >= this._steps.length) {
                if (this.loop) {
                    this._curStep = 0;
                    this.play();
                } else {
                    this.stop();
                }
                return;
            }
            var step = this._steps[this._curStep];
            this._curStep++;
            switch (step.type) {
                case 'to':
                    this.playTo(step);
                    break;
                case 'call':
                    this.playCall(step);
                    break;
                case 'wait':
                    this.playWait(step);
                    break;
            }
            this.state = STATE.PLAY;
            return this;
        },

        playTo: function (step) {
            var self = this,
                start = +new Date,
                finish = start + step.duration,
                origin = {},
                diff = {};

            /* If target is a Select instance,
             * Animate Css properties instead.
             */
            var isSelect = false;
            if (select.isSelect(this.target)) {
                isSelect = true;
            }
            util.each(step.props, function (value, key) {
                if (isSelect) {
                    origin[key] = self.target.cssComputed(key);
                } else {
                    origin[key] = self.target[key];
                }
                diff[key] = value - origin[key];
            });

            this._render = function () {
                if (self.state === STATE.PAUSE) {
                    return;
                }

                var time = +new Date;
                // One step of tween is finish
                if (time > finish) {
                    if (isSelect) {
                        self.target.css(step.props);
                    } else {
                        util.each(step.props, function (value, key) {
                            self.target[key] = value;
                        });
                    }
                    self.state = STATE.PAUSE;
                    // Play the next step
                    self.play();
                    return;
                }
                var values = {};
                util.each(step.props, function (value, key) {
                    value = step.ease(0, time - start,
                        origin[key], diff[key], step.duration);
                    if (isSelect) {
                        values[key] = value;
                    } else {
                        self.target[key] = value;
                    }
                });
                if (isSelect) {
                    self.target.css(values);
                }
                requestAnim(self._render);
            };

            requestAnim(this._render);
        },

        playCall: function (step) {
            step.fn.call(this);
            this.state = STATE.PAUSE;
            this.play();
        },

        playWait: function (step) {
            var self = this;
            setTimeout(function () {
                self.state = STATE.PAUSE;
                self.play();
            }, step.duration);
        },

        wait: function (duration) {
            this._steps.push({
                type: 'wait',
                duration: duration
            });
            this.play();
            return this;
        },

        call: function (fn) {
            if (!util.isFunction(fn)) {
                return;
            }
            this._steps.push({
                type: 'call',
                fn: fn
            });
            this.play();
            return this;
        }
    });

    exports.create = function (target) {
        return new Anim(target);
    };
});
webvn.extend('select', function (exports, anim, util) {
    "use strict";

    var Anim = anim.Anim;

    exports.Select.extendFn({

        fadeIn: function (duration, cb) {
            var opacity = this.css('opacity');
            if (opacity > 0) {
                this.css('opacity', 0);
            }
            this.show();
            new Anim(this).to({
                opacity: 1
            }, duration).call(cb);
        },

        fadeOut: function (duration, cb) {
            var self = this;
            new Anim(this).to({
                opacity: 0
            }, duration).call(function () {
                self.hide();
                util.isFunction(cb) && cb();
            });
        }
    });

});
webvn.module('webgl', function (Class, util, log, config, exports) {
    "use strict";
    exports.fragShader = Class.module(function () {
        var exports = {};

        var shaders = {};

        exports.create = function (name, value) {
            if (util.isObject(name)) {
                util.each(name, function (value, key) {
                    shaders[key] = value;
                });
            } else {
                shaders[name] = value;
            }
        };

        exports.get = function (name) {
            return shaders[name];
        };

        return exports;
    });

    exports.vertexShader = Class.module(function () {
        var exports = {};

        var shaders = {};

        exports.create = function (name, value) {
            if (util.isObject(name)) {
                util.each(name, function (value, key) {
                    shaders[key] = value;
                });
            } else {
                shaders[name] = value;
            }
        };

        exports.get = function (name) {
            return shaders[name];
        };

        return exports;
    });

    var Shader = exports.Shader = Class.create({

        constructor: function Shader(gl, type) {
            this.gl = gl;
            this.type = type;
            if (type === 'frag') {
                this.value = gl.createShader(gl.FRAGMENT_SHADER);
            } else {
                this.value = gl.createShader(gl.VERTEX_SHADER);
            }
        },

        source: function (source) {
            var gl = this.gl;

            if (exports[this.type + 'Shader'].get(source)) {
                source = exports[this.type + 'Shader'].get(source);
            }

            gl.shaderSource(this.value, source);
            gl.compileShader(this.value);

            if (config.build === 'release') {
                return;
            }
            var compileStatus = gl.getShaderParameter(this.value, gl.COMPILE_STATUS);
            // If compileStatus not true, something is wrong.
            if (!compileStatus) {
                var lastError = gl.getShaderInfoLog(this.value);
                log.error('Error compiling shader: ' + lastError);
                gl.deleteShader(this.value);
            }
        }

    });

    exports.createShader = function (gl, type) {
        return new Shader(gl, type);
    };
});
webvn.use(function (webgl) { webgl.fragShader.create({
    "colorMatrix": "#ifdef GL_ES\r\n    precision mediump float;\r\n#endif\r\n\r\nvarying vec2 v_Uv;\r\nuniform sampler2D u_Sampler;\r\nuniform float m[20];\r\n\r\nvoid main() {\r\n    vec4 c = texture2D(u_Sampler, v_Uv);\r\n    gl_FragColor.r = m[0] * c.r + m[1] * c.g + m[2] * c.b + m[3] * c.a + m[4];\r\n    gl_FragColor.g = m[5] * c.r + m[6] * c.g + m[7] * c.b + m[8] * c.a + m[9];\r\n    gl_FragColor.b = m[10] * c.r + m[11] * c.g + m[12] * c.b + m[13] * c.a + m[14];\r\n    gl_FragColor.a = m[15] * c.r + m[16] * c.g + m[17] * c.b + m[18] * c.a + m[19];\r\n}",
    "convolution": "precision mediump float;\r\nvarying vec2 v_Uv;\r\nuniform sampler2D u_Sampler;\r\nuniform vec2 u_Px;\r\nuniform float m[9];\r\nvoid main(void) {\r\n    vec4 c11 = texture2D(u_Sampler, v_Uv - u_Px);\r\n    vec4 c12 = texture2D(u_Sampler, vec2(v_Uv.x, v_Uv.y - u_Px.y));\r\n    vec4 c13 = texture2D(u_Sampler, vec2(v_Uv.x + u_Px.x, v_Uv.y - u_Px.y));\r\n    vec4 c21 = texture2D(u_Sampler, vec2(v_Uv.x - u_Px.x, v_Uv.y));\r\n    vec4 c22 = texture2D(u_Sampler, v_Uv);\r\n    vec4 c23 = texture2D(u_Sampler, vec2(v_Uv.x + u_Px.x, v_Uv.y));\r\n    vec4 c31 = texture2D(u_Sampler, vec2(v_Uv.x - u_Px.x, v_Uv.y + u_Px.y));\r\n    vec4 c32 = texture2D(u_Sampler, vec2(v_Uv.x, v_Uv.y + u_Px.y));\r\n    vec4 c33 = texture2D(u_Sampler, v_Uv + u_Px);\r\n    gl_FragColor =\r\n        c11 * m[0] + c12 * m[1] + c22 * m[2] +\r\n        c21 * m[3] + c22 * m[4] + c23 * m[5] +\r\n        c31 * m[6] + c32 * m[7] + c33 * m[8];\r\n    gl_FragColor.a = c22.a;\r\n}",
    "drawImage": "#ifdef GL_ES\r\n    precision mediump float;\r\n#endif\r\n\r\nuniform sampler2D u_Sampler;\r\nuniform float u_Alpha;\r\nvarying vec4 test;\r\nvarying vec2 v_TexCoord;\r\n\r\nvoid main() {\r\n    vec4 textureColor = texture2D(u_Sampler, v_TexCoord);\r\n    gl_FragColor = vec4(textureColor.rgb, textureColor.a * u_Alpha);\r\n}",
    "trans_HSVfade": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nvec3 hsv2rgb(vec3 c) {\n    const vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec3 rgb2hsv(vec3 c) {\n    const vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n    float d = q.x - min(q.w, q.y);\n    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 0.001)), d / (q.x + 0.001), q.x);\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec3 a = rgb2hsv(texture2D(from, p).rgb);\n    vec3 b = rgb2hsv(texture2D(to, p).rgb);\n    vec3 m = mix(a, b, progress);\n    vec4 r = vec4(hsv2rgb(m), mix(texture2D(from, p).a, texture2D(to, p).a, progress));\n    gl_FragColor = r;\n}",
    "trans_advancedMosaic": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nvoid main(void)\n{\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float T = progress;\n    float S0 = 1.0;\n    float S1 = 50.0;\n    float S2 = 1.0;\n    float Half = 0.5;\n    float PixelSize = ( T < Half ) ? mix( S0, S1, T / Half ) : mix( S1, S2, (T-Half) / Half );\n    vec2 D = PixelSize / resolution.xy;\n    vec2 UV = ( p + vec2( -0.5 ) ) / D;\n    vec2 Coord = clamp( D * ( ceil( UV + vec2( -0.5 ) ) ) + vec2( 0.5 ), vec2( 0.0 ), vec2( 1.0 ) );\n    vec4 C0 = texture2D( from, Coord );\n    vec4 C1 = texture2D( to, Coord );\n    gl_FragColor = mix( C0, C1, T );\n}",
    "trans_burn": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst vec3 color = vec3(0.9, 0.4, 0.2);\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = mix(\n        texture2D(from, p) + vec4(progress*color, 0.0),\n        texture2D(to, p) + vec4((1.0-progress)*color, 0.0),\n        progress);\n}",
    "trans_butterflyWaveScrawler": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst float amplitude = 1.0;\nconst float waves = 30.0;\nconst float colorSeparation = 0.3;\nfloat PI = 3.14159265358979323846264;\nfloat compute(vec2 p, float progress, vec2 center) {\n    vec2 o = p*sin(progress * amplitude)-center;\n    vec2 h = vec2(1., 0.);\n    float theta = acos(dot(o, h)) * waves;\n    return (exp(cos(theta)) - 2.*cos(4.*theta) + pow(sin((2.*theta - PI) / 24.), 5.)) / 10.;\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float inv = 1. - progress;\n    vec2 dir = p - vec2(.5);\n    float dist = length(dir);\n    float disp = compute(p, progress, vec2(0.5, 0.5)) ;\n    vec4 texTo = texture2D(to, p + inv*disp);\n    vec4 texFrom = vec4(\n    texture2D(from, p + progress*disp*(1.0 - colorSeparation)).r,\n    texture2D(from, p + progress*disp).g,\n    texture2D(from, p + progress*disp*(1.0 + colorSeparation)).b,\n    1.0);\n    gl_FragColor = texTo*progress + texFrom*inv;\n}",
    "trans_circleOpen": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst float smoothness = 0.3;\nconst bool opening = true;\nconst vec2 center = vec2(0.5, 0.5);\nconst float SQRT_2 = 1.414213562373;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float x = opening ? progress : 1.-progress;\n    float m = smoothstep(-smoothness, 0.0, SQRT_2*distance(center, p) - x*(1.+smoothness));\n    gl_FragColor = mix(texture2D(from, p), texture2D(to, p), opening ? 1.-m : m);\n}",
    "trans_colourDistance": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec4 fTex = texture2D(from,p);\n    vec4 tTex = texture2D(to,p);\n    gl_FragColor = mix(distance(fTex,tTex)>progress?fTex:tTex, tTex, pow(progress,5.0));\n}",
    "trans_crazyParametricFun": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst float a = 4.0;\nconst float b = 1.0;\nconst float amplitude = 120.0;\nconst float smoothness = 0.1;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec2 dir = p - vec2(.5);\n    float dist = length(dir);\n    float x = (a - b) * cos(progress) + b * cos(progress * ((a / b) - 1.) );\n    float y = (a - b) * sin(progress) - b * sin(progress * ((a / b) - 1.));\n    vec2 offset = dir * vec2(sin(progress  * dist * amplitude * x), sin(progress * dist * amplitude * y)) / smoothness;\n    gl_FragColor = mix(texture2D(from, p + offset), texture2D(to, p), smoothstep(0.2, 1.0, progress));\n}",
    "trans_crossHatch": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst vec2 center = vec2(0.5, 0.5);\nfloat quadraticInOut(float t) {\n    float p = 2.0 * t * t;\n    return t < 0.5 ? p : -p + (4.0 * t) - 1.0;\n}\nfloat rand(vec2 co) {\n    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    if (progress == 0.0) {\n        gl_FragColor = texture2D(from, p);\n    } else if (progress == 1.0) {\n        gl_FragColor = texture2D(to, p);\n    } else {\n        float x = progress;\n        float dist = distance(center, p);\n        float r = x - min(rand(vec2(p.y, 0.0)), rand(vec2(0.0, p.x)));\n        float m = dist <= r ? 1.0 : 0.0;\n        gl_FragColor = mix(texture2D(from, p), texture2D(to, p), m);\n    }\n}",
    "trans_crossZoom": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst float PI = 3.141592653589793;\nfloat Linear_ease(in float begin, in float change, in float duration, in float time) {\n    return change * time / duration + begin;\n}\nfloat Exponential_easeInOut(in float begin, in float change, in float duration, in float time) {\n    if (time == 0.0)\n        return begin;\n    else if (time == duration)\n        return begin + change;\n    time = time / (duration / 2.0);\n    if (time < 1.0)\n        return change / 2.0 * pow(2.0, 10.0 * (time - 1.0)) + begin;\n    return change / 2.0 * (-pow(2.0, -10.0 * (time - 1.0)) + 2.0) + begin;\n}\nfloat Sinusoidal_easeInOut(in float begin, in float change, in float duration, in float time) {\n    return -change / 2.0 * (cos(PI * time / duration) - 1.0) + begin;\n}\nfloat random(in vec3 scale, in float seed) {\n    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\n}\nvec3 crossFade(in vec2 uv, in float dissolve) {\n    return mix(texture2D(from, uv).rgb, texture2D(to, uv).rgb, dissolve);\n}\nvoid main() {\n    vec2 texCoord = gl_FragCoord.xy / resolution.xy;\n    vec2 center = vec2(Linear_ease(0.25, 0.5, 1.0, progress), 0.5);\n    float dissolve = Exponential_easeInOut(0.0, 1.0, 1.0, progress);\n    float strength = Sinusoidal_easeInOut(0.0, 0.4, 0.5, progress);\n    vec3 color = vec3(0.0);\n    float total = 0.0;\n    vec2 toCenter = center - texCoord;\n    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\n    for (float t = 0.0; t <= 40.0; t++) {\n        float percent = (t + offset) / 40.0;\n        float weight = 4.0 * (percent - percent * percent);\n        color += crossFade(texCoord + toCenter * percent * strength, dissolve) * weight;\n        total += weight;\n    }\n    gl_FragColor = vec4(color / total, 1.0);\n}",
    "trans_cube": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nuniform float persp;\nuniform float unzoom;\nuniform float reflection;\nuniform float floating;\n\nvec2 project (vec2 p) {\n  return p * vec2(1.0, -1.2) + vec2(0.0, -floating/100.);\n}\n\nbool inBounds (vec2 p) {\n  return all(lessThan(vec2(0.0), p)) && all(lessThan(p, vec2(1.0)));\n}\n\nvec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {\n  vec4 c = vec4(0.0, 0.0, 0.0, 1.0);\n  pfr = project(pfr);\n  if (inBounds(pfr)) {\n    c += mix(vec4(0.0), texture2D(from, pfr), reflection * mix(1.0, 0.0, pfr.y));\n  }\n  pto = project(pto);\n  if (inBounds(pto)) {\n    c += mix(vec4(0.0), texture2D(to, pto), reflection * mix(1.0, 0.0, pto.y));\n  }\n  return c;\n}\n\nvec2 xskew (vec2 p, float persp, float center) {\n  float x = mix(p.x, 1.0-p.x, center);\n  return (\n    (\n      vec2( x, (p.y - 0.5*(1.0-persp) * x) / (1.0+(persp-1.0)*x) )\n      - vec2(0.5-distance(center, 0.5), 0.0)\n    )\n    * vec2(0.5 / distance(center, 0.5) * (center<0.5 ? 1.0 : -1.0), 1.0)\n    + vec2(center<0.5 ? 0.0 : 1.0, 0.0)\n  );\n}\n\nvoid main() {\n  vec2 op = gl_FragCoord.xy / resolution.xy;\n  float uz = unzoom * 2.0*(0.5-distance(0.5, progress));\n  vec2 p = -uz*0.5+(1.0+uz) * op;\n  vec2 fromP = xskew(\n    (p - vec2(progress, 0.0)) / vec2(1.0-progress, 1.0),\n    1.0-mix(progress, 0.0, persp),\n    0.0\n  );\n  vec2 toP = xskew(\n    p / vec2(progress, 1.0),\n    mix(pow(progress, 2.0), 1.0, persp),\n    1.0\n  );\n  if (inBounds(fromP)) {\n    gl_FragColor = texture2D(from, fromP);\n  }\n  else if (inBounds(toP)) {\n    gl_FragColor = texture2D(to, toP);\n  }\n  else {\n    gl_FragColor = bgColor(op, fromP, toP);\n  }\n}",
    "trans_defocusBlur": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform float progress;\nuniform vec2 resolution;\nuniform sampler2D from;\nuniform sampler2D to;\nvoid main(void) {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float T = progress;\n    float S0 = 1.0;\n    float S1 = 50.0;\n    float S2 = 1.0;\n    float Half = 0.5;\n    float PixelSize = ( T < Half ) ? mix( S0, S1, T / Half ) : mix( S1, S2, (T-Half) / Half );\n    vec2 D = PixelSize / resolution.xy;\n    vec2 UV = (gl_FragCoord.xy / resolution.xy);\n    const int NumTaps = 12;\n    vec2 Disk[NumTaps];\n    Disk[0] = vec2(-.326,-.406);\n    Disk[1] = vec2(-.840,-.074);\n    Disk[2] = vec2(-.696, .457);\n    Disk[3] = vec2(-.203, .621);\n    Disk[4] = vec2( .962,-.195);\n    Disk[5] = vec2( .473,-.480);\n    Disk[6] = vec2( .519, .767);\n    Disk[7] = vec2( .185,-.893);\n    Disk[8] = vec2( .507, .064);\n    Disk[9] = vec2( .896, .412);\n    Disk[10] = vec2(-.322,-.933);\n    Disk[11] = vec2(-.792,-.598);\n    vec4 C0 = texture2D( from, UV );\n    vec4 C1 = texture2D( to, UV );\n    for ( int i = 0; i != NumTaps; i++ )\n    {\n        C0 += texture2D( from, Disk[i] * D + UV );\n        C1 += texture2D( to, Disk[i] * D + UV );\n    }\n    C0 /= float(NumTaps+1);\n    C1 /= float(NumTaps+1);\n    gl_FragColor = mix( C0, C1, T );\n}",
    "trans_directionalWipe": "#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst vec2 direction = vec2(1.0, -1.0);\nconst float smoothness = 0.5;\nconst vec2 center = vec2(0.5, 0.5);\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec2 v = normalize(direction);\n    v /= abs(v.x)+abs(v.y);\n    float d = v.x * center.x + v.y * center.y;\n    float m = smoothstep(-smoothness, 0.0, v.x * p.x + v.y * p.y - (d-0.5+progress*(1.+smoothness)));\n    gl_FragColor = mix(texture2D(to, p), texture2D(from, p), m);\n}",
    "trans_dispersionBlur": "#ifdef GL_ES\nprecision mediump float;\n#endif\n#define QUALITY 32\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst float GOLDEN_ANGLE = 2.399963229728653;\nvec4 blur(sampler2D t, vec2 c, float radius) {\n    vec4 sum = vec4(0.0);\n    float q = float(QUALITY);\n    for (int i=0; i<QUALITY; ++i) {\n        float fi = float(i);\n        float a = fi * GOLDEN_ANGLE;\n        float r = sqrt(fi / q) * radius;\n        vec2 p = c + r * vec2(cos(a), sin(a));\n        sum += texture2D(t, p);\n    }\n    return sum / q;\n}\nvoid main()\n{\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float inv = 1.-progress;\n    gl_FragColor = inv*blur(from, p, progress*0.6) + progress*blur(to, p, inv*0.6);\n}",
    "trans_dissolve": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst float blocksize = 1.0;\nfloat rand(vec2 co) {\n    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = mix(texture2D(from, p), texture2D(to, p), step(rand(floor(gl_FragCoord.xy/blocksize)), progress));\n}",
    "trans_doomScreenTransition": "#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nfloat rand(int num) {\n    return fract(mod(float(num) * 67123.313, 12.0) * sin(float(num) * 10.3) * cos(float(num)));\n}\nfloat wave(int num) {\n    float fn = float(num) * 1.0 * 0.1 * float(10.0);\n    return cos(fn * 0.5) * cos(fn * 0.13) * sin((fn+10.0) * 0.3) / 2.0 + 0.5;\n}\nfloat pos(int num) {\n    return wave(num);\n}\nvoid main() {\n    int bar = int(gl_FragCoord.x) / 10;\n    float scale = 1.0 + pos(bar) * 2.0;\n    float phase = progress * scale;\n    float posY = gl_FragCoord.y / resolution.y;\n    vec2 p;\n    vec4 c;\n    if (phase + posY < 1.0) {\n        p = vec2(gl_FragCoord.x, gl_FragCoord.y + mix(0.0, resolution.y, phase)) / resolution.xy;\n        c = texture2D(from, p);\n    } else {\n        p = gl_FragCoord.xy / resolution.xy;\n        c = texture2D(to, p);\n    }\n    gl_FragColor = c;\n}",
    "trans_doorway": "#ifdef GL_ES\nprecision mediump float;\n#endif\n\n// General parameters\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\n \nfloat reflection = 0.4;\nfloat perspective = 0.4;\nfloat depth = 3.0;\n \nconst vec4 black = vec4(0.0, 0.0, 0.0, 1.0);\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\n \nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\n \nvec2 project (vec2 p) {\n  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);\n}\n \nvec4 bgColor (vec2 p, vec2 pto) {\n  vec4 c = black;\n  pto = project(pto);\n  if (inBounds(pto)) {\n    c += mix(black, texture2D(to, pto), reflection * mix(1.0, 0.0, pto.y));\n  }\n  return c;\n}\n \nvoid main() {\n  vec2 p = gl_FragCoord.xy / resolution.xy;\n \n  vec2 pfr = vec2(-1.), pto = vec2(-1.);\n \n  float middleSlit = 2.0 * abs(p.x-0.5) - progress;\n  if (middleSlit > 0.0) {\n    pfr = p + (p.x > 0.5 ? -1.0 : 1.0) * vec2(0.5*progress, 0.0);\n    float d = 1.0/(1.0+perspective*progress*(1.0-middleSlit));\n    pfr.y -= d/2.;\n    pfr.y *= d;\n    pfr.y += d/2.;\n  }\n \n  float size = mix(1.0, depth, 1.-progress);\n  pto = (p + vec2(-0.5, -0.5)) * vec2(size, size) + vec2(0.5, 0.5);\n \n  if (inBounds(pfr)) {\n    gl_FragColor = texture2D(from, pfr);\n  }\n  else if (inBounds(pto)) {\n    gl_FragColor = texture2D(to, pto);\n  }\n  else {\n    gl_FragColor = bgColor(p, pto);\n  }\n}",
    "trans_dreamy": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nvec2 offset(float progress, float x, float theta) {\n    float phase = progress*progress + progress + theta;\n    float shifty = 0.03*progress*cos(10.0*(progress+x));\n    return vec2(0, shifty);\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = mix(texture2D(from, p + offset(progress, p.x, 0.0)), texture2D(to, p + offset(1.0-progress, p.x, 3.14)), progress);\n}",
    "trans_fadeColorBlack": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst vec3 color = vec3(0.0, 0.0, 0.0);\nconst float colorPhase = 0.4;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = mix(\n        mix(vec4(color, 1.0), texture2D(from, p), smoothstep(1.0-colorPhase, 0.0, progress)),\n        mix(vec4(color, 1.0), texture2D(to,   p), smoothstep(    colorPhase, 1.0, progress)),\n        progress);\n    gl_FragColor.a = mix(texture2D(from, p).a, texture2D(to, p).a, progress);\n}",
    "trans_fadeGrayscale": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst float grayPhase = 0.3;\nvec3 grayscale (vec3 color) {\n    return vec3(0.2126*color.r + 0.7152*color.g + 0.0722*color.b);\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec4 fc = texture2D(from, p);\n    vec4 tc = texture2D(to, p);\n    gl_FragColor = mix(\n        mix(vec4(grayscale(fc.rgb), 1.0), texture2D(from, p), smoothstep(1.0-grayPhase, 0.0, progress)),\n        mix(vec4(grayscale(tc.rgb), 1.0), texture2D(to,   p), smoothstep(    grayPhase, 1.0, progress)),\n        progress);\n    gl_FragColor.a = mix(fc.a, tc.a, progress);\n}",
    "trans_finalGaussianNoise": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nfloat Rand(vec2 v) {\n  return fract(sin(dot(v.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\n\nfloat Gaussian(float p, float center, float c) {\n  return 0.75 * exp(- pow((p - center) / c, 2.));\n}\n\nvoid main() {\n  vec2 p = gl_FragCoord.xy / resolution.xy;\n  float c = cos(Gaussian(progress * (1. + Gaussian(progress * Rand(p), 0.5, 0.5)), 0.5, 0.25));\n  vec2 d = p * c;\n  \n  gl_FragColor = mix(texture2D(from, d), texture2D(to, d), progress);\n}",
    "trans_flash": "#ifdef GL_ES\nprecision highp float;\n#endif\n \n// General parameters\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\n \nfloat flashPhase = 0.3; // if 0.0, the image directly turn grayscale, if 0.9, the grayscale transition phase is very important\nfloat flashIntensity = 3.0;\nfloat flashZoomEffect = 0.5;\n \nconst vec3 flashColor = vec3(1.0, 0.8, 0.3);\nconst float flashVelocity = 3.0;\n \nvoid main() {\n  vec2 p = gl_FragCoord.xy / resolution.xy;\n  vec4 fc = texture2D(from, p);\n  vec4 tc = texture2D(to, p);\n  float intensity = mix(1.0, 2.0*distance(p, vec2(0.5, 0.5)), flashZoomEffect) * flashIntensity * pow(smoothstep(flashPhase, 0.0, distance(0.5, progress)), flashVelocity);\n  vec4 c = mix(texture2D(from, p), texture2D(to, p), smoothstep(0.5*(1.0-flashPhase), 0.5*(1.0+flashPhase), progress));\n  c += intensity * vec4(flashColor, 1.0);\n  gl_FragColor = c;\n}",
    "trans_flyEye": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst float size = 0.04;\nconst float zoom = 30.0;\nconst float colorSeparation = 0.3;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float inv = 1. - progress;\n    vec2 disp = size*vec2(cos(zoom*p.x), sin(zoom*p.y));\n    vec4 texTo = texture2D(to, p + inv*disp);\n    vec4 texFrom = vec4(\n        texture2D(from, p + progress*disp*(1.0 - colorSeparation)).r,\n        texture2D(from, p + progress*disp).g,\n        texture2D(from, p + progress*disp*(1.0 + colorSeparation)).b,\n        texture2D(from, p + progress*disp).a);\n    gl_FragColor = texTo*progress + texFrom*inv;\n}",
    "trans_fold": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nvoid main() {\n  vec2 p = gl_FragCoord.xy / resolution.xy;\n  vec4 a = texture2D(from, (p - vec2(progress, 0.0)) / vec2(1.0-progress, 1.0));\n  vec4 b = texture2D(to, p / vec2(progress, 1.0));\n  gl_FragColor = mix(a, b, step(p.x, progress));\n}",
    "trans_glitchDisplace": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nmediump float random(vec2 co)\n{\n    mediump float a = 12.9898;\n    mediump float b = 78.233;\n    mediump float c = 43758.5453;\n    mediump float dt= dot(co.xy ,vec2(a,b));\n    mediump float sn= mod(dt,3.14);\n    return fract(sin(sn) * c);\n}\nfloat voronoi( in vec2 x ) {\n    vec2 p = floor( x );\n    vec2 f = fract( x );\n    float res = 8.0;\n    for( float j=-1.; j<=1.; j++ )\n    for( float i=-1.; i<=1.; i++ ) {\n        vec2  b = vec2( i, j );\n        vec2  r = b - f + random( p + b );\n        float d = dot( r, r );\n        res = min( res, d );\n    }\n    return sqrt( res );\n}\nvec2 displace(vec4 tex, vec2 texCoord, float dotDepth, float textureDepth, float strength) {\n    float b = voronoi(.003 * texCoord + 2.0);\n    float g = voronoi(0.2 * texCoord);\n    float r = voronoi(texCoord - 1.0);\n    vec4 dt = tex * 1.0;\n    vec4 dis = dt * dotDepth + 1.0 - tex * textureDepth;\n    dis.x = dis.x - 1.0 + textureDepth*dotDepth;\n    dis.y = dis.y - 1.0 + textureDepth*dotDepth;\n    dis.x *= strength;\n    dis.y *= strength;\n    vec2 res_uv = texCoord ;\n    res_uv.x = res_uv.x + dis.x - 0.0;\n    res_uv.y = res_uv.y + dis.y;\n    return res_uv;\n}\nfloat ease1(float t) {\n    return t == 0.0 || t == 1.0\n        ? t\n        : t < 0.5\n        ? +0.5 * pow(2.0, (20.0 * t) - 10.0)\n        : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;\n}\nfloat ease2(float t) {\n    return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec4 color1 = texture2D(from, p);\n    vec4 color2 = texture2D(to, p);\n    vec2 disp = displace(color1, p, 0.33, 0.7, 1.0-ease1(progress));\n    vec2 disp2 = displace(color2, p, 0.33, 0.5, ease2(progress));\n    vec4 dColor1 = texture2D(to, disp);\n    vec4 dColor2 = texture2D(from, disp2);\n    float val = ease1(progress);\n    vec3 gray = vec3(dot(min(dColor2, dColor1).rgb, vec3(0.299, 0.587, 0.114)));\n    dColor2 = vec4(gray, 1.0);\n    dColor2 *= 2.0;\n    color1 = mix(color1, dColor2, smoothstep(0.0, 0.5, progress));\n    color2 = mix(color2, dColor1, smoothstep(1.0, 0.5, progress));\n    gl_FragColor = mix(color1, color2, val);\n}",
    "trans_glitchMemories": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nvoid glitch_memories(sampler2D pic) {\n  vec2 p = gl_FragCoord.xy / resolution.xy;\n  vec2 block = floor(gl_FragCoord.xy / vec2(16));\n  vec2 uv_noise = block / vec2(64);\n  uv_noise += floor(vec2(progress) * vec2(1200.0, 3500.0)) / vec2(64);\n  \n  float block_thresh = pow(fract(progress * 1200.0), 2.0) * 0.2;\n  float line_thresh = pow(fract(progress * 2200.0), 3.0) * 0.7;\n  vec2 red = p, green = p, blue = p, o = p;\n  vec2 dist = (fract(uv_noise) - 0.5) * 0.3;\n  red += dist * 0.1;\n  green += dist * 0.2;\n  blue += dist * 0.125;\n  \n  gl_FragColor.r = texture2D(pic, red).r;\n  gl_FragColor.g = texture2D(pic, green).g;\n  gl_FragColor.b = texture2D(pic, blue).b;\n  gl_FragColor.a = 1.0;\n\n}\n\nvoid main(void)\n{\n  float smoothed = smoothstep(0., 1., progress);\n  if( ( smoothed < 0.4 && smoothed > 0.1) ) {\n      glitch_memories(from);\n  } else if ((smoothed > 0.6 && smoothed < 0.9) ) {\n      glitch_memories(to);\n  } else {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = mix(texture2D(from, p), texture2D(to, p), progress);\n  }\n}",
    "trans_kaleidoScope": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec2 q = p;\n    float t = pow(progress, 2.0)*1.0;\n    p = p -0.5;\n    for (int i = 0; i < 7; i++) {\n        p = vec2(sin(t)*p.x + cos(t)*p.y, sin(t)*p.y - cos(t)*p.x);\n        t += 2.0;\n        p = abs(mod(p, 2.0) - 1.0);\n    }\n    abs(mod(p, 1.0));\n    gl_FragColor = mix(\n        mix(texture2D(from, q), texture2D(to, q), progress),\n        mix(texture2D(from, p), texture2D(to, p), progress), 1.0 - 2.0*abs(progress - 0.5));\n}",
    "trans_linear": "#ifdef GL_ES\r\n  precision mediump float;\r\n#endif\r\n\r\nuniform sampler2D from, to;\r\nuniform float progress;\r\nuniform vec2 resolution;\r\n\r\nvoid main() {\r\n  vec2 p = gl_FragCoord.xy / resolution.xy;\r\n  gl_FragColor = mix(texture2D(from, p), texture2D(to, p), progress);\r\n}",
    "trans_linearBlur": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst float intensity = 0.1;\nconst int PASSES = 8;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec4 c1 = vec4(0.0), c2 = vec4(0.0);\n    float disp = intensity*(0.5-distance(0.5, progress));\n    for (int xi=0; xi<PASSES; ++xi) {\n        float x = float(xi) / float(PASSES) - 0.5;\n        for (int yi=0; yi<PASSES; ++yi) {\n            float y = float(yi) / float(PASSES) - 0.5;\n            vec2 v = vec2(x,y);\n            float d = disp;\n            c1 += texture2D(from, p + d*v);\n            c2 += texture2D(to, p + d*v);\n        }\n    }\n    c1 /= float(PASSES*PASSES);\n    c2 /= float(PASSES*PASSES);\n    gl_FragColor = mix(c1, c2, progress);\n}",
    "trans_luma": "#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nuniform sampler2D lumaTex;\nbool invertLuma = true;\nfloat softness = 0.25;\n\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n\n    float luma = texture2D(lumaTex, p).x;\n    if (invertLuma)\n        luma = 1.0 - luma;\n    vec4 fromColor = texture2D(from, p);\n    vec4 toColor = texture2D(to, p);\n    float time = mix(0.0, 1.0 + softness, progress);\n    if (luma <= time - softness)\n        gl_FragColor = toColor;\n    else if (luma >= time)\n        gl_FragColor = fromColor;\n    else {\n        float alpha = (time - luma) / softness;\n        gl_FragColor = mix(fromColor, toColor, alpha);\n    }\n}",
    "trans_morph": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst float strength=0.1;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec4 ca = texture2D(from, p);\n    vec4 cb = texture2D(to, p);\n    vec2 oa = (((ca.rg+ca.b)*0.5)*2.0-1.0);\n    vec2 ob = (((cb.rg+cb.b)*0.5)*2.0-1.0);\n    vec2 oc = mix(oa,ob,0.5)*strength;\n    float w0 = progress;\n    float w1 = 1.0-w0;\n    gl_FragColor = mix(texture2D(from, p+oc*w0), texture2D(to, p-oc*w1), progress);\n}",
    "trans_pageCurl": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nconst float MIN_AMOUNT = -0.16;\nconst float MAX_AMOUNT = 1.3;\nfloat amount = progress * (MAX_AMOUNT - MIN_AMOUNT) + MIN_AMOUNT;\n\nconst float PI = 3.141592653589793;\n\nconst float scale = 512.0;\nconst float sharpness = 3.0;\n\nfloat cylinderCenter = amount;\nfloat cylinderAngle = 2.0 * PI * amount;\n\nconst float cylinderRadius = 1.0 / PI / 2.0;\n\nvec3 hitPoint(float hitAngle, float yc, vec3 point, mat3 rrotation)\n{\n    float hitPoint = hitAngle / (2.0 * PI);\n    point.y = hitPoint;\n    return rrotation * point;\n}\n\nvec4 antiAlias(vec4 color1, vec4 color2, float distanc)\n{\n    distanc *= scale;\n    if (distanc < 0.0) return color2;\n    if (distanc > 2.0) return color1;\n    float dd = pow(1.0 - distanc / 2.0, sharpness);\n    return ((color2 - color1) * dd) + color1;\n}\n\nfloat distanceToEdge(vec3 point)\n{\n    float dx = abs(point.x > 0.5 ? 1.0 - point.x : point.x);\n    float dy = abs(point.y > 0.5 ? 1.0 - point.y : point.y);\n    if (point.x < 0.0) dx = -point.x;\n    if (point.x > 1.0) dx = point.x - 1.0;\n    if (point.y < 0.0) dy = -point.y;\n    if (point.y > 1.0) dy = point.y - 1.0;\n    if ((point.x < 0.0 || point.x > 1.0) && (point.y < 0.0 || point.y > 1.0)) return sqrt(dx * dx + dy * dy);\n    return min(dx, dy);\n}\n\nvec4 seeThrough(float yc, vec2 p, mat3 rotation, mat3 rrotation)\n{\n    float hitAngle = PI - (acos(yc / cylinderRadius) - cylinderAngle);\n    vec3 point = hitPoint(hitAngle, yc, rotation * vec3(p, 1.0), rrotation);\n    if (yc <= 0.0 && (point.x < 0.0 || point.y < 0.0 || point.x > 1.0 || point.y > 1.0))\n    {\n      vec2 texCoord = gl_FragCoord.xy / resolution.xy;\n        return texture2D(to, texCoord);\n    }\n\n    if (yc > 0.0) return texture2D(from, p);\n\n    vec4 color = texture2D(from, point.xy);\n    vec4 tcolor = vec4(0.0);\n\n    return antiAlias(color, tcolor, distanceToEdge(point));\n}\n\nvec4 seeThroughWithShadow(float yc, vec2 p, vec3 point, mat3 rotation, mat3 rrotation)\n{\n    float shadow = distanceToEdge(point) * 30.0;\n    shadow = (1.0 - shadow) / 3.0;\n\n    if (shadow < 0.0) shadow = 0.0; else shadow *= amount;\n\n    vec4 shadowColor = seeThrough(yc, p, rotation, rrotation);\n    shadowColor.r -= shadow;\n    shadowColor.g -= shadow;\n    shadowColor.b -= shadow;\n\n    return shadowColor;\n}\n\nvec4 backside(float yc, vec3 point)\n{\n    vec4 color = texture2D(from, point.xy);\n    float gray = (color.r + color.b + color.g) / 15.0;\n    gray += (8.0 / 10.0) * (pow(1.0 - abs(yc / cylinderRadius), 2.0 / 10.0) / 2.0 + (5.0 / 10.0));\n    color.rgb = vec3(gray);\n    return color;\n}\n\nvec4 behindSurface(float yc, vec3 point, mat3 rrotation)\n{\n    float shado = (1.0 - ((-cylinderRadius - yc) / amount * 7.0)) / 6.0;\n    shado *= 1.0 - abs(point.x - 0.5);\n\n    yc = (-cylinderRadius - cylinderRadius - yc);\n\n    float hitAngle = (acos(yc / cylinderRadius) + cylinderAngle) - PI;\n    point = hitPoint(hitAngle, yc, point, rrotation);\n\n    if (yc < 0.0 && point.x >= 0.0 && point.y >= 0.0 && point.x <= 1.0 && point.y <= 1.0 && (hitAngle < PI || amount > 0.5))\n    {\n        shado = 1.0 - (sqrt(pow(point.x - 0.5, 2.0) + pow(point.y - 0.5, 2.0)) / (71.0 / 100.0));\n        shado *= pow(-yc / cylinderRadius, 3.0);\n        shado *= 0.5;\n    }\n    else\n    {\n        shado = 0.0;\n    }\n    \n    vec2 texCoord = gl_FragCoord.xy / resolution.xy;\n\n    return vec4(texture2D(to, texCoord).rgb - shado, 1.0);\n}\n\nvoid main()\n{\n  vec2 texCoord = gl_FragCoord.xy / resolution.xy;\n  \n  const float angle = 30.0 * PI / 180.0;\n    float c = cos(-angle);\n    float s = sin(-angle);\n\n    mat3 rotation = mat3( c, s, 0,\n                                -s, c, 0,\n                                0.12, 0.258, 1\n                                );\n    c = cos(angle);\n    s = sin(angle);\n\n    mat3 rrotation = mat3(  c, s, 0,\n                                    -s, c, 0,\n                                    0.15, -0.5, 1\n                                );\n\n    vec3 point = rotation * vec3(texCoord, 1.0);\n\n    float yc = point.y - cylinderCenter;\n\n    if (yc < -cylinderRadius)\n    {\n        // Behind surface\n        gl_FragColor = behindSurface(yc, point, rrotation);\n        return;\n    }\n\n    if (yc > cylinderRadius)\n    {\n        // Flat surface\n        gl_FragColor = texture2D(from, texCoord);\n        return;\n    }\n\n    float hitAngle = (acos(yc / cylinderRadius) + cylinderAngle) - PI;\n\n    float hitAngleMod = mod(hitAngle, 2.0 * PI);\n    if ((hitAngleMod > PI && amount < 0.5) || (hitAngleMod > PI/2.0 && amount < 0.0))\n    {\n        gl_FragColor = seeThrough(yc, texCoord, rotation, rrotation);\n        return;\n    }\n\n    point = hitPoint(hitAngle, yc, point, rrotation);\n\n    if (point.x < 0.0 || point.y < 0.0 || point.x > 1.0 || point.y > 1.0)\n    {\n        gl_FragColor = seeThroughWithShadow(yc, texCoord, point, rotation, rrotation);\n        return;\n    }\n\n    vec4 color = backside(yc, point);\n\n    vec4 otherColor;\n    if (yc < 0.0)\n    {\n        float shado = 1.0 - (sqrt(pow(point.x - 0.5, 2.0) + pow(point.y - 0.5, 2.0)) / 0.71);\n        shado *= pow(-yc / cylinderRadius, 3.0);\n        shado *= 0.5;\n        otherColor = vec4(0.0, 0.0, 0.0, shado);\n    }\n    else\n    {\n        otherColor = texture2D(from, texCoord);\n    }\n\n    color = antiAlias(color, otherColor, cylinderRadius - abs(yc));\n\n    vec4 cl = seeThroughWithShadow(yc, texCoord, point, rotation, rrotation);\n    float dist = distanceToEdge(point);\n\n    gl_FragColor = antiAlias(color, cl, dist);\n}",
    "trans_pinWheel": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nvoid main() {\n  \n  vec2 p = gl_FragCoord.xy / resolution.xy;\n  \n  float circPos = atan(p.y - 0.5, p.x - 0.5) + progress;\n  float modPos = mod(circPos, 3.1415 / 4.);\n  float signed = sign(progress - modPos);\n  float smoothed = smoothstep(0., 1., signed);\n  \n  if (smoothed > 0.5){\n    gl_FragColor = texture2D(to, p);\n  } else {\n    gl_FragColor = texture2D(from, p);\n  }\n  \n}\n",
    "trans_pixelize": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst ivec2 size = ivec2(10.0, 10.0);\nconst float smoothness = 0.5;\nfloat rand (vec2 co) {\n    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float r = rand(floor(vec2(size) * p));\n    float m = smoothstep(0.0, -smoothness, r - (progress * (1.0 + smoothness)));\n    gl_FragColor = mix(texture2D(from, p), texture2D(to, p), m);\n}",
    "trans_polkaDots": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst float dots = 5.0;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float x = progress;\n    bool nextImage = distance(fract(p * dots), vec2(0.5, 0.5)) < x;\n    if(nextImage)\n        gl_FragColor = texture2D(to, p);\n    else\n        gl_FragColor = texture2D(from, p);\n}",
    "trans_polkaDotsCurtain": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst float SQRT_2 = 1.414213562373;\nconst float dots = 20.0;\nconst vec2 center = vec2(1.0, 1.0);\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float x = progress /2.0;\n    bool nextImage = distance(fract(p * dots), vec2(0.5, 0.5)) < (2.0 * x / distance(p, center));\n    if(nextImage) gl_FragColor = texture2D(to, p);\n    else gl_FragColor = texture2D(from, p);\n}",
    "trans_radial": "#ifdef GL_ES\nprecision mediump float;\n#endif\n#define PI 3.141592653589\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec2 rp = p*2.-1.;\n    float a = atan(rp.y, rp.x);\n    float pa = progress*PI*2.5-PI*1.25;\n    vec4 fromc = texture2D(from, p);\n    vec4 toc = texture2D(to, p);\n    if(a>pa) {\n        gl_FragColor = mix(toc, fromc, smoothstep(0., 1., (a-pa)));\n    } else {\n        gl_FragColor = toc;\n    }\n}",
    "trans_randomSquares": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nfloat rand(vec2 co){\n    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvoid main() {\n    float revProgress = (1.0 - progress);\n    float distFromEdges = min(progress, revProgress);\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec4 fromColor = texture2D(from, p);\n    vec4 toColor = texture2D(to, p);\n    float squareSize = 20.0;\n    float flickerSpeed = 60.0;\n    vec2 seed = floor(gl_FragCoord.xy / squareSize) * floor(distFromEdges * flickerSpeed);\n    gl_FragColor = mix(fromColor, toColor, progress) + rand(seed) * distFromEdges * 0.5;\n}",
    "trans_ripple": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst float amplitude = 100.0;\nconst float speed = 50.0;\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec2 dir = p - vec2(.5);\n    float dist = length(dir);\n    vec2 offset = dir * (sin(progress * dist * amplitude - progress * speed) + .5) / 30.;\n    gl_FragColor = mix(texture2D(from, p + offset), texture2D(to, p), smoothstep(0.2, 1.0, progress));\n}",
    "trans_simpleFlip": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nvoid main() {\n  vec2 p = gl_FragCoord.xy / resolution.xy;\n  vec2 q = p;\n  p.x = (p.x - 0.5)/abs(progress - 0.5)*0.5 + 0.5;\n  vec4 a = texture2D(from, p);\n  vec4 b = texture2D(to, p);\n  gl_FragColor = vec4(mix(a, b, step(0.5, progress)).rgb * step(abs(q.x - 0.5), abs(progress - 0.5)), 1.0);\n}",
    "trans_slide": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nfloat translateX = 1.0;\nfloat translateY = 0.0;\n\nvoid main() {\n    vec2 texCoord = gl_FragCoord.xy / resolution.xy;\n    float x = progress * translateX;\n    float y = progress * translateY;\n\n    if (x >= 0.0 && y >= 0.0) {\n        if (texCoord.x >= x && texCoord.y >= y) {\n            gl_FragColor = texture2D(from, texCoord - vec2(x, y));\n        }\n        else {\n            vec2 uv;\n            if (x > 0.0)\n                uv = vec2(x - 1.0, y);\n            else if (y > 0.0)\n                uv = vec2(x, y - 1.0);\n            gl_FragColor = texture2D(to, texCoord - uv);\n        }\n    }\n    else if (x <= 0.0 && y <= 0.0) {\n        if (texCoord.x <= (1.0 + x) && texCoord.y <= (1.0 + y))\n            gl_FragColor = texture2D(from, texCoord - vec2(x, y));\n        else {\n            vec2 uv;\n            if (x < 0.0)\n                uv = vec2(x + 1.0, y);\n            else if (y < 0.0)\n                uv = vec2(x, y + 1.0);\n            gl_FragColor = texture2D(to, texCoord - uv);\n        }\n    }\n    else\n        gl_FragColor = vec4(0.0);\n}",
    "trans_squareSwipe": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\nconst ivec2 squares = ivec2(10.0, 10.0);\nconst vec2 direction = vec2(1.0, -0.5);\nconst float smoothness = 1.6;\nconst vec2 center = vec2(0.5, 0.5);\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    vec2 v = normalize(direction);\n    if (v != vec2(0.0))\n        v /= abs(v.x)+abs(v.y);\n    float d = v.x * center.x + v.y * center.y;\n    float offset = smoothness;\n    float pr = smoothstep(-offset, 0.0, v.x * p.x + v.y * p.y - (d-0.5+progress*(1.+offset)));\n    vec2 squarep = fract(p*vec2(squares));\n    vec2 squaremin = vec2(pr/2.0);\n    vec2 squaremax = vec2(1.0 - pr/2.0);\n    float a = all(lessThan(squaremin, squarep)) && all(lessThan(squarep, squaremax)) ? 1.0 : 0.0;\n    gl_FragColor = mix(texture2D(from, p), texture2D(to, p), a);\n}",
    "trans_squeeze": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst float colorSeparation = 0.02;\nfloat progressY (float y) {\n    return 0.5 + (y-0.5) / (1.0-progress);\n}\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float y = progressY(p.y);\n    if (y < 0.0 || y > 1.0) {\n        gl_FragColor = texture2D(to, p);\n    }\n    else {\n        vec2 fp = vec2(p.x, y) + progress*vec2(0.0, colorSeparation);\n        vec4 c = vec4(\n            texture2D(from, fp).r,\n            texture2D(from, fp).g,\n            texture2D(from, fp).b,\n            texture2D(from, fp).a\n            );\n        gl_FragColor = c;\n        if (c.a == 0.0) {gl_FragColor = texture2D(to, p);}\n    }\n}",
    "trans_starWipe": "#ifdef GL_ES\nprecision mediump float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\nvec2 circlePoint( float ang )\n{\n  ang += 6.28318 * 0.15;\n  return vec2( cos(ang), sin(ang) );  \n}\n\nfloat cross2d( vec2 a, vec2 b )\n{\n  return ( a.x * b.y - a.y * b.x );\n}\n\n// quickly knocked together with some math from http://www.pixeleuphoria.com/node/30\nfloat star( vec2 p, float size )\n{\n  if( size <= 0.0 )\n  {\n    return 0.0;\n  }\n  p /= size;\n  \n  vec2 p0 = circlePoint( 0.0 );\n  vec2 p1 = circlePoint( 6.28318 * 1.0 / 5.0 );\n  vec2 p2 = circlePoint( 6.28318 * 2.0 / 5.0 );\n  vec2 p3 = circlePoint( 6.28318 * 3.0 / 5.0 );\n  vec2 p4 = circlePoint( 6.28318 * 4.0 / 5.0 );\n  \n  // are we on this side of the line\n  float s0 = ( cross2d( p1 - p0, p - p0 ) );\n  float s1 = ( cross2d( p2 - p1, p - p1 ) );\n  float s2 = ( cross2d( p3 - p2, p - p2 ) );\n  float s3 = ( cross2d( p4 - p3, p - p3 ) );\n  float s4 = ( cross2d( p0 - p4, p - p4 ) );\n  \n  // some trial and error math to get the star shape.  I'm sure there's some elegance I'm missing.\n  float s5 = min( min( min( s0, s1 ), min( s2, s3 ) ), s4 );\n  float s = max( 1.0 - sign( s0 * s1 * s2 * s3 * s4 ) + sign(s5), 0.0 );\n  s = sign( 2.6 - length(p) ) * s;\n  \n  return max( s, 0.0 );\n}\n\nvoid main() \n{\n  vec2 p = ( gl_FragCoord.xy / resolution.xy );\n  vec2 o = p * 2.0 - 1.0;\n  \n  float t = progress * 1.4;\n  \n  float c1 = star( o, t );\n  float c2 = star( o, t - 0.1 );\n  \n  float border = max( c1 - c2, 0.0 );\n  \n  gl_FragColor = mix(texture2D(from, p), texture2D(to, p), c1) + vec4( border, border, border, 0.0 );\n}",
    "trans_swap": "#ifdef GL_ES\nprecision mediump float;\n#endif\n \n// General parameters\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\n \nfloat reflection = 0.4;\nfloat perspective = 0.2;\nfloat depth = 3.0;\n \nconst vec4 black = vec4(0.0, 0.0, 0.0, 1.0);\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\n \nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\n \nvec2 project (vec2 p) {\n  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);\n}\n \nvec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {\n  vec4 c = black;\n  pfr = project(pfr);\n  if (inBounds(pfr)) {\n    c += mix(black, texture2D(from, pfr), reflection * mix(1.0, 0.0, pfr.y));\n  }\n  pto = project(pto);\n  if (inBounds(pto)) {\n    c += mix(black, texture2D(to, pto), reflection * mix(1.0, 0.0, pto.y));\n  }\n  return c;\n}\n \nvoid main() {\n  vec2 p = gl_FragCoord.xy / resolution.xy;\n \n  vec2 pfr, pto = vec2(-1.);\n \n  float size = mix(1.0, depth, progress);\n  float persp = perspective * progress;\n  pfr = (p + vec2(-0.0, -0.5)) * vec2(size/(1.0-perspective*progress), size/(1.0-size*persp*p.x)) + vec2(0.0, 0.5);\n \n  size = mix(1.0, depth, 1.-progress);\n  persp = perspective * (1.-progress);\n  pto = (p + vec2(-1.0, -0.5)) * vec2(size/(1.0-perspective*(1.0-progress)), size/(1.0-size*persp*(0.5-p.x))) + vec2(1.0, 0.5);\n \n  bool fromOver = progress < 0.5;\n \n  if (fromOver) {\n    if (inBounds(pfr)) {\n      gl_FragColor = texture2D(from, pfr);\n    }\n    else if (inBounds(pto)) {\n      gl_FragColor = texture2D(to, pto);\n    }\n    else {\n      gl_FragColor = bgColor(p, pfr, pto);\n    }\n  }\n  else {\n    if (inBounds(pto)) {\n      gl_FragColor = texture2D(to, pto);\n    }\n    else if (inBounds(pfr)) {\n      gl_FragColor = texture2D(from, pfr);\n    }\n    else {\n      gl_FragColor = bgColor(p, pfr, pto);\n    }\n  }\n}",
    "trans_swirl": "#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D from, to;\nuniform float progress;\nuniform vec2 resolution;\n\n/*\n  (C) Sergey Kosarevsky, 2014\n  \n  Available under the terms of MIT license\n  http://www.linderdaum.com\n*/\n\nvoid main(void)\n{\n    float Radius = 1.0;\n\n    float T = progress;\n\n    vec2 UV = gl_FragCoord.xy / resolution.xy;\n\n    UV -= vec2( 0.5, 0.5 );\n\n    float Dist = length(UV);\n\n    if ( Dist < Radius )\n    {\n        float Percent = (Radius - Dist) / Radius;\n        float A = ( T <= 0.5 ) ? mix( 0.0, 1.0, T/0.5 ) : mix( 1.0, 0.0, (T-0.5)/0.5 );\n        float Theta = Percent * Percent * A * 8.0 * 3.14159;\n        float S = sin( Theta );\n        float C = cos( Theta );\n        UV = vec2( dot(UV, vec2(C, -S)), dot(UV, vec2(S, C)) );\n    }\n    UV += vec2( 0.5, 0.5 );\n\n    vec4 C0 = texture2D( from, UV );\n    vec4 C1 = texture2D( to, UV );\n\n    gl_FragColor = mix( C0, C1, T );\n}\n",
    "trans_undulatingBurnOut": "#ifdef GL_ES\n    precision mediump float;\n#endif\n\n#define M_PI 3.14159265358979323846\n\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\n \nuniform float smoothness;\nconst vec2 center = vec2(0.5, 0.5);\n\nfloat quadraticInOut(float t) {\n    float p = 2.0 * t * t;\n    return t < 0.5 ? p : -p + (4.0 * t) - 1.0;\n}\n\nfloat linearInterp(vec2 range, vec2 domain, float x) {\n    return mix(range.x, range.y, smoothstep(domain.x, domain.y, clamp(x, domain.x, domain.y)));\n}\n\nfloat getGradient(float r, float dist) {\n    float grad = smoothstep(-smoothness, 0.0, r - dist * (1.0 + smoothness)); //, 0.0, 1.0);\n    if (r - dist < 0.005 && r - dist > -0.005) {\n        return -1.0;\n    } else if (r - dist < 0.01 && r - dist > -0.005) {\n        return -2.0;\n    }\n    return grad;\n}\n\nfloat round(float a) {\n    return floor(a + 0.5);\n}\n\nfloat getWave(vec2 p){\n    vec2 _p = p - center;\n    float rads = atan(_p.y, _p.x);\n    float degs = degrees(rads) + 180.0;\n    vec2 range = vec2(0.0, M_PI * 30.0);\n    vec2 domain = vec2(0.0, 360.0);\n    \n    float ratio = (M_PI * 30.0) / 360.0;\n    degs = degs * ratio;\n    float x = progress;\n    float magnitude = mix(0.02, 0.09, smoothstep(0.0, 1.0, x));\n    float offset = mix(40.0, 30.0, smoothstep(0.0, 1.0, x));\n    float ease_degs = quadraticInOut(sin(degs));\n    \n    float deg_wave_pos = (ease_degs * magnitude) * sin(x * offset);\n    return x + deg_wave_pos;\n}\n\nvoid main() {\n  vec2 p = gl_FragCoord.xy / resolution.xy;\n  \n  if (progress == 0.0) {\n    gl_FragColor = texture2D(from, p);\n  } else if (progress == 1.0) {\n    gl_FragColor = texture2D(to, p);\n  } else {\n    float dist = distance(center, p);\n    float m = getGradient(getWave(p), dist);\n    if (m == -2.0) {\n      gl_FragColor = mix(texture2D(from, p), vec4(0.0, 0.0, 0.0, 1.0), 0.75);\n    } else {\n      gl_FragColor = mix(texture2D(from, p), texture2D(to, p), m);    \n    }\n  }\n}",
    "trans_wind": "#ifdef GL_ES\n    precision mediump float;\n#endif\n\nuniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;\nuniform vec2 resolution;\nconst float size = 0.2;\n\nfloat rand (vec2 co) {\n    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\n\nvoid main() {\n    vec2 p = gl_FragCoord.xy / resolution.xy;\n    float r = rand(vec2(0, p.y));\n    float m = smoothstep(0.0, -size, p.x*(1.0-size) + size*r - (progress * (1.0 + size)));\n    gl_FragColor = mix(texture2D(from, p), texture2D(to, p), m);\n}"
});});
webvn.use(function (webgl) { webgl.vertexShader.create({
    "drawImage": "attribute vec2 a_Position;\r\nuniform mat4 u_ModelMatrix;\r\nvarying vec2 v_TexCoord;\r\nuniform vec2 u_Resolution;\r\n\r\nvoid main() {\r\n    float w = 2.0 / u_Resolution.x;\r\n    float h = -2.0 / u_Resolution.y;\r\n    mat4 ViewMatrix = mat4(\r\n        w, 0, 0, 0,\r\n        0, h, 0, 0,\r\n        0, 0, 1.0, 1.0,\r\n        -1.0, 1.0, 0, 0\r\n    );\r\n\r\n    gl_Position = ViewMatrix * u_ModelMatrix * vec4(a_Position, 1.0, 1.0);\r\n    v_TexCoord = a_Position;\r\n}",
    "filter": "precision mediump float;\r\nattribute vec2 a_Position;\r\nattribute vec2 a_Uv;\r\nvarying vec2 v_Uv;\r\nvoid main() {\r\n    v_Uv = a_Uv;\r\n    gl_Position = vec4(a_Position.x, -a_Position.y, 0.0, 1.0);\r\n}",
    "transition": "attribute vec2 a_Position;\r\n\r\nvoid main() {\r\n    gl_Position = vec4(2.0 * a_Position - 1.0, 0.0, 1.0);\r\n}"
});});
webvn.extend('webgl', function (exports, Class) {
    "use strict";
    var Matrix4 = exports.Matrix4 = Class.create({

        constructor: function (opt_src) {
            var i, s, d;
            if (opt_src && typeof opt_src === 'object' && opt_src.hasOwnProperty('elements')) {
                s = opt_src.elements;
                d = new Float32Array(16);
                for (i = 0; i < 16; ++i) {
                    d[i] = s[i];
                }
                this.elements = d;
            } else {
                this.elements = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
            }
        },

        setIdentity: function () {
            var e = this.elements;
            e[0] = 1;   e[4] = 0;   e[8]  = 0;   e[12] = 0;
            e[1] = 0;   e[5] = 1;   e[9]  = 0;   e[13] = 0;
            e[2] = 0;   e[6] = 0;   e[10] = 1;   e[14] = 0;
            e[3] = 0;   e[7] = 0;   e[11] = 0;   e[15] = 1;
            return this;
        },

        set: function (src) {
            var i, s, d;

            s = src.elements;
            d = this.elements;

            if (s === d) {
                return;
            }

            for (i = 0; i < 16; ++i) {
                d[i] = s[i];
            }

            return this;
        },

        concat: function (other) {
            var i, e, a, b, ai0, ai1, ai2, ai3;

            // Calculate e = a * b
            e = this.elements;
            a = this.elements;
            b = other.elements;

            // If e equals b, copy b to temporary matrix.
            if (e === b) {
                b = new Float32Array(16);
                for (i = 0; i < 16; ++i) {
                    b[i] = e[i];
                }
            }

            for (i = 0; i < 4; i++) {
                ai0=a[i];  ai1=a[i+4];  ai2=a[i+8];  ai3=a[i+12];
                e[i]    = ai0 * b[0]  + ai1 * b[1]  + ai2 * b[2]  + ai3 * b[3];
                e[i+4]  = ai0 * b[4]  + ai1 * b[5]  + ai2 * b[6]  + ai3 * b[7];
                e[i+8]  = ai0 * b[8]  + ai1 * b[9]  + ai2 * b[10] + ai3 * b[11];
                e[i+12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
            }

            return this;
        },

        multiply: function (other) {
            return this.concat(other);
        },

        multiplyVector3: function (pos) {
            var e = this.elements;
            var p = pos.elements;
            var v = new Vector3();
            var result = v.elements;

            result[0] = p[0] * e[0] + p[1] * e[4] + p[2] * e[ 8] + e[11];
            result[1] = p[0] * e[1] + p[1] * e[5] + p[2] * e[ 9] + e[12];
            result[2] = p[0] * e[2] + p[1] * e[6] + p[2] * e[10] + e[13];

            return v;
        },

        multiplyVector4: function (pos) {
            var e = this.elements;
            var p = pos.elements;
            var v = new Vector4();
            var result = v.elements;

            result[0] = p[0] * e[0] + p[1] * e[4] + p[2] * e[ 8] + p[3] * e[12];
            result[1] = p[0] * e[1] + p[1] * e[5] + p[2] * e[ 9] + p[3] * e[13];
            result[2] = p[0] * e[2] + p[1] * e[6] + p[2] * e[10] + p[3] * e[14];
            result[3] = p[0] * e[3] + p[1] * e[7] + p[2] * e[11] + p[3] * e[15];

            return v;
        },

        transpose: function () {
            var e, t;

            e = this.elements;

            t = e[ 1];  e[ 1] = e[ 4];  e[ 4] = t;
            t = e[ 2];  e[ 2] = e[ 8];  e[ 8] = t;
            t = e[ 3];  e[ 3] = e[12];  e[12] = t;
            t = e[ 6];  e[ 6] = e[ 9];  e[ 9] = t;
            t = e[ 7];  e[ 7] = e[13];  e[13] = t;
            t = e[11];  e[11] = e[14];  e[14] = t;

            return this;
        },

        setInverseOf: function(other) {
            var i, s, d, inv, det;

            s = other.elements;
            d = this.elements;
            inv = new Float32Array(16);

            inv[0]  =   s[5]*s[10]*s[15] - s[5] *s[11]*s[14] - s[9] *s[6]*s[15]
            + s[9]*s[7] *s[14] + s[13]*s[6] *s[11] - s[13]*s[7]*s[10];
            inv[4]  = - s[4]*s[10]*s[15] + s[4] *s[11]*s[14] + s[8] *s[6]*s[15]
            - s[8]*s[7] *s[14] - s[12]*s[6] *s[11] + s[12]*s[7]*s[10];
            inv[8]  =   s[4]*s[9] *s[15] - s[4] *s[11]*s[13] - s[8] *s[5]*s[15]
            + s[8]*s[7] *s[13] + s[12]*s[5] *s[11] - s[12]*s[7]*s[9];
            inv[12] = - s[4]*s[9] *s[14] + s[4] *s[10]*s[13] + s[8] *s[5]*s[14]
            - s[8]*s[6] *s[13] - s[12]*s[5] *s[10] + s[12]*s[6]*s[9];

            inv[1]  = - s[1]*s[10]*s[15] + s[1] *s[11]*s[14] + s[9] *s[2]*s[15]
            - s[9]*s[3] *s[14] - s[13]*s[2] *s[11] + s[13]*s[3]*s[10];
            inv[5]  =   s[0]*s[10]*s[15] - s[0] *s[11]*s[14] - s[8] *s[2]*s[15]
            + s[8]*s[3] *s[14] + s[12]*s[2] *s[11] - s[12]*s[3]*s[10];
            inv[9]  = - s[0]*s[9] *s[15] + s[0] *s[11]*s[13] + s[8] *s[1]*s[15]
            - s[8]*s[3] *s[13] - s[12]*s[1] *s[11] + s[12]*s[3]*s[9];
            inv[13] =   s[0]*s[9] *s[14] - s[0] *s[10]*s[13] - s[8] *s[1]*s[14]
            + s[8]*s[2] *s[13] + s[12]*s[1] *s[10] - s[12]*s[2]*s[9];

            inv[2]  =   s[1]*s[6]*s[15] - s[1] *s[7]*s[14] - s[5] *s[2]*s[15]
            + s[5]*s[3]*s[14] + s[13]*s[2]*s[7]  - s[13]*s[3]*s[6];
            inv[6]  = - s[0]*s[6]*s[15] + s[0] *s[7]*s[14] + s[4] *s[2]*s[15]
            - s[4]*s[3]*s[14] - s[12]*s[2]*s[7]  + s[12]*s[3]*s[6];
            inv[10] =   s[0]*s[5]*s[15] - s[0] *s[7]*s[13] - s[4] *s[1]*s[15]
            + s[4]*s[3]*s[13] + s[12]*s[1]*s[7]  - s[12]*s[3]*s[5];
            inv[14] = - s[0]*s[5]*s[14] + s[0] *s[6]*s[13] + s[4] *s[1]*s[14]
            - s[4]*s[2]*s[13] - s[12]*s[1]*s[6]  + s[12]*s[2]*s[5];

            inv[3]  = - s[1]*s[6]*s[11] + s[1]*s[7]*s[10] + s[5]*s[2]*s[11]
            - s[5]*s[3]*s[10] - s[9]*s[2]*s[7]  + s[9]*s[3]*s[6];
            inv[7]  =   s[0]*s[6]*s[11] - s[0]*s[7]*s[10] - s[4]*s[2]*s[11]
            + s[4]*s[3]*s[10] + s[8]*s[2]*s[7]  - s[8]*s[3]*s[6];
            inv[11] = - s[0]*s[5]*s[11] + s[0]*s[7]*s[9]  + s[4]*s[1]*s[11]
            - s[4]*s[3]*s[9]  - s[8]*s[1]*s[7]  + s[8]*s[3]*s[5];
            inv[15] =   s[0]*s[5]*s[10] - s[0]*s[6]*s[9]  - s[4]*s[1]*s[10]
            + s[4]*s[2]*s[9]  + s[8]*s[1]*s[6]  - s[8]*s[2]*s[5];

            det = s[0]*inv[0] + s[1]*inv[4] + s[2]*inv[8] + s[3]*inv[12];
            if (det === 0) {
                return this;
            }

            det = 1 / det;
            for (i = 0; i < 16; i++) {
                d[i] = inv[i] * det;
            }

            return this;
        },

        invert: function () {
            return this.setInverseOf(this);
        },

        setOrtho: function () {
            var e, rw, rh, rd;

            if (left === right || bottom === top || near === far) {
                throw 'null frustum';
            }

            rw = 1 / (right - left);
            rh = 1 / (top - bottom);
            rd = 1 / (far - near);

            e = this.elements;

            e[0]  = 2 * rw;
            e[1]  = 0;
            e[2]  = 0;
            e[3]  = 0;

            e[4]  = 0;
            e[5]  = 2 * rh;
            e[6]  = 0;
            e[7]  = 0;

            e[8]  = 0;
            e[9]  = 0;
            e[10] = -2 * rd;
            e[11] = 0;

            e[12] = -(right + left) * rw;
            e[13] = -(top + bottom) * rh;
            e[14] = -(far + near) * rd;
            e[15] = 1;

            return this;
        },

        ortho: function (left, right, bottom, top, near, far) {
            return this.concat(new Matrix4().setOrtho(left, right, bottom, top, near, far));
        },

        setFrustum: function (left, right, bottom, top, near, far) {
            var e, rw, rh, rd;

            if (left === right || top === bottom || near === far) {
                throw 'null frustum';
            }
            if (near <= 0) {
                throw 'near <= 0';
            }
            if (far <= 0) {
                throw 'far <= 0';
            }

            rw = 1 / (right - left);
            rh = 1 / (top - bottom);
            rd = 1 / (far - near);

            e = this.elements;

            e[ 0] = 2 * near * rw;
            e[ 1] = 0;
            e[ 2] = 0;
            e[ 3] = 0;

            e[ 4] = 0;
            e[ 5] = 2 * near * rh;
            e[ 6] = 0;
            e[ 7] = 0;

            e[ 8] = (right + left) * rw;
            e[ 9] = (top + bottom) * rh;
            e[10] = -(far + near) * rd;
            e[11] = -1;

            e[12] = 0;
            e[13] = 0;
            e[14] = -2 * near * far * rd;
            e[15] = 0;

            return this;
        },

        frustum: function (left, right, bottom, top, near, far) {
            return this.concat(new Matrix4().setFrustum(left, right, bottom, top, near, far));
        },

        setPerspective: function (fovy, aspect, near, far) {
            var e, rd, s, ct;

            if (near === far || aspect === 0) {
                throw 'null frustum';
            }
            if (near <= 0) {
                throw 'near <= 0';
            }
            if (far <= 0) {
                throw 'far <= 0';
            }

            fovy = Math.PI * fovy / 180 / 2;
            s = Math.sin(fovy);
            if (s === 0) {
                throw 'null frustum';
            }

            rd = 1 / (far - near);
            ct = Math.cos(fovy) / s;

            e = this.elements;

            e[0]  = ct / aspect;
            e[1]  = 0;
            e[2]  = 0;
            e[3]  = 0;

            e[4]  = 0;
            e[5]  = ct;
            e[6]  = 0;
            e[7]  = 0;

            e[8]  = 0;
            e[9]  = 0;
            e[10] = -(far + near) * rd;
            e[11] = -1;

            e[12] = 0;
            e[13] = 0;
            e[14] = -2 * near * far * rd;
            e[15] = 0;

            return this;
        },

        perspective: function (fovy, aspect, near, far) {
            return this.concat(new Matrix4().setPerspective(fovy, aspect, near, far));
        },

        setScale: function (x, y, z) {
            var e = this.elements;
            e[0] = x;  e[4] = 0;  e[8]  = 0;  e[12] = 0;
            e[1] = 0;  e[5] = y;  e[9]  = 0;  e[13] = 0;
            e[2] = 0;  e[6] = 0;  e[10] = z;  e[14] = 0;
            e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
            return this;
        },

        scale: function (x, y, z) {
            var e = this.elements;
            e[0] *= x;  e[4] *= y;  e[8]  *= z;
            e[1] *= x;  e[5] *= y;  e[9]  *= z;
            e[2] *= x;  e[6] *= y;  e[10] *= z;
            e[3] *= x;  e[7] *= y;  e[11] *= z;
            return this;
        },

        setTranslate: function (x, y, z) {
            var e = this.elements;
            e[0] = 1;  e[4] = 0;  e[8]  = 0;  e[12] = x;
            e[1] = 0;  e[5] = 1;  e[9]  = 0;  e[13] = y;
            e[2] = 0;  e[6] = 0;  e[10] = 1;  e[14] = z;
            e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
            return this;
        },

        translate: function (x, y, z) {
            var e = this.elements;
            e[12] += e[0] * x + e[4] * y + e[8]  * z;
            e[13] += e[1] * x + e[5] * y + e[9]  * z;
            e[14] += e[2] * x + e[6] * y + e[10] * z;
            e[15] += e[3] * x + e[7] * y + e[11] * z;
            return this;
        },

        setRotate: function (angle, x, y, z) {
            var e, s, c, len, rlen, nc, xy, yz, zx, xs, ys, zs;

            angle = Math.PI * angle / 180;
            e = this.elements;

            s = Math.sin(angle);
            c = Math.cos(angle);

            if (0 !== x && 0 === y && 0 === z) {
                if (x < 0) {
                    s = -s;
                }
                e[0] = 1;  e[4] = 0;  e[ 8] = 0;  e[12] = 0;
                e[1] = 0;  e[5] = c;  e[ 9] =-s;  e[13] = 0;
                e[2] = 0;  e[6] = s;  e[10] = c;  e[14] = 0;
                e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
            } else if (0 === x && 0 !== y && 0 === z) {
                if (y < 0) {
                    s = -s;
                }
                e[0] = c;  e[4] = 0;  e[ 8] = s;  e[12] = 0;
                e[1] = 0;  e[5] = 1;  e[ 9] = 0;  e[13] = 0;
                e[2] =-s;  e[6] = 0;  e[10] = c;  e[14] = 0;
                e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
            } else if (0 === x && 0 === y && 0 !== z) {
                if (z < 0) {
                    s = -s;
                }
                e[0] = c;  e[4] =-s;  e[ 8] = 0;  e[12] = 0;
                e[1] = s;  e[5] = c;  e[ 9] = 0;  e[13] = 0;
                e[2] = 0;  e[6] = 0;  e[10] = 1;  e[14] = 0;
                e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
            } else {
                len = Math.sqrt(x*x + y*y + z*z);
                if (len !== 1) {
                    rlen = 1 / len;
                    x *= rlen;
                    y *= rlen;
                    z *= rlen;
                }
                nc = 1 - c;
                xy = x * y;
                yz = y * z;
                zx = z * x;
                xs = x * s;
                ys = y * s;
                zs = z * s;

                e[ 0] = x*x*nc +  c;
                e[ 1] = xy *nc + zs;
                e[ 2] = zx *nc - ys;
                e[ 3] = 0;

                e[ 4] = xy *nc - zs;
                e[ 5] = y*y*nc +  c;
                e[ 6] = yz *nc + xs;
                e[ 7] = 0;

                e[ 8] = zx *nc + ys;
                e[ 9] = yz *nc - xs;
                e[10] = z*z*nc +  c;
                e[11] = 0;

                e[12] = 0;
                e[13] = 0;
                e[14] = 0;
                e[15] = 1;
            }

            return this;
        },

        rotate: function (angle, x, y, z) {
            return this.concat(new Matrix4().setRotate(angle, x, y, z));
        },

        setLookAt: function (eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ) {
            var e, fx, fy, fz, rlf, sx, sy, sz, rls, ux, uy, uz;

            fx = centerX - eyeX;
            fy = centerY - eyeY;
            fz = centerZ - eyeZ;

            rlf = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
            fx *= rlf;
            fy *= rlf;
            fz *= rlf;

            sx = fy * upZ - fz * upY;
            sy = fz * upX - fx * upZ;
            sz = fx * upY - fy * upX;

            rls = 1 / Math.sqrt(sx*sx + sy*sy + sz*sz);
            sx *= rls;
            sy *= rls;
            sz *= rls;

            ux = sy * fz - sz * fy;
            uy = sz * fx - sx * fz;
            uz = sx * fy - sy * fx;

            e = this.elements;
            e[0] = sx;
            e[1] = ux;
            e[2] = -fx;
            e[3] = 0;

            e[4] = sy;
            e[5] = uy;
            e[6] = -fy;
            e[7] = 0;

            e[8] = sz;
            e[9] = uz;
            e[10] = -fz;
            e[11] = 0;

            e[12] = 0;
            e[13] = 0;
            e[14] = 0;
            e[15] = 1;

            return this.translate(-eyeX, -eyeY, -eyeZ);
        },

        lookAt: function (eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ) {
            return this.concat(new Matrix4().setLookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ));
        },

        dropShadow: function (plane, light) {
            var mat = new Matrix4();
            var e = mat.elements;

            var dot = plane[0] * light[0] + plane[1] * light[1] + plane[2] * light[2] + plane[3] * light[3];

            e[ 0] = dot - light[0] * plane[0];
            e[ 1] =     - light[1] * plane[0];
            e[ 2] =     - light[2] * plane[0];
            e[ 3] =     - light[3] * plane[0];

            e[ 4] =     - light[0] * plane[1];
            e[ 5] = dot - light[1] * plane[1];
            e[ 6] =     - light[2] * plane[1];
            e[ 7] =     - light[3] * plane[1];

            e[ 8] =     - light[0] * plane[2];
            e[ 9] =     - light[1] * plane[2];
            e[10] = dot - light[2] * plane[2];
            e[11] =     - light[3] * plane[2];

            e[12] =     - light[0] * plane[3];
            e[13] =     - light[1] * plane[3];
            e[14] =     - light[2] * plane[3];
            e[15] = dot - light[3] * plane[3];

            return this.concat(mat);
        },

        dropShadowDirectionally: function (normX, normY, normZ, planeX, planeY, planeZ, lightX, lightY, lightZ) {
            var a = planeX * normX + planeY * normY + planeZ * normZ;
            return this.dropShadow([normX, normY, normZ, -a], [lightX, lightY, lightZ, 0]);
        }

    });

    var Vector3 = exports.Vector3 = Class.create({

        constructor: function (opt_src) {
            var v = new Float32Array(3);
            if (opt_src && typeof opt_src === 'object') {
                v[0] = opt_src[0]; v[1] = opt_src[1]; v[2] = opt_src[2];
            }
            this.elements = v;
        },

        normalize: function () {
            var v = this.elements;
            var c = v[0], d = v[1], e = v[2], g = Math.sqrt(c*c+d*d+e*e);
            if(g){
                if(g == 1)
                    return this;
            } else {
                v[0] = 0; v[1] = 0; v[2] = 0;
                return this;
            }
            g = 1/g;
            v[0] = c*g; v[1] = d*g; v[2] = e*g;
            return this;
        }

    });

    var Vector4 = exports.Vector4 = Class.create({

        constructor: function (opt_src) {
            var v = new Float32Array(4);
            if (opt_src && typeof opt_src === 'object') {
                v[0] = opt_src[0]; v[1] = opt_src[1]; v[2] = opt_src[2]; v[3] = opt_src[3];
            }
            this.elements = v;
        }

    });

});
webvn.extend('webgl', function (exports, Class, util) {
    "use strict";

    var Texture = exports.Texture = Class.create({

        constructor: function Texture(gl) {
            this.gl = gl;
            this.value = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.value);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        },

        image: function (image) {
            var gl = this.gl;

            var texture = this.value;

            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.bindTexture(gl.TEXTURE_2D, null);

            return this;
        },

        active: function (num) {
            var gl = this.gl;

            if (num === undefined) {
                num = 0;
            }

            gl.activeTexture(gl.TEXTURE0 + num);
            gl.bindTexture(gl.TEXTURE_2D, this.value);
        }

    });

    var textures = {};

    exports.createTexture = function (gl, image) {
        if (image === undefined) {
            return new Texture(gl);
        }

        var texture;
        // Cache textures to improve performance.
        if (!gl.ttId) {
            gl.ttId = util.uid('tt');
            textures[gl.ttId] = {};
        } else {
            texture = textures[gl.ttId][image.src];
            if (texture) {
                return texture;
            }
        }

        texture = new Texture(gl);
        texture.image(image);
        textures[gl.ttId][image.src] = texture;

        return texture;
    };

});
webvn.extend('webgl', function (exports, Class, util) {
    "use strict";

    var createTexture = exports.createTexture;

    var FrameBuffer = exports.FrameBuffer = Class.create({

        constructor: function FrameBuffer(gl, view) {
            this.gl = gl;
            this.width = view.width;
            this.height = view.height;
            this._init();
        },

        _init: function () {
            var gl = this.gl;

            var texture = this.texture = createTexture(gl);
            gl.bindTexture(gl.TEXTURE_2D, texture.value);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            var frameBuffer = this.frameBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.value, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        },

        get: function () {
            return this.texture;
        },

        end: function () {
            var gl = this.gl;

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        },

        start: function () {
            var gl = this.gl;

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

    });

    var frameBuffers = {};

    exports.createFrameBuffer = function (gl, view, num) {
        var frameBuffer;
        if (!gl.fbId) {
            gl.fbId = util.uid('fb');
            frameBuffers[gl.fbId] = [];
        } else {
            frameBuffer = frameBuffers[gl.fbId][num];
            if (frameBuffer) {
                return frameBuffer;
            }
        }

        frameBuffer = new FrameBuffer(gl, view);
        frameBuffers[gl.fbId][num] = frameBuffer;

        return frameBuffer;
    };

});
webvn.extend('webgl', function (exports, Class, log, util, config) {

    var Shader = exports.Shader,
        createShader = exports.createShader,
        createTexture = exports.createTexture,
        Matrix4 = exports.Matrix4;

    var Program = exports.Program = Class.create({

        constructor: function (gl) {
            this.gl = gl;
            this.value = gl.createProgram();

            this._initShader();
        },

        _initShader: function () {},

        data: function (obj) {
            var self = this;

            util.each(obj, function (value, key) {
                "use strict";
                self[key] = value;
            });

            return this;
        },

        shader: function (shader) {
            var gl = this.gl;

            if (shader instanceof Shader) {
                shader = shader.value;
            }

            gl.attachShader(this.value, shader);

            return this;
        },

        uniform: function (name) {
            var gl = this.gl;

            var program = this.value;

            this[name] = gl.getUniformLocation(program, name);

            return this;
        },

        attribute: function (name) {
            var gl = this.gl;

            var program = this.value;

            this[name] = gl.getAttribLocation(program, name);

            return this;
        },

        link: function () {
            var gl = this.gl;

            var program = this.value;

            gl.linkProgram(program);

            if (config.build === 'release') {
                return this;
            }
            var linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
            if (!linkStatus) {
                var lastError = gl.getProgramInfoLog(program);
                log.error('Error in program linking: ' + lastError);
                gl.deleteProgram(program);
            }

            return this;
        },

        use: function () {
            var gl = this.gl;

            if (gl.curProgram === this.value) {
                return this;
            }
            gl.useProgram(this.value);
            gl.curProgram = this.value;

            return this;
        },

        render: function () {}

    });

    exports.DrawImageProgram = Program.extend({

        constructor: function DrawImageProgram(gl, view) {
            this.width = view.width;
            this.height = view.height;
            this.positionData = new Float32Array([
                0, 0,
                0, 1,
                1, 1,
                1, 0
            ]);

            this.callSuper(gl);
        },

        _initShader: function () {
            var gl = this.gl;

            var fragShader = createShader(gl, 'frag');
            fragShader.source('drawImage');
            var vertexShader = createShader(gl, 'vertex');
            vertexShader.source('drawImage');

            this.shader(fragShader).shader(vertexShader).link().use();
            this.attribute('a_Position').uniform('u_Resolution').uniform('u_ModelMatrix').uniform('u_Alpha');

            this.positionBuffer = gl.createBuffer();
        },

        render: function (image, x, y, alpha, scaleX, scaleY) {
            var gl = this.gl;

            var u_Resolution = this.u_Resolution;
            gl.uniform2f(u_Resolution, this.width, this.height);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.STATIC_DRAW);

            var a_Position = this.a_Position;
            gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(a_Position);

            var u_Alpha = this.u_Alpha;
            gl.uniform1f(u_Alpha, alpha);

            var modelMatrix = new Matrix4();
            modelMatrix.translate(x, y, 0);
            modelMatrix.scale(image.width * scaleX, image.height * scaleY, 1);
            var u_ModelMatrix = this.u_ModelMatrix;
            gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

            var texture = createTexture(gl, image);
            texture.active();

            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

            return this;
        }

    });

    exports.TransitionProgram = Program.extend({

        constructor: function TransitionProgram(gl, view) {
            this.gl = gl;
            var w = this.width = view.width;
            var h = this.height = view.height;
            this.values = {};
            this.positionData = new Float32Array([
                0, 0,
                w, 0,
                0, h,
                0, h,
                w, 0,
                w, h
            ]);
        },

        attribute: function (name) {
            var gl = this.gl;

            var program = this.value;

            this.value[name] = gl.getAttribLocation(program, name);

            return this;
        },

        uniform: function (name) {
            var gl = this.gl;

            var program = this.value;

            this.value[name] = gl.getUniformLocation(program, name);

            return this;
        },

        getProgram: function (type) {
            var gl = this.gl;

            var programs = this.values;

            if (programs[type]) {
                this.value = programs[type];
                return this;
            }

            programs[type] = this.value = gl.createProgram();
            var fragShader = createShader(gl, 'frag');
            fragShader.source('trans_' + type);
            var vertexShader = createShader(gl, 'vertex');
            vertexShader.source('transition');

            this.shader(fragShader).shader(vertexShader).link().use();
            this.attribute('a_Position').uniform('resolution').uniform('progress').
                uniform('from').uniform('to');

            if (type === 'luma') {
                this.uniform('lumaTex');
            }

            this.positionBuffer = gl.createBuffer();

            return this;
        },

        render: function (texture1, texture2, progress, type, lumaImage) {
            var gl = this.gl;

            this.getProgram(type).use();

            var program = this.value;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.STATIC_DRAW);

            var a_Position = program.a_Position;
            gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 8, 0);
            gl.enableVertexAttribArray(a_Position);

            gl.uniform2f(program.resolution, this.width, this.height);

            gl.uniform1f(program.progress, progress);

            texture1.active(0);
            gl.uniform1i(program.from, 0);

            texture2.active(1);
            gl.uniform1i(program.to, 1);

            if (type === 'luma') {
                var lumaTexture = createTexture(gl, lumaImage);
                lumaTexture.active(2);
                gl.uniform1i(program.lumaTex, 2);
            }

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

    });

    exports.FilterProgram = Program.extend({

        constructor: function (gl, view) {
            this.gl = gl;
            this.values = {};
            this.width = view.width;
            this.height = view.height;
            this.positionData = new Float32Array([
                -1, -1, 0, 1,
                1, -1, 1, 1,
                -1, 1, 0, 0,
                -1, 1, 0, 0,
                1, -1, 1, 1,
                1, 1, 1, 0
            ]);
        },

        attribute: function (name) {
            var gl = this.gl;

            var program = this.value;

            this.value[name] = gl.getAttribLocation(program, name);

            return this;
        },

        uniform: function (name) {
            var gl = this.gl;

            var program = this.value;

            this.value[name] = gl.getUniformLocation(program, name);

            return this;
        },

        getProgram: function (type) {
            var gl = this.gl;

            var programs = this.values;

            if (programs[type]) {
                this.value = programs[type];
                return this;
            }

            programs[type] = this.value = gl.createProgram();
            var fragShader = createShader(gl, 'frag');
            fragShader.source(type);
            var vertexShader = createShader(gl, 'vertex');
            vertexShader.source('filter');

            this.shader(fragShader).shader(vertexShader).link().use();
            this.attribute('a_Position').attribute('a_Uv').uniform('m');

            if (type === 'convolution') {
                this.uniform('u_Px');
            }

            this.positionBuffer = gl.createBuffer();

            return this;
        },

        render: function (texture, type, value) {
            var gl = this.gl;

            this[type](value);

            var program = this.value;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.STATIC_DRAW);

            var a_Position = program.a_Position;
            gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 16, 0);
            gl.enableVertexAttribArray(a_Position);

            var a_Uv = program.a_Uv;
            gl.vertexAttribPointer(a_Uv, 2, gl.FLOAT, false, 16, 8);
            gl.enableVertexAttribArray(a_Uv);

            texture.active();

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        },

        colorMatrix: function (matrix) {
            var gl = this.gl,
                m = new Float32Array(matrix);

            m[4] /= 255;
            m[9] /= 255;
            m[14] /= 255;
            m[19] /= 255;

            this.getProgram('colorMatrix').use();

            var program = this.value;

            gl.uniform1fv(program.m, m);
        },

        brightness: function (brightness) {
            var b = (brightness || 0) + 1;
            this.colorMatrix([
                b, 0, 0, 0, 0,
                0, b, 0, 0, 0,
                0, 0, b, 0, 0,
                0, 0, 0, 1, 0
            ]);
        },

        saturation: function(amount) {
            var x = (amount || 0) * 2 / 3 + 1;
            var y = ((x - 1) * -0.5);
            this.colorMatrix([
                x, y, y, 0, 0,
                y, x, y, 0, 0,
                y, y, x, 0, 0,
                0, 0, 0, 1, 0
            ]);
        },

        desaturate: function() {
            this.saturation(-1);
        },

        contrast: function(amount) {
            var v = (amount || 0) + 1;
            var o = -128 * (v-1);

            this.colorMatrix([
                v, 0, 0, 0, o,
                0, v, 0, 0, o,
                0, 0, v, 0, o,
                0, 0, 0, 1, 0
            ]);
        },

        negative: function() {
            this.contrast(-2);
        },

        hue: function(rotation) {
            rotation = (rotation || 0)/180 * Math.PI;
            var cos = Math.cos(rotation),
                sin = Math.sin(rotation),
                lumR = 0.213,
                lumG = 0.715,
                lumB = 0.072;

            this.colorMatrix([
                lumR+cos*(1-lumR)+sin*(-lumR),lumG+cos*(-lumG)+sin*(-lumG),lumB+cos*(-lumB)+sin*(1-lumB),0,0,
                lumR+cos*(-lumR)+sin*(0.143),lumG+cos*(1-lumG)+sin*(0.140),lumB+cos*(-lumB)+sin*(-0.283),0,0,
                lumR+cos*(-lumR)+sin*(-(1-lumR)),lumG+cos*(-lumG)+sin*(lumG),lumB+cos*(1-lumB)+sin*(lumB),0,0,
                0, 0, 0, 1, 0
            ]);
        },

        desaturateLuminance: function() {
            this.colorMatrix([
                0.2764723, 0.9297080, 0.0938197, 0, -37.1,
                0.2764723, 0.9297080, 0.0938197, 0, -37.1,
                0.2764723, 0.9297080, 0.0938197, 0, -37.1,
                0, 0, 0, 1, 0
            ]);
        },

        sepia: function() {
            this.colorMatrix([
                0.393, 0.7689999, 0.18899999, 0, 0,
                0.349, 0.6859999, 0.16799999, 0, 0,
                0.272, 0.5339999, 0.13099999, 0, 0,
                0,0,0,1,0
            ]);
        },

        brownie: function() {
            this.colorMatrix([
                0.5997023498159715,0.34553243048391263,-0.2708298674538042,0,47.43192855600873,
                -0.037703249837783157,0.8609577587992641,0.15059552388459913,0,-36.96841498319127,
                0.24113635128153335,-0.07441037908422492,0.44972182064877153,0,-7.562075277591283,
                0,0,0,1,0
            ]);
        },

        vintagePinhole: function() {
            this.colorMatrix([
                0.6279345635605994,0.3202183420819367,-0.03965408211312453,0,9.651285835294123,
                0.02578397704808868,0.6441188644374771,0.03259127616149294,0,7.462829176470591,
                0.0466055556782719,-0.0851232987247891,0.5241648018700465,0,5.159190588235296,
                0,0,0,1,0
            ]);
        },

        kodachrome: function() {
            this.colorMatrix([
                1.1285582396593525,-0.3967382283601348,-0.03992559172921793,0,63.72958762196502,
                -0.16404339962244616,1.0835251566291304,-0.05498805115633132,0,24.732407896706203,
                -0.16786010706155763,-0.5603416277695248,1.6014850761964943,0,35.62982807460946,
                0,0,0,1,0
            ]);
        },

        technicolor: function() {
            this.colorMatrix([
                1.9125277891456083,-0.8545344976951645,-0.09155508482755585,0,11.793603434377337,
                -0.3087833385928097,1.7658908555458428,-0.10601743074722245,0,-70.35205161461398,
                -0.231103377548616,-0.7501899197440212,1.847597816108189,0,30.950940869491138,
                0,0,0,1,0
            ]);
        },

        polaroid: function() {
            this.colorMatrix([
                1.438,-0.062,-0.062,0,0,
                -0.122,1.378,-0.122,0,0,
                -0.016,-0.016,1.483,0,0,
                0,0,0,1,0
            ]);
        },

        shiftToBGR: function() {
            this.colorMatrix([
                0,0,1,0,0,
                0,1,0,0,0,
                1,0,0,0,0,
                0,0,0,1,0
            ]);
        },

        convolution: function (matrix) {
            var gl = this.gl,
                m = new Float32Array(matrix),
                pixelSizeX = 1 / this.width,
                pixelSizeY = 1 / this.height;

            this.getProgram('convolution').use();

            var program = this.value;

            gl.uniform1fv(program.m, m);
            gl.uniform2f(program.u_Px, pixelSizeX, pixelSizeY);
        },

        detectEdges: function() {
            this.convolution([
                0, 1, 0,
                1 -4, 1,
                0, 1, 0
            ]);
        },


        sharpen: function(amount) {
            var a = amount || 1;
            this.convolution([
                0, -1*a, 0,
                -1*a, 1 + 4*a, -1*a,
                0, -1*a, 0
            ]);
        },

        emboss: function(size) {
            var s = size || 1;
            this.convolution([
                -2*s, -1*s, 0,
                -1*s, 1, 1*s,
                0, 1*s, 2*s
            ]);
        }

    });

});
webvn.extend('webgl', function (exports, Class) {
    "use strict";
    var DrawImageProgram = exports.DrawImageProgram,
        createFrameBuffer = exports.createFrameBuffer,
        TransitionProgram = exports.TransitionProgram,
        FilterProgram = exports.FilterProgram;

    var WebGL2D = exports.WebGL2D = Class.create({

        constructor: function WebGL2D(view) {
            this.view = view;
            this.gl = view.getContext('webgl');
            this.width = view.width;
            this.height = view.height;

            this._init();
        },

        _init: function () {
            var gl = this.gl,
                view = this.view;

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            this.drawImageProgram = new DrawImageProgram(gl, view);
            this.transitionProgram = new TransitionProgram(gl, view);
            this.filterProgram = new FilterProgram(gl, view);
        },

        drawImage: function (image, x, y, alpha, scaleX, scaleY) {
            this.drawImageProgram.use().render(image, x, y, alpha, scaleX, scaleY);
        },

        drawTransition: function (image1, image2, progress, type, x1, y1, x2, y2, alpha, scaleX, scaleY, filter, lumaImage) {
            var gl = this.gl,
                view = this.view;

            var frameBuffer1 = createFrameBuffer(gl, view, 0),
                frameBuffer2 = createFrameBuffer(gl, view, 1);
            frameBuffer1.start();
            this.drawImage(image1, x1, y1, alpha, scaleX, scaleY);
            frameBuffer1.end();
            frameBuffer2.start();
            this.drawImage(image2, x2, y2, alpha, scaleX, scaleY);
            frameBuffer2.end();

            if (filter) this.bufferFilter();
            this.transitionProgram.render(frameBuffer1.get(),
                frameBuffer2.get(), progress, type, lumaImage);
            if (filter) this.drawFilter(filter.name, filter.value);
        },

        bufferFilter: function () {
            var gl = this.gl,
                view = this.view;

            this.filterFrameBuffer = createFrameBuffer(gl, view, 2);
            this.filterFrameBuffer.start();
        },

        drawFilter: function (type, value) {
            var filterFrameBuffer = this.filterFrameBuffer;

            filterFrameBuffer.end();
            this.filterProgram.render(filterFrameBuffer.get(), type, value);
        },

        clear: function () {
            var gl = this.gl;

            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

    });

    exports.create = function (view) {
        return new WebGL2D(view);
    };

});
/**
 * @namespace webvn.canvas
 */
webvn.module('canvas', function (Class, exports) {
    "use strict";
    var renderer = exports.renderer = Class.module(function () {
        var exports = {};

        var requestAnim = window.requestAnimationFrame;

        var isPaused = true;

        var scenes = [];

        var len = 0, i;

        function render(timestamp) {
            if (isPaused) {
                return;
            }

            for (i = 0; i < len; i++) {
                if (scenes[i].change()) {
                    scenes[i].render(timestamp);
                }
            }

            requestAnim(render);
        }

        exports.start = function () {
            if (!isPaused) {
                return;
            }
            isPaused = false;

            requestAnim(render);
        };

        exports.stop = function () {
            isPaused = true;
        };

        exports.add = function (scene) {
            len++;
            scene.index = scenes.length;
            scenes.push(scene);
        };

        exports.remove = function (scene) {
            len--;
            var index = scene.index;
            if (index === undefined) {
                return;
            }
            scenes.splice(index, 1);
        };

        return exports;
    });

    renderer.start();
});
webvn.extend('canvas', function (exports, Class, webgl) {
    "use strict";

    var Scene = exports.Scene = Class.create({

        constructor: function Scene(view) {
            this.view = view;
            this.ctx = webgl.create(view);
            this.width = view.width;
            this.height = view.height;
            this.children = [];
        },

        change: function () {
            var children = this.children,
                len = children.length;

            for (var i = 0; i < len; i++) {
                if (children[i].change()) {
                    return true;
                }
            }

            return false;
        },

        clear: function () {
            this.ctx.clear();
        },

        add: function (entity) {
            var children = this.children;

            entity.index = children.length;
            children.push(entity);
        },

        render: function () {
            var children = this.children;

            this.clear();

            var i, len = children.length;

            for (i = 0; i < len; i++) {
                if (children[i].visible) {
                    children[i].render(this);
                }
            }
        }

    });

    exports.createScene = function (view) {
        return new Scene(view);
    };

});
webvn.extend('canvas', function (exports, Class, util) {
    "use strict";

    /* Particle system
     * Use canvas 2d api since it is easier to implement
     * Same logic level as Scene class
     */
    var Emitter = exports.Emitter = Class.create({
        constructor: function (v, config) {

            this.view = v;
            this.context = v.getContext('2d');
            this.width = v.width;
            this.height = v.height;
            this.bufferCache = {};
            this.reConfigure(config);

        },
        addParticle: function () {

            if (this.isFull()) {
                return false;
            }

            var p = this.particlePool[this.particleCount];
            this.initParticle(p);
            this.particleCount++;

            return true;

        },
        getBuffer: function (texture) {

            var size = '' + texture.width + 'x' + texture.height;

            var canvas = this.bufferCache[size];

            if(!canvas) {
                canvas = document.createElement('canvas');
                canvas.width = texture.width;
                canvas.height = texture.height;
                this.bufferCache[size] = canvas;
            }

            return canvas;

        },
        getPredefined: function (name) {

            var ret = Emitter.predefined[name],
                x, y,
                w = this.width,
                h = this.height;

            if (util.isString(ret.pos)) {
                switch (ret.pos) {
                    case 'center':
                        x = w / 2;
                        y = h / 2;
                        break;
                    case 'centerAboveTop':
                        x = w / 2;
                        y = 0;
                        break;
                    case 'centerBottom':
                        x = w / 2;
                        y = h * 2 / 3;
                        break;
                    case 'centerOffBottom':
                        x = w / 2;
                        y = h + 20;
                        break;
                    case 'bottomLeft':
                        x = 0;
                        y = h + 5;
                        break;
                }
                ret.pos = {
                    x: x,
                    y: y
                };
            }

            if (ret.textureEnabled) {
                var src = ret.texture;
                ret.texture = new Image();
                ret.texture.src = src;
            }

            return ret;

        },
        initParticle: function (particle) {

            particle.texture = this.texture;
            particle.textureEnabled = this.textureEnabled;
            particle.textureAdditive = this.textureAdditive;

            var posVar = {
                x: this.posVar.x * random11(),
                y: this.posVar.y * random11()
            };

            particle.pos.x = this.pos.x + posVar.x;
            particle.pos.y = this.pos.y + posVar.y;

            var angle = this.angle + this.angleVar * random11();
            var speed = this.speed + this.speedVar * random11();

            particle.setVelocity(angle, speed);

            particle.radialAccel = this.radialAccel + this.radialAccelVar * random11() || 0;
            particle.tangentialAccel = this.tangentialAccel + this.tangentialAccelVar * random11() || 0;

            var life = this.life + this.lifeVar * random11() || 0;
            particle.life = Math.max(0, life);

            particle.scale = util.isNumber(this.startScale) ? this.startScale: 1;
            particle.deltaScale = util.isNumber(this.endScale) ? (this.endScale - this.startScale) : 0;
            particle.deltaScale /= particle.life;

            particle.radius = util.isNumber(this.radius) ? this.radius + (this.radiusVar || 0) * random11() : 0;

            // color
            // note that colors are stored as arrays => [r,g,b,a],
            // this makes it easier to tweak the color every frame in _updateParticle
            // The renderer will take this array and turn it into a css rgba string
            if (this.startColor) {
                var startColor = [
                    this.startColor[0] + this.startColorVar[0] * random11(), this.startColor[1] + this.startColorVar[1] * random11(), this.startColor[2] + this.startColorVar[2] * random11(), this.startColor[3] + this.startColorVar[3] * random11()];

                // if there is no endColor, then the particle will end up staying at startColor the whole time
                var endColor = startColor;
                if (this.endColor) {
                    endColor = [
                        this.endColor[0] + this.endColorVar[0] * random11(), this.endColor[1] + this.endColorVar[1] * random11(), this.endColor[2] + this.endColorVar[2] * random11(), this.endColor[3] + this.endColorVar[3] * random11()];
                }

                particle.color = startColor;
                particle.deltaColor = [(endColor[0] - startColor[0]) / particle.life, (endColor[1] - startColor[1]) / particle.life, (endColor[2] - startColor[2]) / particle.life, (endColor[3] - startColor[3]) / particle.life];
            }

        },
        isFull: function () {

            return this.particleCount === this.totalParticles;

        },
        play: function () {

            this.reset();

        },
        // 重置数据
        reConfigure: function (config) {

            if (util.isString(config)) {
                config = this.getPredefined(config);
            }

            if (!config) {
                config = this.getPredefined('glaxy');
            }

            this.totalParticles = 0;
            this.emissionRate = 0;
            this.active = false;
            this.duration = 0;

            this.pos = this.pos || {};
            this.pos.x = 0;
            this.pos.y = 0;
            this.posVar = this.posVar || {};
            this.posVar.x = 0;
            this.posVar.y = 0;

            this.speed = 0;
            this.speedVar = 0;

            this.angle = 0;
            this.angleVar = 0;

            this.life = 0;
            this.lifeVar = 0;

            this.radius = 0;
            this.radiusVar = 0;

            this.texture = null;
            this.textureEnabled = false;
            this.textureAdditive = false;

            this.startScale = 0;
            this.startScaleVar = 0;
            this.endScale = 0;
            this.endScaleVar = 0;

            this.startColor = this.startColor || [];
            this.startColor[0] = 0;
            this.startColor[1] = 0;
            this.startColor[2] = 0;
            this.startColor[3] = 0;

            this.startColorVar = this.startColorVar || [];
            this.startColorVar[0] = 0;
            this.startColorVar[1] = 0;
            this.startColorVar[2] = 0;
            this.startColorVar[3] = 0;

            this.endColor = this.endColor || [];
            this.endColor[0] = 0;
            this.endColor[1] = 0;
            this.endColor[2] = 0;
            this.endColor[3] = 0;

            this.endColorVar = this.endColorVar || [];
            this.endColorVar[0] = 0;
            this.endColorVar[1] = 0;
            this.endColorVar[2] = 0;
            this.endColorVar[3] = 0;

            this.gravity = this.gravity || {};
            this.gravity.x = 0;
            this.gravity.y = 0;

            this.radialAccel = 0;
            this.radialAccelVar = 0;
            this.tangentialAccel = 0;
            this.tangentialAccelVar = 0;

            util.mix(this, config);

            this.restart();

        },
        restart: function () {

            this.particlePool = [];

            for (var i = 0; i < this.totalParticles; i++) {
                this.particlePool.push(new Emitter.Particle);
            }

            this.particleCount = 0;
            this.particleIndex = 0;
            this.elapsed = 0;
            this.emitCounter = 0;

        },
        render: function (timestamp) {

            // Update particles
            var delta = timestamp - (this.lastTimestamp || timestamp);
            this.lastTimestamp = timestamp;
            delta /= 1000;
            this.update(delta);

            // Draw particles
            var particles = this.particlePool;

            this.context.clearRect(0, 0, this.width, this.height);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                if (p.life > 0 && p.color) {
                    if(p.textureAdditive) {
                        this.context.globalCompositeOperation = 'lighter';
                    } else {
                        this.context.globalCompositeOperation = 'source-over';
                    }
                    if(!p.texture || !p.textureEnabled) {
                        this.renderParticle(p);
                    } else {
                        this.renderParticleTexture(p);
                    }
                }
            }

        },
        renderParticle: function (particle) {

            var context = this.context,
            color = colorArrayToString(particle.color);

            context.fillStyle = color;
            context.beginPath();
            context.arc(particle.pos.x, particle.pos.y, particle.radius * particle.scale, 0, Math.PI*2, true);
            context.closePath();
            context.fill();

        },
        renderParticleTexture: function (particle) {

            particle.buffer = particle.buffer || this.getBuffer(particle.texture);

            var bufferContext = particle.buffer.getContext('2d');

            // figure out what size to draw the texture at, based on the particle's
            // current scale
            var w = (particle.texture.width * particle.scale) | 0;
            var h = (particle.texture.height * particle.scale) | 0;

            // figure out the x and y locations to render at, to center the texture in the buffer
            var x = particle.pos.x - w / 2;
            var y = particle.pos.y - h / 2;

            bufferContext.clearRect(0, 0, particle.buffer.width, particle.buffer.height);
            bufferContext.globalAlpha = particle.color[3];
            bufferContext.drawImage(particle.texture, 0, 0);

            // now use source-atop to "tint" the white texture, here we want the particle's pure color,
            // not including alpha. As we already used the particle's alpha to render the texture above
            bufferContext.globalCompositeOperation = "source-atop";
            bufferContext.fillStyle = colorArrayToString(particle.color, 1);
            bufferContext.fillRect(0, 0, particle.buffer.width, particle.buffer.height);

            // reset the buffer's context for the next time we draw the particle
            bufferContext.globalCompositeOperation = "source-over";
            bufferContext.globalAlpha = 1;

            // finally, take the rendered and tinted texture and draw it into the main canvas, at the
            // particle's location
            this.context.drawImage(particle.buffer, 0, 0, particle.buffer.width, particle.buffer.height, x, y, w, h);

        },
        update: function (delta) {

            this.elapsed += delta;
            this.active = this.elapsed < this.duration;

            if (!this.active) {
                return;
            }

            if (this.emissionRate) {
                var rate = 1.0 / this.emissionRate;
                this.emitCounter += delta;
                while (!this.isFull() && this.emitCounter > rate) {
                    this.addParticle();
                    this.emitCounter -= rate;
                }
            }

            this.particleIndex = 0;

            while (this.particleIndex < this.particleCount) {
                var p = this.particlePool[this.particleIndex];
                this.updateParticle(p, delta, this.particleIndex);
            }

        },
        updateParticle: function (p, delta, i) {

            if (p.life > 0) {
                p.forces = p.forces || {
                    x: 0,
                    y: 0
                };
                p.forces.x = 0;
                p.forces.y = 0;

                p.radial = p.radial || {
                    x: 0,
                    y: 0
                };
                p.radial.x = 0;
                p.radial.y = 0;

                if ((p.pos.x !== this.pos.x || p.pos.y !== this.pos.y) && (p.radialAccel || p.tangentialAccel)) {
                    p.radial.x = p.pos.x - this.pos.x;
                    p.radial.y = p.pos.y - this.pos.y;
                    normalize(p.radial);
                }

                p.tangential = p.tangential || {
                    x: 0,
                    y: 0
                };
                p.tangential.x = p.radial.x;
                p.tangential.y = p.radial.y;

                p.radial.x *= p.radialAccel;
                p.radial.y *= p.radialAccel;

                var newy = p.tangential.x;
                p.tangential.x = - p.tangential.y;
                p.tangential.y = newy;

                p.tangential.x *= p.tangentialAccel;
                p.tangential.y *= p.tangentialAccel;

                p.forces.x = p.radial.x + p.tangential.x + this.gravity.x;
                p.forces.y = p.radial.y + p.tangential.y + this.gravity.y;

                p.forces.x *= delta;
                p.forces.y *= delta;

                p.vel.x += p.forces.x;
                p.vel.y += p.forces.y;

                p.pos.x += p.vel.x * delta;
                p.pos.y += p.vel.y * delta;

                p.life -= delta;

                p.scale += p.deltaScale * delta;

                if (p.color) {
                    p.color[0] += p.deltaColor[0] * delta;
                    p.color[1] += p.deltaColor[1] * delta;
                    p.color[2] += p.deltaColor[2] * delta;
                    p.color[3] += p.deltaColor[3] * delta;
                }

                this.particleIndex++;
            } else {
                var temp = this.particlePool[i];
                this.particlePool[i] = this.particlePool[this.particleCount - 1];
                this.particlePool[this.particleCount - 1] = temp;
                this.particleCount--;
            }

        }
    }, {
        Particle: Class.create({
            constructor: function Particle() {

                this.pos = {
                    x: 0,
                    y: 0
                };

                this.setVelocity(0, 0);
                this.life = 0;

            },
            setVelocity: function (angle, speed) {

                this.vel = {
                    x: Math.cos(toRad(angle)) * speed,
                    y: -Math.sin(toRad(angle)) * speed
                };

            }
        }),
        predefined: {
            'glaxy': {
                totalParticles: 200,
                emissionRate: 50,
                pos: 'center',
                angle: 90,
                angleVar: 360,
                speed: 60,
                speedVar: 10,
                life: 4,
                lifeVar: 1,
                radialAccel: - 80,
                radialAccelVar: 0,
                tangentialAccel: 80,
                tangentialAccelVar: 0,
                texture: '/engine/img/particle.png',
                textureEnabled: true,
                textureAdditive: true,
                radius: 10,
                radiusVar: 2,
                startScale: 1,
                endScale: 1,
                startColor: [30.6, 63.75, 193.8, 1],
                endColor: [0, 0, 0, 0],
                active: true,
                duration: Infinity
            },
            'smoke': {
                totalParticles: 50,
                emissionRate: 100,
                pos: 'centerOffBottom',
                posVar: {
                    x: 640,
                    y: 200
                },
                angle: 90,
                angleVar: 60,
                speed: 60,
                speedVar: 10,
                life: 5,
                lifeVar: 2,
                radialAccel: 0,
                radialAccelVar: 0,
                tangentialAccel: 0,
                tangentialAccelVar: 0,
                texture: '/engine/img/smoke.png',
                textureEnabled: true,
                textureAdditive: false,
                radius: 5,
                radiusVar: 2,
                startScale: 1,
                endScale: 1,
                gravity: {
                    x: 0,
                    y: -50
                },
                startColor: [255, 255, 255, 1],
                endColor: [255, 255, 255, 0.4],
                active: true,
                duration: Infinity
            },
            'bubble': {
                totalParticles: 200,
                emissionRate: 8,
                active: true,
                duration: Infinity,
                pos: 'centerOffBottom',
                posVar: {
                    x: 640,
                    y: 0
                },
                angle: 90,
                angleVar: 20,
                life: 12,
                lifeVar: 1,
                radius: 20,
                radiusVar: 8,
                textureEnabled: false,
                textureAdditive: false,
                startScale: 1,
                startScaleVar: 0,
                endScale: 1,
                endScaleVar: 0,
                startColor: [255, 255, 255, 1],
                endColor: [25.5, 25.5, 25.5, 0],
                gravity: {
                    x: 0,
                    y: -30
                },
                radialAccel: 0,
                radialAccelVar: 0,
                tangentialAccel: 0,
                tangentialAccelVar: 0,
                speed: 2,
                speedVar: 0
            },
            'fire': {
                totalParticles: 250,
                emissionRate: 30,
                pos: 'centerOffBottom',
                posVar: {
                    x: 40,
                    y: 20
                },
                angle: 90,
                angleVar: 10,
                speed: 60,
                speedVar: 20,
                life: 8,
                lifeVar: 4,
                radialAccel: 0,
                radialAccelVar: 0,
                tangentialAccel: 0,
                tangentialAccelVar: 0,
                texture: '/engine/img/particle.png',
                textureEnabled: true,
                textureAdditive: true,
                radius: 10,
                radiusVar: 1,
                startScale: 1,
                endScale: 1,
                startColor: [193.8, 63.75, 30.6, 1],
                endColor: [0, 0, 0, 0],
                active: true,
                duration: Infinity
            },
            'rain': {
                totalParticles: 500,
                emissionRate: 100,
                active: true,
                duration: Infinity,
                pos: 'centerAboveTop',
                posVar: {
                    x: 800,
                    y: 0
                },
                angle: 260,
                angleVar: 0,
                life: 3,
                lifeVar: 1,
                radius: 2,
                radiusVar: 1,
                texture: '/engine/img/rain.png',
                textureEnabled: true,
                textureAdditive: true,
                startScale: 1,
                startScaleVar: 0,
                endScale: 1,
                endScaleVar: 0,
                startColor: [255, 255, 255, 0.9],
                startColorVar: [0, 0, 0, 0.1],
                endColor: [255, 255, 255, 0.4],
                endColorVar: [0, 0, 0, 0.2],
                gravity: {
                    x: -5,
                    y: 80
                },
                radialAccel: 0,
                radialAccelVar: 0,
                tangentialAccel: 0,
                tangentialAccelVar: 0,
                speed: 350,
                speedVar: 50
            },
            'snow': {
                totalParticles: 300,
                emissionRate: 8,
                pos: 'centerAboveTop',
                posVar: {
                    x: 640,
                    y: 0
                },
                gravity: {
                    x: 0,
                    y: 8
                },
                angle: -90,
                angleVar: 10,
                speed: 9,
                speedVar: 1,
                life: 45,
                lifeVar: 15,
                radialAccel: 0,
                radialAccelVar: 0,
                tangentialAccel: 0,
                tangentialAccelVar: 0,
                textureEnabled: false,
                textureAdditive: false,
                radius: 5,
                radiusVar: 2,
                startScale: 1,
                endScale: 0.3,
                startColor: [255, 255, 255, 0.8],
                startColorVar: [0, 0, 0, 0.2],
                endColor: [255, 255, 255, 0],
                active: true,
                duration: Infinity
            }
        }
    });

    function colorArrayToString(array, overrideAlpha) {

        var r = array[0] | 0;
        var g = array[1] | 0;
        var b = array[2] | 0;
        var a = overrideAlpha || array[3];

        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';

    }

    function toRad(deg) {

        return Math.PI * deg / 180;

    }

    function random11() {

        return random(-1, 1, true);

    }

    function random(minOrMax, maxOrUndefined, dontFloor) {

        dontFloor = dontFloor || false;

        var min = util.isNumber(maxOrUndefined) ? minOrMax: 0;
        var max = util.isNumber(maxOrUndefined) ? maxOrUndefined: minOrMax;

        var range = max - min;

        var result = Math.random() * range + min;

        if (isInteger(min) && isInteger(max) && ! dontFloor) {
            return Math.floor(result);
        } else {
            return result;
        }

    }

    function isInteger(num) {

        return num === (num | 0);

    }

    /*
     * Given a vector of any length, returns a vector
     * pointing in the same direction but with a magnitude of 1
     */
    function normalize(vector) {

        var length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        vector.x /= length;
        vector.y /= length;

    }

});
webvn.extend('canvas', function (exports, Class, loader, anim, util, config, storage) {
    var conf = config.create('canvas');

    var Entiy = Class.create({

        constructor: function Entity() {
            "use strict";
            this.x = 0;
            this.y = 0;
            this.visible = false;
        },

        change: function () {
            return true;
        },

        render: function () {}

    });

    var lumaAsset = storage.createAsset(conf.get('lumaPath'), conf.get('lumaExtension'));

    var ImageEntity = exports.ImageEntity = Entiy.extend({

        constructor: function ImageEntity() {
            this.callSuper();

            this.alpha = 1;
            this.width = 0;
            this.height = 0;
            this.loaded = false;
            // Only when position is null, x and y will take effect.
            this.position = null;
            this.progress = 1;
            this.scaleX = 1;
            this.scaleY = 1;
            this.transition = 'linear';
            this.filter = null;

            this.x2 = null;
            this.y2 = null;

            this.attributes = [
                'x',
                'y',
                'alpha',
                'width',
                'height',
                'position',
                'progress',
                'scaleX',
                'scaleY',
                'transition',
                'filter',
                'x2',
                'y2'
            ];
        },

        change: function () {
            var attributes = this.attributes,
                len = attributes.length, key;

            for (var i = 0; i < len; i++) {
                key = attributes[i];
                if (this['_' + key] !== this[key]) {
                    this['_' + key] = this[key];
                    return true;
                }
            }

            return false;
        },

        setPosition: function (x, y) {
            if (util.isString(x)) {
                this.position = x;
                return;
            }

            this.position = null;
            if (x) this.x = x;
            if (y) this.y = y;
        },

        _calPosition: function (view) {
            var position = this.position;

            if (position === null) {
                return;
            }

            if (this._position === position) {
                return;
            }
            this._position = position;

            var w = view.width,
                h = view.height;

            var image = this.image,
                iw = image.width,
                ih = image.height;

            switch (position) {
                case 'c':
                case 'center':
                    this.x = (w - iw) / 2;
                    this.y = (h - ih) / 2;
                    break;
                case 'bc':
                case 'bottomCenter':
                    this.x = (w - iw) / 2;
                    this.y = h - ih;
                    break;
                case 'tc':
                case 'topCenter':
                    this.x = (w - iw) / 2;
                    this.y = 0;
                    break;
                case 'l':
                case 'left':
                    this.x = 0;
                    this.y = (h - ih) / 2;
                    break;
                case 'bl':
                case 'bottomLeft':
                    this.x = 0;
                    this.y = h - ih;
                    break;
                case 'tl':
                case 'topLeft':
                    this.x = 0;
                    this.y = 0;
                    break;
                case 'r':
                case 'right':
                    this.x = w - iw;
                    this.y = (h - ih) / 2;
                    break;
                case 'br':
                case 'bottomRight':
                    this.x = w - iw;
                    this.y = h - ih;
                    break;
                case 'tr':
                case 'topRight':
                    this.x = w - iw;
                    this.y = 0;
                    break;
            }
        },

        animate: function (to, duration) {
            var ease;
            if (to.ease) {
                ease = to.ease;
                delete to.ease;
            }

            if (to.x !== undefined || to.y === undefined) {
                this.position = null;
            }
            anim.create(this).to(to, duration, ease);
        },

        fadeIn: function (duration) {
            this.alpha = 0;
            this.visible = true;
            anim.create(this).to({
                alpha: 1
            }, duration);
        },

        fadeOut: function (duration) {
            var self = this;

            anim.create(this).to({
                alpha: 0
            }, duration).call(function () {
                self.visible = false;
            });
        },

        load: function (src, duration) {
            "use strict";
            var self = this;

            src = [src];

            // Handle situation
            if (util.startsWith(this.transition, 'luma')) {
                var lumaType = this.transition.substr(4);
                // Lowercase first character
                lumaType = lumaType.charAt(0).toLowerCase() + lumaType.substr(1);
                this.transition = 'luma';
                src.push(lumaAsset.get(lumaType));
            }

            loader.image(src).then(function (images) {
                var image;
                if (util.isArray(images)) {
                    self.lumaImage = images[1];
                    image = images[0];
                } else {
                    image = images;
                }

                if (self.image) {
                    self.image2 = self.image;
                    self._load(image);
                } else {
                    self._load(image);
                    self.fadeIn(duration);
                    return;
                }

                self.progress = 0;
                anim.create(self).to({
                    progress: 1
                }, duration);
            });
        },

        _load: function (image) {
            "use strict";
            this.image = image;
            this.width = image.width;
            this.height = image.height;
            this._position = null;
        },

        render: function (scene) {

            var ctx = scene.ctx;

            if (this.progress !== 1 && this.x2 === null) {
                // Store the last image x, y before recalculate position.
                this.x2 = this.x;
                this.y2 = this.y;
            }

            this._calPosition(scene.view);

            var image = this.image,
                x = this.x,
                y = this.y,
                alpha = this.alpha,
                scaleX = this.scaleX,
                scaleY = this.scaleY,
                transition = this.transition,
                progress = this.progress,
                lumaImage = this.lumaImage;

            if (progress !== 1) {
                ctx.drawTransition(this.image2, image, progress, transition, this.x2, this.y2, x, y, alpha, scaleX, scaleY, this.filter, lumaImage);
            } else {
                this.x2 = null;
                var filter = this.filter;
                if (filter) ctx.bufferFilter();
                ctx.drawImage(image, x, y, alpha, scaleX, scaleY);
                if (filter) ctx.drawFilter(filter.name, filter.value);
            }
        }

    });

    exports.createImage = function () {
        return new ImageEntity;
    };

});
webvn.module('media', function (Class, log, util, anim, config, storage, exports) {
    // Const variables
    var STATE = exports.STATE = {
        NOT_LOADED: 0,
        PAUSE: 1,
        PLAY: 2
    };

    var Base = exports.Base = Class.create({
        constructor: function Base() {
            this.state = STATE.NOT_LOADED;
            this.el = null;
        },

        isLoaded: function () {
            return this.state !== STATE.NOT_LOADED;
        },

        /**
         * Load media and play(optional)
         * @method webvn.media.Base#load
         * @param {string} src source of media
         * @param {boolean=} [autoPlay=true] play media after loading
         */
        load: function (src, autoPlay) {
            if (autoPlay === undefined) {
                autoPlay = true;
            }
            var self = this;
            // Stop playing music
            this.stop();
            this.state = STATE.NOT_LOADED;
            // AutoPlay init
            if (autoPlay) {
                this.el.onloadeddata = function () {
                    self.state = STATE.PAUSE;
                    self.play();
                };
            } else {
                this.el.onloadeddata = function () {
                    self.state = STATE.PAUSE;
                }
            }
            // Start loading
            this.el.src = src;
        },

        /**
         * Pause media
         * @method webvn.media.Base#pause
         */
        pause: function () {
            if (this.state === STATE.PLAY) {
                this.el.pause();
                this.state = STATE.PAUSE;
            }
        },

        /**
         * Play media
         * @method webvn.media.Base#play
         */
        play: function () {
            if (this.state === STATE.PAUSE) {
                this.el.play();
                this.state = STATE.PLAY;
            }
        },

        isPlaying: function () {
            "use strict";
            return this.state === STATE.PLAY;
        },

        /**
         * Stop media
         * @method webvn.media.Base#stop
         */
        stop: function () {
            if (this.state !== STATE.NOT_LOADED) {
                this.curTime = 0;
                this.pause();
                this.state = STATE.PAUSE;
            }
        },

        /**
         * Set events of media
         * @method webvn.media.Base#event
         * @param {object} events events such as onload, onended
         */
        events: function (events) {
            var self = this;
            util.each(events, function (fn, type) {
                self.el['on' + type] = fn;
            });
        }

    }, {
        loop: {
            get: function () {
                return this.el.loop;
            },
            set: function (val) {
                this.el.loop = val;
            }
        },
        curTime: {
            get: function () {
                return this.el.currentTime;
            },
            set: function (val) {
                this.el.currentTime = val;
            }
        },
        volume: {
            get: function () {
                return this.el.volume;
            },
            set: function (val) {
                this.el.volume = val;
            }
        }
    });



    // Unlike audio, video object is passed by user.
    var Video = exports.Video = Base.extend({

        constructor: function Video(video) {
            this.callSuper();
            this.el = video;
        }

    });

    exports.video = Class.module(function (exports) {
        exports.create = function (video) {
            return new Video(video);
        }
    });

});
webvn.extend('media', function (exports, storage, config, Class) {
    var Base = exports.Base,
        STATE = exports.STATE;

    // Append class in order not to conflict with primitive Audio class.
    var AudioClass = exports.AudioClass = Base.extend({

        constructor: function AudioClass() {
            this.callSuper();
            this.el = new Audio;
            this.duration = 0;
            this.fadeIn = false;
            this.fadeOut = false;
        },

        load: function (src, autoplay) {
            if (autoplay === undefined) {
                autoplay = true;
            }

            var self = this;

            // Stop playing music
            this.stop();
            this.state = STATE.NOT_LOADED;

            var el = this.el;

            // Autoplay init
            if (autoplay) {
                el.onloadeddata = function () {
                    self.duration = self.el.duration;
                    self.state = STATE.PAUSE;
                    self.play();
                };
            } else {
                el.onloadeddata = function () {
                    self.duration = self.el.duration;
                    self.state = STATE.PAUSE;
                }
            }

            // Start loading
            if (this.asset) {
                el.src = this.asset.get(src);
            } else {
                el.src = src;
            }
        },

        play: function () {
            this.callSuper();
            if (this.fadeIn) {
                this._stopTween();
                var self = this;
                this._volume = this.volume();
                this.volume(0);
                this._anim = anim.create(this.el).to({
                    volume: this._volume
                }, this.duration).call(function () {
                    self._anim = null;
                });
            }
        },

        pause: function () {
            var self = this;
            if (this.state !== STATE.PLAY) {
                return;
            }
            if (this.fadeOut) {
                this._stopTween();
                this.state = STATE.FADE_OUT;
                this._volume = this.volume();
                this._anim = anim.create(this.el).to({
                    volume: 0
                }, this.duration).call(function () {
                    self._anim = null;
                    self.volume(self._volume);
                    self.el.pause();
                    self.state = STATE.PAUSE;
                });
            } else {
                this.el.pause();
                this.state = STATE.PAUSE;
            }
        },

        _stopTween: function () {
            if (this._anim) {
                this._anim.stop();
                this.volume(this._volume);
            }
        }

    });

    var audio = exports.audio = Class.module(function (exports) {
        var audios = {};

        exports.create = function (name) {
            if (audios[name]) {
                return audios[name];
            }
            audios[name] = new AudioClass();
            return audios[name];
        };

        exports.get = function (name) {
            return audios[name];
        };
    });

    var cfg = config.create('media');

    var cfgBgm = cfg.get('bgm');
    var bgm = audio.create('bgm');
    bgm.asset = storage.createAsset(cfgBgm.path, cfgBgm.extension);
    bgm.loop = true;
    bgm.duration = 2000;

    var cfgSe = cfg.get('se');
    var se = audio.create('se');
    se.asset = storage.createAsset(cfgSe.path, cfgSe.extension);

    var cfgVo = cfg.get('vo');
    var vo = audio.create('vo');
    vo.asset = storage.createAsset(cfgVo.path, cfgVo.extension);

    // System sound, for example: button hover effect
    audio.create('sys');
});
webvn.module('text', function (util, Class, select, exports) {
    var TextAnim = exports.TextAnim = Class.create({

        constructor: function TextAnim($el) {

            // If the element is a dom node, pass it into a select element
            if (!select.isSelect($el)) {
                $el = select($el);
            }

            this.$el = $el;
            this.data = '';
            this.length = 0;
            this.type = 'fadeIn';
            this.duration = 50;
            this.timers = [];
            this.isPlaying = false;

        },

        load: function (data, autoshow) {

            if (autoshow === undefined) {
                autoshow = true;
            }

            this.stopTimer();

            this.data = data;
            this.length = data.length;
            if (autoshow) {
                this.show();
            }

        },

        show: function () {
            var len = this.length,
                self = this,
                $el = this.$el;

            this.isPlaying = true;

            $el.html(this.splitText(this.data));

            var $span = $el.find('span');
            $span.hide();

            for (var i = 0; i < len; i++) {
                this.showChar(i);
            }

            // Remove everything when done
            setTimeout(function () {
                self.stop();
            }, (this.duration / 10) * i + this.duration);

        },

        showChar: function (i) {

            var self = this,
                animDuration = this.duration / 1000 + 's';

            this.timers[i] = setTimeout(function () {

                self.$el.find('.char' + i).css('display', 'inline-block').css({
                    '-webkit-animation-duration': animDuration
                }).addClass(self.type);

                self.timers[i] = null;

            }, i * (this.duration / 10));

        },

        // Split text into different span
        splitText: function (data) {

            var ret = '';

            for (var i = 0, len = data.length; i < len; i++) {
                var char = data[i];
                if (char === ' ') {
                    char = '&nbsp;';
                }
                ret += '<span class="char' + i + '">' + char + '</span>';
            }

            return ret;

        },

        isStop: function () {
            return !this.isPlaying;
        },

        stop: function () {
            this.isPlaying = false;
            this.stopTimer();
            this.$el.find('span').show().removeAttr('class');
        },

        stopTimer: function () {

            for (var i = 0; i < this.length; i++) {
                if (this.timers[i]) {
                    clearTimeout(this.timers[i]);
                    this.timers[i] = null;
                }
            }

        }
    });

    exports.createAnim = function (el) {
        return new TextAnim(el);
    };
});
webvn.module('ui', function (Class, select, config, util, script, exports) {
    var cfg = config.create('ui'),
        cfgContainer = cfg.get('container'),
        cfgDefaultTpl = cfg.get('defaultTpl'),
        cfgWidth = cfg.get('width'),
        cfgHeight = cfg.get('height'),
        cfgAutoResize = cfg.get('autoResize');

    var uis = {};

    exports.create = function (name, type) {
        var ui;

        switch (type) {
            case 'canvas':
                ui = new CanvasUi(name);
                break;
            default:
                ui = new DivUi(name);
                break;
        }

        uis[name] = ui;

        return ui;
    };

    exports.get = function (name) {
        return uis[name];
    };

    var $container = select.get(cfgContainer);
    if ($container.length === 0) {
        select.get('body').append(cfgDefaultTpl);
    }
    $container = select.get(cfgContainer);
    $container.css({
        width: cfgWidth,
        height: cfgHeight
    }).on('click', function () {
        // When the ui is clicked, execute the script
        script.play();
    });

    // Auto fill windows
    exports.scale = 1;

    var ratio = cfgWidth / cfgHeight;

    function resize() {
        var ww = window.innerWidth,
            wh = window.innerHeight,
            windowRatio = ww / wh;

        if (ratio > windowRatio) {
            exports.scale = ww / cfgWidth;
        } else {
            exports.scale = wh / cfgHeight;
        }

        // Zoom is better than transform scale
        $container.css('zoom', exports.scale);
    }

    if (cfgAutoResize) {
        window.onresize = function () {
            resize();
        };
        resize();
    }

    // Base class for all ui class
    var BaseUi = Class.create({

        constructor: function BaseUi(name) {
            this.init();
        },

        init: function () {
            this.$el.hide();
            $container.append(this.$el);
        },

        properties: function (attrs) {
            var self = this;

            util.each(attrs, function (attr, key) {
                if (util.isObject(attr) && (attr['get'] || attr['set'])) {
                    Object.defineProperty(self, key, attr);
                } else {
                    self[key] = attr;
                }
            });

            return this;
        }

    });

    var DivUi = BaseUi.extend({

        constructor: function DivUi(name) {
            this.$el = select.create('div');
            this.$el.attr('id', name);

            this.callSuper();
        },

        stopPropagation: function () {
            this.$el.on('click', function (e) {
                e.stopPropagation();
            });

            return this;
        },

        events: function (type, fn) {
            var self = this,
                events = {};

            if (util.isObject(type)) {
                events = type;
            } else {
                events[type] = fn;
            }

            util.each(events, function (fn, type) {
                var parts = type.split(/\s/),
                    eventType = parts[0];
                parts.shift();
                var selector = parts.join(' ');
                // No propagation
                self.$el.on(eventType, selector, function (e) {
                    e.stopPropagation();
                    fn.call(this, e);
                });
            });

            return this;
        }

    });

    // Canvas element
    var CanvasUi = BaseUi.extend({

        constructor: function CanvasUi(name) {
            this.$el = select.create('canvas');
            this.$el.attr('id', name);
            this.canvas = this.$el.get(0);
            this.canvas.width = cfgWidth;
            this.canvas.height = cfgHeight;

            this.callSuper();
        },

        getCanvas: function () {
            return this.canvas;
        }

    });
});
webvn.extend('ui', function (exports, util, config, Class) {
    'use strict';
    var cfg = config.create('ui'),
        cfgLang = cfg.get('lang');

    var langs = {};

    var Lang = Class.create({

        constructor: function Lang(name) {
            if (langs[name]) {
                this.val = langs[name][cfgLang];
            }
        },

        get: function (key) {
            var val = this.val;

            if (val[key]) return val[key];

            return key;
        }

    });

    function create(name, content) {
        if (util.isObject(name)) {
            util.each(name, function (value, key) {
                langs[key] = value;
            });
        } else {
            langs[name] = content;
        }
    }

    var langInstances = {};

    function get(name) {
        var ret = langInstances[name];

        if (!ret) ret = langInstances[name] = new Lang(name);

        return ret;
    }

    exports.lang = {
        create: create,
        get: get
    };
});
webvn.extend('ui', function (exports, util) {
    'use strict';
    var templates = {};

    // underscore template
    var regEvaluate = /<%([\s\S]+?)%>/g,
        regInterpolate = /<%=([\s\S]+?)%>/g,
        regEscape = /<%-([\s\S]+?)%>/g,
        regMatcher = RegExp([
            regEscape.source,
            regInterpolate.source,
            regEvaluate.source
        ].join('|') + '|$', 'g');

    var escapes = {
        "'":      "'",
        '\\':     '\\',
        '\r':     'r',
        '\n':     'n',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };

    var regEscapeChar = /\\|'|\r|\n|\u2028|\u2029/g;

    var escapeChar = function(match) {
        return '\\' + escapes[match];
    };

    function template(text) {
        var index = 0,
            source = "__p+='";

        text.replace(regMatcher, function (match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(regEscapeChar, escapeChar);
            index = offset + match.length;

            if (escape) {
                source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
            } else if (interpolate) {
                source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            } else if (evaluate) {
                source += "';\n" + evaluate + "\n__p+='";
            }

            return match;
        });

        source += "';\n";
        source = 'with(obj||{}){\n' + source + '}\n';
        source = "var __t,__p='',__j=Array.prototype.join," +
            "print=function(){__p+=__j.call(arguments,'');};\n" +
            source + 'return __p;\n';

        var render = new Function('obj', 'util', source);

        return function (data) {
            return render.call(null, data, util);
        };
    }

    function create(name, content) {
        if (util.isObject(name)) {
            util.each(name, function (val, key) {
                templates[key] = template(val);
            });
        } else {
            templates[name] = template(content);
        }
    }

    function get(name) {
        return templates[name];
    }

    exports.template = {
        create: create,
        get: get
    };
});
/**
 * Module test <br>
 * Provide some handy function for function testing.
 * It should be removed when the game is realeased.
 * @namespace webvn.test
 */
webvn.module('test', function (Class, select, script, util, exports) {

    // Component testing
    exports.Component = Class.create({

        constructor: function Component(scenarioId) {
            this.scenario = util.trim(select.get('#' + scenarioId).text());
        },

        start: function () {
            script.loadText(this.scenario, true);
        }

    });

});