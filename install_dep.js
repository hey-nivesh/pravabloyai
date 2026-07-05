const { execSync } = require('child_process');
try {
  console.log('Installing expo-audio...');
  execSync('npx expo install expo-audio', { stdio: 'inherit' });
  console.log('Successfully installed expo-audio.');
} catch (error) {
  console.error('Error installing expo-audio:', error);
}
