import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneEnvironment } from './sceneEnvironment';
test('bear and wolf-den scenes use separate habitats throughout levels 19–21',()=>{
 for(const level of [19,20,21]){
  assert.equal(sceneEnvironment(level,'helper'),'pine');
  assert.equal(sceneEnvironment(level,'explorer'),'ridge');
 }
});
test('each later grower habitat matches the previous chapter animal, including after restarting',()=>{
 for(let level=4;level<=21;level++){
  assert.equal(sceneEnvironment(level,'helper'),sceneEnvironment(level-3,'explorer'));
  assert.notEqual(sceneEnvironment(level,'helper'),sceneEnvironment(level,'explorer'));
 }
 assert.equal(sceneEnvironment(1,'helper'),'garden');
 assert.equal(sceneEnvironment(1,'explorer'),'meadow');
});
