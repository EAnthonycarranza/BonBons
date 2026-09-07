// Only report variable names, never credentials, in deployment logs.
const required = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'BONBONS_INTERNAL_API_TOKEN',
  'ADMIN_PASSWORD',
  'ADMIN_SECRET',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY',
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_RECAPTCHA_API_KEY',
];
const problems = required.filter(name => !String(process.env[name] || '').trim())
  .map(name => `${name} is missing`);

// The owner-selected login password may be eight characters. The independent
// session-signing secret must still meet the stronger 32-character minimum.
for (const [name, minLength] of [['ADMIN_PASSWORD', 8], ['ADMIN_SECRET', 32]]) {
  const value = process.env[name] || '';
  if (value.length < minLength || /changeme|please-change|replace-with|dev-only-insecure/i.test(value)) {
    problems.push(`${name} must be a non-placeholder value of at least ${minLength} characters`);
  }
}

try {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL);
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.hostname.endsWith('.example.com') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    problems.push('NEXT_PUBLIC_SITE_URL must be the public HTTPS origin');
  }
} catch {
  problems.push('NEXT_PUBLIC_SITE_URL must be a valid HTTPS URL');
}

if (problems.length) {
  console.error(`Production configuration needs attention:\n${problems.map(problem => `- ${problem}`).join('\n')}`);
  process.exit(1);
}

console.log('Production configuration checks passed.');
