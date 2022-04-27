import { getObjectsByPrototype, findInRange, findClosestByPath, findClosestByRange } from '/game/utils';
import { Creep, StructureSpawn, StructureContainer } from '/game/prototypes';
import { WORK, ATTACK, RANGED_ATTACK, HEAL, MOVE, CARRY, TOUGH, RESOURCE_ENERGY, ERR_NOT_IN_RANGE, ERR_NOT_ENOUGH_RESOURCES } from '/game/constants';
import { Visual } from '/game';
import { } from '/arena';

const roles = { WORK, ATTACK, RANGED_ATTACK, HEAL };
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

    // Workers harvest nearby source
    for (var i = 0; i < workerCreeps.length; i++)
    {
        roleBehaviour(workerCreeps[i]);
    }
    
    // Spawns standard unit bundle or relentless offense
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
            roleBehaviour(combatCreeps[i]);
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

function startGameSpawn()
{
    // Spawns 3 workers, 3 attackers, 1 ranger, 1 healer
    if (workerCreeps.length < 5)
        spawnWorker();
    else if (attackCreeps.length < 3)
        spawnAttacker();
    else if (rangedCreeps.length < 1)
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
}

function spawnWorker()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 200)
            spawner.spawnCreep([WORK, CARRY, MOVE]);
}

function spawnAttacker()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 140)
            spawner.spawnCreep([ATTACK, MOVE, MOVE, TOUGH]);
}

function spawnFastAttacker()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 190)
            spawner.spawnCreep([ATTACK, MOVE, MOVE, MOVE, TOUGH]);
}

function spawnRanger()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 200)
            spawner.spawnCreep([RANGED_ATTACK, MOVE]);
}

function spawnHealer()
{
    if (spawner.store.getCapacity(RESOURCE_ENERGY) >= 200)
            spawner.spawnCreep([HEAL, MOVE]);
}

function roleBehaviour(creep)
{
    var role = creep.body.find(i => i.type == WORK || i.type == ATTACK || i.type == RANGED_ATTACK || i.type == HEAL).type;
    
    switch(role)
    {
        case ATTACK:

            if (findInRange(creep, enemyCreeps, 5).length > 0)
            {
                console.log("Enemy spotted!");
                if (creep.attack(findClosestByPath(creep, enemyCreeps)) == ERR_NOT_IN_RANGE)
                    creep.moveTo(findClosestByPath(creep, enemyCreeps)); 
            }
            else
            {
                console.log("Going for enemy spawner");
                if (creep.attack(enemySpawner) == ERR_NOT_IN_RANGE)
                    creep.moveTo(enemySpawner);
            }
            break;
                
        case RANGED_ATTACK:

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
            break;

        case HEAL:

            var injuredAllies = getObjectsByPrototype(Creep).filter(i => i.hits < i.hitsMax);

            if (injuredAllies.length <= 0)
                creep.moveTo(combatCreeps[0]);

            if (creep.rangedHeal(injuredAllies[0]) == ERR_NOT_IN_RANGE)
                creep.moveTo(injuredAllies[0]);
            break;

        case WORK:

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
            break;

        default:
            console.log("ERROR: " + creep.id + " doesn't have a valid role");
    }
}