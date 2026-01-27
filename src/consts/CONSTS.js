const MIN_NUM_SHIPS_IN_SHIPYARD = 0
const MAX_NUM_SHIPS_IN_SHIPYARD = 3
const SHIPYARD_MIN_NUM_MODULES = 0
const SHIPYARD_MAX_NUM_MODULES = 2
const SHIP_MAX_NUM_MODULES = 2
const TAVERN_MIN_NUM_OFFICERS = 1
const TAVERN_MAX_NUM_OFFICERS = 3
const TAVERN_MIN_NUM_JOBS = 1
const TAVERN_MAX_NUM_JOBS = 3

const OFFICER_SALARY_PER_LEVEL = 1 //5 credits per officer level every time you land at a dock
const OFFICER_HIRE_COST_PER_LEVEL = 100 //100 credits per officer level to hire
const MIN_OFFICER_LEVEL = 5
const MAX_OFFICER_LEVEL = 50
const MAX_PLAYER_LEVEL = 100
const OFFICER_SKILL_POINTS_PER_LEVEL = 5
const OFFICER_EXP_POINTS_FOR_FIRST_LEVEL_UP = 100
const OFFICER_EXP_POINTS_LEVEL_EXPONENT = 2.2
const OFFICER_MAX_SKILL_LEVEL = 20
const SKILL_COST_INCREASE_FACTOR = 1

const MAX_ENCOUNTER_WEIGHT = 4

const MAP_VIEW_RANGE = 20 // in coordinate units
const MIN_MAP_VIEW_RANGE = 10
const MAX_MAP_VIEW_RANGE = 40
const GRID_WIDTH = 80;  // Characters wide
const GRID_HEIGHT = 40; // Characters tall
const FONT_FAMILY = 'Courier New, monospace';
const MIN_FONT_SIZE = 16;   // Minimum font size in pixels
const MAX_FONT_SIZE = 48;  // Maximum font size in pixels
const GALAXY_MAP_WIDTH = 50 // Characters
const GALAXY_MAP_HEIGHT = 30 // Characters
const COMBAT_MAP_WIDTH = 50 // Characters
const COMBAT_MAP_HEIGHT = 30 // Characters

const MIN_NUM_SYSTEMS = 200
const MAX_NUM_SYSTEMS = 300
const MIN_SYSTEM_X = -100
const MAX_SYSTEM_X = 100
const MIN_SYSTEM_Y = -100
const MAX_SYSTEM_Y = 100
const MAX_SYSTEM_POPULATION = 10000 // in millions
const SAVE_FILE_PREFIX = 'void_trader_save_'
const MAX_SAVES = 5
const SHIP_MIN_STAT_VARIATION = 0.5
const SHIP_MAX_STAT_VARIATION = 2

const AVERAGE_SHIP_HULL = 20
const AVERAGE_SHIP_SHIELDS = 10
const AVERAGE_SHIP_CARGO = 20
const AVERAGE_SHIP_FUEL = 10
const AVERAGE_SHIP_ENGINE_LEVEL = 10
const AVERAGE_SHIP_LASER_LEVEL = 10
const AVERAGE_SHIP_RADAR_LEVEL = 10
const AVERAGE_JOURNEY_DAYS_PER_LY = 1
const AVERAGE_JOURNEY_ENCOUNTER_CHANCE_PER_DAY = 0.5

const ENCOUNTER_MIN_SHIP_DISTANCE = 25
const ENCOUNTER_MAX_SHIP_DISTANCE = 50
const ENCOUNTER_MAX_RADIUS = 100
const ENCOUNTER_MAP_VIEW_RANGE = 80 // in coordinate units
const ENCOUNTER_MIN_MAP_VIEW_RANGE = 20
const ENCOUNTER_MAX_MAP_VIEW_RANGE = 120

const STAR_SYSTEM_MIN_DISTANCE_FROM_NEIGHBORS = 5
const STAR_SYSTEM_MAX_DISTANCE_FROM_NEIGHBORS = 20
const MIN_COMBAT_ASTEROIDS = 5
const MAX_COMBAT_ASTEROIDS = 25
const ASTEROID_SIZE = 1
const SHIP_SIZE = 1
const CHANCE_TO_LASER_OBSTRUCTION = 0.5
const ENEMY_FLEE_AT_HULL_RATIO = 0.25
const ENEMY_MIN_LASER_HIT_CHANCE = 0.5
const ENEMY_MIN_CARGO_RATIO = 0
const ENEMY_MAX_CARGO_RATIO = 1
const ENEMY_HAS_CARGO_TYPE_CHANCE = 0.5
const ENEMY_SHIP_HULL_DAMAGED_CHANCE = 0.5
const ENEMY_DAMAGED_SHIP_MIN_HULL_RATIO = 0.25
const ENEMY_DAMAGED_SHIP_MAX_HULL_RATIO = 1

const REPUTATION_EFFECT_ON_ATTACK_CIVILIAN = -5
const REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES = -10
const REPUTATION_EFFECT_ON_ATTACK_CRIMINALS = 5
const BOUNTY_INCREASE_ON_ATTACK_CIVILIANS = 1000
const BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES = 2000
const BOUNTY_POLICE_MIN_ATTACK_THRESHOLD = 10*1000
const BOUNTY_POLICE_ALWAYS_ATTACK_THRESHOLD = 50*1000
const REPUTATION_SOLDIERS_MIN_ATTACK_THRESHOLD = -25
const REPUTATION_SOLDIERS_ALWAYS_ATTACK_THRESHOLD = -100


const DAYS_IN_JAIL_PER_1000CR_BOUNTY = 7
const EXPERIENCE_FROM_AVERAGE_VICTORY = 100
const EXPERIENCE_FROM_TRADING_1000_CR = 10
const EXPERIENCE_FROM_AVERAGE_ESCAPE = 10

const FUEL_COST_PER_UNIT = 1
const HULL_REPAIR_COST_PER_UNIT = 10
const STARTING_CREDITS = 500

const STAR_SYSTEM_MIN_FEES = 0.05
const STAR_SYSTEM_MAX_FEES = 0.5
const MIN_CARGO_AMOUNT_IN_MARKET = 0
const MAX_CARGO_AMOUNT_IN_MARKET = 100
const MAX_CARGO_PRICE_MODIFIER = 4.0 //which means min value is 1/4

const SKILL_POINTS_PER_LEVEL = 5
const EXP_POINTS_FOR_FIRST_LEVEL_UP = 100
const EXP_POINTS_LEVEL_MULTIPLIER = 2.5 //each level is 2.5x more expensive than the previous

const EXP_POINTS_FROM_COMBAT_VICTORY_AVG = 25 //per victory. modified by their total ship value / ours
const EXP_POINTS_FROM_COMBAT_FLEE_AVG = 5 //per successful flee. modified by their total ship value / ours
const EXP_POINTS_FROM_TRADING_1000CR = 5 //per 1000cr traded. apply this fractionally, ie, if player trades 100cr then he has a 50/50 chance of gaining 1 exp. if player trades 300 cr then he has 50% chance of gaining 1 exp and 50% chance of gaining 2.
const EXP_POINTS_FROM_SMUGGLING = 5 //if player had illegal cargo and police overlook it, award this

const ABANDONED_SHIP_AMBUSH_CHANCE = 0.25
const ABANDONED_SHIP_ENCOUNTER_WEIGHT = 0.5

const NEWS_CHANCE_PER_SYSTEM_PER_YEAR = 0.05 //each year, each human-controlled system has this chance to generate news
const NEWS_NUM_ON_START = 10 //number of news events to generate on game start

//simulation says aliens will take ~60-75 years to conquer everything, which is above the game time limit of 50y 
const ALIENS_SPAWN_AFTER_X_YEARS = 0.0001 //alien behavior will start after this many years
const ALIENS_CONQUER_X_SYSTEMS_AT_START = 10 //in a single instant news event, aliens will conquer multiple random systems initially. dont include nexus or proxima
const ALIENS_SPONTANEOUS_CONQUESTS_PER_YEAR = 0.5 //aliens will randomly conquer 1 system per year this likelihood. dont include nexus or proxima
const ALIENS_CONQUER_CHANCE_PER_YEAR = 0.15 //every alien-conquered system whose nearest neighbor is human has a chance to conquer them each year. dont include nexus or proxima
const ALIENS_LIBERATED_CHANCE_PER_YEARS = 0.1 //every alien-conquered system whose nearest neighbor is human has a chance to be liberated each year
const ALIENS_ENCOUNTER_WEIGHT = 4.0 //when traveling to a conquered system, this is added to encounter weights, otherwise chance of alien encounters is 0
const ALIENS_MAX_ATTACK_DISTANCE = 20 //maximum distance in LY that aliens will attack from conquered systems
const ALIEN_DEFENSE_FLEET_DROP_MODULE_CHANCE = 0.5 // chance alien defense fleets drop an alien module

// Terra system constants
const MIN_DISTANCE_NEXUS_TO_TERRA = 75 // Minimum distance from Nexus to Terra in LY
const TERRA_MIN_OFFICERS = 10 // Minimum officers in Terra's tavern
const TERRA_MAX_OFFICERS = 15 // Maximum officers in Terra's tavern
const TERRA_MIN_SHIPS = 10 // Minimum ships in Terra's shipyard
const TERRA_MAX_SHIPS = 15 // Maximum ships in Terra's shipyard
const TERRA_MIN_CARGO_RATIO = 0.5 // Minimum ratio of max cargo in Terra's market
const TERRA_MAX_CARGO_RATIO = 1.0 // Maximum ratio of max cargo in Terra's market

// Ship module effect constants
const MODULE_REFLECTOR_CHANCE = 0.25 // Chance to reflect laser back
const MODULE_REFLECTOR_DAMAGE_MULTIPLIER = 1.0 // Damage multiplier for reflected laser
const MODULE_DISRUPTER_CHANCE = 0.25 // Chance to remove all enemy shields
const MODULE_DRILL_DAMAGE_MULTIPLIER = 2.0 // Ramming damage multiplier
const MODULE_REGENERATIVE_HULL_PER_DAY = 1 // Hull restored per day of travel
const MODULE_TRACTOR_BEAM_DISTANCE_RATIO = 0.5 // Pull distance as ratio of damage
const MODULE_REPULSOR_DISTANCE_RATIO = 0.5 // Push distance as ratio of damage
const MODULE_BLINK_CHANCE = 0.25 // Chance to teleport when hit
const MODULE_BLINK_DISTANCE = 10 // Teleport distance in LY
const MODULE_SELF_DESTRUCT_RANGE = 25 // Damage range
const MODULE_SELF_DESTRUCT_DAMAGE_RATIO = 0.25 // Damage as ratio of max hull
const MODULE_WARHEAD_RANGE = 5 // Splash damage range
const MODULE_WARHEAD_DAMAGE_RATIO = 0.5 // Splash damage as ratio of base damage
