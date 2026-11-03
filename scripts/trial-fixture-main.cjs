const{app}=require('electron');
app.setPath('appData',process.env.BAY_TRIAL_FIXTURE);
require(process.env.BAY_TRIAL_ENTRY);
