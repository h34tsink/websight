/**
 * Detect active page - shows what WebSight would analyze
 */

import { detectActivePage, detectRunningServers } from './detect.js';

async function main() {
  console.log('🔍 Detecting active page...\n');
  
  const active = await detectActivePage();
  console.log(`📍 Active page: ${active.url}`);
  console.log(`   Source: ${active.source}${active.port ? ` (port ${active.port})` : ''}\n`);
  
  console.log('🖥️  Running dev servers:');
  const servers = await detectRunningServers();
  
  if (servers.length === 0) {
    console.log('   (none found)');
  } else {
    for (const server of servers) {
      const marker = server.url === active.url ? '→' : ' ';
      console.log(`  ${marker} ${server.url} (port ${server.port})`);
    }
  }
}

main().catch(console.error);
