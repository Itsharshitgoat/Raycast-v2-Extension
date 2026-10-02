const { execSync } = require('child_process');
const script = `console.log("SUCCESS");`;
require('fs').writeFileSync('/tmp/test-jxa-stdout.js', script);
try {
  const stdout = execSync('osascript -l JavaScript /tmp/test-jxa-stdout.js', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
  console.log("STDOUT: " + stdout);
} catch (e) {
  console.log("ERROR STDOUT: " + e.stdout.toString());
  console.log("ERROR STDERR: " + e.stderr.toString());
}
