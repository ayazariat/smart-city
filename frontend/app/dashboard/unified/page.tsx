"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint, ComplaintStatus, ComplaintCategory, ComplaintUrgency } from "@/types";

// ═══════════════════════════════════════════════════════════════════
// SMART CITY TUNISIA — Web Frontend (LIGHT MODE)
// Design: Clean civic glass-morphism, Sora + DM Mono typography
// Primary: #1B5E20 (existing brand green)
// Accent: #00C853 luminous lime accent
// Background: warm off-white #F7F9F4 with subtle mesh
// Features:
//   • 5-role switcher (Citizen/Agent/Tech/Manager/Admin) - via logout/login
//   • Full complaints list with dual view (list + map)
//   • Interactive map with complaint markers & clustering
//   • Complaint detail with timeline + SLA indicator
//   • 4-step form with map picker + AI category prediction
//   • Agent validation queue with inline actions
//   • Technician task board with SLA countdown
//   • Manager analytics + heatmap
//   • Admin user management
//   • Internal notes + blocage flags
//   • Notification center
//   • Archive system
//   • AI badge on predicted categories
// ═══════════════════════════════════════════════════════════════════

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`;

const CSS = `
${FONTS}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --green:     #1B5E20;
  --green2:    #2E7D32;
  --green3:    #388E3C;
  --greenlt:   #43A047;
  --accent:    #00C853;
  --accentlt:  #69F0AE;
  --accentbg:  rgba(0,200,83,.08);
  --accentbg2: rgba(0,200,83,.14);
  --accentbdr: rgba(0,200,83,.25);

  --bg:        #F7F9F4;
  --bg2:       #FFFFFF;
  --bg3:       #F0F4EE;
  --surface:   #FFFFFF;
  --glass:     rgba(255,255,255,.82);

  --bdr:       #E2EAE0;
  --bdr2:      #C8D8C4;

  --txt:       #1A2E1C;
  --txt2:      #3D5C40;
  --txt3:      #7A9E7D;
  --txt4:      #A8C5AB;

  --blue:      #1565C0;  --bluebg:  #EBF2FF;  --bluebdr: rgba(21,101,192,.2);
  --orange:    #E65100;  --orgbg:   #FFF3E0;  --orgbdr:  rgba(230,81,0,.2);
  --red:       #B71C1C;  --redbg:   #FFEBEE;  --redbdr:  rgba(183,28,28,.2);
  --purple:    #4527A0;  --purbg:   #EDE7F6;  --purbdr:  rgba(69,39,160,.2);
  --teal:      #00695C;  --telbg:   #E0F2F1;  --telbdr:  rgba(0,105,92,.2);
  --amber:     #F57F17;  --ambg:    #FFFDE7;  --ambdr:   rgba(245,127,23,.2);

  --r:         12px;
  --r2:        16px;
  --rsm:       8px;
  --sh:        0 4px 24px rgba(27,94,32,.08), 0 1px 4px rgba(27,94,32,.04);
  --shmd:      0 8px 40px rgba(27,94,32,.12), 0 2px 8px rgba(27,94,32,.06);
  --shsm:      0 2px 10px rgba(27,94,32,.07);
}

body{
  font-family:'Sora',sans-serif;
  background:var(--bg);
  color:var(--txt);
  -webkit-font-smoothing:antialiased;
  min-height:100vh;
}

/* LAYOUT */
.app{display:flex;height:100vh;overflow:hidden;background:var(--bg)}

/* SIDEBAR */
.sidebar{
  width:240px;flex-shrink:0;
  background:var(--green);
  display:flex;flex-direction:column;
  overflow:hidden;position:relative;z-index:10;
  box-shadow:4px 0 24px rgba(27,94,32,.18);
}
.sidebar::after{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(160deg,rgba(255,255,255,.04) 0%,transparent 60%);
}
.sb-logo{
  padding:22px 20px 18px;
  display:flex;align-items:center;gap:11px;
  border-bottom:1px solid rgba(255,255,255,.1);
}
.sb-icon{
  width:38px;height:38px;border-radius:10px;
  background:var(--accent);
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;box-shadow:0 2px 12px rgba(0,200,83,.35);
}
.sb-name{font-size:14px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-.3px}
.sb-sub{font-size:10px;color:rgba(255,255,255,.55);font-weight:400;margin-top:1px}

.sb-user{
  margin:14px 14px 10px;padding:12px;
  border-radius:var(--r);background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.1);
}
.sb-avt{
  width:36px;height:36px;border-radius:50%;
  background:var(--accent);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:800;color:var(--green);
  margin-bottom:8px;
}
.sb-uname{font-size:12px;font-weight:700;color:#fff;margin-bottom:2px}
.sb-urole{
  display:inline-block;font-size:9px;font-weight:700;
  padding:2px 8px;border-radius:20px;
  background:rgba(0,200,83,.2);color:var(--accentlt);
  border:1px solid rgba(0,200,83,.3);letter-spacing:.4px;
  text-transform:uppercase;
}

.sb-nav{flex:1;padding:6px 0;overflow-y:auto;scrollbar-width:none}
.sb-nav::-webkit-scrollbar{display:none}
.sb-section{
  padding:10px 18px 5px;
  font-size:9px;font-weight:700;color:rgba(255,255,255,.35);
  letter-spacing:.8px;text-transform:uppercase;
}
.sb-item{
  display:flex;align-items:center;gap:9px;
  padding:9px 14px;margin:1px 10px;border-radius:9px;
  cursor:pointer;border:1px solid transparent;
  transition:all .16s ease;color:rgba(255,255,255,.7);
  font-size:12px;font-weight:500;position:relative;
  font-family:'Sora',sans-serif;background:none;text-align:left;width:calc(100% - 20px);
}
.sb-item:hover{background:rgba(255,255,255,.08);color:#fff}
.sb-item.active{
  background:rgba(255,255,255,.13);color:#fff;font-weight:700;
  border-color:rgba(255,255,255,.12);
}
.sb-item.active::before{
  content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
  width:3px;height:18px;background:var(--accent);border-radius:0 3px 3px 0;
}
.sb-ic{width:16px;height:16px;flex-shrink:0;opacity:.8}
.sb-badge{
  margin-left:auto;min-width:18px;height:18px;padding:0 5px;
  background:var(--red);color:#fff;border-radius:20px;
  font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;
}
.sb-badge.green{background:var(--accent);color:var(--green)}

.sb-footer{padding:14px;border-top:1px solid rgba(255,255,255,.1)}
.sb-logout{
  width:100%;padding:9px;border-radius:var(--rsm);
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
  color:rgba(255,255,255,.7);font-size:12px;font-weight:600;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;
  font-family:'Sora',sans-serif;transition:all .15s;
}
.sb-logout:hover{background:rgba(255,255,255,.13);color:#fff}

/* MAIN */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}

/* TOPBAR */
.topbar{
  height:58px;padding:0 24px;
  background:var(--glass);border-bottom:1px solid var(--bdr);
  backdrop-filter:blur(16px);
  display:flex;align-items:center;gap:16px;flex-shrink:0;
  position:relative;z-index:20;
}
.topbar-title{font-size:17px;font-weight:800;color:var(--txt);letter-spacing:-.4px}
.topbar-sub{font-size:12px;color:var(--txt3);margin-top:1px;font-weight:400}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.tb-btn{
  height:36px;padding:0 14px;border-radius:var(--rsm);
  font-size:12px;font-weight:700;cursor:pointer;border:none;
  display:flex;align-items:center;gap:6px;
  font-family:'Sora',sans-serif;transition:all .15s ease;
}
.tb-btn.primary{background:var(--green);color:#fff;box-shadow:0 2px 12px rgba(27,94,32,.25)}
.tb-btn.primary:hover{background:var(--green2);box-shadow:0 4px 18px rgba(27,94,32,.3)}
.tb-btn.secondary{background:var(--bg2);color:var(--txt);border:1px solid var(--bdr)}
.tb-btn.secondary:hover{border-color:var(--bdr2);background:var(--bg3)}
.tb-icon{
  width:36px;height:36px;border-radius:var(--rsm);
  background:var(--bg2);border:1px solid var(--bdr);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:all .15s;color:var(--txt3);position:relative;
}
.tb-icon:hover{border-color:var(--bdr2);color:var(--txt)}
.tb-dot{
  position:absolute;top:6px;right:6px;width:7px;height:7px;
  border-radius:50%;background:var(--red);border:1.5px solid var(--bg2);
}
.search-wrap{
  position:relative;flex:1;max-width:380px;
}
.search-ic{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--txt4);pointer-events:none}
.search-inp{
  width:100%;height:36px;padding:0 12px 0 36px;
  background:var(--bg3);border:1px solid var(--bdr);border-radius:var(--rsm);
  font-size:12px;color:var(--txt);font-family:'Sora',sans-serif;outline:none;
  transition:all .15s;
}
.search-inp:focus{border-color:var(--green3);background:var(--bg2);box-shadow:0 0 0 3px rgba(27,94,32,.08)}
.search-inp::placeholder{color:var(--txt4)}

/* PAGE BODY */
.page{flex:1;overflow-y:auto;padding:24px;scrollbar-width:thin;scrollbar-color:var(--bdr) transparent}
.page::-webkit-scrollbar{width:4px}
.page::-webkit-scrollbar-thumb{background:var(--bdr2);border-radius:4px}

/* GRID */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px}

/* CARDS */
.card{
  background:var(--bg2);border:1px solid var(--bdr);
  border-radius:var(--r2);padding:20px;
  box-shadow:var(--shsm);transition:box-shadow .2s;
}
.card:hover{box-shadow:var(--sh)}
.card-sm{padding:16px}
.card-title{font-size:13px;font-weight:700;color:var(--txt);margin-bottom:4px}
.card-sub{font-size:11px;color:var(--txt3);font-weight:400}

/* STAT CARD */
.stat-card{
  background:var(--bg2);border:1px solid var(--bdr);
  border-radius:var(--r2);padding:20px;
  border-top:3px solid transparent;
  box-shadow:var(--shsm);position:relative;overflow:hidden;
  transition:all .18s ease;
}
.stat-card:hover{box-shadow:var(--sh);transform:translateY(-2px)}
.stat-card::after{
  content:'';position:absolute;bottom:-20px;right:-20px;
  width:80px;height:80px;border-radius:50%;opacity:.06;
}
.stat-n{
  font-size:32px;font-weight:800;letter-spacing:-1.5px;line-height:1;
  font-family:'DM Mono',monospace;margin-bottom:5px;
}
.stat-l{font-size:11px;color:var(--txt3);font-weight:500;letter-spacing:.3px}
.stat-delta{
  display:inline-flex;align-items:center;gap:3px;
  font-size:10px;font-weight:700;margin-top:8px;padding:2px 7px;border-radius:20px;
}

/* SECTION HEADER */
.sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.sec-title{font-size:14px;font-weight:800;color:var(--txt);letter-spacing:-.3px}
.sec-sub{font-size:11px;color:var(--txt3);margin-top:1px}
.sec-link{font-size:12px;color:var(--green);font-weight:700;cursor:pointer;background:none;border:none;font-family:'Sora',sans-serif}

/* BADGES */
.badge{
  display:inline-flex;align-items:center;gap:4px;
  font-size:10px;font-weight:800;padding:3px 9px;border-radius:20px;
  border:1px solid transparent;white-space:nowrap;letter-spacing:.2px;font-family:'Sora',sans-serif;
}
.badge-dot{width:5px;height:5px;border-radius:50%}

/* FILTERS */
.filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.fchip{
  padding:6px 13px;border-radius:20px;font-size:11px;font-weight:700;
  cursor:pointer;border:1px solid var(--bdr);background:var(--bg2);color:var(--txt2);
  transition:all .15s;font-family:'Sora',sans-serif;
}
.fchip:hover{border-color:var(--bdr2)}
.fchip.on{background:var(--green);color:#fff;border-color:var(--green)}

/* VIEW TOGGLE */
.vtoggle{
  display:flex;background:var(--bg3);border-radius:var(--rsm);padding:3px;border:1px solid var(--bdr);
}
.vt{
  padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;
  cursor:pointer;border:none;background:transparent;color:var(--txt3);
  font-family:'Sora',sans-serif;transition:all .15s;display:flex;align-items:center;gap:5px;
}
.vt.on{background:var(--bg2);color:var(--green);box-shadow:var(--shsm);border:1px solid var(--bdr)}

/* COMPLAINT ROW */
.cr{
  display:flex;align-items:flex-start;gap:14px;
  padding:16px 18px;border-bottom:1px solid var(--bg3);
  cursor:pointer;transition:all .15s;position:relative;
}
.cr:hover{background:var(--bg3)}
.cr:last-child{border-bottom:none}
.cr-left{flex:1;min-width:0}
.cr-top{display:flex;align-items:center;gap:7px;margin-bottom:5px;flex-wrap:wrap}
.cr-id{font-family:'DM Mono',monospace;font-size:11px;color:var(--txt3);font-weight:500}
.cr-title{font-size:13px;font-weight:700;color:var(--txt);line-height:1.45;margin-bottom:6px;letter-spacing:-.15px}
.cr-meta{display:flex;align-items:center;gap:12px;font-size:11px;color:var(--txt3)}
.cr-meta-ic{display:flex;align-items:center;gap:3px}
.cr-score{display:flex;align-items:center;gap:8px;margin-top:7px}
.score-bar{flex:1;height:3px;background:var(--bg3);border-radius:3px;overflow:hidden}
.score-fill{height:100%;border-radius:3px;transition:width 1s ease}

/* MAP CONTAINER */
.map-container{
  border-radius:var(--r2);overflow:hidden;border:1px solid var(--bdr);
  box-shadow:var(--sh);position:relative;background:var(--bg3);
}
.map-inner{
  width:100%;position:relative;overflow:hidden;
  background:linear-gradient(135deg,#e8f4e8 0%,#d4ecd4 50%,#c8e4c8 100%);
}
.map-grid-lines{
  position:absolute;inset:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(27,94,32,.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(27,94,32,.04) 1px,transparent 1px);
  background-size:40px 40px;
}
.map-roads{position:absolute;inset:0;pointer-events:none}
.map-topbar{
  position:absolute;top:12px;left:50%;transform:translateX(-50%);
  display:flex;gap:6px;z-index:10;
}
.map-btn{
  padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;
  background:rgba(255,255,255,.95);border:1px solid var(--bdr);
  color:var(--txt);cursor:pointer;font-family:'Sora',sans-serif;
  box-shadow:var(--shsm);backdrop-filter:blur(8px);
  display:flex;align-items:center;gap:5px;transition:all .15s;
}
.map-btn.on{background:var(--green);color:#fff;border-color:var(--green)}
.map-btn:hover:not(.on){background:#fff;box-shadow:var(--sh)}

/* MAP MARKER */
.mk{
  position:absolute;transform:translate(-50%,-100%);
  cursor:pointer;z-index:5;
}
.mk-pin{
  width:32px;height:32px;border-radius:50% 50% 50% 0;
  transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
  border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.2);
  transition:transform .15s;
}
.mk:hover .mk-pin{transform:rotate(-45deg) scale(1.15)}
.mk-ic{transform:rotate(45deg);font-size:12px}
.mk-label{
  position:absolute;top:-42px;left:50%;transform:translateX(-50%);
  background:rgba(255,255,255,.97);border:1px solid var(--bdr);
  border-radius:var(--rsm);padding:3px 8px;font-size:10px;font-weight:700;
  color:var(--txt);white-space:nowrap;box-shadow:var(--shsm);
  pointer-events:none;opacity:0;transition:opacity .15s;
}
.mk:hover .mk-label{opacity:1}

/* MAP LEGEND */
.map-legend{
  position:absolute;bottom:12px;left:12px;
  background:rgba(255,255,255,.95);border:1px solid var(--bdr);
  border-radius:var(--r);padding:10px 12px;
  box-shadow:var(--shsm);backdrop-filter:blur(8px);z-index:10;
}
.legend-title{font-size:9px;font-weight:800;color:var(--txt3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:7px}
.legend-item{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--txt2);margin-bottom:4px;font-weight:500}
.legend-dot{width:10px;height:10px;border-radius:50%;border:1.5px solid rgba(255,255,255,.6)}

/* MAP STAT STRIP */
.map-stats{
  position:absolute;top:12px;right:12px;
  display:flex;flex-direction:column;gap:5px;z-index:10;
}
.ms{
  background:rgba(255,255,255,.95);border:1px solid var(--bdr);
  border-radius:var(--rsm);padding:8px 11px;
  box-shadow:var(--shsm);backdrop-filter:blur(8px);min-width:90px;
}
.ms-n{font-family:'DM Mono',monospace;font-size:16px;font-weight:700;line-height:1}
.ms-l{font-size:9px;color:var(--txt3);font-weight:600;margin-top:2px}

/* DETAIL PANEL */
.detail-panel{
  position:fixed;top:0;right:0;width:480px;height:100vh;
  background:var(--bg2);border-left:1px solid var(--bdr);
  box-shadow:-8px 0 40px rgba(27,94,32,.1);z-index:100;
  display:flex;flex-direction:column;overflow:hidden;
  transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);
}
.detail-panel.open{transform:translateX(0)}
.dp-hdr{
  padding:18px 20px;border-bottom:1px solid var(--bdr);
  background:var(--bg2);display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.dp-close{
  width:32px;height:32px;border-radius:var(--rsm);border:1px solid var(--bdr);
  background:var(--bg3);cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:var(--txt3);transition:all .13s;flex-shrink:0;
}
.dp-close:hover{background:var(--redbg);color:var(--red);border-color:var(--redbdr)}
.dp-body{flex:1;overflow-y:auto;padding:20px;scrollbar-width:thin;scrollbar-color:var(--bdr) transparent}
.dp-body::-webkit-scrollbar{width:3px}
.dp-footer{
  padding:14px 20px;border-top:1px solid var(--bdr);
  background:var(--bg2);display:flex;gap:8px;flex-shrink:0;
}

/* TIMELINE */
.tl{padding:4px 0}
.tl-item{display:flex;gap:12px;padding-bottom:18px;position:relative}
.tl-item:last-child{padding-bottom:0}
.tl-item:not(:last-child)::after{
  content:'';position:absolute;left:11px;top:26px;
  bottom:0;width:1px;background:var(--bdr);
}
.tl-dot{
  width:24px;height:24px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;border:1.5px solid;
}
.tl-status{font-size:12px;font-weight:800;letter-spacing:-.1px}
.tl-date{font-size:10px;color:var(--txt3);margin-top:1px}
.tl-note{font-size:11px;color:var(--txt2);margin-top:3px;line-height:1.5}
.tl-actor{font-size:10px;color:var(--txt4);margin-top:2px}

/* SLA BAR */
.sla-bar-wrap{margin:12px 0}
.sla-track{height:6px;background:var(--bg3);border-radius:6px;overflow:hidden;margin-top:5px}
.sla-fill{height:100%;border-radius:6px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}
.sla-row{display:flex;justify-content:space-between;align-items:center}
.sla-label{font-size:11px;font-weight:700}
.sla-time{font-family:'DM Mono',monospace;font-size:11px;font-weight:500}

/* INTERNAL NOTES */
.note-item{
  padding:11px 13px;border-radius:var(--rsm);margin-bottom:8px;
  border:1px solid;
}
.note-blocage{background:var(--orgbg);border-color:var(--orgbdr)}
.note-normal{background:var(--bg3);border-color:var(--bdr)}
.note-content{font-size:12px;color:var(--txt);line-height:1.55;margin-bottom:5px}
.note-meta{font-size:10px;color:var(--txt3);display:flex;gap:8px}

/* FORM */
.form-section{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r2);padding:20px;margin-bottom:14px;box-shadow:var(--shsm)}
.form-label{font-size:11px;font-weight:800;color:var(--txt2);letter-spacing:.4px;text-transform:uppercase;display:block;margin-bottom:6px}
.req{color:var(--red)}
.form-inp{
  width:100%;padding:10px 13px;border:1.5px solid var(--bdr);border-radius:var(--rsm);
  font-size:13px;color:var(--txt);font-family:'Sora',sans-serif;outline:none;
  background:var(--bg3);transition:all .15s;
}
.form-inp:focus{border-color:var(--green3);background:var(--bg2);box-shadow:0 0 0 3px rgba(27,94,32,.07)}
.form-inp::placeholder{color:var(--txt4)}
.form-txta{resize:vertical;min-height:88px;line-height:1.6}

/* STEPPER */
.stepper{display:flex;align-items:center;gap:0;margin-bottom:18px}
.step-unit{flex:1;display:flex;flex-direction:column;align-items:center;position:relative}
.step-line{position:absolute;top:14px;left:50%;width:100%;height:1.5px;z-index:0}
.step-circle{
  width:28px;height:28px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;border:2px solid;
  position:relative;z-index:1;transition:all .22s ease;background:var(--bg2);
}
.step-circle.done{background:var(--green);border-color:var(--green);color:#fff}
.step-circle.active{background:var(--bg2);border-color:var(--green);color:var(--green);box-shadow:0 0 0 5px rgba(27,94,32,.1)}
.step-circle.idle{background:var(--bg3);border-color:var(--bdr2);color:var(--txt3)}
.step-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:5px;text-align:center}

/* MAP PICKER */
.map-picker{
  border-radius:var(--rsm);overflow:hidden;border:1.5px solid var(--bdr);
  position:relative;height:200px;background:linear-gradient(135deg,#e8f4e8,#d4ecd4);
  cursor:crosshair;margin-bottom:10px;
}
.mp-grid{
  position:absolute;inset:0;
  background-image:linear-gradient(rgba(27,94,32,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(27,94,32,.04) 1px,transparent 1px);
  background-size:30px 30px;
}
.mp-pin{
  position:absolute;width:24px;height:24px;border-radius:50% 50% 50% 0;
  background:var(--red);transform:rotate(-45deg) translate(50%,-50%);
  border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);
  transition:all .2s cubic-bezier(.34,1.56,.64,1);
}
.mp-pulse{
  position:absolute;width:40px;height:40px;border-radius:50%;
  background:rgba(183,28,28,.15);transform:translate(-50%,-50%);
  animation:pulse 2s ease-in-out infinite;
}
@keyframes pulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6}50%{transform:translate(-50%,-50%) scale(1.4);opacity:.1}}
.mp-coords{
  position:absolute;bottom:8px;left:8px;
  font-family:'DM Mono',monospace;font-size:10px;color:var(--txt2);
  background:rgba(255,255,255,.9);padding:3px 8px;border-radius:5px;border:1px solid var(--bdr);
}
.mp-hint{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  background:rgba(255,255,255,.9);padding:8px 14px;border-radius:var(--rsm);
  font-size:12px;color:var(--txt3);border:1px solid var(--bdr);font-weight:500;
  pointer-events:none;
}

/* CATEGORY GRID */
.cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}
.cat-card{
  padding:12px;border-radius:var(--rsm);cursor:pointer;
  border:1.5px solid var(--bdr);background:var(--bg3);
  transition:all .16s ease;text-align:left;font-family:'Sora',sans-serif;
}
.cat-card.selected{border-color:var(--green);background:var(--accentbg)}
.cat-card:hover:not(.selected){border-color:var(--bdr2);background:var(--bg2)}
.cat-ic{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:7px}
.cat-name{font-size:12px;font-weight:800;color:var(--txt)}
.cat-desc{font-size:10px;color:var(--txt3);margin-top:2px;line-height:1.4}
.ai-suggest{
  display:inline-flex;align-items:center;gap:4px;
  font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px;
  background:rgba(69,39,160,.08);color:var(--purple);border:1px solid rgba(69,39,160,.2);
  margin-top:3px;
}

/* URGENCY */
.urg-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.urg-item{
  padding:10px 6px;border-radius:var(--rsm);text-align:center;
  cursor:pointer;border:1.5px solid var(--bdr);background:var(--bg3);
  transition:all .16s ease;font-family:'Sora',sans-serif;
}
.urg-item.selected{border-width:2px}
.urg-dot{width:10px;height:10px;border-radius:50%;margin:0 auto 6px}
.urg-lbl{font-size:10px;font-weight:800;color:var(--txt2)}
.urg-sla{font-size:9px;color:var(--txt4);margin-top:2px}

/* UPLOAD */
.upload-zone{
  border:2px dashed var(--bdr2);border-radius:var(--rsm);padding:28px;
  text-align:center;background:var(--bg3);cursor:pointer;
  transition:all .16s ease;
}
.upload-zone:hover{border-color:var(--green3);background:var(--accentbg)}
.thumb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.thumb{
  aspect-ratio:1;border-radius:var(--rsm);position:relative;overflow:hidden;
  border:1px solid var(--bdr);
}
.thumb-rm{
  position:absolute;top:4px;right:4px;width:18px;height:18px;
  background:var(--red);color:#fff;border-radius:50%;border:none;
  font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;
}

/* REVIEW CARD */
.rv{padding:10px 0;border-bottom:1px solid var(--bg3);display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.rv:last-child{border-bottom:none}
.rv-key{font-size:11px;color:var(--txt3);font-weight:600;flex-shrink:0}
.rv-val{font-size:12px;font-weight:700;color:var(--txt);text-align:right}

/* BUTTONS */
.btn{
  display:flex;align-items:center;justify-content:center;gap:7px;
  padding:10px 20px;border-radius:var(--rsm);font-size:13px;font-weight:800;
  cursor:pointer;border:none;font-family:'Sora',sans-serif;transition:all .15s ease;
}
.btn.primary{background:var(--green);color:#fff;box-shadow:0 2px 14px rgba(27,94,32,.22)}
.btn.primary:hover{background:var(--green2);box-shadow:0 4px 20px rgba(27,94,32,.3)}
.btn.primary:disabled{background:var(--txt4);box-shadow:none;cursor:not-allowed}
.btn.secondary{background:var(--bg2);color:var(--txt);border:1.5px solid var(--bdr)}
.btn.secondary:hover{border-color:var(--bdr2);background:var(--bg3)}
.btn.danger{background:var(--redbg);color:var(--red);border:1.5px solid var(--redbdr)}
.btn.danger:hover{background:var(--red);color:#fff}
.btn.warn{background:var(--orgbg);color:var(--orange);border:1.5px solid var(--orgbdr)}
.btn.warn:hover{background:var(--orange);color:#fff}
.btn.sm{padding:7px 14px;font-size:11px}
.btn.icon-only{width:32px;height:32px;padding:0}

/* ACTION ROW */
.action-row{display:flex;gap:7px;margin-top:12px}

/* AGENT QUEUE ITEM */
.qi{
  background:var(--bg2);border:1px solid var(--bdr);
  border-radius:var(--r);padding:16px 18px;margin-bottom:8px;
  transition:all .15s;box-shadow:var(--shsm);
}
.qi:hover{box-shadow:var(--sh)}
.qi.urgent{border-left:3px solid var(--red)}
.qi.high{border-left:3px solid var(--orange)}
.qi.medium{border-left:3px solid var(--amber)}

/* TECH TASK CARD */
.task{
  background:var(--bg2);border:1px solid var(--bdr);
  border-radius:var(--r);padding:15px;margin-bottom:9px;
  box-shadow:var(--shsm);transition:all .15s;
}
.task:hover{box-shadow:var(--sh)}

/* ANALYTICS */
.chart-bar-wrap{margin-bottom:11px}
.chart-bar-hdr{display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px}
.chart-bar-track{height:8px;background:var(--bg3);border-radius:6px;overflow:hidden;border:1px solid var(--bdr)}
.chart-bar-fill{height:100%;border-radius:6px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}

.col-bars{display:flex;align-items:flex-end;gap:8px;height:80px;margin-top:8px}
.col-bar-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.col-bar{width:100%;border-radius:4px 4px 0 0;transition:height .9s cubic-bezier(.4,0,.2,1)}
.col-lbl{font-size:9px;color:var(--txt3);font-weight:600}

/* NOTIF PANEL */
.notif-panel{
  position:absolute;top:50px;right:0;width:340px;
  background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r2);
  box-shadow:var(--shmd);z-index:200;overflow:hidden;
  animation:dropIn .18s cubic-bezier(.4,0,.2,1);
}
@keyframes dropIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.np-hdr{
  padding:13px 16px;border-bottom:1px solid var(--bdr);
  display:flex;align-items:center;justify-content:space-between;
}
.np-title{font-size:13px;font-weight:800;color:var(--txt)}
.np-clear{font-size:11px;color:var(--green);font-weight:700;cursor:pointer;background:none;border:none;font-family:'Sora',sans-serif}
.notif-item{
  display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--bg3);
  transition:background .12s;cursor:pointer;
}
.notif-item:hover{background:var(--bg3)}
.notif-item:last-child{border-bottom:none}
.ni-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}
.ni-msg{font-size:12px;color:var(--txt);line-height:1.45}
.ni-time{font-size:10px;color:var(--txt3);margin-top:2px}

/* ROLE SWITCHER */
.role-sw{
  display:flex;gap:5px;overflow-x:auto;padding:2px;
  scrollbar-width:none;
}
.role-sw::-webkit-scrollbar{display:none}
.rc{
  flex-shrink:0;padding:5px 13px;border-radius:20px;
  font-size:11px;font-weight:800;cursor:pointer;border:1.5px solid transparent;
  transition:all .16s;font-family:'Sora',sans-serif;
}
.rc.on{background:var(--green);color:#fff;border-color:var(--green)}
.rc.off{background:var(--bg2);color:var(--txt2);border-color:var(--bdr)}
.rc.off:hover{border-color:var(--bdr2)}

/* USER TABLE */
.utbl{width:100%;border-collapse:collapse}
.utbl th{font-size:10px;font-weight:800;color:var(--txt3);letter-spacing:.5px;text-transform:uppercase;padding:9px 12px;text-align:left;border-bottom:1px solid var(--bdr)}
.utbl td{padding:11px 12px;border-bottom:1px solid var(--bg3);font-size:12px;color:var(--txt);vertical-align:middle}
.utbl tr:last-child td{border-bottom:none}
.utbl tr:hover td{background:var(--bg3)}
.avatar-sm{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0}

/* SPIN */
.spin{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:rot .6s linear infinite}
@keyframes rot{to{transform:rotate(360deg)}}

/* ALERT */
.alert{
  border-radius:var(--rsm);padding:12px 14px;margin-bottom:14px;
  display:flex;align-items:flex-start;gap:10px;border:1px solid;
  animation:slideUp .25s cubic-bezier(.4,0,.2,1);
}
@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.alert-icon{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}

/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
.au{animation:fadeUp .3s cubic-bezier(.4,0,.2,1) both}
.sr{animation:slideRight .28s cubic-bezier(.34,1.1,.64,1) both}

/* DIVIDER */
.divider{height:1px;background:var(--bdr);margin:16px 0}

/* OVERLAY */
.overlay{position:fixed;inset:0;background:rgba(27,94,32,.1);backdrop-filter:blur(2px);z-index:99}
`;

// ── STATUS CONFIG ──
const ST: Record<string, { l: string; bg: string; c: string; bc: string }> = {
  SUBMITTED:   { l:"Submitted",   bg:"var(--bluebg)",   c:"var(--blue)",   bc:"var(--bluebdr)"  },
  VALIDATED:   { l:"Validated",   bg:"var(--accentbg)", c:"var(--green3)", bc:"var(--accentbdr)" },
  ASSIGNED:    { l:"Assigned",    bg:"var(--purbg)",    c:"var(--purple)", bc:"var(--purbdr)"   },
  IN_PROGRESS: { l:"In Progress", bg:"var(--orgbg)",    c:"var(--orange)", bc:"var(--orgbdr)"   },
  RESOLVED:    { l:"Resolved",    bg:"var(--telbg)",    c:"var(--teal)",   bc:"var(--telbdr)"   },
  CLOSED:      { l:"Closed",      bg:"var(--accentbg2)",c:"var(--green)",  bc:"var(--accentbdr)" },
  REJECTED:    { l:"Rejected",    bg:"var(--redbg)",    c:"var(--red)",    bc:"var(--redbdr)"   },
};
const URG: Record<string, { l: string; c: string; bg: string; sla: string }> = {
  LOW:      { l:"Low",      c:"#43A047", bg:"#E8F5E9", sla:"7 days"  },
  MEDIUM:   { l:"Medium",   c:"#F57F17", bg:"#FFFDE7", sla:"5 days"  },
  HIGH:     { l:"High",     c:"#E65100", bg:"#FFF3E0", sla:"48h"     },
  URGENT:   { l:"Critical", c:"#B71C1C", bg:"#FFEBEE", sla:"8h"      },
};
const CATS = [
  { id:"ROUTES",        name:"Roads & Traffic",     desc:"Potholes, sidewalks, signs",      color:"#1565C0", bg:"#EBF2FF" },
  { id:"DECHETS",       name:"Waste & Cleanliness", desc:"Overflowing bins, illegal dumps", color:"#795548", bg:"#EFEBE9" },
  { id:"EAU",           name:"Water & Drainage",    desc:"Leaks, blocked drains",           color:"#0288D1", bg:"#E1F5FE" },
  { id:"ECLAIRAGE",     name:"Street Lighting",     desc:"Broken lamps, dark streets",      color:"#F9A825", bg:"#FFFDE7" },
  { id:"SECURITE",      name:"Public Safety",       desc:"Hazards, accidents, noise",       color:"#B71C1C", bg:"#FFEBEE" },
  { id:"BIENS_PUBLICS", name:"Parks & Spaces",      desc:"Parks, benches, monuments",       color:"#2E7D32", bg:"#E8F5E9" },
  { id:"AUTRE",         name:"Other",               desc:"Anything else",                   color:"#546E7A", bg:"#ECEFF1" },
];

// Map backend categories to frontend categories
const CATEGORY_MAP: Record<string, string> = {
  ROAD: "ROUTES", LIGHTING: "ECLAIRAGE", WASTE: "DECHETS", WATER: "EAU",
  SAFETY: "SECURITE", PUBLIC_PROPERTY: "BIENS_PUBLICS", GREEN_SPACE: "BIENS_PUBLICS",
  TRAFFIC: "ROUTES", OTHER: "AUTRE"
};

// Map frontend categories to backend categories (reverse mapping)
const FRONTEND_TO_BACKEND_CATEGORY: Record<string, string> = {
  ROUTES: "ROAD", DECHETS: "WASTE", EAU: "WATER", ECLAIRAGE: "LIGHTING",
  SECURITE: "SAFETY", BIENS_PUBLICS: "PUBLIC_PROPERTY", AUTRE: "OTHER"
};

// Map form urgency (1-4) to backend urgency
const URGENCY_MAP: Record<string, ComplaintUrgency> = {
  "1": "LOW", "2": "MEDIUM", "3": "HIGH", "4": "URGENT"
};

const ROLE_LABELS: Record<string, string> = {
  CITIZEN: "Citizen", MUNICIPAL_AGENT: "Municipal Agent", 
  TECHNICIAN: "Technician", DEPARTMENT_MANAGER: "Dept. Manager", ADMIN: "Administrator"
};

// ── MOCK DATA (will be replaced by backend data) ──
const MOCK: Complaint[] = [];

// ── SVG ICONS ──
const Ic = {
  map:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>,
  list:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  bell:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  plus:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  filter:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  check:   <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  x:       <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  pin:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  clock:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  ai:      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  warn:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  search:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  logout:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  dash:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  complaint:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  users:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  chart:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  tasks:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  edit:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  archive: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
};

// ── ANIMATED COUNTER ──
function AnimNum({ to, delay=0 }: { to: number; delay?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = Date.now() + delay;
    const go = () => {
      const now = Date.now();
      if (now < start) { raf = requestAnimationFrame(go); return; }
      const p = Math.min((now - start) / 900, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * e));
      if (p < 1) raf = requestAnimationFrame(go);
    };
    raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return <>{v}</>;
}

// ── BADGE ──
function SBadge({ s }: { s: string }) {
  const cfg = ST[s] || ST.SUBMITTED;
  return <span className="badge" style={{ background:cfg.bg, color:cfg.c, borderColor:cfg.bc }}>{cfg.l}</span>;
}
function UBadge({ u }: { u: string }) {
  const cfg = URG[u] || URG.LOW;
  return <span className="badge" style={{ background:cfg.bg, color:cfg.c, borderColor:`${cfg.c}30` }}>{cfg.l}</span>;
}

// ── MAP COMPONENT ──
interface CityMapProps {
  complaints: Complaint[];
  onSelect: (c: Complaint) => void;
  selected: Complaint | null;
  height?: number;
}

function CityMap({ complaints, onSelect, selected, height = 400 }: CityMapProps) {
  const [mode, setMode] = useState("all");
  const [hovMk, setHovMk] = useState<string | null>(null);
  const MODES = { all:"All", submitted:"Pending", in_progress:"Active", resolved:"Resolved" };
  
  const filtered = mode === "all" ? complaints : complaints.filter(c => c.status.toLowerCase().includes(mode));

  const catColors: Record<string, string> = { 
    ROUTES:"#1565C0", DECHETS:"#795548", EAU:"#0288D1", ECLAIRAGE:"#F9A825", 
    SECURITE:"#B71C1C", BIENS_PUBLICS:"#2E7D32", AUTRE:"#546E7A" 
  };

  // Convert backend status to frontend status
  const getStatusKey = (status: string): string => {
    const map: Record<string, string> = {
      'IN_PROGRESS': 'in_progress'
    };
    return map[status] || status.toLowerCase();
  };

  return (
    <div className="map-container" style={{ height }}>
      <div className="map-inner" style={{ height: "100%" }}>
        <div className="map-grid-lines" />
        {/* Roads simulation */}
        <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:.25 }}>
          <line x1="0" y1="40%" x2="100%" y2="38%" stroke="#1B5E20" strokeWidth="3" />
          <line x1="0" y1="65%" x2="100%" y2="62%" stroke="#1B5E20" strokeWidth="2" />
          <line x1="30%" y1="0" x2="32%" y2="100%" stroke="#1B5E20" strokeWidth="3" />
          <line x1="70%" y1="0" x2="68%" y2="100%" stroke="#1B5E20" strokeWidth="2" />
          <line x1="0" y1="20%" x2="100%" y2="22%" stroke="#1B5E20" strokeWidth="1" strokeDasharray="6,4" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1B5E20" strokeWidth="1" strokeDasharray="6,4" />
        </svg>

        {/* Filter bar */}
        <div className="map-topbar">
          {Object.entries(MODES).map(([k,v]) => (
            <button key={k} className={`map-btn ${mode===k?"on":""}`} onClick={() => setMode(k)}>{v}</button>
          ))}
        </div>

        {/* Map stats */}
        <div className="map-stats">
          {[
            { n: complaints.filter(c=>c.status==="SUBMITTED").length,   l:"Pending",     c:"var(--blue)"   },
            { n: complaints.filter(c=>c.status==="IN_PROGRESS").length, l:"Active",      c:"var(--orange)" },
            { n: complaints.filter(c=>["RESOLVED","CLOSED"].includes(c.status)).length, l:"Resolved", c:"var(--green3)" },
          ].map((s,i) => (
            <div key={i} className="ms">
              <div className="ms-n" style={{ color:s.c }}>{s.n}</div>
              <div className="ms-l">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Markers */}
        {filtered.map((c) => {
          const statusKey = getStatusKey(c.status);
          const cfg = ST[c.status] || ST.SUBMITTED;
          const mappedCat = CATEGORY_MAP[c.category] || c.category;
          const col = catColors[mappedCat] || "#546E7A";
          const isSelected = selected?.id === c.id || selected?._id === c._id;
          
          // Get coordinates - use default Tunisia coordinates if not available
          const lat = c.location?.latitude || 36.8;
          const lng = c.location?.longitude || 10.2;
          
          // Convert to percentage for display (Tunisia bounds: lat 30-38, lng 7-12)
          const leftPct = ((lng - 7) / 5) * 100;
          const topPct = ((38 - lat) / 8) * 100;

          return (
            <div key={c._id || c.id}
              className="mk"
              style={{ left:`${Math.min(95, Math.max(5, leftPct))}%`, top:`${Math.min(90, Math.max(10, topPct))}%`, zIndex: isSelected ? 20 : hovMk === (c._id || c.id) ? 15 : 5 }}
              onClick={() => onSelect(c)}
              onMouseEnter={() => setHovMk(c._id || c.id || null)}
              onMouseLeave={() => setHovMk(null)}
            >
              <div className="mk-pin" style={{
                background: cfg.c,
                transform: `rotate(-45deg) scale(${isSelected ? 1.3 : 1})`,
                boxShadow: isSelected ? `0 4px 16px ${cfg.c}60` : undefined,
                transition:"all .2s cubic-bezier(.34,1.56,.64,1)",
              }}>
                <div className="mk-ic" style={{ fontSize: 10, color:"#fff", fontWeight:800 }}>
                  {c.urgency === "URGENT" ? "!" : (mappedCat[0] || "?")}
                </div>
              </div>
              <div className="mk-label">{c.id || c._id?.slice(-8)} — {c.urgency}</div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-title">Status</div>
          {[["SUBMITTED","var(--blue)"],["IN_PROGRESS","var(--orange)"],["RESOLVED","var(--teal)"],["REJECTED","var(--red)"]].map(([s,c])=>(
            <div key={s} className="legend-item">
              <div className="legend-dot" style={{ background:c, borderColor:c }} />
              {ST[s]?.l || s}
            </div>
          ))}
        </div>

        {/* OSM credit */}
        <div style={{ position:"absolute",bottom:8,right:8,fontSize:9,color:"var(--txt3)" }}>
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
}

// ── COMPLAINT DETAIL PANEL ──
interface DetailPanelProps {
  complaint: Complaint | null;
  open: boolean;
  onClose: () => void;
  role: string;
}

function DetailPanel({ complaint, open, onClose, role }: DetailPanelProps) {
  if (!complaint) return null;
  const cfg = ST[complaint.status] || ST.SUBMITTED;
  const slaOk = complaint.urgency === "LOW" || complaint.urgency === "MEDIUM";

  const tl = [
    { s:"SUBMITTED",   date:new Date(complaint.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), actor:"Citizen", note:"Complaint submitted online" },
    ...(complaint.statusHistory || []).map(h => ({
      s: h.status,
      date: new Date(h.updatedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      actor: h.updatedBy?.fullName || "System",
      note: h.notes || `${h.status} updated`
    }))
  ];

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    try {
      await complaintService.updateComplaintStatus(complaint._id || complaint.id!, newStatus);
      onClose();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  return (
    <>
      {open && <div className="overlay" onClick={onClose} />}
      <div className={`detail-panel ${open ? "open" : ""}`}>
        <div className="dp-hdr">
          <button className="dp-close" onClick={onClose}>{Ic.x}</button>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"DM Mono,monospace", fontSize:11, color:"var(--txt3)", marginBottom:2 }}>{complaint.id || complaint._id?.slice(-8)}</div>
            <div style={{ fontSize:14, fontWeight:800, color:"var(--txt)", letterSpacing:"-.3px", lineHeight:1.3 }}>{complaint.title}</div>
          </div>
        </div>
        <div className="dp-body">
          {/* Badges */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
            <SBadge s={complaint.status} />
            <UBadge u={complaint.urgency} />
            <span className="badge" style={{ background:"var(--bg3)", color:"var(--txt2)", borderColor:"var(--bdr)" }}>
              {Ic.pin} {complaint.location?.address || complaint.location?.municipality || "Unknown location"}
            </span>
          </div>

          {/* SLA */}
          {["ASSIGNED","IN_PROGRESS"].includes(complaint.status) && (
            <div className="sla-bar-wrap card" style={{ marginBottom:12 }}>
              <div className="sla-row">
                <span className="sla-label" style={{ color: slaOk ? "var(--green)" : "var(--red)" }}>
                  {slaOk ? "SLA On Track" : "SLA At Risk"}
                </span>
                <span className="sla-time" style={{ color:"var(--txt3)" }}>
                  {slaOk ? "38h remaining" : "4h remaining"}
                </span>
              </div>
              <div className="sla-track">
                <div className="sla-fill" style={{
                  width: slaOk ? "35%" : "88%",
                  background: slaOk ? "var(--accent)" : "var(--red)"
                }} />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="card card-sm" style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:8 }}>Description</div>
            <div style={{ fontSize:13, color:"var(--txt2)", lineHeight:1.7 }}>
              {complaint.description}
            </div>
          </div>

          {/* Location mini-map */}
          <div className="card card-sm" style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:8 }}>Location</div>
            <div style={{ height:90, borderRadius:8, background:"linear-gradient(135deg,#e8f4e8,#d4ecd4)", position:"relative", overflow:"hidden", border:"1px solid var(--bdr)", marginBottom:8 }}>
              <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(27,94,32,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(27,94,32,.04) 1px,transparent 1px)",backgroundSize:"20px 20px" }} />
              <div style={{ position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)" }}>
                <div style={{ width:16,height:16,borderRadius:"50% 50% 50% 0",background:"var(--red)",transform:"rotate(-45deg)",border:"2px solid #fff",boxShadow:"0 2px 8px rgba(0,0,0,.2)" }} />
              </div>
              <div style={{ position:"absolute",bottom:5,left:7,fontSize:9,color:"var(--txt2)",background:"rgba(255,255,255,.9)",padding:"2px 6px",borderRadius:4,fontFamily:"DM Mono,monospace" }}>
                {complaint.location?.latitude?.toFixed(4)}, {complaint.location?.longitude?.toFixed(4)}
              </div>
            </div>
            <div style={{ fontSize:12, color:"var(--txt2)", fontWeight:500 }}>{complaint.location?.address || complaint.location?.municipality || "Tunisia"}</div>
          </div>

          {/* Photos */}
          {complaint.media && complaint.media.length > 0 && (
            <div className="card card-sm" style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:8 }}>Photos</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                {complaint.media.slice(0,6).map((m, i) => (
                  <div key={i} style={{ aspectRatio:"1",borderRadius:8,background:"var(--bg3)",border:"1px solid var(--bdr)", overflow:"hidden" }}>
                    <img src={m.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card card-sm" style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:12 }}>Timeline</div>
            <div className="tl">
              {tl.map((t,i) => {
                const c = ST[t.s] || ST.SUBMITTED;
                return (
                  <div key={i} className="tl-item">
                    <div className="tl-dot" style={{ background:c.bg, borderColor:c.c }}>
                      <span style={{ color:c.c }}>{Ic.check}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span className="tl-status" style={{ color:c.c }}>{c.l}</span>
                        <span className="tl-date">{t.date}</span>
                      </div>
                      <div className="tl-note">{t.note}</div>
                      <div className="tl-actor">by {t.actor}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Internal notes - hide for citizen */}
          {role !== "CITIZEN" && (
            <div className="card card-sm" style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:10 }}>Internal Notes</div>
              {complaint.comments?.filter(c => c.isInternal).map((note, i) => (
                <div key={i} className="note-item note-normal">
                  <div className="note-content">{note.text}</div>
                  <div className="note-meta"><span>{note.author.fullName}</span><span>{new Date(note.createdAt).toLocaleString("en-GB")}</span></div>
                </div>
              ))}
              <div style={{ marginTop:10 }}>
                <textarea className="form-inp form-txta" placeholder="Add internal note..." style={{ fontSize:12, minHeight:60 }} />
                <div style={{ display:"flex", gap:7, marginTop:7 }}>
                  <button className="btn primary sm" style={{ flex:1 }}>Add Note</button>
                  {role==="TECHNICIAN" && <button className="btn warn sm" style={{ flex:1 }}>{Ic.warn} Report Blocker</button>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="dp-footer">
          {role === "MUNICIPAL_AGENT" && complaint.status === "SUBMITTED" && (
            <><button className="btn primary" style={{ flex:1, fontSize:12 }} onClick={() => handleStatusChange("VALIDATED")}>{Ic.check} Validate</button>
              <button className="btn danger" style={{ flex:1, fontSize:12 }} onClick={() => handleStatusChange("REJECTED")}>{Ic.x} Reject</button>
              <button className="btn secondary" style={{ flex:1, fontSize:12 }}>Assign Dept</button></>
          )}
          {role === "MUNICIPAL_AGENT" && complaint.status === "VALIDATED" && (
            <button className="btn primary" style={{ flex:1, fontSize:12 }} onClick={() => handleStatusChange("ASSIGNED")}>Assign Department</button>
          )}
          {role === "DEPARTMENT_MANAGER" && complaint.status === "ASSIGNED" && (
            <><button className="btn primary" style={{ flex:1, fontSize:12 }}>Assign Team</button>
              <button className="btn secondary" style={{ flex:1, fontSize:12 }}>Adjust Priority</button></>
          )}
          {role === "TECHNICIAN" && complaint.status === "ASSIGNED" && (
            <button className="btn primary" style={{ flex:1, fontSize:12 }} onClick={() => handleStatusChange("IN_PROGRESS")}>Start Work</button>
          )}
          {role === "TECHNICIAN" && complaint.status === "IN_PROGRESS" && (
            <><button className="btn primary" style={{ flex:1, fontSize:12 }} onClick={() => handleStatusChange("RESOLVED")}>Mark Resolved</button>
              <button className="btn warn" style={{ flex:1, fontSize:12 }}>{Ic.warn} Flag Blocker</button></>
          )}
          {role === "MUNICIPAL_AGENT" && complaint.status === "RESOLVED" && (
            <button className="btn primary" style={{ flex:1, fontSize:12 }} onClick={() => handleStatusChange("CLOSED")}>Close Complaint</button>
          )}
          {!["MUNICIPAL_AGENT","DEPARTMENT_MANAGER","TECHNICIAN","ADMIN"].includes(role) && (
            <button className="btn secondary" style={{ flex:1, fontSize:12 }}>Confirm Issue (+3 votes)</button>
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════
export default function SmartCityApp() {
  const { user, logout, token } = useAuthStore();
  
  const [role, setRole]         = useState("citizen");
  const [page, setPage]         = useState("dashboard");
  const [view, setView]         = useState("list");
  const [filter, setFilter]     = useState("ALL");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selC, setSelC]         = useState<Complaint | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState({ cat:"", urg:2, title:"", desc:"" });
  const [pinPos, setPinPos]     = useState<{x: number; y: number} | null>({x:50, y:50});
  const [showNotif, setShowNotif] = useState(false);
  const [aiPredicted, setAiPredicted] = useState<{cat: string; confidence: number} | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [archiveFilter, setArchiveFilter] = useState("all");

  // Map backend role to frontend role
  useEffect(() => {
    if (user?.role) {
      const roleMap: Record<string, string> = {
        CITIZEN: "citizen",
        MUNICIPAL_AGENT: "agent",
        TECHNICIAN: "technician",
        DEPARTMENT_MANAGER: "manager",
        ADMIN: "admin"
      };
      setRole(roleMap[user.role] || "citizen");
    }
  }, [user]);

  // Fetch complaints from backend
  useEffect(() => {
    async function fetchComplaints() {
      if (!token) return;
      
      setLoading(true);
      try {
        let response;
        if (role === "citizen") {
          response = await complaintService.getMyComplaints();
          if ('complaints' in response) {
            setComplaints(response.complaints || []);
          }
        } else {
          response = await complaintService.getAllComplaints({ includeArchived: true });
          if ('data' in response && response.data) {
            setComplaints(response.data.complaints || []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch complaints:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchComplaints();
  }, [token, role]);

  const meta = { 
    user: user?.fullName || "User", 
    role: ROLE_LABELS[user?.role || "CITIZEN"] || "Citizen",
    muni: user?.municipality?.name || user?.municipalityName || "—"
  };

  const openComplaint = (c: Complaint) => { setSelC(c); setPanelOpen(true); };
  const closePanel    = () => setPanelOpen(false);

  // Simulate AI prediction
  useEffect(() => {
    if (form.title.length > 12 && form.desc.length > 20) {
      const t = setTimeout(() => {
        setAiPredicted({ cat:"EAU", confidence:0.87 });
      }, 1200);
      return () => clearTimeout(t);
    } else {
      setAiPredicted(null);
    }
  }, [form.title, form.desc]);

  const filtered = filter === "ALL" ? complaints : complaints.filter(c => c.status === filter);

  const NAV: Record<string, [string, string, React.ReactNode][]> = {
    citizen:    [["dashboard","Dashboard",Ic.dash],["complaints","Complaints",Ic.complaint],["report","Report Issue",Ic.plus],["archive","Archives",Ic.archive]],
    agent:      [["dashboard","Dashboard",Ic.dash],["queue","Validation Queue",Ic.tasks],["complaints","Complaints",Ic.complaint],["archive","Archives",Ic.archive]],
    technician: [["dashboard","Dashboard",Ic.dash],["tasks","My Tasks",Ic.tasks],["complaints","Complaints",Ic.complaint]],
    manager:    [["dashboard","Dashboard",Ic.dash],["complaints","Complaints",Ic.complaint],["analytics","Analytics",Ic.chart],["archive","Archives",Ic.archive]],
    admin:      [["dashboard","Dashboard",Ic.dash],["complaints","Complaints",Ic.complaint],["users","Users",Ic.users],["analytics","Analytics",Ic.chart],["archive","Archives",Ic.archive]],
  };

  const PAGE_TITLE: Record<string, string> = { 
    dashboard:"Dashboard", complaints:"Complaints", report:"Report an Issue", 
    queue:"Validation Queue", tasks:"My Tasks", analytics:"Analytics", 
    users:"User Management", archive:"Archives" 
  };

  // ─── SIDEBAR ───
  const Sidebar = () => (
    <div className="sidebar">
      <div className="sb-logo">
        <div className="sb-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <div className="sb-name">Smart City<br/>Tunisia</div>
        </div>
      </div>

      <div className="sb-user">
        <div className="sb-avt">{meta.user.charAt(0)}</div>
        <div className="sb-uname">{meta.user}</div>
        <span className="sb-urole">{meta.role}</span>
      </div>

      {/* Role switcher - for demo purposes */}
      <div style={{ padding:"4px 14px 8px" }}>
        <div style={{ fontSize:9,fontWeight:700,color:"rgba(255,255,255,.35)",letterSpacing:".8px",textTransform:"uppercase",marginBottom:5 }}>Switch Role</div>
        <div className="role-sw">
          {[
            { id:"citizen",    label:"Citizen" },
            { id:"agent",      label:"Agent" },
            { id:"technician", label:"Tech" },
            { id:"manager",    label:"Manager" },
            { id:"admin",      label:"Admin" },
          ].map(r => (
            <button key={r.id} className={`rc ${role===r.id?"on":"off"}`}
              onClick={() => setRole(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sb-nav">
        <div className="sb-section">Navigation</div>
        {(NAV[role] || NAV.citizen).map(([id, label, icon]) => (
          <button key={id as string} className={`sb-item ${page===id?"active":""}`} onClick={() => { setPage(id as string); setShowNotif(false); }}>
            <span className="sb-ic">{icon as React.ReactNode}</span>
            {label as string}
            {id==="queue" && <span className="sb-badge">{complaints.filter(c=>c.status==="SUBMITTED").length}</span>}
            {id==="tasks" && <span className="sb-badge green">{complaints.filter(c=>["ASSIGNED","IN_PROGRESS"].includes(c.status)).length}</span>}
          </button>
        ))}
      </div>

      <div className="sb-footer">
        <button className="sb-logout" onClick={logout}>{Ic.logout} Sign Out</button>
      </div>
    </div>
  );

  // ─── TOPBAR ───
  const Topbar = () => (
    <div className="topbar">
      <div>
        <div className="topbar-title">{PAGE_TITLE[page] || "Dashboard"}</div>
        <div className="topbar-sub">{meta.muni !== "—" ? `${meta.muni} Municipality` : "All Municipalities"}</div>
      </div>
      <div className="search-wrap" style={{ marginLeft:20 }}>
        <span className="search-ic">{Ic.search}</span>
        <input className="search-inp" placeholder="Search complaints, IDs, locations..." />
      </div>
      <div className="topbar-right">
        {page === "complaints" && (
          <div className="vtoggle">
            <button className={`vt ${view==="list"?"on":""}`} onClick={() => setView("list")}>{Ic.list} List</button>
            <button className={`vt ${view==="map"?"on":""}`} onClick={() => setView("map")}>{Ic.map} Map</button>
            <button className={`vt ${view==="split"?"on":""}`} onClick={() => setView("split")}>Split</button>
          </div>
        )}
        <div style={{ position:"relative" }}>
          <div className="tb-icon" onClick={() => setShowNotif(o => !o)}>
            {Ic.bell}<span className="tb-dot" />
          </div>
        </div>
        {(page === "complaints" || page === "dashboard") && role === "citizen" && (
          <button className="tb-btn primary" onClick={() => setPage("report")}>{Ic.plus} New Complaint</button>
        )}
      </div>
    </div>
  );

  // ═══ DASHBOARD PAGE ═══
  const Dashboard = () => {
    const myComplaints = complaints;
    const pending = myComplaints.filter(c=>c.status==="SUBMITTED").length;
    const inProgress = myComplaints.filter(c=>["ASSIGNED","IN_PROGRESS"].includes(c.status)).length;
    const resolved = myComplaints.filter(c=>["RESOLVED","CLOSED"].includes(c.status)).length;

    const STATS: Record<string, { n: number; l: string; c: string; bc: string }[]> = {
      citizen:    [{ n:myComplaints.length,   l:"My Reports",     c:"var(--blue)",    bc:"var(--blue)"   }, { n:pending, l:"Pending", c:"var(--orange)", bc:"var(--orange)" }, { n:inProgress, l:"In Progress", c:"var(--green3)", bc:"var(--green3)"}, { n:resolved, l:"Resolved",   c:"var(--teal)",    bc:"var(--teal)"   }],
      agent:      [{ n:complaints.filter(c=>c.status==="SUBMITTED").length,   l:"Awaiting Review",c:"var(--orange)",  bc:"var(--orange)" }, { n:complaints.filter(c=>c.status==="VALIDATED").length,l:"Validated Today",   c:"var(--green3)",   bc:"var(--green3)" }, { n:complaints.filter(c=>["RESOLVED","CLOSED"].includes(c.status)).length,l:"Total Done", c:"var(--blue)", bc:"var(--blue)"}, { n:0, l:"SLA Overdue",c:"var(--red)",    bc:"var(--red)"   }],
      technician: [{ n:complaints.filter(c=>c.status==="ASSIGNED").length,   l:"Active Tasks",   c:"var(--orange)",  bc:"var(--orange)" }, { n:complaints.filter(c=>c.status==="IN_PROGRESS").length, l:"In Progress", c:"var(--blue)",   bc:"var(--blue)" }, { n:complaints.filter(c=>c.status==="RESOLVED").length, l:"Done Today",  c:"var(--green3)", bc:"var(--green3)"}, { n:0, l:"SLA At Risk",c:"var(--red)",    bc:"var(--red)"   }],
      manager:    [{ n:complaints.length,  l:"Total Active",   c:"var(--blue)",    bc:"var(--blue)"   }, { n:74,l:"Resolution %",c:"var(--green3)", bc:"var(--green3)" }, { n:36,l:"Avg TMA (h)", c:"var(--orange)", bc:"var(--orange)"}, { n:4, l:"SLA Overdue",c:"var(--red)",    bc:"var(--red)"   }],
      admin:      [{ n:264, l:"Municipalities", c:"var(--purple)",  bc:"var(--purple)" }, { n:complaints.length,l:"Total Complaints",c:"var(--blue)",bc:"var(--blue)"}, { n:73,l:"Resolution %",c:"var(--green3)", bc:"var(--green3)"}, { n:12,l:"Active Agents",c:"var(--orange)",bc:"var(--orange)"}],
    };

    const currentStats = STATS[role] || STATS.citizen;

    return (
      <div className="page">
        {/* Welcome banner */}
        <div style={{
          background:`linear-gradient(135deg, var(--green) 0%, var(--green2) 100%)`,
          borderRadius:"var(--r2)", padding:"22px 26px", marginBottom:20,
          position:"relative", overflow:"hidden", boxShadow:"0 4px 24px rgba(27,94,32,.2)"
        }}>
          <div style={{ position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none" }} />
          <div style={{ position:"absolute",bottom:-40,right:60,width:100,height:100,borderRadius:"50%",background:"rgba(0,200,83,.08)",pointerEvents:"none" }} />
          <div style={{ fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:4,fontWeight:500 }}>Good morning</div>
          <div style={{ fontSize:24,fontWeight:800,color:"#fff",letterSpacing:"-.5px",marginBottom:6 }}>{meta.user}</div>
          <span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",background:"rgba(255,255,255,.12)",borderRadius:20,color:"rgba(255,255,255,.9)",fontSize:11,fontWeight:700,border:"1px solid rgba(255,255,255,.15)" }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:"var(--accent)" }} />
            {meta.role} · {meta.muni}
          </span>
        </div>

        {/* Stats */}
        <div className="grid4" style={{ marginBottom:20 }}>
          {currentStats.map((s, i) => (
            <div key={i} className="stat-card au" style={{ animationDelay:`${i*55}ms`, borderTopColor:s.bc }}>
              <div className="stat-n" style={{ color:s.c }}><AnimNum to={s.n} delay={80+i*60} /></div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Map overview */}
        <div style={{ marginBottom:20 }}>
          <div className="sec-hdr">
            <div><div className="sec-title">City Overview Map</div><div className="sec-sub">Live complaint locations — click a marker for details</div></div>
            <button className="sec-link" onClick={() => { setPage("complaints"); setView("map"); }}>Full map →</button>
          </div>
          <CityMap complaints={complaints} onSelect={openComplaint} selected={selC} height={280} />
        </div>

        {/* Recent complaints */}
        <div className="sec-hdr">
          <div><div className="sec-title">Recent Complaints</div></div>
          <button className="sec-link" onClick={() => setPage("complaints")}>View all →</button>
        </div>
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--txt3)" }}>Loading...</div>
          ) : complaints.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--txt3)" }}>No complaints yet</div>
          ) : (
            complaints.slice(0,4).map((c,i) => (
              <div key={c._id || c.id} className="cr au" style={{ animationDelay:`${200+i*55}ms` }} onClick={() => openComplaint(c)}>
                <div className="cr-left">
                  <div className="cr-top">
                    <span className="cr-id">{c.id || c._id?.slice(-8)}</span>
                    <SBadge s={c.status} /><UBadge u={c.urgency} />
                    {c.department && <span className="badge" style={{ background:"var(--bg3)",color:"var(--txt3)",borderColor:"var(--bdr)",fontSize:9 }}>{c.department.name}</span>}
                  </div>
                  <div className="cr-title">{c.title}</div>
                  <div className="cr-meta">
                    <span className="cr-meta-ic">{Ic.pin} {c.location?.municipality || c.location?.address || "Unknown"}</span>
                    <span className="cr-meta-ic">{Ic.clock} {new Date(c.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ═══ COMPLAINTS PAGE ═══
  const ComplaintsPage = () => (
    <div className="page">
      {submitted && (
        <div className="alert" style={{ background:"var(--accentbg)", borderColor:"var(--accentbdr)" }}>
          <div className="alert-icon" style={{ background:"var(--accent)" }}><span style={{ color:"var(--green)" }}>{Ic.check}</span></div>
          <div>
            <div style={{ fontSize:13,fontWeight:800,color:"var(--green)" }}>Complaint submitted</div>
            <div style={{ fontSize:11,color:"var(--txt3)",marginTop:2 }}>You will receive email updates as your complaint progresses through the workflow.</div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div className="filter-row" style={{ marginBottom:0 }}>
          {["ALL","SUBMITTED","VALIDATED","ASSIGNED","IN_PROGRESS","RESOLVED","CLOSED"].map(s => (
            <button key={s} className={`fchip ${filter===s?"on":""}`} onClick={() => setFilter(s)}>
              {s==="ALL" ? "All" : ST[s]?.l || s}
            </button>
          ))}
        </div>
        <div style={{ fontSize:11, color:"var(--txt3)", fontFamily:"DM Mono,monospace", flexShrink:0, marginLeft:10 }}>{filtered.length} result{filtered.length!==1?"s":""}</div>
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          {filtered.length === 0
            ? <div style={{ padding:40, textAlign:"center", color:"var(--txt3)" }}>No complaints match this filter</div>
            : filtered.map((c,i) => (
              <div key={c._id || c.id} className="cr sr" style={{ animationDelay:`${i*45}ms` }} onClick={() => openComplaint(c)}>
                <div className="cr-left">
                  <div className="cr-top">
                    <span className="cr-id">{c.id || c._id?.slice(-8)}</span>
                    <SBadge s={c.status} /><UBadge u={c.urgency} />
                    {c.department && <span className="badge" style={{ background:"var(--bg3)",color:"var(--txt3)",borderColor:"var(--bdr)",fontSize:9 }}>{c.department.name}</span>}
                  </div>
                  <div className="cr-title">{c.title}</div>
                  <div className="cr-meta">
                    <span className="cr-meta-ic">{Ic.pin} {c.location?.municipality || c.location?.address}</span>
                    <span className="cr-meta-ic">{Ic.clock} {new Date(c.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* MAP VIEW */}
      {view === "map" && (
        <CityMap complaints={filtered} onSelect={openComplaint} selected={selC} height={560} />
      )}

      {/* SPLIT VIEW */}
      {view === "split" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, height:560 }}>
          <div className="card" style={{ padding:0, overflow:"hidden auto", height:560 }}>
            {filtered.map((c,i) => (
              <div key={c._id || c.id} className="cr" style={{ background:selC?.id===c.id || selC?._id===c._id?"var(--accentbg)":undefined, borderLeft:selC?.id===c.id || selC?._id===c._id?"3px solid var(--green)":undefined }} onClick={() => setSelC(c)}>
                <div className="cr-left">
                  <div className="cr-top"><span className="cr-id">{c.id || c._id?.slice(-8)}</span><SBadge s={c.status} /><UBadge u={c.urgency} /></div>
                  <div className="cr-title" style={{ fontSize:12 }}>{c.title}</div>
                  <div className="cr-meta">{Ic.pin} {c.location?.municipality || c.location?.address}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderRadius:"var(--r2)", overflow:"hidden" }}>
            <CityMap complaints={filtered} onSelect={(c) => { setSelC(c); setPanelOpen(true); }} selected={selC} height={560} />
          </div>
        </div>
      )}
    </div>
  );

  // ═══ REPORT FORM PAGE ═══
  const ReportForm = () => {
    const STEPS = ["Location","Details","Media","Review"];
    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPinPos({ x:((e.clientX-rect.left)/rect.width)*100, y:((e.clientY-rect.top)/rect.height)*100 });
    };
    const doSubmit = async () => {
      setSubmitting(true);
      try {
        await complaintService.submitComplaint({
          title: form.title,
          description: form.desc,
          category: (FRONTEND_TO_BACKEND_CATEGORY[form.cat] || "OTHER") as ComplaintCategory,
          urgency: URGENCY_MAP[String(form.urg)] || "LOW",
          location: {
            latitude: 36.8065 + (pinPos?.y || 50) * 0.01,
            longitude: 10.1815 + (pinPos?.x || 50) * 0.01,
          }
        });
        setSubmitted(true);
        setTimeout(() => { setSubmitting(false); setPage("complaints"); setStep(1); }, 1600);
      } catch (err) {
        console.error(err);
        setSubmitting(false);
      }
    };
    return (
      <div className="page" style={{ maxWidth:680, margin:"0 auto" }}>
        {/* Stepper */}
        <div style={{ background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:"var(--r2)",padding:"18px 24px",marginBottom:16,boxShadow:"var(--shsm)" }}>
          <div className="stepper">
            {STEPS.map((s,i) => {
              const done=i+1<step, active=i+1===step;
              return (
                <div key={i} className="step-unit">
                  {i>0&&<div className="step-line" style={{ background:done||active?"var(--green3)":"var(--bdr)" }} />}
                  <div className={`step-circle ${done?"done":active?"active":"idle"}`}>
                    {done ? <span>{Ic.check}</span> : i+1}
                  </div>
                  <div className="step-lbl" style={{ color:active?"var(--green)":done?"var(--txt3)":"var(--txt4)" }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1 — Location */}
        {step===1 && <div className="au">
          <div className="form-section">
            <label className="form-label">Address <span className="req">*</span></label>
            <input className="form-inp" placeholder="e.g. Rue de la République, Tunis" style={{ marginBottom:12 }} />
            <div className="map-picker" onClick={handleMapClick}>
              <div className="mp-grid" />
              {pinPos ? (
                <>
                  <div className="mp-pulse" style={{ left:`${pinPos.x}%`,top:`${pinPos.y}%` }} />
                  <div className="mp-pin" style={{ left:`${pinPos.x}%`,top:`${pinPos.y}%`,transform:`rotate(-45deg) translate(50%,-50%)` }} />
                  <div className="mp-coords">{(36.8065+pinPos.y*0.01).toFixed(4)}, {(10.1815+pinPos.x*0.01).toFixed(4)}</div>
                </>
              ) : (
                <div className="mp-hint">{Ic.pin} Click to place pin</div>
              )}
            </div>
            <div className="grid2" style={{ gap:10, marginBottom:10 }}>
              <div><label className="form-label">Governorate</label><input className="form-inp" defaultValue="Nabeul" /></div>
              <div><label className="form-label">Municipality</label><input className="form-inp" placeholder="Beni Khiar" /></div>
            </div>
          </div>
        </div>}

        {/* STEP 2 — Details */}
        {step===2 && <div className="au">
          <div className="form-section" style={{ marginBottom:12 }}>
            <label className="form-label">Title <span className="req">*</span></label>
            <input className="form-inp" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Brief summary of the issue..." />
          </div>
          <div className="form-section" style={{ marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
              <label className="form-label" style={{ margin:0 }}>Category <span className="req">*</span></label>
              {aiPredicted && (
                <span className="ai-suggest">{Ic.ai} AI suggests: {CATS.find(c=>c.id===aiPredicted.cat)?.name} ({Math.round(aiPredicted.confidence*100)}%)</span>
              )}
            </div>
            <div className="cat-grid">
              {CATS.map(c => (
                <button key={c.id} className={`cat-card ${form.cat===c.id?"selected":""}`} onClick={()=>setForm(f=>({...f,cat:c.id}))}>
                  <div className="cat-ic" style={{ background:c.bg }}><span style={{ fontSize:11,fontWeight:800,color:c.color }}>{c.name[0]}</span></div>
                  <div className="cat-name">{c.name}</div>
                  <div className="cat-desc">{c.desc}</div>
                  {aiPredicted?.cat===c.id && (
                    <div className="ai-suggest" style={{ marginTop:5 }}>{Ic.ai} AI suggested</div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="form-section" style={{ marginBottom:12 }}>
            <label className="form-label">Urgency Level <span className="req">*</span></label>
            <div className="urg-row">
              {[["LOW","#43A047","#E8F5E9","7d"],["MEDIUM","#F57F17","#FFFDE7","5d"],["HIGH","#E65100","#FFF3E0","48h"],["URGENT","#B71C1C","#FFEBEE","8h"]].map(([k,c,bg,sla],i)=>(
                <button key={k} className={`urg-item ${form.urg===i+1?"selected":""}`}
                  style={form.urg===i+1?{borderColor:c,background:bg}:{}}
                  onClick={()=>setForm(f=>({...f,urg:i+1}))}>
                  <div className="urg-dot" style={{ background:c }} />
                  <div className="urg-lbl" style={{ color:form.urg===i+1?c:"var(--txt2)" }}>{URG[k]?.l || k}</div>
                  <div className="urg-sla">SLA: {sla}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="form-section">
            <label className="form-label">Description <span className="req">*</span></label>
            <textarea className="form-inp form-txta" placeholder="Describe the issue in detail (minimum 20 characters)..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} />
          </div>
        </div>}

        {/* STEP 3 — Media */}
        {step===3 && <div className="au">
          <div className="form-section">
            <label className="form-label">Photos & Videos</label>
            <div className="upload-zone">
              <div style={{ width:44,height:44,borderRadius:10,background:"var(--accentbg2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green3)" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              </div>
              <div style={{ fontSize:13,fontWeight:700,color:"var(--txt2)",marginBottom:4 }}>Drop files or click to upload</div>
              <div style={{ fontSize:11,color:"var(--txt3)" }}>JPG, PNG, MP4 — max 5 files, 10 MB each</div>
            </div>
          </div>
        </div>}

        {/* STEP 4 — Review */}
        {step===4 && <div className="au">
          <div className="form-section">
            <div style={{ fontSize:14,fontWeight:800,marginBottom:14 }}>Review before submitting</div>
            {[
              ["Location",    `${(36.8065+(pinPos?.y||50)*0.01).toFixed(4)}, ${(10.1815+(pinPos?.x||50)*0.01).toFixed(4)} — Nabeul`],
              ["Category",    form.cat ? CATS.find(c=>c.id===form.cat)?.name||"Water & Drainage" : "Water & Drainage"],
              ["Urgency",     ["","Low","Medium","High","Critical"][form.urg]],
              ["Title",       form.title || "Water main leak..."],
              ["Description", form.desc ? form.desc.slice(0,60)+"..." : "Detailed description..."],
              ["Media",       "No files attached"],
              ["AI Category", aiPredicted ? `${CATS.find(c=>c.id===aiPredicted.cat)?.name} (${Math.round(aiPredicted.confidence*100)}% confidence)` : "—"],
            ].map(([k,v])=>(
              <div key={k as string} className="rv"><span className="rv-key">{k as string}</span><span className="rv-val">{v as string}</span></div>
            ))}
            <button className="btn primary" style={{ width:"100%",marginTop:16,padding:14 }} disabled={submitting} onClick={doSubmit}>
              {submitting ? <><div className="spin" />Submitting...</> : "Submit Complaint"}
            </button>
          </div>
        </div>}

        {/* Nav */}
        <div style={{ display:"flex", gap:10 }}>
          {step>1 && <button className="btn secondary" style={{ flex:1 }} onClick={()=>setStep(s=>s-1)}>← Back</button>}
          {step<4 && <button className="btn primary" style={{ flex:1 }} onClick={()=>setStep(s=>s+1)}>Continue →</button>}
        </div>
      </div>
    );
  };

  // ═══ AGENT QUEUE PAGE ═══
  const AgentQueue = () => {
    const pending = complaints.filter(c=>["SUBMITTED","VALIDATED"].includes(c.status));
    
    return (
      <div className="page">
        <div className="grid4" style={{ marginBottom:18 }}>
          {[{ n:pending.length,l:"Pending Validation",c:"var(--orange)" },{ n:complaints.filter(c=>c.status==="VALIDATED").length,l:"Validated Today",c:"var(--green3)" },{ n:0,l:"SLA Overdue",c:"var(--red)" },{ n:complaints.filter(c=>c.status==="ASSIGNED").length,l:"Awaiting Dept.",c:"var(--purple)" }].map((s,i)=>(
            <div key={i} className="stat-card au" style={{ animationDelay:`${i*50}ms`,borderTopColor:s.c }}>
              <div className="stat-n" style={{ color:s.c }}><AnimNum to={s.n} delay={i*55} /></div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="sec-title" style={{ marginBottom:12 }}>Complaints Awaiting Validation</div>
        {pending.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--txt3)" }}>No complaints waiting for validation</div>
        ) : (
          pending.map((c,i)=>(
            <div key={c._id || c.id} className={`qi ${c.urgency==="URGENT"?"urgent":c.urgency==="HIGH"?"high":"medium"} au`} style={{ animationDelay:`${i*60}ms` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7 }}>
                <div>
                  <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"DM Mono,monospace",fontSize:11,color:"var(--txt3)" }}>{c.id || c._id?.slice(-8)}</span>
                    <SBadge s={c.status} /><UBadge u={c.urgency} />
                  </div>
                  <div style={{ fontSize:13,fontWeight:700,color:"var(--txt)",marginBottom:4,lineHeight:1.4 }}>{c.title}</div>
                  <div style={{ fontSize:11,color:"var(--txt3)",display:"flex",gap:10 }}>
                    <span>{Ic.pin} {c.location?.municipality || c.location?.address}</span><span>{Ic.clock} {new Date(c.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex",gap:7 }}>
                <button className="btn primary sm" style={{ flex:1 }} onClick={async () => {
                  await complaintService.updateComplaintStatus(c._id || c.id!, "VALIDATED");
                  setComplaints(complaints.map(cm => cm._id === c._id ? { ...cm, status: "VALIDATED" } : cm));
                }}>{Ic.check} Validate</button>
                <button className="btn danger sm" style={{ flex:1 }} onClick={async () => {
                  await complaintService.updateComplaintStatus(c._id || c.id!, "REJECTED");
                  setComplaints(complaints.filter(cm => cm._id !== c._id));
                }}>{Ic.x} Reject</button>
                <button className="btn secondary sm" style={{ flex:1 }}>Assign Dept.</button>
                <button className="btn secondary sm btn icon-only" onClick={()=>openComplaint(c)}>↗</button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // ═══ TECHNICIAN TASKS PAGE ═══
  const TechTasks = () => {
    const tasks = complaints.filter(c=>["ASSIGNED","IN_PROGRESS"].includes(c.status));
    
    return (
      <div className="page">
        <div className="grid3" style={{ marginBottom:18 }}>
          {[{ n:tasks.length,l:"Active Tasks",c:"var(--orange)" },{ n:complaints.filter(c=>c.status==="RESOLVED").length,l:"Done Today",c:"var(--green3)" },{ n:0,l:"SLA At Risk",c:"var(--red)" }].map((s,i)=>(
            <div key={i} className="stat-card au" style={{ animationDelay:`${i*50}ms`,borderTopColor:s.c }}>
              <div className="stat-n" style={{ color:s.c }}><AnimNum to={s.n} delay={i*55} /></div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="sec-title" style={{ marginBottom:12 }}>My Assigned Tasks</div>
        {tasks.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--txt3)" }}>No active tasks</div>
        ) : (
          tasks.map((c,i)=>{
            const slaOk = c.urgency!=="URGENT";
            return (
              <div key={c._id || c.id} className="task sr" style={{ animationDelay:`${i*65}ms`, borderLeft:`3px solid ${slaOk?"var(--orange)":"var(--red)"}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div>
                    <div style={{ display:"flex",gap:6,marginBottom:4,flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"DM Mono,monospace",fontSize:11,color:"var(--txt3)" }}>{c.id || c._id?.slice(-8)}</span>
                      <SBadge s={c.status} /><UBadge u={c.urgency} />
                    </div>
                    <div style={{ fontSize:13,fontWeight:700,color:"var(--txt)",lineHeight:1.4,marginBottom:5 }}>{c.title}</div>
                    <div style={{ fontSize:11,color:"var(--txt3)" }}>{Ic.pin} {c.location?.municipality || c.location?.address}</div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div style={{ fontSize:11,fontWeight:800,color:slaOk?"var(--orange)":"var(--red)",fontFamily:"DM Mono,monospace" }}>{slaOk?"38h left":"4h left"}</div>
                    <div style={{ fontSize:9,color:"var(--txt4)",marginTop:2 }}>{slaOk?"AT RISK":"OVERDUE"}</div>
                  </div>
                </div>
                <div style={{ display:"flex",gap:7 }}>
                  {c.status==="ASSIGNED"    && <button className="btn primary sm" style={{ flex:1 }} onClick={async () => {
                    await complaintService.updateComplaintStatus(c._id || c.id!, "IN_PROGRESS");
                    setComplaints(complaints.map(cm => cm._id === c._id ? { ...cm, status: "IN_PROGRESS" } : cm));
                  }}>Start Work</button>}
                  {c.status==="IN_PROGRESS" && <button className="btn primary sm" style={{ flex:1 }} onClick={async () => {
                    await complaintService.updateComplaintStatus(c._id || c.id!, "RESOLVED");
                    setComplaints(complaints.map(cm => cm._id === c._id ? { ...cm, status: "RESOLVED" } : cm));
                  }}>Mark Resolved</button>}
                  <button className="btn warn sm" style={{ flex:1 }}>{Ic.warn} Report Blocker</button>
                  <button className="btn secondary sm btn icon-only" onClick={()=>openComplaint(c)}>↗</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  // ═══ ANALYTICS PAGE ═══
  const Analytics = () => {
    const BARS = [
      { l:"Roads & Traffic",    v:92, c:"var(--blue)"    },
      { l:"Water & Drainage",   v:78, c:"var(--teal)"    },
      { l:"Waste",              v:55, c:"#795548"         },
      { l:"Street Lighting",    v:67, c:"#F9A825"         },
      { l:"Public Safety",      v:31, c:"var(--red)"      },
      { l:"Parks & Spaces",     v:44, c:"var(--green3)"   },
    ];
    const MONTHS = [38,52,45,71,63,89];
    const ML = ["Oct","Nov","Dec","Jan","Feb","Mar"];
    return (
      <div className="page">
        <div className="grid4" style={{ marginBottom:18 }}>
          {[{ n:complaints.length,l:"Total Active",c:"var(--blue)" },{ n:74,l:"Resolution %",c:"var(--green3)" },{ n:36,l:"Avg TMA (h)",c:"var(--orange)" },{ n:4,l:"SLA Overdue",c:"var(--red)" }].map((s,i)=>(
            <div key={i} className="stat-card au" style={{ animationDelay:`${i*50}ms`,borderTopColor:s.c }}>
              <div className="stat-n" style={{ color:s.c }}><AnimNum to={s.n} delay={80+i*60} /></div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="grid2" style={{ marginBottom:16 }}>
          <div className="card au" style={{ animationDelay:"180ms" }}>
            <div className="sec-title" style={{ marginBottom:14 }}>Complaints by Category</div>
            {BARS.map((b,i)=>(
              <div key={i} className="chart-bar-wrap">
                <div className="chart-bar-hdr">
                  <span style={{ color:"var(--txt2)",fontWeight:600 }}>{b.l}</span>
                  <span style={{ fontFamily:"DM Mono,monospace",color:b.c,fontWeight:700 }}>{b.v}</span>
                </div>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width:`${b.v}%`,background:b.c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="card au" style={{ animationDelay:"220ms" }}>
            <div className="sec-title" style={{ marginBottom:4 }}>Monthly Volume</div>
            <div style={{ fontSize:11,color:"var(--txt3)",marginBottom:14 }}>Last 6 months</div>
            <div className="col-bars">
              {MONTHS.map((h,i)=>(
                <div key={i} className="col-bar-item">
                  <div style={{ flex:1,display:"flex",alignItems:"flex-end",width:"100%" }}>
                    <div className="col-bar" style={{ height:`${(h/89)*68}px`,background:i===5?"var(--green)":"var(--bg3)",border:`1px solid ${i===5?"var(--green2)":"var(--bdr)"}` }} />
                  </div>
                  <div className="col-lbl">{ML[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card au" style={{ animationDelay:"260ms", marginBottom:16 }}>
          <div className="sec-title" style={{ marginBottom:14 }}>Heatmap Overview</div>
          <CityMap complaints={complaints} onSelect={openComplaint} selected={selC} height={240} />
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button className="btn primary">Export CSV</button>
          <button className="btn secondary">PDF Report</button>
        </div>
      </div>
    );
  };

  // ═══ USERS PAGE ═══
  const Users = () => {
    const US = [
      { n:"Aya Zariat",    e:"zariateya@gmail.com", r:"CITIZEN",   rc:"var(--blue)",   rb:"var(--bluebg)",  m:"Beni Khiar" },
      { n:"Mhalla Saadia", e:"zariat@gmail.com",    r:"AGENT",     rc:"var(--purple)", rb:"var(--purbg)",   m:"Nabeul"     },
      { n:"Ahmed Khelifi", e:"khelifi@muni.tn",     r:"TECHNICIAN",rc:"var(--orange)", rb:"var(--orgbg)",   m:"Nabeul"     },
      { n:"Karim Trabelsi",e:"trabelsi@dept.tn",    r:"MANAGER",   rc:"var(--green3)", rb:"var(--accentbg)",m:"Nabeul"     },
      { n:"Fatma Ben Ali", e:"fatma@sfax.tn",       r:"AGENT",     rc:"var(--purple)", rb:"var(--purbg)",   m:"Sfax"       },
    ];
    return (
      <div className="page">
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div className="sec-title">System Users ({US.length})</div>
          <button className="btn primary sm">{Ic.plus} Add User</button>
        </div>
        <div className="card" style={{ padding:0,overflow:"hidden" }}>
          <table className="utbl">
            <thead><tr><th>User</th><th>Role</th><th>Municipality</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {US.map((u,i)=>(
                <tr key={i}>
                  <td>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <div className="avatar-sm" style={{ background:u.rb,color:u.rc }}>{u.n.charAt(0)}</div>
                      <div><div style={{ fontWeight:700,fontSize:13 }}>{u.n}</div><div style={{ fontSize:11,color:"var(--txt3)",marginTop:1 }}>{u.e}</div></div>
                    </div>
                  </td>
                  <td><span className="badge" style={{ background:u.rb,color:u.rc,borderColor:`${u.rc}25` }}>{u.r}</span></td>
                  <td style={{ color:"var(--txt2)",fontSize:12 }}>{u.m}</td>
                  <td><span className="badge" style={{ background:"var(--accentbg)",color:"var(--green3)",borderColor:"var(--accentbdr)" }}>Active</span></td>
                  <td>
                    <div style={{ display:"flex",gap:5 }}>
                      <button className="btn secondary sm btn icon-only">{Ic.edit}</button>
                      <button className="btn danger sm btn icon-only">{Ic.x}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ═══ ARCHIVE PAGE ═══
  const Archive = () => {
    const archived = complaints.filter(c => ["CLOSED","REJECTED"].includes(c.status));
    return (
      <div className="page">
        <div className="card" style={{ padding:16, marginBottom:16, background:"var(--ambg)", borderColor:"var(--ambdr)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ color:"var(--amber)" }}>{Ic.archive}</span>
            <div>
              <div style={{ fontSize:13,fontWeight:800,color:"var(--amber)" }}>Complaint Archive</div>
              <div style={{ fontSize:11,color:"var(--txt3)" }}>CLOSED and REJECTED complaints — searchable for reporting. Auto-archived after 30 days.</div>
            </div>
            <div style={{ marginLeft:"auto",fontFamily:"DM Mono,monospace",fontSize:16,fontWeight:800,color:"var(--amber)" }}>{archived.length}</div>
          </div>
        </div>
        <div className="filter-row">
          {["all","CLOSED","REJECTED"].map(f=>(
            <button key={f} className={`fchip ${archiveFilter===f?"on":""}`} onClick={()=>setArchiveFilter(f)} style={{ textTransform:"capitalize" }}>{f==="all"?"All Archives":f}</button>
          ))}
        </div>
        <div className="card" style={{ padding:0,overflow:"hidden" }}>
          {archived.filter(c=>archiveFilter==="all"||c.status===archiveFilter).length===0 && (
            <div style={{ padding:40,textAlign:"center",color:"var(--txt3)" }}>No archived complaints</div>
          )}
          {archived.filter(c=>archiveFilter==="all"||c.status===archiveFilter).map((c,i)=>(
            <div key={c._id || c.id} className="cr" style={{ opacity:.85 }} onClick={()=>openComplaint(c)}>
              <div className="cr-left">
                <div className="cr-top">
                  <span className="cr-id">{c.id || c._id?.slice(-8)}</span>
                  <SBadge s={c.status} />
                  <span className="badge" style={{ background:"var(--ambg)",color:"var(--amber)",borderColor:"var(--ambdr)",fontSize:9 }}>{Ic.archive} Archived</span>
                </div>
                <div className="cr-title">{c.title}</div>
                <div className="cr-meta"><span>{Ic.pin} {c.location?.municipality || c.location?.address}</span><span>{Ic.clock} {new Date(c.createdAt).toLocaleDateString("en-GB")}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PAGES: Record<string, React.ReactNode> = { 
    dashboard:<Dashboard/>, 
    complaints:<ComplaintsPage/>, 
    report:<ReportForm/>, 
    queue:<AgentQueue/>, 
    tasks:<TechTasks/>, 
    analytics:<Analytics/>, 
    users:<Users/>, 
    archive:<Archive/> 
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app" onClick={() => showNotif && setShowNotif(false)}>
        <Sidebar />
        <div className="main">
          <Topbar />
          {PAGES[page] || <Dashboard />}
        </div>
      </div>
      <DetailPanel complaint={selC} open={panelOpen} onClose={closePanel} role={user?.role || "CITIZEN"} />
    </>
  );
}
