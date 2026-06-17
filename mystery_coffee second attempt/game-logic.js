AFRAME.registerComponent('game-logic', {
    init: function () {
        this.cam = document.querySelector('a-camera');
        this.info = document.querySelector('#info');
        this.customerPortrait = document.querySelector('#customerPortrait');

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
                goal: 'You give the tired customer the coffee.\n"Thank you."\nYou now carry a muffin for the next customer.',
                fail: '"Excuse me, I ordered coffee."'
            },
            3: {
                src: '#nervousCustomer',
                drop: 'a muffin',
                pick: 'a sandwich',
                goal: 'You give the nervous customer the muffin.\n"Finally, thank you."\nYou now carry a sandwich for the next customer.',
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

        this.el.addEventListener('click', (evt) => {
            const target = evt.target.closest('[nav], [suspect], [drop], [pick], #customerPortrait');
            if (!target) return;

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
            if (sceneParent && sceneParent.id !== 'scene' + this.scene) {
                return;
            }

            const suspect = target.getAttribute('suspect');
            if (suspect !== null) {
                this.checkSuspect(Number(suspect));
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

    serveCustomer: function () {
        const customer = this.customers[this.scene];

        if (!customer) {
            return;
        }

        if (this.served[this.scene]) {
            this.updateText('You already served this customer.\nGo to the next place.');
            return;
        }

        const i = ITEMS.indexOf(customer.drop);

        if (i >= 0) {
            ITEMS.splice(i, 1);
            ITEMS.push(customer.pick);
            this.served[this.scene] = true;
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
                this.updateText(
                    'You enter the supplier room and freeze.\n' +
                    'There is a dead body on the floor.\n' +
                    CLUES[KILLER]
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

        document.querySelectorAll('.scene').forEach(el => {
            el.setAttribute('visible', false);
        });

        document.querySelector('#scene' + s).setAttribute('visible', true);
        document.querySelector('#sky').setAttribute('src', '#sky' + s);

        this.updateCustomerPortrait();
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
