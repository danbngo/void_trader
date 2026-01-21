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
                updateSystemsWithQuests(gameState);
            }
        }
    ),
    
    GUILD_REACHED: new Message(
        'GUILD_REACHED',
        'Congratulations from Beyond',
        [
            'Well done, my nephew!',
            '',
            `You have reached Proxima. However, to access the Merchant's Guild`,
            'and its valuable services, you must first upgrade your citizenship',
            'status to at least Visa level.',
            '',
            'Visit the Courthouse to upgrade your citizenship. The Visa costs',
            'credits, but it unlocks the Guild, Shipyard, and Tavern.',
            '',
            'The Guild is where true merchants are forged. There you can learn',
            'to handle more lucrative cargo types and acquire licenses for',
            'fancier ship types.',
            '',
            'Trade the basic cargo types until you can afford the Visa upgrade.',
            '',
            '- Uncle'
        ],
        (gameState) => {
            // Award credits
            gameState.credits += 1000;
            
            // Add next quest
            const quest = QUESTS.ATTAIN_VISA;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        }
    ),
    
    VISA_ATTAINED: new Message(
        'VISA_ATTAINED',
        'A New Path Opens',
        [
            'Excellent work, nephew!',
            '',
            'You have acquired Visa status at Proxima. The Guild is now',
            'open to you, and with it, the path to true prosperity.',
            '',
            'Your next task: visit the Guild and learn the Cargo Handling:',
            'Fragile skill. This will allow you to trade in Holocubes, Medicine,',
            'and Nanites - far more profitable than basic cargo.',
            '',
            'The training costs credits, so continue trading until you can',
            'afford it. Once you master fragile cargo handling, greater',
            'opportunities will follow.',
            '',
            'As always, credits have been deposited for your progress.',
            '',
            '- Uncle'
        ],
        (gameState) => {
            // Award credits (double the previous reward)
            gameState.credits += 2000;
            
            // Add next quest
            const quest = QUESTS.LEARN_CARGO_HANDLING;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        }
    ),
    
    CARGO_HANDLING_ATTAINED: new Message(
        'CARGO_HANDLING_ATTAINED',
        'The Path of the Merchant',
        [
            'Outstanding, nephew!',
            '',
            'You have mastered the handling of fragile cargo. Already I can',
            'see your profits growing with each successful trade.',
            '',
            'But a true merchant needs more than cargo expertise - they need',
            'a vessel truly fit for commerce. Your current ships serve you well,',
            'but they pale in comparison to proper mercantile vessels.',
            '',
            'Your next challenge: return to the Guild and acquire the Ship',
            'License: Mercantile. This will grant you access to Freighters and',
            'Haulers - ships with cargo holds that dwarf your current capacity.',
            '',
            'Trade wisely, save your credits, and soon you will command',
            'a fleet worthy of the void trader legacy.',
            '',
            '- Uncle'
        ],
        (gameState) => {
            // Award credits (double the previous reward)
            gameState.credits += 4000;
            
            // Add next quest
            const quest = QUESTS.LEARN_SHIP_HANDLING;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        }
    )
};
