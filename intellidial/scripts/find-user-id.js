/**
 * Script to find Firebase user ID by email
 * Usage: node scripts/find-user-id.js <email>
 * Example: node scripts/find-user-id.js lyle@automationarchitects.ai
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Load .env from root directory (same as next.config.ts)
const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
}

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Firebase Admin credentials not found in .env');
  console.error('Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/find-user-id.js <email>');
  console.log('Example: node scripts/find-user-id.js lyle@automationarchitects.ai');
  process.exit(1);
}

async function findUser() {
  try {
    console.log(`\n🔍 Looking up user by email: ${email}\n`);
    
    // Try to get user by email from Firebase Auth
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log('✅ Found user in Firebase Auth:');
      console.log('   User ID:', user.uid);
      console.log('   Email:', user.email);
      console.log('   Display Name:', user.displayName || '(not set)');
      console.log('   Email Verified:', user.emailVerified);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ User not found in Firebase Auth');
      } else {
        throw error;
      }
    }

    // Check userOrganizations collection
    const db = admin.firestore();
    if (user) {
      const userOrgDoc = await db.collection('userOrganizations').doc(user.uid).get();
      if (userOrgDoc.exists) {
        const data = userOrgDoc.data();
        console.log('\n📋 User-Organization mapping:');
        console.log('   Org ID:', data?.orgId || '(not set)');
        
        if (data?.orgId) {
          const orgDoc = await db.collection('organizations').doc(data.orgId).get();
          if (orgDoc.exists) {
            const orgData = orgDoc.data();
            console.log('   Org Name:', orgData?.name || '(not set)');
          }
        }
      } else {
        console.log('\n⚠️  No userOrganizations document found');
      }

      // Check team memberships
      const orgsSnap = await db.collection('organizations').get();
      const memberships = [];
      for (const orgDoc of orgsSnap.docs) {
        const memberDoc = await orgDoc.ref.collection('members').doc(user.uid).get();
        if (memberDoc.exists) {
          const orgData = await db.collection('organizations').doc(orgDoc.id).get();
          memberships.push({
            orgId: orgDoc.id,
            orgName: orgData.data()?.name || 'Unknown',
            role: memberDoc.data()?.role || 'unknown',
          });
        }
      }
      
      if (memberships.length > 0) {
        console.log('\n👥 Team Memberships:');
        memberships.forEach(m => {
          console.log(`   - ${m.orgName} (${m.orgId}) - Role: ${m.role}`);
        });
      } else {
        console.log('\n⚠️  No team memberships found');
      }
    }

    // Also search by email in userOrganizations (in case email is stored)
    console.log('\n🔍 Searching userOrganizations collection...');
    const allUserOrgs = await db.collection('userOrganizations').get();
    console.log(`   Found ${allUserOrgs.size} user-org mappings`);
    
    if (allUserOrgs.size > 0) {
      console.log('\n📊 All user-org mappings:');
      for (const doc of allUserOrgs.docs) {
        const data = doc.data();
        console.log(`   User ID: ${doc.id} → Org ID: ${data?.orgId || '(not set)'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findUser().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
});
