import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('out');const prefix=process.env.PAGES_BASE_PATH||'/onospod_finance-demo';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon'};
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname===prefix){res.writeHead(302,{location:prefix+'/'});res.end();return;}
    if(!url.pathname.startsWith(prefix+'/'))throw new Error('Not found');
    let file=resolve(root,'.'+decodeURIComponent(url.pathname.slice(prefix.length)));
    if(file!==root&&!file.startsWith(root+'/'))throw new Error('Not found');
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
}).listen(3200,'127.0.0.1',()=>console.log('Static Pages preview on http://127.0.0.1:3200'+prefix+'/'));
