// TODO: Divide into seperate files/classes?

import { getObjectsByPrototype, findInRange, findClosestByPath, findClosestByRange } from '/game/utils';
import { Creep, StructureSpawn, StructureContainer } from '/game/prototypes';
import { MOVE, TOUGH, ATTACK, RANGED_ATTACK, HEAL, WORK, CARRY, RESOURCE_ENERGY, ERR_NOT_IN_RANGE, ERR_NOT_ENOUGH_RESOURCES } from '/game/constants';
import { Visual } from '/game';
import { } from '/arena';

const roles = { ATTACK, RANGED_ATTACK, HEAL, WORK };
let allyCreeps = { };
let enemyCreeps = { };
let workerCreeps = { };
let attackCreeps = { };
let rangedCreeps = { };
let healCreeps = { };
let combatCreeps = { };
let firstPlatoon = { };
let containers = { };
let spawner;
let enemySpawner;
let targetLines;
var isStartOfGame = true;

export function loop() {

    // Updates the variable states
    updateState();

    // Command workers
    for (var i = 0; i < workerCreeps.length; i++)
    {
        behaviourAssign(workerCreeps[i]);
    }
    
    // TODO: attack from both top and bottom side
    // Spawns standard unit bundle first followed by a continuous offense
    if (isStartOfGame)
    {
        targetLines = new Visual(0, true);
        startGameSpawn();
    }
    else
        buildOffense();

    // Move out after first platoon completes
    if (!isStartOfGame)
    {  
        for (var i = 0; i < combatCreeps.length; i++)
        {
            behaviourAssign(combatCreeps[i]);
        }
    }
}

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
function behaviourAssign(creep)
{
    var role = creep.body.find(i => i.type == ATTACK || i.type == RANGED_ATTACK || i.type == HEAL || i.type == WORK).type;
    
    switch(role)
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

// Spawns 5 workers. Builds first platoon (3 attackers, 3 rangers, 1 healer).
function startGameSpawn()
{
    if (workerCreeps.length < 5)
        spawnWorker();
    else if (attackCreeps.length < 3)
        spawnAttacker();
    else if (rangedCreeps.length < 3)
        spawnRanger();
    else if (healCreeps.length < 1)
        spawnHealer();
    else
    {
        firstPlatoon = attackCreeps.concat(rangedCreeps, healCreeps);
        isStartOfGame = false;
    }
}

// Spawns a fast attacker followed by a fast ranger.
function buildOffense()
{
    spawnFastAttacker();
    spawnFastRanger();
}

// Spawns an attacker.
function spawnAttacker()
{
    spawner.spawnCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK]);
}

// Spawns a fast attacker.
function spawnFastAttacker()
{
    spawner.spawnCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK]);
}

// Spawns a ranger.
function spawnRanger()
{
    spawner.spawnCreep([TOUGH, TOUGH, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK]);
}

// Spawns a fast ranger.
function spawnFastRanger()
{
    spawner.spawnCreep([TOUGH, TOUGH, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK]);
}

// Spawns a healer.
function spawnHealer()
{
    spawner.spawnCreep([TOUGH, MOVE, MOVE, MOVE, MOVE,HEAL]);
}

// Spawns a worker.
function spawnWorker()
{
    spawner.spawnCreep([MOVE, WORK, CARRY]);
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
    var injuredAllies = combatCreeps.filter(i => i.hits < i.hitsMax);

    if (injuredAllies.length <= 0)
    {
        if (firstPlatoon.filter(i => i.body.type != HEAL).length <= 0)
            creep.moveTo(findClosestByPath(creep, combatCreeps.filter(i => i != creep)));
        else
            creep.moveTo(findClosestByPath(creep, firstPlatoon.filter(i => i != creep)));
    }
    else if (creep.heal(injuredAllies[0]) == ERR_NOT_IN_RANGE)
    {
        creep.moveTo(injuredAllies[0]);
    }   
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
    var targetContainer = findClosestByPath(creep, containers);
    //targetLines.line(creep, targetContainer, {color: '#FFFF00'});

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