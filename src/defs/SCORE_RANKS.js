/**
 * Score Ranks
 * Defines player rank based on final score
 */

const SCORE_RANKS = [
    {
        name: 'Legendary Tycoon',
        minScore: 10*1000*1000*1000,
        description: 'A titan of commerce whose name echoes across the galaxy'
    },
    {
        name: 'Master Merchant',
        minScore: 1000*1000*1000,
        description: 'A renowned trader with vast wealth and influence'
    },
    {
        name: 'Elite Trader',
        minScore: 100*1000*1000,
        description: 'An accomplished merchant with significant holdings'
    },
    {
        name: 'Successful Trader',
        minScore: 10*1000*1000,
        description: 'A profitable merchant with a solid reputation'
    },
    {
        name: 'Competent Trader',
        minScore: 1000*1000,
        description: 'A capable merchant making steady progress'
    },
    {
        name: 'Apprentice Trader',
        minScore: 100*1000,
        description: 'A novice merchant learning the trade routes'
    },
    {
        name: 'Struggling Merchant',
        minScore: 10*1000,
        description: 'A merchant barely making ends meet'
    },
    {
        name: 'Failed Trader',
        minScore: 0,
        description: 'Perhaps trading was not your calling'
    },
    {
        name: 'Destitute Drifter',
        minScore: -10*1000,
        description: 'A down-on-your-luck trader barely scraping by'
    },
    {
        name: 'Broken Broker',
        minScore: -100*1000,
        description: 'A failed trader sinking deeper into debt'
    },
    {
        name: 'Bankrupt Captain',
        minScore: -1000*1000,
        description: 'A once-promising captain now out of options'
    },
    {
        name: 'Ruined Merchant',
        minScore: -10*1000*1000,
        description: 'A cautionary tale whispered among traders'
    },
    {
        name: 'Wrecked Outcast',
        minScore: -100*1000*1000,
        description: 'A shattered career with no way back'
    },
];

/**
 * Get rank for a given score
 * @param {number} score - Player's final score
 * @returns {Object} Rank object with name and description
 */
function getScoreRank(score) {
    // Find the highest rank where score >= minScore
    for (let i = 0; i < SCORE_RANKS.length; i++) {
        if (score >= SCORE_RANKS[i].minScore) {
            return SCORE_RANKS[i];
        }
    }
    // Fallback to lowest rank
    return SCORE_RANKS[SCORE_RANKS.length - 1];
}
