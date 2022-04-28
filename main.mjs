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
    
    // Spawns standard unit bundle first followed by a relentless offense
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
    containers = getObjectsByPrototype(StructureContainer).filter(i => i.store.getCapacity(RESOURCE_ENERGY) > 0);
}

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

function startGameSpawn()
{
    // Spawns 3 workers, 3 attackers, 3 ranger, 1 healer
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
        console.log("AUTOBOTS, ROLLOUT!");
        isStartOfGame = false;
    }
}

function buildOffense()
{
    spawnFastAttacker();
    spawnFastRanger();
}

function spawnAttacker()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 140)
        spawner.spawnCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK]);
}

function spawnFastAttacker()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 190)
        spawner.spawnCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK]);
}

function spawnRanger()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 200)
        spawner.spawnCreep([TOUGH, TOUGH, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK]);
}

function spawnFastRanger()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 200)
        spawner.spawnCreep([TOUGH, TOUGH, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK]);
}

function spawnHealer()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 200)
        spawner.spawnCreep([TOUGH, MOVE, MOVE, MOVE, MOVE,HEAL]);
}

function spawnWorker()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 200)
        spawner.spawnCreep([MOVE, WORK, CARRY]);
}

// TODO: target healers first if in range
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

// TODO: Workers get stuck looting containers
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
        if (creep.withdraw(targetContainer, RESOURCE_ENERGY, 10) == ERR_NOT_ENOUGH_RESOURCES)
            targetContainer = containers[0];

        if (creep.withdraw(targetContainer, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
            creep.moveTo(targetContainer);
    }
}