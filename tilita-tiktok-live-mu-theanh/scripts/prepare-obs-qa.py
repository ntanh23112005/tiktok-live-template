"""Create an isolated portable OBS profile; never reads or edits the user's OBS settings."""
from pathlib import Path
import json,uuid
ROOT=Path(__file__).resolve().parents[1];OBS=ROOT/'output/obs-qa';CFG=OBS/'config/obs-studio';PROFILE=CFG/'basic/profiles/HangMU';SCENES=CFG/'basic/scenes'
PROFILE.mkdir(parents=True,exist_ok=True);SCENES.mkdir(parents=True,exist_ok=True)
(CFG/'global.ini').write_text('[General]\nFirstRun=true\nEnableAutoUpdates=false\n\n[Basic]\nProfile=Hang MU QA\nProfileDir=HangMU\nSceneCollection=Hang MU QA\nSceneCollectionFile=HangMU\n\n[BasicWindow]\nPreviewEnabled=true\nStudioMode=false\n',encoding='utf-8')
(PROFILE/'basic.ini').write_text(f'''[General]
Name=Hang MU QA

[Video]
BaseCX=1080
BaseCY=1920
OutputCX=1080
OutputCY=1920
FPSType=0
FPSCommon=30
ColorFormat=NV12
ColorSpace=709
ColorRange=Partial

[Output]
Mode=Simple

[SimpleOutput]
FilePath={str(ROOT/'output/qa').replace(chr(92),'/')}
RecFormat2=mkv
RecEncoder=x264
RecQuality=Small
VBitrate=4500
ABitrate=160
UseAdvanced=false

[Audio]
SampleRate=48000
ChannelSetup=Stereo
''',encoding='utf-8')
browser_id=str(uuid.uuid4());scene_id=str(uuid.uuid4())
source={'name':'Hang MU Browser','uuid':browser_id,'id':'browser_source','versioned_id':'browser_source','settings':{'url':'http://127.0.0.1:3003/overlay','width':1080,'height':1920,'fps':30,'reroute_audio':True,'shutdown':False,'restart_when_active':False,'css':'body { background-color: rgba(0, 0, 0, 0); margin: 0px; overflow: hidden; }'},'mixers':1,'volume':1.0,'sync':0,'monitoring_type':0,'enabled':True,'muted':False}
scene={'name':'Hang MU QA','uuid':scene_id,'id':'scene','versioned_id':'scene','settings':{'items':[{'name':'Hang MU Browser','source_uuid':browser_id,'visible':True,'locked':True,'pos':{'x':0,'y':0},'scale':{'x':1,'y':1},'rot':0,'align':5,'bounds_type':0,'bounds_align':0,'bounds':{'x':0,'y':0},'crop_left':0,'crop_top':0,'crop_right':0,'crop_bottom':0,'id':1}],'id_counter':1}}
collection={'name':'Hang MU QA','current_scene':'Hang MU QA','current_program_scene':'Hang MU QA','scene_order':[{'name':'Hang MU QA'}],'sources':[source,scene],'groups':[],'transitions':[],'current_transition':'Fade','transition_duration':300,'saved_projectors':[],'quick_transitions':[]}
(SCENES/'HangMU.json').write_text(json.dumps(collection,ensure_ascii=False,indent=2),encoding='utf-8')
print('Isolated OBS QA profile prepared:',CFG)
