webvn.use(["ui"], function (ui) { ui.createTemplate({
    "cg": "<div class=\"title\">CG鉴赏</div>\r\n<ul class=\"container\">\r\n    <li>\r\n        <img class=\"th\" src=\"/asset/test/cg1.bmp\">\r\n    </li>\r\n    <li>\r\n        <img class=\"th\" src=\"/asset/test/cg2.bmp\">\r\n    </li>\r\n    <li>\r\n        <img class=\"th\" src=\"/asset/test/cg3.bmp\">\r\n    </li>\r\n    <li>\r\n        <img class=\"th\" src=\"/asset/test/cg4.bmp\">\r\n    </li>\r\n    <li>\r\n        <img class=\"th\" src=\"/asset/test/cg5.bmp\">\r\n    </li>\r\n    <li>\r\n        <img class=\"th\" src=\"/asset/test/cg6.bmp\">\r\n    </li>\r\n</ul>\r\n<div class=\"close button\">关闭</div>\r\n<div class=\"viewer fill hidden\">\r\n    <img src=\"\" />\r\n</div>\r\n",
    "dialog": "<div class=\"name\"></div>\r\n<div class=\"content\">\r\n    <img class=\"face\" src=\"\"/>\r\n    <span class=\"text\"></span>\r\n</div>",
    "menu": "<ul>\r\n    <li class=\"start\">开始游戏</li>\r\n    <li class=\"load\">读取存档</li>\r\n    <li class=\"cg\">图像鉴赏</li>\r\n    <li class=\"music\">音乐鉴赏</li>\r\n    <li class=\"setting\">环境设定</li>\r\n</ul>",
    "music": "<div class=\"title\">音乐鉴赏</div>\r\n<ul class=\"container\">\r\n    <li data-src=\"asset/bgm/bgm1.ogg\">Bgm1</li>\r\n    <li data-src=\"asset/bgm/bgm2.ogg\">Bgm2</li>\r\n</ul>\r\n<div class=\"progress\">\r\n    <span></span>\r\n</div>\r\n<div class=\"close button\">关闭</div>",
    "setting": "<div class=\"title\">环境设定</div>\r\n<ul class=\"container\">\r\n    <li>\r\n        <label>文字显示速度</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label>自动推进速度</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label>背景音乐音量</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label>效果音量</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n    <li>\r\n        <label>语音音量</label>\r\n        <input class=\"range-slider\" type=\"range\">\r\n    </li>\r\n</ul>\r\n<div class=\"close button\">关闭</div>"
});});
webvn.use(['ui', 'select'],
    function (ui, select) {
        "use strict";
        var exports = ui.create('cg', 'div'),
            $el = exports.$el;
        var tpl = ui.getTemplate('cg');
        exports.body(tpl);

        $el.addClass('fill');

        var $viewer = $el.find('.viewer');
        $viewer.on('click', function () {
            var $this = select.get(this);
            $this.fadeOut(300);
        });

        exports.event({
            'click .close': function () {
                hide();
            },
            'click li img': function () {
                var $this = select.get(this),
                    src = $this.attr('src');
                $viewer.find('img').attr('src', src);
                $viewer.removeClass('hidden').fadeIn(300);
            }
        });

        exports.show = function () {
            $el.fadeIn(300);
        };

        var hide = exports.hide = function () {
            $el.fadeOut(300);
        };
    });
webvn.use(['ui', 'select', 'media'],
    function (ui, select, media) {
        "use strict";
        var exports = ui.create('music'),
            $el = exports.$el;
        var tpl = ui.getTemplate('music');
        exports.body(tpl);
        $el.addClass('fill');

        var $progress = $el.find('.progress'),
            $progressFill = $progress.find('span');

        var music = media.createAudio('music');
        music.loop(true);
        music.event({
            'timeupdate': function () {
                var percentage = music.currentTime() / music.duration;
                $progressFill.css('width', $progress.width() * percentage);
            }
        });

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

        exports.event({
            'click .close': function () {
                music.stop();
                $el.find('li').removeClass('playing');
                var menu = ui.get('menu');
                menu.playBgm();
                hide();
            },
            'click li': function () {
                var $this = select.get(this),
                    src = $this.attr('data-src');
                $el.find('li').removeClass('playing');
                $this.addClass('playing');
                music.load(src);
            }
        });

        exports.show = function () {
            $el.fadeIn(300);
        };

        var hide = exports.hide = function () {
            $el.fadeOut(300);
        };
    });
webvn.use(['ui'], function (ui) {
    "use strict";
    var exports = ui.create('setting'),
        $el = exports.$el;
    $el.addClass('fill');
    var tpl = ui.getTemplate('setting');
    exports.body(tpl);

    exports.event({
        'click .close': function () {
            hide();
        }
    });

    exports.show = function () {
        $el.fadeIn(300);
    };

    var hide = exports.hide = function () {
        $el.fadeOut(300);
    };

    return exports;
});
webvn.use(['ui', 'script', 'media', 'util'],
    function (ui, script, media, util) {
        "use strict";
        /**
         * @class webvn.ui.Menu
         */
        var exports = ui.create('menu', 'div');

        // Properties
        exports.bgm = null;
        exports.btnClickSound = null;
        exports.btnHoverSound = null;
        exports.duration = 1000;
        exports.fadeIn = true;
        exports.fadeOut = true;

        var bgm = media.createAudio('bgm'),
            sysAudio = media.createAudio('sys');

        var $el = exports.$el;
        $el.addClass('fill');

        var tpl = ui.getTemplate('menu');
        exports.body(tpl);

        var cg = ui.get('cg'),
            music = ui.get('music'),
            setting = ui.get('setting');

        exports.event({
            'click .start': function () {
                if (exports.bgm) {
                    bgm.stop();
                }
                if (exports.fadeOut) {
                    $el.fadeOut(exports.duration, function () {
                        script.resume();
                    });
                } else {
                    $el.hide();
                    script.resume();
                }
            },
            'click .load': function () {
                console.log('Load game!');
            },
            'click .setting': function () {
                setting.show();
            },
            'click .cg': function () {
                cg.show();
            },
            'click .music': function () {
                if (exports.bgm) {
                    bgm.stop();
                }
                music.show();
            },
            // Btn sound
            'mouseover li': function () {
                if (exports.btnHoverSound) {
                    sysAudio.load(exports.btnHoverSound);
                }
            },
            'click li': function () {
                if (exports.btnClickSound) {
                    sysAudio.load(exports.btnClickSound);
                }
            }
        });

        /**
         * Show Menu
         * @method webvn.ui.Menu#show
         */
        exports.show = function () {
            script.pause();
            if (exports.bgm) {
                bgm.load(exports.bgm);
            }
            if (exports.fadeIn) {
                $el.fadeIn(exports.duration);
            } else {
                $el.show();
            }
        };

        /**
         * Decide which button should be displayed.
         * @method webvn.ui.Menu#btn
         * @param {object} buttons
         */
        exports.btn = function (buttons) {
            util.each(buttons, function (value, key) {
                var $e = $el.find('ul li.' + key);
                if (value === true) {
                    $e.css('display', 'block');
                } else if (value === false) {
                    $e.css('display', 'none');
                } else if (util.isString(value)) {
                    $e.text(value);
                }
            });
        };

        exports.playBgm = function () {
            if (exports.bgm) {
                bgm.load(exports.bgm);
            }
        };

    });
webvn.use(['ui', 'canvas', 'storage', 'config'], function (ui, canvas, storage, config) {
    "use strict";
    var exports = ui.create('background', 'canvas');

    var conf = config.create('uiBackground');

    var asset = storage.createAsset(conf.get('path'), conf.get('extension'));

    var $el = exports.$el;
    $el.addClass('fill');

    var image = new canvas.ImageEntity(),
        scene = new canvas.Scene(exports.getCanvas());

    scene.add(image);
    canvas.renderer.add(scene);

    exports.duration = conf.get('duration');
    exports.fadeIn = conf.get('fadeIn');
    exports.fadeOut = conf.get('fadeOut');
    exports.transition = conf.get('transition');

    exports.load = function (src) {
        image.transition = exports.transition;
        image.load(asset.get(src), exports.duration);
    };

    exports.show = function () {
        if (exports.fadeIn) {
            $el.fadeIn(exports.duration);
        } else {
            $el.show();
        }
    };

    exports.hide = function () {
        if (exports.fadeOut) {
            $el.fadeOut(exports.duration);
        } else {
            $el.hide();
        }
    };

    var save = storage.create('background');
    save.save(function (value) {
        // Save something here
    }).load(function (value) {
        // Restore something here
    });

});
// UI component dialog

webvn.use(['ui', 'text', 'media'],
    function (ui, text, media) {

        var exports = ui.create('dialog', 'div');

        exports.textType = 'fadeIn';
        exports.textDuration = 50;
        exports.duration = 200;
        exports.fadeIn = true;
        exports.fadeOut = true;

        var $el = exports.$el;
        $el.addClass('fill');

        var tpl = ui.getTemplate('dialog');
        exports.body(tpl);

        var $content = $el.find('.content'),
            $name = $el.find('.name'),
            $text = $content.find('.text');

        exports.show = function () {

            if (exports.fadeIn) {
                $el.fadeIn(exports.duration);
            } else {
                $el.show();
            }

        };

        exports.hide = function () {

            if (exports.fadeOut) {
                $el.fadeOut(exports.duration);
            } else {
                $el.hide();
            }

        };

        exports.name = function (name) {

            $name.html('【' + name + '】');

        };

        var textAnim = text.createAnim($text);
        exports.text = function (text) {

            textAnim.type = exports.textType;
            textAnim.duration = exports.textDuration;
            textAnim.load(text);

        };

        var voice = media.createAudio('voice');
        exports.voice = function (voiceSouce) {

            voice.load(voiceSouce);

        };

    });
webvn.use(['ui', 'canvas', 'util', 'config', 'storage'], function (ui, canvas, util, config, storage) {
    "use strict";
    var exports = ui.create('figure', 'canvas');

    var conf = config.create('uiFigure');

    var asset = storage.createAsset(conf.get('path'), conf.get('extension'));

    var $el = exports.$el;
    $el.addClass('fill');

    var scene = canvas.createScene(exports.getCanvas());
    canvas.renderer.add(scene);

    var figures = [],
        curFigure;

    curFigure = createFigure(0);

    function createFigure(num) {
        if (figures[num]) {
            return figures[num];
        }

        var figure = figures[num] = new canvas.ImageEntity();
        scene.add(figure);

        return figure;
    }

    exports.duration = conf.get('duration');
    exports.fadeIn = conf.get('fadeIn');
    exports.fadeOut = conf.get('fadeOut');
    exports.transition = conf.get('transition');

    exports.select = function (num) {
        curFigure = createFigure(num);
    };

    exports.load = function (src) {
        curFigure.transition = exports.transition;
        curFigure.load(asset.get(src), exports.duration);
    };

    exports.position = function (x, y) {
        curFigure.setPosition(x, y);
    };

    exports.show = function () {
        if (exports.fadeIn) {
            $el.fadeIn(exports.duration);
        } else {
            $el.show();
        }
    };

    exports.hide = function () {
        if (exports.fadeOut) {
            $el.fadeOut(exports.duration);
        } else {
            $el.hide();
        }
    };

    var save = storage.create('figure');
    save.save(function (value) {
        // Save something here
    }).load(function (value) {
        // Restore something here
    });

});
webvn.use(['ui', 'media', 'script', 'config', 'storage'], function (ui, media, script, config, storage) {

    var conf = config.create('uiVideo');
    var asset = storage.createAsset(conf.get('path'), conf.get('extension'));

    var vid = ui.create('video', 'div'),
        clickAction = 'stop',
        $el = vid.$el;
    
    var tpl = '<video class="video fill"></video>';

    vid.body(tpl);


    var video = media.createVideo($el.find('.video').get(0));

    /* Set action when video is clicked
     * Type listed as below:
     * stop: stop playing video and fade out the video
     * pause: pause the video and play again when clicked again
     */
    vid.clickAction = function (action) {

        clickAction = action;

    };

    vid.play = function () {

        video.play();

    };

    vid.show = function () {

        $el.show();
        script.pause();

    };

    vid.src = function (src) {
        video.load(asset.get(src));
    };

    vid.stop = function () {

        video.stop();

    };

    video.event({
        'ended': function () {
            // When the video is ended, execute the next command
            $el.fadeOut(300, function () {

                script.resume();

            });
        }
    });

    vid.event({
        'click .video': function () {

            switch (clickAction) {
                case 'stop': {
                    $el.fadeOut(300, function () {

                        video.stop();
                        script.resume();

                    });
                    break;
                }
                case 'pause': {
                    if (video.isPlaying()) {
                        video.pause();
                    } else {
                        video.play();
                    }
                    break;
                }
                default:
                    break;
            }

        }
    });

});
// Particle ui component

webvn.use(['ui', 'canvas'], function (ui, canvas) {

var particle = ui.create('particle', 'canvas'),
    $el = particle.$el;

$el.addClass('fill');

var emitter = new canvas.Emitter(particle.getCanvas());

particle.show = function () {

    canvas.renderer.add(emitter);
    $el.fadeIn();

};

particle.hide = function () {

    $el.fadeOut(function () {

        canvas.renderer.remove(emitter);

    });

};

// Set the predefined type
particle.type = function (name) {

    emitter.reConfigure(name);

};

});