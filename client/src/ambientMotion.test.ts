import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceInsect,isNightScene,type AmbientInsect } from './ambientMotion';
const insect=():AmbientInsect=>({x:474,y:400,baseY:400,direction:1,speed:20,elapsed:0,phase:0});
test('ants stay on the ground and turn around before leaving the play area',()=>{
 const ant=insect();advanceInsect(ant,100,false);assert.equal(ant.x,475);assert.equal(ant.direction,-1);assert.equal(ant.y,400);
 for(let i=0;i<1000;i++)advanceInsect(ant,100,false);
 assert.ok(ant.x>=25&&ant.x<=475);assert.equal(ant.y,400);
});
test('fireflies drift vertically and background-tab delays do not cause a large jump',()=>{
 const fly=insect();fly.x=100;advanceInsect(fly,60000,true);
 assert.equal(fly.x,102);assert.ok(fly.y>400&&fly.y<=412);
});
test('nighttime insects are used in moonlit and pine habitats, including their grower scenes',()=>{
 assert.equal(isNightScene('moonlit'),true);assert.equal(isNightScene('pine'),true);
 for(const kind of ['garden','meadow','jungle','mountain','woodland','ridge'] as const)assert.equal(isNightScene(kind),false);
});
