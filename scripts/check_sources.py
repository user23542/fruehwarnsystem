#!/usr/bin/env python3
"""Periodically checks curated pages for changes; never modifies editorial risk scores."""
from __future__ import annotations
import datetime as dt
import hashlib
from html.parser import HTMLParser
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSESSMENT = ROOT / 'site/data/assessment.json'
MONITOR = ROOT / 'site/data/monitor.json'
SOURCE_IDS = (
    's_eu','s_fh','s_berlinwahl','s_spd','s_sbgg','s_ilga','s_bptk','s_bptk_oct',
    's_vdek','s_bka','s_berlinpmk','s_reachout','s_datenschutz',
    's_ibb','s_destatis','s_youreurope'
)
BUNDESTAG_RSS = 'https://www.bundestag.de/static/appdata/includes/rss/pressemitteilungen.rss'
KEYWORDS = re.compile(r'(demokrat|rechtss?taat|gerichts?|psychotherap|psychiatri|menschenrecht|polizei|extremis|überwach|diskriminier|geschlecht|queer|transsex|krankenkass|wohnen|miet|sozial|armut|migration|haushalt|gewalt|verfassungs|selbstbestimm|zivilgesellschaft)',re.I)
MAX_RESPONSE_BYTES = 1_500_000

class TextExtractor(HTMLParser):
    """Best-effort main/article text extraction without interpreting foreign HTML."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]
        self.parts=[]
        self.skip=0
        self.main_depth=0
        self.article_parts=[]
    def handle_starttag(self,tag,attrs):
        tag=tag.lower();self.stack.append(tag)
        if tag in ('script','style','noscript','svg','nav','footer','header','form'):
            self.skip+=1
        if tag in ('main','article'):
            self.main_depth+=1
    def handle_endtag(self,tag):
        tag=tag.lower()
        if tag in ('main','article') and self.main_depth:self.main_depth-=1
        if tag in ('script','style','noscript','svg','nav','footer','header','form') and self.skip:self.skip-=1
        if self.stack:
            # Many official web pages use imperfect markup; recover on the latest occurrence.
            if tag in self.stack:
                self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]
    def handle_data(self,text):
        clean=' '.join(text.split())
        if not clean or self.skip:return
        self.parts.append(clean)
        if self.main_depth:self.article_parts.append(clean)

def meaningful_text(page: bytes)->str:
    parser=TextExtractor()
    parser.feed(page.decode('utf-8',errors='replace'))
    text=' '.join(parser.article_parts if len(' '.join(parser.article_parts))>200 else parser.parts)
    text=re.sub(r'\s+',' ',text).strip()
    return text[:200_000]

def request_bytes(url:str)->bytes:
    req=urllib.request.Request(url,headers={'User-Agent':'Fruehwarnsystem/1.0 (+monthly-public-source-check; no personal data)','Accept':'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.7'})
    with urllib.request.urlopen(req,timeout=22) as response:
        raw=response.read(MAX_RESPONSE_BYTES+1)
    if len(raw)>MAX_RESPONSE_BYTES:raise ValueError('Quelldokument überschreitet das Größenlimit')
    return raw

def feed_entries(xml:bytes):
    root=ET.fromstring(xml)
    results=[]
    for e in root.findall('.//item')[:40]:
        title=' '.join((e.findtext('title') or '').split())
        link=(e.findtext('link') or '').strip()
        ident=(e.findtext('guid') or link or title).strip()
        if title and link.startswith('https://') and KEYWORDS.search(title):
            results.append({'title':title,'url':link,'id':ident})
    return results

def check(now=None,fetch=request_bytes):
    now=now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
    assessment=json.loads(ASSESSMENT.read_text(encoding='utf-8'))
    previous=json.loads(MONITOR.read_text(encoding='utf-8'))
    available={x['id']:x for x in assessment['sources']}
    older={x['id']:x for x in previous.get('sources',[]) if 'id' in x}
    results=[];events=[];changed=0;errors=0
    for id in SOURCE_IDS:
        item=available[id]
        prior=older.get(id,{})
        result={'id':id,'title':item['title'],'url':item['url'],'status':'ok','checkedAt':now,'lastSuccess':prior.get('lastSuccess')}
        try:
            page=fetch(item['url'])
            text=meaningful_text(page)
            if len(text)<100:raise ValueError('Seite enthält nicht genügend extrahierbaren Text')
            fingerprint=hashlib.sha256(text.encode('utf-8')).hexdigest()
            result.update({'fingerprint':fingerprint,'lastSuccess':now})
            if prior.get('fingerprint') and prior['fingerprint']!=fingerprint:
                changed+=1
                events.append({'kind':'change','detectedAt':now[:10],'title':item['title'],'url':item['url'],'note':'Inhalt der beobachteten Webseite hat sich geändert. Grund und Bedeutung sind noch nicht redaktionell geprüft.'})
        except Exception as ex:
            errors+=1
            result.update({'status':'error','fingerprint':prior.get('fingerprint'),'error':str(ex)[:150]})
            if prior.get('status')!='error':
                events.append({'kind':'error','detectedAt':now[:10],'title':item['title'],'url':item['url'],'note':'Die Quelle war bei dieser technischen Prüfung nicht erreichbar. Das ist kein inhaltlicher Lageindikator.'})
        results.append(result)
    feed_seen=previous.get('feedSeen',[])
    try:
        rss=feed_entries(fetch(BUNDESTAG_RSS))
        new=[x for x in rss if x['id'] not in feed_seen] if feed_seen else []
        for item in new[:8]:
            changed+=1
            events.append({'kind':'change','detectedAt':now[:10],'title':item['title'],'url':item['url'],'note':'Neuer thematisch passender Bundestag-RSS-Eintrag. Die tatsächliche Relevanz ist noch nicht geprüft.'})
        feed_seen=list(dict.fromkeys([x['id'] for x in rss]+feed_seen))[:120]
    except Exception as ex:
        errors+=1
        if previous.get('feedStatus')!='error':
            events.append({'kind':'error','detectedAt':now[:10],'title':'Pressemitteilungen des Deutschen Bundestages (RSS)','url':BUNDESTAG_RSS,'note':'Feed konnte nicht abgerufen werden: '+str(ex)[:130]})
        feed_status='error'
    else:
        feed_status='ok'
    # Compact deduplication prevents noisy repeated failures filling the feed.
    combined=events+previous.get('events',[])
    unique=[];ids=set()
    for e in combined:
        k=(e.get('kind'),e.get('title'),e.get('detectedAt'))
        if k in ids:continue
        ids.add(k);unique.append(e)
        if len(unique)>=40:break
    record={
        'schemaVersion':1,'checkedAt':now,'runStatus':'completed','checkedCount':len(SOURCE_IDS)+1,
        'changedCount':changed,'errorCount':errors,'sources':results,'events':unique,
        'feedSeen':feed_seen,'feedStatus':feed_status,
        'note':'Diese technische Prüfung meldet nur Änderungen und Abruffehler. Sie bewertet weder neue Gesetze noch eine individuelle Gefahr; die redaktionelle Stufe bleibt gesondert.'
    }
    MONITOR.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return record

if __name__=='__main__':
    result=check()
    print(f"Quellencheck abgeschlossen: {result['checkedCount']} Quellen, {result['changedCount']} Änderungen, {result['errorCount']} Fehler.")
    # Individual failures do not silently stop the site deployment. Status is shown in the app.
