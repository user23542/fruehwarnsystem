import json
import unittest
import tempfile
from unittest.mock import patch
import shutil
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import check_sources
from check_sources import meaningful_text,feed_entries

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'site/data/assessment.json').read_text(encoding='utf-8'))

class DashboardTests(unittest.TestCase):
    def test_ten_indicators_and_unique_ids(self):
        self.assertEqual(10,len(DATA['indicators']))
        self.assertEqual(10,len({i['id'] for i in DATA['indicators']}))
        self.assertEqual({0,1,2,3,4,5},set(range(6)))
    def test_evidence_and_sources(self):
        ids={x['id'] for x in DATA['sources']}
        for i in DATA['indicators']:
            self.assertTrue(i['what'] and i['current'] and i['future'] and i['trigger'] and i['insufficient'] and i['protection'])
            self.assertTrue(i['sources'])
            self.assertTrue(set(i['sources'])<=ids)
            self.assertTrue(i['signal'] is None or i['signal'] in range(6))
        self.assertGreaterEqual(len(ids),10)
    def test_no_tracking_or_unverified_protocols(self):
        for s in DATA['sources']:
            self.assertTrue(s['url'].startswith('https://'))
            self.assertNotIn('utm_',s['url'].lower())
    def test_history_not_forecast(self):
        self.assertTrue(all(2026<=int(i['date'][:4])<=2026 for i in DATA['history']))
    def test_extractor_skips_scripts_nav(self):
        html=b'<html><nav>Do not score</nav><main><h1>Header</h1><p>Some normal article text that should be extracted and compared.</p><script>BAD()</script></main></html>'
        t=meaningful_text(html)
        self.assertIn('normal article',t)
        self.assertNotIn('Do not score',t)
        self.assertNotIn('BAD()',t)
    def test_automated_change_never_changes_editorial_risk(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp=Path(tmp)
            assessment_file=tmp/'assessment.json'
            monitor_file=tmp/'monitor.json'
            shutil.copy(ROOT/'site/data/assessment.json', assessment_file)
            shutil.copy(ROOT/'site/data/monitor.json', monitor_file)
            original=assessment_file.read_bytes()
            changed_page="<main><h1>Testmeldung</h1><p>Diese Seite enthält ausreichend Text für die automatisierte Quellenerkennung, ohne eine juristische oder politische Interpretation zu übernehmen. Im Fall einer Textänderung werden lediglich Recherchehinweise erzeugt.</p></main>"
            def fetch(url):
                if url.endswith('.rss'):
                    return b'<rss><channel></channel></rss>'
                addition=' Neuer Bericht mit geaendertem Text.' if modified[0] and 'freedomhouse.org' in url else ''
                return changed_page.replace('</main>',addition+'</main>').encode('utf-8')
            modified=[False]
            with patch.object(check_sources,'ASSESSMENT',assessment_file),patch.object(check_sources,'MONITOR',monitor_file):
                first=check_sources.check(now='2026-11-08T00:00:00Z',fetch=fetch)
                self.assertEqual(0,first['changedCount'])
                modified[0]=True
                second=check_sources.check(now='2026-11-09T00:00:00Z',fetch=fetch)
                self.assertEqual(1,second['changedCount'])
                self.assertTrue(any(e['kind']=='change' for e in second['events']))
                self.assertEqual(original,assessment_file.read_bytes())

    def test_feed_never_promotes_unrelated_news(self):
        xml=b'<rss><channel><item><title>Psychotherapie debattiert</title><link>https://www.bundestag.de/test1</link><guid>1</guid></item><item><title>Einladung zu einem Fest</title><link>https://www.bundestag.de/test2</link><guid>2</guid></item></channel></rss>'
        self.assertEqual(1,len(feed_entries(xml)))

if __name__=='__main__':unittest.main()
