const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Function to parse .env file
function loadEnv() {
  const env = {};
  const paths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '../../.env')
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      console.log(`[Build] Loading environment from ${p}`);
      const content = fs.readFileSync(p, 'utf-8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          env[key] = value.trim();
        }
      });
      break; // stop at first found file
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Warning: Supabase environment variables not found in .env files.');
}

const define = {
  'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
  'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
};

console.log('[Build] Building extension with definitions:', define);

Promise.all([
  esbuild.build({
    entryPoints: ['background/index.ts'],
    bundle: true,
    outfile: 'dist/background/index.js',
    platform: 'browser',
    format: 'esm',
    target: 'chrome100',
    define
  }),
  esbuild.build({
    entryPoints: ['ui/popup.ts'],
    bundle: true,
    outfile: 'dist/ui/popup.js',
    platform: 'browser',
    format: 'esm',
    target: 'chrome100',
    define
  }),
  esbuild.build({
    entryPoints: ['content/youtube.ts'],
    bundle: true,
    outfile: 'dist/content/youtube.js',
    platform: 'browser',
    format: 'esm',
    target: 'chrome100',
    define
  })
]).then(() => {
  console.log('⚡ Build complete!');
}).catch(() => process.exit(1));
