/**
 * Performance-Test für die Habitat-API
 * Testet verschiedene Szenarien und misst Response-Zeiten
 */

const fs = require('fs');
const path = require('path');

// Lade Umgebungsvariablen
function loadEnvFile(fileName) {
  const envPath = path.join(process.cwd(), fileName);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });
    return true;
  }
  return false;
}

if (loadEnvFile('.env.local') || loadEnvFile('.env')) {
  console.log('✅ Umgebungsvariablen geladen\n');
}

const { MongoClient } = require('mongodb');

// Test-Konfigurationen
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_ENDPOINT = `${BASE_URL}/api/habitat/public`;

// Test-Szenarien
const testScenarios = [
  {
    name: '1. Normale Query (ohne Geo-Filter)',
    params: {
      limit: '100',
      verifizierungsstatus: 'alle',
      view: 'map'
    }
  },
  {
    name: '2. Geo-Query mit Bounds (Marker-Modus)',
    params: {
      limit: '100',
      verifizierungsstatus: 'alle',
      view: 'map',
      bounds: '46.72,11.65,46.73,11.66', // Beispiel-Bounds (Südtirol)
      markersOnly: 'true',
      zoom: '13'
    }
  },
  {
    name: '3. Geo-Query mit Bounds (Polygon-Modus)',
    params: {
      limit: '100',
      verifizierungsstatus: 'alle',
      view: 'map',
      bounds: '46.72,11.65,46.73,11.66',
      markersOnly: 'false',
      zoom: '19'
    }
  },
  {
    name: '4. Kleine Bounds (hoher Zoom)',
    params: {
      limit: '100',
      verifizierungsstatus: 'alle',
      view: 'map',
      bounds: '46.724,11.655,46.725,11.656', // Sehr kleine Bounds
      markersOnly: 'false',
      zoom: '19'
    }
  },
  {
    name: '5. Große Bounds (niedriger Zoom)',
    params: {
      limit: '100',
      verifizierungsstatus: 'alle',
      view: 'map',
      bounds: '46.5,11.0,47.0,12.0', // Große Bounds
      markersOnly: 'true',
      zoom: '10'
    }
  }
];

// MongoDB-Direkttest
async function testMongoDBDirect() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE_NAME;
  
  if (!uri || !dbName) {
    console.log('⚠️  MongoDB-Credentials nicht verfügbar, überspringe Direkttest\n');
    return;
  }

  console.log('🔍 MongoDB-Direkttest\n');
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    // Test 1: Normale Query ohne Geo-Filter
    console.log('Test 1: Query ohne Geo-Filter (sortiert nach updatedAt)');
    const start1 = Date.now();
    const result1 = await collection
      .find({ deleted: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(100)
      .project({
        jobId: 1,
        verified: 1,
        'metadata.latitude': 1,
        'metadata.longitude': 1,
        'metadata.polygonPoints': 1,
        'metadata.gemeinde': 1,
        'metadata.flurname': 1,
        'metadata.elevation': 1,
        'result.habitattyp': 1,
        'result.schutzstatus': 1,
        'verifiedResult.habitattyp': 1,
        'verifiedResult.schutzstatus': 1
      })
      .toArray();
    const time1 = Date.now() - start1;
    console.log(`  ⏱️  Zeit: ${time1}ms`);
    console.log(`  📊 Dokumente: ${result1.length}`);
    console.log(`  💾 Datenmenge: ~${JSON.stringify(result1).length} bytes\n`);

    // Test 2: Geo-Query mit Bounds
    console.log('Test 2: Geo-Query mit Bounds (46.72,11.65,46.73,11.66)');
    const start2 = Date.now();
    const [minLat, minLng, maxLat, maxLng] = [46.72, 11.65, 46.73, 11.66];
    const result2 = await collection
      .find({
        deleted: { $ne: true },
        'metadata.latitude': { $gte: minLat, $lte: maxLat },
        'metadata.longitude': { $gte: minLng, $lte: maxLng }
      })
      .sort({ updatedAt: -1 })
      .limit(100)
      .project({
        jobId: 1,
        verified: 1,
        'metadata.latitude': 1,
        'metadata.longitude': 1,
        'metadata.gemeinde': 1,
        'metadata.flurname': 1,
        'metadata.elevation': 1,
        'result.habitattyp': 1,
        'result.schutzstatus': 1,
        'verifiedResult.habitattyp': 1,
        'verifiedResult.schutzstatus': 1
      })
      .toArray();
    const time2 = Date.now() - start2;
    console.log(`  ⏱️  Zeit: ${time2}ms`);
    console.log(`  📊 Dokumente: ${result2.length}`);
    console.log(`  💾 Datenmenge: ~${JSON.stringify(result2).length} bytes\n`);

    // Test 3: Geo-Query ohne polygonPoints (markersOnly)
    console.log('Test 3: Geo-Query ohne polygonPoints (markersOnly=true)');
    const start3 = Date.now();
    const result3 = await collection
      .find({
        deleted: { $ne: true },
        'metadata.latitude': { $gte: minLat, $lte: maxLat },
        'metadata.longitude': { $gte: minLng, $lte: maxLng }
      })
      .sort({ updatedAt: -1 })
      .limit(100)
      .project({
        jobId: 1,
        verified: 1,
        'metadata.latitude': 1,
        'metadata.longitude': 1,
        // Keine polygonPoints!
        'metadata.gemeinde': 1,
        'metadata.flurname': 1,
        'metadata.elevation': 1,
        'result.habitattyp': 1,
        'result.schutzstatus': 1,
        'verifiedResult.habitattyp': 1,
        'verifiedResult.schutzstatus': 1
      })
      .toArray();
    const time3 = Date.now() - start3;
    const size3 = JSON.stringify(result3).length;
    console.log(`  ⏱️  Zeit: ${time3}ms`);
    console.log(`  📊 Dokumente: ${result3.length}`);
    console.log(`  💾 Datenmenge: ~${size3} bytes`);
    
    // Vergleich mit Test 2 (mit polygonPoints)
    const size2 = JSON.stringify(result2).length;
    const savings = size2 - size3;
    const savingsPercent = ((savings / size2) * 100).toFixed(1);
    console.log(`  💡 Ersparnis vs. mit polygonPoints: ${savings} bytes (${savingsPercent}%)\n`);

    await client.close();
  } catch (error) {
    console.error('❌ Fehler beim MongoDB-Direkttest:', error.message);
    await client.close();
  }
}

// HTTP-API-Test
async function testHTTPAPI() {
  const results = [];

  for (const scenario of testScenarios) {
    console.log(`📋 ${scenario.name}`);
    
    const params = new URLSearchParams(scenario.params);
    const url = `${API_ENDPOINT}?${params.toString()}`;
    
    try {
      const start = Date.now();
      const response = await fetch(url);
      const end = Date.now();
      const responseTime = end - start;

      if (!response.ok) {
        console.log(`  ❌ Fehler: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`  📄 Antwort: ${errorText.substring(0, 200)}...\n`);
        continue;
      }

      const data = await response.json();
      const dataSize = JSON.stringify(data).length;
      
      console.log(`  ⏱️  Response-Zeit: ${responseTime}ms`);
      console.log(`  📊 Dokumente: ${data.entries?.length || 0}`);
      console.log(`  💾 Datenmenge: ~${dataSize} bytes`);
      
      if (data.pagination) {
        console.log(`  📈 Total: ${data.pagination.total || 'N/A'}`);
      }
      
      // Performance-Bewertung
      if (responseTime < 200) {
        console.log(`  ✅ Ausgezeichnet (< 200ms)`);
      } else if (responseTime < 500) {
        console.log(`  ✅ Gut (< 500ms)`);
      } else if (responseTime < 1000) {
        console.log(`  ⚠️  Akzeptabel (< 1s)`);
      } else {
        console.log(`  ❌ Langsam (> 1s)`);
      }
      
      results.push({
        name: scenario.name,
        responseTime: responseTime,
        documentCount: data.entries?.length || 0,
        dataSize: dataSize,
        success: true
      });
      
      console.log('');
    } catch (error) {
      console.log(`  ❌ Fehler: ${error.message}\n`);
      results.push({
        name: scenario.name,
        success: false,
        error: error.message
      });
    }
  }

  // Zusammenfassung
  if (results.length > 0) {
    console.log('='.repeat(60));
    console.log('📊 Zusammenfassung\n');
    
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      const avgTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
      const minTime = Math.min(...successful.map(r => r.responseTime));
      const maxTime = Math.max(...successful.map(r => r.responseTime));
      
      console.log(`✅ Erfolgreiche Tests: ${successful.length}/${results.length}`);
      console.log(`⏱️  Durchschnittliche Response-Zeit: ${avgTime.toFixed(0)}ms`);
      console.log(`⚡ Schnellste Response: ${minTime}ms`);
      console.log(`🐌 Langsamste Response: ${maxTime}ms\n`);
      
      console.log('Detaillierte Ergebnisse:');
      successful.forEach(r => {
        const status = r.responseTime < 200 ? '✅' : r.responseTime < 500 ? '⚠️' : '❌';
        console.log(`  ${status} ${r.name}: ${r.responseTime}ms (${r.documentCount} Dokumente, ~${r.dataSize} bytes)`);
      });
    }
    
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log('\n❌ Fehlgeschlagene Tests:');
      failed.forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
  }
}

// Hauptfunktion
async function runTests() {
  console.log('🚀 Habitat-API Performance-Test\n');
  console.log('='.repeat(60));
  console.log('');

  // MongoDB-Direkttest
  await testMongoDBDirect();

  console.log('='.repeat(60));
  console.log('');

  // HTTP-API-Test (versuche direkt, auch wenn Health-Check fehlschlägt)
  console.log('🌐 HTTP-API-Test\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  // Versuche direkt die API zu testen
  try {
    const testUrl = `${API_ENDPOINT}?limit=1&view=map`;
    const testResponse = await fetch(testUrl, { 
      signal: AbortSignal.timeout(5000) // 5s Timeout
    });
    
    if (testResponse.ok) {
      await testHTTPAPI();
    } else {
      console.log(`⚠️  API antwortet mit Status ${testResponse.status}`);
      console.log(`   Versuche trotzdem die Tests...\n`);
      await testHTTPAPI();
    }
  } catch (error) {
    if (error.name === 'AbortError' || error.message.includes('fetch')) {
      console.log('⚠️  Server nicht erreichbar oder Timeout');
      console.log(`   Stelle sicher, dass der Server auf ${BASE_URL} läuft\n`);
    } else {
      console.log(`⚠️  Fehler: ${error.message}`);
      console.log(`   Versuche trotzdem die Tests...\n`);
      await testHTTPAPI();
    }
  }

  console.log('='.repeat(60));
  console.log('\n✅ Tests abgeschlossen!');
}

runTests().catch(console.error);

