import { useState, useMemo } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from "recharts";

/* ═══ CONFIRMED — DfE written statement, 1 July 2026 ═══ */
/* Deal: 2026/27 = 3.5%, 2027/28 = 3.0% (both accepted in full); 2028/29 = 3.0% indicative */
/* CPI forecasts (Bank of England): 2026 = 3.25%, 2027 = 2.9%, 2028 = 1.5% */
const AWARD_26=3.5;            // 2026/27 award %
const AWARD_27=3.0;            // 2027/28 award %
const AWARD_28=3.0;            // 2028/29 award % (indicative)
const CPI_26=3.25;             // BoE CPI forecast 2026
const CPI_27=2.9;              // BoE CPI forecast 2027
const CPI_28=1.5;              // BoE CPI forecast 2028

/* ═══ PAY DATA — [M1,M2,M3,M4,M5,M6,U1,U2,U3] ═══ */
/* 2025 = verified STPCD; 2026 = +3.5%; 2027 = +3.0%; 2010 = baseline for recovery calc */
const P10={"RoE":[21588,23295,25168,27104,29240,31552,34181,35447,36756],"Fringe":[22626,24331,26203,28146,30278,32588,35116,36397,37725],"OLon":[25117,26674,28325,30080,31868,34181,37461,38857,40285],"ILon":[27000,28226,29535,31446,33865,36387,41497,42898,44360]};
const P25={"RoE":[32916,34823,37101,39556,42057,45352,47472,49232,51048],"Fringe":[34398,36373,38627,41075,43545,46839,48913,50668,52490],"OLon":[37870,39851,41935,44128,46800,50474,52219,54151,56154],"ILon":[40317,42234,44238,46339,48952,52300,57632,60464,62496]};
const P26={"RoE":[34068,36042,38400,40940,43529,46939,49134,50955,52835],"Fringe":[35602,37646,39979,42513,45069,48478,50625,52441,54327],"OLon":[39195,41246,43403,45672,48438,52241,54047,56046,58119],"ILon":[41728,43712,45786,47961,50665,54130,59649,62580,64683]};
const P27={"RoE":[35090,37123,39552,42168,44835,48347,50608,52484,54420],"Fringe":[36670,38775,41178,43788,46421,49932,52144,54014,55957],"OLon":[40371,42483,44705,47042,49891,53808,55668,57727,59863],"ILon":[42980,45023,47160,49400,52185,55754,61438,64457,66623]};
const INF_C25=1.548,INF_C27=1.6447; // cumulative CPI multipliers from Sept 2010 (2027 uses BoE forecasts)
const AWARDS={11:0,12:0,13:1.0,14:1.0,15:1.0,16:1.0,17:2.0,18:3.5,19:2.75,20:3.1,21:0,22:8.9,23:6.5,24:5.5,25:4.0,26:AWARD_26,27:AWARD_27,28:AWARD_28};
const CPI_Y={11:5.2,12:2.2,13:2.7,14:1.2,15:-0.1,16:1.0,17:3.0,18:2.4,19:1.7,20:0.5,21:3.1,22:10.1,23:6.7,24:1.7,25:3.4,26:CPI_26,27:CPI_27,28:CPI_28};

const RKEYS=["RoE","Fringe","OLon","ILon"];
const RNAMES={"RoE":"Rest of England","Fringe":"London Fringe","OLon":"Outer London","ILon":"Inner London"};
const PPS=["M1","M2","M3","M4","M5","M6","U1","U2","U3"];
const PP_L={M1:"M1 – Starting salary",M2:"M2",M3:"M3",M4:"M4",M5:"M5",M6:"M6 – Top of main scale",U1:"U1 – Upper pay scale",U2:"U2",U3:"U3 – Top of upper scale"};

const INK="#151F3B",GOLD="#FED02F",BLUE="#5783C0",GREEN="#047857",RED="#b91c1c";
const fmt=v=>"£"+Math.round(v).toLocaleString("en-GB");
const SER="Georgia, 'Times New Roman', serif";
const S="system-ui,-apple-system,sans-serif";

function tpsRate(s){if(s<34290)return .074;if(s<46159)return .086;if(s<54730)return .096;if(s<72535)return .102;if(s<98910)return .113;return .117;}
function takeHome(gross,pen){
  const p=pen?gross*tpsRate(gross):0;
  const taxable=gross-p;
  let t=0;if(taxable>12570){t=taxable<=50270?(taxable-12570)*.2:(50270-12570)*.2+(taxable-50270)*.4;}
  let n=0;if(gross>12570){n=gross<=50270?(gross-12570)*.08:(50270-12570)*.08+(gross-50270)*.02;}
  return(gross-p-t-n)/12;
}

const Btn=({a,onClick,children})=><button onClick={onClick} style={{padding:"7px 13px",borderRadius:4,fontSize:13,fontWeight:a?600:400,border:a?`1.5px solid ${INK}`:"1px solid #d1d5db",background:a?INK:"#fff",color:a?"#fff":"#4b5563",cursor:"pointer",whiteSpace:"nowrap"}}>{children}</button>;
const Lab=({children})=><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"#9ca3af",marginBottom:5}}>{children}</div>;
const Src=({children})=><div style={{fontSize:9,color:"#9ca3af",textTransform:"uppercase",letterSpacing:".05em",padding:"8px 14px 6px",borderTop:"1px solid #f3f4f6"}}>{children}</div>;

export default function App(){
  const[dPP,setDPP]=useState("M6");
  const[dRk,setDRk]=useState("RoE");
  const[pen,setPen]=useState(true);
  const dPi=PPS.indexOf(dPP);

  const deal=useMemo(()=>{
    const y25=P25[dRk][dPi],y26=P26[dRk][dPi],y27=P27[dRk][dPi];
    const m25=takeHome(y25,pen),m26=takeHome(y26,pen),m27=takeHome(y27,pen);
    const loss25=P10[dRk][dPi]*INF_C25-y25;
    const loss27=P10[dRk][dPi]*INF_C27-y27;
    const rec=loss25>0?Math.max(0,Math.min(100,(1-loss27/loss25)*100)):100;
    return{y25,y26,y27,m25,m26,m27,rise26:y26-y25,rise27:y27-y26,riseTot:y27-y25,
      mRise26:m26-m25,mRise27:m27-m26,loss25,loss27,rec};
  },[dRk,dPi,pen]);

  const awardData=useMemo(()=>Object.keys(AWARDS).map(yk=>({year:"'"+yk,diff:+((AWARDS[yk]||0)-(CPI_Y[yk]||0)).toFixed(1)})),[]);

  return(<div style={{fontFamily:S,maxWidth:880,margin:"0 auto",padding:"20px 16px 36px",color:INK,background:"#fff"}}>
    <div style={{borderBottom:`1px solid ${INK}`,paddingBottom:10,marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:4}}>
        <div style={{fontFamily:SER,fontSize:19,fontWeight:700}}>Teacher Pay in England</div>
        <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:".08em"}}>Edapt analysis</div>
      </div>
    </div>

    <div style={{marginBottom:18,paddingBottom:14,borderBottom:`3px solid ${INK}`}}>
      <div style={{display:"inline-block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:INK,background:GOLD,padding:"3px 8px",borderRadius:3,marginBottom:8}}>Announced</div>
      <div style={{fontFamily:SER,fontSize:"clamp(22px, 5vw, 30px)",fontWeight:700,lineHeight:1.15}}>The teacher pay award: what it means for you</div>
      <div style={{fontSize:14,color:"#4b5563",marginTop:8,lineHeight:1.55,maxWidth:620}}>A {AWARD_26}% rise from September 2026, followed by {AWARD_27}% from September 2027. Pick your pay point and region to see what you'll earn across both years.</div>
    </div>

    <div style={{display:"flex",gap:14,marginBottom:14,flexWrap:"wrap"}}>
      <div style={{flex:"1 1 200px"}}><Lab>Your pay point</Lab><select value={dPP} onChange={e=>setDPP(e.target.value)} style={{padding:"9px 12px",borderRadius:4,border:"1px solid #d1d5db",fontSize:14,background:"#fff",cursor:"pointer",width:"100%"}}>{PPS.map(p=><option key={p} value={p}>{p} — {PP_L[p]}</option>)}</select></div>
      <div><Lab>Your region</Lab><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{RKEYS.map(r=><Btn key={r} a={dRk===r} onClick={()=>setDRk(r)}>{RNAMES[r]}</Btn>)}</div></div>
    </div>
    <div style={{marginBottom:14}}><label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#4b5563",cursor:"pointer",userSelect:"none"}}><input type="checkbox" checked={pen} onChange={e=>setPen(e.target.checked)} style={{accentColor:INK}}/>Include Teachers' Pension contributions</label></div>

    {/* Three salary levels: now, Sep 2026, Sep 2027 */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",border:`2px solid ${INK}`,borderRadius:8,overflow:"hidden",marginBottom:6}}>
      <div style={{padding:"16px 18px",borderBottom:"1px solid #e5e7eb"}}>
        <Lab>Your pay now</Lab>
        <div style={{fontFamily:SER,fontSize:"clamp(22px,5.5vw,28px)",fontWeight:700}}>{fmt(deal.y25)}</div>
        <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>≈ {fmt(deal.m25)}/mo in your pocket</div>
      </div>
      <div style={{padding:"16px 18px",borderBottom:"1px solid #e5e7eb",background:"#f8f9fb"}}>
        <Lab>From Sept 2026 (+{AWARD_26}%)</Lab>
        <div style={{fontFamily:SER,fontSize:"clamp(22px,5.5vw,28px)",fontWeight:700}}>{fmt(deal.y26)}</div>
        <div style={{fontSize:11,color:GREEN,marginTop:2,fontWeight:600}}>+{fmt(deal.rise26)} vs now</div>
      </div>
      <div style={{padding:"16px 18px",borderBottom:"1px solid #e5e7eb",background:"#f8f9fb"}}>
        <Lab>From Sept 2027 (+{AWARD_27}%)</Lab>
        <div style={{fontFamily:SER,fontSize:"clamp(22px,5.5vw,28px)",fontWeight:700}}>{fmt(deal.y27)}</div>
        <div style={{fontSize:11,color:GREEN,marginTop:2,fontWeight:600}}>+{fmt(deal.rise27)} vs 2026</div>
      </div>
      <div style={{padding:"16px 18px",borderBottom:"1px solid #e5e7eb",background:GOLD+"30"}}>
        <Lab>Total increase by 2027</Lab>
        <div style={{fontFamily:SER,fontSize:"clamp(22px,5.5vw,28px)",fontWeight:700,color:GREEN}}>+{fmt(deal.riseTot)}</div>
        <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>≈ +{fmt(deal.mRise26+deal.mRise27)}/mo in your pocket</div>
      </div>
    </div>
    <div style={{fontSize:10,color:"#9ca3af",marginBottom:22,lineHeight:1.5}}>"In your pocket" = monthly pay after income tax, National Insurance{pen?" and Teachers' Pension Scheme contributions (tiered 7.4%–11.7%)":""}. Excludes student loan repayments. Uses 2025/26 tax rates and thresholds throughout.</div>

    {/* Plain-English inflation explainer */}
    <div style={{background:"#f8f9fb",borderLeft:`4px solid ${BLUE}`,borderRadius:"0 6px 6px 0",padding:"12px 16px",marginBottom:22}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>Does it beat inflation?</div>
      <p style={{fontSize:13,color:"#374151",margin:"0 0 8px",lineHeight:1.65}}>It depends which measure of inflation you use. On <strong>CPI</strong> — the Government's preferred measure — the Bank of England forecasts around {CPI_26}% in 2026 and {CPI_27}% in 2027, so both awards edge just ahead of rising prices: a small real-terms gain.</p>
      <p style={{fontSize:13,color:"#374151",margin:0,lineHeight:1.65}}>On <strong>RPI</strong> — which includes housing costs, runs higher, and which unions tend to use — the awards fall a little short in the first two years (an estimated ~4.0% and ~3.8%), before pay pulls ahead in the third. Across the full three years, pay rises about 9.8% while RPI rises about 10.5% — a net real-terms cut of roughly 0.7% on this measure.</p>
    </div>

    {/* The longer view */}
    {deal.loss25>0&&<div style={{marginBottom:22}}>
      <div style={{fontFamily:SER,fontSize:20,fontWeight:700,marginBottom:4}}>The longer view</div>
      <p style={{fontSize:13,color:"#4b5563",margin:"0 0 10px",lineHeight:1.6}}>Pay rises in the 2010s mostly fell behind inflation. As a result, {dPP} pay today buys less than it did in 2010 — the gap is about {fmt(Math.round(deal.loss25))}/year (using CPI). Both years of this deal together close part of it:</p>
      <div style={{background:"#f1f3f7",borderRadius:4,height:34,overflow:"hidden",position:"relative",border:"1px solid #e5e7eb"}}>
        <div style={{background:INK,height:"100%",width:deal.rec+"%"}}/>
        {deal.rec>=60
          ?<div style={{position:"absolute",top:0,bottom:0,left:0,width:deal.rec+"%",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:10,fontWeight:700,fontSize:12.5,color:"#fff",whiteSpace:"nowrap"}}>{deal.rec.toFixed(0)}% of the gap closed by 2027</div>
          :<div style={{position:"absolute",top:0,bottom:0,left:deal.rec+"%",display:"flex",alignItems:"center",paddingLeft:10,fontWeight:700,fontSize:12.5,color:INK,whiteSpace:"nowrap"}}>{deal.rec.toFixed(0)}% of the gap closed by 2027</div>}
      </div>
      <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Gap remaining in 2027 (vs CPI since 2010): about {fmt(Math.round(deal.loss27))}/year</div>
    </div>}

    {/* Award history */}
    <div style={{fontFamily:SER,fontSize:20,fontWeight:700,marginBottom:4}}>How these awards compare</div>
    <p style={{fontSize:13,color:"#4b5563",margin:"0 0 10px",lineHeight:1.6}}>Each bar shows how far that year's pay award was above or below CPI inflation. The run of below-inflation years in the 2010s is where today's gap was built. The 2028/29 award is indicative and yet to be confirmed.</p>
    <div style={{border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={awardData} margin={{top:12,right:10,bottom:0,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="year" tick={{fontSize:10}} stroke="#d1d5db"/>
          <YAxis tick={{fontSize:10}} tickFormatter={v=>(v>0?"+":"")+v+"%"} stroke="#d1d5db" width={40} domain={[-6,4]}/>
          <ReferenceLine y={0} stroke={INK} strokeWidth={1.5}/>
          <Tooltip contentStyle={{fontSize:12,fontFamily:S,border:`1.5px solid ${INK}`,borderRadius:6}} formatter={v=>[(v>0?"+":"")+v.toFixed(1)+"% vs CPI inflation","Pay award"]}/>
          <Bar dataKey="diff" name="Award vs CPI" radius={[2,2,0,0]}>{awardData.map((d,i)=><Cell key={i} fill={d.diff>=0?GREEN:RED}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{display:"flex",justifyContent:"center",gap:14,fontSize:10,padding:"4px 0 6px",flexWrap:"wrap"}}>
        <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:GREEN,marginRight:4}}/>Award beat CPI inflation</span>
        <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:RED,marginRight:4}}/>Award below CPI inflation</span>
      </div>
      <Src>Source: STPCD; ONS September CPI; Bank of England CPI forecasts (2026–27); RPI estimated as BoE CPI plus OBR's CPI–RPI wedge · Edapt analysis</Src>
    </div>
  </div>);
}
