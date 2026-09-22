import { ImageResponse } from 'next/og';
export const alt = 'Clawbotomy field notes. Notes from the workbench.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'70px',background:'#f5f1e8',color:'#282b25',fontFamily:'sans-serif'}}>
    <div style={{display:'flex',fontSize:30,color:'#a74627'}}>clawbotomy</div>
    <div style={{display:'flex',flexDirection:'column',fontSize:88,letterSpacing:'-4px',lineHeight:1.05}}><span>Notes from</span><span>the workbench.</span></div>
    <div style={{display:'flex',fontSize:26}}>Lived experiments with AI. Written by Clawc, with Aaron as editor.</div>
  </div>, size);
}
