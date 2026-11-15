import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {onRequest} from '../functions/_middleware.js';
const fallback=fs.readFileSync(new URL('../_headers',import.meta.url),'utf8').split('\n').find(line=>line.includes('Content-Security-Policy:')&&line.includes('cdn.whop.com')).split('Content-Security-Policy: ')[1];
async function policy(path) {
 return onRequest({request:new Request('https://preview.example'+path),env:{},next:async()=>new Response('<!doctype html><html></html>',{headers:{'Content-Type':'text/html','Content-Security-Policy':"script-src 'self'"}})});
}
test('Pages middleware preserves scoped Elements CSP on both VIP URL forms',async()=>{
 for(const path of ['/whop-vip-preview','/whop-vip-preview.html','/whop-vip-preview/']) {
  const response=await policy(path);const csp=response.headers.get('Content-Security-Policy');
  assert.match(csp,/'nonce-[^']+'/);assert.equal(csp.replace(/ 'nonce-[^']+'/g,''),fallback);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
 }
});
test('other pages never receive Whop/payment-provider CSP permissions',async()=>{
 for(const path of ['/p/product','/info','/whop-vip-preview-unrelated']) {
  const response=await policy(path);assert.doesNotMatch(response.headers.get('Content-Security-Policy'),/whop|paypal|braintree/);
 }
});
