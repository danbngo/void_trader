/**
 * Terra Message Thread
 */

const MESSAGES_TERRA = {
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
            'Terra Command requires alien artifacts for analysis. We must',
            'understand their technology if we are to mount an effective',
            'defense against future incursions.',
            '',
            'Deliver 10 alien artifacts to Terra. You will be compensated',
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
            const quest = QUESTS.DELIVER_ARTIFACTS_TO_TERRA;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        null,
        (gameState) => {
            const aliensDefeated = gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] || 0;
            return aliensDefeated >= 1;
        }
    ),

    ARTIFACTS_DELIVERED: new Message(
        'ARTIFACTS_DELIVERED',
        'Terra Defense Bureau - Payment Confirmed',
        [
            'Commander Voss here.',
            '',
            'The artifacts have been received and our analysis teams are',
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
            const quest = QUESTS.LIBERATE_FIRST_PLANET;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'DELIVER_ARTIFACTS_TO_TERRA'
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
            const terraIndex = gameState.systems.findIndex(sys => sys.name === 'Terra');
            if (terraIndex !== -1) {
                gameState.setRankAtSystemIndex(terraIndex, 'VISA');
            }
            const quest = QUESTS.DELIVER_ALIEN_MODULES_TO_TERRA;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'LIBERATE_FIRST_PLANET'
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
            const terraIndex = gameState.systems.findIndex(sys => sys.name === 'Terra');
            if (terraIndex !== -1) {
                gameState.setRankAtSystemIndex(terraIndex, 'CITIZEN');
            }
            const quest = QUESTS.DEFEAT_ALIEN_FLEET;
            if (!gameState.activeQuests.includes(quest.id)) {
                gameState.activeQuests.push(quest.id);
                updateSystemsWithQuests(gameState);
            }
        },
        'DELIVER_ALIEN_MODULES_TO_TERRA'
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
        (gameState) => {
            const terraIndex = gameState.systems.findIndex(sys => sys.name === 'Terra');
            if (terraIndex !== -1) {
                gameState.setRankAtSystemIndex(terraIndex, 'ELITE');
            }
        },
        'DEFEAT_ALIEN_FLEET'
    )
};
