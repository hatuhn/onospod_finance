import {spawnSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const repository='hatuhn/onospod_finance-demo';
const site='https://hatuhn.github.io/onospod_finance-demo/';
function command(binary,args,cwd=process.cwd(),capture=false){const result=spawnSync(binary,args,{cwd,encoding:'utf8',stdio:capture?'pipe':'inherit'});if(result.status!==0)throw new Error(`${binary} failed: ${capture?result.stderr:''}`);return result.stdout;}
if(!existsSync('out/index.html')||!readFileSync('out/index.html','utf8').includes('/onospod_finance-demo/'))throw new Error('Run npm run build:pages before publishing');
const metadata=JSON.parse(command('gh',['repo','view',repository,'--json','nameWithOwner,isPrivate'],undefined,true));
if(metadata.nameWithOwner!==repository||metadata.isPrivate)throw new Error('Expected the dedicated public static demo repository');
const identity=JSON.parse(command('gh',['api','user','--jq','{login,id}'],undefined,true));
const directory=mkdtempSync(join(tmpdir(),'onospod-pages-'));
command('git',['clone','--depth','1','https://github.com/'+repository+'.git',directory]);
for(const entry of readdirSync(directory))if(entry!=='.git')rmSync(join(directory,entry),{recursive:true,force:true});
for(const entry of readdirSync('out'))cpSync(resolve('out',entry),join(directory,entry),{recursive:true});
mkdirSync(join(directory,'.github/workflows'),{recursive:true});
cpSync('scripts/pages_workflow.yml',join(directory,'.github/workflows/pages.yml'));
writeFileSync(join(directory,'README.md'),`# Onos demo\n\nPublic static preview: ${site}\n\nGenerated HTML, JavaScript, CSS and synthetic demo data only. The application source repository remains private. Email and Google sign-in are local demo flows; no live backend or real transactions are connected.\n`);
command('git',['config','user.name',identity.login],directory);
command('git',['config','user.email',`${identity.id}+${identity.login}@users.noreply.github.com`],directory);
command('git',['add','.'],directory);
const diff=spawnSync('git',['diff','--cached','--quiet'],{cwd:directory});
if(diff.status===0){console.log('Static preview is already up to date');process.exit(0);}
command('git',['commit','-m','deploy: publish Onos static demo'],directory);
command('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:main'],directory);
console.log(`Published static assets. Check GitHub Actions to confirm deployment: ${site}`);
