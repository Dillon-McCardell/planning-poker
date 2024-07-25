const { exec } = require('child_process');

exec('serve -s build -l 8000', (err, stdout, stderr) => {
    if (err) {
        console.error(`Error: ${err}`);
        return;
    }
    console.log(`Output: ${stdout}`);
    console.error(`Error Output: ${stderr}`);
});

