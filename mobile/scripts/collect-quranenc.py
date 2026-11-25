"""Capture selected publisher responses verbatim and audit reference completeness."""
import base64, concurrent.futures, hashlib, json, re, sys, time, urllib.request, urllib.error
from pathlib import Path

mobile=Path(__file__).resolve().parents[1]
cache=mobile/'.cache/installed-quranenc'; cache.mkdir(parents=True,exist_ok=True)
output=mobile/'artifacts/quranenc-audit'; output.mkdir(parents=True,exist_ok=True)
def record_failure(kind,error,traceback):
    report={'state':'failed','error_type':kind.__name__,'error':str(error),'entire_app_offline':False}
    (output/'failure.json').write_text(json.dumps(report,indent=2)+'\n')
    sys.__excepthook__(kind,error,traceback)
sys.excepthook=record_failure
counts={row['id']:row['verses_count'] for row in json.loads((mobile/'src/offline-catalog.json').read_text())['chapters']}
translations=['english_saheeh','dari_badkhashani','pashto_rwwad','persian_ih','german_rwwad','dutch_center','french_rashid','urdu_junagarhi','turkish_rwwad','spanish_garcia','portuguese_nasr','indonesian_affairs','french_mokhtasar','spanish_mokhtasar','pashto_mokhtasar','chinese_mokhtasar','hindi_mokhtasar']
tafsirs=['persian_saadi','arabic_saadi','urdu_saadi','turkish_saadi','indonesian_saadi','russian_saadi','swahili_saadi']
base='https://quranenc.com/api/v1/'

def get(file,url,as_json=True):
    target=cache/file
    if target.exists():
        raw=target.read_bytes()
        if as_json: json.loads(raw)
        return raw
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url,timeout=50) as response:
                raw=response.read(50*1024*1024+1)
            if len(raw)>50*1024*1024: raise ValueError('Oversized source')
            if as_json: json.loads(raw)
            temporary=target.with_suffix(target.suffix+'.tmp')
            temporary.write_bytes(raw); temporary.replace(target)
            return raw
        except urllib.error.HTTPError as error:
            if error.code not in (429,500,502,503,504) or attempt==3: raise
            try: delay=int(error.headers.get('Retry-After','5'))
            except ValueError: delay=5
            time.sleep(min(max(delay,1),45))
        except (TimeoutError,OSError):
            if attempt==3: raise
            time.sleep(2)

def receipt(file,url,raw,**extra):
    return {'file':file,'url':url,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),**extra}

metadata=[]; versions={}
for kind in ['translations','tafsirs']:
    url=base+('translations/list?localization=en' if kind=='translations' else 'tafsirs/list')
    raw=get(kind+'.json',url)
    metadata.append(receipt(kind+'.json',url,raw,kind='metadata'))
    for row in json.loads(raw)[kind]: versions[row['key']]=row['version']
# Current reviewed UI versions for the publisher's separate Mukhtasar API entries.
versions.update({key:'1.0.0' for key in translations if key.endswith('_mokhtasar')})
dashboard=get('dashboard.html','https://quranenc.com/dashboard/',False).decode()
plain=re.sub(r'<[^>]+>',' ',dashboard)
match=re.search(r'dari_badkhashani.{0,400}?(\d+\.\d+\.\d+)',plain,re.S)
if not match: raise ValueError('Publisher Dari edition version could not be verified')
versions['dari_badkhashani']=match.group(1)

jobs=[('tafsir',key,None) for key in tafsirs]+[('translation',key,c) for key in translations for c in counts]

def run(job):
    kind,key,chapter=job
    file=f'{key}-{chapter}.json' if chapter else key+'.json'
    url=base+(f'translation/sura/{key}/{chapter}' if chapter else f'tafsir/range/{key}/1/1/114/6')
    try:
        raw=get(file,url); data=json.loads(raw); rows=data.get('result')
        assert isinstance(rows,list),'Missing publisher rows'
        if kind=='translation':
            assert len(rows)==counts[chapter],f'{len(rows)} rows, expected {counts[chapter]}'
            for number,row in enumerate(rows,1):
                assert int(row['sura'])==chapter and int(row['aya'])==number
                assert isinstance(row['translation'],str) and row['translation'].strip(),f'Empty translation {chapter}:{number}'
                assert row['footnotes'] is None or isinstance(row['footnotes'],str)
                assert isinstance(row.get('arabic_text'),str) and row['arabic_text'].strip()
            return receipt(file,url,raw,kind=kind,edition=key,chapter=chapter,version=versions[key],records=len(rows))
        seen=set(); covered=set()
        for row in rows:
            assert row['id'] not in seen; seen.add(row['id'])
            c=int(row['sura']); start=int(row['from_aya']); end=int(row['to_aya'])
            assert c in counts and 1<=start<=end<=counts[c]
            assert row['text'] is None or isinstance(row['text'],str)
            if row['text'] and row['text'].strip(): covered.update((c,v) for v in range(start,end+1))
        assert len(covered)==6236,f'{len(covered)} covered references'
        return receipt(file,url,raw,kind=kind,edition=key,version=versions[key],records=len(rows),coveredVerses=len(covered),emptySourceBlocks=sum(not (row['text'] or '').strip() for row in rows))
    except Exception as error:
        return {'kind':kind,'edition':key,'chapter':chapter,'error':type(error).__name__+': '+str(error)}

results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for row in pool.map(run,jobs):
        results.append(row)
        if len(results)%100==0:
            print(json.dumps({'checked':len(results),'total':len(jobs),'failed':sum('error' in item for item in results)}),flush=True)
errors=[row for row in results if 'error' in row]
blocked=sorted({row['edition'] for row in errors})
files=metadata+[row for row in results if 'error' not in row and row['edition'] not in blocked]
lock={'schema':1,'source':'https://quranenc.com','terms':'https://quranenc.com/en/home/about','retrieved':'2026-11-25','translations':[key for key in translations if key not in blocked],'tafsirs':[key for key in tafsirs if key not in blocked],'blocked':blocked,'files':files}
encoded=(json.dumps(lock,ensure_ascii=False,indent=2)+'\n').encode()
(mobile/'installed-quranenc-lock.json').write_bytes(encoded)
(output/'installed-quranenc-lock.json').write_bytes(encoded)
report={'blocked':blocked,'errors':errors,'responses':len(results),'files':len(files),'bytes':sum(row['bytes'] for row in files),'manifest_sha256':hashlib.sha256(encoded).hexdigest(),'source_prose_modified':False,'entire_app_offline':False}
(output/'source-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('AUDIT_SUMMARY '+json.dumps(report),flush=True)
# Public source identifiers and hashes only, never scripture or credentials.
# These chunks let the owner retain the exact manifest without an executor.
chunks=[encoded[i:i+6000] for i in range(0,len(encoded),6000)]
for index,chunk in enumerate(chunks):
    print('LOCKCHUNK '+str(index)+'/'+str(len(chunks))+' '+base64.b64encode(chunk).decode(),flush=True)
if errors: raise SystemExit('A selected edition is incomplete or unavailable; review source-audit.json before release')
