"""Build role-qualified UN193 capitals, reviewed 2026-10-16.
Natural Earth populated places baseline is embedded for offline reproducibility.
Coordinates are approximate city markers, not sovereignty or boundary assertions.
"""
import json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parent
CHECKED='2026-10-16'
BASELINE='https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_populated_places.geojson'
BASE=[['SM', 'San Marino', 'サンマリノ市', 12.44177, 43.936096], ['LI', 'Vaduz', 'ファドゥーツ', 9.51667, 47.133724], ['LU', 'Luxembourg', 'ルクセンブルク市', 6.130003, 49.61166], ['FM', 'Palikir', 'パリキール', 158.149974, 6.916644], ['MH', 'Majuro', 'マジュロ', 171.38, 7.103004], ['TV', 'Funafuti', 'フナフティ島', 179.216647, -8.516652], ['PW', 'Melekeok', 'マルキョク州', 134.626549, 7.487396], ['MC', 'Monaco', 'モナコ', 7.406913, 43.739646], ['KI', 'South Tarawa', 'サウス・タラワ', 173.017571, 1.338188], ['KM', 'Moroni', 'モロニ', 43.240244, -11.704158], ['AD', 'Andorra la Vella', 'アンドラ・ラ・ベリャ', 1.516486, 42.500001], ['TT', 'Port of Spain', 'ポートオブスペイン', -61.517031, 10.651997], ['RW', 'Kigali', 'キガリ', 30.058586, -1.951644], ['SZ', 'Mbabane', 'ムババーネ', 31.133335, -26.316651], ['SI', 'Ljubljana', 'リュブリャナ', 14.514969, 46.055288], ['SK', 'Bratislava', 'ブラチスラヴァ', 17.116981, 48.150018], ['QA', 'Doha', 'ドーハ', 51.532968, 25.286556], ['ME', 'Podgorica', 'ポドゴリツァ', 19.266307, 42.465973], ['CH', 'Bern', 'ベルン', 7.466976, 46.916683], ['DM', 'Roseau', 'ロゾー', -61.387013, 15.301016], ['DJ', 'Djibouti', 'ジブチ市', 43.148002, 11.595015], ['GM', 'Banjul', 'バンジュール', -16.591702, 13.453877], ['MK', 'Skopje', 'スコピエ', 21.433462, 42.000006], ['BB', 'Bridgetown', 'ブリッジタウン', -59.616527, 13.102003], ['BI', 'Bujumbura', 'ブジュンブラ', 29.360006, -3.376087], ['VC', 'Kingstown', 'キングスタウン', -61.212062, 13.148279], ['LC', 'Castries', 'カストリーズ', -61.000008, 14.001974], ['KN', 'Basseterre', 'バセテール', -62.717009, 17.302031], ['MU', 'Port Louis', 'ポートルイス', 57.499994, -20.166639], ['GD', "St. George's", 'セントジョージズ', -61.741643, 12.052633], ['BH', 'Manama', 'マナーマ', 50.583052, 26.236136], ['AG', "Saint John's", 'セントジョンズ', -61.850034, 17.118037], ['UY', 'Montevideo', 'モンテビデオ', -56.172998, -34.856096], ['TG', 'Lomé', 'ロメ', 1.220811, 6.133883], ['TN', 'Tunis', 'チュニス', 10.179678, 36.802778], ['AE', 'Abu Dhabi', 'アブダビ', 54.366593, 24.466684], ['TM', 'Ashgabat', 'アシガバート', 58.383299, 37.949995], ['ZM', 'Lusaka', 'ルサカ', 28.281382, -15.414698], ['ZW', 'Harare', 'ハラレ', 31.042764, -17.815844], ['TL', 'Dili', 'ディリ', 125.579456, -8.559388], ['VU', 'Port Vila', 'ポートビラ', 168.316641, -17.73335], ['HN', 'Tegucigalpa', 'テグシガルパ', -87.219475, 14.103991], ['GY', 'Georgetown', 'ジョージタウン', -58.167029, 6.801974], ['IS', 'Reykjavík', 'レイキャヴィーク', -21.950015, 64.150024], ['HT', 'Port-au-Prince', 'ポルトープランス', -72.33798, 18.542971], ['UG', 'Kampala', 'カンパラ', 32.581378, 0.318605], ['SR', 'Paramaribo', 'パラマリボ', -55.167031, 5.83503], ['NE', 'Niamey', 'ニアメ', 2.11471, 13.518652], ['TJ', 'Dushanbe', 'ドゥシャンベ', 68.773879, 38.560035], ['PY', 'Asunción', 'アスンシオン', -57.643451, -25.294457], ['NI', 'Managua', 'マナグア', -86.270438, 12.154962], ['SL', 'Freetown', 'フリータウン', -13.236162, 8.471957], ['PK', 'Islamabad', 'イスラマバード', 73.164689, 33.701942], ['NP', 'Kathmandu', 'カトマンズ', 85.314696, 27.718638], ['ZA', 'Bloemfontein', 'ブルームフォンテーン', 26.229913, -29.119994], ['ZA', 'Pretoria', 'プレトリア', 28.227483, -25.704975], ['PG', 'Port Moresby', 'ポートモレスビー', 147.192504, -9.464708], ['SB', 'Honiara', 'ホニアラ', 159.949766, -9.437994], ['PA', 'Panama City', 'パナマ市', -79.534983, 8.969963], ['MA', 'Rabat', 'ラバト', -6.836408, 34.025307], ['MD', 'Chișinău', 'キシナウ', 28.857711, 47.005024], ['MZ', 'Maputo', 'マプト', 32.587217, -25.953332], ['SO', 'Mogadishu', 'モガディシュ', 45.364732, 2.068627], ['OM', 'Muscat', 'マスカット', 58.593312, 23.613325], ['LK', 'Colombo', 'コロンボ', 79.857751, 6.931966], ['MN', 'Ulaanbaatar', 'ウランバートル', 106.91467, 47.918619], ['NA', 'Windhoek', 'ウィントフック', 17.083546, -22.570006], ['NG', 'Abuja', 'アブジャ', 7.531382, 9.085279], ['GW', 'Bissau', 'ビサウ', -15.598361, 11.865024], ['JO', 'Amman', 'アンマン', 35.931354, 31.951971], ['LT', 'Vilnius', 'ヴィリニュス', 25.316635, 54.683366], ['LV', 'Riga', 'リガ', 24.099965, 56.950024], ['KG', 'Bishkek', 'ビシュケク', 74.583258, 42.875025], ['LS', 'Maseru', 'マセル', 27.483273, -29.316674], ['MG', 'Antananarivo', 'アンタナナリボ', 47.514678, -18.914692], ['EC', 'Quito', 'キト', -78.501997, -0.213042], ['CR', 'San José', 'サンホセ', -84.085997, 9.936958], ['SV', 'San Salvador', 'サンサルバドル', -89.204987, 13.711948], ['JM', 'Kingston', 'キングストン', -76.767434, 17.977077], ['TD', "N'Djamena", 'ンジャメナ', 15.047203, 12.115042], ['GQ', 'Malabo', 'マラボ', 8.783278, 3.750015], ['ER', 'Asmara', 'アスマラ', 38.933324, 15.333339], ['HR', 'Zagreb', 'ザグレブ', 15.999995, 45.800007], ['EE', 'Tallinn', 'タリン', 24.728041, 59.433877], ['MW', 'Lilongwe', 'リロングウェ', 33.783302, -13.983295], ['GT', 'Guatemala City', 'グアテマラシティ', -90.528911, 14.623081], ['GA', 'Libreville', 'リーブルヴィル', 9.457965, 0.385389], ['FJ', 'Suva', 'スバ', 178.441707, -18.133016], ['MR', 'Nouakchott', 'ヌアクショット', -15.97534, 18.086427], ['ML', 'Bamako', 'バマコ', -8.001985, 12.651961], ['LB', 'Beirut', 'ベイルート', 35.507762, 33.873921], ['GE', 'Tbilisi', 'トビリシ', 44.78885, 41.726956], ['KZ', 'Nur-Sultan', 'ヌル-スルタン', 71.427774, 51.181125], ['LA', 'Vientiane', 'ヴィエンチャン', 102.59998, 17.966693], ['CG', 'Brazzaville', 'ブラザヴィル', 15.282744, -4.25724], ['GN', 'Conakry', 'コナクリ', -13.682181, 9.533469], ['CI', 'Yamoussoukro', 'ヤムスクロ', -5.275503, 6.818381], ['CA', 'Ottawa', 'オタワ', -75.701961, 45.418643], ['RS', 'Belgrade', 'ベオグラード', 20.466045, 44.820591], ['BN', 'Bandar Seri Begawan', 'バンダルスリブガワン', 114.933284, 4.883331], ['BO', 'Sucre', 'スクレ', -65.259516, -19.040971], ['BZ', 'Belmopan', 'ベルモパン', -88.767073, 17.252034], ['CF', 'Bangui', 'バンギ', 18.558288, 4.366644], ['CM', 'Yaoundé', 'ヤウンデ', 11.514705, 3.868647], ['AL', 'Tirana', 'ティラナ', 19.818883, 41.327541], ['AM', 'Yerevan', 'エレバン', 44.511606, 40.183097], ['AZ', 'Baku', 'バクー', 49.860271, 40.397218], ['KH', 'Phnom Penh', 'プノンペン', 104.914689, 11.551976], ['BO', 'La Paz', 'ラパス', -68.151931, -16.496028], ['BJ', 'Cotonou', 'コトヌー', 2.518045, 6.401954], ['BG', 'Sofia', 'ソフィア', 23.314708, 42.685295], ['BY', 'Minsk', 'ミンスク', 27.564681, 53.901923], ['BT', 'Thimphu', 'ティンプー', 89.639014, 27.472986], ['BW', 'Gaborone', 'ハボローネ', 25.911948, -24.646314], ['AU', 'Canberra', 'キャンベラ', 149.129026, -35.283029], ['BF', 'Ouagadougou', 'ワガドゥグー', -1.52667, 12.372262], ['BA', 'Sarajevo', 'サラエヴォ', 18.383002, 43.850022], ['MM', 'Naypyidaw', 'ネピドー', 96.116673, 19.768503], ['TO', "Nuku'alofa", 'ヌクアロファ', -175.220565, -21.138512], ['SC', 'Victoria', 'ヴィクトリア', 55.44999, -4.616632], ['ST', 'São Tomé', 'サントメ', 6.733325, 0.333402], ['WS', 'Apia', 'アピア', -171.738642, -13.841545], ['MT', 'Valletta', 'バレッタ', 14.514711, 35.899733], ['MV', 'Malé', 'マレ', 73.499948, 4.166708], ['IL', 'Jerusalem', 'エルサレム', 35.206626, 31.778408], ['CV', 'Praia', 'プライア', -23.516689, 14.916698], ['BS', 'Nassau', 'ナッソー', -77.350044, 25.08339], ['CY', 'Nicosia', 'ニコシア', 33.366635, 35.166677], ['VN', 'Hanoi', 'ハノイ', 105.848068, 21.035273], ['TR', 'Ankara', 'アンカラ', 32.862446, 39.929184], ['HU', 'Budapest', 'ブダペスト', 19.081375, 47.501952], ['YE', 'Sanaa', 'サヌア', 44.204648, 15.356679], ['RO', 'Bucharest', 'ブカレスト', 26.098001, 44.435318], ['SY', 'Damascus', 'ダマスカス', 36.29805, 33.50198], ['PT', 'Lisbon', 'リスボン', -9.146812, 38.724669], ['SD', 'Khartoum', 'ハルツーム', 32.532233, 15.590024], ['NO', 'Oslo', 'オスロ', 10.748033, 59.918636], ['PL', 'Warsaw', 'ワルシャワ', 20.998054, 52.251947], ['KP', 'Pyongyang', '平壌', 125.752745, 39.021385], ['TZ', 'Dar es Salaam', 'ダルエスサラーム', 39.266396, -6.798067], ['IE', 'Dublin', 'ダブリン', -6.250852, 53.335007], ['LR', 'Monrovia', 'モンロビア', -10.79966, 6.314582], ['MY', 'Kuala Lumpur', 'クアラルンプール', 101.698037, 3.168612], ['CU', 'Havana', 'ハバナ', -82.366128, 23.133905], ['CZ', 'Prague', 'プラハ', 14.464034, 50.085283], ['KW', 'Kuwait City', 'クウェート市', 47.976355, 29.371664], ['DO', 'Santo Domingo', 'サントドミンゴ', -69.902031, 18.472019], ['GH', 'Accra', 'アクラ', -0.218662, 5.551981], ['LY', 'Tripoli', 'トリポリ', 13.180012, 32.8925], ['FI', 'Helsinki', 'ヘルシンキ', 24.932181, 60.177509], ['DK', 'Copenhagen', 'コペンハーゲン', 12.56154, 55.68051], ['CI', 'Abidjan', 'アビジャン', -4.041994, 5.321943], ['BR', 'Brasília', 'ブラジリア', -47.917998, -15.781394], ['BE', 'Brussels', 'ブリュッセル＝ヴィル', 4.331371, 50.835263], ['BD', 'Dhaka', 'ダッカ', 90.406634, 23.725006], ['AO', 'Luanda', 'ルアンダ', 13.232481, -8.83634], ['DZ', 'Algiers', 'アルジェ', 3.048607, 36.765011], ['VE', 'Caracas', 'カラカス', -66.918983, 10.502944], ['UA', 'Kyiv', 'キエフ', 30.514682, 50.435313], ['UZ', 'Tashkent', 'タシュケント', 69.292987, 41.313648], ['ES', 'Madrid', 'マドリード', -3.685298, 40.401972], ['SE', 'Stockholm', 'ストックホルム', 18.095389, 59.352706], ['TH', 'Bangkok', 'バンコク', 100.514699, 13.751945], ['PE', 'Lima', 'リマ', -77.052008, -12.046067], ['SN', 'Dakar', 'ダカール', -17.475076, 14.717778], ['NL', 'Amsterdam', 'アムステルダム', 4.914694, 52.351915], ['KR', 'Seoul', 'ソウル特別市', 126.997785, 37.568295], ['PH', 'Manila', 'マニラ', 120.980271, 14.606105], ['DE', 'Berlin', 'ベルリン', 13.399603, 52.523765], ['CD', 'Kinshasa', 'キンシャサ', 15.313026, -4.327778], ['IN', 'New Delhi', 'ニューデリー', 77.19998, 28.600023], ['GR', 'Athens', 'アテネ', 23.731375, 37.985272], ['IQ', 'Baghdad', 'バグダード', 44.391923, 33.340594], ['ET', 'Addis Ababa', 'アディスアベバ', 38.698059, 9.035256], ['IR', 'Tehran', 'テヘラン', 51.422398, 35.673889], ['AR', 'Buenos Aires', 'ブエノスアイレス', -58.399477, -34.600556], ['AF', 'Kabul', 'カーブル', 69.181314, 34.518636], ['AT', 'Vienna', 'ウィーン', 16.364693, 48.201961], ['US', 'Washington', 'ワシントンD.C.', -77.011364, 38.901495], ['GB', 'London', 'ロンドン', -0.118668, 51.501941], ['SA', 'Riyadh', 'リヤド', 46.770796, 24.642779], ['ZA', 'Cape Town', 'ケープタウン', 18.433042, -33.918065], ['RU', 'Moscow', 'モスクワ', 37.613577, 55.75411], ['MX', 'Mexico City', 'メキシコシティ', -99.132934, 19.444388], ['IT', 'Rome', 'ローマ', 12.481313, 41.897902], ['CN', 'Beijing', '北京市', 116.38634, 39.930838], ['KE', 'Nairobi', 'ナイロビ', 36.814711, -1.281401], ['ID', 'Jakarta', 'ジャカルタ', 106.827492, -6.172472], ['CO', 'Bogotá', 'ボゴタ', -74.08529, 4.598369], ['EG', 'Cairo', 'カイロ', 31.248022, 30.051906], ['JP', 'Tokyo', '東京都', 139.749462, 35.686963], ['FR', 'Paris', 'パリ', 2.33139, 48.868639], ['CL', 'Santiago', 'サンティアゴ', -70.668987, -33.448068], ['SG', 'Singapore', 'シンガポール', 103.853875, 1.294979], ['NZ', 'Wellington', 'ウェリントン', 174.783266, -41.299988], ['BJ', 'Porto-Novo', 'ポルトノボ', 2.616626, 6.483311], ['BI', 'Gitega', 'ギテガ', 29.843594, -3.426007], ['TZ', 'Dodoma', 'ドドマ', 35.750004, -6.183306], ['SS', 'Juba', 'ジュバ', 31.580026, 4.829975], ['LK', 'Sri Jayawardenepura Kotte', 'スリジャヤワルダナプラコッテ', 79.949993, 6.900004], ['NL', 'The Hague', 'ハーグ', 4.269961, 52.080037], ['MY', 'Putrajaya', 'プトラジャヤ', 101.701947, 2.91402], ['SZ', 'Lobamba', 'ロバンバ', 31.199997, -26.466668], ['YE', 'Aden', 'アデン', 45.00949, 12.779723], ['CL', 'Valparaíso', 'バルパライソ', -71.62296, -33.045819]]
COUNTRIES={x['id']:x for x in json.loads((ROOT/'public/assets/data.json').read_text()) if x.get('scope')=='un'}
# Canonical learner-facing city labels. Preserve displaced baseline spellings as aliases,
# except where that spelling names a different geographical entity (Palau).
RENAMES={
 'San Marino':('San Marino','サンマリノ'), 'Luxembourg':('Luxembourg','ルクセンブルク'),
 'Funafuti':('Funafuti','フナフティ'), 'Melekeok':('Ngerulmud','ンゲルルムッド'),
 'Djibouti':('Djibouti','ジブチ'), 'Panama City':('Panama City','パナマシティ'),
 'Kuwait City':('Kuwait City','クウェート'), 'Nur-Sultan':('Astana','アスタナ'),
 'Kyiv':('Kyiv','キーウ'), 'Brussels':('Brussels','ブリュッセル'),
 'Seoul':('Seoul','ソウル'), 'Beijing':('Beijing','北京'), 'Tokyo':('Tokyo','東京'),
 'Washington, D.C.':('Washington, D.C.','ワシントンD.C.'), 'Washington':('Washington, D.C.','ワシントンD.C.'),
 'Santiago':('Santiago','サンティアゴ'), 'Sri Jayawardenepura Kotte':('Sri Jayawardenepura Kotte','スリジャヤワルダナプラコッテ'),
 'The Hague':('The Hague','ハーグ'), 'Porto-Novo':('Porto-Novo','ポルトノボ'),
 'Gitega':('Gitega','ギテガ'),'Dodoma':('Dodoma','ドドマ'),'Juba':('Juba','ジュバ'),
 'Putrajaya':('Putrajaya','プトラジャヤ'),'Lobamba':('Lobamba','ロバンバ'), 'Aden':('Aden','アデン'),
 'Valparaíso':('Valparaíso','バルパライソ'), 'South Tarawa':('South Tarawa','南タラワ')}
READINGS={'東京':'トウキョウ','北京':'ペキン','平壌':'ピョンヤン','南タラワ':'ミナミタラワ','ワシントンD.C.':'ワシントンディーシー','ジブチ市':'ジブチ','パナマ市':'パナマシティ','クウェート市':'クウェート','サンマリノ市':'サンマリノ','ルクセンブルク市':'ルクセンブルク','ソウル特別市':'ソウル','北京市':'ペキン','東京都':'トウキョウ'}
def source(title,url,published=None):
 s={'title':title,'url':url,'checked':CHECKED}
 if published:s['published']=published
 return s
MOFA=lambda slug:source('外務省 基礎データ','https://www.mofa.go.jp/mofaj/area/'+slug+'/data.html')
SPECIAL={
 'BJ':[MOFA('benin')], 'BO':[MOFA('bolivia')], 'CI':[MOFA('cote_d')],
 'BI':[MOFA('brundi')], 'TZ':[MOFA('tanzania')], 'KZ':[MOFA('kazakhstan')],
 'NL':[MOFA('netherlands')], 'SS':[MOFA('s_sudan')], 'IL':[MOFA('israel')],
 'PW':[source('在パラオ日本国大使館 パラオ基本情報','https://www.palau.emb-japan.go.jp/itpr_ja/about_Palau.html','2025-10-07')],
 'CH':[source('スイス連邦外務省 Political system','https://www.aboutswitzerland.eda.admin.ch/en/political-system')],
 'NR':[MOFA('nauru'),source('ナウル政府 Departments','https://www.nauru.gov.nr/government/departments.aspx'),source('米国務省 ナウル国情資料（旧版：公式首都なし）','https://2009-2017.state.gov/outofdate/bgn/nauru/35798.htm')],
 'ZA':[source('南アフリカ政府 Provinces','https://www.gov.za/about-sa/south-africas-provinces')],
 'SZ':[source('アフリカ連合 首都区分','https://au.int/en/cities/lobambaroyal-and-legislative-mbabane-administrative')],
 'MY':[source('マレーシア首相府 Perdana Putra','https://www.pmo.gov.my/en/perdana-putra/')],
 'LK':[source('スリランカ議会 所在地','https://www.parliament.lk/en/visit-parliament/visiting-parliament/how-to-get-here'),source('外務省 世界の医療事情 スリランカ','https://www.mofa.go.jp/mofaj/toko/medi/asia/srilanka.html','2024-10-01')],
 'CL':[source('チリ下院 国会見学・所在地','https://www.camara.cl/camara/visita.aspx')],
 'ID':[source('インドネシア国家警察 憲法裁判所判決報道','https://inp.polri.go.id/artikel/jakarta-remains-national-capital-pending-presidential-decree-constitutional-court','2026-05-14'),source('首都法第3号（2022）','https://ikn.go.id/storage/regulasi/law-number-3-2022-english.pdf','2022')],
 'GQ':[MOFA('eq_guinea'),source('赤道ギニア政府 遷都実施準備','https://www.guineaecuatorialpress.com/noticias/el_gobierno_acelera_los_preparativos_para_la_instalacion_efectiva_en_la_ciudad_de_la_paz','2026-02-03'),source('赤道ギニア政府 行政移転の進行','https://www.guineaecuatorialpress.com/noticias/el_gobierno_impulsa_el_traslado_progresivo_de_la_administracion_central_del_estado_hacia_la_ciudad_de_la_paz','2026-07-01')],
 'YE':[MOFA('yemen'),source('外務省 イエメン危険情報','https://www.anzen.mofa.go.jp/info/pchazardspecificinfo_2026T010.html','2026-01-23')]
}
ROLES={('BO','Sucre'):('constitutional','憲法上の首都'),('BO','La Paz'):('administrative','行政・立法の中心'),('BJ','Porto-Novo'):('official','公式の首都'),('BJ','Cotonou'):('administrative','実質的な首都機能の所在地'),('NL','Amsterdam'):('constitutional','憲法上の首都'),('NL','The Hague'):('government-seat','政府・議会の所在地'),('CI','Yamoussoukro'):('official','公式の首都'),('CI','Abidjan'):('administrative','実質的な首都機能の所在地'),('ZA','Pretoria'):('administrative','行政首都'),('ZA','Cape Town'):('legislative','立法首都'),('ZA','Bloemfontein'):('judicial','司法首都（最高控訴裁判所所在地）'),('SZ','Mbabane'):('administrative','行政首都'),('SZ','Lobamba'):('royal-legislative','王宮・立法の所在地'),('LK','Sri Jayawardenepura Kotte'):('legislative','国会が置かれる首都'),('LK','Colombo'):('administrative','実質的な行政・司法の中心'),('MY','Kuala Lumpur'):('constitutional','国の首都・国会所在地'),('MY','Putrajaya'):('administrative','連邦行政の中心'),('CL','Santiago'):('capital','首都'),('CL','Valparaíso'):('legislative-seat','国会の所在地'),('CH','Bern'):('federal-city','連邦都市（政府所在地）'),('NR','Yaren'):('government-seat','政府・議会所在地（公式首都なし）'),('GQ','Ciudad de la Paz'):('official','2026年1月に宣言された新首都'),('GQ','Malabo'):('administrative','移転中の実質的な首都機能の所在地'),('ID','Jakarta'):('capital','大統領令による遷都前の首都'),('ID','Nusantara'):('planned-capital','建設・移転計画が進む新首都'),('YE','Sanaa'):('constitutional','憲法上の首都'),('YE','Aden'):('temporary-capital','国際的に承認された政府の暫定首都'),('IL','Jerusalem'):('claimed-capital','イスラエルが首都と定める都市')}
NOTES={
 'CH':'法律上の公式首都はなく、ベルンは連邦都市・事実上の首都。',
 'NR':'公式首都はない。ヤレンは政府機関が集まる地区。日本外務省などが首都欄にヤレンと記す慣用と、公式指定の有無を区別する。',
 'PW':'首都機関はマルキョク州のンゲルルムッドにある。州名・集落名のマルキョクと区別する。',
 'ZA':'司法首都ブルームフォンテーンは最高控訴裁判所所在地。憲法裁判所はヨハネスブルクにある。',
 'GQ':'2026年1月2日にシウダ・デ・ラ・パスへの遷都を宣言。行政移転は段階的で、外務省資料は実質的首都機能を引き続きマラボと記載。',
 'ID':'2026年5月14日の国家警察による憲法裁判所判決報道では、大統領令が出るまでジャカルタが首都。ヌサンタラを現行唯一の首都と扱わない。',
 'IL':'イスラエルはエルサレムを首都と定める。日本は承認しておらず、最終的地位は当事者間交渉で解決されるべきとの立場。都市の表示は領有権の承認を意味しない。',
 'YE':'内戦で政府機能・実効支配が分かれている。サヌアと暫定首都アデンを役割を明示して区別する。',
 'TZ':'法律上の首都はドドマ。旧首都・経済中心のダルエスサラームを現行の唯一の首都として扱わない。',
 'BI':'2019年に政治首都がギテガに移転。ブジュンブラは経済の中心であり、現行首都の正解にはしない。',
 'KZ':'2022年9月にヌルスルタンからアスタナへ再改称。',
 'LK':'国会所在地スリジャヤワルダナプラコッテと、実質的な行政・司法の中心コロンボを区別する。'}
# Remove superseded city-as-capital records; retain economic centres only where they
# still carry a separately sourced national governmental role.
BASE=[r for r in BASE if (r[0],r[1]) not in {('BI','Bujumbura'),('TZ','Dar es Salaam')}]
BASE += [['NR','Yaren','ヤレン',166.9209,-0.5477],['GQ','Ciudad de la Paz','シウダ・デ・ラ・パス',10.822,1.578],['ID','Nusantara','ヌサンタラ',116.709, -0.972]]
# National administrative seats supplement the conventional capitals. Their role
# qualifiers prevent them becoming alternate answers to a generic capital prompt.
BASE += [['EG','The New Capital','新行政首都',31.75,30.02],['KR','Sejong','世宗',127.289,36.504]]
SPECIAL['EG']=[MOFA('egypt'),source('エジプト国家情報庁 新首都の政府本部・移転状況','https://sis.gov.eg/en/media-center/news/pm-follows-up-implementation-status-of-operation-of-projects-in-new-capital/','2026-05-19')]
SPECIAL['KR']=[source('韓国政府庁舎管理本部 世宗庁舎','https://gbmo.go.kr/eng/cm/cntnts/cntntsView.do?cntntsId=1219&mi=1430')]
ROLES[('EG','Cairo')]=('capital','外務省基礎データに記載される首都')
ROLES[('EG','The New Capital')]=('administrative-seat','カイロ東方で政府本部が移った新都市')
ROLES[('KR','Seoul')]=('capital','国の首都')
ROLES[('KR','Sejong')]=('administrative-seat','中央行政機関が集まる政府庁舎の都市')
READINGS['新行政首都']='シンギョウセイシュト'
READINGS['世宗']='セジョン'
NOTES['EG']='カイロは2026年6月26日更新の日本外務省資料で首都。新行政首都（The New Capital）には政府本部・省庁が移転。移転の実態と法的首都の表示を区別する。新都市の固有名称・法的位置付けは継続確認が必要。'
NOTES['KR']='首都はソウル。世宗は中央行政機関が移転した行政都市であり、ソウルを置き換える唯一の首都として扱わない。'
rows=[]
for country,old_en,old_name,lng,lat in BASE:
 en,name=RENAMES.get(old_en,(old_en,old_name))
 if en=='Ngerulmud':lng,lat=134.6242,7.5006
 role,qual=ROLES.get((country,en),('capital','首都'))
 slug=re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',en).encode('ascii','ignore').decode().lower()).strip('-')
 aliases=[name,READINGS.get(name,name),en]
 if old_en!='Melekeok':aliases += [old_en,old_name]
 if en=='Kyiv':aliases+=['キエフ','Kiev']
 if en=='Astana':aliases+=['ヌルスルタン','Nur-Sultan','アクモラ']
 if en=='Ngerulmud':aliases+=['マルキョク州ンゲルルムッド']
 if en=='South Tarawa':aliases+=['タラワ','サウスタラワ','サウス・タラワ']
 if en=='Kabul':aliases+=['カブール']
 if en=='Yaren':aliases+=['ヤレン地区']
 if en=='The New Capital':aliases+=['新首都','New Administrative Capital','ニューキャピタル']
 if en=='Sejong':aliases+=['セジョン市','世宗特別自治市']
 if en=='Tokyo':aliases+=['とうきょう','東京都']
 if en=='Beijing':aliases+=['ぺきん','北京市']
 r=dict(id='cap-'+country.lower()+'-'+slug,country=country,name=name,reading=READINGS.get(name,name),en=en,aliases=list(dict.fromkeys(filter(None,aliases))),lat=lat,lng=lng,region=COUNTRIES[country]['region'],role=role,promptQualifier=qual,note=NOTES.get(country,''),sources=[source('Natural Earth Populated Places（位置・名称の基礎）',BASELINE)]+SPECIAL.get(country,[]),checked=CHECKED,scope='un',status='planned' if role=='planned-capital' else 'current',quizEligible=role!='planned-capital',level='basic' if role not in {'planned-capital','legislative-seat','administrative-seat'} else 'extended',accuracy='都市中心付近の学習用座標（行政区域・境界を示すものではありません）')
 rows.append(r)
rows.sort(key=lambda r:(r['country'],r['id']))
assert len({r['id'] for r in rows})==len(rows)
assert {r['country'] for r in rows}==set(COUNTRIES),set(COUNTRIES)-{r['country'] for r in rows}
assert all(-90<=r['lat']<=90 and -180<=r['lng']<=180 for r in rows)
assert all(r['reading'] and r['name'] and r['sources'] for r in rows)
assert not any(re.search(r'[一-龯]',r['reading']) for r in rows),[(r['name'],r['reading']) for r in rows if re.search(r'[一-龯]',r['reading'])]
(ROOT/'public/assets/capitals.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
print(f'{len(rows)} rows / {len(COUNTRIES)} UN members / {sum(r["quizEligible"] for r in rows)} quiz-eligible rows')
