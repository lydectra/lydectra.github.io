AFRAME.registerComponent('game-logic', {
    init: function () {
        this.cam = document.querySelector('a-camera');
        this.info = document.querySelector('#info');

        this.suspectNames = [
            'the tired customer',
            'the nervous customer',
            'the quiet customer'
        ];

        document.querySelectorAll('.scene .interactive').forEach(el => {
            el.setAttribute('data-clickable', 'true');
        });

        this.el.addEventListener('click', (evt) => {
            const target = evt.target.closest('[nav], [suspect], [drop], [pick]');
            if (!target) return;

            const sceneParent = target.closest('.scene');
            if (sceneParent && sceneParent.id !== 'scene' + this.scene) return;

            const nav = target.getAttribute('nav');
            if (nav) {
                this.goToScene(Number(nav));
                return;
            }

            const suspect = target.getAttribute('suspect');
            if (suspect !== null) {
                this.checkSuspect(Number(suspect));
                return;
            }

            if (target.getAttribute('served') === 'true') {
                this.updateText('You already served this customer.\nGo to the next customer.');
                return;
            }

            const drop = target.getAttribute('drop');
            const pick = target.getAttribute('pick');

            if (drop) {
                const i = ITEMS.indexOf(drop);

                if (i >= 0) {
                    ITEMS.splice(i, 1);

                    if (pick) {
                        ITEMS.push(pick);
                    }

                    if (target.getAttribute('clue') === 'true') {
                        target.setAttribute('served', 'true');
                        this.updateText(
                            'You enter the supplier room and freeze.\n' +
                            'There is a dead body on the floor.\n' +
                            CLUES[KILLER]
                        );
                    } else {
                        target.setAttribute('served', 'true');
                        this.updateText(target.getAttribute('goal') || TEXT[this.scene - 1]);
                    }
                } else {
                    this.updateText(target.getAttribute('fail') || TEXT[this.scene - 1]);
                }
            }
        });

        this.loadScene(1);
    },

    goToScene: function (sceneNumber) {
        if (sceneNumber === 5 && !ITEMS.includes('an empty tray') && !ITEMS.includes('a bloody receipt')) {
            this.updateText('You cannot go to the supplier room yet.\nServe all the customers first.');
            return;
        }

        if (sceneNumber === 6 && !ITEMS.includes('a bloody receipt')) {
            this.updateText('You cannot investigate yet.\nFind evidence in the supplier room first.');
            return;
        }

        this.loadScene(sceneNumber);
    },

    checkSuspect: function (suspectNumber) {
        if (!ITEMS.includes('a bloody receipt')) {
            this.updateText('"Why are you asking me questions?"\nYou need evidence first.');
            return;
        }

        ITEMS.splice(ITEMS.indexOf('a bloody receipt'), 1);

        if (suspectNumber === KILLER) {
            this.updateText(
                'You show the bloody receipt to ' + this.suspectNames[suspectNumber] + '.\n' +
                'They turn pale. The clue proves they were in the supplier room.\n' +
                'You found the murderer!'
            );
            this.endGame('CASE CLOSED');
        } else {
            this.updateText(
                'You accuse ' + this.suspectNames[suspectNumber] + '.\n' +
                'But the clue does not match them.\n' +
                'The real murderer escapes.'
            );
            this.endGame('WRONG SUSPECT');
        }
    },

    tick: function () {
    },

    loadScene: function (s) {
        this.scene = s;
        this.cam.setAttribute('position', '0 1.5 0');

        document.querySelectorAll('.scene').forEach(scene => {
            scene.setAttribute('visible', false);

            scene.querySelectorAll('[data-clickable="true"]').forEach(el => {
                el.classList.remove('interactive');
            });
        });

        const currentScene = document.querySelector('#scene' + s);
        currentScene.setAttribute('visible', true);

        currentScene.querySelectorAll('[data-clickable="true"]').forEach(el => {
            el.classList.add('interactive');
        });

        document.querySelector('#sky').setAttribute('src', '#sky' + s);

        this.updateText(TEXT[s - 1]);
    },

    updateText: function (t) {
        const inventory = '\n\nYou are carrying ' + (ITEMS.length > 0 ? ITEMS.join(' and ') : 'nothing');
        this.info.setAttribute('value', t + inventory + '.');
    },

    endGame: function (endingText) {
        const text = this.info.getAttribute('value').split('\n\n');
        this.info.setAttribute('value', text[0] + '\n\n' + endingText);
        document.querySelector('a-scene').pause();
    }
});
