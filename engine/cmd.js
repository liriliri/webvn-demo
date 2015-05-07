webvn.use(['script', 'ui'],
    function (script, ui) {

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
                menu.btn(value);
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
webvn.use(['script', 'ui'],
    function (script, ui) {
        var video = ui.get('video');
        /**
         * Video Command
         * @class webvn.cmd.VideoCommand
         * @extends webvn.script.Command
         */
        var Command = script.Command.extend({
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
                click: {
                    type: 'String',
                    shortHand: 'c'
                },
                play: {
                    type: 'Boolean',
                    shortHand: 'pl'
                },
                src: {
                    type: 'String',
                    shortHand: 's'
                }
            },
            orders: [
                'display',
                'src',
                'play',
                'click'
            ],
            display: function (value) {
                "use strict";
                if (value) {
                    video.show();
                } else {
                    video.hide();
                }
            },
            src: function (value) {
                "use strict";
                video.src(value);
            },
            play: function (value) {
                "use strict";
                if (value) {
                    video.play();
                } else {
                    video.stop();
                }
            },
            click: function (value) {
                "use strict";
                video.clickAction(value);
            }
        });
        new Command;
    });
webvn.use(['script', 'media'], function (script, media) {
    // Background music
    var bgm = media.getAudio('bgm');
    /**
     * Bgm Command
     * @class webvn.cmd.BgmCommand
     * @extends webvn.script.Command
     */
    var BgmCommand = script.Command.extend({
        constructor: function BgmCommand() {
            this.callSuper('bgm');
        },
        /**
         * @memberof webvn.cmd.BgmCommand
         * @property {number} duration(du) duration of fadein and fadeout
         * @property {boolean} fadeIn(fi) fade in bgm or not
         * @property {boolean} fadeOut(fo) fade out bgm or not
         * @property {boolean} loop(l) loop bgm or not
         * @property {boolean} play(p) play bgm or pause bgm
         * @property {string} src(s) load bgm and play
         * @property {boolean} stop(st) stop bgm
         * @property {number} volume(v) set volume of bgm
         */
        options: {
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
            loop: {
                type: 'Boolean',
                shortHand: 'l'
            },
            play: {
                type: 'Boolean',
                shortHand: 'p'
            },
            src: {
                type: 'String',
                shortHand: 's'
            },
            stop: {
                type: 'Boolean',
                shortHand: 'st'
            },
            volume: {
                type: 'Number',
                shortHand: 'v'
            }
        },
        orders: [
            'fadeIn',
            'fadeOut',
            'duration',
            'play',
            'loop',
            'stop',
            'src'
        ],
        fadeIn: function (value) {
            "use strict";
            bgm.fadeIn = value;
        },
        fadeOut: function (value) {
            "use strict";
            bgm.fadeOut = value;
        },
        duration: function (value) {
            "use strict";
            bgm.duration = value;
        },
        play: function (value) {
            "use strict";
            if (value) {
                bgm.play();
            } else {
                bgm.pause();
            }
        },
        loop: function (value) {
            "use strict";
            bgm.loop(value);
        },
        stop: function (value) {
            "use strict";
            if (value) {
                bgm.stop();
            }
        },
        src: function (value) {
            "use strict";
            bgm.load(value);
        }
    });
    new BgmCommand;

    /**
     * Se Command
     * @class webvn.cmd.SeCommand
     * @extends webvn.script.Command
     */
    // Sound Effect
    var se = media.getAudio('se');
    var SeCommand = script.Command.extend({
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
            "use strict";
            se.load(value);
        },
        loop: function (value) {
            "use strict";
            se.loop(value);
        }
    });
    new SeCommand;

    // Voice
    var voice = media.getAudio('voice');
    /**
     * Voice Command
     * @class webvn.cmd.VoiceCommand
     * @extends webvn.script.Command
     */
    var VoiceCommand = script.Command.extend({
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
            "use strict";
            voice.load(value);
        },
        loop: function (value) {
            "use strict";
            voice.loop(value);
        }
    });
    new VoiceCommand;

});

webvn.use(['script', 'ui'], function (script, ui) {
    var background = ui.get('background');

    /**
     * Background Command
     * @class webvn.cmd.BgCommand
     * @extends webvn.script.Command
     */
    var Command = script.Command.extend({

        constructor: function BgCommand() {
            this.callSuper('bg');
        },

        options: {
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
            }
        },

        orders: [
            'duration',
            'transition',
            'display',
            'src'
        ],

        display: function (value) {
            if (value) {
                background.show();
            } else {
                background.hide();
            }
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

    new Command;
});
webvn.use(['script', 'ui'],
    function (script, ui) {

        var particle = ui.get('particle');

        var Command = script.Command.extend({
            constructor: function ParticleCommand() {
                this.callSuper('particle');
            },
            options: {
                display: {
                    type: 'Boolean',
                    shortHand: 'd'
                },
                type: {
                    type: 'String',
                    shortHand: 't'
                }
            },
            orders: [
                'display',
                'type'
            ],
            display: function (value) {
                "use strict";
                if (value) {
                    particle.show();
                } else {
                    particle.hide();
                }
            },
            type: function (value) {
                "use strict";
                particle.type(value);
            }
        });
        new Command;
    });
webvn.use(['script', 'ui'], function (script, ui) {
    var figure = ui.get('figure');

    var Command = script.Command.extend({

        constructor: function FigureCommand() {
            this.callSuper('fg');
        },

        options: {
            display: {
                type: 'Boolean',
                shortHand: 'd'
            },
            select: {
                type: 'Number',
                shortHand: 'sel'
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
            }
        },

        orders: [
            'select',
            'display',
            'src',
            'x',
            'y',
            'position'
        ],

        select: function (value) {
            "use strict";
            figure.select(value);
        },

        display: function (value) {
            "use strict";
            if (value) {
                figure.show();
            } else {
                figure.hide();
            }
        },

        src: function (value) {
            "use strict";
            figure.load(value);
        },

        x: function (value) {
            "use strict";
            figure.position(value);
        },

        y: function (value) {
            "use strict";
            figure.position(null, value);
        },

        position: function (value) {
            "use strict";
            figure.position(value);
        }
    });

    new Command;

});
webvn.use(['script', 'ui'],
    function (script, ui) {

        var dialog = ui.get('dialog');

        var Command = script.Command.extend({
            constructor: function DialogCommand() {
                this.callSuper('dialog');
            },
            options: {
                display: {
                    type: 'Boolean',
                    shortHand: 'd'
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
                }
            },
            orders: [

            ],
            execution: function (values) {
                if (values.fadeIn === true) {
                    dialog.fadeIn = true;
                } else if (values.fadeIn === false) {
                    dialog.fadeIn = false;
                }
                if (values.fadeOut === true) {
                    dialog.fadeOut = true;
                } else if (values.fadeOut === false) {
                    dialog.fadeOut = false;
                }
                if (values.duration) {
                    dialog.duration = values.duration;
                }
                if (values.textType) {
                    dialog.textType = values.textType;
                }
                if (values.textDuration) {
                    dialog.textDuration = values.textDuration;
                }
                if (values.display === true) {
                    dialog.show();
                } else if (values.display === false) {
                    dialog.hide();
                }
                if (values.name) {
                    dialog.name(values.name);
                }
                if (values.text) {
                    dialog.text(values.text);
                }
                if (values.voice) {
                    dialog.voice(values.voice);
                }
            }
        });
        new Command;
    });