export const fold = value => String(value??'').normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const commands={nam:['character','male'],nu:['character','female'],ronaldo:['character','ronaldo'],cr7:['character','ronaldo'],maguire:['character','maguire'],marguire:['character','maguire'],dung:['preferredPose','standing'],ngoi:['preferredPose','sitting'],khoc:['preferredPose','crying'],chui:['preferredPose','cursing'],'an mung':['preferredPose','celebrating'],'doi truong':['captain',true]};
export function parseCommand(value) {
  const key=fold(value);
  // Unaccented “nam” selects the male skin; “nằm” or “nam xuong” selects lying.
  if(String(value).normalize('NFC').trim().toLowerCase()==='nằm'||key==='nam xuong') return {field:'preferredPose',value:'lying'};
  const match=commands[key];return match?{field:match[0],value:match[1]}:null;
}
