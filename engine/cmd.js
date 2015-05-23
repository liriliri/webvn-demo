webvn.use(function (script, ui) {

    var menu = ui.get('menu');
    /**
     * Menu Command
     * @class webvn.cmd.MenuCommand
     * @extends webvn.script.Command
     */
    var Command = script.Command.extend({
        constructor: function MenuCommand() {
            this.callSuper('menu');
        },
        /**
         * @memberof webvn.cmd.MenuCommand
         * @property {String} bgm{bgm} background music
         */
        options: {
            'bgm': {
                type: 'String',
                shortHand: 'bgm'
            },
            'btn': {
                type: 'Json',
                shortHand: 'btn'
            },
            'btnHoverSound': {
                type: 'String',
                shortHand: 'bhs'
            },
            'btnClickSound': {
                type: 'String',
                shortHand: 'bcs'
            },
            'display': {
                type: 'Boolean',
                shortHand: 'd'
            },
            'duration': {
                type: 'Number',
                shortHand: 'du'
            },
            'fadeIn': {
                type: 'Boolean',
                shortHand: 'fi'
            },
            'fadeOut': {
                type: 'Boolean',
                shortHand: 'fo'
            }
        },
        orders: [
            'bgm',
            'btn',
            'btnClickSound',
            'btnHoverSound',
            'duration',
            'fadeIn',
            'fadeOut',
            'display'
        ],
        bgm: function (value) {
            "use strict";
            menu.bgm = value;
        },
        btn: function (value) {
            "use strict";
            menu.buttons(value);
        },
        btnClickSound: function (value) {
            "use strict";
            menu.btnClickSound = value;
        },
        btnHoverSound: function (value) {
            "use strict";
            menu.btnHoverSound = value;
        },
        duration: function (value) {
            "use strict";
            menu.duration = value;
        },
        fadeIn: function (value) {
            "use strict";
            menu.fadeIn = value;
        },
        fadeOut: function (value) {
            "use strict";
            menu.fadeOut = value;
        },
        display: function (value) {
            "use strict";
            if (value) {
                menu.show();
            } else {
                menu.hide();
            }
        }
    });
    new Command;
});
webvn.use(function (script, ui) {
    var video = ui.get('video');

    /**
     * Video Command
     * @class webvn.cmd.VideoCommand
     * @extends webvn.script.Command
     */
    script.createCommand({

        constructor: function VideoCommand() {
            this.callSuper('video');
        },

        /**
         * @memberof webvn.cmd.VideoCommand
         * @property {boolean} display(d) display or not
         * @property {string} click(c) stop or pause when clicked
         * @property {boolean} play(pl) play or pause
         * @property {string} src(s) load video and play
         */
        options: {
            display: {
                type: 'Boolean',
                shortHand: 'd'
            },
            fadeIn: {
                type: 'String',
                shortHand: 'fi'
            },
            fadeOut: {
                type: 'String',
                shortHand: 'fo'
            },
            duration: {
                type: 'Number',
                shortHand: 'du'
            },
            click: {
                type: 'String',
                shortHand: 'c'
            },
            play: {
                type: 'Boolean',
                shortHand: 'p'
            },
            src: {
                type: 'String',
                shortHand: 's'
            }
        },

        orders: [
            'duration',
            'fadeIn',
            'fadeOut',
            'display',
            'src',
            'play',
            'click'
        ],

        fadeIn: function (value) {
            video.fadeIn = value;
        },

        fadeOut: function (value) {
            video.fadeOut = value;
        },

        display: function (value) {
            if (value) {
                video.show();
            }
        },

        duration: function (value) {
            video.duration = value;
        },

        src: function (value) {
            video.src(value);
        },

        play: function (value) {
            if (value) {
                video.play();
            } else {
                video.stop();
            }
        },

        click: function (value) {
            video.clickAction = value;
        }

    });
});
webvn.use(function (script, media) {
    var bgm = media.audio.get('bgm');

    script.createCommand({

        constructor: function BgmCommand() {
            this.callSuper('bgm');
        },

        options: {
            duration: {
                type: 'number',
                shortHand: 'du'
            },
            fadeIn: {
                type: 'boolean',
                shortHand: 'fi'
            },
            fadeOut: {
                type: 'boolean',
                shortHand: 'fo'
            },
            loop: {
                type: 'boolean',
                shortHand: 'l'
            },
            play: {
                type: 'boolean',
                shortHand: 'p'
            },
            src: {
                type: 'string',
                shortHand: 's'
            },
            stop: {
                type: 'boolean',
                shortHand: 'st'
            },
            volume: {
                type: 'number',
                shortHand: 'v'
            },
            playNext: {
                type: 'boolean',
                shortHand: 'pn',
                defaultValue: true
            }
        },

        orders: [
            'fadeIn',
            'fadeOut',
            'duration',
            'play',
            'loop',
            'stop',
            'src',
            'playNext'
        ],

        fadeIn: function (value) {
            bgm.fadeIn = value;
        },

        fadeOut: function (value) {
            bgm.fadeOut = value;
        },

        duration: function (value) {
            bgm.duration = value;
        },

        play: function (value) {
            value ? bgm.play() : bgm.pause();
        },

        loop: function (value) {
            bgm.loop(value);
        },

        stop: function (value) {
            value && bgm.stop();
        },

        src: function (value) {
            bgm.load(value);
        }

    });

    /**
     * Se Command
     * @class webvn.cmd.SeCommand
     * @extends webvn.script.Command
     */
    var se = media.audio.get('se');
    script.createCommand({

        constructor: function SeCommand() {
            this.callSuper('se');
        },

        /**
         * @memberof webvn.cmd.SeCommand
         * @property {Boolean} loop(l) loop bgm or not
         * @property {String} src(s) load bgm and play
         */
        options: {
            loop: {
                type: 'Boolean',
                shortHand: 'l'
            },
            src: {
                type: 'String',
                shortHand: 's'
            }
        },

        orders: [
            'src',
            'loop'
        ],

        src: function (value) {
            se.load(value);
        },

        loop: function (value) {
            se.loop(value);
        }

    });

    var voice = media.audio.get('voice');
    /**
     * Voice Command
     * @class webvn.cmd.VoiceCommand
     * @extends webvn.script.Command
     */
    script.createCommand({

        constructor: function VoiceCommand() {
            this.callSuper('voice');
        },

        /**
         * @memberof webvn.cmd.VoiceCommand
         * @property {Boolean} loop(l) loop bgm or not
         * @property {String} src(s) load bgm and play
         */
        options: {
            loop: {
                type: 'Boolean',
                shortHand: 'l'
            },
            src: {
                type: 'String',
                shortHand: 's'
            }
        },

        orders: [
            'src',
            'loop'
        ],

        src: function (value) {
            voice.load(value);
        },

        loop: function (value) {
            voice.loop(value);
        }

    });

});

webvn.use(function (script, ui) {
    var background = ui.get('background');

    /**
     * Background Command
     * @class webvn.cmd.BgCommand
     * @extends webvn.script.Command
     */
    script.createCommand({

        constructor: function BgCommand() {
            this.callSuper('bg');
        },

        options: {
            fadeIn: {
                type: 'Boolean',
                shortHand: 'fi'
            },
            fadeOut: {
                type: 'Boolean',
                shortHand: 'fo'
            },
            filter: {
                type: 'Json',
                shortHand: 'f'
            },
            position: {
                type: 'String',
                shortHand: 'pos'
            },
            x: {
                type: 'Number',
                shortHand: 'x'
            },
            y: {
                type: 'Number',
                shortHand: 'y'
            },
            animate: {
                type: 'Json',
                shortHand: 'a'
            },
            scaleX: {
                type: 'Number',
                shortHand: 'sx'
            },
            scaleY: {
                type: 'Number',
                shortHand: 'sy'
            },
            scale: {
                type: 'Number',
                shortHand: 'sc'
            },
            display: {
                type: 'Boolean',
                shortHand: 'd'
            },
            duration: {
                type: 'Number',
                shortHand: 'du'
            },
            transition: {
                type: 'String',
                shortHand: 't'
            },
            src: {
                type: 'String',
                shortHand: 's'
            },
            playNext: {
                type: 'Boolean',
                shortHand: 'pn',
                defaultValue: true
            },
            waitTransition: {
                type: 'Boolean',
                shortHand: 'wt'
            }
        },

        orders: [
            'x',
            'y',
            'fadeIn',
            'fadeOut',
            'filter',
            'position',
            'duration',
            'animate',
            'scale',
            'scaleX',
            'scaleY',
            'transition',
            'display',
            'src',
            'waitTransition',
            'playNext'
        ],

        waitTransition: function (value, values) {
            if (values.src) {
                if (values.playNext) {
                    value && script.wait(background.duration);
                } else {
                    value && script.pause(background.duration);
                }
            }
        },

        fadeIn: function (value) {
            background.fadeIn = value;
        },

        fadeOut: function (value) {
            background.fadeOut = value;
        },

        filter: function (val) {
            background.filter = val;
        },

        position: function (value) {
            background.position(value);
        },

        x: function (value) {
            background.position(value);
        },

        y: function (value) {
            background.position(null, value);
        },

        animate: function (value) {
            background.animate(value);
        },

        scale: function (val) {
            background.scale = val;
        },

        scaleX: function (val) {
            background.scaleX = val;
        },

        scaleY: function (val) {
            background.scaleY = val;
        },

        display: function (value) {
            value ? background.show() : background.hide();
        },

        duration: function (value) {
            background.duration = value;
        },

        transition: function (value) {
            background.transition = value;
        },

        src: function (value) {
            background.load(value);
        }

    });

});
webvn.use(function (script, ui) {
    var figure = ui.get('figure');

    script.createCommand({

        constructor: function FigureCommand() {
            this.callSuper('fg');
        },

        options: {
            filter: {
                type: 'Json',
                shortHand: 'f'
            },
            hide: {
                type: 'Boolean',
                shortHand: 'h'
            },
            scaleX: {
                type: 'Number',
                shortHand: 'sx'
            },
            scaleY: {
                type: 'Number',
                shortHand: 'sy'
            },
            scale: {
                type: 'Number',
                shortHand: 'sc'
            },
            fadeIn: {
                type: 'Boolean',
                shortHand: 'fi'
            },
            fadeOut: {
                type: 'Boolean',
                shortHand: 'fo'
            },
            display: {
                type: 'Boolean',
                shortHand: 'd'
            },
            alpha: {
                type: 'Number',
                shortHand: 'al'
            },
            duration: {
                type: 'Number',
                shortHand: 'du'
            },
            select: {
                type: 'Number',
                shortHand: 'sel'
            },
            transition: {
                type: 'String',
                shortHand: 't'
            },
            src: {
                type: 'String',
                shortHand: 's'
            },
            x: {
                type: 'Number',
                shortHand: 'x'
            },
            y: {
                type: 'Number',
                shortHand: 'y'
            },
            position: {
                type: 'String',
                shortHand: 'pos'
            },
            animate: {
                type: 'Json',
                shortHand: 'a'
            },
            playNext: {
                type: 'Boolean',
                shortHand: 'pn',
                defaultValue: true
            }
        },

        orders: [
            'fadeIn',
            'fadeOut',
            'filter',
            'duration',
            'scaleX',
            'scaleY',
            'scale',
            'alpha',
            'hide',
            'display',
            'select',
            'transition',
            'src',
            'x',
            'y',
            'position',
            'animate',
            'playNext'
        ],

        hide: function (value) {
            if (value) {
                figure.hideFigure();
            }
        },

        filter: function (value) {
            figure.filter(value);
        },

        scaleX: function (value) {
            figure.scaleX(value);
        },

        scaleY: function (value) {
            figure.scaleY(value);
        },

        scale: function (value) {
            figure.scale(value);
        },

        fadeIn: function (value) {
            figure.fadeIn = value;
        },

        fadeOut: function (value) {
            figure.fadeOut = value;
        },

        alpha: function (value) {
            figure.alpha(value);
        },

        duration: function (value) {
            figure.duration = value;
        },

        select: function (value) {
            figure.select(value);
        },

        animate: function (value) {
            figure.animate(value);
        },

        transition: function (value) {
            figure.transition = value;
        },

        display: function (value) {
            if (value) {
                figure.show();
            } else {
                figure.hide();
            }
        },

        src: function (value) {
            figure.load(value);
        },

        x: function (value) {
            figure.position(value);
        },

        y: function (value) {
            figure.position(null, value);
        },

        position: function (value) {
            figure.position(value);
        }
    });

});
webvn.use(function (script, log) {

    var type = 'info';

    script.createCommand({

        constructor: function FigureCommand() {
            this.callSuper('log');
        },

        options: {
            type: {
                type: 'String',
                shortHand: 't'
            },
            message: {
                type: 'String',
                shortHand: 'm'
            },
            playNext: {
                type: 'Boolean',
                shortHand: 'pn',
                defaultValue: true
            }
        },

        orders: [
            'type',
            'message',
            'playNext'
        ],

        type: function (value) {
            type = value;
        },

        message: function (value) {
            switch (type) {
                case 'info':
                    log.info(value);
                    break;
                case 'warn':
                    log.warn(value);
                    break;
                case 'error':
                    log.error(value);
                    break;
            }
        }

    });

});
webvn.use(function (script, ui) {
    var dialog = ui.get('dialog');

    script.createCommand({

        constructor: function DialogCommand() {
            this.callSuper('dialog');
        },

        options: {
            display: {
                type: 'Boolean',
                shortHand: 'd'
            },
            style: {
                type: 'String',
                shortHand: 's'
            },
            face: {
                type: 'String',
                shortHand: 'f'
            },
            duration: {
                type: 'Number',
                shortHand: 'du'
            },
            fadeIn: {
                type: 'Boolean',
                shortHand: 'fi'
            },
            fadeOut: {
                type: 'Boolean',
                shortHand: 'fo'
            },
            name: {
                type: 'String',
                shortHand: 'n'
            },
            text: {
                type: 'String',
                shortHand: 't'
            },
            textDuration: {
                type: 'Number',
                shortHand: 'td'
            },
            textType: {
                type: 'String',
                shortHand: 'tt'
            },
            voice: {
                type: 'String',
                shortHand: 'v'
            },
            stopAnimation: {
                type: 'boolean',
                shortHand: 'sa'
            },
            playNext: {
                type: 'Boolean',
                shortHand: 'pn'
            }
        },

        orders: [
            'fadeIn',
            'fadeOut',
            'style',
            'duration',
            'textType',
            'textDuration',
            'face',
            'display',
            'name',
            'text',
            'voice',
            'stopAnimation',
            'playNext'
        ],

        stopAnimation: function (value) {
            value && dialog.stopAnim();
        },

        face: function (value) {
            dialog.face(value);
        },

        style: function (value) {
            dialog.style(value);
        },

        fadeIn: function (value) {
            dialog.fadeIn = value;
        },

        fadeOut: function (value) {
            dialog.fadeOut = value;
        },

        duration: function (value) {
            dialog.duration = value;
        },

        textType: function (value) {
            dialog.textType = value;
        },

        textDuration: function (value) {
            dialog.textDuration = value;
        },

        display: function (value) {
            value ? dialog.show() : dialog.hide();
        },

        name: function (value) {
            dialog.name(value);
        },

        text: function (value) {
            dialog.text(value);
        },

        voice: function (value) {
            dialog.voice(value);
        }

    });
});
webvn.use(function (script, log, system) {

    var alias = script.alias;

    script.createCommand({

        constructor: function AliasCommand() {
            this.callSuper('alias');
        },

        options: {
            name: {
                type: 'String',
                shortHand: 'n'
            },
            value: {
                type: 'String',
                shortHand: 'v'
            },
            playNext: {
                type: 'Boolean',
                shortHand: 'pn',
                defaultValue: true
            }
        },

        orders: [
            'name',
            'playNext'
        ],

        name: function (value, values) {
            if (values.value) {
                alias.create(value, values.value);
            } else {
                log.warn('Alias value must be set');
            }
        }

    });

    script.createCommand({

        constructor: function ScriptCommand() {
            this.callSuper('script');
        },

        options: {
            jump: {
                type: 'String',
                shortHand: 'j'
            }
        },

        orders: [
            'jump'
        ],

        jump: function (value) {
            script.jump(value);
        }

    });

    script.createCommand({

        constructor: function SystemCommand() {
            this.callSuper('system');
        },

        options: {
            title: {
                type: 'String',
                shortHand: 't'
            },
            playNext: {
                type: 'Boolean',
                shortHand: 'pn',
                defaultValue: true
            }
        },

        orders: [
            'title',
            'playNext'
        ],

        title: function (value) {
            system.title(value);
        }

    });

});