const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const FILE_PATH = path.join(__dirname, 'alarms.json');
const SOUND_FILE = path.join(__dirname, 'sounds/alarm.mp3');

function updateJSONOnCompletion(alarmItem) {
    const data = readJSONFile();
    data.forEach(item => {
        if (item.id === alarmItem.id) {
            item.solved = true;
            item.started = false;
        }
    });
    writeJSONFile(data);
}

function playSound() {
    return spawn('afplay', [SOUND_FILE]);
}

function createAlarmPuzzle() {
    let res = {
        text: "",
        mathResult: 0,
    };

    const operations = ["+", "-", "*"];

    const min = -100;
    const max = 100;

    let a = parseInt(Math.random() * (max - min) + min);
    let b = parseInt(Math.random() * (max - min) + min);
    let c = parseInt(Math.random() * (max - min) + min);
    let d = parseInt(Math.random() * (max - min) + min);

    let op1 = parseInt(Math.random() * (3 - 0) + 0);
    let op2 = parseInt(Math.random() * (3 - 0) + 0);
    let op3 = parseInt(Math.random() * (3 - 0) + 0);

    res.text = a + ' ' + operations[op1] + ' ' + b + ' ' + operations[op2] + ' ' + c + ' ' + operations[op3] + ' ' + d;
    res.mathResult = eval(res.text);

    return res;
}

function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return false;
    }
}

function startMathProcess(alarmItem) {
    alarmMathPuzzle = createAlarmPuzzle();
    console.log("Будильник. Для выключения дай правильный ответ:" + alarmMathPuzzle.text);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    let soundProcess = playSound();
    let soundInterval = setInterval(function () {
        if (!isProcessRunning(soundProcess.pid)) {
            soundProcess = playSound();
        }
    }, 1000);

    function askQuestion() {
        rl.question("Твой ответ: ", (answer) => {
            if (parseInt(answer.trim()) === alarmMathPuzzle.mathResult) {
                console.log("Правильно!");
                clearInterval(soundInterval);
                rl.close();
                updateJSONOnCompletion(alarmItem);
            } else {
                console.log("Неправильно!");
                askQuestion();
            }
        });
    }

    askQuestion();
}

function writeJSONFile(data) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function readJSONFile() {
    if (!fs.existsSync(FILE_PATH)) return [];
    const data = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(data);
}

function checkTimeAndStartProcess() {
    const platform = process.platform;

    if (platform !== 'darwin') {
        console.log('Платформа ' + platform + ' не поддерживается');
    }

    const alarms = readJSONFile();
    const now = new Date();
    const currentTime = now.getHours() + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0');

    alarms.forEach(alarmItem => {
        if (
            (alarmItem.time === currentTime && alarmItem.active && !alarmItem.started)
            || (alarmItem.active && !alarmItem.solved && !alarmItem.started)
        ) {
            alarmItem.solved = false;
            alarmItem.started = true;
            writeJSONFile(alarms);
            startMathProcess(alarmItem);
        }
    });
}

setInterval(checkTimeAndStartProcess, 1000);
