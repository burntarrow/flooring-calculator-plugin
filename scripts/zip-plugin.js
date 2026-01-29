import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const pluginSlug = "flooring-calculator-plugin";
const root = process.cwd();
const distDir = path.join(root, "dist");
const zipPath = path.join(distDir, `${pluginSlug}.zip`);

const filesToInclude = [
  "flooring-calculator-plugin.php",
  "assets",
  "README.md",
];

fs.mkdirSync(distDir, { recursive: true });

// Clean old zip
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Build a temporary folder structure for the zip root
const tempDir = path.join(distDir, pluginSlug);
fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

for (const item of filesToInclude) {
  const src = path.join(root, item);
  if (!fs.existsSync(src)) continue;

  const dest = path.join(tempDir, item);
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Create zip (macOS has /usr/bin/zip)
execSync(`cd "${distDir}" && /usr/bin/zip -r "${zipPath}" "${pluginSlug}"`, {
  stdio: "inherit",
});

// Cleanup temp folder
fs.rmSync(tempDir, { recursive: true, force: true });

console.log(`✅ Created ${zipPath}`);
