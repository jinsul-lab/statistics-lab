"""Read-only HIRA audit. Credentials remain in memory and are never output."""
import json, math, pathlib, re, sys, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
sys.stdout.reconfigure(encoding='utf-8')

root = pathlib.Path(__file__).resolve().parents[1]
html = (root / 'jinsulmap/jinsulmap.html').read_text(encoding='utf-8')
cfg = dict((m[0], m[2]) for m in re.findall(r"const\s+([A-Z_]+)\s*=\s*(['\"])([^'\"\r\n]*)\2", html))
beds = ['permSbdCnt','hghrSickbdCnt','stdSickbdCnt','aduChldSprmCnt','chldSprmCnt','nbySprmCnt','psydeptClsHigSbdCnt','psydeptClsGnlSbdCnt','psydeptOpenHigSbdCnt','psydeptOpenGnlSbdCnt','isnrSbdCnt','anvirTrrmSbdCnt','dtrmSbdCnt','ptrmCnt','soprmCnt','emymCnt','partumCnt']
def request(base, params):
    params = dict(serviceKey=cfg['HIRA_API_KEY'], pageNo='1', numOfRows='1000', _type='xml', **params)
    try:
        with urllib.request.urlopen(base+'?'+urllib.parse.urlencode(params), timeout=35) as r:
            doc=ET.fromstring(r.read())
        rows=[{c.tag:c.text or '' for c in row} for row in doc.findall('.//item')]
        code=doc.findtext('.//resultCode'); total=doc.findtext('.//totalCount')
        return rows, dict(resultCode=code,totalCount=total,receivedRows=len(rows),complete=code in ['00','0'] and total is not None and int(total)==len(rows))
    except Exception as e:
        return [], dict(error=type(e).__name__,complete=False)
def distance(a,b):
    dlat=math.radians(b[0]-a[0]); dlon=math.radians(b[1]-a[1]);
    x=math.sin(dlat/2)**2 + math.cos(math.radians(a[0]))*math.cos(math.radians(b[0]))*math.sin(dlon/2)**2
    return 6371000*2*math.atan2(math.sqrt(x),math.sqrt(1-x))
def safe(row):
    return {k:row.get(k) for k in ['yadmNm','addr','clCd','clCdNm','XPos','YPos','drTotCnt']}

result={'checkedAt':datetime.now(timezone.utc).isoformat(),'source':'HIRA official public API, live transport audit; not browser execution','queries':[],'fixtures':[]}
raw={}
for name in ['왕십리본정형외과','자세본재활의학과','서울마취통증의학과']:
    rows,meta=request(cfg['HIRA_HOSPITAL_API_BASE'],{'yadmNm':name})
    filtered=[r for r in rows if '성동구' in r.get('addr','')]
    result['queries'].append({'name':name,'completion':meta,'matches':[safe(r) for r in filtered]})
    for r in filtered: raw[r['yadmNm']]=r
    print(json.dumps(result['queries'][-1],ensure_ascii=False),flush=True)
anchor=next((v for k,v in raw.items() if '왕십리본' in k),None)
if anchor:
    center=(float(anchor['YPos']),float(anchor['XPos']))
    result['center']={'basis':'HIRA 왕십리본정형외과 location at 왕십리로320 (address-geocoder difference not yet measured)','lat':center[0],'lng':center[1]}
    scanned={}
    for code in ['05','06','09','21']:
        rows,meta=request(cfg['HIRA_HOSPITAL_API_BASE'],{'clCd':'31','dgsbjtCd':code,'xPos':center[1],'yPos':center[0],'radius':'1000'})
        scanned[code]={r.get('ykiho') for r in rows}
        print(json.dumps({'radiusSpecialty':code,'completion':meta,'targetNames':[r['yadmNm'] for r in rows if r.get('yadmNm') in raw]},ensure_ascii=False),flush=True)
    for name,row in raw.items():
        fixture={'clinicName':name,'clinicCode':row.get('clCd'),'clinicType':row.get('clCdNm'),'address':row.get('addr'),'lat':float(row['YPos']),'lng':float(row['XPos']),'distanceMetersFromAddressClinic':round(distance(center,(float(row['YPos']),float(row['XPos']))),1),'radius1000ReturnedDepartmentCodes':[c for c,keys in scanned.items() if row['ykiho'] in keys],'completion':{}}
        for kind,path,fields in [('specialists','getSpcSbjtSdrInfo2.8',['dgsbjtCd','dgsbjtCdNm','dtlSdrCnt']),('facilities','getEqpInfo2.8',beds),('departments','getDgsbjtInfo2.8',['dgsbjtCd','dgsbjtCdNm','dgsbjtPrSdrCnt'])]:
            rows,meta=request(cfg['HIRA_DETAIL_API_BASE']+'/'+path,{'ykiho':row['ykiho']})
            fixture[kind]=[{k:r[k] for k in fields if k in r} for r in rows]
            fixture['completion'][kind]=meta
        result['fixtures'].append(fixture)
        print(json.dumps(fixture,ensure_ascii=False),flush=True)
(root/'work/wangsimni-clinics-v378.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
