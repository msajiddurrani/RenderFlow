const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const { execSync } = require('child_process');
const fs = require('fs');

const video = 'output/render-1795024620795-source.mp4';
execSync(`"${ffmpeg.path}" -y -ss 00:00:02.0 -i "${video}" -vframes 1 output/verified-painforge-t2.png`);
execSync(`"${ffmpeg.path}" -y -ss 00:00:20.0 -i "${video}" -vframes 1 output/verified-painforge-t20.png`);
execSync(`"${ffmpeg.path}" -y -ss 00:00:40.0 -i "${video}" -vframes 1 output/verified-painforge-t40.png`);

console.log('Frame t=2s:', fs.statSync('output/verified-painforge-t2.png').size, 'bytes');
console.log('Frame t=20s:', fs.statSync('output/verified-painforge-t20.png').size, 'bytes');
console.log('Frame t=40s:', fs.statSync('output/verified-painforge-t40.png').size, 'bytes');
