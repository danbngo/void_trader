/**
 * Blackreach Message Thread
 */

const MESSAGES_BLACKREACH = {
    BLACKREACH_CONTACT: new Message(
        'BLACKREACH_CONTACT',
        'Encrypted Blackreach Transmission',
        [
            'If this message reached you, you have proven you can handle',
            'yourself against the so-called lawful powers.',
            '',
            'There is a place beyond their reach. A market for those who',
            'operate in the shadows. It is called Blackreach.',
            '',
            'If you want access to its true opportunities, you will need to',
            'learn to handle illegal cargo. Consider this your invitation.',
            '',
            '- The Broker'
        ],
        (gameState) => {
            const quest = QUESTS.BLACKREACH_ILLEGAL_TRAINING;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        null,
        (gameState) => {
            return !!gameState.playerRecord[PLAYER_RECORD_TYPES.BLACKREACH_INTRO_TRIGGERED];
        }
    ),

    BLACKREACH_ILLEGAL_TRAINED: new Message(
        'BLACKREACH_ILLEGAL_TRAINED',
        'Blackreach - First Step',
        [
            'Good. You chose the path others fear to walk.',
            '',
            'There is a synthetic compound moving through the underworld.',
            'It spreads loyalty faster than credits. We need it everywhere.',
            '',
            'Sell 100 units of Drugs. The product must flow.',
            '',
            '- The Broker'
        ],
        (gameState) => {
            const quest = QUESTS.BLACKREACH_SELL_DRUGS;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'BLACKREACH_ILLEGAL_TRAINING'
    ),

    BLACKREACH_DRUGS_SOLD: new Message(
        'BLACKREACH_DRUGS_SOLD',
        'Blackreach - Influence Secured',
        [
            'The synthetic is everywhere. Good.',
            '',
            'Now we arm the shadows. Blackreach needs a stockpile that',
            'never runs dry. Fill the market with weapons until it holds 200.',
            '',
            'You have earned Visa status in Blackreach. Spend it wisely.',
            '',
            '- The Broker'
        ],
        (gameState) => {
            const blackreachIndex = gameState.systems.findIndex(sys => sys.name === 'Blackreach');
            if (blackreachIndex !== -1) {
                gameState.setRankAtSystemIndex(blackreachIndex, 'VISA');
            }
            const quest = QUESTS.BLACKREACH_STOCK_WEAPONS;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'BLACKREACH_SELL_DRUGS'
    ),

    BLACKREACH_WEAPONS_STOCKED: new Message(
        'BLACKREACH_WEAPONS_STOCKED',
        'Blackreach - Arsenal Ready',
        [
            'The market is armed. Good.',
            '',
            'We have a buyer on Terra who pays for chaos in antimatter.',
            'Deliver 50 units. Do not be followed.',
            '',
            '- The Broker'
        ],
        (gameState) => {
            const quest = QUESTS.BLACKREACH_DELIVER_ANTIMATTER;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'BLACKREACH_STOCK_WEAPONS'
    ),

    BLACKREACH_ANTIMATTER_DELIVERED: new Message(
        'BLACKREACH_ANTIMATTER_DELIVERED',
        'Blackreach - Deal Closed',
        [
            'The antimatter is delivered. Our leverage grows.',
            '',
            'Now we need a reputation that terrifies our enemies. Reach a',
            'bounty of 100,000 credits. Let them fear your name.',
            '',
            'Citizen status granted in Blackreach. Use it.',
            '',
            '- The Broker'
        ],
        (gameState) => {
            const blackreachIndex = gameState.systems.findIndex(sys => sys.name === 'Blackreach');
            if (blackreachIndex !== -1) {
                gameState.setRankAtSystemIndex(blackreachIndex, 'CITIZEN');
            }
            const quest = QUESTS.BLACKREACH_BOUNTY_TERROR;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'BLACKREACH_DELIVER_ANTIMATTER'
    ),

    BLACKREACH_BOUNTY_REACHED: new Message(
        'BLACKREACH_BOUNTY_REACHED',
        'Blackreach - Fear Made Real',
        [
            'Their scanners tremble at your name. Perfect.',
            '',
            'There is one last enemy: the badge. Destroy 100 police ships.',
            'Make the law hesitate to enter our space.',
            '',
            '- The Broker'
        ],
        (gameState) => {
            const quest = QUESTS.BLACKREACH_DESTROY_POLICE;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'BLACKREACH_BOUNTY_TERROR'
    ),

    BLACKREACH_POLICE_DESTROYED: new Message(
        'BLACKREACH_POLICE_DESTROYED',
        'Blackreach - Crown of Shadows',
        [
            'The law bleeds. The streets whisper your name.',
            '',
            'Blackreach grants you Elite status. You are one of us now.',
            '',
            '- The Broker'
        ],
        (gameState) => {
            const blackreachIndex = gameState.systems.findIndex(sys => sys.name === 'Blackreach');
            if (blackreachIndex !== -1) {
                gameState.setRankAtSystemIndex(blackreachIndex, 'ELITE');
            }
        },
        'BLACKREACH_DESTROY_POLICE'
    )
};
