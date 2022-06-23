// TODO: Divide into seperate files/classes?

import { getObjectsByPrototype, findInRange, findClosestByPath, findClosestByRange, getTicks } from '/game/utils';
import { Creep, StructureSpawn, StructureContainer } from '/game/prototypes';
import { MOVE, TOUGH, ATTACK, RANGED_ATTACK, HEAL, WORK, CARRY, RESOURCE_ENERGY, ERR_NOT_IN_RANGE, ERR_NOT_ENOUGH_RESOURCES } from '/game/constants';
import { searchPath } from 'game/path-finder';
import { } from '/arena';

// Collection of body presets.
const presetCreep = 
{
    attackCreep : [ TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK ],
    fastAttackCreep : [ TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK ],
    rangedAttackCreep : [ TOUGH, TOUGH, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK ],
    fastRangedAttackCreep : [ TOUGH, TOUGH, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK ],
    flankCreep : [ MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK],
    healCreep : [ TOUGH, MOVE, MOVE, MOVE, MOVE, HEAL ],
    workCreep : [ MOVE, WORK, CARRY ]
};

//TODO: Make custom Creep object with enum for roles.
let allyCreeps = [ ];
let enemyCreeps = [ ];
let workerCreeps = [ ];
let attackCreeps = [ ];
let rangedCreeps = [ ];
let healCreeps = [ ];
let combatCreeps = [ ];
let firstPlatoon = [ ];
let secondPlatoon = [ ];
let containers = [ ];
let spawner;
let enemySpawner;
let firstAttack = false;
let secondAttack = false;

export function loop() 
{
    // Runs only at start of program
    if (getTicks() == 1)
        awake();

    // Updates the variable states
    updateState();

    // Runs gameplan
    determineTactic();
}

// Runs a single time at the start of the game
function awake()
{
    console.log("The battle begins");
}

// TODO: Make test loop logging every container without filter
// Updates the variables containing the game state.
function updateState()
{
    allyCreeps = getObjectsByPrototype(Creep).filter(i => i.my);
    enemyCreeps = getObjectsByPrototype(Creep).filter(i => !i.my);
    workerCreeps = allyCreeps.filter(i => i.body.some(part => part.type == WORK));
    attackCreeps = allyCreeps.filter(i => i.body.some(part => part.type == ATTACK));
    rangedCreeps = allyCreeps.filter(i => i.body.some(part => part.type == RANGED_ATTACK));
    healCreeps = allyCreeps.filter(i => i.body.some(part => part.type == HEAL));
    combatCreeps = attackCreeps.concat(rangedCreeps, healCreeps);
    spawner = getObjectsByPrototype(StructureSpawn).find(i => i.my);
    enemySpawner = getObjectsByPrototype(StructureSpawn).find(i => !i.my);
    containers = getObjectsByPrototype(StructureContainer).filter(i => i.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
}

// Assigns behaviour to creep's role.
function defaultBehaviourAssign(creep)
{
    let role = creep.body.find(i => i.type == ATTACK || i.type == RANGED_ATTACK || i.type == HEAL || i.type == WORK).type;
    
    switch (role)
    {
        case ATTACK:
            attackBehaviour(creep);
            break;
        case RANGED_ATTACK:
            rangedAttackBehaviour(creep);
            break;
        case HEAL:
            healBehaviour(creep);
            break;
        case WORK:
            workBehaviour(creep);
            break;
        default:
            console.log("ERROR: " + creep.id + " at X: " + creep.x + " Y: " + creep.y + " doesn't have a valid role.");
    }
}

// TODO: Make it
// Sets up custom cost matrix
function setupCostMatrix()
{
    // Makes area around spawn unlikely to pass
    // Look into "plain" when hovering over tiles

}

// Determines tactic based on game state
function determineTactic()
{
    if (!firstAttack)
        startGameSpawn();
    else if (!secondAttack)
        secondPlatoonSpawn();
    else
        buildOffense();

    // Move out after first platoon completes
    if (firstAttack)
    {
        if (combatCreeps.length > 0)
            combatCreeps.forEach(currentCreep => defaultBehaviourAssign(currentCreep));
    }

    // Move out after second platoon completes
    if (secondAttack)
    {
        if (secondPlatoon.length > 0)
            secondPlatoon.forEach(currentCreep => flankBehaviour(currentCreep));
    }

    // Command workers
    if (workerCreeps.length > 0)
        workerCreeps.forEach(currentCreep => defaultBehaviourAssign(currentCreep));
}

// Spawns 5 workers. Builds first platoon (3 attackers, 3 rangers, 1 healer).
function startGameSpawn()
{
    if (workerCreeps.length < 5)
        spawner.spawnCreep(presetCreep.workCreep);
    else if (attackCreeps.length < 3)
    {
        let newCreep = spawner.spawnCreep(presetCreep.attackCreep).object;
        
        if (newCreep != null)
            firstPlatoon.push(newCreep);
    }
    else if (rangedCreeps.length < 3)
    {
        let newCreep = spawner.spawnCreep(presetCreep.rangedAttackCreep).object;

        if (newCreep != null)
            firstPlatoon.push(newCreep);
    }
    else if (healCreeps.length < 1)
    {
        let newCreep = spawner.spawnCreep(presetCreep.healCreep).object;

        if (newCreep != null)
            firstPlatoon.push(newCreep);
    }   
    else
    {
        firstAttack = true;
        return;
    }

    // Moves the first platoon out of the way so that new units can spawn freely
    let firstGatherPoint = searchPath(spawner, enemySpawner).path[5];

    if (firstPlatoon.length > 0)
        firstPlatoon.forEach(currentCreep => currentCreep.moveTo(firstGatherPoint));
}

// Spawns second platoon to flank enemy base (3 extremely fast attackers).
function secondPlatoonSpawn()
{
    if (secondPlatoon.length < 3)
    {
        let currentCreep = spawner.spawnCreep(presetCreep.flankCreep).object;
        
        if (currentCreep != null)
            secondPlatoon.push(currentCreep);
    }
    else
        secondAttack = true;
}

// Spawns a fast attacker followed by a fast ranger.
function buildOffense()
{
    spawner.spawnCreep(presetCreep.fastAttackCreep);
    spawner.spawnCreep(presetCreep.fastRangedAttackCreep);
}

// TODO: target healers first if in range
/* Command creep to follow the attack behaviour. 
- Detects enemy creeps within 5 range.
- Targets closest detected enemy creep.
- Targets enemy spawner if there is no target creep.
- Moves towards target if target is not in attack range.
*/
function attackBehaviour(creep) 
{
    if (findInRange(creep, enemyCreeps, 5).length > 0)
    {
        if (creep.attack(findClosestByPath(creep, enemyCreeps)) == ERR_NOT_IN_RANGE)
            creep.moveTo(findClosestByPath(creep, enemyCreeps)); 
    }
    else
    {
        if (creep.attack(enemySpawner) == ERR_NOT_IN_RANGE)
            creep.moveTo(enemySpawner);
    }
}

// TODO: target healers first if in range
// TODO: if target has lower movement parts start kiting
/* Command creep to follow the ranged attack behaviour. 
- Detects enemy creeps within 8 range.
- Targets closest detected enemy creep.
- Targets enemy spawner if there is no target creep.
- Moves towards target if target is not in ranged attack range.
*/
function rangedAttackBehaviour(creep)
{
    if (findInRange(creep, enemyCreeps, 8).length > 0)
    {
        if (creep.rangedAttack(findClosestByPath(creep, enemyCreeps)) == ERR_NOT_IN_RANGE)
            creep.moveTo(findClosestByPath(creep, enemyCreeps));    
    }
    else
    {
        if (creep.rangedAttack(enemySpawner) == ERR_NOT_IN_RANGE)
            creep.moveTo(enemySpawner);
    }
}

// BUG: firstPlatoon check throws error because units get undefined when dying
// TODO: if route is too long start ranged healing
/* Command creep to follow the heal behaviour. 
- Detects all allies who are not at max hits.
- Targets first injured ally.
- Moves towards target if target is not in (melee) heal range.
- Follows first platoon if there is no target.
- Follows closest ally if first platoon is dead.
*/
function healBehaviour(creep)
{
    let injuredAllies = combatCreeps.filter(i => i.hits < i.hitsMax);

    if (injuredAllies.length <= 0)
    {
        if (firstPlatoon.filter(i => i.body.some(part => part.type != HEAL)).length <= 0)
            creep.moveTo(findClosestByPath(creep, combatCreeps.filter(i => i != creep)));
        else
            creep.moveTo(findClosestByPath(creep, firstPlatoon.filter(i => i != creep)));
    }
    else if (creep.heal(injuredAllies[0]) == ERR_NOT_IN_RANGE)
        creep.moveTo(injuredAllies[0]); 
}

// BUG: Behaviour conflicts with standard attack behaviour (because these creeps fall under attack creeps)
/* Command creep to follow the flank behaviour.
- Finds the optimal path.
- Sets a position on the opposite side of the optimal path.
- Moves to the flanking position.
- Attacks enemy base if it gets close enough.
*/
function flankBehaviour(creep)
{
    let optimalPath = searchPath(spawner, enemySpawner).path;
    let flankPosition = null;

    if (optimalPath[20] > spawner.y)
        flankPosition = {x: enemySpawner.x, y: enemySpawner.y - 10};
    else
        flankPosition = {x: enemySpawner.x, y: enemySpawner.y + 10};

    if (findInRange(creep, enemySpawner, 13).length > 0)
    {
        if (creep.attack(enemySpawner) == ERR_NOT_IN_RANGE)
            creep.moveTo(enemySpawner);
    }
    else
        creep.moveTo(flankPosition);
}

// BUG: Workers won't loot containers that spawn
// BUG: Workers block path of spawning units
/* Command creep to follow the work behaviour. 
- Targets closest container.
- Withdraws energy from target.
- Moves towards target if target is not in withdraw range.
- Transfers energy to spawn if inventory is full.
- Moves towards spawn if spawn is not in transfer range.
*/
function workBehaviour(creep)
{
    let targetContainer = findClosestByPath(creep, containers);

    if (creep.store.getFreeCapacity() <= 0)
    {
        if (creep.transfer(spawner, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
            creep.moveTo(spawner);
    }
    else
    {   
        if (creep.withdraw(targetContainer, RESOURCE_ENERGY) == ERR_NOT_ENOUGH_RESOURCES)
            targetContainer = containers[0];

        if (creep.withdraw(targetContainer, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
            creep.moveTo(targetContainer);
    }
}