/**
 * Expo prebuild sometimes leaves newArchEnabled=true while app.config sets false.
 * react-native-ttlock requires legacy architecture on EAS Gradle builds.
 */
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'android', 'gradle.properties');
if (!fs.existsSync(file)) {
  console.warn('patch-android-gradle-properties: android/gradle.properties missing, skipping');
  process.exit(0);
}

let text = fs.readFileSync(file, 'utf8');
const next = text.replace(/newArchEnabled\s*=\s*true/g, 'newArchEnabled=false');
if (next === text) {
  console.log('patch-android-gradle-properties: newArchEnabled already false or absent');
} else {
  fs.writeFileSync(file, next);
  console.log('patch-android-gradle-properties: set newArchEnabled=false');
}
