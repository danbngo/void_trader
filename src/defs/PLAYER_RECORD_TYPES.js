/**
 * Player Record Types
 * Keys for tracking player statistics and achievements
 */

const PLAYER_RECORD_TYPES = {
    TOTAL_CARGO_BOUGHT: 'TOTAL_CARGO_BOUGHT',           // Total units of cargo purchased
    TOTAL_CARGO_SOLD: 'TOTAL_CARGO_SOLD',               // Total units of cargo sold
    TOTAL_VALUE_BOUGHT: 'TOTAL_VALUE_BOUGHT',           // Total credits spent on cargo
    TOTAL_VALUE_SOLD: 'TOTAL_VALUE_SOLD',               // Total credits earned from cargo sales
    SYSTEMS_VISITED: 'SYSTEMS_VISITED',                  // Number of unique systems visited
    JUMPS_MADE: 'JUMPS_MADE',                           // Total number of hyperspace jumps
    COMBAT_ENCOUNTERS_WON: 'COMBAT_ENCOUNTERS_WON',     // Combats won
    COMBAT_ENCOUNTERS_FLED: 'COMBAT_ENCOUNTERS_FLED',   // Combats fled from
    SHIPS_DESTROYED: 'SHIPS_DESTROYED',                 // Enemy ships destroyed
    ALIEN_SHIPS_DEFEATED: 'ALIEN_SHIPS_DEFEATED',       // Alien ships defeated
    SYSTEMS_LIBERATED: 'SYSTEMS_LIBERATED',             // Systems liberated from alien control
    TIMES_DIED: 'TIMES_DIED'                            // Number of player deaths
};
