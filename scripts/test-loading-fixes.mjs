import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, mocks={}, globals={}) {
  const exports={};
  const compiled=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compiled,{exports,require:id=>{if(id in mocks)return mocks[id];throw Error('Unexpected import '+id);},process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test'}},Response,AbortController,setTimeout,clearTimeout,console,...globals});
  return exports;
}
const plain=x=>JSON.parse(JSON.stringify(x));
const pool=load('lib/in-flight-read.ts');
let actor='a',token='token-a',calls=[],following=['target'],fail=false;
const follow=load('lib/follows.ts',{
  '@/lib/in-flight-read':pool,
  '@/lib/profile-store':{getCurrentUser:async()=>actor?{id:actor}:null,getProfileByUserId:async id=>({user_id:id,username:id}),getSupabaseAccessToken:async()=>token},
  '@/lib/profile-config':{},'@/lib/notifications':{},'@/lib/achievement-email-notifications':{}
},{fetch:async(url,options)=>{calls.push({url,options});await new Promise(r=>setTimeout(r,5));if(fail)throw Error('offline');const q=new URL(url).searchParams;const offset=Number(q.get('offset')||0);return Response.json(following.slice(offset,offset+1000).map(following_id=>({following_id})));}});
const states=await Promise.all(Array.from({length:40},(_,i)=>follow.getFollowButtonState({userId:i===0?'target':'other-'+i})));
assert.equal(calls.length,1,'forty feed buttons share one following read');assert.equal(states[0].isFollowing,true);assert.equal(states[1].isFollowing,false);
assert.equal((await follow.getFollowButtonState({userId:'a'})).isOwnProfile,true);
following=[];assert.equal((await follow.getFollowButtonState({userId:'target'})).isFollowing,false,'completed reads are never stale-cached');
actor=null;token=null;const before=calls.length;assert.equal((await follow.getFollowButtonState({userId:'target'})).isFollowing,false);assert.equal(calls.length,before,'signed-out buttons need no relationship queries');
actor='b';token='token-b';following=Array.from({length:1001},(_,i)=>'person-'+i);assert.equal((await follow.getFollowButtonState({userId:'person-1000'})).isFollowing,true,'following pages are not truncated');
assert.equal(calls.at(-1).options.headers.Authorization,'Bearer token-b');
fail=true;assert.equal((await follow.getFollowButtonState({userId:'target'})).isFollowing,false);fail=false;following=['target'];assert.equal((await follow.getFollowButtonState({userId:'target'})).isFollowing,true,'failed reads can retry');
console.log('PASS: follow batching, fresh reads, self/signed-out state, pagination, session scoping, and retry.');

function statsHarness() {
 let cached, failures=false;const requests=[];
 const stats=load('lib/site-stats.ts',{'server-only':{},'next/cache':{unstable_cache:fn=>async()=>{if(cached)return cached;const result=await fn();cached=result;return result;}}},{console:{error:()=>{}},fetch:async url=>{requests.push(url);if(failures)return new Response('unavailable',{status:503});const u=new URL(url);if(u.pathname.endsWith('/ratings')){assert.ok(!u.searchParams.get('select').includes('user_id'));return Response.json([{id:'legacy',movie_id:'2',ratings:{story:5},weights:[{key:'story',weight:1}]}]);}const base={movie_id:'1',user_id:'a',ratings:{story:5},weights:[{key:'story',weight:1}]};return Response.json(u.searchParams.get('offset')==='0'?Array.from({length:1000},(_,i)=>({...base,id:String(i)})):[{...base,id:'last',movie_id:'3',user_id:'b'},{...base,id:'incomplete',movie_id:'4',weights:[]}]);}});
 return {stats,requests,setFail:value=>{failures=value;}};
}
const h=statsHarness();assert.deepEqual(plain(await h.stats.getSiteEngagementTotals()),{totalRatings:3,totalMoviesRated:3});assert.equal(h.requests.length,3);await h.stats.getSiteEngagementTotals();assert.equal(h.requests.length,3,'successful aggregate cache avoids repeated scans');
const failure=statsHarness();failure.setFail(true);assert.deepEqual(plain(await failure.stats.getSiteEngagementTotals()),{totalRatings:0,totalMoviesRated:0});failure.setFail(false);assert.deepEqual(plain(await failure.stats.getSiteEngagementTotals()),{totalRatings:3,totalMoviesRated:3},'an error does not poison the cache with zero or partial totals');
console.log('PASS: exact totals, incomplete exclusion, deduplication, pagination, legacy schema, successful caching, and failure recovery.');

let edges=[],events=0,notifications=0,localWrites=0;
const mutable=load('lib/follows.ts',{
  '@/lib/in-flight-read':pool,
  '@/lib/profile-store':{getCurrentUser:async()=>({id:'viewer'}),getProfileByUserId:async id=>({user_id:id,username:id}),getSupabaseAccessToken:async()=> 'viewer-token'},
  '@/lib/profile-config':{},'@/lib/notifications':{createNotification:async()=>{notifications++;}},'@/lib/achievement-email-notifications':{checkAchievementEmails:async()=>{}}
},{Event,window:{dispatchEvent:()=>{events++;},setTimeout,localStorage:{getItem:()=>null,setItem:()=>{localWrites++;}}},fetch:async(url,options)=>{
 if(String(url).startsWith('/api/'))return Response.json({ok:true});
 const q=new URL(url).searchParams;
 if(options.method==='POST'){edges.push({...JSON.parse(options.body),id:'edge',created_at:'2026-10-04'});return new Response(null,{status:201});}
 const matches=row=>['follower_id','following_id'].every(key=>!q.has(key)||q.get(key)==='eq.'+row[key]);
 if(options.method==='DELETE'){edges=edges.filter(row=>!matches(row));return new Response(null,{status:204});}
 return Response.json(edges.filter(matches));
}});
const target={userId:'target',username:'target'};
assert.equal((await mutable.toggleFollow(target)).isFollowing,true);
assert.equal((await mutable.getFollowSummary(target)).followersCount,1);
assert.equal((await mutable.getFollowButtonState(target)).isFollowing,true);
assert.equal((await mutable.toggleFollow(target)).isFollowing,false);
assert.equal((await mutable.getFollowSummary(target)).followersCount,0);
assert.equal((await mutable.getFollowButtonState(target)).isFollowing,false);
await assert.rejects(mutable.toggleFollow({userId:'viewer'}),/cannot follow yourself/);
assert.equal(notifications,1);assert.equal(localWrites,0,'empty successful writes must not trigger offline fallback');assert.equal(events,2);
console.log('PASS: follow/unfollow mutations, profile counts, button refresh, notification, self-follow protection, empty success responses.');
