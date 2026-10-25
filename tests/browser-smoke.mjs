import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('SHTAB-95');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return}
  if(!(await stat(file)).isFile()){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
  res.end(await readFile(file));
 }catch{res.writeHead(404).end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.locator('#start95').click();
 await page.locator('#smBrowser').waitFor({state:'visible'});
 await page.locator('#smBrowser').click();
 await page.locator('#doorsBrowser').waitFor({state:'visible'});
 assert.match(await page.locator('#dbPage').innerText(),/Welcome to DoorsNet/);
 await page.locator('#dbUrl').fill('doors://news.net');
 await page.locator('#dbForm button').click();
 assert.match(await page.locator('#dbPage').innerText(),/Daily Bulletin/);
 await page.locator('#dbBack').click();
 assert.match(await page.locator('#dbPage').innerText(),/Welcome to DoorsNet/);
 assert.deepEqual(errors,[],'Uncaught browser errors');
 console.log('Browser smoke test passed');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
