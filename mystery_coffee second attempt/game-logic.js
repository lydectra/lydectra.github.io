AFRAME.registerComponent('game-logic', {
    init: function () {
        this.cam = document.querySelector('a-camera');
        this.info = document.querySelector('#info');
        this.customerPortrait = document.querySelector('#customerPortrait');

        this.musicPlayer = document.querySelector('#musicPlayer');
        this.soundPlayer = document.querySelector('#soundPlayer');
        this.musicStarted = false;

        this.evidenceCollected = false;
        this.zoomedSuspect = null;
        this.zoomReady = false;
        this.inspectedSuspects = [false, false, false];
        this.accusationMode = false;
        this.clickLocked = false;

        this.served = {
            2: false,
            3: false,
            4: false,
            5: false
        };

        this.customers = {
            2: {
                src: '#tiredCustomer',
                drop: 'a coffee',
                pick: 'a muffin',
                goal: 'You give the tired customer the coffee.\n"Thank you."',
                fail: '"Excuse me, I ordered coffee."'
            },
            3: {
                src: '#nervousCustomer',
                drop: 'a muffin',
                pick: 'a sandwich',
                goal: 'You give the nervous customer the muffin.\n"Finally, thank you."',
                fail: '"That is not my order. I asked for a muffin."'
            },
            4: {
                src: '#quietCustomer',
                drop: 'a sandwich',
                pick: 'an empty tray',
                goal: 'You give the quiet customer the sandwich.\n"Thanks."\nAll customers are served. Go to the supplier room.',
                fail: '"I am still waiting for my sandwich."'
            }
        };

        this.suspectNames = [
            'the tired customer',
            'the nervous customer',
            'the quiet customer'
        ];

        this.normalSuspectImages = [
            '#tiredCustomer',
            '#nervousCustomer',
            '#quietCustomer'
        ];

        this.guiltySuspectImages = [
            '#tiredCustomerGuilty1',
            '#nervousCustomerGuilty1',
            '#quietCustomerGuilty1'
        ];

        this.el.addEventListener('click', (evt) => {
            if (this.clickLocked) return;

            const target = evt.target.closest('[nav], [suspect], [drop], [pick], #customerPortrait');
            if (!target) return;
                this.startCafeMusic();
            this.lockClick();

            const nav = target.getAttribute('nav');
            if (nav) {
                this.goToScene(Number(nav));
                return;
            }

            if (target.id === 'customerPortrait') {
                this.serveCustomer();
                return;
            }

            const sceneParent = target.closest('.scene');
            if (sceneParent && sceneParent.id !== 'scene' + this.scene) return;

            const suspect = target.getAttribute('suspect');
            if (suspect !== null) {
                this.handleSuspectClick(Number(suspect));
                return;
            }

            const drop = target.getAttribute('drop');
            const pick = target.getAttribute('pick');

            if (drop) {
                this.useItem(target, drop, pick);
            }
        });

        this.loadScene(1);
    },

    lockClick: function () {
        this.clickLocked = true;

        setTimeout(() => {
            this.clickLocked = false;
        }, 400);
    },

    startCafeMusic: function () {
    if (this.musicStarted) return;

    this.musicStarted = true;

    this.musicPlayer.setAttribute('sound', {
        src: '#cafeMusic',
        autoplay: true,
        loop: true,
        volume: 0.35
    });
},

changeToSpookyMusic: function () {
    this.musicPlayer.removeAttribute('sound');

    this.musicPlayer.setAttribute('sound', {
        src: '#spookyMusic',
        autoplay: true,
        loop: true,
        volume: 0.45
    });
},

playSound: function (soundId) {
    this.soundPlayer.removeAttribute('sound');

    this.soundPlayer.setAttribute('sound', {
        src: soundId,
        autoplay: true,
        loop: false,
        volume: 0.8
    });
},
    
    serveCustomer: function () {
        const customer = this.customers[this.scene];
        if (!customer) return;

        if (this.served[this.scene]) {
            this.updateText('You already served this customer.\nGo to the next one.');
            return;
        }

        const i = ITEMS.indexOf(customer.drop);

        if (i >= 0) {
            ITEMS.splice(i, 1);
            ITEMS.push(customer.pick);
            this.served[this.scene] = true;
            if (this.scene === 2) this.playSound('#tiredVoice');
            if (this.scene === 3) this.playSound('#nervousVoice');
            if (this.scene === 4) this.playSound('#quietVoice');
            this.updateText(customer.goal);
        } else {
            this.updateText(customer.fail);
        }
    },

    useItem: function (target, drop, pick) {
        if (this.served[this.scene]) {
            this.updateText('You already did this part.\nGo to the next place.');
            return;
        }

        const i = ITEMS.indexOf(drop);

        if (i >= 0) {
            ITEMS.splice(i, 1);

            if (pick) {
                ITEMS.push(pick);
            }

            this.served[this.scene] = true;

            if (target.getAttribute('clue') === 'true') {
                this.evidenceCollected = true;
                this.changeToSpookyMusic();
                this.playSound('#receiptSound');
                target.setAttribute('visible', false);

                this.updateText(
                    'There is a dead body on the floor!\n' +
                    'You select the bloody receipt as evidence.\n' +
                    CLUES[KILLER] +
                    '\nNow investigate the customers.'
                );
            } else {
                this.updateText(target.getAttribute('goal') || TEXT[this.scene - 1]);
            }
        } else {
            this.updateText(target.getAttribute('fail') || TEXT[this.scene - 1]);
        }
    },

    goToScene: function (sceneNumber) {
        if (sceneNumber === 5 && !ITEMS.includes('an empty tray') && !ITEMS.includes('a bloody receipt')) {
            this.updateText('You cannot go to the supplier room yet.\nServe all the customers first.');
            return;
        }

        if (sceneNumber === 6 && !this.evidenceCollected) {
            this.updateText('You cannot investigate yet.\nClick the bloody receipt and select it as evidence first.');
            return;
        }

        this.loadScene(sceneNumber);
    },

    handleSuspectClick: function (suspectNumber) {
        if (!this.evidenceCollected) {
            this.updateText('"Why are you asking me questions?"\nYou need evidence first!');
            return;
        }

        if (this.zoomedSuspect !== null) {
            if (this.zoomedSuspect === suspectNumber && this.zoomReady) {
                this.exitSuspectZoom(suspectNumber);
            }

            return;
        }

        if (this.accusationMode) {
            this.accuseSuspect(suspectNumber);
            return;
        }

        this.zoomSuspect(suspectNumber);
    },

    zoomSuspect: function (suspectNumber) {
        this.zoomedSuspect = suspectNumber;
        this.zoomReady = false;

        for (let i = 0; i < 3; i++) {
            const suspect = document.querySelector('#suspect' + i);
            if (!suspect) continue;

            if (i === suspectNumber) {
                suspect.setAttribute('visible', true);
                suspect.setAttribute('position', '0 1.55 -0.9');
                suspect.setAttribute('width', '1.1');
                suspect.setAttribute('height', '1.8');
            } else {
                suspect.setAttribute('visible', false);
            }
        }

        this.updateText(
            'You inspect ' + this.suspectNames[suspectNumber] + '.\n' +
            'Look carefully for blood, bruises, or suspicious marks.\n' +
            'Click them again after a moment to stop inspecting.'
        );

        setTimeout(() => {
            if (this.zoomedSuspect === suspectNumber) {
                this.zoomReady = true;
            }
        }, 1000);
    },

    exitSuspectZoom: function (suspectNumber) {
        this.zoomReady = false;
        this.inspectedSuspects[suspectNumber] = true;
        this.zoomedSuspect = null;
        this.showAllSuspects();

        if (this.inspectedSuspects.every(seen => seen)) {
            this.accusationMode = true;
            this.updateText(
                'You investigated all three customers.\n' +
                'Now click the person you think is the murderer.'
            );
        } else {
            this.updateText(
                'You finished inspecting ' + this.suspectNames[suspectNumber] + '.\n' +
                'Inspect the other customers before accusing someone.'
            );
        }
    },

    showAllSuspects: function () {
        const positions = [
            '-0.8 1.55 -1.2',
            '0 1.55 -1.2',
            '0.8 1.55 -1.2'
        ];

        for (let i = 0; i < 3; i++) {
            const suspect = document.querySelector('#suspect' + i);
            if (!suspect) continue;

            suspect.setAttribute('visible', true);
            suspect.setAttribute('position', positions[i]);
            suspect.setAttribute('width', '0.75');
            suspect.setAttribute('height', '1.25');
        }
    },

    accuseSuspect: function (suspectNumber) {
        if (suspectNumber === KILLER) {
            this.updateText(
                'You accuse ' + this.suspectNames[suspectNumber] + '.\n' +
                'The marks match the evidence.\n' +
                'You found the murderer!'
            );
            this.endGame('CASE CLOSED');
        } else {
            this.updateText(
                'You accuse ' + this.suspectNames[suspectNumber] + '.\n' +
                'But the marks do not match the evidence.\n' +
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

        document.querySelectorAll('.scene').forEach(el => {
            el.setAttribute('visible', false);
        });

        document.querySelector('#scene' + s).setAttribute('visible', true);
        document.querySelector('#sky').setAttribute('src', '#sky' + s);

        this.updateCustomerPortrait();

        if (s === 6) {
            this.updateSuspectImages();
        }

        this.updateText(TEXT[s - 1]);
    },

    updateCustomerPortrait: function () {
        const customer = this.customers[this.scene];

        if (customer) {
            this.customerPortrait.setAttribute('visible', true);
            this.customerPortrait.setAttribute('material', {
                src: customer.src,
                transparent: true,
                alphaTest: 0.1
            });
        } else {
            this.customerPortrait.setAttribute('visible', false);
            this.customerPortrait.removeAttribute('src');
        }
    },

    updateSuspectImages: function () {
        this.zoomedSuspect = null;
        this.zoomReady = false;
        this.accusationMode = false;
        this.inspectedSuspects = [false, false, false];

        for (let i = 0; i < 3; i++) {
            const suspect = document.querySelector('#suspect' + i);
            if (!suspect) continue;

            const image = i === KILLER
                ? this.guiltySuspectImages[i]
                : this.normalSuspectImages[i];

            suspect.setAttribute('material', {
                src: image,
                transparent: true,
                alphaTest: 0.1
            });
        }

        this.showAllSuspects();
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
