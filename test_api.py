import csv
import io
import pytest
from fastapi.testclient import TestClient
import main

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB', str(tmp_path / 'test.sqlite3'))
    monkeypatch.delenv('LLM_API_KEY', raising=False)
    monkeypatch.delenv('LLM_API_URL', raising=False)
    with TestClient(main.app) as client:
        yield client

def create_req(c, pid=1):
    return c.post(f'/api/projects/{pid}/requirements', json=dict(title='Authorization check',description='Restrict admin access',criteria='Deny access to customers',priority='High')).json()

def create_test(c,rid):
    return c.post('/api/tests',json=dict(requirement_id=rid,title='Reject customer',category='Negative',steps='Sign in as customer and open admin',expected='Access denied')).json()

def test_crud_results_and_report(client):
    c=client
    initial=c.get('/api/projects/1/workspace').json()
    assert initial['stats']['Passed']==0 and initial['stats']['Not Run']==4
    r=create_req(c); rid=r['id']
    assert any(f['requirement_id']==rid and f['kind']=='No linked tests' for f in c.get('/api/projects/1/workspace').json()['findings'])
    t=create_test(c,rid); tid=t['id']
    assert t['status']=='Not Run'
    assert c.put(f'/api/tests/{tid}/result',json={'status':'Passed','evidence':'  '}).status_code==422
    assert c.put(f'/api/tests/{tid}/result',json={'status':'Failed','evidence':'Test fixture: customer received admin data in local build.'}).status_code==200
    d=c.get('/api/projects/1/workspace').json()
    assert d['stats']['Failed']==1
    assert any(f['requirement_id']==rid and f['kind']=='Failed test' for f in d['findings'])
    assert c.put(f'/api/tests/{tid}/result',json={'status':'Passed','evidence':'Test fixture: local build returned access denied.'}).status_code==200
    updated={k:t[k] for k in ['requirement_id','title','category','steps','expected']}
    updated['title']='Updated test'
    assert c.put(f'/api/tests/{tid}',json=updated).json()['status']=='Not Run'
    payload={k:r[k] for k in ['title','description','criteria','priority']}
    payload['title']='=CSV formula protection'
    assert c.put(f'/api/requirements/{rid}',json=payload).status_code==200
    report=c.get('/api/projects/1/report.csv')
    rows=list(csv.reader(io.StringIO(report.text)))
    assert ['requirements','6'] in rows
    assert "'=CSV formula protection" in report.text
    assert c.delete(f'/api/tests/{tid}').status_code==200
    create_test(c,rid)
    assert c.delete(f'/api/requirements/{rid}').status_code==200
    assert c.get('/api/projects/1/workspace').json()['stats']==initial['stats']

def test_validation_upload_and_fallback(client):
    c=client
    assert c.post('/api/projects',json={'name':'   '}).status_code==422
    assert c.post('/api/projects/999/requirements',json=dict(title='x',description='y',criteria='z')).status_code==404
    assert c.post('/api/tests',json=dict(requirement_id=999,title='x',steps='y',expected='z')).status_code==404
    for name,content,code in [('bad.exe',b'hi',422),('big.py',b'a'*100001,413),('binary.py',b'\xff',422),('empty.py',b'',422),('null.py',b'a\x00',422)]:
        assert c.post('/api/projects/1/sources',files={'file':(name,content)}).status_code==code
    source=c.post('/api/projects/1/sources',files={'file':('cart.py',b'def cart():\n    return 1')}).json()
    listed=c.get('/api/projects/1/sources').json()
    assert listed[0]['matches'][0]['excerpts'][0]['line']==1
    assert c.delete(f"/api/sources/{source['id']}").status_code==200
    r=create_req(c)
    suggestions=c.post(f"/api/requirements/{r['id']}/suggestions").json()
    assert suggestions['mode']=='Basic templates · AI unavailable'
    assert len(suggestions['suggestions'])==4
    assert c.get('/api/projects/1/workspace').json()['stats']['tests']==4

def test_restart_and_project_deletion(client):
    c=client
    project=c.post('/api/projects',json={'name':'Persistent project'}).json()
    r=create_req(c,project['id'])
    # Re-run startup against the same disk database, as a new process does.
    main.init()
    with TestClient(main.app) as restarted:
        assert restarted.get(f"/api/projects/{project['id']}/workspace").json()['requirements'][0]['id']==r['id']
        assert len(restarted.get('/api/projects').json())==2
    assert c.delete(f"/api/projects/{project['id']}").status_code==200
    assert c.get(f"/api/projects/{project['id']}/workspace").status_code==404
    assert c.post('/api/sample').status_code==201

def test_provider_failure_falls_back(client, monkeypatch):
    monkeypatch.setenv('LLM_API_KEY','test-key')
    monkeypatch.setenv('LLM_API_URL','https://provider.invalid/chat')
    async def fail(*args,**kwargs):
        raise main.httpx.ConnectError('unavailable')
    monkeypatch.setattr(main.httpx.AsyncClient,'post',fail)
    result=client.post('/api/requirements/1/suggestions').json()
    assert result['mode']=='Basic templates · AI request failed'
