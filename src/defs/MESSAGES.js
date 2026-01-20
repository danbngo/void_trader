/**
 * Message Definitions
 * Pre-defined messages for the game
 */

const MESSAGES = {
    UNCLE_WELCOME: new Message(
        'UNCLE_WELCOME',
        'Message from Your Uncle',
        [
            'My dear nephew,',
            '',
            'If you\'re reading this, then I have passed on to the great void.',
            'I leave you my ships and what wealth I have accumulated,',
            'but more importantly, I leave you a legacy to build upon.',
            '',
            'The life of a void trader is not easy, but it is rewarding.',
            'To help you succeed, I have arranged a series of challenges.',
            'Complete them, and credits will be deposited into your account.',
            '',
            'Your first task: reach Proxima, the nearest star system with',
            'a Merchant\'s Guild. Only there can you become a true merchant.',
            '',
            'May the void be kind to you.',
            '- Uncle'
        ],
        (gameState) => {
            // Add the first quest when message is read
            const quest = QUESTS.REACH_GUILD;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
            }
        }
    ),
    
    GUILD_REACHED: new Message(
        'GUILD_REACHED',
        'Congratulations from Beyond',
        [
            'Well done, my nephew!',
            '',
            'You have reached the Merchant\'s Guild and taken your',
            'first step toward becoming a true void trader.',
            '',
            'As promised, I have deposited credits into your account.',
            'Use them wisely.',
            '',
            'Your next challenge will test your skills further.',
            'Stay vigilant among the stars.',
            '',
            '- Uncle'
        ],
        (gameState) => {
            // Award credits
            gameState.credits += 1000;
            
            // Add next quest (placeholder for now)
            const quest = QUESTS.PLACEHOLDER_QUEST;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
            }
        }
    )
};
