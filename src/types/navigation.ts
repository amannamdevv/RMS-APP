export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Otp: { whatsappUrl: string, username: string };
  Home: { fullname: string };
  SiteStatus: undefined;
  SiteDetails: { imei: string, siteId: string };
  NonCommSites: undefined;
  SiteRunningStatus: undefined;
  SiteDistribution: undefined;
  SiteTypeDetails: { siteType: string, title: string, filters: any };
  Dashboard: { fullname: string };
  SiteHealth: { status?: string } | undefined;
  SiteVitals: { range?: string } | undefined;
  SiteAutomation: undefined;
  LiveAlarms: { severity?: string } | undefined;
  UptimeDetails: { state_id: string, state_name: string };
  UptimeReport: undefined;
};
