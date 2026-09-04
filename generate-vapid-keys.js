/**
 * Generate VAPID keys for Web Push authentication
 * Run this script to generate your VAPID keys
 */

const webpush = require('web-push');

console.log('🔑 Generating VAPID keys for Web Push...\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('✅ VAPID keys generated successfully!\n');
  console.log('Public Key (add to .env as VAPID_PUBLIC_KEY):');
  console.log(vapidKeys.publicKey);
  console.log('\nPrivate Key (add to .env as VAPID_PRIVATE_KEY):');
  console.log(vapidKeys.privateKey);
  console.log('\n📝 Add these to your .env file:');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log('\n⚠️  Keep the private key secret! Never commit it to git.\n');
  
} catch (error) {
  console.error('❌ Error generating VAPID keys:', error);
  process.exit(1);
}
