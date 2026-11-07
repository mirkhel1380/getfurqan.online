"""Import selected, unchanged rows from versioned official HadeethEnc exports.

Requires openpyxl. --refresh downloads fresh official XLSX files before importing.
The export's first cell/version notice stays verbatim in each published JSON file.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse, datetime, hashlib, json, re, urllib.request
import openpyxl

LANGS=['en','prs','ps','fa','de','nl','fr','it','ur','tr','es','pt','id']
IDS=['4560','4563','5907','5913','3591','4196','4319','4965','5512','4709','5346','5351']
FIELDS=['id','title_ar','title','hadith_text_ar','hadith_text','explanation_ar','explanation','benefits_ar','benefits','grade_ar','takhrij_ar','grade','takhrij','lang','link']
URL='https://hadeethenc.com/en/browse/download/'
parser=argparse.ArgumentParser();parser.add_argument('--source-directory',default='../hadeethenc-source');parser.add_argument('--refresh',action='store_true');args=parser.parse_args()
cache=Path(args.source_directory);cache.mkdir(parents=True,exist_ok=True)
if args.refresh:
 def download(lang):
  req=urllib.request.Request(URL+lang,headers={'User-Agent':'Mozilla/5.0'})
  raw=urllib.request.urlopen(req,timeout=45).read()
  if not raw.startswith(b'PK'):raise ValueError('Not a published XLSX: '+lang)
  (cache/(lang+'.xlsx')).write_bytes(raw)
 with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(download,LANGS))
snapshots={};catalog={'publisher':'HadeethEnc.com','checked_at':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'ids':IDS,'editions':{}}
for lang in LANGS:
 path=cache/(lang+'.xlsx');raw=path.read_bytes();workbook=openpyxl.load_workbook(path,read_only=True,data_only=False);rows=workbook.active.iter_rows(values_only=True)
 notice=next(rows)[0];fields=list(next(rows));assert fields==FIELDS,(lang,fields)
 version=re.search(r'# Last update: ([^\r\n]+?) \((v[0-9]+(?:\.[0-9]+)+)\)',notice);assert version,lang
 update=re.search(r'# Check for updates: (\S+)',notice);assert update and update[1].startswith('https://hadeethenc.com/en/check/'+lang+'/')
 records={}
 for row in rows:
  key=str(row[0])
  if key not in IDS:continue
  assert key not in records,(lang,key,'duplicate ID')
  record=dict(zip(fields,row));assert record['lang']==lang and record['link']=='https://hadeethenc.com/'+lang+'/browse/hadith/'+key
  for field in ['title','hadith_text_ar','hadith_text','explanation','grade','takhrij']:
   assert isinstance(record[field],str) and record[field].strip() and '\ufffd' not in record[field],(lang,key,field)
  records[key]=record
 assert set(records)==set(IDS),(lang,'missing selected entries')
 metadata={'language':lang,'version':version[2],'updated_at':version[1],'notice':notice,'updates_url':update[1],'download_url':URL+lang,'export_sha256':hashlib.sha256(raw).hexdigest()}
 snapshots[lang]={'source':metadata,'records':{key:records[key] for key in IDS}}
 catalog['editions'][lang]={k:v for k,v in metadata.items() if k!='notice'}
out=Path('dist/content/hadeethenc');out.mkdir(parents=True,exist_ok=True)
for lang,data in snapshots.items():(out/(lang+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(out/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(IDS),'selected reports ×',len(LANGS),'published language editions, including complete version notices and unchanged source fields.')
