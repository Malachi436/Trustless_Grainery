/**
 * Backend Auto-Restart Script
 * Monitors the backend process and restarts it on crashes
 * 
 * Features:
 * - Automatic restart on crash
 * - Crash logging with timestamps
 * - Maximum restart attempts to prevent infinite loops
 * - Graceful shutdown on Ctrl+C
 * 
 * Usage:
 *   node restart-on-crash.js
 * 
 * To stop: Press Ctrl+C
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_RESTARTS = 10; // Maximum restarts before giving up
const RESTART_DELAY = 3000; // Wait 3 seconds before restarting
const CRASH_LOG_FILE = path.join(__dirname, 'crash-log.txt');

let restartCount = 0;
let backendProcess = null;
let isShuttingDown = false;

/**
 * Log crash details
 */
function logCrash(exitCode, signal) {
  const timestamp = new Date().toISOString();
  const logEntry = `
[${timestamp}] Backend crashed
  Exit Code: ${exitCode || 'N/A'}
  Signal: ${signal || 'N/A'}
  Restart Count: ${restartCount}/${MAX_RESTARTS}
----------------------------------------
`;
  
  fs.appendFileSync(CRASH_LOG_FILE, logEntry);
  console.error(logEntry);
}

/**
 * Start the backend process
 */
function startBackend() {
  if (isShuttingDown) {
    return;
  }

  console.log('\n🚀 Starting backend...');
  console.log(`   Restart count: ${restartCount}/${MAX_RESTARTS}`);
  console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);

  backendProcess = spawn('node', ['dist/server.js'], {
    cwd: __dirname,
    stdio: 'inherit', // Pass through stdin, stdout, stderr
    shell: true,
  });

  backendProcess.on('exit', (code, signal) => {
    if (isShuttingDown) {
      console.log('\n✅ Backend stopped gracefully');
      return;
    }

    // Exit code 0 means normal shutdown
    if (code === 0) {
      console.log('\n✅ Backend stopped normally');
      return;
    }

    // Backend crashed
    console.error(`\n❌ Backend crashed (Exit code: ${code}, Signal: ${signal})`);
    logCrash(code, signal);

    restartCount++;

    if (restartCount >= MAX_RESTARTS) {
      console.error(`\n🛑 Maximum restart attempts (${MAX_RESTARTS}) reached`);
      console.error('   Check crash-log.txt for details');
      console.error('   Fix the issue and restart manually');
      process.exit(1);
    }

    // Wait before restarting
    console.log(`\n⏳ Restarting in ${RESTART_DELAY / 1000} seconds...`);
    setTimeout(startBackend, RESTART_DELAY);
  });

  backendProcess.on('error', (error) => {
    console.error('\n❌ Failed to start backend:', error.message);
    process.exit(1);
  });
}

/**
 * Graceful shutdown handler
 */
function shutdown() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log('\n\n🛑 Shutting down...');

  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds
    setTimeout(() => {
      if (backendProcess) {
        console.log('⚠️  Force killing backend...');
        backendProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
}

// Handle Ctrl+C
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Welcome message
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   Backend Auto-Restart Monitor                         ║');
console.log('║   Press Ctrl+C to stop                                 ║');
console.log('╚════════════════════════════════════════════════════════╝');

// Clear crash log on startup
if (fs.existsSync(CRASH_LOG_FILE)) {
  const oldLog = fs.readFileSync(CRASH_LOG_FILE, 'utf8');
  const archiveFile = path.join(__dirname, `crash-log-${Date.now()}.txt`);
  fs.writeFileSync(archiveFile, oldLog);
  fs.unlinkSync(CRASH_LOG_FILE);
  console.log(`📋 Previous crash log archived to: ${path.basename(archiveFile)}\n`);
}

// Start the backend
startBackend();
