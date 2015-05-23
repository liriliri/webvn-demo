webvn.use(function (ui) { ui.template.create({
    "config": "<div class=\"ui-title\"><%= Config %></div>\r\n<ul class=\"container\">\r\n    <li>\r\n        <label><%= Text_Speed %></label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label><%= Text_Auto %></label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label><%= Music %></label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label><%= Sound %></label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label><%= Voice %></label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n</ul>\r\n<div class=\"close button\"><%= Close %></div>",
    "dialog": "<div class=\"wrapper\">\r\n    <div class=\"name\"></div>\r\n    <div class=\"content\">\r\n        <img class=\"face hidden\" src=\"\"/>\r\n        <span class=\"text\"></span>\r\n    </div>\r\n    <ul class=\"controls\">\r\n        <li class=\"qsave\"><%= Q_Save %></li>\r\n        <li class=\"qlave\"><%= Q_Load %></li>\r\n        <li class=\"save\"><%= Save %></li>\r\n        <li class=\"load\"><%= Load %></li>\r\n        <li class=\"config\"><%= Config %></li>\r\n        <li class=\"log\"><%= History %></li>\r\n        <li class=\"exit\"><%= Title %></li>\r\n    </ul>\r\n</div>",
    "gallery": "<div class=\"ui-title\"><%= Gallery %></div>\r\n<ul class=\"container\">\r\n</ul>\r\n<ul class=\"pagination\">\r\n</ul>\r\n<div class=\"close button\"><%= Close %></div>\r\n<div class=\"viewer fill hidden\">\r\n    <img src=\"\" />\r\n</div>\r\n",
    "menu": "<ul>\r\n    <li class=\"start\"><%= Start %></li>\r\n    <li class=\"load\"><%= Load %></li>\r\n    <li class=\"cg\"><%= Gallery %></li>\r\n    <li class=\"music\"><%= Music %></li>\r\n    <li class=\"setting\"><%= Config %></li>\r\n</ul>",
    "music": "<div class=\"ui-title\"><%= Music %></div>\r\n<ul class=\"container\">\r\n</ul>\r\n<div class=\"progress\">\r\n    <span></span>\r\n</div>\r\n<div class=\"close button\"><%= Close %></div>\r\n<ul class=\"controls\">\r\n    <li class=\"previous button disabled\">&lt;&lt;</li>\r\n    <li class=\"play button disabled\"></li>\r\n    <li class=\"next button disabled\">&gt;&gt;</li>\r\n</ul>",
    "save": "<div class=\"ui-title\"><%= Title %></div>\r\n<ul class=\"container\">\r\n    <% util.each(records, function (record, index) { %>\r\n        <li class=\"<%= type %>\" data-num=\"<%= index %>\">\r\n            <span>\r\n                <%= record.title %><br><br>\r\n                <%= record.date %>\r\n            </span>\r\n        </li>\r\n    <% }) %>\r\n</ul>\r\n<div class=\"close button\"><%= Close %></div>\r\n",
    "video": "<video class=\"fill\"></video>"
});});
webvn.use(function (ui) { ui.lang.create({
    "config": {
        "zh": {
            "Config": "环境设定",
            "Close": "关闭",
            "Text Speed": "文字显示速度",
            "Text Auto": "自动推进速度",
            "Music": "背景乐",
            "Sound": "效果音",
            "Voice": "语音"
        }
    },
    "dialog": {
        "zh": {
            "Q-Save": "快速存档",
            "Q-Load": "快速读档",
            "Load": "读档",
            "Save": "存档",
            "History": "历史",
            "Config": "设置",
            "Title": "标题画面"
        }
    },
    "gallery": {
        "zh": {
            "Gallery": "图片鉴赏",
            "Close": "关闭"
        }
    },
    "menu": {
        "zh": {
            "Start": "开始游戏",
            "Load": "读取存档",
            "Gallery": "图片鉴赏",
            "Music": "音乐鉴赏",
            "Config": "环境设定"
        }
    },
    "music": {
        "zh": {
            "Music": "音乐鉴赏",
            "Close": "关闭",
            "Play": "播放",
            "Pause": "暂停"
        }
    },
    "save": {
        "zh": {
            "Save": "存档",
            "Close": "关闭",
            "Load": "读档",
            "Empty": "空"
        }
    }
});});
webvn.use(function (ui, select, config, storage, canvas) {
    "use strict";
    var uiName = 'gallery',
        exports = ui.create('gallery'),
        $el = exports.$el,
        lang = ui.lang.get(uiName),
        tpl = ui.template.get(uiName);

    var cfg = config.create('uiGallery'),
        cfgPath = cfg.get('path'),
        cfgExtension = cfg.get('extension'),
        cfgFiles = cfg.get('files');

    $el.addClass('fill').html(tpl({
        Gallery: lang.get('Gallery'),
        Close: lang.get('Close')
    }));

    var $container = $el.find('.container'),
        $viewer = $el.find('.viewer'),
        $pagination = $el.find('.pagination');

    var renderer = canvas.renderer,
        asset = storage.createAsset(cfgPath, cfgExtension),
        pageSize = 6,
        pageCount = Math.ceil(cfgFiles.length / pageSize);

    function page(num) {
        var html = '',
            start = (num - 1) * pageSize,
            end = start + pageSize;
        if (end > cfgFiles.length) {
            end = cfgFiles.length;
        }
        for (; start < end; start++) {
            html += '<li><img class="th" src="' + asset.get(cfgFiles[start]) + '"></li>';
        }
        $container.html(html);
    }
    page(1);

    if (pageCount > 1) {
        var html = '';
        for (var i = 0; i < pageCount; i++) {
            html += '<li class="button" data-num="' + (i+1) + '">' + (i+1) + '</li>';
        }
        $pagination.html(html);
    }

    exports.stopPropagation().properties({
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('fadeOut'),
        duration: cfg.get('duration')
    }).events({

        'click .close': function () {
            hide();
        },

        'click li img': function () {
            var $this = select.get(this),
                src = $this.attr('src');
            $viewer.find('img').attr('src', src);
            $viewer.removeClass('hidden').fadeIn(exports.duration);
        },

        'click .pagination li': function () {
            var $this = select.get(this);
            page(Number($this.attr('data-num')));
        },

        'click .viewer': function () {
            var $this = select.get(this);
            $this.fadeOut(exports.duration);
        }

    });

    exports.show = function () {
        renderer.stop();

        exports.fadeIn ? $el.fadeIn(exports.duration) : $el.show();
    };

    var hide = exports.hide = function () {
        renderer.start();

        exports.fadeOut ? $el.fadeOut(exports.duration) : $el.hide();
    };
});
webvn.use(function (ui, select, media, config, storage, util, Class) {
    "use strict";
    var uiName = 'music',
        exports = ui.create(uiName),
        $el = exports.$el,
        lang = ui.lang.get(uiName),
        tpl = ui.template.get(uiName);

    var cfg = config.create('uiMusic'),
        cfgPath = cfg.get('path'),
        cfgExtension = cfg.get('extension');

    $el.addClass('fill').html(tpl({
        Music: lang.get('Music'),
        Close: lang.get('Close')
    }));

    var controller = Class.module(function () {
        var exports = {};

        var music = media.audio.create('music');
        music.asset = storage.createAsset(cfgPath, cfgExtension);
        music.loop = true;
        music.events({

            'timeupdate': function () {
                var percentage = music.curTime / music.duration;
                $progressFill.css('width', $progress.width() * percentage);
            }

        });

        var $progress = $el.find('.progress'),
        $progressFill = $progress.find('span');
        $progress.on('click', function (e) {
            if (!music.isPlaying()) {
                return;
            }
            // OffsetX has to divided by scale
            e = e.originalEvent;
            var x = e.offsetX / ui.scale,
                percentage = x / $progress.width();
            music.currentTime(music.duration * percentage);
        });

        var $container = $el.find('.container'),
            $playBtn = $el.find('.play'),
            $nextBtn = $el.find('.next'),
            $preBtn = $el.find('.previous');

        var files = cfg.get('files'), html = '';
        util.each(files, function (file, index) {
            html += '<li class="num' + index + '" data-num="' + index + '">' + file + '</li>';
        });
        $container.html(html);

        var curNum = -1,
            total = files.length;

        var $all = $el.find('.container li');

        var play = exports.play = function (num) {
            if (num === undefined) {
                if (!music.isLoaded()) {
                    return;
                }
                if (music.isPlaying()) {
                    $playBtn.text('Play');
                    music.pause();
                } else {
                    $playBtn.text('Pause');
                    music.play();
                }
            } else {
                $playBtn.removeClass('disabled').text('Pause');
                $nextBtn.removeClass('disabled');
                $preBtn.removeClass('disabled');
                $all.removeClass('playing');
                curNum = num;
                $el.find('.num' + num).addClass('playing');
                music.load(files[num]);
            }
        };

        exports.next = function () {
            if (curNum < 0) return;
            curNum++;
            if (curNum >= total) curNum = curNum - total;
            play(curNum);
        };

        exports.previous = function () {
            if (curNum < 0) return;
            curNum--;
            if (curNum < 0) curNum = total - 1;
            play(curNum);
        };

        exports.pause = function () {
            $playBtn.text('play');
            music.pause();
        };

        return exports;
    });

    exports.stopPropagation().properties({
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('fadeOut'),
        duration: cfg.get('duration')
    }).events({

        'click .close': function () {
            controller.pause();
            var menu = ui.get('menu');
            menu.playBgm();
            hide();
        },

        'click .container li': function () {
            var $this = select.get(this);
            controller.play($this.attr('data-num'));
        },

        'click .play': function () {
            controller.play();
        },

        'click .next': function () {
            controller.next();
        },

        'click .previous': function () {
            controller.previous();
        }

    });

    exports.show = function () {
        exports.fadeIn ? $el.fadeIn(exports.duration) : $el.show();
    };

    var hide = exports.hide = function () {
        exports.fadeOut ? $el.fadeOut(exports.duration) : $el.hide();
    };
});
webvn.use(function (ui, canvas, config) {
    "use strict";
    var uiName = 'config',
        exports = ui.create(uiName),
        $el = exports.$el,
        lang = ui.lang.get(uiName),
        tpl = ui.template.get(uiName);

    var cfg = config.create('uiConfig');

    $el.addClass('fill').html(tpl({
        Config: lang.get('Config'),
        Close: lang.get('Close'),
        Text_Speed: lang.get('Text Speed'),
        Text_Auto: lang.get('Text Auto'),
        Music: lang.get('Music'),
        Sound: lang.get('Sound'),
        Voice: lang.get('Voice')
    }));

    var renderer = canvas.renderer;

    exports.stopPropagation().properties({
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('fadeOut'),
        duration: cfg.get('duration')
    }).events({

        'click .close': function () {
            hide();
        }

    });

    exports.show = function () {
        renderer.stop();

        exports.fadeIn ? $el.fadeIn(exports.duration) : $el.show();
    };

    var hide = exports.hide = function () {
        renderer.start();

        exports.fadeOut ? $el.fadeOut(exports.duration) : $el.hide();
    };

    return exports;
});
webvn.use(function (ui, config, util, canvas, storage, select, system) {
    "use strict";
    var uiName = 'save',
        exports = ui.create(uiName),
        $el = exports.$el,
        lang = ui.lang.get(uiName),
        tpl = ui.template.get(uiName);

    var cfg = config.create('uiSave'),
        cfgSaveNum = cfg.get('saveNum');

    var global = storage.createLocalStore('global'),
        saves = global.get('saves') || [],
        renderer = canvas.renderer;

    $el.addClass('fill');

    exports.stopPropagation().properties({
        duration: cfg.get('duration'),
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('fadeOut')
    }).events({

        'click .close': function () {
            hide();
        },

        'click .save': function () {
            var $this = select.get(this),
                num = Number($this.data('num')),
                saveName = 'save' + num;

            saves[num] = {
                title: system.title(),
                date: getDateTime()
            };

            global.set('saves', saves);
            storage.save(saveName);
            renderSave();
        },

        'click .load': function () {
            var $this = select.get(this),
                saveName = 'save' + $this.data('num');

            storage.load(saveName);

            exports.hide();
        }

    });

    function getDateTime() {
        var date = new Date;

        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() +
            ' ' + prependZero(date.getHours()) + ':' +
            prependZero(date.getMinutes()) + ':' +
            prependZero(date.getSeconds());
    }

    function prependZero(num) {
        if (num < 10) {
            return '0' + num;
        }

        return num;
    }

    exports.show = function (type) {
        renderer.stop();

        type === 'save' ? renderSave() : renderLoad();

        exports.fadeIn ? $el.fadeIn(exports.duration) : $el.show();
    };

    function renderSave() {
        var i, records = [];

        for (i = 0; i < cfgSaveNum; i++) {
            saves[i] ? records.push(saves[i]) : records.push({
                title: lang.get('Empty'),
                date: ''
            });
        }

        $el.html(tpl({
            Title: lang.get('Save'),
            Close: lang.get('Close'),
            type: 'save',
            records: records
        }));
    }

    function renderLoad() {
        var i, records = [];

        for (i = 0; i < cfgSaveNum; i++) {
            saves[i] ? records.push(saves[i]) : records.push({
                title: lang.get('Empty'),
                date: ''
            });
        }

        $el.html(tpl({
            Title: lang.get('Load'),
            Close: lang.get('Close'),
            type: 'load',
            records: records
        }));
    }

    var hide = exports.hide = function () {
        renderer.start();

        exports.fadeOut ? $el.fadeOut(exports.duration) : $el.hide();
    };
});
/* This ui component is also served as a template.
 * Every other components should be written in the same style.
 */
webvn.use(function (ui, script, media, util, canvas, config, storage) {
    "use strict";
    var uiName = 'menu',
        exports = ui.create(uiName),
        $el = exports.$el,
        lang = ui.lang.get(uiName),
        tpl = ui.template.get(uiName),
        save = storage.create(uiName);

    var cfg = config.create('uiMenu'),
        cfgStartLabel = cfg.get('startLabel');

    $el.addClass('fill').html(tpl({
        'Start': lang.get('Start'),
        'Load': lang.get('Load'),
        'Gallery': lang.get('Gallery'),
        'Music': lang.get('Music'),
        'Config': lang.get('Config')
    }));

    var bgm = media.audio.get('bgm'),
        sysAudio = media.audio.get('sys'),
        renderer = canvas.renderer;

    save.save(function () {
        return {};
    }).load(function () {
        $el.hide();
    });

    exports.stopPropagation().properties({
        bgm: cfg.get('bgm'),
        btnClickSound: cfg.get('btnClkSound'),
        btnHoverSound: cfg.get('btnHoverSound'),
        duration: cfg.get('Duration'),
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('FadeOut')
    }).events({

        'click .start': function () {
            renderer.start();

            if (exports.bgm) bgm.stop();

            if (exports.fadeOut) {
                $el.fadeOut(exports.duration, function () {
                    script.jump(cfgStartLabel);
                });
            } else {
                $el.hide();
                script.jump(cfgStartLabel);
            }
        },

        'click .load': function () {
            ui.get('save').show('load');
        },

        'click .setting': function () {
            ui.get('config').show();
        },

        'click .cg': function () {
            ui.get('gallery').show();
        },

        'click .music': function () {
            if (exports.bgm) bgm.stop();

            ui.get('music').show();
        },

        'mouseover li': function () {
            if (exports.btnHoverSound) sysAudio.load(exports.btnHoverSound);
        },

        'click li': function () {
            if (exports.btnClickSound) sysAudio.load(exports.btnClickSound);
        }

    });

    exports.reset = function () {
        $el.hide();
    };

    exports.show = function () {
        renderer.stop();

        if (exports.bgm) bgm.load(exports.bgm);

        exports.fadeIn ? $el.fadeIn(exports.duration) : $el.show();
    };

    exports.buttons = function (buttons) {
        util.each(buttons, function (value, key) {
            var $e = $el.find('ul li.' + key);

            if (util.isString(value)) {
                $e.text(value);
                return;
            }

            value ? $e.css('display', 'block') : $e.css('display', 'none');
        });
    };

    exports.playBgm = function () {
        if (exports.bgm) bgm.load(exports.bgm);
    };

});
webvn.use(function (ui, canvas, storage, config) {
    "use strict";
    var uiName = 'background',
        exports = ui.create(uiName, 'canvas'),
        $el = exports.$el,
        cvs = exports.getCanvas(),
        save = storage.create(uiName);

    var cfg = config.create('uiBackground'),
        cfgPath = cfg.get('path'),
        cfgExtension = cfg.get('extension');

    $el.addClass('fill');

    var asset = storage.createAsset(cfgPath, cfgExtension),
        image = canvas.createImage(),
        scene = new canvas.Scene(cvs);

    scene.add(image);

    save.save(function () {
        return {};
    }).load(function (value) {
    });

    exports.properties({
        duration: cfg.get('duration'),
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('fadeOut'),
        transition: cfg.get('transition'),
        filter: {
            set: function (val) {
                image.filter = val;
            }
        },
        scaleX: {
            set: function (val) {
                image.scaleX = val;
            }
        },
        scaleY: {
            set: function (val) {
                image.scaleY = val;
            }
        },
        scale: {
            set: function (val) {
                image.scaleX = image.scaleY = val;
            }
        }
    });

    exports.load = function (src) {
        image.transition = exports.transition;
        image.load(asset.get(src), exports.duration);
    };

    exports.position = function (x, y) {
        image.setPosition(x, y);
    };

    exports.animate = function (to) {
        image.animate(to, exports.duration);
    };

    exports.show = function () {
        canvas.renderer.add(scene);

        if ($el.visible()) return;

        exports.fadeIn ? $el.fadeIn(exports.duration) : $el.show();
    };

    exports.hide = function () {
        canvas.renderer.remove(scene);

        exports.fadeOut ? $el.fadeOut(exports.duration) : $el.hide();
    };
});
webvn.use(function (ui, text, media, config, storage, script) {
    "use strict";
    var uiName = 'dialog',
        exports = ui.create(uiName, 'div'),
        $el = exports.$el,
        lang = ui.lang.get(uiName),
        tpl = ui.template.get(uiName),
        save = storage.create(uiName);

    var cfg = config.create('uiDialog'),
        cfgPath = cfg.get('path'),
        cfgExtension = cfg.get('extension');

    $el.addClass('fill').html(tpl({
        Q_Save: lang.get('Q-Save'),
        Q_Load: lang.get('Q-Load'),
        Load: lang.get('Load'),
        Save: lang.get('Save'),
        Config: lang.get('Config'),
        History: lang.get('History'),
        Title: lang.get('Title')
    }));

    var $content = $el.find('.content'),
        $name = $el.find('.name'),
        $face = $el.find('.face'),
        $text = $content.find('.text');

    var asset = storage.createAsset(cfgPath, cfgExtension),
        textAnim = text.createAnim($text),
        voice = media.audio.get('vo');

    save.save(function () {
        return {
            visible: $el.visible(),
            name: $name.html(),
            text: $text.html()
        };
    }).load(function (val) {
        if (val.visible) $el.show();
        $name.html(val.name);
        $text.html(val.text);
    });

    exports.properties({
        textType: cfg.get('textType'),
        textDuration: cfg.get('textDuration'),
        duration: cfg.get('duration'),
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('fadeOut')
    }).events({

        'click .save': function () {
            ui.get('save').show('save');
        },

        'click .load': function () {
            ui.get('save').show('load');
        },

        'click .config': function () {
            ui.get('config').show();
        },

        'click .exit': function () {
            ui.get('menu').show();
        }

    });

    exports.show = function () {
        if ($el.visible()) return;

        exports.fadeIn ? $el.fadeIn(exports.duration) : $el.show();
    };

    exports.face = function(src) {
        !src ? $face.hide() : $face.show().attr('src', asset.get(src));
    };

    exports.hide = function () {
        exports.fadeOut ? $el.fadeOut(exports.duration) : $el.hide();
    };

    exports.name = function (name) {
        $name.html('【' + name + '】');
    };

    exports.text = function (text) {
        textAnim.stopTimer();
        textAnim.type = exports.textType;
        textAnim.duration = exports.textDuration;
        textAnim.load(text);
        script.insertCmd('dialog -sa');
    };

    exports.stopAnim = function () {
        if (textAnim.isStop()) {
            script.play();
        } else {
            textAnim.stop();
        }
    };

    exports.voice = function (src) {
        voice.load(src);
    };

    exports.style = function (name) {
        name === 'big' ? $el.addClass('big') : $el.removeClass('big');
    };

});
webvn.use(function (ui, canvas, util, config, storage) {
    "use strict";
    var uiName = 'figure',
        exports = ui.create(uiName, 'canvas'),
        $el = exports.$el,
        cvs = exports.getCanvas(),
        save = storage.create(uiName);

    var cfg = config.create('uiFigure'),
        cfgPath = cfg.get('path'),
        cfgExtension = cfg.get('extension');

    $el.addClass('fill');

    var asset = storage.createAsset(cfgPath, cfgExtension),
        scene = canvas.createScene(cvs),
        figures = [],
        curFigure;

    curFigure = createFigure(0);

    function createFigure(num) {
        if (figures[num]) {
            return figures[num];
        }

        var figure = figures[num] = canvas.createImage();
        scene.add(figure);

        return figure;
    }

    save.save(function () {
        return {};
    }).load(function (value) {
    });

    exports.properties({
        duration: cfg.get('duration'),
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('fadeOut'),
        transition: cfg.get('transition')
    });

    exports.select = function (num) {
        curFigure = createFigure(num);
    };

    exports.scaleX = function (value) {
        curFigure.scaleX = value;
    };

    exports.scaleY = function (value) {
        curFigure.scaleY = value;
    };

    exports.scale = function (value) {
        curFigure.scaleX = curFigure.scaleY = value;
    };

    exports.alpha = function (value) {
        curFigure.alpha = value;
    };

    exports.filter = function (value) {
        curFigure.filter = value;
    };

    exports.hideFigure = function () {
        curFigure.fadeOut(exports.duration);
    };

    exports.load = function (src) {
        curFigure.transition = exports.transition;
        curFigure.load(asset.get(src), exports.duration);
    };

    exports.position = function (x, y) {
        curFigure.setPosition(x, y);
    };

    exports.show = function () {
        canvas.renderer.add(scene);

        if ($el.visible()) {
            return;
        }
        if (exports.fadeIn) {
            $el.fadeIn(exports.duration);
        } else {
            $el.show();
        }
    };

    exports.hide = function () {
        canvas.renderer.remove(scene);

        exports.fadeOut ? $el.fadeOut(exports.duration) : $el.hide();
    };

    exports.animate = function (to) {
        curFigure.animate(to, exports.duration);
    };



});
webvn.use(function (ui, media, script, config, storage) {
    "use strict";
    var uiName = 'video',
        exports = ui.create('video', 'div'),
        $el = exports.$el,
        tpl = ui.template.get(uiName);

    var cfg = config.create('uiVideo'),
        cfgPath = cfg.get('path'),
        cfgExtension = cfg.get('extension');

    $el.addClass('fill').html(tpl());

    var asset = storage.createAsset(cfgPath, cfgExtension),
        video = media.video.create($el.find('video').get(0));

    exports.stopPropagation().properties({
        clickAction: cfg.get('clickAction'),
        duration: cfg.get('duration'),
        fadeIn: cfg.get('fadeIn'),
        fadeOut: cfg.get('fadeOut')
    }).events({

        'click video': function () {
            switch (exports.clickAction) {
                case 'skip':
                    video.stop();
                    hide();
                    break;
                case 'pause':
                    if (video.isPlaying()) {
                        video.pause();
                    } else {
                        video.play();
                    }
                    break;
            }
        }

    });


    video.events({

        ended: function () {
            hide();
        }

    });

    exports.play = function () {
        video.play();
    };

    exports.show = function () {
        if ($el.visible()) return;

        exports.fadeIn ? $el.fadeIn(exports.duration) : $el.show();

        script.pause();
    };

    function hide () {
        if (exports.fadeOut) {
            $el.fadeOut(exports.duration, function () {
                script.resume();
            });
        } else {
            $el.hide();
            script.resume();
        }
    }

    exports.src = function (src) {
        video.load(asset.get(src));
    };

    exports.stop = function () {
        video.stop();
    };

});