import {describe,it,expect} from 'vitest';
import {parseDemoSession,safeLoginReturn,MockAuthRepository} from '../src/finance/demo-auth';
import {base} from '../src/finance/routes';
describe('demo sign-in',()=>{
  it('returns only known prototype routes and preserves filters',()=>{
    expect(safeLoginReturn(base+'/orders?period=last7Days','vi')).toBe(base+'/orders?period=last7Days&lang=vi');
    expect(safeLoginReturn(base+'/workspaces/partnership/contracts','en')).toBe(base+'/workspaces/partnership/contracts?lang=en');
    for(const value of ['https://evil.example/path','//evil.example/path','javascript:alert(1)',base+'/login',base+'/unknown','/admin',base+'/../other'])expect(safeLoginReturn(value,'en')).toBe(base+'/overview?lang=en');
  });
  it('does not accept arbitrary stored sessions or credentials',()=>{
    expect(parseDemoSession('not json')).toBeNull();expect(parseDemoSession('{"demo":false}')).toBeNull();
    const auth=new MockAuthRepository();expect(()=>auth.loginEmail('not-demo@example.test','incorrect')).toThrow('authInvalidCredentials');
  });
});
