import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guild.app',
  appName: 'GUILD',
  webDir: 'dist',
  androidScheme: 'https',
  iosScheme: 'https',
  backgroundColor: '#0c0a07',
  server: {
    url: 'https://guild-azure.vercel.app',
    cleartext: false,
    androidAllowMixedContent: false,
  },
};

export default config;
