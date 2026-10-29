const{app,BrowserWindow}=require('electron');
app.commandLine.appendSwitch('force-device-scale-factor','1');
app.whenReady().then(()=>{const w=new BrowserWindow({width:1080,height:1440,show:false,frame:false,useContentSize:true,backgroundColor:'#f7f5ef',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});w.loadURL('about:blank');});
app.on('window-all-closed',()=>app.quit());
