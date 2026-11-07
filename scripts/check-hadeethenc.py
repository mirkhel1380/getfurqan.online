"""Verify every displayed selection against the publisher's versioned XLSX."""
from pathlib import Path
import argparse, hashlib, json, re
import openpyxl
p=argparse.ArgumentParser();p.add_argument('--source-directory',default='../hadeethenc-source');args=p.parse_args()
r=Path('dist/content/hadeethenc');catalog=json.loads((r/'catalog.json').read_text());languages=['en','prs','ps','fa','de','nl','fr','it','ur','tr','es','pt','id']
assert list(catalog['editions'])==languages and len(catalog['ids'])==len(set(catalog['ids']))==12
checks=[]
for language in languages:
 data=json.loads((r/(language+'.json')).read_text());source=data['source'];path=Path(args.source_directory)/(language+'.xlsx')
 assert source['language']==language and source['version']==catalog['editions'][language]['version']
 assert hashlib.sha256(path.read_bytes()).hexdigest()==source['export_sha256']==catalog['editions'][language]['export_sha256']
 workbook=openpyxl.load_workbook(path,read_only=True,data_only=False);rows=workbook.active.iter_rows(values_only=True)
 assert next(rows)[0]==source['notice'];fields=list(next(rows));found={}
 for row in rows:
  if str(row[0]) in catalog['ids']:found[str(row[0])]=dict(zip(fields,row))
 assert set(found)==set(data['records'])==set(catalog['ids'])
 for key,record in found.items():
  assert record==data['records'][key],(language,key,'source was altered')
  assert record['lang']==language and record['link']=='https://hadeethenc.com/'+language+'/browse/hadith/'+key
  assert all(isinstance(record[field],str) and record[field].strip() for field in ['hadith_text_ar','hadith_text','explanation','grade','takhrij'])
 checks.append({'language':language,'source_version':source['version'],'reports':len(found),'all_export_fields_equal':True,'notice_preserved':True,'export_sha256':source['export_sha256']})
page=Path('dist/hadith-translations.html').read_text();js=Path('dist/hadeethenc.js').read_text()
for id in re.findall(r'id="(selected-(?:title|list|arabic[^\"]*|text|explanation|benefits|grade|reference|notice))"',page):
 assert re.search(r'id="'+id+r'"[^>]*data-i18n-ignore',page),(id,'published source must be protected from interface translation')
for field in ['hadith_text_ar','hadith_text','explanation_ar','explanation','benefits_ar','benefits','grade_ar','grade','takhrij_ar','takhrij']:assert "'"+field+"'" in js,field
assert '.innerHTML' not in js and 'speechSynthesis' not in js
Path('docs/hadeethenc-import-checks.json').write_text(json.dumps({'checked_at':catalog['checked_at'],'selection_count':12,'checks':checks,'scope':'Exact equality to official export cells and source metadata; not independent scholarly certification.'},indent=2)+'\n')
print('PASS: 156 published selections equal all15 original source fields; distinct Dari/Pashto/Persian, publisher versions/notices/export hashes, protected source prose and no synthesized speech.')
