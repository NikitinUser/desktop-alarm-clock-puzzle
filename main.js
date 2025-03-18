const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const FILE_PATH = path.join(__dirname, 'alarms.json');
const SOUND_FILE = path.join(__dirname, 'sounds/alarm.mp3');

let editJsonWindow;

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
    const operations = ["+", "-", "*"];

    const min = -100;
    const max = 100;

    const randomNum = () => parseInt(Math.random() * (max - min) + min);
    const randomOp = () => operations[parseInt(Math.random() * (3 - 0) + 0)];

    let text = `${randomNum()} ${randomOp()} ${randomNum()} ${randomOp()} ${randomNum()} ${randomOp()} ${randomNum()}`;;

    return {
        text: text,
        mathResult: eval(text),
    };;
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
                updateJSONOnCompletion(alarmItem);
                rl.close();
            } else {
                console.log("Неправильно!");
                console.log(alarmMathPuzzle.text);
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
    const currentTime = String(now.getHours()).padStart(2, '0')
        + ":" + String(now.getMinutes()).padStart(2, '0')
        + ":" + String(now.getSeconds()).padStart(2, '0');

    alarms.forEach(alarmItem => {
        if (
            alarmItem.active && !alarmItem.started
            && ((alarmItem.time === currentTime) || (!alarmItem.solved))
        ) {
            alarmItem.solved = false;
            alarmItem.started = true;
            writeJSONFile(alarms);
            startMathProcess(alarmItem);
        }
    });
}

function createEditJsonWindow() {
    editJsonWindow = new BrowserWindow({
        width: 400,
        height: 400,
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    editJsonWindow.loadFile("edit-json.html");

    editJsonWindow.on("closed", () => {
        createEditJsonWindow();
    });
}

setInterval(checkTimeAndStartProcess, 1000);

app.whenReady().then(() => {
    createEditJsonWindow();
});

ipcMain.handle("load-data", async () => {
    try {
        return fs.existsSync(FILE_PATH) ? fs.readFileSync(FILE_PATH, "utf8") : "";
    } catch (err) {
        console.error("Ошибка чтения файла:", err);
        return "";
    }
});

ipcMain.on("save-data", (_, data) => {
    try {
        fs.writeFileSync(FILE_PATH, data, "utf8");
    } catch (err) {
        console.error("Ошибка сохранения файла:", err);
    }
});
