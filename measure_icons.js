const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { table } = require('table');

const versions = ['2.0.225', '2.0.239'];
const chunks = ['chunk-0.js', 'chunk-1.js', 'chunk-2.js', 'chunk-3.js', 'chunk-4.js'];
const iconByteLengths = {};

async function downloadFile(url, filePath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(filePath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log("DONE", url, filePath);
      resolve();
    });
    writer.on('error', () => {
      console.log("FAILED", url, filePath);
      reject();
    });
  });
}

async function downloadVersionFiles(version) {
  const baseDir = path.join(__dirname, `react-icons-${version}`);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }

  for (const chunk of chunks) {
    const url = `https://unpkg.com/@fluentui/react-icons@${version}/lib/icons/${chunk}`;
    const filePath = path.join(baseDir, chunk);
    if (fs.existsSync(filePath)) {
      console.log("Skipping", url, filePath);
      continue;
    }
    console.log("Downloading", url, filePath);
    try {
      await downloadFile(url, filePath);
      console.log("DONE", url, filePath);
    }
    catch (e) {
      console.log("FAILED", url, filePath);
      throw e;
    }
  }

  return baseDir;
}

function measureByteLengths(directory, version) {
  const lengths = {};

  chunks.forEach(chunk => {
    const filePath = path.join(directory, chunk);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      const lines = fileContent.toString().split('\n');
      for(const line of lines) {
        const matches = line.match(/export const (\w+)/g);
        if (matches) {
          matches.forEach(match => {
            const iconName = match.split(' ')[2];
            lengths[iconName] = line.length;
          });
        }

      }
    }
  });

  iconByteLengths[version] = lengths;
}

async function compareVersions() {
  for (const version of versions) {
    const directory = await downloadVersionFiles(version);
    console.log("All downloaded");
    measureByteLengths(directory, version);
  }


  const allIcons = new Set([...Object.keys(iconByteLengths[versions[0]]), ...Object.keys(iconByteLengths[versions[1]])]);
  const data = [['Icon', ...versions, "diff"]];

  allIcons.forEach(icon => {
    const length1 = iconByteLengths[versions[0]][icon] || 'N/A';
    const length2 = iconByteLengths[versions[1]][icon] || 'N/A';
    if (length1 !== length2) {
      const diff = length1 !== 'N/A' && length2 !== 'N/A' ? length2 - length1 : 'N/A';
      data.push([icon, length1, length2, diff]);
      total += 
    }
  });

  console.log(table(data));
}

compareVersions().catch(err => console.error(err));
