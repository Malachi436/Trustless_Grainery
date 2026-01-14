/**
 * Pre-Deployment Readiness Check
 * Run this before deploying to verify all requirements are met
 * 
 * Usage: node check-deployment-ready.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Deployment Readiness...\n');

let errors = [];
let warnings = [];
let passed = 0;

// Check 1: Compiled dist folder exists
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  console.log('✅ Backend compiled (dist/ folder exists)');
  passed++;
} else {
  errors.push('❌ Backend not compiled. Run: npm run build');
}

// Check 2: Production environment file
if (fs.existsSync(path.join(__dirname, '.env.production'))) {
  console.log('✅ Production environment file exists');
  passed++;
  
  // Check for placeholder values
  const envContent = fs.readFileSync(path.join(__dirname, '.env.production'), 'utf8');
  if (envContent.includes('[YOUR-')) {
    warnings.push('⚠️  Production .env contains placeholder values - update them');
  }
  if (envContent.includes('JWT_SECRET=') && envContent.split('JWT_SECRET=')[1].split('\n')[0].length < 32) {
    warnings.push('⚠️  JWT_SECRET is too short - generate a strong secret');
  }
} else {
  warnings.push('⚠️  .env.production not found. Copy from .env.production.example');
}

// Check 3: PM2 ecosystem config
if (fs.existsSync(path.join(__dirname, 'ecosystem.config.js'))) {
  console.log('✅ PM2 configuration exists');
  passed++;
} else {
  errors.push('❌ PM2 configuration missing (ecosystem.config.js)');
}

// Check 4: Dependencies installed
if (fs.existsSync(path.join(__dirname, 'node_modules', 'express-rate-limit'))) {
  console.log('✅ Rate limiting package installed');
  passed++;
} else {
  errors.push('❌ Dependencies not installed. Run: npm install');
}

if (fs.existsSync(path.join(__dirname, 'node_modules', 'compression'))) {
  console.log('✅ Compression package installed');
  passed++;
} else {
  errors.push('❌ Dependencies not installed. Run: npm install');
}

// Check 5: Critical files exist
const criticalFiles = [
  'src/middleware/rateLimiter.ts',
  'src/routes/healthRoutes.ts',
  'restart-on-crash.js',
];

criticalFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} exists`);
    passed++;
  } else {
    errors.push(`❌ Missing file: ${file}`);
  }
});

// Check 6: TypeScript compiled files
const compiledFiles = [
  'dist/server.js',
  'dist/config/database.js',
  'dist/middleware/rateLimiter.js',
  'dist/routes/healthRoutes.js',
];

let compiledCount = 0;
compiledFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    compiledCount++;
  }
});

if (compiledCount === compiledFiles.length) {
  console.log('✅ All TypeScript files compiled');
  passed++;
} else {
  warnings.push(`⚠️  Some TypeScript files not compiled (${compiledCount}/${compiledFiles.length}). Run: npm run build`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\n✅ Passed: ${passed}`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings: ${warnings.length}`);
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length > 0) {
  console.log(`\n❌ Errors: ${errors.length}`);
  errors.forEach(e => console.log(`   ${e}`));
  console.log('\n🚫 Deployment NOT ready. Fix errors above.\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  Deployment ready with warnings. Review warnings above.\n');
  process.exit(0);
} else {
  console.log('\n🎉 Deployment ready! All checks passed.\n');
  console.log('Next steps:');
  console.log('1. Install PM2: npm install -g pm2');
  console.log('2. Start backend: pm2 start ecosystem.config.js --env production');
  console.log('3. Monitor: pm2 status && pm2 logs');
  console.log('4. Test health: curl http://localhost:4000/health\n');
  process.exit(0);
}
