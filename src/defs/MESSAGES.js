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
            'Your first task is simple: learn the basics of trading.',
            'Sell at least 1000 credits worth of goods.',
            `You start with only ${STARTING_CREDITS} credits to buy goods with,`,
            `so you must be shrewd.`,
            'Buy low, sell high. Study the market prices carefully.',
            '',
            'May the void be kind to you.',
            '- Uncle'
        ],
        (gameState) => {
            // Add the first quest when message is read
            const quest = QUESTS.LEARN_TO_TRADE;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        null, // This message doesn't complete a quest
        (gameState) => {
            // First message - always add on first dock
            return true;
        }
    ),
    
    TERRA_ALIEN_INVESTIGATION: new Message(
        'TERRA_ALIEN_INVESTIGATION',
        'Urgent Message from Terra',
        [
            'Attention all void traders,',
            '',
            'This is Commander Voss of the Terra Defense Bureau.',
            '',
            'Your recent engagement with hostile alien forces has not',
            'gone unnoticed. These xeno vessels represent an existential',
            'threat to all of humanity.',
            '',
            'Terra Command requires alien relics for analysis. We must',
            'understand their technology if we are to mount an effective',
            'defense against future incursions.',
            '',
            'Deliver 10 alien relics to Terra. You will be compensated',
            'generously for your service. These artifacts can only be',
            'recovered from defeated alien vessels.',
            '',
            'Terra is located far from the Nexus system. Prepare for',
            'a lengthy journey.',
            '',
            'Humanity is counting on you.',
            '',
            '- Commander Voss, Terra Defense Bureau'
        ],
        (gameState) => {
            // Add the quest when message is read
            const quest = QUESTS.DELIVER_RELICS_TO_TERRA;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        null, // This message doesn't complete a quest
        (gameState) => {
            // Add message after player defeats their first alien
            const aliensDefeated = gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] || 0;
            return aliensDefeated >= 1;
        }
    ),
    
    TRADING_BASICS_COMPLETE: new Message(
        'TRADING_BASICS_COMPLETE',
        'The First Step',
        [
            'Well done, nephew!',
            '',
            'You have grasped the fundamentals of commerce. Buy low, sell',
            'high - this simple principle is the foundation of all wealth.',
            '',
            'But trading simple goods will only get you so far. The basic cargo',
            'types available here offer modest profits at best.',
            '',
            'To truly prosper, you must reach Proxima - the nearest star',
            'system with a Merchant\'s Guild. There you will find opportunities',
            'far beyond what Nexus can offer.',
            '',
            'The journey is dangerous. You may encounter pirates, hostile',
            'vessels, or worse. Ensure your ships are ready before you depart.',
            '',
            'Safe travels.',
            '- Uncle'
        ],
        (gameState) => {
            // Add next quest
            const quest = QUESTS.REACH_GUILD;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'LEARN_TO_TRADE' // This message completes the LEARN_TO_TRADE quest
    ),
    
    GUILD_REACHED: new Message(
        'GUILD_REACHED',
        'Arrival at Proxima',
        [
            'Congratulations, nephew!',
            '',
            'You have reached Proxima - a significant accomplishment.',
            'However, to access the Merchant\'s Guild and its valuable',
            'services, you must first upgrade your citizenship status',
            'to at least Visa level.',
            '',
            'Visit the Courthouse to upgrade your citizenship. The Visa',
            'requires credits and reputation, but it unlocks the Guild,',
            'Shipyard, and Tavern - essential facilities for any trader.',
            '',
            'The Guild is where true merchants are forged. There you can',
            'learn to handle more lucrative cargo types and acquire licenses',
            'for larger, more capable ship classes.',
            '',
            'Continue trading until you have enough credits and reputation',
            'to afford the Visa upgrade.',
            '',
            '- Uncle'
        ],
        (gameState) => {
            // Add next quest
            const quest = QUESTS.ATTAIN_VISA;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'REACH_GUILD' // This message completes the REACH_GUILD quest
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
            '- Uncle'
        ],
        (gameState) => {
            // Add next quest
            const quest = QUESTS.LEARN_CARGO_HANDLING;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'ATTAIN_VISA' // This message completes the ATTAIN_VISA quest
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
            // Add next quest
            const quest = QUESTS.LEARN_SHIP_HANDLING;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'LEARN_CARGO_HANDLING' // This message completes the LEARN_CARGO_HANDLING quest
    ),
    
    SHIP_HANDLING_ATTAINED: new Message(
        'SHIP_HANDLING_ATTAINED',
        'Fleet Commander',
        [
            'Excellent work, nephew!',
            '',
            'You have acquired the Ship License: Mercantile. Now the doors',
            'of shipyards across the void are open to you, offering vessels',
            'with cargo capacity that dwarfs your current ships.',
            '',
            'But to command a fleet, you need more than just ships - you need',
            'capable officers to command them. Each ship requires an officer',
            'at the helm.',
            '',
            'Here is crucial wisdom: when your crew works together, their',
            'combined expertise benefits you. For any task - trading, combat,',
            'navigation - the HIGHEST skill among all your crew members is',
            'what matters. Build a diverse crew with complementary skills.',
            '',
            'Your next task: hire your first officer. Find a star system with',
            'a Tavern - you may need to purchase a Visa there to access it.',
            'Officers cost credits to hire and require ongoing salaries, but',
            'a skilled crew is worth every credit.',
            '',
            '- Uncle'
        ],
        (gameState) => {
            // Add next quest
            const quest = QUESTS.HIRE_FIRST_OFFICER;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'LEARN_SHIP_HANDLING' // This message completes the LEARN_SHIP_HANDLING quest
    ),
    
    FIRST_OFFICER_HIRED: new Message(
        'FIRST_OFFICER_HIRED',
        'A Crew Takes Shape',
        [
            'Well chosen, nephew!',
            '',
            'You have hired your first officer. With capable crew at your side,',
            'you can now command multiple vessels - a crucial step toward',
            'building a true trading empire.',
            '',
            'Remember: your crew\'s skills combine to serve you. An officer',
            'with high Barter skill improves ALL your trades, even those you',
            'personally conduct. One skilled in Gunnery enhances your entire',
            'fleet\'s combat effectiveness. Always use the best specialist',
            'for each task - that is the power of a diverse crew.',
            '',
            'Your next challenge: acquire a second ship. Find a star system',
            'with a Shipyard - as with Taverns, you may need Visa status to',
            'access their services.',
            '',
            'Each ship requires an officer to command it. Plan your purchases',
            'carefully, and ensure you have credits to pay officer salaries',
            'when you dock at stations.',
            '',
            '- Uncle'
        ],
        (gameState) => {
            // Add next quest
            const quest = QUESTS.BUY_SECOND_SHIP;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'HIRE_FIRST_OFFICER' // This message completes the HIRE_FIRST_OFFICER quest
    ),
    
    SECOND_SHIP_ACQUIRED: new Message(
        'SECOND_SHIP_ACQUIRED',
        'Master of the Void',
        [
            'Magnificent, nephew!',
            '',
            'You now command a fleet of two ships. Your cargo capacity has',
            'doubled, your trading opportunities have expanded, and you stand',
            'on the threshold of true wealth.',
            '',
            'You have mastered the fundamentals: trading, navigation, perks,',
            'officers, and fleet management. The path ahead is yours to forge.',
            '',
            'Continue to expand your fleet, hire skilled officers, and seek',
            'out profitable trade routes. The void is vast and full of',
            'opportunity for those bold enough to seize it.',
            '',
            'You have made me proud. May your legacy echo through the stars.',
            '',
            '- Uncle'
        ],
        null, // No next quest - end of chain
        'BUY_SECOND_SHIP' // This message completes the BUY_SECOND_SHIP quest
    ),
    
    RELICS_DELIVERED: new Message(
        'RELICS_DELIVERED',
        'Terra Defense Bureau - Payment Confirmed',
        [
            'Commander Voss here.',
            '',
            'The relics have been received and our analysis teams are',
            'already at work. What we\'re discovering... it\'s unprecedented.',
            '',
            'These alien vessels utilize technology far beyond our current',
            'understanding. Gravity-based propulsion, adaptive armor plating,',
            'and energy signatures that defy conventional physics.',
            '',
            'Your contribution to humanity\'s defense cannot be overstated.',
            'Payment has been transferred to your account as promised.',
            '',
            'We may call upon you again if the alien threat escalates.',
            'Terra remembers those who stand when others flee.',
            '',
            'Stay vigilant out there.',
            '',
            '- Commander Voss, Terra Defense Bureau'
        ],
        (gameState) => {
            // Add next alien quest
            const quest = QUESTS.LIBERATE_FIRST_PLANET;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'DELIVER_RELICS_TO_TERRA' // This message completes the DELIVER_RELICS_TO_TERRA quest
    ),

    FIRST_PLANET_LIBERATED: new Message(
        'FIRST_PLANET_LIBERATED',
        'Terra Defense Bureau - Liberation Confirmed',
        [
            'Commander Voss here.',
            '',
            'Our sensors confirm the system has been liberated. This is',
            'a decisive victory and a clear signal that humanity will not',
            'yield to the invaders.',
            '',
            'We now require hands-on testing of recovered alien modules.',
            'Bring a ship to Terra with two installed alien modules so our',
            'engineers can analyze their performance in field conditions.',
            '',
            'Your service continues to turn the tide.',
            '',
            '- Commander Voss, Terra Defense Bureau'
        ],
        (gameState) => {
            // Add next alien quest
            const quest = QUESTS.DELIVER_ALIEN_MODULES_TO_TERRA;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'LIBERATE_FIRST_PLANET' // This message completes the LIBERATE_FIRST_PLANET quest
    ),
    
    ALIEN_MODULES_DELIVERED: new Message(
        'ALIEN_MODULES_DELIVERED',
        'Terra Defense Bureau - Alien Tech Installed',
        [
            'Commander Voss here.',
            '',
            'Our engineers confirm the alien modules are now integrated',
            'into your vessel. This technology is beyond anything in the',
            'Terran arsenal, and your cooperation gives us a vital edge.',
            '',
            'Continue to strike at alien forces whenever possible. The',
            'Defense Bureau is authorizing expanded bounties for confirmed',
            'alien kills to accelerate our counteroffensive.',
            '',
            'Stay sharp out there, captain. You are on the front line.',
            '',
            '- Commander Voss, Terra Defense Bureau'
        ],
        (gameState) => {
            // Add next alien quest
            const quest = QUESTS.DEFEAT_ALIEN_FLEET;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'DELIVER_ALIEN_MODULES_TO_TERRA' // This message completes the DELIVER_ALIEN_MODULES_TO_TERRA quest
    ),

    HUNDRED_ALIENS_DEFEATED: new Message(
        'HUNDRED_ALIENS_DEFEATED',
        'Terra Defense Bureau - Commendation',
        [
            'Commander Voss here.',
            '',
            'Reports confirm 100 hostile alien vessels destroyed by your',
            'fleet. This is an extraordinary achievement, and your actions',
            'have saved countless human lives across the frontier.',
            '',
            'A substantial reward has been transferred to your account in',
            'recognition of your service. Terra stands with you, captain.',
            '',
            'Continue the fight. The void needs you.',
            '',
            '- Commander Voss, Terra Defense Bureau'
        ],
        null,
        'DEFEAT_ALIEN_FLEET' // This message completes the DEFEAT_ALIEN_FLEET quest
    )
};
